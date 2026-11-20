import React, { useState } from 'react';
import { LogIn, Shield, Award, User, GraduationCap, Eye, EyeOff, Globe } from 'lucide-react';
import { CurrentUser, FailedLoginReason, ProgramType, Student, UserRole } from '../types.ts';
import { FirebaseConnectionReport } from '../services/firebaseSync.ts';
import { CHURCH_LOGO } from '../assets/logo.ts';
import { DEFAULT_TEACHER_KEYS, generateTeacherKey, DEFAULT_STUDENT_PASSKEYS, generateStudentPasskey } from '../data/initialData.ts';
import { useLanguage, formatRole } from '../utils/i18n.tsx';

function maskAttemptedSecret(raw: string): string {
  const s = raw.trim();
  if (!s) return '(empty)';
  if (s.length <= 2) return `${'*'.repeat(s.length)} (${s.length})`;
  const visible = s.length >= 6 ? s.slice(0, 2) : s.slice(0, 1);
  return `${visible}${'*'.repeat(Math.min(6, s.length - visible.length))} (${s.length})`;
}

interface LoginViewProps {
  students: Student[];
  teachers: string[];
  userPasswords: Record<string, string>;
  systemLocked: boolean;
  onLogin: (user: CurrentUser) => void;
  onFailedLogin?: (attempt: {
    role: UserRole;
    attemptedTarget: string;
    reason: FailedLoginReason;
    maskedKey: string;
  }) => void;
  showNotify: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  firebaseReport: FirebaseConnectionReport | null;
  isTestingFirebase: boolean;
  onOpenFirebaseModal: () => void;
  churchLogo?: string;
}

