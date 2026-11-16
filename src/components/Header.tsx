import React, { useState } from 'react';
import { Key, LogOut, Shield, User, Award, GraduationCap, Lock, Cloud, History, FileCode, Download, Menu, X } from 'lucide-react';
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
  onOpenJsonReaderModal?: () => void;
  onDownloadFullBackup?: () => void;
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
  onOpenArchiveModal,
  onOpenJsonReaderModal,
  onDownloadFullBackup
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const handleMobileAction = (cb?: () => void) => {
    setMobileMenuOpen(false);
    if (cb) cb();
  };

  return (
    <>
      <header className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-900 text-white shadow-xl sticky top-0 z-40 no-print border-b border-emerald-800/60">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16 lg:h-20 gap-2 sm:gap-4">
            {/* Logo and Titles */}
            <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
              <img
                src={churchLogo || CHURCH_LOGO}
                alt="የብርብር ከተማ ቃለ ሕይወት ቤተ ክርስቲያን"
                className="h-10 w-10 sm:h-13 sm:w-13 lg:h-16 lg:w-auto object-contain rounded-lg sm:rounded-xl p-0.5 sm:p-1 bg-white/10 border border-amber-400/40 shadow-lg shrink-0"
              />
              <div className="min-w-0">
                <h1 className="text-xs sm:text-base lg:text-xl font-bold leading-tight tracking-wide text-amber-300 drop-shadow-sm truncate">
                  የብርብር ከተማ ቃለ ሕይወት ቤተ ክርስቲያን
                </h1>
                <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 min-w-0">
                  <p className="text-[10px] sm:text-xs lg:text-sm text-emerald-100/90 font-medium truncate">
                    መጽሐፍ ቅዱስ ትምህርት ቤት ሲስተም
                  </p>
                  <span className="hidden sm:inline-flex items-center gap-1 bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[10px] px-2.5 py-0.5 rounded-full font-bold whitespace-nowrap shrink-0">
                    <span>🇪🇹 {currentYear} ዓ.ም ({currentSemester === 'ALL' ? 'ሁሉም ሴሚስተሮች' : `${currentSemester}ኛ ሴሚስተር`})</span>
                  </span>
                  <span className="sm:hidden inline-flex items-center text-[10px] text-amber-300 font-bold whitespace-nowrap shrink-0">
                    · {currentYear} ({currentSemester === 'ALL' ? 'ሁሉም' : `${currentSemester}ኛ`})
                  </span>
                </div>
              </div>
            </div>

            {/* Desktop User Navigation (lg+) */}
            <div className="hidden lg:flex items-center justify-end gap-2 shrink-0">
              {currentUser && (
                <>
                  <div className="flex items-center bg-emerald-950/80 border border-emerald-700/60 rounded-full px-3 py-1.5 text-xs text-slate-200 shadow-inner whitespace-nowrap">
                    <span className="font-bold text-amber-400 mr-2 flex items-center gap-1">
                      {currentUser.role === 'ADMIN' && <Shield className="w-3.5 h-3.5" />}
                      {currentUser.role === 'DEAN' && <Award className="w-3.5 h-3.5" />}
                      {currentUser.role === 'REGISTRAR' && <User className="w-3.5 h-3.5" />}
                      {currentUser.role === 'TEACHER' && <GraduationCap className="w-3.5 h-3.5" />}
                      {currentUser.role === 'STUDENT' && <User className="w-3.5 h-3.5" />}
                      [{getRoleAmharicName(currentUser.role)}]
                    </span>
                    <span className="font-medium text-slate-100 max-w-[140px] truncate">
                      {currentUser.role === 'TEACHER' ? 'መምህር (የተፈቀደላቸው)' : currentUser.name}
                    </span>
                  </div>

                  {onDownloadFullBackup && (currentUser.role === 'ADMIN' || currentUser.role === 'DEAN' || currentUser.role === 'REGISTRAR') && (
                    <button
                      onClick={onDownloadFullBackup}
                      className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow-sm transition-colors cursor-pointer whitespace-nowrap"
                      title="ሙሉ የሲስተም JSON ፋይል ወደ ኮምፒውተርህ አውርድ (Download Complete Master JSON)"
                    >
                      <Download className="w-3.5 h-3.5 text-amber-300" />
                      <span>💾 JSON አውርድ</span>
                    </button>
                  )}

                  {onOpenJsonReaderModal && (currentUser.role === 'ADMIN' || currentUser.role === 'DEAN' || currentUser.role === 'REGISTRAR') && (
                    <button
                      onClick={onOpenJsonReaderModal}
                      className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow-sm transition-colors cursor-pointer whitespace-nowrap"
                      title="የJSON ፋይል አንብብና መረጃ ጫን (Universal JSON Reader & Importer)"
                    >
                      <FileCode className="w-3.5 h-3.5 text-amber-300" />
                      <span>📂 JSON አንብብ</span>
                    </button>
                  )}

                  {onOpenArchiveModal && (currentUser.role === 'ADMIN' || currentUser.role === 'DEAN') && (
                    <button
                      onClick={onOpenArchiveModal}
                      className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs px-3 py-1.5 rounded-lg shadow-sm transition-colors cursor-pointer whitespace-nowrap"
                      title="የቀደሙ ሥራዎችና የተማሪዎች ውጤት ማህደር መፈለጊያ (ለዋና አድሚንና ዋና ዲን ብቻ)"
                    >
                      <History className="w-3.5 h-3.5 text-slate-950" />
                      <span>🔍 ማህደር</span>
                    </button>
                  )}

                  {onOpenFirebaseModal && (currentUser.role === 'ADMIN' || currentUser.role === 'DEAN') && (
                    <button
                      onClick={onOpenFirebaseModal}
                      className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-bold transition-all shadow-sm cursor-pointer whitespace-nowrap ${
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
                          ? 'Firebase...'
                          : firebaseReport?.status === 'connected'
                          ? '☁️ Firebase'
                          : '⚠️ Firebase'}
                      </span>
                    </button>
                  )}

                  <button
                    onClick={onOpenPasswordModal}
                    className="inline-flex items-center gap-1.5 bg-slate-800/90 hover:bg-slate-700 text-xs px-3 py-1.5 rounded-lg border border-slate-600/70 text-slate-200 transition-colors shadow-sm cursor-pointer whitespace-nowrap"
                    title="የይለፍ ቃልህን/ሽን ቀይር"
                  >
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                    <span>የይለፍ ቃል</span>
                  </button>

                  <button
                    onClick={onLogout}
                    className="inline-flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>ውጣ</span>
                  </button>
                </>
              )}
            </div>

            {/* Mobile & Tablet Compact Right Controls (< lg) */}
            {currentUser && (
              <div className="flex lg:hidden items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen((prev) => !prev)}
                  className="min-h-[42px] min-w-[42px] px-2.5 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-800/80 hover:bg-emerald-700 border border-emerald-600/60 text-amber-300 font-bold text-xs cursor-pointer transition-colors"
                  aria-label="ምናሌ ክፈት"
                  aria-expanded={mobileMenuOpen}
                >
                  {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                  <span className="hidden sm:inline">{mobileMenuOpen ? 'ዝጋ' : 'ምናሌ'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Mobile & Tablet Slide-down Action & Navigation Drawer (< lg) */}
          {currentUser && mobileMenuOpen && (
            <div className="lg:hidden pb-4 pt-2 border-t border-emerald-800/70 space-y-3 animate-in fade-in duration-150">
              {/* User Info Strip */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-emerald-950/80 border border-emerald-700/60 rounded-2xl px-3.5 py-2.5 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-bold text-amber-400 flex items-center gap-1 shrink-0">
                    {currentUser.role === 'ADMIN' && <Shield className="w-4 h-4" />}
                    {currentUser.role === 'DEAN' && <Award className="w-4 h-4" />}
                    {currentUser.role === 'REGISTRAR' && <User className="w-4 h-4" />}
                    {currentUser.role === 'TEACHER' && <GraduationCap className="w-4 h-4" />}
                    {currentUser.role === 'STUDENT' && <User className="w-4 h-4" />}
                    {getRoleAmharicName(currentUser.role)}
                  </span>
                  <span className="text-slate-300 truncate font-medium">
                    — {currentUser.role === 'TEACHER' ? 'መምህር' : currentUser.name}
                  </span>
                </div>
                <span className="text-[11px] font-bold text-amber-300 bg-amber-400/15 px-2.5 py-0.5 rounded-full border border-amber-400/30">
                  🇪🇹 {currentYear} ዓ.ም ({currentSemester === 'ALL' ? 'ሁሉም' : `${currentSemester}ኛ`})
                </span>
              </div>

              {/* Mobile View Switcher for Elevated Roles */}
              {(currentUser.role === 'ADMIN' || currentUser.role === 'DEAN' || currentUser.role === 'REGISTRAR') && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-bold text-amber-300 px-1">የገጽ መቀየሪያ (Switch Portal):</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {currentUser.role === 'ADMIN' && (
                      <button
                        onClick={() => handleMobileAction(() => onAdminChangeView('ADMIN'))}
                        className={`min-h-[42px] px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          adminActiveView === 'ADMIN' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'bg-emerald-950/90 text-slate-200 border border-emerald-800'
                        }`}
                      >
                        አድሚን
                      </button>
                    )}
                    {(currentUser.role === 'ADMIN' || currentUser.role === 'DEAN') && (
                      <button
                        onClick={() => handleMobileAction(() => onAdminChangeView('DEAN'))}
                        className={`min-h-[42px] px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          adminActiveView === 'DEAN' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'bg-emerald-950/90 text-slate-200 border border-emerald-800'
                        }`}
                      >
                        ዋና ዲን
                      </button>
                    )}
                    {(currentUser.role === 'ADMIN' || currentUser.role === 'REGISTRAR') && (
                      <button
                        onClick={() => handleMobileAction(() => onAdminChangeView('REGISTRAR'))}
                        className={`min-h-[42px] px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          adminActiveView === 'REGISTRAR' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'bg-emerald-950/90 text-slate-200 border border-emerald-800'
                        }`}
                      >
                        ሪጅስተራል
                      </button>
                    )}
                    <button
                      onClick={() => handleMobileAction(() => onAdminChangeView('TEACHER'))}
                      className={`min-h-[42px] px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        adminActiveView === 'TEACHER' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'bg-emerald-950/90 text-slate-200 border border-emerald-800'
                      }`}
                    >
                      የመምህራን ውጤት
                    </button>
                    {currentUser.role === 'ADMIN' && (
                      <button
                        onClick={() => handleMobileAction(() => onAdminChangeView('STUDENT'))}
                        className={`min-h-[42px] px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          adminActiveView === 'STUDENT' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'bg-emerald-950/90 text-slate-200 border border-emerald-800'
                        }`}
                      >
                        የተማሪዎች ገጽ
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Mobile Quick Actions Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {onDownloadFullBackup && (currentUser.role === 'ADMIN' || currentUser.role === 'DEAN' || currentUser.role === 'REGISTRAR') && (
                  <button
                    onClick={() => handleMobileAction(onDownloadFullBackup)}
                    className="min-h-[44px] inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-2 rounded-xl shadow-sm cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-amber-300" />
                    <span>💾 JSON አውርድ</span>
                  </button>
                )}

                {onOpenJsonReaderModal && (currentUser.role === 'ADMIN' || currentUser.role === 'DEAN' || currentUser.role === 'REGISTRAR') && (
                  <button
                    onClick={() => handleMobileAction(onOpenJsonReaderModal)}
                    className="min-h-[44px] inline-flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3 py-2 rounded-xl shadow-sm cursor-pointer"
                  >
                    <FileCode className="w-4 h-4 text-amber-300" />
                    <span>📂 JSON አንብብ</span>
                  </button>
                )}

                {onOpenArchiveModal && (currentUser.role === 'ADMIN' || currentUser.role === 'DEAN') && (
                  <button
                    onClick={() => handleMobileAction(onOpenArchiveModal)}
                    className="min-h-[44px] inline-flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs px-3 py-2 rounded-xl shadow-sm cursor-pointer"
                  >
                    <History className="w-4 h-4" />
                    <span>🔍 የቀደሙ ማህደር</span>
                  </button>
                )}

                {onOpenFirebaseModal && (currentUser.role === 'ADMIN' || currentUser.role === 'DEAN') && (
                  <button
                    onClick={() => handleMobileAction(onOpenFirebaseModal)}
                    className={`min-h-[44px] inline-flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-xl border font-bold shadow-sm cursor-pointer ${
                      firebaseReport?.status === 'connected'
                        ? 'bg-emerald-900/90 border-emerald-500/80 text-emerald-200'
                        : 'bg-rose-950/90 border-rose-500/80 text-rose-200'
                    }`}
                  >
                    <Cloud className="w-4 h-4 text-amber-300" />
                    <span>{firebaseReport?.status === 'connected' ? '☁️ Firebase ተገናኝቷል' : '⚠️ Firebase ፈትሽ'}</span>
                  </button>
                )}

                <button
                  onClick={() => handleMobileAction(onOpenPasswordModal)}
                  className="min-h-[44px] inline-flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-xs px-3 py-2 rounded-xl border border-slate-600/70 text-slate-200 font-bold cursor-pointer"
                >
                  <Key className="w-4 h-4 text-amber-400" />
                  <span>የይለፍ ቃል ቀይር</span>
                </button>

                <button
                  onClick={() => handleMobileAction(onLogout)}
                  className="min-h-[44px] inline-flex items-center justify-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-sm cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>ውጣ (Logout)</span>
                </button>
              </div>
            </div>
          )}

          {/* Desktop Admin Full Management Power Switcher Bar (lg+) */}
          {currentUser && currentUser.role === 'ADMIN' && (
            <div className="hidden lg:flex pb-3 pt-1 border-t border-emerald-800/60 items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-amber-300 font-bold shrink-0">
                <Shield className="w-4 h-4" />
                <span>የአድሚን ጠቅላይ አስተዳደር ማዕከል:</span>
              </div>
              <div className="flex items-center gap-1 bg-emerald-950 p-1 rounded-xl border border-emerald-700/60 overflow-x-auto no-scrollbar">
                <button
                  onClick={() => onAdminChangeView('ADMIN')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    adminActiveView === 'ADMIN'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-emerald-900'
                  }`}
                >
                  አድሚን
                </button>
                <button
                  onClick={() => onAdminChangeView('DEAN')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    adminActiveView === 'DEAN'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-emerald-900'
                  }`}
                >
                  ዋና ዲን
                </button>
                <button
                  onClick={() => onAdminChangeView('REGISTRAR')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    adminActiveView === 'REGISTRAR'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-emerald-900'
                  }`}
                >
                  ሪጅስተራል
                </button>
                <button
                  onClick={() => onAdminChangeView('TEACHER')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    adminActiveView === 'TEACHER'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-emerald-900'
                  }`}
                >
                  የመምህራን ውጤት (Excel/PDF)
                </button>
                <button
                  onClick={() => onAdminChangeView('STUDENT')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
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

          {/* Desktop Chief Dean View Switcher Bar (lg+) */}
          {currentUser && currentUser.role === 'DEAN' && (
            <div className="hidden lg:flex pb-3 pt-1 border-t border-emerald-800/60 items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                <Award className="w-4 h-4" />
                <span>የዋና ዲን ይፋዊ ቁጥጥር (የውጤት ማስገቢያ፣ ኤክሴልና ፒዲኤፍ ተፈቅዷል):</span>
              </div>
              <div className="flex items-center gap-1 bg-emerald-950 p-1 rounded-xl border border-emerald-700/60">
                <button
                  onClick={() => onAdminChangeView('DEAN')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                    adminActiveView === 'DEAN'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-emerald-900'
                  }`}
                >
                  የዋና ዲን ቢሮ
                </button>
                <button
                  onClick={() => onAdminChangeView('TEACHER')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
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

          {/* Desktop Registrar View Switcher Bar (lg+) */}
          {currentUser && currentUser.role === 'REGISTRAR' && (
            <div className="hidden lg:flex pb-3 pt-1 border-t border-emerald-800/60 items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                <User className="w-4 h-4" />
                <span>የሬጅስትራር ጽሕፈት ቤት (የውጤት ማስገቢያ፣ ኤክሴልና ፒዲኤፍ ተፈቅዷል):</span>
              </div>
              <div className="flex items-center gap-1 bg-emerald-950 p-1 rounded-xl border border-emerald-700/60">
                <button
                  onClick={() => onAdminChangeView('REGISTRAR')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                    adminActiveView === 'REGISTRAR'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-emerald-900'
                  }`}
                >
                  የሬጅስትራር ቢሮ
                </button>
                <button
                  onClick={() => onAdminChangeView('TEACHER')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
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
