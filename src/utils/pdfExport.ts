import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface PdfExportOptions {
  fileName?: string;
  orientation?: 'portrait' | 'landscape';
  format?: 'a4' | 'letter';
  scale?: number;
}

/**
 * Downloads a DOM element as a real, multi-page vector/raster PDF file.
 * Handles SVG images, cross-origin assets, and iframe environments reliably.
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
    const a4PixelWidth = orientation === 'landscape' ? 1120 : 800;

    let pageBlocks = Array.from(element.querySelectorAll<HTMLElement>('.pdf-page-block'));
    if (pageBlocks.length === 0) {
      pageBlocks = [element];
    }

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
      const canvas = await html2canvas(block, {
        scale,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: a4PixelWidth,
        onclone: (clonedDoc, clonedElement) => {
          clonedElement.style.overflow = 'visible';
          clonedElement.style.maxHeight = 'none';
          clonedElement.style.height = 'auto';
          clonedElement.style.width = `${a4PixelWidth}px`;
          clonedElement.style.maxWidth = `${a4PixelWidth}px`;
          clonedElement.style.minWidth = `${a4PixelWidth}px`;
          clonedElement.style.margin = '0 auto';
          clonedElement.style.backgroundColor = '#ffffff';

          const overflowBoxes = clonedElement.querySelectorAll('.overflow-x-auto, .overflow-y-auto, .overflow-auto, .overflow-hidden');
          overflowBoxes.forEach((box) => {
            (box as HTMLElement).style.overflow = 'visible';
            (box as HTMLElement).style.maxHeight = 'none';
          });

          const tables = clonedElement.querySelectorAll('table');
          tables.forEach((tbl) => {
            (tbl as HTMLElement).style.width = '100%';
            (tbl as HTMLElement).style.tableLayout = 'auto';
            (tbl as HTMLElement).style.overflow = 'visible';
          });

          const rows = clonedElement.querySelectorAll('tr');
          rows.forEach((r) => {
            (r as HTMLElement).style.pageBreakInside = 'avoid';
            (r as HTMLElement).style.breakInside = 'avoid';
          });

          const cells = clonedElement.querySelectorAll('th, td');
          cells.forEach((c) => {
            const text = c.textContent || '';
            if (
              c.classList.contains('whitespace-nowrap') ||
              c.classList.contains('student-name') ||
              text.includes('ስም') ||
              text.includes('መለያ') ||
              text.includes('ID') ||
              text.length <= 30
            ) {
              (c as HTMLElement).style.whiteSpace = 'nowrap';
              (c as HTMLElement).style.wordBreak = 'keep-all';
              (c as HTMLElement).style.overflow = 'visible';
              (c as HTMLElement).style.textOverflow = 'clip';
            }
          });

          const studentNameCells = clonedElement.querySelectorAll('.student-name');
          studentNameCells.forEach((c) => {
            (c as HTMLElement).style.whiteSpace = 'nowrap';
            (c as HTMLElement).style.wordBreak = 'keep-all';
            (c as HTMLElement).style.overflow = 'visible';
            (c as HTMLElement).style.textOverflow = 'clip';
            (c as HTMLElement).style.minWidth = '220px';
          });

          const images = clonedElement.querySelectorAll('img');
          images.forEach((img) => {
            img.crossOrigin = 'anonymous';
          });

          const noPrintItems = clonedElement.querySelectorAll('.no-print');
          noPrintItems.forEach((el) => {
            (el as HTMLElement).style.display = 'none';
          });
        }
      });

      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const mmPerPx = pageWidth / imgWidth;
      const totalHeightInMm = imgHeight * mmPerPx;

      if (totalHeightInMm <= pageHeight) {
        if (pageAdded) pdf.addPage();
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, totalHeightInMm, undefined, 'FAST');
        pageAdded = true;
      } else {
        const slicePx = (pageHeight - 4) / mmPerPx;
        let currentYPx = 0;

        while (currentYPx < imgHeight) {
          const canvasSlice = document.createElement('canvas');
          canvasSlice.width = imgWidth;
          const heightToDraw = Math.min(slicePx, imgHeight - currentYPx);
          canvasSlice.height = heightToDraw;

          const ctx = canvasSlice.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, imgWidth, heightToDraw);
            ctx.drawImage(
              canvas,
              0, currentYPx, imgWidth, heightToDraw,
              0, 0, imgWidth, heightToDraw
            );
          }

          if (pageAdded) pdf.addPage();
          const sliceImgData = canvasSlice.toDataURL('image/jpeg', 0.95);
          const sliceHeightMm = heightToDraw * mmPerPx;
          pdf.addImage(sliceImgData, 'JPEG', 0, 0, pageWidth, sliceHeightMm, undefined, 'FAST');
          pageAdded = true;

          currentYPx += heightToDraw;
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
 * Cleanly prints an isolated element via a hidden iframe so the main UI,
 * modal dark backdrops, and navigation never appear or cause blank printouts.
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
    // Collect all stylesheets from current document
    let stylesHtml = '';
    document.querySelectorAll('link[rel="stylesheet"], style').forEach((node) => {
      stylesHtml += node.outerHTML;
    });

    // Create a temporary hidden iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';

    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      window.print();
      return;
    }

    const printOrientation = options?.orientation || 'portrait';

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html lang="am">
        <head>
          <meta charset="utf-8" />
          <title>ይፋዊ ሰነድ</title>
          ${stylesHtml}
          <style>
            @page {
              size: A4 ${printOrientation};
              margin: 6mm 8mm;
            }
            body {
              background: #ffffff !important;
              color: #0f172a !important;
              margin: 0 !important;
              padding: 0 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .no-print {
              display: none !important;
            }
            .overflow-x-auto, .overflow-y-auto, .overflow-hidden {
              overflow: visible !important;
              max-height: none !important;
            }
            table {
              border-collapse: collapse !important;
              width: 100% !important;
              max-width: 100% !important;
              table-layout: auto !important;
            }
            th, td {
              border-color: #94a3b8 !important;
              padding: 4px 6px !important;
            }
            .student-name, td.student-name, th.student-name {
              min-width: 200px !important;
              white-space: nowrap !important;
              word-break: keep-all !important;
              overflow: visible !important;
            }
            .whitespace-nowrap, td:nth-child(2), td:nth-child(3) {
              white-space: nowrap !important;
              word-break: keep-all !important;
            }
          </style>
        </head>
        <body>
          <div style="width: 100%; background: #ffffff; color: #0f172a; padding: 4px;">
            ${element.outerHTML}
          </div>
        </body>
      </html>
    `);
    doc.close();

    // Give images and fonts a moment to layout in iframe, then trigger print
    setTimeout(() => {
      try {
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
        }, 2000);
      }
    }, 450);
  } catch (err) {
    console.warn('Direct print error, falling back to standard print:', err);
    window.print();
  }
}
