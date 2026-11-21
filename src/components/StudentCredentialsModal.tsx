import React, { useState, useMemo } from 'react';
import { X, Search, Printer, Copy, Check, Key, ShieldCheck, Download, Eye, EyeOff, FileSpreadsheet } from 'lucide-react';
import { ProgramType, Student } from '../types.ts';
import { CHURCH_LOGO } from '../assets/logo.ts';
import { DEFAULT_STUDENT_PASSKEYS, generateStudentPasskey } from '../data/initialData.ts';
import { sortStudentsByAmharicName } from '../utils/amharicSort.ts';
import { printElementDirectly } from '../utils/pdfExport.ts';
import {
  useLanguage,
  formatProgram,
  formatGender,
  formatYearLevel,
  formatCalendarYear,
  formatSemester
} from '../utils/i18n.tsx';

interface StudentCredentialsModalProps {
  students: Student[];
  userPasswords: Record<string, string>;
  churchLogo?: string;
  currentYear: string;
  currentSemester: string;
  onClose: () => void;
  showNotify: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  onOpenPasswordModal?: (studentUid: string, studentName: string) => void;
}

export const StudentCredentialsModal: React.FC<StudentCredentialsModalProps> = ({
  students,
  userPasswords,
  churchLogo,
  currentYear,
  currentSemester,
  onClose,
  showNotify,
  onOpenPasswordModal
}) => {
  const { lang, t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [programFilter, setProgramFilter] = useState<'ALL' | ProgramType>('ALL');
  const [yearFilter, setYearFilter] = useState<'ALL' | number>('ALL');
  const [showAllPasskeys, setShowAllPasskeys] = useState(true);
  const [copiedUid, setCopiedUid] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  // Filter & sort students in Amharic fidel order
  const filteredStudents = useMemo(() => {
    const list = students.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.program.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesProgram = programFilter === 'ALL' || s.program === programFilter;
      const matchesYear = yearFilter === 'ALL' || (s.currentStudyYear || 1) === yearFilter;
      return matchesSearch && matchesProgram && matchesYear;
    });

    return sortStudentsByAmharicName(list);
  }, [students, searchTerm, programFilter, yearFilter]);

  const getStudentPasskey = (student: Student): string => {
    return userPasswords[student.uid] || DEFAULT_STUDENT_PASSKEYS[student.uid] || generateStudentPasskey(student);
  };

  const handleCopySingle = (student: Student) => {
    const passkey = getStudentPasskey(student);
    const text = t(
      `የተማሪ ስም: ${student.name} | መለያ ቁጥር (ID): ${student.id} | መግቢያ ቁልፍ: ${passkey}`,
      `Student Name: ${student.name} | Student ID: ${student.id} | Passkey: ${passkey}`
    );
    navigator.clipboard.writeText(text);
    setCopiedUid(student.uid);
    showNotify(t(`የተማሪ ${student.name} መግቢያ ቁልፍ ተቀድቷል!`, `Passkey copied for ${student.name}!`), 'success');
    setTimeout(() => setCopiedUid(null), 2500);
  };

  const handleCopyAll = () => {
    let text = t(
      `የብርብር ከተማ ቃለ ሕይወት መጽሐፍ ቅዱስ ትምህርት ቤት\nየተማሪዎች ይፋዊ መግቢያ ቁልፎች ዝርዝር (${currentYear} ዓ.ም)\n\n`,
      `Birbir City Kale Heywet Bible Training School\nOfficial Student Passkeys Registry (${currentYear} E.C.)\n\n`
    );
    text += t(
      `ተ.ቁ | መለያ ቁጥር (ID) | የተማሪ ሙሉ ስም | ፕሮግራም | መግቢያ ቁልፍ (Passkey)\n`,
      `# | Student ID | Full Name | Program | Passkey\n`
    );
    text += `--------------------------------------------------------------------------\n`;

    filteredStudents.forEach((s, idx) => {
      const pass = getStudentPasskey(s);
      text += `${idx + 1}. | ${s.id} | ${s.name} | ${formatProgram(s.program, lang)} | ${pass}\n`;
    });

    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    showNotify(t('የሁሉም ተማሪዎች መግቢያ ቁልፍ ዝርዝር ተቀድቷል!', 'All student passkeys copied to clipboard!'), 'success');
    setTimeout(() => setCopiedAll(false), 3000);
  };

  const handleExportCSV = () => {
    let csv = t(
      `\uFEFFተ.ቁ,የተማሪ መለያ ቁጥር (ID),የተማሪ ሙሉ ስም,ጾታ,ፕሮግራም,ደረጃ / ዓመት,የግል መግቢያ ቁልፍ (Passkey)\n`,
      `\uFEFF#,Student ID,Full Name,Gender,Program,Study Year,Personal Passkey\n`
    );
    filteredStudents.forEach((s, idx) => {
      const pass = getStudentPasskey(s);
      csv += `${idx + 1},"${s.id}","${s.name}","${formatGender(s.gender, lang)}","${formatProgram(s.program, lang)}","${formatYearLevel(s.currentStudyYear || 1, lang)}","${pass}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Student_Passkeys_Registry_${currentYear}_${currentSemester}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showNotify(t('የተማሪዎች መግቢያ ቁልፍ ሰነድ በ CSV ወርዷል!', 'Student passkeys registry exported as CSV!'), 'success');
  };

  const handlePrint = () => {
    printElementDirectly('printable-student-credentials', { orientation: 'portrait' });
  };

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs z-50 flex items-center justify-center p-1.5 sm:p-5 overflow-hidden">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-5xl w-full max-h-[95vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header - Not printed as modal header */}
        <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-900 text-white p-4 sm:p-5 flex justify-between items-center gap-2 no-print shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="p-2 sm:p-2.5 bg-amber-400/20 rounded-2xl border border-amber-300/30 text-amber-300 shrink-0">
              <Key className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-extrabold text-sm sm:text-lg flex flex-wrap items-center gap-1.5">
                <span className="truncate">{t('የተማሪዎች የግል መግቢያ ቁልፎች ይፋዊ ማህደር', 'Official Student Passkeys Registry')}</span>
                <span className="text-[11px] bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-400/30 font-mono shrink-0">
                  {filteredStudents.length} {t('ተማሪዎች', 'students')}
                </span>
              </h3>
              <p className="text-[11px] sm:text-xs text-emerald-200 hidden sm:block">
                {t(
                  'ሁሉም ተማሪዎች ከመለያ ኮዳቸው የተለየ የግል ሚስጥራዊ ቁልፍ (ST-XXXX) አላቸው። ስሞች በአማርኛ ፊደል ተራ (ሀ-ፐ) ተደርድረዋል።',
                  'Every student has an assigned personal passkey (ST-XXXX) separate from their ID number.'
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onClose}
              className="p-2 min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label={t('ዝጋ', 'Close')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar Controls - No Print */}
        <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap justify-between items-center gap-2.5 sm:gap-3 no-print shrink-0">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder={t('በተማሪ ስም፣ በመለያ ቁጥር ወይም በፕሮግራም ፈልግ...', 'Search by student name, ID, or program...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 min-h-[38px] text-xs border rounded-xl bg-white border-slate-300 focus:ring-2 focus:ring-emerald-700 font-medium"
              />
            </div>

            <select
              value={programFilter}
              onChange={(e) => setProgramFilter(e.target.value as any)}
              className="p-2 min-h-[38px] text-xs font-semibold border rounded-xl bg-white border-slate-300 cursor-pointer"
            >
              <option value="ALL">{t('ፕሮግራም: ሁሉም', 'Program: All')}</option>
              <option value="Degree">{formatProgram('Degree', lang)}</option>
              <option value="Diploma">{formatProgram('Diploma', lang)}</option>
            </select>

            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
              className="p-2 min-h-[38px] text-xs font-semibold border rounded-xl bg-white border-slate-300 cursor-pointer"
            >
              <option value="ALL">{t('ደረጃ: ሁሉም ዓመታት', 'Level: All Years')}</option>
              <option value={1}>{formatYearLevel(1, lang)}</option>
              <option value={2}>{formatYearLevel(2, lang)}</option>
              <option value={3}>{formatYearLevel(3, lang)}</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setShowAllPasskeys(!showAllPasskeys)}
              className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-800 text-xs px-3 py-2 min-h-[38px] rounded-xl border border-slate-300 font-bold transition-colors cursor-pointer"
            >
              {showAllPasskeys ? <EyeOff className="w-3.5 h-3.5 text-slate-600" /> : <Eye className="w-3.5 h-3.5 text-slate-600" />}
              <span>{showAllPasskeys ? t('ቁልፎችን ደብቅ', 'Hide Passkeys') : t('ሁሉንም አሳይ', 'Show All')}</span>
            </button>

            <button
              type="button"
              onClick={handleCopyAll}
              className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-800 text-xs px-3 py-2 min-h-[38px] rounded-xl border border-slate-300 font-bold transition-colors cursor-pointer"
            >
              {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-amber-600" />}
              <span>{copiedAll ? t('ተቀድቷል!', 'Copied!') : t('ሁሉንም ኮፒ', 'Copy All')}</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 text-xs px-3 py-2 min-h-[38px] rounded-xl border border-emerald-300 font-bold transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
              <span>CSV</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs px-3.5 py-2 min-h-[38px] rounded-xl font-bold shadow-sm transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{t('አትም', 'Print')}</span>
            </button>
          </div>
        </div>

        {/* Printable Sheet Viewport */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 print:p-0 print:overflow-visible">
        <div id="printable-student-credentials" className="space-y-4 bg-white">
          {/* Printable Header */}
          <div className="border-b-2 border-slate-800 pb-4 flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
              <img
                src={churchLogo || CHURCH_LOGO}
                alt={t('የብርብር ከተማ ቃለ ሕይወት ቤተ ክርስቲያን', 'Birbir City Kale Heywet Church')}
                className="h-12 sm:h-16 w-auto object-contain shrink-0"
              />
              <div>
                <h2 className="text-sm sm:text-lg font-black text-slate-900 tracking-tight">
                  {t('የብርብር ከተማ ቃለ ሕይወት መጽሐፍ ቅዱስ ትምህርት ቤት', 'Birbir City Kale Heywet Bible Training School')}
                </h2>
                <h3 className="text-xs sm:text-sm font-bold text-emerald-800">
                  {t('የተማሪዎች የግል መግቢያ ቁልፎች ይፋዊ ዝርዝር (Student Passkeys Registry)', 'Official Student Passkeys Registry')}
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  {t('የትምህርት ዘመን፦', 'Academic Year:')} {formatCalendarYear(currentYear, lang)} | {formatSemester(currentSemester, lang)}
                </p>
              </div>
            </div>

            <div className="text-right text-xs text-slate-600 hidden sm:block">
              <span className="inline-block px-3 py-1 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 font-bold text-[11px]">
                {t('ሚስጥራዊ ሰነድ (Confidential)', 'Confidential Document')}
              </span>
              <p className="text-[10px] text-slate-400 mt-1">{t('የታተመበት ቀን፦', 'Printed Date:')} {new Date().toLocaleDateString(lang === 'en' ? 'en-US' : 'am-ET')}</p>
            </div>
          </div>

          {/* Student Passkey Notice */}
          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-950 no-print">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">{t('ደንብና መመሪያ፦ ', 'Policy & Guidelines: ')}</span>
              {t(
                'ሁሉም ተማሪዎች ወደ ሲስተሙ የሚገቡት በግል መለያ ቁጥራቸው (ID) እና በዚህ ሰነድ በተዘጋጀላቸው የተማሪ የግል መግቢያ ቁልፍ (ST-XXXX) ብቻ ነው። መግቢያ ቁልፉ ከተማሪው መለያ ቁጥር (ID) ፍጹም የተለየ ሲሆን ለሚመለከተው ተማሪ ብቻ በግል ይሰጣል።',
                'Students sign in using their Student ID and personal passkey (ST-XXXX) listed below. Passkeys should be shared confidentially with each individual student.'
              )}
            </div>
          </div>

          {/* Table */}
          <div className="border border-slate-300 rounded-2xl overflow-x-auto shadow-2xs print:overflow-visible">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 text-slate-800 font-black uppercase text-[11px] border-b border-slate-300">
                <tr>
                  <th className="p-2.5 w-12 text-center">{t('ተ.ቁ', '#')}</th>
                  <th className="p-2.5 w-28">{t('መለያ ኮድ (ID)', 'Student ID')}</th>
                  <th className="p-2.5">{t('የተማሪው ሙሉ ስም (በአማርኛ ፊደል ተራ)', 'Student Full Name')}</th>
                  <th className="p-2.5 w-16 text-center">{t('ጾታ', 'Sex')}</th>
                  <th className="p-2.5 w-24">{t('ፕሮግራም', 'Program')}</th>
                  <th className="p-2.5 w-24">{t('ደረጃ / ዓመት', 'Study Year')}</th>
                  <th className="p-2.5 w-36">{t('ሚስጥራዊ መግቢያ ቁልፍ', 'Personal Passkey')}</th>
                  <th className="p-2.5 w-28 text-right no-print">{t('ተግባር', 'Action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 italic">
                      {t('ምንም የተገኘ ተማሪ የለም።', 'No matching students found.')}
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((s, idx) => {
                    const passkey = getStudentPasskey(s);
                    const isCopied = copiedUid === s.uid;

                    return (
                      <tr key={s.uid} className="hover:bg-slate-50 transition-colors">
                        <td className="p-2.5 font-mono text-center font-bold text-slate-500">{idx + 1}</td>
                        <td className="p-2.5 font-mono font-black text-slate-900 bg-slate-50/50">{s.id}</td>
                        <td className="p-2.5 font-bold text-slate-900">
                          <span>{s.name}</span>
                          <span className="block text-[10px] text-slate-400 font-normal">
                            {t('የገቡበት:', 'Admitted:')} {formatCalendarYear(s.admissionYear || '2019', lang)}
                          </span>
                        </td>
                        <td className="p-2.5 text-center text-slate-600 font-medium">{formatGender(s.gender, lang)}</td>
                        <td className="p-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              s.program === 'Degree'
                                ? 'bg-indigo-100 text-indigo-900'
                                : 'bg-emerald-100 text-emerald-900'
                            }`}
                          >
                            {formatProgram(s.program, lang)}
                          </span>
                        </td>
                        <td className="p-2.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                            {formatYearLevel(s.currentStudyYear || 1, lang)}
                          </span>
                        </td>
                        <td className="p-2.5 font-mono font-black text-sm">
                          {showAllPasskeys ? (
                            <span className="bg-amber-100 text-amber-950 px-2.5 py-0.5 rounded-lg border border-amber-300 tracking-wider">
                              {passkey}
                            </span>
                          ) : (
                            <span className="text-slate-400 tracking-widest font-bold">••••••••</span>
                          )}
                        </td>
                        <td className="p-2.5 text-right no-print">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleCopySingle(s)}
                              className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                isCopied
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                              }`}
                              title={t('ቁልፍ ኮፒ አድርግ', 'Copy Passkey')}
                            >
                              {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>

                            {onOpenPasswordModal && (
                              <button
                                type="button"
                                onClick={() => onOpenPasswordModal(s.uid, s.name)}
                                className="bg-amber-500 hover:bg-amber-600 text-white text-[10px] px-2 py-1 rounded-lg font-bold transition-colors cursor-pointer"
                                title={t('ቁልፍ ቀይር', 'Change Passkey')}
                              >
                                {t('ቀይር', 'Edit')}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Printable Footer */}
          <div className="pt-6 border-t border-slate-300 mt-6 grid grid-cols-2 gap-8 text-xs text-slate-700">
            <div>
              <p className="font-bold">{t('የሪጅስተራል ስምና ፊርማ፦', 'Registrar Name & Signature:')} ____________________________</p>
              <p className="text-[10px] text-slate-500 mt-1">{t('ቀን፦', 'Date:')} __________________</p>
            </div>
            <div className="text-right">
              <p className="font-bold">{t('የዋና ዲን ስምና ማኅተም፦', 'Academic Dean Signature & Seal:')} ____________________________</p>
              <p className="text-[10px] text-slate-500 mt-1">{t('ቀን፦', 'Date:')} __________________</p>
            </div>
          </div>
        </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500 no-print">
          <div>
            {t('የተጣሩ ተማሪዎች፦', 'Filtered Students:')}{' '}
            <strong className="text-slate-800">{filteredStudents.length}</strong> {t('ከ', 'of')}{' '}
            <strong className="text-slate-800">{students.length}</strong>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition-colors cursor-pointer"
          >
            {t('ዝጋ', 'Close')}
          </button>
        </div>
      </div>
    </div>
  );
};
