import React, { useState } from 'react';
import { Key, LogOut, Shield, User, Award, GraduationCap, Lock, Cloud, History, FileCode, Download, Menu, X, Globe } from 'lucide-react';
import { CurrentUser } from '../types.ts';
import { FirebaseConnectionReport } from '../services/firebaseSync.ts';
import { CHURCH_LOGO } from '../assets/logo.ts';
import { useLanguage, formatRole, formatSemester } from '../utils/i18n.tsx';

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
  const { lang, setLang, t } = useLanguage();

  const handleMobileAction = (cb?: () => void) => {
    setMobileMenuOpen(false);
    if (cb) cb();
  };

  const semesterBadgeDesktop =
    currentSemester === 'ALL'
      ? t(`${currentYear} ዓ.ም (ሁሉም ሴሚስተሮች)`, `${currentYear} E.C. (All Semesters)`)
      : `${currentYear} ${t('ዓ.ም', 'E.C.')} (${formatSemester(currentSemester, lang)})`;

  const semesterBadgeCompact =
    currentSemester === 'ALL'
      ? `${currentYear} (${t('ሁሉም', 'All')})`
      : `${currentYear} (${lang === 'en' ? `Sem ${currentSemester}` : `${currentSemester}ኛ`})`;

  const LanguageSwitcher = ({ compact = false }: { compact?: boolean }) => (
    <div
      className="inline-flex items-center bg-emerald-950/90 border border-emerald-700/70 rounded-lg p-0.5 shadow-inner shrink-0"
      role="group"
      aria-label={t('ቋንቋ ይምረጡ', 'Select Language')}
    >
      <button
        type="button"
        onClick={() => setLang('am')}
        className={`px-2 ${compact ? 'py-1 text-[11px]' : 'py-1 text-xs'} rounded-md font-bold transition-all cursor-pointer whitespace-nowrap ${
          lang === 'am'
            ? 'bg-amber-400 text-slate-950 shadow-sm'
            : 'text-emerald-100 hover:text-white'
        }`}
        title="አማርኛ"
      >
        አማ
      </button>
      <button
        type="button"
        onClick={() => setLang('en')}
        className={`px-2 ${compact ? 'py-1 text-[11px]' : 'py-1 text-xs'} rounded-md font-bold transition-all cursor-pointer whitespace-nowrap ${
          lang === 'en'
            ? 'bg-amber-400 text-slate-950 shadow-sm'
            : 'text-emerald-100 hover:text-white'
        }`}
        title="English"
      >
        EN
      </button>
    </div>
  );

  return (
    <>
      <header className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-900 text-white shadow-xl sticky top-0 z-40 no-print border-b border-emerald-800/60">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16 lg:h-20 gap-2 sm:gap-4">
            {/* Logo and Titles */}
            <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
              <img
                src={churchLogo || CHURCH_LOGO}
                alt={t('የብርብር ከተማ ቃለ ሕይወት ቤተ ክርስቲያን', 'Birbir City Kale Heywet Church')}
                className="h-10 w-10 sm:h-13 sm:w-13 lg:h-16 lg:w-auto object-contain rounded-lg sm:rounded-xl p-0.5 sm:p-1 bg-white/10 border border-amber-400/40 shadow-lg shrink-0"
              />
              <div className="min-w-0">
                <h1 className="text-xs sm:text-base lg:text-xl font-bold leading-tight tracking-wide text-amber-300 drop-shadow-sm truncate">
                  {t('የብርብር ከተማ ቃለ ሕይወት ቤተ ክርስቲያን', 'Birbir City Kale Heywet Church')}
                </h1>
                <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 min-w-0">
                  <p className="text-[10px] sm:text-xs lg:text-sm text-emerald-100/90 font-medium truncate">
                    {t('መጽሐፍ ቅዱስ ትምህርት ቤት ሲስተም', 'Bible Training School Management System')}
                  </p>
                  <span className="hidden sm:inline-flex items-center gap-1 bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[10px] px-2.5 py-0.5 rounded-full font-bold whitespace-nowrap shrink-0">
                    <span>🇪🇹 {semesterBadgeDesktop}</span>
                  </span>
                  <span className="sm:hidden inline-flex items-center text-[10px] text-amber-300 font-bold whitespace-nowrap shrink-0">
                    · {semesterBadgeCompact}
                  </span>
                </div>
              </div>
            </div>

            {/* Desktop User Navigation (lg+) */}
            <div className="hidden lg:flex items-center justify-end gap-2 shrink-0">
              <LanguageSwitcher />
              {currentUser && (
                <>
                  <div className="flex items-center bg-emerald-950/80 border border-emerald-700/60 rounded-full px-3 py-1.5 text-xs text-slate-200 shadow-inner whitespace-nowrap">
                    <span className="font-bold text-amber-400 mr-2 flex items-center gap-1">
                      {currentUser.role === 'ADMIN' && <Shield className="w-3.5 h-3.5" />}
                      {currentUser.role === 'DEAN' && <Award className="w-3.5 h-3.5" />}
                      {currentUser.role === 'REGISTRAR' && <User className="w-3.5 h-3.5" />}
                      {currentUser.role === 'TEACHER' && <GraduationCap className="w-3.5 h-3.5" />}
                      {currentUser.role === 'STUDENT' && <User className="w-3.5 h-3.5" />}
                      [{formatRole(currentUser.role, lang)}]
                    </span>
                    <span className="font-medium text-slate-100 max-w-[140px] truncate">
                      {currentUser.role === 'TEACHER' ? t('መምህር (የተፈቀደላቸው)', 'Instructor (Authorized)') : currentUser.name}
                    </span>
                  </div>

                  {onDownloadFullBackup && (currentUser.role === 'ADMIN' || currentUser.role === 'DEAN' || currentUser.role === 'REGISTRAR') && (
                    <button
                      onClick={onDownloadFullBackup}
                      className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow-sm transition-colors cursor-pointer whitespace-nowrap"
                      title={t('ሙሉ የሲስተም JSON ፋይል ወደ ኮምፒውተርህ አውርድ', 'Download Complete Master JSON Backup')}
                    >
                      <Download className="w-3.5 h-3.5 text-amber-300" />
                      <span>💾 {t('JSON አውርድ', 'Export JSON')}</span>
                    </button>
                  )}

                  {onOpenJsonReaderModal && (currentUser.role === 'ADMIN' || currentUser.role === 'DEAN' || currentUser.role === 'REGISTRAR') && (
                    <button
                      onClick={onOpenJsonReaderModal}
                      className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow-sm transition-colors cursor-pointer whitespace-nowrap"
                      title={t('የJSON ፋይል አንብብና መረጃ ጫን', 'Universal JSON Reader & Importer')}
                    >
                      <FileCode className="w-3.5 h-3.5 text-amber-300" />
                      <span>📂 {t('JSON አንብብ', 'Import JSON')}</span>
                    </button>
                  )}

                  {onOpenArchiveModal && (currentUser.role === 'ADMIN' || currentUser.role === 'DEAN') && (
                    <button
                      onClick={onOpenArchiveModal}
                      className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs px-3 py-1.5 rounded-lg shadow-sm transition-colors cursor-pointer whitespace-nowrap"
                      title={t('የቀደሙ ሥራዎችና የተማሪዎች ውጤት ማህደር መፈለጊያ', 'Search Historical Student & Grade Archives')}
                    >
                      <History className="w-3.5 h-3.5 text-slate-950" />
                      <span>🔍 {t('ማህደር', 'Archives')}</span>
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
                      title={t('የFirebase Cloud Firestore ዳታቤዝ ግንኙነት ሁኔታ', 'Firebase Cloud Firestore Connection & Sync Status')}
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
                    title={t('የይለፍ ቃልህን/ሽን ቀይር', 'Change Your Password')}
                  >
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                    <span>{t('የይለፍ ቃል', 'Password')}</span>
                  </button>

                  <button
                    onClick={onLogout}
                    className="inline-flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{t('ውጣ', 'Logout')}</span>
                  </button>
                </>
              )}
            </div>

            {/* Mobile & Tablet Compact Right Controls (< lg) */}
            <div className="flex lg:hidden items-center gap-1.5 shrink-0">
              <LanguageSwitcher compact />
              {currentUser && (
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen((prev) => !prev)}
                  className="min-h-[42px] min-w-[42px] px-2.5 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-800/80 hover:bg-emerald-700 border border-emerald-600/60 text-amber-300 font-bold text-xs cursor-pointer transition-colors"
                  aria-label={t('ምናሌ ክፈት', 'Open Menu')}
                  aria-expanded={mobileMenuOpen}
                >
                  {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                  <span className="hidden sm:inline">{mobileMenuOpen ? t('ዝጋ', 'Close') : t('ምናሌ', 'Menu')}</span>
                </button>
              )}
            </div>
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
                    {formatRole(currentUser.role, lang)}
                  </span>
                  <span className="text-slate-300 truncate font-medium">
                    — {currentUser.role === 'TEACHER' ? t('መምህር', 'Instructor') : currentUser.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 bg-amber-400/15 px-2.5 py-0.5 rounded-full border border-amber-400/30">
                    🇪🇹 {semesterBadgeCompact}
                  </span>
                  <button
                    type="button"
                    onClick={() => setLang(lang === 'am' ? 'en' : 'am')}
                    className="inline-flex items-center gap-1 text-[11px] font-bold bg-white/10 text-white px-2.5 py-0.5 rounded-full border border-white/20 cursor-pointer"
                  >
                    <Globe className="w-3 h-3 text-amber-300" />
                    {lang === 'am' ? 'English' : 'አማርኛ'}
                  </button>
                </div>
              </div>

              {/* Mobile View Switcher for Elevated Roles */}
              {(currentUser.role === 'ADMIN' || currentUser.role === 'DEAN' || currentUser.role === 'REGISTRAR') && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-bold text-amber-300 px-1">{t('የገጽ መቀየሪያ:', 'Switch Portal:')}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {currentUser.role === 'ADMIN' && (
                      <button
                        onClick={() => handleMobileAction(() => onAdminChangeView('ADMIN'))}
                        className={`min-h-[42px] px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          adminActiveView === 'ADMIN' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'bg-emerald-950/90 text-slate-200 border border-emerald-800'
                        }`}
                      >
                        {t('አድሚን', 'Admin')}
                      </button>
                    )}
                    {(currentUser.role === 'ADMIN' || currentUser.role === 'DEAN') && (
                      <button
                        onClick={() => handleMobileAction(() => onAdminChangeView('DEAN'))}
                        className={`min-h-[42px] px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          adminActiveView === 'DEAN' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'bg-emerald-950/90 text-slate-200 border border-emerald-800'
                        }`}
                      >
                        {t('ዋና ዲን', 'Academic Dean')}
                      </button>
                    )}
                    {(currentUser.role === 'ADMIN' || currentUser.role === 'REGISTRAR') && (
                      <button
                        onClick={() => handleMobileAction(() => onAdminChangeView('REGISTRAR'))}
                        className={`min-h-[42px] px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          adminActiveView === 'REGISTRAR' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'bg-emerald-950/90 text-slate-200 border border-emerald-800'
                        }`}
                      >
                        {t('ሪጅስተራል', 'Registrar')}
                      </button>
                    )}
                    <button
                      onClick={() => handleMobileAction(() => onAdminChangeView('TEACHER'))}
                      className={`min-h-[42px] px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        adminActiveView === 'TEACHER' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'bg-emerald-950/90 text-slate-200 border border-emerald-800'
                      }`}
                    >
                      {t('የመምህራን ውጤት', 'Grade Entry')}
                    </button>
                    {currentUser.role === 'ADMIN' && (
                      <button
                        onClick={() => handleMobileAction(() => onAdminChangeView('STUDENT'))}
                        className={`min-h-[42px] px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          adminActiveView === 'STUDENT' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'bg-emerald-950/90 text-slate-200 border border-emerald-800'
                        }`}
                      >
                        {t('የተማሪዎች ገጽ', 'Student View')}
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
                    <span>💾 {t('JSON አውርድ', 'Export JSON')}</span>
                  </button>
                )}

                {onOpenJsonReaderModal && (currentUser.role === 'ADMIN' || currentUser.role === 'DEAN' || currentUser.role === 'REGISTRAR') && (
                  <button
                    onClick={() => handleMobileAction(onOpenJsonReaderModal)}
                    className="min-h-[44px] inline-flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3 py-2 rounded-xl shadow-sm cursor-pointer"
                  >
                    <FileCode className="w-4 h-4 text-amber-300" />
                    <span>📂 {t('JSON አንብብ', 'Import JSON')}</span>
                  </button>
                )}

                {onOpenArchiveModal && (currentUser.role === 'ADMIN' || currentUser.role === 'DEAN') && (
                  <button
                    onClick={() => handleMobileAction(onOpenArchiveModal)}
                    className="min-h-[44px] inline-flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs px-3 py-2 rounded-xl shadow-sm cursor-pointer"
                  >
                    <History className="w-4 h-4" />
                    <span>🔍 {t('የቀደሙ ማህደር', 'Archives')}</span>
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
                    <span>
                      {firebaseReport?.status === 'connected'
                        ? t('☁️ Firebase ተገናኝቷል', '☁️ Firebase Connected')
                        : t('⚠️ Firebase ፈትሽ', '⚠️ Check Firebase')}
                    </span>
                  </button>
                )}

                <button
                  onClick={() => handleMobileAction(onOpenPasswordModal)}
                  className="min-h-[44px] inline-flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-xs px-3 py-2 rounded-xl border border-slate-600/70 text-slate-200 font-bold cursor-pointer"
                >
                  <Key className="w-4 h-4 text-amber-400" />
                  <span>{t('የይለፍ ቃል ቀይር', 'Change Password')}</span>
                </button>

                <button
                  onClick={() => handleMobileAction(onLogout)}
                  className="min-h-[44px] inline-flex items-center justify-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-sm cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{t('ውጣ', 'Logout')}</span>
                </button>
              </div>
            </div>
          )}

          {/* Desktop Admin Full Management Power Switcher Bar (lg+) */}
          {currentUser && currentUser.role === 'ADMIN' && (
            <div className="hidden lg:flex pb-3 pt-1 border-t border-emerald-800/60 items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-amber-300 font-bold shrink-0">
                <Shield className="w-4 h-4" />
                <span>{t('የአድሚን ጠቅላይ አስተዳደር ማዕከል:', 'Admin Supreme Control Center:')}</span>
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
                  {t('አድሚን', 'Admin')}
                </button>
                <button
                  onClick={() => onAdminChangeView('DEAN')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    adminActiveView === 'DEAN'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-emerald-900'
                  }`}
                >
                  {t('ዋና ዲን', 'Academic Dean')}
                </button>
                <button
                  onClick={() => onAdminChangeView('REGISTRAR')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    adminActiveView === 'REGISTRAR'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-emerald-900'
                  }`}
                >
                  {t('ሪጅስተራል', 'Registrar')}
                </button>
                <button
                  onClick={() => onAdminChangeView('TEACHER')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    adminActiveView === 'TEACHER'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-emerald-900'
                  }`}
                >
                  {t('የመምህራን ውጤት (Excel/PDF)', 'Instructor Grading (Excel/PDF)')}
                </button>
                <button
                  onClick={() => onAdminChangeView('STUDENT')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    adminActiveView === 'STUDENT'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-emerald-900'
                  }`}
                >
                  {t('የተማሪዎች ገጽ', 'Student Portal')}
                </button>
              </div>
            </div>
          )}

          {/* Desktop Chief Dean View Switcher Bar (lg+) */}
          {currentUser && currentUser.role === 'DEAN' && (
            <div className="hidden lg:flex pb-3 pt-1 border-t border-emerald-800/60 items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                <Award className="w-4 h-4" />
                <span>{t('የዋና ዲን ይፋዊ ቁጥጥር (የውጤት ማስገቢያ፣ ኤክሴልና ፒዲኤፍ ተፈቅዷል):', 'Academic Dean Control (Grade Entry, Excel & PDF Authorized):')}</span>
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
                  {t('የዋና ዲን ቢሮ', "Dean's Office")}
                </button>
                <button
                  onClick={() => onAdminChangeView('TEACHER')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                    adminActiveView === 'TEACHER'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-emerald-900'
                  }`}
                >
                  {t('የመምህራን ውጤት ማስገቢያ (ኤክሴል/PDF)', 'Grade Entry (Excel/PDF)')}
                </button>
              </div>
            </div>
          )}

          {/* Desktop Registrar View Switcher Bar (lg+) */}
          {currentUser && currentUser.role === 'REGISTRAR' && (
            <div className="hidden lg:flex pb-3 pt-1 border-t border-emerald-800/60 items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                <User className="w-4 h-4" />
                <span>{t('የሬጅስትራር ጽሕፈት ቤት (የውጤት ማስገቢያ፣ ኤክሴልና ፒዲኤፍ ተፈቅዷል):', "Registrar's Office (Grade Entry, Excel & PDF Authorized):")}</span>
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
                  {t('የሬጅስትራር ቢሮ', "Registrar's Office")}
                </button>
                <button
                  onClick={() => onAdminChangeView('TEACHER')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                    adminActiveView === 'TEACHER'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-emerald-900'
                  }`}
                >
                  {t('የመምህራን ውጤት ማስገቢያ (ኤክሴል/PDF)', 'Grade Entry (Excel/PDF)')}
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
          <span>
            {t(
              'ሲስተሙ በጥገና/መቆለፊያ ሁነታ (Maintenance Lock) ላይ ይገኛል። ከአድሚን ውጪ ሌሎች ተጠቃሚዎች ገደብ ተጥሎባቸዋል።',
              'System is in Maintenance Lock mode. Access is restricted for all non-admin users.'
            )}
          </span>
        </div>
      )}
    </>
  );
};

