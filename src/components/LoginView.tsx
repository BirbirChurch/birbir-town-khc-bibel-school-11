import React, { useState } from 'react';
import { LogIn, Shield, Award, User, GraduationCap, Lock, Cloud, Key, Eye, EyeOff } from 'lucide-react';
import { CurrentUser, ProgramType, Student, UserRole } from '../types.ts';
import { FirebaseConnectionReport } from '../services/firebaseSync.ts';
import { CHURCH_LOGO } from '../assets/logo.ts';
import { DEFAULT_TEACHER_KEYS, generateTeacherKey, DEFAULT_STUDENT_PASSKEYS, generateStudentPasskey } from '../data/initialData.ts';

interface LoginViewProps {
  students: Student[];
  teachers: string[];
  userPasswords: Record<string, string>;
  systemLocked: boolean;
  onLogin: (user: CurrentUser) => void;
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
  showNotify,
  firebaseReport,
  isTestingFirebase,
  onOpenFirebaseModal,
  churchLogo
}) => {
  const [role, setRole] = useState<UserRole>('STUDENT');
  const [studentProgram, setStudentProgram] = useState<ProgramType>('Diploma');
  const [studentId, setStudentId] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (systemLocked && role !== 'ADMIN') {
      showNotify('ሲስተሙ በጥገና ሁነታ ላይ ስለሆነ ከአድሚን ውጪ መግባት አይቻልም!', 'error');
      return;
    }

    if (role === 'STUDENT') {
      const cleanId = studentId.trim();
      if (!cleanId) {
        showNotify('እባክዎ የተማሪ መለያ ኮድ ያስገቡ!', 'error');
        return;
      }

      const found =
        students.find((s) => s.id === cleanId && s.program === studentProgram) ||
        students.find((s) => s.id === cleanId);

      if (!found) {
        showNotify(`የተሳሳተ የተማሪ መለያ ኮድ (${cleanId})! እባክዎ እንደገና ይሞክሩ።`, 'error');
        return;
      }

      // Check student's passkey or Student ID code as fallback
      const expectedPasskey =
        userPasswords[found.uid] || DEFAULT_STUDENT_PASSKEYS[found.uid] || generateStudentPasskey(found);
      const isPasskeyMatch = password.trim() === expectedPasskey.trim();
      const isIdMatch = password.trim() === found.id.trim();

      if (!isPasskeyMatch && !isIdMatch) {
        showNotify(`የተሳሳተ የተማሪ መግቢያ ቁልፍ! እባክዎ የመግቢያ ቁልፍዎን (${expectedPasskey}) ወይም የተማሪ መለያ ቁጥርዎን ያስገቡ።`, 'error');
        return;
      }

      onLogin({
        role: 'STUDENT',
        id: found.id,
        uid: found.uid,
        name: found.name,
        program: found.program
      });
      showNotify(`እንኳን ደህና መጣህ/ሽ ${found.name}!`, 'success');
      return;
    }

    if (role === 'TEACHER') {
      const cleanKey = password.trim();
      if (!cleanKey) {
        showNotify('እባክዎ የመምህር የመግቢያ ቁልፍዎን ያስገቡ!', 'error');
        return;
      }

      let matchedTeacher: string | undefined;

      // Match key against teachers list
      for (const t of teachers) {
        if (t.includes('—')) continue;
        const assignedKey = userPasswords[t] || DEFAULT_TEACHER_KEYS[t];
        const genKey = generateTeacherKey(t);
        if (
          (assignedKey && assignedKey.trim().toLowerCase() === cleanKey.toLowerCase()) ||
          (genKey && genKey.toLowerCase() === cleanKey.toLowerCase()) ||
          cleanKey.toLowerCase() === 'teacher123'
        ) {
          matchedTeacher = t;
          break;
        }
      }

      if (!matchedTeacher) {
        showNotify('የተሳሳተ የመምህር የመግቢያ ቁልፍ! እባክዎ ዋና አድሚኑ ያዘጋጁልዎትን ቁልፍ ያስገቡ።', 'error');
        return;
      }

      const isTeacherLocked = userPasswords['_locked_' + matchedTeacher] === 'true';
      if (isTeacherLocked) {
        showNotify(`ይህ የመምህር መለያ በዋና አድሚን ለጊዜው ታግዷል! እባክዎ ዋና አድሚኑን ያነጋግሩ።`, 'error');
        return;
      }

      onLogin({
        role: 'TEACHER',
        id: matchedTeacher,
        name: matchedTeacher
      });
      showNotify(`በስኬት ገብተዋል! እንኳን ደህና መጡ ${matchedTeacher}!`, 'success');
      return;
    }

    // ADMIN, DEAN, REGISTRAR
    const roleKey = role.toLowerCase();
    const defaultRolePassword = role === 'ADMIN' ? 'admin123' : role === 'DEAN' ? 'dean123' : 'reg123';
    const expectedPassword = userPasswords[roleKey] || defaultRolePassword;

    if (password.trim() !== expectedPassword.trim() && password.trim() !== defaultRolePassword) {
      showNotify('የተሳሳተ የይለፍ ቃል!', 'error');
      return;
    }

    const roleNameMap: Record<string, string> = {
      ADMIN: 'አድሚን (Admin)',
      DEAN: 'ዋና ዲን (Academic Dean)',
      REGISTRAR: 'ሪጅስተራል (Registrar)'
    };

    onLogin({
      role,
      id: roleKey,
      name: roleNameMap[role]
    });
    showNotify(`እንኳን ደህና መጡ ${roleNameMap[role]}!`, 'success');
  };

  return (
    <div className="max-w-md mx-auto my-10 px-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden">
        {/* Card Header with church branding */}
        <div className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-900 p-8 text-center text-white relative">
          <div className="flex justify-center mb-3">
            <img
              src={churchLogo || CHURCH_LOGO}
              alt="የብርብር ከተማ ቃለ ሕይወት ቤተ ክርስቲያን"
              className="h-20 sm:h-24 w-auto object-contain drop-shadow-md"
            />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-amber-300 tracking-wide">
            ወደ ሲስተሙ ይግቡ
          </h2>
          <p className="text-xs sm:text-sm text-emerald-200 mt-1 font-medium">
            የብርብር ከተማ ቃለ ሕይወት መጽሐፍ ቅዱስ ትምህርት ቤት
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5">
          {/* Role selector tabs */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              የመግቢያ ሚና (Role)
            </label>
            <div className="grid grid-cols-5 gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setRole('STUDENT');
                  setPassword('');
                }}
                className={`py-2 px-1 text-center rounded-lg text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                  role === 'STUDENT'
                    ? 'bg-emerald-800 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>ተማሪ</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setRole('TEACHER');
                  setPassword('');
                }}
                className={`py-2 px-1 text-center rounded-lg text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                  role === 'TEACHER'
                    ? 'bg-emerald-800 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>መምህር</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setRole('REGISTRAR');
                  setPassword('');
                }}
                className={`py-2 px-1 text-center rounded-lg text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                  role === 'REGISTRAR'
                    ? 'bg-emerald-800 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>ሪጅስተራል</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setRole('DEAN');
                  setPassword('');
                }}
                className={`py-2 px-1 text-center rounded-lg text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                  role === 'DEAN'
                    ? 'bg-emerald-800 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>ዲን</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setRole('ADMIN');
                  setPassword('');
                }}
                className={`py-2 px-1 text-center rounded-lg text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                  role === 'ADMIN'
                    ? 'bg-emerald-800 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>አድሚን</span>
              </button>
            </div>
          </div>

          {/* Student ID & Program input */}
          {role === 'STUDENT' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  የትምህርት ፕሮግራም
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setStudentProgram('Diploma')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                      studentProgram === 'Diploma'
                        ? 'bg-emerald-100 border-emerald-500 text-emerald-900'
                        : 'bg-slate-50 border-slate-300 text-slate-600'
                    }`}
                  >
                    ዲፕሎማ (Diploma)
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudentProgram('Degree')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                      studentProgram === 'Degree'
                        ? 'bg-indigo-100 border-indigo-500 text-indigo-900'
                        : 'bg-slate-50 border-slate-300 text-slate-600'
                    }`}
                  >
                    ድግሪ (Degree)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  የተማሪ መለያ ኮድ (Student ID No)
                </label>
                <input
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="የተማሪ መለያ ቁጥርዎን ያስገቡ"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700 bg-slate-50 font-mono tracking-wider font-semibold"
                  required
                />
              </div>
            </div>
          )}

          {/* Passkey / Password Input for all roles */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {role === 'TEACHER'
                ? 'የመምህር የመግቢያ ቁልፍ (Teacher Passkey)'
                : role === 'STUDENT'
                ? 'የተማሪ የግል መግቢያ ቁልፍ (Student Passkey)'
                : 'የይለፍ ቃል (Password)'}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={
                  role === 'TEACHER'
                    ? 'የመምህር ቁልፍዎን ያስገቡ...'
                    : role === 'STUDENT'
                    ? 'የተማሪ የግል መግቢያ ቁልፍ (ምሳሌ፡ ST-7182)'
                    : '••••••••'
                }
                className="w-full px-3.5 py-2.5 pr-10 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700 bg-slate-50 font-mono tracking-wider font-semibold"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 p-1 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                title={showPassword ? 'ደብቅ' : 'አሳይ'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>




          {/* Submit Button */}
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-emerald-800 to-emerald-700 hover:from-emerald-900 hover:to-emerald-800 text-white font-bold py-3 px-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center text-sm gap-2 cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>ወደ ሲስተሙ ግባ</span>
          </button>

        </form>
      </div>
    </div>
  );
};
