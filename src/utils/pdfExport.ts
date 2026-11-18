import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface PdfExportOptions {
  fileName?: string;
  orientation?: 'portrait' | 'landscape';
  format?: 'a4' | 'letter';
  scale?: number;
}

const cssColorCache = new Map<string, string>();
let colorProbeCtx: CanvasRenderingContext2D | null = null;

function getColorProbeCtx(): CanvasRenderingContext2D | null {
  if (!colorProbeCtx && typeof document !== 'undefined') {
    const c = document.createElement('canvas');
    c.width = 1;
    c.height = 1;
    colorProbeCtx = c.getContext('2d', { willReadFrequently: true });
  }
  return colorProbeCtx;
}

/**
 * Resolves any modern CSS color (oklch, oklab, color-mix, color(), rgb, hsl, hex)
 * into a standard sRGB rgb()/rgba() string supported by html2canvas v1.4.
 */
function resolveCssColorToRgba(expr: string): string {
  const key = expr.trim();
  if (!key) return 'transparent';
  const cached = cssColorCache.get(key);
  if (cached) return cached;

  const ctx = getColorProbeCtx();
  if (!ctx) return key;

  try {
    ctx.fillStyle = '#123456';
    ctx.fillStyle = key;
    if (ctx.fillStyle === '#123456') {
      ctx.fillStyle = '#654321';
      ctx.fillStyle = key;
      if (ctx.fillStyle === '#654321') {
        return 'transparent';
      }
    }
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillRect(0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data;
    const alpha = Math.round((d[3] / 255) * 1000) / 1000;
    const out =
      alpha >= 1
        ? `rgb(${d[0]}, ${d[1]}, ${d[2]})`
        : alpha <= 0
        ? 'rgba(0, 0, 0, 0)'
        : `rgba(${d[0]}, ${d[1]}, ${d[2]}, ${alpha})`;
    cssColorCache.set(key, out);
    return out;
  } catch {
    return 'transparent';
  }
}

/**
 * Expands simple CSS `var(--foo)` references inside an expression using known custom properties.
 */
function expandCssVars(expr: string, varMap: Map<string, string>, depth = 0): string {
  if (depth > 3 || !expr.includes('var(')) return expr;
  return expr.replace(/var\(\s*(--[a-zA-Z0-9_-]+)\s*(?:,\s*([^)]+))?\)/g, (_m, name, fallback) => {
    const val = varMap.get(name);
    if (val) return expandCssVars(val, varMap, depth + 1);
    if (fallback) return expandCssVars(fallback.trim(), varMap, depth + 1);
    return 'transparent';
  });
}

/**
 * Replaces oklch(...), oklab(...), color-mix(...), and color(...) function calls
 * with balanced parentheses anywhere inside a CSS string.
 */
