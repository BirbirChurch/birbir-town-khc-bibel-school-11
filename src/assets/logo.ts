// Official seal for የብርብር ከተማ ቃለ ሕይወት ቤተ ክርስቲያን መጽሐፍ ቅዱስ ትምህርት ቤት

const SVG_SEAL = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" width="320" height="320">
  <defs>
    <radialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#065f46"/>
      <stop offset="70%" stop-color="#064e3b"/>
      <stop offset="100%" stop-color="#022c22"/>
    </radialGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="40%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#b45309"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.4"/>
    </filter>
    <path id="textCircleTop" d="M 45 160 A 115 115 0 0 1 275 160" fill="none"/>
    <path id="textCircleBottom" d="M 275 160 A 115 115 0 0 1 45 160" fill="none"/>
  </defs>

  <!-- Outer Ring with Gold Border -->
  <circle cx="160" cy="160" r="156" fill="url(#bgGrad)" stroke="url(#goldGrad)" stroke-width="6"/>
  <circle cx="160" cy="160" r="147" fill="none" stroke="#fbbf24" stroke-width="1.5" stroke-dasharray="4,3"/>
  <circle cx="160" cy="160" r="122" fill="#022c22" stroke="url(#goldGrad)" stroke-width="3" filter="url(#shadow)"/>

  <!-- Divine Rays -->
  <g opacity="0.3" stroke="#fde047" stroke-width="1.5">
    <line x1="160" y1="160" x2="160" y2="45"/>
    <line x1="160" y1="160" x2="241" y2="79"/>
    <line x1="160" y1="160" x2="275" y2="160"/>
    <line x1="160" y1="160" x2="241" y2="241"/>
    <line x1="160" y1="160" x2="160" y2="275"/>
    <line x1="160" y1="160" x2="79" y2="241"/>
    <line x1="160" y1="160" x2="45" y2="160"/>
    <line x1="160" y1="160" x2="79" y2="79"/>
  </g>

  <!-- Circular Church Title -->
  <text fill="#fef08a" font-size="13" font-weight="bold" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" letter-spacing="0.5">
    <textPath href="#textCircleTop" startOffset="50%" text-anchor="middle">
      የብርብር ከተማ ቃለ ሕይወት ቤተ ክርስቲያን
    </textPath>
  </text>
  <text fill="#fbbf24" font-size="11" font-weight="bold" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" letter-spacing="0.8">
    <textPath href="#textCircleBottom" startOffset="50%" text-anchor="middle">
      መጽሐፍ ቅዱስ ትምህርት ቤት • BIBLE SCHOOL
    </textPath>
  </text>

  <!-- Radiant Cross Above Bible -->
  <g transform="translate(160, 112)" filter="url(#shadow)">
    <rect x="-4.5" y="-38" width="9" height="56" rx="2" fill="url(#goldGrad)" stroke="#78350f" stroke-width="1"/>
    <rect x="-20" y="-24" width="40" height="9" rx="2" fill="url(#goldGrad)" stroke="#78350f" stroke-width="1"/>
    <circle cx="0" cy="-19.5" r="4.5" fill="#fef08a"/>
  </g>

  <!-- Open Bible (መጽሐፍ ቅዱስ) -->
  <g transform="translate(160, 170)" filter="url(#shadow)">
    <!-- Book Cover Foundation -->
    <path d="M-66 8 C -38 18, -14 12, 0 20 C 14 12, 38 18, 66 8 L 62 50 C 36 58, 14 52, 0 60 C -14 52, -36 58, -62 50 Z" fill="#78350f" stroke="#451a03" stroke-width="1.5"/>
    
    <!-- Left Page -->
    <path d="M-62 5 C -36 15, -12 9, 0 17 L 0 53 C -12 45, -36 51, -58 43 Z" fill="#fefce8" stroke="#d97706" stroke-width="1"/>
    
    <!-- Right Page -->
    <path d="M62 5 C 36 15, 12 9, 0 17 L 0 53 C 12 45, 36 51, 58 43 Z" fill="#fefce8" stroke="#d97706" stroke-width="1"/>
    
    <!-- Page Text Lines (Amharic scripture lines representation) -->
    <line x1="-52" y1="18" x2="-8" y2="26" stroke="#b45309" stroke-width="1.8" stroke-linecap="round"/>
    <line x1="-52" y1="26" x2="-8" y2="34" stroke="#b45309" stroke-width="1.8" stroke-linecap="round"/>
    <line x1="-52" y1="34" x2="-8" y2="42" stroke="#b45309" stroke-width="1.8" stroke-linecap="round"/>

    <line x1="8" y1="26" x2="52" y2="18" stroke="#b45309" stroke-width="1.8" stroke-linecap="round"/>
    <line x1="8" y1="34" x2="52" y2="26" stroke="#b45309" stroke-width="1.8" stroke-linecap="round"/>
    <line x1="8" y1="42" x2="52" y2="34" stroke="#b45309" stroke-width="1.8" stroke-linecap="round"/>

    <!-- Red Ribbon Bookmark -->
    <path d="M0 17 Q 5 40 7 64 L 0 58 L -7 64 Q -3 40 0 17" fill="#dc2626"/>
  </g>

  <!-- Wreath / Olive Branch Accents -->
  <g fill="#34d399" opacity="0.9">
    <circle cx="85" cy="180" r="3"/>
    <circle cx="78" cy="194" r="3.5"/>
    <circle cx="86" cy="208" r="3.5"/>
    <circle cx="235" cy="180" r="3"/>
    <circle cx="242" cy="194" r="3.5"/>
    <circle cx="234" cy="208" r="3.5"/>
  </g>
