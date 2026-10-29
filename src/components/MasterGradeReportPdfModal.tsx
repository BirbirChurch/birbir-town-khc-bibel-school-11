import React, { useState } from 'react';
import { X, Printer, FileSpreadsheet, Download, Loader2 } from 'lucide-react';
import { Course, GradeBreakdown, OfficialSignaturesConfig, ProgramType, Student } from '../types.ts';
import { calculateStudentGPA, getCourseAssessmentItems, getEffectiveGradeValues, resolveGradeBreakdown } from '../utils/gradeCalculations.ts';
import { CHURCH_LOGO } from '../assets/logo.ts';
import { exportMasterSemesterGradeSheetToExcel } from '../utils/excelUtils.ts';
import { downloadElementAsPdf, printElementDirectly } from '../utils/pdfExport.ts';

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
  const [selectedProgram, setSelectedProgram] = useState<'ALL' | ProgramType>(initialProgram);
  const [selectedSemester, setSelectedSemester] = useState<string>(currentSemester || 'ALL');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isBwMode, setIsBwMode] = useState(false);

  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    try {
      const progLabel = selectedProgram === 'ALL' ? 'All_Programs' : selectedProgram;
      const filename = `Master_Grade_Sheet_${progLabel}_${currentYear}_Sem${selectedSemester}.pdf`;
      await downloadElementAsPdf('printable-master-grade-report', filename, { orientation: 'landscape' });
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handlePrint = () => {
    printElementDirectly('printable-master-grade-report', { orientation: 'landscape' });
  };

  const programs = selectedProgram === 'ALL' ? ['Diploma' as const, 'Degree' as const] : [selectedProgram as ProgramType];
  const logoSrc = churchLogo || CHURCH_LOGO;

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-6xl w-full flex flex-col overflow-hidden border border-slate-300 my-auto">
        {/* Modal Toolbar (hidden when printed) */}
        <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-900 text-white px-6 py-4 flex flex-wrap justify-between items-center gap-3 no-print border-b border-emerald-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-700/60 rounded-xl text-amber-300">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white">
                የተማሪዎች አጠቃላይ የሴሚስተር ውጤት ዝርዝር ሰነድ (Master Grade Sheet - PDF)
              </h3>
              <p className="text-xs text-emerald-200">
                የትምህርት ዘመን {currentYear} ዓ.ም ({selectedSemester === 'ALL' ? 'ሁሉም ሴሚስተሮች' : `${selectedSemester}ኛ ሴሚስተር`})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-emerald-900/60 px-2 py-1 rounded-xl border border-emerald-700/50">
              <span className="text-xs text-emerald-200">ፕሮግራም:</span>
              <select
                value={selectedProgram}
                onChange={(e) => setSelectedProgram(e.target.value as any)}
                className="bg-emerald-950 text-white text-xs px-2 py-1 rounded-lg border border-emerald-700 cursor-pointer font-bold"
              >
                <option value="ALL">ሁሉንም ፕሮግራሞች (All)</option>
                <option value="Diploma">ዲፕሎማ ብቻ (Diploma)</option>
                <option value="Degree">ድግሪ ብቻ (Degree)</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-emerald-900/60 px-2 py-1 rounded-xl border border-emerald-700/50">
              <span className="text-xs text-emerald-200">ሴሚስተር:</span>
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="bg-emerald-950 text-white text-xs px-2 py-1 rounded-lg border border-emerald-700 cursor-pointer font-bold"
              >
                <option value="ALL">ሁሉም ሴሚስተሮች (All)</option>
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
              title="አጠቃላይ የሴሚስተር ውጤቱን በፒዲኤፍ (.pdf) በቀጥታ አውርድ"
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
              onClick={() => exportMasterSemesterGradeSheetToExcel(students, courses, grades, currentYear, selectedSemester, selectedProgram)}
              className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs px-3.5 py-2 rounded-xl font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              title="አጠቃላይ ውጤቱን በማይክሮሶፍት ኤክሴል ፋይል አውርድ"
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

        {/* Printable Document Body (A4 Landscape Optimized) */}
        <div className="p-3 sm:p-6 bg-slate-100/60 overflow-x-auto max-h-[82vh] overflow-y-auto print:max-h-none print:overflow-visible print:p-0">
          <div
            id="printable-master-grade-report"
            className={`p-6 sm:p-8 space-y-8 bg-white a4-landscape-document official-certificate-border shadow-md mx-auto ${
              isBwMode ? 'bw-mode-active' : ''
            }`}
          >
            {programs.map((prog) => {
              const progStudents = students.filter((s) => s.program === prog);
              const progCourses = courses.filter((c) => c.program === prog);

              return (
                <div key={prog} className="space-y-4 avoid-break mb-8 last:mb-0">
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
                        የብርብር ከተማ ቃለ ሕይወት ቤተ ክርስቲያን መጽሐፍ ቅዱስ ትምህርት ቤት
                      </h2>
                      <h3 className="text-sm font-bold text-emerald-900">
                        የተማሪዎች ይፋዊ አጠቃላይ የሴሚስተር ውጤት ማጠቃለያ ሰነድ (Master Grade Sheet)
                      </h3>
                      <p className="text-xs text-slate-600">
                        ፕሮግራም: <strong className="text-slate-900">{prog === 'Diploma' ? 'የመጽሐፍ ቅዱስ ዲፕሎማ' : 'የሥነ-መለኮት ድግሪ'}</strong> | የትምህርት ዘመን: <strong className="text-slate-900">{currentYear} ዓ.ም</strong> ({selectedSemester === 'ALL' ? 'ሁሉም ሴሚስተሮች' : `${selectedSemester}ኛ ሴሚስተር`})
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    <p>ቀን: {new Date().toLocaleDateString('en-GB')}</p>
                    <p>ጠቅላላ ተማሪዎች: {progStudents.length}</p>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto border border-slate-300 rounded-xl">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead className="bg-slate-100 uppercase font-bold text-slate-800 border-b border-slate-300">
                      <tr>
                        <th className="p-2 border-r border-slate-300 text-center w-7 whitespace-nowrap">ተ.ቁ</th>
                        <th className="p-2 border-r border-slate-300 w-24 whitespace-nowrap">ID</th>
                        <th className="p-2 border-r border-slate-300 whitespace-nowrap min-w-[140px]">የተማሪ ስም</th>
                        <th className="p-2 border-r border-slate-300 text-center w-10 whitespace-nowrap">ጾታ</th>
                        <th className="p-2 border-r border-slate-300 text-center w-16 whitespace-nowrap">ደረጃ</th>
                        {progCourses.map((c) => (
                          <th key={c.id} className="p-2 border-r border-slate-300 text-center min-w-[70px]">
                            <span className="block truncate max-w-[85px]" title={c.name}>{c.name}</span>
                            <span className="text-[9px] font-mono font-bold text-slate-500">({c.credits}cr)</span>
                          </th>
                        ))}
                        <th className="p-2 border-r border-slate-300 text-center font-bold bg-amber-50 text-amber-950 w-16 whitespace-nowrap">
                          GPA
                        </th>
                        <th className="p-2 text-center w-24 whitespace-nowrap">አቋም</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {progStudents.map((student, idx) => {
                        let effectiveGrades = { ...grades };
                        try {
                          const stored = localStorage.getItem('bk_grades');
                          if (stored) {
                            effectiveGrades = { ...JSON.parse(stored), ...grades };
                          }
                        } catch (_) {}

                        const gpa = calculateStudentGPA(student, courses, effectiveGrades, currentYear, selectedSemester);
                        const gpaNum = parseFloat(gpa);

                        return (
                          <tr key={student.uid} className="hover:bg-slate-50">
                            <td className="p-1.5 border-r border-slate-200 text-center font-mono text-slate-500">
                              {idx + 1}
                            </td>
                            <td className="p-1.5 border-r border-slate-200 font-mono font-bold text-slate-900 whitespace-nowrap">
                              {student.id}
                            </td>
                            <td className="p-1.5 border-r border-slate-200 font-bold text-slate-900 whitespace-nowrap student-name">
                              {student.name}
                            </td>
                            <td className="p-1.5 border-r border-slate-200 text-center text-slate-600">
                              {student.gender || '—'}
                            </td>
                            <td className="p-1.5 border-r border-slate-200 text-center text-slate-700">
                              {student.currentStudyYear || 1}ኛ ዓመት
                            </td>
                            {progCourses.map((c) => {
                              const targetYear = c.academicYear || currentYear;
                              const targetSem = c.semester || selectedSemester || currentSemester;
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
                            <td className="p-1.5 text-center text-[10px] font-bold">
                              {gpaNum >= 2.0 ? (
                                <span className="text-emerald-700">አልፏል</span>
                              ) : gpaNum > 0 ? (
                                <span className="text-rose-600">ማስጠንቀቂያ</span>
                              ) : (
                                <span className="text-slate-400">ውጤት የለም</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Signatures & Seal Verification */}
                <div className="pt-6 border-t-2 border-slate-900 grid grid-cols-3 gap-6 text-xs text-slate-800">
                  {/* Super Admin */}
                  <div className="border border-slate-200 p-3 rounded-xl bg-white space-y-2">
                    <span className="text-[10px] font-bold text-slate-500 block uppercase">1. ዋና አድሚን (Super Admin)</span>
                    <div className="h-10 border-b border-dashed border-slate-300 flex items-end">
                      <span className="font-bold text-slate-900">ዋና አስተዳዳሪ</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>ፊርማ: ✓ ተረጋግጧል</span>
                      <span>ቀን: ___________</span>
                    </div>
                  </div>

                  {/* Dean */}
                  <div className="border border-slate-200 p-3 rounded-xl bg-white space-y-2">
                    <span className="text-[10px] font-bold text-slate-500 block uppercase">2. ዋና ዲን (Academic Dean)</span>
                    <div className="h-10 border-b border-dashed border-slate-300 flex items-end justify-between">
                      <span className="font-bold text-slate-900">{officialConfig?.deanName || 'መ/ር ገላቲያ ድስታ'}</span>
                      {officialConfig?.showDeanSignature && officialConfig.deanSignatureImage && (
                        <img src={officialConfig.deanSignatureImage} alt="ዲን ፊርማ" className="h-8 w-auto object-contain" />
                      )}
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>ፊርማ: {officialConfig?.showDeanSignature && officialConfig.deanSignatureImage ? '✓ ተረጋግጧል' : '_______________'}</span>
                      <span>ቀን: ___________</span>
                    </div>
                  </div>

                  {/* Registrar Seal */}
                  <div className="border border-slate-200 p-3 rounded-xl bg-white space-y-2 relative">
                    <span className="text-[10px] font-bold text-slate-500 block uppercase">3. የሬጅስትራር ጽ/ቤት ማኅተም</span>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-900 block text-xs">{officialConfig?.registrarName || 'መ/ር አስራት አማኑኤል'}</span>
                        <span className="text-[10px] text-slate-500">የሬጅስትራር ኃላፊ</span>
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
                            alt="ማኅተም"
                            className="w-full h-full object-contain select-none"
                          />
                        </div>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      <span>ቀን: _______________</span>
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