function sanitizeModernColorsInCss(cssText: string, varMap: Map<string, string>): string {
  if (!/(?:oklch|oklab|color-mix|color)\s*\(/i.test(cssText)) {
    return cssText;
  }

  const fnRegex = /(^|[^a-zA-Z0-9_-])(oklch|oklab|color-mix|color)\(/gi;
  let result = '';
  let cursor = 0;

  while (cursor < cssText.length) {
    fnRegex.lastIndex = cursor;
    const match = fnRegex.exec(cssText);
    if (!match) {
      result += cssText.slice(cursor);
      break;
    }

    const prefix = match[1] || '';
    const fnStart = match.index + prefix.length;
    const parenOpen = fnStart + match[2].length;

    let depth = 1;
    let i = parenOpen + 1;
    while (i < cssText.length && depth > 0) {
      const ch = cssText[i];
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      i++;
    }

    if (depth !== 0) {
      result += cssText.slice(cursor, parenOpen + 1);
      cursor = parenOpen + 1;
      continue;
    }

    result += cssText.slice(cursor, fnStart);
    const rawExpr = cssText.slice(fnStart, i);
    const expanded = expandCssVars(rawExpr, varMap);
    const safeColor = expanded.includes('var(') ? rawExpr : resolveCssColorToRgba(expanded);
    result += safeColor;
    cursor = i;
  }

  return result;
}

/**
 * Extracts CSS text from all same-origin stylesheets + inline styles, collects custom properties,
 * and sanitizes Tailwind v4 oklch/oklab/color-mix tokens for html2canvas compatibility.
 */
function collectSanitizedStylesheets(): { combinedCss: string; externalLinksHtml: string; varMap: Map<string, string> } {
  const varMap = new Map<string, string>();
  const rawChunks: string[] = [];
  let externalLinksHtml = '';

  try {
    const rootStyle = getComputedStyle(document.documentElement);
    for (let i = 0; i < rootStyle.length; i++) {
      const prop = rootStyle[i];
      if (prop.startsWith('--')) {
        const val = rootStyle.getPropertyValue(prop).trim();
        if (val) varMap.set(prop, val);
      }
    }
  } catch {
    // ignore
  }

  const sheets = Array.from(document.styleSheets);
  for (const sheet of sheets) {
    try {
      const rules = sheet.cssRules;
      if (!rules) continue;
      let chunk = '';
      for (let i = 0; i < rules.length; i++) {
        chunk += rules[i].cssText + '\n';
      }
      rawChunks.push(chunk);
    } catch {
      // Cross-origin stylesheet (e.g. Google Fonts)
      if (sheet.href) {
        externalLinksHtml += `<link rel="stylesheet" href="${sheet.href}" />\n`;
      }
    }
  }

  let combined = rawChunks.join('\n');

  // Also index custom property declarations inside stylesheets (including @property initial-value / :root)
  const varDeclRegex = /(--[a-zA-Z0-9_-]+)\s*:\s*([^;{}]+)/g;
  let vm: RegExpExecArray | null;
  while ((vm = varDeclRegex.exec(combined)) !== null) {
    if (!varMap.has(vm[1])) {
      varMap.set(vm[1], vm[2].trim());
    }
  }

  combined = sanitizeModernColorsInCss(combined, varMap);
  return { combinedCss: combined, externalLinksHtml, varMap };
}

/**
 * Converts an <img> element to a crisp grayscale data URL when B&W mode is active
 * because html2canvas does not apply CSS `filter: grayscale(...)`.
 */
async function convertImgToGrayscaleDataUrl(img: HTMLImageElement): Promise<string | null> {
  try {
    if (!img.complete) {
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
        setTimeout(resolve, 2000);
      });
    }
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) return null;

    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    if (!ctx) return null;

    ctx.filter = 'grayscale(100%) contrast(125%)';
    ctx.drawImage(img, 0, 0, w, h);
    return c.toDataURL('image/png');
  } catch {
    return null;
  }
}

/**
 * Waits for web fonts and all <img> assets within a document/root to finish loading.
 */
async function waitForAssetsReady(doc: Document, root: ParentNode = doc): Promise<void> {
  try {
    if (doc.fonts?.ready) {
      await doc.fonts.ready;
    }
  } catch {
    // ignore
  }

  const imgs = Array.from(root.querySelectorAll('img'));
  await Promise.all(
    imgs.map((img) => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise<void>((resolve) => {
        const done = () => resolve();
        img.addEventListener('load', done, { once: true });
        img.addEventListener('error', done, { once: true });
        setTimeout(done, 2500);
      });
    })
  );

  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

/**
 * Downloads a DOM element as a real, multi-page PDF file with 100% WYSIWYG fidelity
 * matching the on-screen preview (colors, grids, borders, badges, B&W mode, and layout).
 */