</svg>`;

function svgToBase64(svg: string): string {
  try {
    if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
      return `data:image/svg+xml;base64,${window.btoa(unescape(encodeURIComponent(svg)))}`;
    }
  } catch (_) {}
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const DEFAULT_CHURCH_LOGO = svgToBase64(SVG_SEAL);

export const getStoredChurchLogo = (): string => {
  if (typeof window !== 'undefined') {
    try {
      const custom = localStorage.getItem('birbir_church_logo');
      if (custom && custom.trim().length > 20) {
        return custom;
      }
    } catch (_) {}
  }
  return DEFAULT_CHURCH_LOGO;
};

export const saveChurchLogo = (logoDataUrl: string): void => {
  if (typeof window !== 'undefined') {
    try {
      if (logoDataUrl) {
        localStorage.setItem('birbir_church_logo', logoDataUrl);
      } else {
        localStorage.removeItem('birbir_church_logo');
      }
    } catch (e) {
      console.warn('localStorage save logo quota note:', e);
    }

    // Also save into IndexedDB for permanent storage that never gets wiped by localStorage quotas
    try {
      if (window.indexedDB) {
        const req = indexedDB.open('BirbirKHC_Storage', 1);
        req.onupgradeneeded = (e: any) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains('branding_assets')) {
            db.createObjectStore('branding_assets');
          }
        };
        req.onsuccess = () => {
          try {
            const db = req.result;
            const tx = db.transaction('branding_assets', 'readwrite');
            const store = tx.objectStore('branding_assets');
            if (logoDataUrl) {
              store.put(logoDataUrl, 'birbir_church_logo');
            } else {
              store.delete('birbir_church_logo');
            }
          } catch (_) {}
        };
      }
    } catch (_) {}
  }
};

export const loadPersistentChurchLogo = async (): Promise<string> => {
  if (typeof window === 'undefined') return DEFAULT_CHURCH_LOGO;
  try {
    if (window.indexedDB) {
      const idbLogo = await new Promise<string | null>((resolve) => {
        try {
          const req = indexedDB.open('BirbirKHC_Storage', 1);
          req.onupgradeneeded = (e: any) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('branding_assets')) {
              db.createObjectStore('branding_assets');
            }
          };
          req.onsuccess = () => {
            try {
              const db = req.result;
              const tx = db.transaction('branding_assets', 'readonly');
              const store = tx.objectStore('branding_assets');
              const getReq = store.get('birbir_church_logo');
              getReq.onsuccess = () => resolve(getReq.result || null);
              getReq.onerror = () => resolve(null);
            } catch {
              resolve(null);
            }
          };
          req.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      });

      if (idbLogo && idbLogo.trim().length > 20) {
        try {
          localStorage.setItem('birbir_church_logo', idbLogo);
        } catch (_) {}
        return idbLogo;
      }
    }
  } catch (_) {}
  return getStoredChurchLogo();
};

export const loadPersistentOfficialConfig = async (): Promise<any | null> => {
  if (typeof window === 'undefined') return null;
  try {
    if (window.indexedDB) {
      const raw = await new Promise<string | null>((resolve) => {
        try {
          const req = indexedDB.open('BirbirKHC_Storage', 1);
          req.onupgradeneeded = (e: any) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('branding_assets')) {
              db.createObjectStore('branding_assets');
            }
          };
          req.onsuccess = () => {
            try {
              const db = req.result;
              const tx = db.transaction('branding_assets', 'readonly');
              const store = tx.objectStore('branding_assets');
              const getReq = store.get('bk_official_config');
              getReq.onsuccess = () => resolve(getReq.result || null);
              getReq.onerror = () => resolve(null);
            } catch {
              resolve(null);
            }
          };
          req.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      });
      if (raw) {
        return JSON.parse(raw);
      }
    }
  } catch (_) {}
  return null;
};

export const CHURCH_LOGO = DEFAULT_CHURCH_LOGO;