export const LoginView: React.FC<LoginViewProps> = ({
  students,
  teachers,
  userPasswords,
  systemLocked,
  onLogin,
  onFailedLogin,
  showNotify,
  churchLogo
}) => {
  const { lang, setLang, t } = useLanguage();
  const [role, setRole] = useState<UserRole>('STUDENT');
  const [studentProgram, setStudentProgram] = useState<ProgramType>('Diploma');
  const [studentId, setStudentId] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (systemLocked && role !== 'ADMIN') {
      onFailedLogin?.({
        role,
        attemptedTarget: role === 'STUDENT' ? (studentId.trim() || 'STUDENT_PORTAL') : role,
        reason: 'SYSTEM_LOCKED',
        maskedKey: maskAttemptedSecret(password)
      });
      showNotify(
        t('ሲስተሙ በጥገና ሁነታ ላይ ስለሆነ ከአድሚን ውጪ መግባት አይቻልም!', 'System is under maintenance lock. Only Admin can log in!'),
        'error'
      );
      return;
    }

    if (role === 'STUDENT') {
      const cleanId = studentId.trim();
      if (!cleanId) {
        showNotify(t('እባክዎ የተማሪ መለያ ኮድ ያስገቡ!', 'Please enter your Student ID!'), 'error');
        return;
      }

      const found =
        students.find((s) => s.id === cleanId && s.program === studentProgram) ||
        students.find((s) => s.id === cleanId);

      if (!found) {
        onFailedLogin?.({
          role: 'STUDENT',
          attemptedTarget: cleanId,
          reason: 'INVALID_STUDENT_ID',
          maskedKey: maskAttemptedSecret(password)
        });
        showNotify(
          t(`የተሳሳተ የተማሪ መለያ ኮድ (${cleanId})! እባክዎ እንደገና ይሞክሩ።`, `Invalid Student ID (${cleanId})! Please try again.`),
          'error'
        );
        return;
      }

      const expectedPasskey =
        userPasswords[found.uid] || DEFAULT_STUDENT_PASSKEYS[found.uid] || generateStudentPasskey(found);
      const isPasskeyMatch = password.trim() === expectedPasskey.trim();
      const isIdMatch = password.trim() === found.id.trim();

      if (!isPasskeyMatch && !isIdMatch) {
        onFailedLogin?.({
          role: 'STUDENT',
          attemptedTarget: `${found.id} — ${found.name}`,
          reason: 'WRONG_PASSKEY',
          maskedKey: maskAttemptedSecret(password)
        });
        showNotify(
          t(
            `የተሳሳተ የተማሪ መግቢያ ቁልፍ! እባክዎ የመግቢያ ቁልፍዎን (${expectedPasskey}) ወይም የተማሪ መለያ ቁጥርዎን ያስገቡ።`,
            `Invalid student passkey! Please enter your passkey (${expectedPasskey}) or Student ID.`
          ),
          'error'
        );
        return;
      }

      onLogin({
        role: 'STUDENT',
        id: found.id,
        uid: found.uid,
        name: found.name,
        program: found.program
      });
      showNotify(t(`እንኳን ደህና መጣህ/ሽ ${found.name}!`, `Welcome, ${found.name}!`), 'success');
      return;
    }

    if (role === 'TEACHER') {
      const cleanKey = password.trim();
      if (!cleanKey) {
        showNotify(t('እባክዎ የመምህር የመግቢያ ቁልፍዎን ያስገቡ!', 'Please enter your Instructor Passkey!'), 'error');
        return;
      }

      let matchedTeacher: string | undefined;

      for (const teacher of teachers) {
        if (teacher.includes('—')) continue;
        const assignedKey = userPasswords[teacher] || DEFAULT_TEACHER_KEYS[teacher];
        const genKey = generateTeacherKey(teacher);
        if (
          (assignedKey && assignedKey.trim().toLowerCase() === cleanKey.toLowerCase()) ||
          (genKey && genKey.toLowerCase() === cleanKey.toLowerCase()) ||
          cleanKey.toLowerCase() === 'teacher123'
        ) {
          matchedTeacher = teacher;
          break;
        }
      }

      if (!matchedTeacher) {
        onFailedLogin?.({
          role: 'TEACHER',
          attemptedTarget: 'TEACHER_PORTAL',
          reason: 'WRONG_PASSKEY',
          maskedKey: maskAttemptedSecret(cleanKey)
        });
        showNotify(
          t(
            'የተሳሳተ የመምህር የመግቢያ ቁልፍ! እባክዎ ዋና አድሚኑ ያዘጋጁልዎትን ቁልፍ ያስገቡ።',
            'Invalid instructor passkey! Please enter the key provided by the Admin.'
          ),
          'error'
        );
        return;
      }

      const isTeacherLocked = userPasswords['_locked_' + matchedTeacher] === 'true';
      if (isTeacherLocked) {
        onFailedLogin?.({
          role: 'TEACHER',
          attemptedTarget: matchedTeacher,
          reason: 'LOCKED_ACCOUNT',
          maskedKey: maskAttemptedSecret(cleanKey)
        });
        showNotify(
          t(
            'ይህ የመምህር መለያ በዋና አድሚን ለጊዜው ታግዷል! እባክዎ ዋና አድሚኑን ያነጋግሩ።',
            'This instructor account is temporarily suspended by Admin! Please contact the Admin.'
          ),
          'error'
        );
        return;
      }

      onLogin({
        role: 'TEACHER',
        id: matchedTeacher,
        name: matchedTeacher
      });
      showNotify(t(`በስኬት ገብተዋል! እንኳን ደህና መጡ ${matchedTeacher}!`, `Signed in successfully! Welcome, ${matchedTeacher}!`), 'success');
      return;
    }

    const roleKey = role.toLowerCase();
    const defaultRolePassword = role === 'ADMIN' ? 'admin123' : role === 'DEAN' ? 'dean123' : 'reg123';
    const expectedPassword = userPasswords[roleKey] || defaultRolePassword;

    if (password.trim() !== expectedPassword.trim() && password.trim() !== defaultRolePassword) {
      onFailedLogin?.({
        role,
        attemptedTarget: roleKey,
        reason: 'WRONG_PASSWORD',
        maskedKey: maskAttemptedSecret(password)
      });
      showNotify(t('የተሳሳተ የይለፍ ቃል!', 'Incorrect password!'), 'error');
      return;
    }

    const roleDisplay = formatRole(role, lang);
    onLogin({
      role,
      id: roleKey,
      name: roleDisplay
    });
    showNotify(t(`እንኳን ደህና መጡ ${roleDisplay}!`, `Welcome, ${roleDisplay}!`), 'success');
  };

  return (
    <div className="max-w-md sm:max-w-lg mx-auto my-3 sm:my-10 px-2 sm:px-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden">
        {/* Card Header with church branding & language switch */}
        <div className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-900 p-5 sm:p-8 text-center text-white relative">
          <div className="absolute top-3.5 right-3.5 flex items-center gap-1 bg-emerald-950/90 border border-emerald-700/70 rounded-xl p-1 shadow-sm">
            <Globe className="w-3.5 h-3.5 text-amber-300 ml-1" />
            <button
              type="button"
              onClick={() => setLang('am')}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                lang === 'am' ? 'bg-amber-400 text-slate-950' : 'text-emerald-100 hover:text-white'
              }`}
            >
              አማርኛ
            </button>
            <button
              type="button"
              onClick={() => setLang('en')}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                lang === 'en' ? 'bg-amber-400 text-slate-950' : 'text-emerald-100 hover:text-white'
              }`}
            >
              English
            </button>
          </div>

          <div className="flex justify-center mb-2.5 sm:mb-3 pt-4 sm:pt-0">
            <img
              src={churchLogo || CHURCH_LOGO}
              alt={t('የብርብር ከተማ ቃለ ሕይወት ቤተ ክርስቲያን', 'Birbir City Kale Heywet Church')}
              className="h-16 sm:h-24 w-auto object-contain drop-shadow-md"
            />
          </div>
          <h2 className="text-lg sm:text-2xl font-bold text-amber-300 tracking-wide">
            {t('ወደ ሲስተሙ ይግቡ', 'Sign In to Portal')}
          </h2>
          <p className="text-xs sm:text-sm text-emerald-200 mt-1 font-medium">
            {t('የብርብር ከተማ ቃለ ሕይወት መጽሐፍ ቅዱስ ትምህርት ቤት', 'Birbir City Kale Heywet Bible Training School')}
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-8 space-y-4 sm:space-y-5">
          {/* Role selector tabs */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              {t('የመግቢያ ሚና (Role)', 'Select Your Role')}
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setRole('STUDENT');
                  setPassword('');
                }}
                className={`min-h-[46px] py-2 px-1.5 text-center rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                  role === 'STUDENT'
                    ? 'bg-emerald-800 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <User className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                <span>{t('ተማሪ', 'Student')}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setRole('TEACHER');
                  setPassword('');
                }}
                className={`min-h-[46px] py-2 px-1.5 text-center rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                  role === 'TEACHER'
                    ? 'bg-emerald-800 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <GraduationCap className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                <span>{t('መምህር', 'Instructor')}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setRole('REGISTRAR');
                  setPassword('');
                }}
                className={`min-h-[46px] py-2 px-1.5 text-center rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                  role === 'REGISTRAR'
                    ? 'bg-emerald-800 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <User className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                <span>{t('ሪጅስተራል', 'Registrar')}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setRole('DEAN');
                  setPassword('');
                }}
                className={`min-h-[46px] py-2 px-1.5 text-center rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                  role === 'DEAN'
                    ? 'bg-emerald-800 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Award className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                <span>{t('ዲን', 'Dean')}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setRole('ADMIN');
                  setPassword('');
                }}
                className={`min-h-[46px] py-2 px-1.5 text-center rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer col-span-2 sm:col-span-1 ${
                  role === 'ADMIN'
                    ? 'bg-emerald-800 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Shield className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                <span>{t('አድሚን', 'Admin')}</span>
              </button>
            </div>
          </div>

          {/* Student ID & Program input */}
          {role === 'STUDENT' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('የትምህርት ፕሮግራም', 'Academic Program')}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setStudentProgram('Diploma')}
                    className={`min-h-[44px] py-2 px-3 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                      studentProgram === 'Diploma'
                        ? 'bg-emerald-100 border-emerald-500 text-emerald-900'
                        : 'bg-slate-50 border-slate-300 text-slate-600'
                    }`}
                  >
                    {t('ዲፕሎማ (Diploma)', 'Diploma Program')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudentProgram('Degree')}
                    className={`min-h-[44px] py-2 px-3 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                      studentProgram === 'Degree'
                        ? 'bg-indigo-100 border-indigo-500 text-indigo-900'
                        : 'bg-slate-50 border-slate-300 text-slate-600'
                    }`}
                  >
                    {t('ድግሪ (Degree)', 'Degree Program')}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('የተማሪ መለያ ኮድ (Student ID No)', 'Student ID Number')}
                </label>
                <input
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder={t('የተማሪ መለያ ቁጥርዎን ያስገቡ', 'Enter your Student ID number')}
                  className="w-full min-h-[46px] px-3.5 py-2.5 text-base sm:text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700 bg-slate-50 font-mono tracking-wider font-semibold"
                  required
                />
              </div>
            </div>
          )}

          {/* Passkey / Password Input for all roles */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {role === 'TEACHER'
                ? t('የመምህር የመግቢያ ቁልፍ (Teacher Passkey)', 'Instructor Passkey')
                : role === 'STUDENT'
                ? t('የተማሪ የግል መግቢያ ቁልፍ (Student Passkey)', 'Personal Student Passkey')
                : t('የይለፍ ቃል (Password)', 'Password')}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={
                  role === 'TEACHER'
                    ? t('የመምህር ቁልፍዎን ያስገቡ...', 'Enter your instructor passkey...')
                    : role === 'STUDENT'
                    ? t('የተማሪ የግል መግቢያ ቁልፍ (ምሳሌ፡ ST-7182)', 'Enter your passkey (e.g., ST-7182)')
                    : '••••••••'
                }
                className="w-full min-h-[46px] px-3.5 py-2.5 pr-12 text-base sm:text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700 bg-slate-50 font-mono tracking-wider font-semibold"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                title={showPassword ? t('ደብቅ', 'Hide') : t('አሳይ', 'Show')}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full min-h-[48px] bg-gradient-to-r from-emerald-800 to-emerald-700 hover:from-emerald-900 hover:to-emerald-800 text-white font-bold py-3 px-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center text-sm gap-2 cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>{t('ወደ ሲስተሙ ግባ', 'Sign In')}</span>
          </button>

        </form>
      </div>
    </div>
  );
};