export async function downloadElementAsPdf(
  elementOrId: HTMLElement | string,
  fileName: string = 'document.pdf',
  options: PdfExportOptions = {}
): Promise<boolean> {
  const safeName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;

  try {
    const element =
      typeof elementOrId === 'string'
        ? document.getElementById(elementOrId)
        : elementOrId;

    if (!element) {
      console.error('downloadElementAsPdf: target element not found', elementOrId);
      return false;
    }

    const orientation = options.orientation || 'portrait';
    const scale = options.scale || 2;
    // Exact A4 document pixel width at 96 DPI (210mm ≈ 794px, 297mm ≈ 1122px)
    const docPixelWidth = orientation === 'landscape' ? 1122 : 794;
    // Desktop evaluation width so sm:/md:/lg: classes match desktop preview cleanly
    const desktopViewportWidth = orientation === 'landscape' ? 1280 : 1120;
    const outerBufferPx = 12;

    let pageBlocks = Array.from(element.querySelectorAll<HTMLElement>('.pdf-page-block'));
    if (pageBlocks.length === 0) {
      pageBlocks = [element];
    }

    const { combinedCss, externalLinksHtml, varMap } = collectSanitizedStylesheets();

    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format: options.format || 'a4',
      compress: true
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let pageAdded = false;

    for (let i = 0; i < pageBlocks.length; i++) {
      const block = pageBlocks[i];
      const isBwActive =
        block.classList.contains('bw-mode-active') || Boolean(block.closest('.bw-mode-active'));

      // Build an isolated offscreen stage so modal scrollbars / max-h never clip and outlines never get cut
      const stage = document.createElement('div');
      stage.style.position = 'fixed';
      stage.style.left = '-99999px';
      stage.style.top = '0';
      stage.style.width = `${docPixelWidth + outerBufferPx * 2}px`;
      stage.style.padding = `${outerBufferPx}px`;
      stage.style.background = '#ffffff';
      stage.style.boxSizing = 'border-box';
      stage.style.zIndex = '-1';
      if (isBwActive) {
        stage.classList.add('bw-mode-active');
      }

      const clonedBlock = block.cloneNode(true) as HTMLElement;
      clonedBlock.style.width = `${docPixelWidth}px`;
      clonedBlock.style.maxWidth = `${docPixelWidth}px`;
      clonedBlock.style.minWidth = `${docPixelWidth}px`;
      clonedBlock.style.margin = '0 auto';
      clonedBlock.style.maxHeight = 'none';
      clonedBlock.style.height = 'auto';
      clonedBlock.style.overflow = 'visible';

      stage.appendChild(clonedBlock);
      document.body.appendChild(stage);

      try {
        // Ensure all scrollable containers inside clone expand completely
        stage.querySelectorAll<HTMLElement>('.overflow-x-auto, .overflow-y-auto, .overflow-auto, .overflow-hidden').forEach((box) => {
          box.style.overflow = 'visible';
          box.style.maxHeight = 'none';
        });
        stage.querySelectorAll<HTMLElement>('.no-print').forEach((el) => {
          el.style.display = 'none';
        });

        await waitForAssetsReady(document, stage);

        if (isBwActive) {
          const imgs = Array.from(stage.querySelectorAll('img'));
          for (const img of imgs) {
            img.crossOrigin = 'anonymous';
            const grayUrl = await convertImgToGrayscaleDataUrl(img);
            if (grayUrl) {
              img.src = grayUrl;
            }
          }
        }

        // Will hold exact breakable row/section Y offsets measured at desktop viewport width inside onclone
        let measuredBreaksPx: Array<{ topPx: number; bottomPx: number }> = [];

        const canvas = await html2canvas(stage, {
          scale,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          imageTimeout: 15000,
          windowWidth: desktopViewportWidth,
          onclone: (clonedDoc, clonedStage) => {
            // Remove all original stylesheets/styles that may contain oklch/oklab/color-mix
            // and replace them with our pre-sanitized CSS + any cross-origin font links.
            clonedDoc.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => {
              node.remove();
            });

            if (externalLinksHtml) {
              const linkContainer = clonedDoc.createElement('div');
              linkContainer.innerHTML = externalLinksHtml;
              Array.from(linkContainer.children).forEach((child) => {
                clonedDoc.head.appendChild(child);
              });
            }

            const sanitizedStyleEl = clonedDoc.createElement('style');
            sanitizedStyleEl.textContent =
              combinedCss +
              `
              html, body { background: #ffffff !important; color: #0f172a !important; }
              tr { page-break-inside: avoid !important; break-inside: avoid !important; }
            `;
            clonedDoc.head.appendChild(sanitizedStyleEl);

            // Extra per-element safety pass: sanitize any remaining modern color tokens in computed/inline styles
            const clonedView = clonedDoc.defaultView;
            const colorProps = [
              'color',
              'backgroundColor',
              'borderTopColor',
              'borderRightColor',
              'borderBottomColor',
              'borderLeftColor',
              'outlineColor',
              'backgroundImage',
              'boxShadow'
            ] as const;

            const allNodes = [clonedStage, ...Array.from(clonedStage.querySelectorAll<HTMLElement>('*'))];
            for (const el of allNodes) {
              if (el.tagName === 'IMG') {
                (el as HTMLImageElement).crossOrigin = 'anonymous';
              }
              if (clonedView) {
                const cs = clonedView.getComputedStyle(el);
                for (const prop of colorProps) {
                  const val = cs[prop];
                  if (val && /(?:oklch|oklab|color-mix|color)\s*\(/i.test(val)) {
                    (el.style as any)[prop] = sanitizeModernColorsInCss(val, varMap);
                  }
                }
              }
            }

            // Measure breakable row/card coordinates relative to clonedStage at true desktop width
            const stageRect = clonedStage.getBoundingClientRect();
            const breakEls = Array.from(clonedStage.querySelectorAll<HTMLElement>('tr, .avoid-break'));
            measuredBreaksPx = breakEls
              .map((el) => {
                const r = el.getBoundingClientRect();
                return {
                  topPx: (r.top - stageRect.top) * scale,
                  bottomPx: (r.bottom - stageRect.top) * scale
                };
              })
              .filter((b) => b.bottomPx > b.topPx);
          }
        });

        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const mmPerPx = pageWidth / imgWidth;
        const totalHeightInMm = imgHeight * mmPerPx;

        if (totalHeightInMm <= pageHeight + 2) {
          if (pageAdded) pdf.addPage();
          const imgData = canvas.toDataURL('image/jpeg', 0.96);
          pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, totalHeightInMm, undefined, 'FAST');
          pageAdded = true;
        } else {
          let currentYPx = 0;
          const pageHeightPx = (pageHeight - 2) / mmPerPx;

          while (currentYPx < imgHeight - 5) {
            let sliceHeightPx = Math.min(pageHeightPx, imgHeight - currentYPx);

            if (currentYPx + sliceHeightPx < imgHeight - 10) {
              const rawTargetY = currentYPx + sliceHeightPx;
              let bestBreakY = rawTargetY;

              for (const b of measuredBreaksPx) {
                if (b.topPx < rawTargetY && b.bottomPx > rawTargetY) {
                  if (b.topPx > currentYPx + 120 * scale) {
                    bestBreakY = b.topPx;
                    break;
                  }
                }
              }

              if (bestBreakY > currentYPx) {
                sliceHeightPx = bestBreakY - currentYPx;
              }
            }

            const canvasSlice = document.createElement('canvas');
            canvasSlice.width = imgWidth;
            canvasSlice.height = Math.max(1, Math.round(sliceHeightPx));

            const ctx = canvasSlice.getContext('2d');
            if (ctx) {
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, canvasSlice.width, canvasSlice.height);
              ctx.drawImage(
                canvas,
                0,
                currentYPx,
                imgWidth,
                sliceHeightPx,
                0,
                0,
                canvasSlice.width,
                canvasSlice.height
              );
            }

            if (pageAdded) pdf.addPage();
            const sliceImgData = canvasSlice.toDataURL('image/jpeg', 0.96);
            const sliceHeightMm = sliceHeightPx * mmPerPx;
            pdf.addImage(sliceImgData, 'JPEG', 0, 0, pageWidth, sliceHeightMm, undefined, 'FAST');
            pageAdded = true;

            currentYPx += sliceHeightPx;
          }
        }
      } finally {
        if (stage.parentNode) {
          document.body.removeChild(stage);
        }
      }
    }

    try {
      pdf.save(safeName);
    } catch (saveErr) {
      console.warn('pdf.save failed, falling back to Blob download:', saveErr);
      const blob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(blob);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.href = blobUrl;
      downloadAnchor.download = safeName;
      downloadAnchor.style.display = 'none';
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();

      setTimeout(() => {
        if (downloadAnchor.parentNode) {
          document.body.removeChild(downloadAnchor);
        }
        URL.revokeObjectURL(blobUrl);
      }, 2000);
    }

    return true;
  } catch (err) {
    console.warn('Canvas PDF generation encountered an error, falling back to direct print window:', err);
    printElementDirectly(elementOrId, { orientation: options.orientation });
    return false;
  }
}

