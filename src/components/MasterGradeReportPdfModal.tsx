import React, { useState, useMemo } from 'react';
import { X, Printer, FileSpreadsheet, Download, Loader2 } from 'lucide-react';
import { Course, GradeBreakdown, OfficialSignaturesConfig, ProgramType, Student } from '../types.ts';
import { calculateStudentGPA, getCourseAssessmentItems, getEffectiveGradeValues, rankStudentsByPerformance, resolveGradeBreakdown } from '../utils/gradeCalculations.ts';
import { CHURCH_LOGO } from '../assets/logo.ts';
import { exportMasterSemesterGradeSheetToExcel } from '../utils/excelUtils.ts';
import { downloadElementAsPdf, printElementDirectly } from '../utils/pdfExport.ts';
import {
  useLanguage,
  formatProgram,
  formatSemester,
  formatCalendarYear,
  formatYearLevel,
  formatCourseTitle,
  formatGender
} from '../utils/i18n.tsx';

interface MasterGradeReportPdfModalProps {
  students: Student[];
  courses: Course[];
  grades: Record<string, GradeBreakdown>;
  currentYear: string;
  currentSemester: string;
  churchLogo?: string;
  officialConfig?: OfficialSignaturesConfig;
  onClose: () => void;
  initialProgram?: 'ALL' | ProgramType;
}

