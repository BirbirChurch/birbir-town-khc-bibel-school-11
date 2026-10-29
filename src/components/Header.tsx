import React from 'react';
import { Key, LogOut, Shield, User, Award, GraduationCap, Lock, Cloud, CheckCircle2, AlertTriangle, RefreshCw, History } from 'lucide-react';
import { CurrentUser } from '../types.ts';
import { FirebaseConnectionReport } from '../services/firebaseSync.ts';
import { CHURCH_LOGO } from '../assets/logo.ts';

interface HeaderProps {
  currentUser: CurrentUser | null;
  systemLocked: boolean;
  adminActiveView: 'ADMIN' | 'DEAN' | 'REGISTRAR' | 'TEACHER' | 'STUDENT';
  onAdminChangeView: (view: 'ADMIN' | 'DEAN' | 'REGISTRAR' | 'TEACHER' | 'STUDENT') => void;
  onOpenPasswordModal: () => void;
  onLogout: () => void;
  firebaseReport: FirebaseConnectionReport | null;
  isTestingFirebase: boolean;
  onOpenFirebaseModal: () => void;
  churchLogo?: string;
  currentYear?: string;
  currentSemester?: string;
  onOpenArchiveModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  systemLocked,
  adminActiveView,
  onAdminChangeView,
  onOpenPasswordModal,
  onLogout,
  firebaseReport,
  isTestingFirebase,
  onOpenFirebaseModal,
  churchLogo,
  currentYear = '2019',
  currentSemester = '1',
  onOpenArchiveModal
}) => {
  const getRoleAmharicName = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'አድሚን (Admin)';
      case 'DEAN': return 'ዋና ዲን (Academic Dean)';
      case 'REGISTRAR': return 'ሪጅስተራል (Registrar)';
      case 'TEACHER': return 'መምህር (Teacher)';
      case 'STUDENT': return 'ተማሪ (Student)';
      default: return role;
    }
  };

  return (
    <>
      <header className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-900 text-white shadow-xl sticky top-0 z-40 no-print border-b border-emerald-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center py-3 md:h-20 gap-3">
            {/* Logo and Titles */}
            <div className="flex items-center space-x-3.5 space-x-reverse">
              <img
                src={churchLogo || CHURCH_LOGO}
                alt="የብርብር ከተማ ቃለ ሕይወት ቤተ ክርስቲያን"
                className="h-14 sm:h-16 w-auto object-contain rounded-xl p-1 bg-white/10 border border-amber-400/40 shadow-lg flex-shrink-0"
              />
              <div>
                <h1 className="text-base sm:text-lg md:text-xl font-bold leading-tight tracking-wide text-amber-300 drop-shadow-sm">
                  የብርብር ከተማ ቃለ ሕይወት ቤተ ክርስቲያን
                </h1>
                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                  <p className="text-xs md:text-sm text-emerald-100/90 font-medium tracking-normal">
                    መጽሐፍ ቅዱስ ትምህርት ቤት የመረጃ ማኔጅመንት ሲስተም
                  </p>
                  <span className="inline-flex items-center gap-1 bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[10px] px-2.5 py-0.5 rounded-full font-bold">
                    <span>🇪🇹 እንደ ኢትዮጵያ ዘመን አቆጣጠር፦ {currentYear} ዓ.ም ({currentSemester === 'ALL' ? 'ሁሉም ሴሚስተሮች' : `${currentSemester}ኛ ሴሚስተር`})</span>
                  </span>
                </div>
              </div>
            </div>

            {/* User Navigation */}
            <div className="flex flex-wrap items-center justify-end gap-2.5">
              {currentUser && (
                <>
                  <div className="flex items-center bg-emerald-950/80 border border-emerald-700/60 rounded-full px-3.5 py-1.5 text-xs text-slate-200 shadow-inner">
                    <span className="font-bold text-amber-400 mr-2 flex items-center gap-1">
                      {currentUser.role === 'ADMIN' && <Shield className="w-3.5 h-3.5" />}
                      {currentUser.role === 'DEAN' && <Award className="w-3.5 h-3.5" />}
                      {currentUser.role === 'REGISTRAR' && <User className="w-3.5 h-3.5" />}
                      {currentUser.role === 'TEACHER' && <GraduationCap className="w-3.5 h-3.5" />}
                      {currentUser.role === 'STUDENT' && <User className="w-3.5 h-3.5" />}
                      [{getRoleAmharicName(currentUser.role)}]
                    </span>
                    <span className="font-medium text-slate-100 max-w-[140px] sm:max-w-[180px] truncate">
                      {currentUser.role === 'TEACHER' ? 'መምህር (የተፈቀደላቸው)' : currentUser.name}
                    </span>
                  </div>

                  {onOpenArchiveModal && (currentUser.role === 'ADMIN' || currentUser.role === 'DEAN') && (
                    <button
                      onClick={onOpenArchiveModal}
                      className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs px-3 py-1.5 rounded-lg shadow-sm transition-colors cursor-pointer"
                      title="የቀደሙ ሥራዎችና የተማሪዎች ውጤት ማህደር መፈለጊያ (ለዋና አድሚንና ዋና ዲን ብቻ)"
                    >
                      <History className="w-3.5 h-3.5 text-slate-950" />
                      <span>🔍 የቀደሙ ሥራዎችና ማህደር</span>
                    </button>
                  )}

                  {onOpenFirebaseModal && (currentUser.role === 'ADMIN' || currentUser.role === 'DEAN' || currentUser.role === 'REGISTRAR') && (
                    <button
                      onClick={onOpenFirebaseModal}
                      className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-bold transition-all shadow-sm cursor-pointer ${
                        firebaseReport?.status === 'connected'
                          ? 'bg-emerald-900/90 border-emerald-500/80 text-emerald-200 hover:bg-emerald-800'
                          : isTestingFirebase
                          ? 'bg-amber-900/90 border-amber-500/80 text-amber-200 animate-pulse'
                          : 'bg-rose-950/90 border-rose-500/80 text-rose-200 hover:bg-rose-900'
                      }`}
                      title="የFirebase Cloud Firestore ዳታቤዝ ግንኙነትና የቀጥታ ማመሳከሪያ ሁኔታ"
                    >
                      <Cloud className="w-3.5 h-3.5 text-amber-300" />
                      <span>
                        {isTestingFirebase
                          ? 'Firebase... በማገናኘት ላይ'
                          : firebaseReport?.status === 'connected'
                          ? '☁️ Firebase ተገናኝቷል'
                          : '⚠️ Firebase ፈትሽ'}
                      </span>
                    </button>
                  )}

                  {/* Every user (admin, dean, registrar, teacher, student) can change their own password! */}
                  <button
                    onClick={onOpenPasswordModal}
                    className="inline-flex items-center gap-1.5 bg-slate-800/90 hover:bg-slate-700 text-xs px-3 py-1.5 rounded-lg border border-slate-600/70 text-slate-200 transition-colors shadow-sm cursor-pointer"
                    title="የይለፍ ቃልህን/ሽን ቀይር"
                  >
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                    <span>የይለፍ ቃል ቀይር</span>
                  </button>

                  <button
                    onClick={onLogout}
                    className="inline-flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>ውጣ</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Admin Full Management Power Switcher Bar */}
          {currentUser && currentUser.role === 'ADMIN' && (
            <div className="pb-3 pt-1 border-t border-emerald-800/60 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                <Shield className="w-4 h-4" />
                <span>የአድሚን ጠቅላይ አስተዳደር ማዕከል (ሁሉንም ገጽ የመቆጣጠር ስልጣን):</span>
              </div>
              <div className="flex flex-wrap items-center gap-1 bg-emerald-950 p-1 rounded-xl border border-emerald-700/60">
                <button
                  onClick={() => onAdminChangeView('ADMIN')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    adminActiveView === 'ADMIN'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-emerald-900'
                  }`}
                >
                  አድሚን
                </button>
                <button
                  onClick={() => onAdminChangeView('DEAN')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    adminActiveView === 'DEAN'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-emerald-900'
                  }`}
                >
                  ዋና ዲን
                </button>
                <button
                  onClick={() => onAdminChangeView('REGISTRAR')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    adminActiveView === 'REGISTRAR'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-emerald-900'
                  }`}
                >
                  ሪጅስተራል
                </button>
                <button
                  onClick={() => onAdminChangeView('TEACHER')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    adminActiveView === 'TEACHER'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-emerald-900'
                  }`}
                >
                  የመምህራን ውጤት (Excel/PDF)
                </button>
                <button
                  onClick={() => onAdminChangeView('STUDENT')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    adminActiveView === 'STUDENT'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-emerald-900'
                  }`}
                >
                  የተማሪዎች ገጽ
                </button>
              </div>
            </div>
          )}

          {/* Chief Dean View Switcher Bar */}
          {currentUser && currentUser.role === 'DEAN' && (
            <div className="pb-3 pt-1 border-t border-emerald-800/60 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                <Award className="w-4 h-4" />
                <span>የዋና ዲን ይፋዊ ቁጥጥር (የውጤት ማስገቢያ፣ ኤክሴልና ፒዲኤፍ ተፈቅዷል):</span>
              </div>
              <div className="flex flex-wrap items-center gap-1 bg-emerald-950 p-1 rounded-xl border border-emerald-700/60">
                <button
                  onClick={() => onAdminChangeView('DEAN')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    adminActiveView === 'DEAN'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-emerald-900'
                  }`}
                >
                  የዋና ዲን ቢሮ
                </button>
                <button
                  onClick={() => onAdminChangeView('TEACHER')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    adminActiveView === 'TEACHER'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-emerald-900'
                  }`}
                >
                  የመምህራን ውጤት ማስገቢያ (ኤክሴል/PDF)
                </button>
              </div>
            </div>
          )}

          {/* Registrar View Switcher Bar */}
          {currentUser && currentUser.role === 'REGISTRAR' && (
            <div className="pb-3 pt-1 border-t border-emerald-800/60 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                <User className="w-4 h-4" />
                <span>የሬጅስትራር ጽሕፈት ቤት (የውጤት ማስገቢያ፣ ኤክሴልና ፒዲኤፍ ተፈቅዷል):</span>
              </div>
              <div className="flex flex-wrap items-center gap-1 bg-emerald-950 p-1 rounded-xl border border-emerald-700/60">
                <button
                  onClick={() => onAdminChangeView('REGISTRAR')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    adminActiveView === 'REGISTRAR'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-emerald-900'
                  }`}
                >
                  የሬጅስትራር ቢሮ
                </button>
                <button
                  onClick={() => onAdminChangeView('TEACHER')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    adminActiveView === 'TEACHER'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-emerald-900'
                  }`}
                >
                  የመምህራን ውጤት ማስገቢያ (ኤክሴል/PDF)
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Maintenance lock alert banner */}
      {systemLocked && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 text-center text-xs md:text-sm font-bold shadow-inner no-print flex items-center justify-center gap-2">
          <Lock className="w-4 h-4" />
          <span>ሲስተሙ በጥገና/መቆለፊያ ሁነታ (Maintenance Lock) ላይ ይገኛል። ከአድሚን ውጪ ሌሎች ተጠቃሚዎች ገደብ ተጥሎባቸዋል።</span>
        </div>
      )}
    </>
  );
};
