import React, { useState, useMemo } from 'react';
import { X, Printer, ShieldCheck, Download, Loader2, Lock } from 'lucide-react';
import { Course, GradeBreakdown, OfficialSignaturesConfig, Student } from '../types.ts';
import { calculateGradeDetails, calculateStudentGPA, getCourseAssessmentItems, getEffectiveGradeValues, getGradeKey, resolveGradeBreakdown, is2018CandidateStudent } from '../utils/gradeCalculations.ts';
import { OFFICIAL_GRADING_SCALE } from '../data/initialData.ts';
import { CHURCH_LOGO } from '../assets/logo.ts';
import { downloadElementAsPdf, printElementDirectly } from '../utils/pdfExport.ts';
import { loadHistorical2018Courses } from '../data/curriculumCourses.ts';

interface TranscriptModalProps {
  student: Student;
  courses: Course[];
  grades: Record<string, GradeBreakdown>;
  currentYear: string;
  currentSemester: string;
  onClose: () => void;
  churchLogo?: string;
  officialConfig?: OfficialSignaturesConfig;
  allowPdfPrint?: boolean;
  isStudentViewer?: boolean;
}

export const TranscriptModal: React.FC<TranscriptModalProps> = ({
  student,
  courses,
  grades,
  currentYear,
  currentSemester,
  onClose,
  churchLogo,
  officialConfig,
  allowPdfPrint = true,
  isStudentViewer = false
}) => {
  const isCandidate = is2018CandidateStudent(student);

  const studentCourses = useMemo(() => {
    if (currentYear === '2018') {
      const historical = loadHistorical2018Courses();
      return historical.filter((c) => c.program === 'Diploma' && (c.semester === currentSemester || !c.semester));
    }
    return courses.filter((c) => {
      if (c.program !== student.program) return false;
      if (!isCandidate) {
        if (
          c.academicYear === '2018' ||
          c.id.startsWith('dip_sem1') ||
          c.id.startsWith('dip_sem2') ||
          c.id.startsWith('deg_p')
        ) {
          return false;
        }
      }
      if (c.semester && currentSemester && c.semester !== currentSemester) {
        return false;
      }
      return true;
    });
  }, [courses, student.program, isCandidate, currentYear, currentSemester]);

  const gpa = calculateStudentGPA(student, currentYear === '2018' ? loadHistorical2018Courses() : courses, grades, currentYear, currentSemester);

  let totalCredits = 0;
  let totalGradePoints = 0;
  let gradedCoursesCount = 0;

  const courseRows = studentCourses.map((c, idx) => {
    const g = resolveGradeBreakdown(grades, student.uid, c.id, currentYear, currentSemester, student.id);
    const eff = getEffectiveGradeValues(g, getCourseAssessmentItems(c));
    const isGraded = eff.hasAny;


    totalCredits += c.credits;

    if (isGraded) {
      gradedCoursesCount++;
      totalGradePoints += eff.points * c.credits;
      return {
        index: idx + 1,
        course: c,
        total: eff.total.toString(),
        letter: eff.letter,
        points: eff.points.toFixed(2),
        desc: eff.desc
      };
    }

    return {
      index: idx + 1,
      course: c,
      total: '—',
      letter: '—',
      points: '—',
      desc: 'ውጤት አልገባም'
    };
  });

  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isBwMode, setIsBwMode] = useState(false);

  const handleDownloadPdf = async () => {
    if (!allowPdfPrint) return;
    setIsExportingPdf(true);
    try {
      const filename = `Transcript_${student.id || student.name}_${currentYear}_Sem${currentSemester}.pdf`;
      await downloadElementAsPdf('printable-transcript-content', filename);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handlePrint = () => {
    if (!allowPdfPrint) return;
    printElementDirectly('printable-transcript-content');
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full overflow-hidden my-auto border border-slate-300">
        {/* Modal Toolbar (hidden when printed) */}
        <div className="bg-slate-900 text-white px-6 py-4 flex flex-wrap justify-between items-center gap-3 no-print border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm">የትራንስክሪፕት ቅድመ-እይታ (Transcript Preview)</h3>
            {!allowPdfPrint && (
              <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] px-2 py-0.5 rounded-full font-bold">
                ቅድመ-እይታ ብቻ (ማተም ታግዷል)
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Black & White Ink Saver Print Mode Toggle */}
            <button
              type="button"
              onClick={() => setIsBwMode(!isBwMode)}
              className={`text-xs px-3 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                isBwMode
                  ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-sm'
                  : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
              }`}
              title="ለቢሮ ፕሪንተር የሚሆን የጥቁርና ነጭ (Ink-Saver) የፕሪንት አማራጭን ያብሩ/ያጥፉ"
            >
              <Printer className="w-4 h-4" />
              <span>{isBwMode ? '🖨️ ጥቁርና ነጭ (B&W ON)' : '🌈 በቀለም (Color View)'}</span>
            </button>

            {!allowPdfPrint ? (
              <div
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-950/90 text-rose-300 border border-rose-700/80 text-xs font-bold shadow-xs select-none"
                title="ለተማሪዎች ማተምና ማውረድ አልተፈቀደም (በጽሕፈት ቤት ብቻ ይታተማል)"
              >
                <Lock className="w-4 h-4 text-rose-400" />
                <span>🔒 ፒዲኤፍ ማተም ታግዷል</span>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isExportingPdf}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3.5 py-2 rounded-xl font-bold shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                  title="ትራንስክሪፕቱን በፒዲኤፍ (.pdf) ፋይል በቀጥታ አውርድ"
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
                  onClick={handlePrint}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3.5 py-2 rounded-xl font-bold shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>አትም (Print)</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors text-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Transcript Document (A4 Optimized) */}
        <div className="p-3 sm:p-6 bg-slate-100/60 overflow-x-auto">
          {!allowPdfPrint && (
            <div className="max-w-[210mm] mx-auto mb-3 p-3 bg-rose-50 border-2 border-rose-300 rounded-2xl text-xs text-rose-950 flex items-center gap-2.5 font-bold no-print shadow-xs">
              <Lock className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>
                🔒 ይፋዊ ማሳሰቢያ፦ የትራንስክሪፕት ሰነዱን ማየት ተፈቅዶልዎታል፤ ነገር ግን በፒዲኤፍ ማተም ወይም ማውረድ አልተፈቀደም። ይፋዊ የታተመ ሰነድ ከጽሕፈት ቤት በዋና ማኅተም ታትሞ ይሰጣል።
              </span>
            </div>
          )}

          <div
            className={`p-6 sm:p-8 text-slate-900 bg-white a4-portrait-document official-certificate-border shadow-md mx-auto ${
              isBwMode ? 'bw-mode-active' : ''
            }`}
            id="printable-transcript-content"
          >
            {/* Official Letterhead Header */}
            <div className="text-center border-b-2 border-slate-900 pb-4 mb-5 relative">
              <div className="flex justify-center mb-2.5">
                <img
                  src={churchLogo || CHURCH_LOGO}
                  alt="የብርብር ከተማ ቃለ ሕይወት ቤተ ክርስቲያን"
                  className={`h-20 sm:h-24 w-auto object-contain drop-shadow-xs ${
                    isBwMode ? 'filter grayscale contrast-125' : ''
                  }`}
                />
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-wide text-slate-900 font-serif-ethiopic leading-tight">
                የብርብር ከተማ ቃለ ሕይወት ቤተ ክርስቲያን
              </h1>
              <h2 className="text-base sm:text-lg font-bold text-slate-800 mt-0.5">
                መጽሐፍ ቅዱስ ትምህርት ቤት
              </h2>
              <p className="text-[11px] uppercase font-semibold text-slate-600 mt-0.5 tracking-wider">
                Birbir City Kale Heywet Church Bible Training School
              </p>
              <div className="mt-2.5 inline-block bg-slate-900 text-white text-xs font-black px-4 py-1 rounded-md tracking-wide">
                ይፋዊ የሴሚስተር ትራንስክሪፕት (Official Semester Transcript)
              </div>
              <p className="text-[10px] text-slate-700 font-bold mt-1">
                🇪🇹 የዘመን አቆጣጠር፦ እንደ ኢትዮጵያ ዘመን አቆጣጠር (ዓ.ም)
              </p>
            </div>

            {/* Student & Term Info Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs font-semibold mb-5 border-2 border-slate-300 p-3.5 rounded-xl bg-slate-50/70">
              <div className="space-y-1.5">
                <p>
                  <span className="text-slate-500 font-normal">የተማሪው ሙሉ ስም:</span>{' '}
                  <span className="font-extrabold text-slate-950 text-sm">{student.name}</span>
                </p>
                <p>
                  <span className="text-slate-500 font-normal">የመለያ ኮድ (ID No):</span>{' '}
                  <span className="font-mono font-black text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-300">{student.id}</span>
                </p>
                <p>
                  <span className="text-slate-500 font-normal">ጾታ (Gender):</span>{' '}
                  <span className="font-bold text-slate-900">{student.gender}</span>
                </p>
              </div>

            <div className="space-y-1.5 text-right sm:text-left">
              <p>
                <span className="text-slate-500 font-normal">የትምህርት ፕሮግራም:</span>{' '}
                <span className="font-bold text-slate-950">
                  {student.program === 'Degree' ? 'የድግሪ ፕሮግራም (Degree)' : 'የዲፕሎማ ፕሮግራም (Diploma)'}
                </span>
              </p>
              <p>
                <span className="text-slate-500 font-normal">ደረጃና መንገድ:</span>{' '}
                <span className="font-bold text-slate-900">
                  {student.currentStudyYear ? `${student.currentStudyYear}ኛ ዓመት` : '1ኛ ዓመት'} — {student.program === 'Diploma' ? '2 ዓመት (4 ሴሚስተር)' : student.degreeTrack === '2_YEAR' || student.priorDiploma ? '2 ዓመት (ቀድሞ ዲፕሎማ ያለው)' : '3 ዓመት መደበኛ (5-6 ሴሚስተር)'}
                </span>
              </p>
              <p>
                <span className="text-slate-500 font-normal">የትምህርት ዘመን:</span>{' '}
                <span className="font-bold text-slate-900">{currentYear} ዓ.ም (እንደ ኢትዮጵያ ዘመን አቆጣጠር)</span>
              </p>
              <p>
                <span className="text-slate-500 font-normal">ሴሚስተር:</span>{' '}
                <span className="font-bold text-slate-900">{currentSemester}ኛ ሴሚስተር</span>
              </p>
            </div>
          </div>

          {/* Courses & Grades Table */}
          <table className="w-full text-xs text-left border-collapse border border-slate-400 mb-6">
            <thead className="bg-slate-200 text-slate-900 font-bold uppercase">
              <tr>
                <th className="border border-slate-400 p-2.5 text-center w-12">ተ.ቁ</th>
                <th className="border border-slate-400 p-2.5">የኮርስ ስም (Course Title)</th>
                <th className="border border-slate-400 p-2.5 text-center w-24">ቀን / ሰሌዳ</th>
                <th className="border border-slate-400 p-2.5 text-center w-20">ክሬዲት</th>
                <th className="border border-slate-400 p-2.5 text-center w-20">ውጤት (100%)</th>
                <th className="border border-slate-400 p-2.5 text-center w-20">ፊደል</th>
                <th className="border border-slate-400 p-2.5 text-center w-24">Grade Point</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {courseRows.map((row) => (
                <tr key={row.course.id}>
                  <td className="border border-slate-400 p-2 text-center font-mono">{row.index}</td>
                  <td className="border border-slate-400 p-2 font-bold text-slate-900">{row.course.name}</td>
                  <td className="border border-slate-400 p-2 text-center text-[10px] text-slate-700">{row.course.schedule}</td>
                  <td className="border border-slate-400 p-2 text-center font-mono font-semibold">{row.course.credits}</td>
                  <td className="border border-slate-400 p-2 text-center font-mono font-bold">{row.total}</td>
                  <td className="border border-slate-400 p-2 text-center font-black text-slate-950">{row.letter}</td>
                  <td className="border border-slate-400 p-2 text-center font-mono font-semibold">{row.points}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-bold">
                <td colSpan={3} className="border border-slate-400 p-2.5 text-right font-bold">
                  ጠቅላላ ድምር (Total Credits & Quality Points):
                </td>
                <td className="border border-slate-400 p-2.5 text-center font-mono text-sm">{totalCredits}</td>
                <td className="border border-slate-400 p-2.5 text-center font-mono">-</td>
                <td className="border border-slate-400 p-2.5 text-center">-</td>
                <td className="border border-slate-400 p-2.5 text-center font-mono text-sm">{totalGradePoints.toFixed(2)}</td>
              </tr>
              <tr className={`font-black ${isBwMode ? 'bg-slate-200 text-black' : 'bg-amber-50/80 text-slate-950'}`}>
                <td colSpan={6} className="border border-slate-400 p-3 text-right text-sm">
                  የሴሚስተሩ የውጤት አማካይ (Semester Grade Point Average - GPA):
                </td>
                <td className={`border border-slate-400 p-3 text-center font-mono text-base ${isBwMode ? 'bg-white text-black font-black' : 'text-amber-900 bg-amber-100'}`}>
                  {gradedCoursesCount > 0 ? gpa : '—'}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Grading System Reference Legend */}
          <div className="border border-slate-300 rounded-xl p-3 mb-8 bg-slate-50 text-[10px] text-slate-600">
            <p className="font-bold text-slate-800 mb-1">የትምህርት ውጤት መስፈርት መመሪያ (Approved Grading Scale):</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <span>90% – 100%: <strong>A+ (4.00)</strong> - እጅግ በጣም ጥሩ</span>
              <span>80% – 89%: <strong>A (3.75)</strong> - በጣም ጥሩ</span>
              <span>70% – 79%: <strong>B (3.00)</strong> - ጥሩ</span>
              <span>60% – 69%: <strong>C (2.00)</strong> - አልፏል</span>
              <span>50% – 59%: <strong>D (1.00)</strong> - ዝቅተኛ / ማለፊያ</span>
              <span>ከ 50% በታች: <strong>F (0.00)</strong> - ወድቋል</span>
            </div>
          </div>

          {/* Official Signatures & Stamp */}
          <div className="relative pt-6 border-t-2 border-slate-300 max-w-2xl mx-auto avoid-break">
            {/* Optional Official Stamp inserted if enabled by Dean or Admin */}
            {officialConfig?.showStamp && (
              <div className="absolute left-1/2 -top-4 transform -translate-x-1/2 flex flex-col items-center pointer-events-none opacity-95 z-10">
                <img
                  src={
                    officialConfig.useChurchLogoAsStamp
                      ? churchLogo || CHURCH_LOGO
                      : officialConfig.stampImage || churchLogo || CHURCH_LOGO
                  }
                  alt="ማኅተም"
                  className={`w-32 h-32 sm:w-36 sm:h-36 object-contain drop-shadow-sm select-none ${
                    isBwMode ? 'filter grayscale contrast-125' : ''
                  }`}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-12 text-xs font-semibold">
              {/* Registrar Signature Block */}
              <div className="text-center space-y-2 flex flex-col items-center">
                <p className="text-slate-800 font-bold">
                  {officialConfig?.registrarTitle || 'የሪጅስተራል ስምና ፊርማ (Registrar Signature)'}
                </p>

                <div className="h-14 flex items-end justify-center w-full">
                  {officialConfig?.showRegistrarSignature && officialConfig.registrarSignatureImage ? (
                    <img
                      src={officialConfig.registrarSignatureImage}
                      alt="የሪጅስተራል ፊርማ"
                      className="max-h-14 max-w-full object-contain filter drop-shadow-xs"
                    />
                  ) : (
                    <div className="h-4"></div>
                  )}
                </div>

                <div className="border-b border-slate-900 w-3/4 mx-auto"></div>
                {officialConfig?.showRegistrarSignature && officialConfig.registrarName && (
                  <p className="text-[11px] font-bold text-slate-900">{officialConfig.registrarName}</p>
                )}
                <p className="text-[10px] text-slate-500">ቀን: _________________</p>
              </div>

              {/* Academic Dean Signature Block */}
              <div className="text-center space-y-2 flex flex-col items-center">
                <p className="text-slate-800 font-bold">
                  {officialConfig?.deanTitle || 'የዋና ዲን ስምና ፊርማ (Academic Dean Signature)'}
                </p>

                <div className="h-14 flex items-end justify-center w-full">
                  {officialConfig?.showDeanSignature && officialConfig.deanSignatureImage ? (
                    <img
                      src={officialConfig.deanSignatureImage}
                      alt="የዋና ዲን ፊርማ"
                      className="max-h-14 max-w-full object-contain filter drop-shadow-xs"
                    />
                  ) : (
                    <div className="h-4"></div>
                  )}
                </div>

                <div className="border-b border-slate-900 w-3/4 mx-auto"></div>
                {officialConfig?.showDeanSignature && officialConfig.deanName && (
                  <p className="text-[11px] font-bold text-slate-900">{officialConfig.deanName}</p>
                )}
                <p className="text-[10px] text-slate-500">ቀን: _________________</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);
};
