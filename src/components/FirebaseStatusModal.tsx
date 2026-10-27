import React, { useState } from 'react';
import {
  Cloud,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  UploadCloud,
  DownloadCloud,
  X,
  Database,
  ShieldAlert,
  Server
} from 'lucide-react';
import { firebaseConfig } from '../firebase.ts';
import { FirebaseConnectionReport } from '../services/firebaseSync.ts';

interface FirebaseStatusModalProps {
  report: FirebaseConnectionReport | null;
  isTesting: boolean;
  onTestConnection: () => Promise<void>;
  onPushAllToFirebase: () => Promise<void>;
  onPullFromFirebase: () => Promise<void>;
  onClose: () => void;
}

export const FirebaseStatusModal: React.FC<FirebaseStatusModalProps> = ({
  report,
  isTesting,
  onTestConnection,
  onPushAllToFirebase,
  onPullFromFirebase,
  onClose
}) => {
  const [copiedRules, setCopiedRules] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);

  const sampleRules = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`;

  const handleCopyRules = () => {
    navigator.clipboard.writeText(sampleRules);
    setCopiedRules(true);
    setTimeout(() => setCopiedRules(false), 2500);
  };

  const handlePush = async () => {
    setIsPushing(true);
    try {
      await onPushAllToFirebase();
    } finally {
      setIsPushing(false);
    }
  };

  const handlePull = async () => {
    setIsPulling(true);
    try {
      await onPullFromFirebase();
    } finally {
      setIsPulling(false);
    }
  };

  const consoleFirestoreUrl = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore`;
  const consoleRulesUrl = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore/rules`;

  const isConnected = report?.status === 'connected';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-2xl ${isConnected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
              <Cloud className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>የFirebase Firestore ግንኙነት ሁኔታ (Firebase Status)</span>
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                የዳታቤዝ ግንኙነት፣ የቀጥታ መረጃ ማመሳከሪያና ማረጋገጫ (Database Diagnostics & Sync)
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Status Alert Card */}
          <div
            className={`p-4 rounded-2xl border ${
              isConnected
                ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                : 'bg-amber-50/80 border-amber-300 text-amber-950'
            }`}
          >
            <div className="flex items-start gap-3">
              {isConnected ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm">
                    {isConnected ? 'Firebase በስኬት ተገናኝቷል! (Connected)' : 'Firebase ገና አልተገናኘም (Not Connected)'}
                  </h4>
                  {report?.lastChecked && (
                    <span className="text-[11px] text-slate-500">የተፈተሸበት፦ {report.lastChecked}</span>
                  )}
                </div>

                <p className="text-xs mt-1.5 leading-relaxed font-medium">
                  {report?.message || 'ግንኙነቱን ለመፈተሽ ከስር ያለውን "ግንኙነት ፈትሽ" አዝራር ይጫኑ።'}
                </p>

                {report?.solution && (
                  <div className="mt-3 p-3 bg-white/90 rounded-xl border border-amber-200 text-xs text-slate-800 space-y-1">
                    <p className="font-bold text-amber-900 flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
                      <span>መፍትሔ (Required Action):</span>
                    </p>
                    <p className="leading-relaxed whitespace-pre-line text-slate-700">{report.solution}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Connected Firebase Project Details */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
              <Database className="w-4 h-4 text-emerald-700" />
              <span>የተገናኘው የFirebase ፕሮጀክት ዝርዝር (Active Configuration)</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[10px]">Project ID:</span>
                <span className="font-mono font-bold text-slate-800">{firebaseConfig.projectId}</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[10px]">Auth Domain:</span>
                <span className="font-mono text-slate-700 truncate block">{firebaseConfig.authDomain}</span>
              </div>
            </div>
          </div>

          {/* Real-time Multi-Device Sync Card */}
          {isConnected && (
            <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border border-emerald-200 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span>ቀጥታ ራሱን የቻለ ማመሳሰል በርቷል (Fully Automated Live Sync)</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                ሲስተሙ አሁን በቀጥታ ከFirebase ጋር ተገናኝቷል! ማናቸውም የተማሪዎች ምዝገባ፣ የውጤት አሞላል፣ የመምህራን መረጃ ወይም የቤተክርስቲያኑ አርማ ያለ ምንም አዝራር መጫን በቀጥታ በእውነተኛ ጊዜ (Real-time) በየትኛውም ቦታ ላሉ መምህራንና ተማሪዎች ወዲያውኑ ይደርሳቸዋል።
              </p>
              <div className="p-2.5 bg-white/80 rounded-xl border border-emerald-100 text-[11px] text-slate-600 space-y-1">
                <p className="font-semibold text-emerald-800 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>ቀጥታ ግንኙነት ተረጋግጧል (Auto-Connected)፦</span>
                </p>
                <p>ምንም አይነት አዝራር መጫን አያስፈልግዎትም፤ መረጃዎች በሙሉ በራሳቸው በቀጥታ ይገናኛሉ። ከስር ያሉት "Push" እና "Pull" አዝራሮች ድንገት ለሚፈለግ በእጅ የመጠባበቂያ ቅጂ (Manual Backup) ብቻ የተቀመጡ አማራጮች ናቸው።</p>
              </div>
            </div>
          )}

          {/* Step-by-Step Instructions if not connected */}
          {!isConnected && (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5 space-y-3">
              <h4 className="text-sm font-bold text-amber-900 flex items-center gap-1.5">
                <Server className="w-4 h-4 text-amber-700" />
                <span>በFirebase Console ውስጥ መደረግ ያለበት ዋና እርምጃ (Rules):</span>
              </h4>
              <p className="text-xs text-amber-800">
                የዳታቤዝ ፍቃድ (Security Rules) ዝግ ስለሆነ ሲስተሙ መረጃ ማስቀመጥ አልቻለም። እባክዎ ደንቦቹን (Rules) ይክፈቱ፦
              </p>

              <ol className="list-decimal list-inside space-y-2 text-xs text-slate-800 font-medium">
                <li className="leading-relaxed">
                  ወደ Firebase Rules ገጽ በቀጥታ ይሂዱ፦{' '}
                  <a
                    href={consoleRulesUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-bold underline"
                  >
                    <span>Firebase Console Rules ክፈት</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
                <li className="leading-relaxed">
                  በገጹ ላይ ያለውን ኮድ ከታች ባለው ኮድ ይቀይሩት፦ <span className="bg-amber-200 px-1.5 py-0.5 rounded font-bold text-amber-950 font-mono">allow read, write: if true;</span>
                </li>
                <li className="leading-relaxed">
                  በመጨረሻም <span className="bg-amber-200 px-1.5 py-0.5 rounded font-bold text-amber-950">"Publish"</span> የሚለውን አዝራር ይጫኑ።
                </li>
              </ol>

              {/* Firestore Rules Helper */}
              <div className="pt-2 border-t border-amber-200">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[11px] font-bold text-amber-900">የFirestore ደንቦች (Rules):</span>
                  <button
                    onClick={handleCopyRules}
                    className="inline-flex items-center gap-1 text-[11px] bg-white px-2 py-1 rounded-lg border border-amber-300 hover:bg-amber-100 text-amber-900 font-bold transition-colors cursor-pointer"
                  >
                    {copiedRules ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedRules ? 'ተቀድቷል!' : 'ደንቦችን ኮፒ አድርግ (Copy)'}</span>
                  </button>
                </div>
                <pre className="bg-slate-900 text-emerald-400 p-2.5 rounded-xl text-[11px] font-mono overflow-x-auto">
                  {sampleRules}
                </pre>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={onTestConnection}
              disabled={isTesting}
              className="inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isTesting ? 'animate-spin' : ''}`} />
              <span>{isTesting ? 'በመፈተሽ ላይ...' : 'ግንኙነት ፈትሽ (Test Connection)'}</span>
            </button>

            <a
              href={consoleFirestoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-3.5 py-2.5 rounded-xl border border-slate-300 transition-colors"
            >
              <span>ወደ Firebase Console ሂድ</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
            </a>

            {isConnected && (
              <>
                <button
                  onClick={handlePush}
                  disabled={isPushing}
                  className="inline-flex items-center gap-1.5 bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl shadow-sm transition-all cursor-pointer ml-auto"
                >
                  <UploadCloud className={`w-4 h-4 ${isPushing ? 'animate-bounce' : ''}`} />
                  <span>{isPushing ? 'በመጫን ላይ...' : 'ሁሉንም መረጃ ወደ Firebase ጫን (Push)'}</span>
                </button>

                <button
                  onClick={handlePull}
                  disabled={isPulling}
                  className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  <DownloadCloud className={`w-4 h-4 ${isPulling ? 'animate-bounce' : ''}`} />
                  <span>{isPulling ? 'በማውረድ ላይ...' : 'ከFirebase አውርድ (Pull)'}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