export const MasterGradeReportPdfModal: React.FC<MasterGradeReportPdfModalProps> = ({
  students,
  courses,
  grades,
  currentYear,
  currentSemester,
  churchLogo,
  officialConfig,
  onClose,
  initialProgram = 'ALL'
}) => {
  const { lang, t } = useLanguage();
  const [selectedProgram, setSelectedProgram] = useState<'ALL' | ProgramType>(initialProgram);
  const [selectedSemester, setSelectedSemester] = useState<string>(currentSemester || 'ALL');
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [sortByRank, setSortByRank] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isBwMode, setIsBwMode] = useState(false);

  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    try {
      const progLabel = selectedProgram === 'ALL' ? 'All_Programs' : selectedProgram;
      const filename = `Master_Grade_Sheet_${progLabel}_${currentYear}_Sem${selectedSemester}.pdf`;
      await downloadElementAsPdf('printable-master-grade-report', filename, { orientation });
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handlePrint = () => {
    printElementDirectly('printable-master-grade-report', { orientation });
  };

  const programs = selectedProgram === 'ALL' ? ['Diploma' as const, 'Degree' as const] : [selectedProgram as ProgramType];
  const logoSrc = churchLogo || CHURCH_LOGO;

  const effectiveGrades = grades;

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs z-50 flex items-center justify-center p-1.5 sm:p-4 overflow-hidden">
      <div className={`bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-h-[95vh] flex flex-col overflow-hidden border border-slate-300 ${orientation === 'landscape' ? 'max-w-6xl' : 'max-w-4xl'}`}>
        {/* Modal Toolbar (hidden when printed) */}
        <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-900 text-white px-3.5 py-3 sm:px-6 sm:py-4 flex flex-wrap justify-between items-center gap-2.5 sm:gap-3 no-print border-b border-emerald-800 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="p-2 bg-emerald-700/60 rounded-xl text-amber-300 shrink-0">
              <Printer className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-xs sm:text-base text-white truncate">
                {t('የተማሪዎች አጠቃላይ የሴሚስተር ውጤት ዝርዝር ሰነድ', 'Master Semester Grade Sheet')}
              </h3>
              <p className="text-[11px] sm:text-xs text-emerald-200 truncate">
                {t('የትምህርት ዘመን', 'Academic Year')} {formatCalendarYear(currentYear, lang)} ({selectedSemester === 'ALL' ? t('ሁሉም ሴሚስተሮች', 'All Semesters') : formatSemester(selectedSemester, lang)})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap w-full sm:w-auto justify-end">
            <div className="flex items-center gap-1.5 bg-emerald-900/60 px-2 py-1 rounded-xl border border-emerald-700/50 min-h-[38px]">
              <span className="text-[11px] sm:text-xs text-emerald-200">{t('ፕሮግራም:', 'Program:')}</span>
              <select
                value={selectedProgram}
                onChange={(e) => setSelectedProgram(e.target.value as any)}
                className="bg-emerald-950 text-white text-xs px-2 py-1 rounded-lg border border-emerald-700 cursor-pointer font-bold"
              >
                <option value="ALL">{t('ሁሉም', 'All')}</option>
                <option value="Diploma">{formatProgram('Diploma', lang)}</option>
                <option value="Degree">{formatProgram('Degree', lang)}</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-emerald-900/60 px-2 py-1 rounded-xl border border-emerald-700/50 min-h-[38px]">
              <span className="text-[11px] sm:text-xs text-emerald-200">{t('ሴሚስተር:', 'Semester:')}</span>
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="bg-emerald-950 text-white text-xs px-2 py-1 rounded-lg border border-emerald-700 cursor-pointer font-bold"
              >
                <option value="ALL">{t('ሁሉም', 'All')}</option>
                <option value="1">{formatSemester('1', lang)}</option>
                <option value="2">{formatSemester('2', lang)}</option>
              </select>
            </div>

            {/* Page Orientation Selector (Landscape & Portrait) */}
            <div className="flex items-center bg-emerald-950 p-1 rounded-xl border border-emerald-700/70 min-h-[38px]">
              <span className="text-[11px] text-emerald-200 font-bold px-1.5 hidden sm:inline">{t('የገጽ አቀማመጥ:', 'Layout:')}</span>
              <button
                type="button"
                onClick={() => setOrientation('portrait')}
                className={`text-[11px] sm:text-xs px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  orientation === 'portrait'
                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
                title={t('ቋሚ አቀማመጥ (Portrait)', 'Portrait Layout')}
              >
                <span>📑 {t('ቋሚ', 'Portrait')}</span>
              </button>
              <button
                type="button"
                onClick={() => setOrientation('landscape')}
                className={`text-[11px] sm:text-xs px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  orientation === 'landscape'
                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
                title={t('አግድም አቀማመጥ (Landscape)', 'Landscape Layout')}
              >
                <span>📄 {t('አግድም', 'Landscape')}</span>
              </button>
            </div>

            {/* Sort Order Selector (Default vs By Rank) */}
            <button
              type="button"
              onClick={() => setSortByRank((prev) => !prev)}
              className={`text-[11px] sm:text-xs px-2.5 sm:px-3 py-2 min-h-[38px] rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                sortByRank
                  ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-sm'
                  : 'bg-emerald-950 text-emerald-200 border-emerald-700 hover:bg-emerald-900'
              }`}
              title={t('ተማሪዎችን በውጤት ደረጃ (GPA + A+ ብዛት) ለመደርደር', 'Sort students by academic rank (GPA + A+ tie-breaker)')}
            >
              <span>{sortByRank ? `🏆 ${t('በደረጃ ተደርድሯል', 'Sorted by Rank')}` : `🏆 ${t('በውጤት ደረጃ ደርድር', 'Sort by Rank')}`}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsBwMode(!isBwMode)}
              className={`text-[11px] sm:text-xs px-2.5 sm:px-3 py-2 min-h-[38px] rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                isBwMode
                  ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-sm'
                  : 'bg-emerald-950 text-emerald-200 border-emerald-700 hover:bg-emerald-900'
              }`}
              title={t('ለቢሮ ፕሪንተር የሚሆን የጥቁርና ነጭ (Ink-Saver) የፕሪንት አማራጭን ያብሩ/ያጥፉ', 'Toggle Black & White (Ink-Saver) mode for printing')}
            >
              <Printer className="w-4 h-4 shrink-0" />
              <span>{isBwMode ? '🖨️ B&W' : '🌈 Color'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] sm:text-xs px-3 py-2 min-h-[38px] rounded-xl font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              title={t('አጠቃላይ የሴሚስተር ውጤቱን በፒዲኤፍ (.pdf) በቀጥታ አውርድ', 'Download Master Grade Sheet as PDF')}
            >
              {isExportingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin text-white shrink-0" />
              ) : (
                <Download className="w-4 h-4 text-white shrink-0" />
              )}
              <span>{isExportingPdf ? t('እየተዘጋጀ...', 'Preparing...') : 'PDF'}</span>
            </button>

            <button
              type="button"
              onClick={() => exportMasterSemesterGradeSheetToExcel(students, courses, grades, currentYear, selectedSemester, selectedProgram)}
              className="bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] sm:text-xs px-3 py-2 min-h-[38px] rounded-xl font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              title={t('አጠቃላይ ውጤቱን በማይክሮሶፍት ኤክሴል ፋይል አውርድ', 'Export Master Grade Sheet to Excel')}
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-300 shrink-0" />
              <span>{t('ኤክሴል', 'Excel')}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] sm:text-xs px-3 py-2 min-h-[38px] rounded-xl font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4 shrink-0" />
              <span>{t('አትም', 'Print')}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="text-slate-300 hover:text-white p-2 min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
              aria-label={t('ዝጋ', 'Close')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body (A4 Landscape Optimized) */}
        <div className="flex-1 p-2.5 sm:p-6 bg-slate-100/60 overflow-x-auto overflow-y-auto print:max-h-none print:overflow-visible print:p-0">
          <div className="md:hidden text-[11px] font-bold text-slate-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5 mb-2 text-center no-print">
            ↔ {t('ሰነዱን ሙሉ ለማየት ወደ ጎን እና ወደ ታች ያንሸራትቱ', 'Swipe horizontally and vertically to view the full document')}
          </div>
          <div
            id="printable-master-grade-report"
            className={`p-6 sm:p-8 space-y-8 bg-white ${
              orientation === 'landscape' ? 'a4-landscape-document' : 'a4-portrait-document'
            } official-certificate-border shadow-md mx-auto ${
              isBwMode ? 'bw-mode-active' : ''
            }`}
          >
            {programs.map((prog) => {
              const progStudents = students.filter((s) => s.program === prog);
              const rankedProgEntries = rankStudentsByPerformance(
                progStudents,
                courses,
                effectiveGrades,
                currentYear,
                selectedSemester
              );
              const rankLookup = new Map(rankedProgEntries.map((r) => [r.student.uid, r]));
              const orderedStudents = sortByRank
                ? rankedProgEntries.map((r) => r.student)
                : progStudents;

              const progCourses = courses.filter((c) => {
                if (c.program !== prog) return false;
                const cYear = c.academicYear || (c.schedule && c.schedule.includes('2018') ? '2018' : '2019');
                const cSem = c.semester || (c.schedule && c.schedule.includes('2ኛ') ? '2' : '1');
                if (currentYear && cYear !== currentYear) return false;
                if (selectedSemester !== 'ALL' && cSem !== selectedSemester) return false;
                return true;
              });

              return (
                <div key={prog} className="space-y-4 mb-8 last:mb-0">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b-2 border-emerald-900">
                  <div className="flex items-center gap-4">
                    <img
                      src={logoSrc}
                      alt="የቤተክርስቲያኑ አርማ"
                      className="w-16 h-16 object-contain"
                    />
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">
                        {t('የብርብር ከተማ ቃለ ሕይወት ቤተ ክርስቲያን መጽሐፍ ቅዱስ ትምህርት ቤት', 'Birbir City Kale Heywet Church Bible Training School')}
                      </h2>
                      <h3 className="text-sm font-bold text-emerald-900">
                        {t('የተማሪዎች ይፋዊ አጠቃላይ የሴሚስተር ውጤት ማጠቃለያ ሰነድ (Master Grade Sheet)', 'Official Master Semester Grade Sheet')}
                      </h3>
                      <p className="text-xs text-slate-600">
                        {t('ፕሮግራም:', 'Program:')} <strong className="text-slate-900">{prog === 'Diploma' ? t('የመጽሐፍ ቅዱስ ዲፕሎማ', 'Bible Diploma Program') : t('የሥነ-መለኮት ድግሪ', 'Bachelor of Theology (Degree)')}</strong> | {t('የትምህርት ዘመን:', 'Academic Year:')} <strong className="text-slate-900">{formatCalendarYear(currentYear, lang)}</strong> ({selectedSemester === 'ALL' ? t('ሁሉም ሴሚስተሮች', 'All Semesters') : formatSemester(selectedSemester, lang)})
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    <p>{t('ቀን:', 'Date:')} {new Date().toLocaleDateString('en-GB')}</p>
                    <p>{t('ጠቅላላ ተማሪዎች:', 'Total Students:')} {progStudents.length}</p>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto border border-slate-300 rounded-xl">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead className="bg-slate-100 uppercase font-bold text-slate-800 border-b border-slate-300">
                      <tr>
                        <th className="p-2 border-r border-slate-300 text-center w-7 whitespace-nowrap">{t('ተ.ቁ', '#')}</th>
                        <th className="p-2 border-r border-slate-300 w-24 whitespace-nowrap">ID</th>
                        <th className="p-2 border-r border-slate-300 whitespace-nowrap min-w-[200px] student-name">{t('የተማሪ ስም', 'Student Name')}</th>
                        <th className="p-2 border-r border-slate-300 text-center w-10 whitespace-nowrap">{t('ጾታ', 'Sex')}</th>
                        <th className="p-2 border-r border-slate-300 text-center w-16 whitespace-nowrap">{t('ደረጃ', 'Level')}</th>
                        {progCourses.map((c) => {
                          const cTitle = formatCourseTitle(c.name, lang);
                          return (
                            <th key={c.id} className="p-2 border-r border-slate-300 text-center min-w-[70px]">
                              <span className="block truncate max-w-[85px]" title={cTitle}>{cTitle}</span>
                              <span className="text-[9px] font-mono font-bold text-slate-500">({c.credits}cr)</span>
                            </th>
                          );
                        })}
                        <th className="p-2 border-r border-slate-300 text-center font-bold bg-amber-50 text-amber-950 w-16 whitespace-nowrap">
                          GPA
                        </th>
                        <th className="p-2 border-r border-slate-300 text-center font-bold bg-indigo-50 text-indigo-950 w-16 whitespace-nowrap">
                          {t('ደረጃ', 'Rank')}
                        </th>
                        <th className="p-2 text-center w-24 whitespace-nowrap">{t('አቋም', 'Status')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {orderedStudents.map((student, idx) => {
                        const rankEntry = rankLookup.get(student.uid);
                        const gpa = rankEntry ? rankEntry.stats.gpaStr : calculateStudentGPA(student, courses, effectiveGrades, currentYear, selectedSemester);
                        const gpaNum = parseFloat(gpa);

                        return (
                          <tr key={student.uid} className="hover:bg-slate-50">
                            <td className="p-1.5 border-r border-slate-200 text-center font-mono text-slate-500">
                              {idx + 1}
                            </td>
                            <td className="p-1.5 border-r border-slate-200 font-mono font-bold text-slate-900 whitespace-nowrap">
                              {student.id}
                            </td>
                            <td className="p-1.5 border-r border-slate-200 font-bold text-slate-900 whitespace-nowrap student-name min-w-[200px]">
                              {student.name}
                            </td>
                            <td className="p-1.5 border-r border-slate-200 text-center text-slate-600">
                              {student.gender ? formatGender(student.gender, lang) : '—'}
                            </td>
                            <td className="p-1.5 border-r border-slate-200 text-center text-slate-700">
                              {formatYearLevel(student.currentStudyYear || 1, lang)}
                            </td>
                            {progCourses.map((c) => {
                              const targetYear = c.academicYear || (c.schedule && c.schedule.includes('2018') ? '2018' : currentYear);
                              const targetSem = c.semester || (c.schedule && c.schedule.includes('2ኛ') ? '2' : (selectedSemester !== 'ALL' ? selectedSemester : currentSemester)) || '1';
                              const g = resolveGradeBreakdown(effectiveGrades, student.uid, c.id, targetYear, targetSem, student.id);
                              const eff = getEffectiveGradeValues(g, getCourseAssessmentItems(c));
                              return (
                                <td key={c.id} className="p-1.5 border-r border-slate-200 text-center font-mono">
                                  {eff.hasAny ? (
                                    <span className="font-bold text-slate-900">
                                      {eff.total} <span className="text-[10px] text-amber-700">({eff.letter})</span>
                                    </span>
                                  ) : (
                                    <span className="text-slate-300">—</span>
                                  )}
                                </td>
                              );
                            })}
                            <td className="p-1.5 border-r border-slate-200 text-center font-mono font-black text-amber-800 bg-amber-50/40">
                              {gpa}
                            </td>
                            <td className="p-1.5 border-r border-slate-200 text-center font-mono bg-indigo-50/30 whitespace-nowrap">
                              {rankEntry && rankEntry.rank > 0 ? (
                                <span className="font-black text-indigo-900">
                                  #{rankEntry.rank}
                                  {rankEntry.stats.aPlusCount > 0 && (
                                    <span className="block text-[9px] font-bold text-emerald-800">
                                      ({rankEntry.stats.aPlusCount} A+)
                                    </span>
                                  )}
                                </span>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                            <td className="p-1.5 text-center text-[10px] font-bold">
                              {gpaNum >= 2.0 ? (
                                <span className="text-emerald-700">{t('አልፏል', 'Passed')}</span>
                              ) : gpaNum > 0 ? (
                                <span className="text-rose-600">{t('ማስጠንቀቂያ', 'Warning')}</span>
                              ) : (
                                <span className="text-slate-400">{t('ውጤት የለም', 'No Grades')}</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="text-[10px] text-slate-500 italic">
                  {t(
                    'ማሳሰቢያ፦ የውጤት ደረጃ (Rank) የሚሰጠው በGPA ሲሆን፣ GPA እኩል (ለምሳሌ 4.00) ሲሆን አብዛኛውን A+ ያመጣ ተማሪ ቅድሚያ ደረጃ ያገኛል።',
                    'Note: Academic rank is ordered by GPA; ties (such as 4.00) are broken by higher count of A+ course grades.'
                  )}
                </p>

                {/* Signatures & Seal Verification */}
                <div className="pt-6 border-t-2 border-slate-900 grid grid-cols-3 gap-6 text-xs text-slate-800 avoid-break">
                  {/* Super Admin */}
                  <div className="border border-slate-200 p-3 rounded-xl bg-white space-y-2">
                    <span className="text-[10px] font-bold text-slate-500 block uppercase">{t('1. ዋና አድሚን (Super Admin)', '1. Super Admin')}</span>
                    <div className="h-10 border-b border-dashed border-slate-300 flex items-end">
                      <span className="font-bold text-slate-900">{t('ዋና አስተዳዳሪ', 'Chief Administrator')}</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>{t('ፊርማ: ✓ ተረጋግጧል', 'Signature: ✓ Verified')}</span>
                      <span>{t('ቀን:', 'Date:')} ___________</span>
                    </div>
                  </div>

                  {/* Dean */}
                  <div className="border border-slate-200 p-3 rounded-xl bg-white space-y-2">
                    <span className="text-[10px] font-bold text-slate-500 block uppercase">{t('2. ዋና ዲን (Academic Dean)', '2. Academic Dean')}</span>
                    <div className="h-10 border-b border-dashed border-slate-300 flex items-end justify-between">
                      <span className="font-bold text-slate-900">{officialConfig?.deanName || 'መ/ር ገላቲያ ድስታ'}</span>
                      {officialConfig?.showDeanSignature && officialConfig.deanSignatureImage && (
                        <img src={officialConfig.deanSignatureImage} alt={t('ዲን ፊርማ', 'Dean Signature')} className="h-8 w-auto object-contain" />
                      )}
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>{t('ፊርማ:', 'Signature:')} {officialConfig?.showDeanSignature && officialConfig.deanSignatureImage ? t('✓ ተረጋግጧል', '✓ Verified') : '_______________'}</span>
                      <span>{t('ቀን:', 'Date:')} ___________</span>
                    </div>
                  </div>

                  {/* Registrar Seal */}
                  <div className="border border-slate-200 p-3 rounded-xl bg-white space-y-2 relative">
                    <span className="text-[10px] font-bold text-slate-500 block uppercase">{t('3. የሬጅስትራር ጽ/ቤት ማኅተም', '3. Registrar Office Seal')}</span>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-900 block text-xs">{officialConfig?.registrarName || 'መ/ር አስራት አማኑኤል'}</span>
                        <span className="text-[10px] text-slate-500">{t('የሬጅስትራር ኃላፊ', 'Head of Registrar')}</span>
                      </div>
                      {/* Stamp: enlarged, clean, no circle border */}
                      {officialConfig?.showStamp !== false && (
                        <div className="w-20 h-20 flex items-center justify-center opacity-95">
                          <img
                            src={
                              officialConfig?.useChurchLogoAsStamp
                                ? churchLogo || CHURCH_LOGO
                                : officialConfig?.stampImage || churchLogo || CHURCH_LOGO
                            }
                            alt={t('ማኅተም', 'Official Seal')}
                            className="w-full h-full object-contain select-none"
                          />
                        </div>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      <span>{t('ቀን:', 'Date:')} _______________</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          </div>
        </div>
      </div>
    </div>
  );
};