/**
 * Cleanly prints an isolated element via an offscreen desktop-width iframe
 * preserving the exact screen colors, responsive grids, borders, badges, and proportions.
 */
export function printElementDirectly(
  elementOrId: HTMLElement | string,
  options?: { orientation?: 'portrait' | 'landscape' }
): void {
  const element =
    typeof elementOrId === 'string'
      ? document.getElementById(elementOrId)
      : elementOrId;

  if (!element) {
    window.print();
    return;
  }

  try {
    let stylesHtml = '';
    document.querySelectorAll('link[rel="stylesheet"], style').forEach((node) => {
      stylesHtml += node.outerHTML;
    });

    const printOrientation = options?.orientation || 'portrait';
    const desktopWidthPx = printOrientation === 'landscape' ? 1240 : 1120;
    const isBwActive =
      element.classList.contains('bw-mode-active') || Boolean(element.closest('.bw-mode-active'));

    // Use a desktop-width offscreen iframe so sm:/md:/lg: Tailwind breakpoints match desktop preview
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.left = '-99999px';
    iframe.style.top = '0';
    iframe.style.width = `${desktopWidthPx}px`;
    iframe.style.height = '900px';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';

    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      window.print();
      return;
    }

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html lang="am">
        <head>
          <meta charset="utf-8" />
          <base href="${window.location.href}" />
          <title>ይፋዊ ሰነድ</title>
          ${stylesHtml}
          <style>
            @page {
              size: A4 ${printOrientation};
              margin: 6mm 8mm;
            }
            html, body {
              background: #ffffff !important;
              color: #0f172a !important;
              margin: 0 !important;
              padding: 0 !important;
              width: 100% !important;
              height: auto !important;
              overflow: visible !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .no-print {
              display: none !important;
            }
            .overflow-x-auto, .overflow-y-auto, .overflow-auto, .overflow-hidden {
              overflow: visible !important;
              max-height: none !important;
            }
            table {
              border-collapse: collapse !important;
              width: 100% !important;
            }
            thead {
              display: table-header-group;
            }
            tfoot {
              display: table-footer-group;
            }
            tr, .avoid-break {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            .shadow-md, .shadow-sm, .shadow-2xs, .shadow-xs {
              box-shadow: none !important;
            }
          </style>
        </head>
        <body class="${isBwActive ? 'bw-mode-active' : ''}">
          <div style="width: 100%; background: #ffffff; padding: 8px; box-sizing: border-box;">
            ${element.outerHTML}
          </div>
        </body>
      </html>
    `);
    doc.close();

    // Ensure printed element never clips height/overflow
    const rootClone = doc.body.firstElementChild?.firstElementChild as HTMLElement | null;
    if (rootClone) {
      rootClone.style.maxHeight = 'none';
      rootClone.style.overflow = 'visible';
      rootClone.style.margin = '0 auto';
    }

    const runPrint = async () => {
      try {
        await waitForAssetsReady(doc, doc.body);
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.warn('Iframe print failed, falling back to window.print', e);
        window.print();
      } finally {
        setTimeout(() => {
          if (iframe.parentNode) {
            document.body.removeChild(iframe);
          }
        }, 2500);
      }
    };

    runPrint();
  } catch (err) {
    console.warn('Direct print error, falling back to standard print:', err);
    window.print();
  }
}
