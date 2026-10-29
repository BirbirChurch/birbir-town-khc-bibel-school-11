import React, { useState } from 'react';
import {
  X,
  Printer,
  FileText,
  CheckCircle2,
  Calendar,
  BookOpen,
  Award,
  ShieldCheck,
  FileSpreadsheet,
  Download,
  Loader2
} from 'lucide-react';
import { Course, GradeBreakdown, OfficialSignaturesConfig, Student } from '../types.ts';
import {
  getCourseAssessmentItems,
  getCriterionScore,
  getEffectiveGradeValues,
  getGradeKey,
  resolveGradeBreakdown
} from '../utils/gradeCalculations.ts';
import { CHURCH_LOGO } from '../assets/logo.ts';
import { exportCourseGradesToExcel } from '../utils/excelUtils.ts';
import { downloadElementAsPdf, printElementDirectly } from '../utils/pdfExport.ts';

interface CourseGradeReportPdfModalProps {
  course: Course;
  students: Student[];
  grades: Record<string, GradeBreakdown>;
  currentYear: string;
  currentSemester: string;
  churchLogo?: string;
  officialConfig?: OfficialSignaturesConfig;
  onClose: () => void;
  autoDownload?: boolean;
}

export const CourseGradeReportPdfModal: React.FC<CourseGradeReportPdfModalProps> = ({
  course,
  students,
  grades,
  currentYear,
  currentSemester,
  churchLogo,
  officialConfig,
  onClose,
  autoDownload
}) => {
  const enrolled = students.filter((s) => s.program === course.program);
  const criteria = getCourseAssessmentItems(course);
  const totalWeight = criteria.reduce((sum, it) => sum + (Number(it.max) || 0), 0);

  const [selectedSemester, setSelectedSemester] = useState<string>(currentSemester || 'ALL');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isBwMode, setIsBwMode] = useState(false);

  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    try {
      const filename = `Course_Report_${course.code || course.name}_${currentYear}_Sem${selectedSemester}.pdf`;
      await downloadElementAsPdf('printable-course-grade-report', filename);
    } finally {
      setIsExportingPdf(false);
    }
  };

  React.useEffect(() => {
    if (autoDownload) {
      const timer = setTimeout(() => {
        handleDownloadPdf();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [autoDownload]);

  const handlePrint = () => {
    printElementDirectly('printable-course-grade-report');
  };

  const handleExportExcel = () => {
    exportCourseGradesToExcel(course, students, grades, currentYear, selectedSemester);
  };

  let effectiveGrades = { ...grades };
  try {
    const stored = localStorage.getItem('bk_grades');
    if (stored) {
      const parsed = JSON.parse(stored);
      effectiveGrades = { ...parsed, ...grades };
    }
  } catch (_) {}

  const targetYear = course.academicYear || currentYear;
  const targetSem = course.semester || selectedSemester || currentSemester;

  // Grade statistics using robust resolver so grades never come out empty
  let totalScoreSum = 0;
  let gradedCount = 0;
  const gradeDistribution: Record<string, number> = {
    'A+': 0, 'A': 0, 'A-': 0,
    'B+': 0, 'B': 0, 'B-': 0,
    'C+': 0, 'C': 0, 'C-': 0,
    'D+': 0, 'D': 0, 'D-': 0,
    'F': 0
  };

  enrolled.forEach((s) => {
    const g = resolveGradeBreakdown(effectiveGrades, s.uid, course.id, targetYear, targetSem, s.id);
    const eff = getEffectiveGradeValues(g, criteria);
    if (eff.hasAny) {
      totalScoreSum += eff.total;
      gradedCount++;
      if (gradeDistribution[eff.letter] !== undefined) {
        gradeDistribution[eff.letter]++;
      } else {
        // Fallback for custom or unmapped letters
        gradeDistribution[eff.letter] = (gradeDistribution[eff.letter] || 0) + 1;
      }
    }
  });

  const classAverage = gradedCount > 0 ? (totalScoreSum / gradedCount).toFixed(1) : '0.0';
  const passCount = gradedCount - (gradeDistribution['F'] || 0);
  const passRate = gradedCount > 0 ? ((passCount / gradedCount) * 100).toFixed(0) : '0';

  const logoSrc = churchLogo || CHURCH_LOGO;

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full flex flex-col overflow-hidden border border-slate-300 my-auto">
        {/* Modal Toolbar (hidden when printed) */}
        <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-900 text-white px-6 py-4 flex flex-wrap justify-between items-center gap-3 no-print border-b border-emerald-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-700/60 rounded-xl text-amber-300">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white">
                የኮርስ ይፋዊ የውጤት ሪፖርት ማጠቃለያ ሰነድ (Course Grade Report)
              </h3>
              <p className="text-xs text-emerald-200">
                {course.name} ({course.program}) | መምህር: {course.teacher}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-emerald-900/60 px-2.5 py-1 rounded-xl border border-emerald-700/50">
              <span className="text-xs text-emerald-200 font-bold">ሴሚስተር:</span>
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="bg-emerald-950 text-white text-xs px-2 py-1 rounded-lg border border-emerald-700 font-bold cursor-pointer"
              >
                <option value="ALL">ሁሉም ሴሚስተሮች (All Semesters)</option>
                <option value="1">1ኛ ሴሚስተር</option>
                <option value="2">2ኛ ሴሚስተር</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => setIsBwMode(!isBwMode)}
              className={`text-xs px-3 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                isBwMode
                  ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-sm'
                  : 'bg-emerald-950 text-emerald-200 border-emerald-700 hover:bg-emerald-900'
              }`}
              title="ለቢሮ ፕሪንተር የሚሆን የጥቁርና ነጭ (Ink-Saver) የፕሪንት አማራጭን ያብሩ/ያጥፉ"
            >
              <Printer className="w-4 h-4" />
              <span>{isBwMode ? '🖨️ ጥቁርና ነጭ (B&W ON)' : '🌈 በቀለም (Color View)'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3.5 py-2 rounded-xl font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              title="ይፋዊውን የኮርስ ውጤት ሰነድ በፒዲኤፍ (.pdf) በቀጥታ አውርድ"
            >
              {isExportingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Download className="w-4 h-4 text-white" />
              )}
              <span>{isExportingPdf ? 'ፒዲኤፍ እየተዘጋጀ...' : 'PDF አውርድ (.pdf)'}</span>
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs px-3.5 py-2 rounded-xl font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              title="ውጤቱን በማይክሮሶፍት ኤክሴል ፋይል አውርድ"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
              <span>ኤክሴል (.xlsx)</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3.5 py-2 rounded-xl font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>አትም (Print)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-300 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
              title="ዝጋ"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body (A4 Multi-Page Formatted) */}
        <div className="p-3 sm:p-6 bg-slate-100/60 overflow-x-auto max-h-[82vh] overflow-y-auto print:max-h-none print:overflow-visible print:p-0">
          <div id="printable-course-grade-report" className="space-y-8 mx-auto max-w-4xl">
            {/* Determine if student count requires 2 pages (20 students per page) */}
            {(() => {
              const isMultiPage = enrolled.length > 18;
              const page1Students = isMultiPage ? enrolled.slice(0, 20) : enrolled;
              const page2Students = isMultiPage ? enrolled.slice(20) : [];

              const renderStudentTable = (studentList: Student[], startIndex: number) => (
                <div className="border border-slate-300 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-[10px] uppercase font-bold text-slate-800 border-b border-slate-300">
                      <tr>
                        <th className="p-2 border-r border-slate-300 text-center w-8 whitespace-nowrap">ተ.ቁ</th>
                        <th className="p-2 border-r border-slate-300 w-28 whitespace-nowrap">መለያ ቁጥር (ID)</th>
                        <th className="p-2 border-r border-slate-300 whitespace-nowrap min-w-[150px]">የተማሪ ሙሉ ስም</th>
                        <th className="p-2 border-r border-slate-300 text-center w-12 whitespace-nowrap">ጾታ</th>
                        {criteria.map((c) => (
                          <th key={c.id} className="p-2 border-r border-slate-300 text-center min-w-[55px]">
                            <span className="block truncate">{c.label}</span>
                            <span className="text-[9px] font-mono font-black">({c.max}%)</span>
                          </th>
                        ))}
                        <th className="p-2 border-r border-slate-300 text-center bg-emerald-100/70 font-black text-emerald-950 w-20">
                          ድምር ({totalWeight}%)
                        </th>
                        <th className="p-2 border-r border-slate-300 text-center bg-amber-100/70 font-black text-amber-950 w-14">
                          ደረጃ
                        </th>
                        <th className="p-2 border-r border-slate-300 text-center font-mono w-14">ነጥብ</th>
                        <th className="p-2 text-center w-24">አስተያየት</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-800">
                      {studentList.map((student, idx) => {
                        const g = resolveGradeBreakdown(effectiveGrades, student.uid, course.id, targetYear, targetSem, student.id);
                        const eff = getEffectiveGradeValues(g, criteria);

                        return (
                          <tr key={student.uid} className="hover:bg-slate-50 transition-colors">
                            <td className="p-2 border-r border-slate-200 text-center font-mono text-slate-500">
                              {startIndex + idx + 1}
                            </td>
                            <td className="p-2 border-r border-slate-200 font-mono font-bold text-slate-900 whitespace-nowrap">
                              {student.id}
                            </td>
                            <td className="p-2 border-r border-slate-200 font-bold text-slate-900 whitespace-nowrap student-name">
                              {student.name}
                            </td>
                            <td className="p-2 border-r border-slate-200 text-center text-slate-600">
                              {student.gender || '—'}
                            </td>

                            {criteria.map((c, cIdx) => {
                              const score = getCriterionScore(g, c.id, cIdx);
                              return (
                                <td key={c.id} className="p-2 border-r border-slate-200 text-center font-mono font-bold">
                                  {score > 0 ? score : eff.hasAny ? '0' : '—'}
                                </td>
                              );
                            })}

                            <td className="p-2 border-r border-slate-200 text-center font-mono font-black text-emerald-900 bg-emerald-50/30">
                              {eff.hasAny ? eff.total : '—'}
                            </td>
                            <td className="p-2 border-r border-slate-200 text-center font-black text-amber-800 bg-amber-50/30">
                              {eff.hasAny ? eff.letter : '—'}
                            </td>
                            <td className="p-2 border-r border-slate-200 text-center font-mono font-bold text-slate-700">
                              {eff.hasAny ? eff.points.toFixed(2) : '—'}
                            </td>
                            <td className="p-2 text-center text-[11px] font-medium text-slate-600">
                              {eff.hasAny
                                ? eff.points >= 2.0
                                  ? 'አልፏል (Pass)'
                                  : 'ደካማ/ወድቋል'
                                : 'ውጤት አልገባም'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );

              return (
                <>
                  {/* PAGE 1 BLOCK */}
                  <div
                    className={`pdf-page-block p-6 sm:p-8 text-slate-900 bg-white a4-portrait-document official-certificate-border shadow-md mx-auto space-y-4 ${
                      isBwMode ? 'bw-mode-active' : ''
                    }`}
                  >
                    {/* Official Letterhead Header */}
                    <div className="border-b-2 border-slate-900 pb-3 relative">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <img
                            src={logoSrc}
                            alt="የብርብር ከተማ ቃለ ሕይወት ቤተ ክርስቲያን"
                            className={`w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-xl p-1 border border-slate-300 shadow-2xs ${
                              isBwMode ? 'filter grayscale contrast-125' : ''
                            }`}
                          />
                          <div>
                            <h1 className="text-base sm:text-xl font-black text-slate-900 leading-tight">
                              የብርብር ከተማ ቃለ ሕይወት ቤተ ክርስቲያን
                            </h1>
                            <h2 className="text-xs sm:text-sm font-bold text-emerald-900">
                              መጽሐፍ ቅዱስ ትምህርት ቤት (Bible Theological School)
                            </h2>
                            <p className="text-[11px] text-slate-600 font-medium">
                              የአካዳሚክ ዲን እና ሬጅስትራር ጽሕፈት ቤት
                            </p>
                          </div>
                        </div>

                        <div className="text-right text-[11px] text-slate-600 border-l border-slate-200 pl-4 space-y-0.5">
                          <p>
                            <span className="font-bold">የትምህርት ዘመን፦</span> {currentYear} ዓ.ም
                          </p>
                          <p>
                            <span className="font-bold">ሴሚስተር፦</span>{' '}
                            {selectedSemester === 'ALL' ? 'ሁሉም ሴሚስተሮች' : `${selectedSemester}ኛ ሴሚስተር`}
                          </p>
                          <p className="text-emerald-800 font-bold">
                            🇪🇹 የኢትዮጵያ ዘመን አቆጣጠር
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-200 text-center">
                        <h3 className="text-sm sm:text-base font-black tracking-wide uppercase text-slate-900">
                          ይፋዊ የኮርስ ውጤት ሪፖርት ማጠቃለያ ሰነድ (Official Course Grade Sheet) {isMultiPage ? '— ገጽ 1' : ''}
                        </h3>
                      </div>
                    </div>

                    {/* Course & Instructor Metadata Table */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 border border-slate-200 p-3 rounded-2xl text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold block">የትምህርት ዓይነት (Course):</span>
                        <strong className="text-slate-900">
                          {course.code && <span className="text-indigo-800 font-mono mr-1">[{course.code}]</span>}
                          {course.name}
                        </strong>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-500 font-bold block">ፕሮግራም (Program):</span>
                        <strong className="text-emerald-800">{course.program}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold block">አስተማሪ / መምህር (Instructor):</span>
                        <strong className="text-slate-900">{course.teacher}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold block">ክሬዲት ሰዓት (Credits):</span>
                        <strong className="text-slate-900">{course.credits} Cr.Hr</strong>
                      </div>
                    </div>

                    {/* Criteria Breakdown Legend */}
                    <div className="bg-emerald-50/50 border border-emerald-200 p-2 rounded-xl text-[11px] text-slate-700 flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold text-emerald-950">የውጤት መመዘኛዎች መስፈርት፦</span>
                      <div className="flex flex-wrap items-center gap-2 font-mono">
                        {criteria.map((it) => (
                          <span
                            key={it.id}
                            className="bg-white border border-emerald-300 px-2 py-0.5 rounded-lg text-emerald-900 font-bold text-[10px]"
                          >
                            {it.label}: <strong className="text-slate-900">{it.max}%</strong>
                          </span>
                        ))}
                        <span className="bg-emerald-700 text-white px-2 py-0.5 rounded-lg font-black text-[10px]">
                          ድምር: {totalWeight}%
                        </span>
                      </div>
                    </div>

                    {/* Student Grades Table Page 1 */}
                    {renderStudentTable(page1Students, 0)}

                    {/* Single Page Stats & Signatures if <= 18 students */}
                    {!isMultiPage && (
                      <>
                        {/* Summary Stats */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 border border-slate-200 p-3 rounded-2xl text-xs">
                          <div>
                            <span className="text-[10px] text-slate-500 font-bold block">ተመዝጋቢ ተማሪዎች:</span>
                            <strong className="text-slate-900 text-sm font-mono">{enrolled.length}</strong> ተማሪዎች
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 font-bold block">ውጤት የሞሉ (Graded):</span>
                            <strong className="text-emerald-800 text-sm font-mono">
                              {gradedCount} ({enrolled.length > 0 ? ((gradedCount / enrolled.length) * 100).toFixed(0) : 0}%)
                            </strong>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 font-bold block">የክፍሉ አማካይ ውጤት (Average):</span>
                            <strong className="text-slate-900 text-sm font-mono">{classAverage}%</strong>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 font-bold block">የማለፍ ምጣኔ (Pass Rate):</span>
                            <strong className="text-emerald-800 text-sm font-mono">{passRate}%</strong>
                          </div>
                        </div>

                        {/* Signatures */}
                        <div className="pt-4 border-t-2 border-slate-900 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-800 avoid-break">
                          <div className="border border-slate-200 p-3 rounded-xl space-y-2 bg-white">
                            <span className="text-[10px] font-bold text-slate-500 block uppercase">1. የመምህሩ ስምና ፊርማ</span>
                            <div className="h-8 border-b border-dashed border-slate-300 flex items-end">
                              <span className="font-bold text-slate-900">{course.teacher}</span>
                            </div>
                            <div className="flex justify-between text-[10px] text-slate-500">
                              <span>ፊርማ: _______________</span>
                              <span>ቀን: ___________</span>
                            </div>
                          </div>

                          <div className="border border-slate-200 p-3 rounded-xl space-y-2 bg-white">
                            <span className="text-[10px] font-bold text-slate-500 block uppercase">2. የዋና ዲን ስምና ፊርማ</span>
                            <div className="h-8 border-b border-dashed border-slate-300 flex items-end justify-between">
                              <span className="font-bold text-slate-900 text-xs">{officialConfig?.deanName || 'መ/ር ገላቲያ ድስታ'}</span>
                              {officialConfig?.showDeanSignature && officialConfig.deanSignatureImage && (
                                <img src={officialConfig.deanSignatureImage} alt="ዲን ፊርማ" className="h-7 w-auto object-contain" />
                              )}
                            </div>
                            <div className="flex justify-between text-[10px] text-slate-500">
                              <span>ፊርማ: {officialConfig?.showDeanSignature && officialConfig.deanSignatureImage ? '✓ ተረጋግጧል' : '_______________'}</span>
                              <span>ቀን: ___________</span>
                            </div>
                          </div>

                          <div className="border border-slate-200 p-3 rounded-xl space-y-2 bg-white relative">
                            <span className="text-[10px] font-bold text-slate-500 block uppercase">3. የሬጅስትራር ጽ/ቤት ማኅተም</span>
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="font-bold text-slate-900 block text-xs">{officialConfig?.registrarName || 'መ/ር አስራት አማኑኤል'}</span>
                                <span className="text-[10px] text-slate-500">የሬጅስትራር ኃላፊ</span>
                              </div>
                              {officialConfig?.showStamp !== false && (
                                <div className="w-20 h-20 flex items-center justify-center opacity-95">
                                  <img
                                    src={officialConfig?.useChurchLogoAsStamp ? churchLogo || CHURCH_LOGO : officialConfig?.stampImage || churchLogo || CHURCH_LOGO}
                                    alt="ማኅተም"
                                    className="w-full h-full object-contain select-none"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Page 1 Footer */}
                    <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-500 font-bold">
                      <span>የብርብር ከተማ ቃለ ሕይወት ቤተ ክርስቲያን መጽሐፍ ቅዱስ ትምህርት ቤት</span>
                      <span>{isMultiPage ? 'ገጽ 1 ከ 2 (ቀጣዩ በገጽ 2 ይሰጥ)' : 'ገጽ 1 ከ 1 — ይፋዊ ሰነድ'}</span>
                    </div>
                  </div>

                  {/* PAGE 2 BLOCK (When > 18 students) */}
                  {isMultiPage && (
                    <div
                      className={`pdf-page-block break-before-page p-6 sm:p-8 text-slate-900 bg-white a4-portrait-document official-certificate-border shadow-md mx-auto space-y-4 ${
                        isBwMode ? 'bw-mode-active' : ''
                      }`}
                    >
                      {/* Continuation Header */}
                      <div className="border-b-2 border-slate-900 pb-3 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <img src={logoSrc} alt="ሎጎ" className="w-12 h-12 object-contain" />
                          <div>
                            <h2 className="text-sm sm:text-base font-black text-slate-900">
                              የብርብር ከተማ ቃለ ሕይወት ቤተ ክርስቲያን መጽሐፍ ቅዱስ ትምህርት ቤት
                            </h2>
                            <p className="text-xs font-bold text-emerald-900">
                              ይፋዊ የኮርስ ውጤት ሪፖርት ማጠቃለያ ሰነድ (ማጠቃለያ - ገጽ 2)
                            </p>
                          </div>
                        </div>
                        <div className="text-right text-[10px] text-slate-600 font-bold">
                          <p>ኮርስ፦ {course.name}</p>
                          <p>መምህር፦ {course.teacher}</p>
                        </div>
                      </div>

                      {/* Student Grades Table Page 2 */}
                      {renderStudentTable(page2Students, 20)}

                      {/* Academic Summary Statistics */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 border border-slate-200 p-3 rounded-2xl text-xs">
                        <div>
                          <span className="text-[10px] text-slate-500 font-bold block">ተመዝጋቢ ተማሪዎች:</span>
                          <strong className="text-slate-900 text-sm font-mono">{enrolled.length}</strong> ተማሪዎች
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 font-bold block">ውጤት የሞሉ (Graded):</span>
                          <strong className="text-emerald-800 text-sm font-mono">
                            {gradedCount} ({enrolled.length > 0 ? ((gradedCount / enrolled.length) * 100).toFixed(0) : 0}%)
                          </strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 font-bold block">የክፍሉ አማካይ ውጤት (Average):</span>
                          <strong className="text-slate-900 text-sm font-mono">{classAverage}%</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 font-bold block">የማለፍ ምጣኔ (Pass Rate):</span>
                          <strong className="text-emerald-800 text-sm font-mono">{passRate}%</strong>
                        </div>
                      </div>

                      {/* Grade Distribution Badges */}
                      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-100 rounded-xl text-xs">
                        <span className="font-bold text-slate-700 text-[11px]">የውጤት ክፍፍል (13-Tier Grade Distribution):</span>
                        <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px]">
                          {(['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F'] as const).map((gradeKey) => {
                            const count = gradeDistribution[gradeKey] || 0;
                            return (
                              <span
                                key={gradeKey}
                                className={`px-1.5 py-0.5 rounded border ${
                                  count > 0
                                    ? 'bg-white font-black border-indigo-400 text-indigo-950 shadow-2xs'
                                    : 'bg-slate-50 font-normal border-slate-200 text-slate-400'
                                }`}
                              >
                                {gradeKey}: <strong>{count}</strong>
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      {/* Official Signatures & Seal Section */}
                      <div className="pt-4 border-t-2 border-slate-900 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-800 avoid-break">
                        {/* Instructor Signature */}
                        <div className="border border-slate-200 p-3 rounded-xl space-y-2 bg-white">
                          <span className="text-[10px] font-bold text-slate-500 block uppercase">
                            1. የመምህሩ ስምና ፊርማ (Instructor)
                          </span>
                          <div className="h-8 border-b border-dashed border-slate-300 flex items-end">
                            <span className="font-bold text-slate-900">{course.teacher}</span>
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-500">
                            <span>ፊርማ: _______________</span>
                            <span>ቀን: ___________</span>
                          </div>
                        </div>

                        {/* Academic Dean Signature */}
                        <div className="border border-slate-200 p-3 rounded-xl space-y-2 bg-white">
                          <span className="text-[10px] font-bold text-slate-500 block uppercase">
                            2. የዋና ዲን ስምና ፊርማ (Academic Dean)
                          </span>
                          <div className="h-8 border-b border-dashed border-slate-300 flex items-end justify-between">
                            <span className="font-bold text-slate-900 text-xs">
                              {officialConfig?.deanName || 'መ/ር ገላቲያ ድስታ'}
                            </span>
                            {officialConfig?.showDeanSignature && officialConfig.deanSignatureImage && (
                              <img
                                src={officialConfig.deanSignatureImage}
                                alt="ዲን ፊርማ"
                                className="h-7 w-auto object-contain max-w-[110px]"
                              />
                            )}
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-500">
                            <span>ፊርማ: {officialConfig?.showDeanSignature && officialConfig.deanSignatureImage ? '✓ ተረጋግጧል' : '_______________'}</span>
                            <span>ቀን: ___________</span>
                          </div>
                        </div>

                        {/* Registrar Office & Church Stamp */}
                        <div className="border border-slate-200 p-3 rounded-xl space-y-1.5 bg-white relative">
                          <span className="text-[10px] font-bold text-slate-500 block uppercase">
                            3. የሬጅስትራር ጽ/ቤት ማኅተም (Registrar Seal)
                          </span>
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-bold text-slate-900 block text-xs">
                                {officialConfig?.registrarName || 'መ/ር አስራት አማኑኤል'}
                              </span>
                              <span className="text-[10px] text-slate-500">የሬጅስትራር ኃላፊ</span>
                              {officialConfig?.showRegistrarSignature && officialConfig.registrarSignatureImage && (
                                <img
                                  src={officialConfig.registrarSignatureImage}
                                  alt="ሬጅስትራር ፊርማ"
                                  className="h-7 w-auto object-contain mt-0.5"
                                />
                              )}
                            </div>
                            {officialConfig?.showStamp !== false && (
                              <div className="w-20 h-20 flex items-center justify-center opacity-95">
                                <img
                                  src={
                                    officialConfig?.useChurchLogoAsStamp
                                      ? churchLogo || CHURCH_LOGO
                                      : officialConfig?.stampImage || churchLogo || CHURCH_LOGO
                                  }
                                  alt="ማኅተም"
                                  className="w-full h-full object-contain select-none"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Page 2 Footer */}
                      <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-500 font-bold">
                        <span>ይፋዊ የትምህርት ቤት ሰነድ (Official School Record)</span>
                        <span>ገጽ 2 ከ 2 — ማጠቃለያና ማኅተም</span>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
    </div>
  </div>
);
};
