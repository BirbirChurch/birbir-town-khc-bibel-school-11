import React, { useRef, useState, useEffect } from 'react';
import {
  ShieldCheck,
  Upload,
  Trash2,
  PenTool,
  Check,
  Eye,
  RefreshCw,
  Award,
  Sparkles,
  FileCheck
} from 'lucide-react';
import { OfficialSignaturesConfig } from '../types.ts';
import { CHURCH_LOGO } from '../assets/logo.ts';
import { compressImage } from '../utils/imageCompressor.ts';

interface OfficialSignaturesManagerProps {
  config: OfficialSignaturesConfig;
  onSaveConfig: (updated: OfficialSignaturesConfig) => void;
  showNotify: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  userRoleTitle: 'ዋና ዲን' | 'ዋና አድሚን';
  churchLogo?: string;
}

export const OfficialSignaturesManager: React.FC<OfficialSignaturesManagerProps> = ({
  config,
  onSaveConfig,
  showNotify,
  userRoleTitle,
  churchLogo
}) => {
  const [localConfig, setLocalConfig] = useState<OfficialSignaturesConfig>({
    showStamp: config.showStamp ?? false,
    stampImage: config.stampImage || '',
    useChurchLogoAsStamp: config.useChurchLogoAsStamp ?? true,
    showDeanSignature: config.showDeanSignature ?? false,
    deanSignatureImage: config.deanSignatureImage || '',
    deanName: config.deanName || 'መ/ር ገላቲያ ድስታ',
    deanTitle: config.deanTitle || 'የዋና ዲን ስምና ፊርማ (Academic Dean Signature)',
    showRegistrarSignature: config.showRegistrarSignature ?? false,
    registrarSignatureImage: config.registrarSignatureImage || '',
    registrarName: config.registrarName || 'መ/ር አስራት አማኑኤል',
    registrarTitle: config.registrarTitle || 'የሪጅስተራል ስምና ፊርማ (Registrar Signature)'
  });

  // Active drawer modal state for canvas signature
  const [drawingFor, setDrawingFor] = useState<'DEAN' | 'REGISTRAR' | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawnStroke, setHasDrawnStroke] = useState(false);

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  // Handle image file upload for stamp or signatures
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'STAMP' | 'DEAN' | 'REGISTRAR'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      showNotify('የምስሉ መጠን ከ 8MB መብለጥ የለበትም', 'error');
      return;
    }

    try {
      // Compress to optimal dimensions for crisp seal / signature (< 50KB)
      const maxDim = target === 'STAMP' ? 450 : 380;
      const compressed = await compressImage(file, maxDim, 0.9, true);

      let updated: OfficialSignaturesConfig;

      if (target === 'STAMP') {
        updated = {
          ...localConfig,
          stampImage: compressed,
          showStamp: true,
          useChurchLogoAsStamp: false
        };
      } else if (target === 'DEAN') {
        updated = {
          ...localConfig,
          deanSignatureImage: compressed,
          showDeanSignature: true
        };
      } else {
        updated = {
          ...localConfig,
          registrarSignatureImage: compressed,
          showRegistrarSignature: true
        };
      }

      setLocalConfig(updated);
      onSaveConfig(updated);
      // Persist permanently in IndexedDB as well
      try {
        if (typeof window !== 'undefined' && window.indexedDB) {
          const req = indexedDB.open('BirbirKHC_Storage', 1);
          req.onupgradeneeded = (ev: any) => {
            const db = ev.target.result;
            if (!db.objectStoreNames.contains('branding_assets')) {
              db.createObjectStore('branding_assets');
            }
          };
          req.onsuccess = () => {
            try {
              const db = req.result;
              const tx = db.transaction('branding_assets', 'readwrite');
              const store = tx.objectStore('branding_assets');
              store.put(JSON.stringify(updated), 'bk_official_config');
            } catch (_) {}
          };
        }
      } catch (_) {}

      showNotify(
        target === 'STAMP'
          ? 'ይፋዊ ማኅተም በስኬት ተጭኖ በቋሚነት ተቀምጧል!'
          : 'ይፋዊ ፊርማ በስኬት ተጭኖ በቋሚነት ተቀምጧል!',
        'success'
      );
    } catch (err) {
      console.error('Error compressing upload:', err);
      showNotify('ምስሉን ማስተናገድ አልተቻለም፤ እባክዎ እንደገና ይሞክሩ', 'error');
    }

    e.target.value = '';
  };

  // Canvas drawing functions
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasDrawnStroke(true);
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a'; // Deep slate ink
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawnStroke(false);
  };

  const saveCanvasSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !drawingFor) return;

    const dataUrl = canvas.toDataURL('image/png');
    let updated: OfficialSignaturesConfig;

    if (drawingFor === 'DEAN') {
      updated = {
        ...localConfig,
        deanSignatureImage: dataUrl,
        showDeanSignature: true
      };
    } else {
      updated = {
        ...localConfig,
        registrarSignatureImage: dataUrl,
        showRegistrarSignature: true
      };
    }

    setLocalConfig(updated);
    onSaveConfig(updated);
    setDrawingFor(null);
    showNotify('በእጅ የተፈረመው ፊርማ በስኬት ተቀምጧል!', 'success');
  };

  const handleToggle = (key: keyof OfficialSignaturesConfig) => {
    const updated = {
      ...localConfig,
      [key]: !localConfig[key]
    };
    setLocalConfig(updated);
    onSaveConfig(updated);
    showNotify('የትራንስክሪፕት ይፋዊ ቅንብር ታድሷል!', 'info');
  };

  const effectiveStampImage = localConfig.useChurchLogoAsStamp
    ? churchLogo || CHURCH_LOGO
    : localConfig.stampImage || churchLogo || CHURCH_LOGO;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30">
              <ShieldCheck className="w-4 h-4" />
              <span>ይፋዊ ስልጣን: {userRoleTitle} ብቻ</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              የትራንስክሪፕት ይፋዊ ማኅተምና ፊርማ መቆጣጠሪያ
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              በትራንስክሪፕቱ ላይ የሚወጣውን የተቋሙን ይፋዊ ማኅተምና ፊርማዎች እዚህ ማስተካከል፣ መጫን፣ በስክሪኑ ላይ መፈረም 
              ወይም እንደ አስፈላጊነቱ በእጅ ለመፈረም ማብራት/ማጥፋት (Toggle) ይችላሉ።
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onSaveConfig(localConfig);
                showNotify('ሁሉም ይፋዊ ማኅተምና ፊርማዎች በዳታቤዝ ውስጥ ተቀምጠዋል!', 'success');
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-2xl shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>ለውጦችን አጽድቅ (Save All)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid: 3 Main Cards (Stamp, Dean Signature, Registrar Signature) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* CARD 1: Official Stamp */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-indigo-700" />
                <h3 className="font-bold text-sm text-slate-900">የተቋሙ ይፋዊ ማኅተም (Stamp)</h3>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                localConfig.showStamp ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
              }`}>
                {localConfig.showStamp ? 'በርቷል (Visible)' : 'ጠፍቷል (Hidden)'}
              </span>
            </div>

            <p className="text-xs text-slate-500">
              ማኅተሙ በትራንስክሪፕት ላይ እንዲታተም ወይም ተማሪው ሲቀበል በእጅ በቀለም እንዲታተም መወሰን ይችላሉ።
            </p>

            {/* Stamp Preview */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center justify-center min-h-[140px] text-center">
              {localConfig.showStamp ? (
                <div className="relative group flex flex-col items-center">
                  <div className="w-24 h-24 rounded-full border-2 border-dashed border-indigo-500/80 p-2 flex items-center justify-center bg-white shadow-inner">
                    <img
                      src={effectiveStampImage}
                      alt="የተቋሙ ማኅተም"
                      className="w-16 h-16 object-contain"
                    />
                  </div>
                  <span className="text-[10px] font-bold text-slate-600 mt-2">
                    {localConfig.useChurchLogoAsStamp ? 'የቤተ ክርስቲያኑ ዓርማ ማኅተም' : 'የተጫነ ይፋዊ ማኅተም'}
                  </span>
                </div>
              ) : (
                <div className="text-center text-slate-400 py-4">
                  <p className="text-xs font-semibold">ማኅተም በትራንስክሪፕት ላይ አይታይም</p>
                  <p className="text-[10px] mt-1 text-slate-400">(በህትመት ወቅት በእጅ ማኅተም ይደረግበታል)</p>
                </div>
              )}
            </div>

            {/* Toggle Switch */}
            <div className="flex items-center justify-between p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl">
              <span className="text-xs font-bold text-indigo-950">በትራንስክሪፕት ላይ ይታይ:</span>
              <button
                type="button"
                onClick={() => handleToggle('showStamp')}
                className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${
                  localConfig.showStamp ? 'bg-emerald-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                    localConfig.showStamp ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Action buttons for Stamp */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <label className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors">
                <Upload className="w-3.5 h-3.5" />
                <span>አዲስ ማኅተም ጫን (Upload)</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, 'STAMP')}
                  className="hidden"
                />
              </label>

              <button
                onClick={() => {
                  const updated = {
                    ...localConfig,
                    useChurchLogoAsStamp: true,
                    showStamp: true
                  };
                  setLocalConfig(updated);
                  onSaveConfig(updated);
                  showNotify('የቤተ ክርስቲያኑ ዓርማ እንደ ይፋዊ ማኅተም ተመርጧል!', 'info');
                }}
                title="የቤተ ክርስቲያኑን ዓርማ እንደ ማኅተም ተጠቀም"
                className="p-2 border border-slate-300 hover:bg-slate-100 rounded-xl text-slate-700 transition-colors cursor-pointer text-xs flex items-center gap-1 font-semibold"
              >
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>ዓርማ</span>
              </button>
            </div>

            {localConfig.stampImage && !localConfig.useChurchLogoAsStamp && (
              <button
                onClick={() => {
                  const updated = {
                    ...localConfig,
                    stampImage: '',
                    useChurchLogoAsStamp: true
                  };
                  setLocalConfig(updated);
                  onSaveConfig(updated);
                  showNotify('የተጫነው ማኅተም ተሰርዟል፤ ወደ ነባሪው ዓርማ ተመልሷል።', 'info');
                }}
                className="w-full text-[11px] text-rose-600 hover:text-rose-800 font-bold py-1 flex items-center justify-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>የተጫነውን ማኅተም አስወግድ</span>
              </button>
            )}
          </div>
        </div>

        {/* CARD 2: Academic Dean Signature */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PenTool className="w-5 h-5 text-emerald-700" />
                <h3 className="font-bold text-sm text-slate-900">የዋና ዲን ፊርማ (Dean)</h3>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                localConfig.showDeanSignature ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
              }`}>
                {localConfig.showDeanSignature ? 'በርቷል (Visible)' : 'ጠፍቷል (Hidden)'}
              </span>
            </div>

            {/* Dean Name Input */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                የዋና ዲን ሙሉ ስም:
              </label>
              <input
                type="text"
                value={localConfig.deanName || ''}
                onChange={(e) => setLocalConfig({ ...localConfig, deanName: e.target.value })}
                onBlur={() => onSaveConfig(localConfig)}
                placeholder="መ/ር ገላቲያ ድስታ"
                className="w-full px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
            </div>

            {/* Dean Signature Preview */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center justify-center min-h-[140px] text-center">
              {localConfig.showDeanSignature && localConfig.deanSignatureImage ? (
                <div className="flex flex-col items-center">
                  <div className="h-16 flex items-center justify-center">
                    <img
                      src={localConfig.deanSignatureImage}
                      alt="የዋና ዲን ፊርማ"
                      className="max-h-16 max-w-full object-contain filter drop-shadow-xs"
                    />
                  </div>
                  <div className="border-b border-slate-900 w-36 mt-1"></div>
                  <span className="text-[10px] font-bold text-slate-700 mt-1">
                    {localConfig.deanName || 'ዋና ዲን'}
                  </span>
                </div>
              ) : (
                <div className="text-center text-slate-400 py-4">
                  <div className="border-b border-slate-400 w-36 mx-auto mb-2"></div>
                  <p className="text-xs font-semibold">ባዶ የፊርማ ቦታ (Manual Signature)</p>
                  <p className="text-[10px] mt-1 text-slate-400">(ሲታተም በስክሪፕቶ የሚፈረምበት መስመር)</p>
                </div>
              )}
            </div>

            {/* Toggle Switch */}
            <div className="flex items-center justify-between p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl">
              <span className="text-xs font-bold text-emerald-950">ዲጂታል ፊርማ በትራንስክሪፕት ላይ ይታይ:</span>
              <button
                type="button"
                onClick={() => handleToggle('showDeanSignature')}
                className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${
                  localConfig.showDeanSignature ? 'bg-emerald-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                    localConfig.showDeanSignature ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Action buttons for Dean Signature */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setDrawingFor('DEAN')}
                className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold py-2 px-2.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <PenTool className="w-3.5 h-3.5 text-amber-400" />
                <span>በእጅ ፈርም (Draw)</span>
              </button>

              <label className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold py-2 px-2.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors">
                <Upload className="w-3.5 h-3.5" />
                <span>ፊርማ ጫን</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, 'DEAN')}
                  className="hidden"
                />
              </label>
            </div>

            {localConfig.deanSignatureImage && (
              <button
                onClick={() => {
                  const updated = {
                    ...localConfig,
                    deanSignatureImage: '',
                    showDeanSignature: false
                  };
                  setLocalConfig(updated);
                  onSaveConfig(updated);
                  showNotify('የዋና ዲን ፊርማ ተሰርዟል፤ ባዶ መስመር እንዲሆን ተደርጓል።', 'info');
                }}
                className="w-full text-[11px] text-rose-600 hover:text-rose-800 font-bold py-1 flex items-center justify-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>የተቀመጠውን ፊርማ ሰርዝ</span>
              </button>
            )}
          </div>
        </div>

        {/* CARD 3: Registrar Signature */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-sm text-slate-900">የሪጅስተራል ፊርማ (Registrar)</h3>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                localConfig.showRegistrarSignature ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
              }`}>
                {localConfig.showRegistrarSignature ? 'በርቷል (Visible)' : 'ጠፍቷል (Hidden)'}
              </span>
            </div>

            {/* Registrar Name Input */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                የሪጅስተራል ሙሉ ስም:
              </label>
              <input
                type="text"
                value={localConfig.registrarName || ''}
                onChange={(e) => setLocalConfig({ ...localConfig, registrarName: e.target.value })}
                onBlur={() => onSaveConfig(localConfig)}
                placeholder="መ/ር አስራት አማኑኤል"
                className="w-full px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            {/* Registrar Signature Preview */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center justify-center min-h-[140px] text-center">
              {localConfig.showRegistrarSignature && localConfig.registrarSignatureImage ? (
                <div className="flex flex-col items-center">
                  <div className="h-16 flex items-center justify-center">
                    <img
                      src={localConfig.registrarSignatureImage}
                      alt="የሪጅስተራል ፊርማ"
                      className="max-h-16 max-w-full object-contain filter drop-shadow-xs"
                    />
                  </div>
                  <div className="border-b border-slate-900 w-36 mt-1"></div>
                  <span className="text-[10px] font-bold text-slate-700 mt-1">
                    {localConfig.registrarName || 'ሪጅስተራል'}
                  </span>
                </div>
              ) : (
                <div className="text-center text-slate-400 py-4">
                  <div className="border-b border-slate-400 w-36 mx-auto mb-2"></div>
                  <p className="text-xs font-semibold">ባዶ የፊርማ ቦታ (Manual Signature)</p>
                  <p className="text-[10px] mt-1 text-slate-400">(ሲታተም በስክሪፕቶ የሚፈረምበት መስመር)</p>
                </div>
              )}
            </div>

            {/* Toggle Switch */}
            <div className="flex items-center justify-between p-3 bg-amber-50/60 border border-amber-100 rounded-xl">
              <span className="text-xs font-bold text-amber-950">ዲጂታል ፊርማ በትራንስክሪፕት ላይ ይታይ:</span>
              <button
                type="button"
                onClick={() => handleToggle('showRegistrarSignature')}
                className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${
                  localConfig.showRegistrarSignature ? 'bg-emerald-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                    localConfig.showRegistrarSignature ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Action buttons for Registrar Signature */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setDrawingFor('REGISTRAR')}
                className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold py-2 px-2.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <PenTool className="w-3.5 h-3.5 text-amber-400" />
                <span>በእጅ ፈርም (Draw)</span>
              </button>

              <label className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold py-2 px-2.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors">
                <Upload className="w-3.5 h-3.5" />
                <span>ፊርማ ጫን</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, 'REGISTRAR')}
                  className="hidden"
                />
              </label>
            </div>

            {localConfig.registrarSignatureImage && (
              <button
                onClick={() => {
                  const updated = {
                    ...localConfig,
                    registrarSignatureImage: '',
                    showRegistrarSignature: false
                  };
                  setLocalConfig(updated);
                  onSaveConfig(updated);
                  showNotify('የሪጅስተራል ፊርማ ተሰርዟል፤ ባዶ መስመር እንዲሆን ተደርጓል።', 'info');
                }}
                className="w-full text-[11px] text-rose-600 hover:text-rose-800 font-bold py-1 flex items-center justify-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>የተቀመጠውን ፊርማ ሰርዝ</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Live Transcript Footer Preview Box */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-300">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-indigo-700" />
            <h4 className="font-extrabold text-sm text-slate-900">
              የትራንስክሪፕት ግርጌ የቀጥታ እይታ (Live Preview on Transcript)
            </h4>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            ተማሪዎች ወይም መምህራን ትራንስክሪፕት ሲያትሙ ልክ እንዲህ ይታያል
          </span>
        </div>

        <div className="bg-slate-50/50 p-6 sm:p-8 rounded-2xl border border-slate-200">
          <div className="grid grid-cols-2 gap-12 text-xs font-semibold pt-6 border-t-2 border-slate-300 max-w-2xl mx-auto relative">
            
            {/* Registrar Column */}
            <div className="text-center space-y-3 flex flex-col items-center">
              <p className="text-slate-800 font-bold">{localConfig.registrarTitle}</p>
              
              <div className="h-16 flex items-end justify-center w-full">
                {localConfig.showRegistrarSignature && localConfig.registrarSignatureImage ? (
                  <img
                    src={localConfig.registrarSignatureImage}
                    alt="ፊርማ"
                    className="max-h-16 max-w-full object-contain filter drop-shadow-xs"
                  />
                ) : (
                  <div className="h-4"></div>
                )}
              </div>

              <div className="border-b border-slate-900 w-3/4 mx-auto"></div>
              <p className="text-[11px] font-bold text-slate-700">{localConfig.registrarName}</p>
              <p className="text-[10px] text-slate-500">ቀን: _________________</p>
            </div>

            {/* Optional Stamp positioned between or alongside */}
            {localConfig.showStamp && (
              <div className="absolute left-1/2 -top-4 transform -translate-x-1/2 flex flex-col items-center pointer-events-none opacity-95">
                <img
                  src={effectiveStampImage}
                  alt="ማኅተም"
                  className="w-28 h-28 object-contain drop-shadow-sm select-none"
                />
              </div>
            )}

            {/* Dean Column */}
            <div className="text-center space-y-3 flex flex-col items-center">
              <p className="text-slate-800 font-bold">{localConfig.deanTitle}</p>
              
              <div className="h-16 flex items-end justify-center w-full">
                {localConfig.showDeanSignature && localConfig.deanSignatureImage ? (
                  <img
                    src={localConfig.deanSignatureImage}
                    alt="ፊርማ"
                    className="max-h-16 max-w-full object-contain filter drop-shadow-xs"
                  />
                ) : (
                  <div className="h-4"></div>
                )}
              </div>

              <div className="border-b border-slate-900 w-3/4 mx-auto"></div>
              <p className="text-[11px] font-bold text-slate-700">{localConfig.deanName}</p>
              <p className="text-[10px] text-slate-500">ቀን: _________________</p>
            </div>
          </div>
        </div>
      </div>

      {/* DRAW SIGNATURE MODAL */}
      {drawingFor && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <PenTool className="w-5 h-5 text-emerald-700" />
                <h3 className="font-extrabold text-base text-slate-900">
                  {drawingFor === 'DEAN' ? 'የዋና ዲን ፊርማ መሳያ' : 'የሪጅስተራል ፊርማ መሳያ'}
                </h3>
              </div>
              <button
                onClick={() => setDrawingFor(null)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              በማውዝ (Mouse) ወይም በስልኮ/ታብሌቶ ስክሪን ላይ ጣትዎን በመጠቀም ትክክለኛ ፊርማዎን እዚህ ያኑሩ፦
            </p>

            <div className="border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50 overflow-hidden flex items-center justify-center touch-none">
              <canvas
                ref={canvasRef}
                width={440}
                height={180}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="cursor-crosshair bg-white w-full h-[180px]"
              />
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={clearCanvas}
                className="text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-2 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>አጽዳ (Clear)</span>
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDrawingFor(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  ተመለስ (Cancel)
                </button>
                <button
                  type="button"
                  disabled={!hasDrawnStroke}
                  onClick={saveCanvasSignature}
                  className={`px-5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                    hasDrawnStroke
                      ? 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-md'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>ፊርማውን መዝግብ (Save)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const loadPersistentOfficialConfig = async (): Promise<OfficialSignaturesConfig | null> => {
  if (typeof window === 'undefined') return null;
  try {
    if (window.indexedDB) {
      const configStr = await new Promise<string | null>((resolve) => {
        try {
          const req = indexedDB.open('BirbirKHC_Storage', 1);
          req.onupgradeneeded = (ev: any) => {
            const db = ev.target.result;
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
      if (configStr) {
        return JSON.parse(configStr);
      }
    }
  } catch (_) {}
  return null;
};

