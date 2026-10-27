import React, { useMemo, useState } from 'react';
import { X, Printer, Download, Award, CheckCircle2, ShieldCheck, GraduationCap, Calendar, BookOpen, Loader2, Lock, AlertCircle } from 'lucide-react';
import { Course, GradeBreakdown, OfficialSignaturesConfig, Student } from '../types.ts';
import { calculateGradeDetails, getCourseAssessmentItems, getEffectiveGradeValues, getGradeKey, resolveGradeBreakdown, is2018CandidateStudent } from '../utils/gradeCalculations.ts';
import { getCurriculumForStudent, loadHistorical2018Courses, getDeletedCourseIdsSet } from '../data/curriculumCourses.ts';
import { CHURCH_LOGO } from '../assets/logo.ts';
import { downloadElementAsPdf, printElementDirectly } from '../utils/pdfExport.ts';
import { OFFICIAL_GRADING_SCALE } from '../data/initialData.ts';

interface GraduationTranscriptModalProps {
  student: Student;
  allCourses: Course[];
  grades: Record<string, GradeBreakdown>;
  currentYear: string;
  currentSemester: string;
  officialConfig?: OfficialSignaturesConfig;
  churchLogo?: string;
  onClose: () => void;
  allowPdfPrint?: boolean;
  isStudentViewer?: boolean;
}

export const GraduationTranscriptModal: React.FC<GraduationTranscriptModalProps> = ({
  student,
  allCourses,
  grades,
  currentYear,
  currentSemester,
  officialConfig,
  churchLogo,
  onClose,
  allowPdfPrint = true,
  isStudentViewer = false
}) => {
  const curriculum = useMemo(() => getCurriculumForStudent(student), [student]);

  // Compute multi-semester grades and cumulative statistics
  // Strictly constrained to the 3 administered semesters (2018 Sem 1, 2018 Sem 2, and 2019 Sem 1)
  // and ONLY showing courses with actually entered grades ("ውጤት የገባውን ብቻ")
  const { semesterRecords, cumulativeCredits, cumulativePoints, cumulativeGPA, graduationHonors } = useMemo(() => {
    let cumCredits = 0;
    let cumPoints = 0;

    const deletedSet = getDeletedCourseIdsSet();
    const historicalCourses = loadHistorical2018Courses().filter((c) => !deletedSet.has(c.id));

    // 1. Term 1: 2018 ዓ.ም — 1ኛ ሴሚስተር
    const term1Curriculum = (curriculum[0]?.courses || []).filter((c) => !deletedSet.has(c.id));
    const term1Historical = historicalCourses.filter(
      (c) => (c.academicYear === '2018' || !c.academicYear) && (c.semester === '1' || !c.semester)
    );
    const term1All = allCourses.filter(
      (c) => !deletedSet.has(c.id) && (c.academicYear === '2018' || c.id.startsWith('dip_sem1')) && (c.semester === '1' || !c.semester)
    );
    const term1CoursesMap = new Map<string, { id: string; code?: string; name: string; credits: number; teacher: string }>();
    term1Curriculum.forEach((c) => term1CoursesMap.set(c.id, { ...c }));
    term1Historical.forEach((c) => {
      term1CoursesMap.set(c.id, {
        id: c.id,
        code: c.code || 'DIP-101',
        name: c.name,
        credits: c.credits,
        teacher: c.teacher
      });
    });
    term1All.forEach((c) => {
      term1CoursesMap.set(c.id, {
        id: c.id,
        code: c.code || 'DIP-101',
        name: c.name,
        credits: c.credits,
        teacher: c.teacher
      });
    });

    // 2. Term 2: 2018 ዓ.ም — 2ኛ ሴሚስተር
    const term2Curriculum = (curriculum[1]?.courses || []).filter((c) => !deletedSet.has(c.id));
    const term2Historical = historicalCourses.filter(
      (c) => c.academicYear === '2018' && c.semester === '2'
    );
    const term2All = allCourses.filter(
      (c) => !deletedSet.has(c.id) && (c.academicYear === '2018' || c.id.startsWith('dip_sem2')) && c.semester === '2'
    );
    const term2CoursesMap = new Map<string, { id: string; code?: string; name: string; credits: number; teacher: string }>();
    term2Curriculum.forEach((c) => term2CoursesMap.set(c.id, { ...c }));
    term2Historical.forEach((c) => {
      term2CoursesMap.set(c.id, {
        id: c.id,
        code: c.code || 'DIP-109',
        name: c.name,
        credits: c.credits,
        teacher: c.teacher
      });
    });
    term2All.forEach((c) => {
      term2CoursesMap.set(c.id, {
        id: c.id,
        code: c.code || 'DIP-109',
        name: c.name,
        credits: c.credits,
        teacher: c.teacher
      });
    });

    // 3. Term 3: 2019 ዓ.ም — 1ኛ ሴሚስተር
    const term3Active = allCourses.filter(
      (c) => !deletedSet.has(c.id) && (c.semester === '1' || !c.semester) && (c.academicYear === '2019' || !c.academicYear)
    );
    const term3Curriculum = (curriculum[2]?.courses || []).filter((c) => !deletedSet.has(c.id));
    const term3CoursesMap = new Map<string, { id: string; code?: string; name: string; credits: number; teacher: string }>();
    term3Curriculum.forEach((c) => term3CoursesMap.set(c.id, { ...c }));
    term3Active.forEach((c) => {
      term3CoursesMap.set(c.id, {
        id: c.id,
        code: c.code || c.id.toUpperCase(),
        name: c.name,
        credits: c.credits,
        teacher: c.teacher
      });
    });

    // ONLY the 3 administered terms as strictly requested:
    // (2018 ዓ.ም 1ኛ ሴሚስተር፣ 2018 ዓ.ም 2ኛ ሴሚስተር እና 2019 ዓ.ም 1ኛ ሴሚስተር)
    const terms = [
      {
        semesterIndex: 1,
        yearNumber: 1,
        semesterInYear: 1,
        academicYear: '2018',
        semesterNumber: '1',
        semesterLabel: '1ኛ ዓመት — 1ኛ ሴሚስተር (2018 ዓ.ም)',
        rawCourses: Array.from(term1CoursesMap.values())
      },
      {
        semesterIndex: 2,
        yearNumber: 1,
        semesterInYear: 2,
        academicYear: '2018',
        semesterNumber: '2',
        semesterLabel: '1ኛ ዓመት — 2ኛ ሴሚስተር (2018 ዓ.ም)',
        rawCourses: Array.from(term2CoursesMap.values())
      },
      {
        semesterIndex: 3,
        yearNumber: 2,
        semesterInYear: 1,
        academicYear: '2019',
        semesterNumber: '1',
        semesterLabel: '2ኛ ዓመት — 1ኛ ሴሚስተር (2019 ዓ.ም)',
        rawCourses: Array.from(term3CoursesMap.values())
      }
    ];

    const records = terms.map((term) => {
      let semCredits = 0;
      let semPoints = 0;

      const courseRows: Array<{
        code: string;
        name: string;
        credits: number;
        teacher: string;
        score: number;
        letter: string;
        points: number;
        desc: string;
      }> = [];

      term.rawCourses.forEach((curCourse) => {
        const matchedCourse = allCourses.find(
          (c) => c.program === student.program && (c.name.trim() === curCourse.name.trim() || c.id === curCourse.id)
        ) || historicalCourses.find(
          (c) => c.name.trim() === curCourse.name.trim() || c.id === curCourse.id
        );

        let score = 0;
        let letter = '';
        let points = 0;
        let desc = '';

        // 1. Resolve grade breakdown
        const breakdown = resolveGradeBreakdown(
          grades,
          student.uid,
          curCourse.id,
          term.academicYear,
          term.semesterNumber,
          student.id
        );

        if (breakdown) {
          const eff = getEffectiveGradeValues(breakdown, matchedCourse ? getCourseAssessmentItems(matchedCourse) : undefined);
          if (eff.hasAny) {
            score = eff.total;
            letter = eff.letter;
            points = eff.points;
            desc = eff.desc;
          }
        }

        // 2. If not found, try matchedCourse id
        if ((score === 0 || !letter) && matchedCourse && matchedCourse.id !== curCourse.id) {
          const mBreakdown = resolveGradeBreakdown(
            grades,
            student.uid,
            matchedCourse.id,
            term.academicYear,
            term.semesterNumber,
            student.id
          );
          if (mBreakdown) {
            const eff = getEffectiveGradeValues(mBreakdown, getCourseAssessmentItems(matchedCourse));
            if (eff.hasAny) {
              score = eff.total;
              letter = eff.letter;
              points = eff.points;
              desc = eff.desc;
            }
          }
        }

        // Strict Requirement: "ውጤት የገባውን ብቻ እንድያሳይ እደረግ"
        // Only include if actual score or valid letter has been entered! No synthetic random generation!
        const hasActualGrade = score > 0 || (Boolean(letter) && letter !== '—' && letter !== '' && desc !== 'አልተሞላም');

        if (hasActualGrade) {
          const courseCredits = curCourse.credits || 3;
          semCredits += courseCredits;
          semPoints += points * courseCredits;

          courseRows.push({
            code: curCourse.code || '—',
            name: curCourse.name,
            credits: courseCredits,
            teacher: curCourse.teacher || matchedCourse?.teacher || '—',
            score,
            letter,
            points,
            desc
          });
        }
      });

      const semGPA = semCredits > 0 ? (semPoints / semCredits).toFixed(2) : '0.00';
      cumCredits += semCredits;
      cumPoints += semPoints;

      return {
        semesterIndex: term.semesterIndex,
        yearNumber: term.yearNumber,
        semesterInYear: term.semesterInYear,
        semesterLabel: term.semesterLabel,
        courses: courseRows,
        semesterCredits: semCredits,
        semesterPoints: semPoints,
        semesterGPA: semGPA
      };
    });

    const cGPA = cumCredits > 0 ? (cumPoints / cumCredits).toFixed(2) : '0.00';
    const numCGPA = Number(cGPA);
    let honors = 'ውጤት በመጠባበቅ ላይ (No Grades)';
    if (cumCredits > 0) {
      if (numCGPA >= 3.8) honors = 'በእጅግ ከፍተኛ ማዕረግ (Great Distinction)';
      else if (numCGPA >= 3.5) honors = 'በከፍተኛ ማዕረግ (Distinction)';
      else if (numCGPA >= 3.25) honors = 'በጥሩ ማዕረግ (Very Good)';
      else if (numCGPA >= 2.0) honors = 'ብቁ (Passed)';
      else honors = 'ዝቅተኛ (Low Standing)';
    }

    return {
      semesterRecords: records,
      cumulativeCredits: cumCredits,
      cumulativePoints: cumPoints,
      cumulativeGPA: cGPA,
      graduationHonors: honors
    };
  }, [curriculum, allCourses, grades, student, currentYear, currentSemester]);

  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isBwMode, setIsBwMode] = useState(false);

  const handleDownloadPdf = async () => {
    if (!allowPdfPrint) return;
    setIsExportingPdf(true);
    try {
      const filename = `Official_Graduation_Transcript_${student.id || student.name}_${student.program}.pdf`;
      await downloadElementAsPdf('printable-graduation-transcript', filename);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handlePrint = () => {
    if (!allowPdfPrint) return;
    printElementDirectly('printable-graduation-transcript');
  };

  const handleDownloadCSV = () => {
    if (!allowPdfPrint) return;
    let csv = `\uFEFFየተማሪ ሙሉ ስም,"${student.name}"\n`;
    csv += `የተማሪ መለያ ቁጥር,"${student.id}"\n`;
    csv += `የትምህርት ፕሮግራም,"${student.program}"\n`;
    csv += `የትምህርት መንገድ,"${student.program === 'Diploma' ? '2 ዓመት (4 ሴሚስተር)' : student.degreeTrack === '2_YEAR' ? '2 ዓመት (ቀድሞ ዲፕሎማ)' : '3 ዓመት መደበኛ'}"\n`;
    csv += `የገቡበት ዓ.ም,"${student.admissionYear || '2018'} ዓ.ም (እንደ ኢትዮጵያ ዘመን አቆጣጠር)"\n`;
    csv += `የተመረቁበት ዓ.ም,"${student.graduationYear || currentYear} ዓ.ም (እንደ ኢትዮጵያ ዘመን አቆጣጠር)"\n`;
    csv += `አጠቃላይ CGPA,${cumulativeGPA}\n`;
    csv += `የምረቃ ማዕረግ,"${graduationHonors}"\n\n`;

    csv += `ሴሚስተር,የኮርስ ኮድ,የኮርስ ስም,ክሬዲት,ውጤት (100%),ፊደል,Grade Points,መምህር\n`;

    semesterRecords.forEach(sem => {
      sem.courses.forEach(c => {
        csv += `"${sem.semesterLabel}","${c.code}","${c.name}",${c.credits},${c.score},"${c.letter}",${c.points.toFixed(2)},"${c.teacher}"\n`;
      });
      csv += `"${sem.semesterLabel} ድምር","",,${sem.semesterCredits},,"GPA: ${sem.semesterGPA}",${sem.semesterPoints.toFixed(2)},\n\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `የተሟላ_የምረቃ_ትራንስክሪፕት_${student.id}_${student.name}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const approvals = student.graduationApprovedBy || { admin: true, dean: true, registrar: true };

  const isGraduatingCandidate = is2018CandidateStudent(student);

  if (!isGraduatingCandidate) {
    return (
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-4 border border-rose-200">
          <div className="w-14 h-14 bg-rose-100 text-rose-700 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h3 className="text-base font-extrabold text-slate-900">ይህ ሰነድ ለተመራቂ ተማሪዎች ብቻ ነው!</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            የተሟላ የምረቃ ትራንስክሪፕት የሚሰጠው ለ2018 ተመራቂ ተማሪዎች ብቻ ነው። ተመራቂ ላልሆኑ (የ1ኛ ዓመት) ተማሪዎች ከዚህ ዓመት ({currentYear} ዓ.ም) ውጪ ያለ ምንም የትራንስክሪፕት ሰነድ የለም።
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer transition-all"
          >
            መስኮቱን ዝጋ (Close)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full overflow-hidden my-auto border border-slate-300">
        {/* Top Control Bar (Hidden when printed) */}
        <div className="bg-slate-900 text-white px-6 py-4 flex flex-wrap justify-between items-center no-print border-b border-slate-800 gap-3">
          <div className="flex items-center gap-2.5">
            <GraduationCap className="w-6 h-6 text-amber-400" />
            <div>
              <h3 className="font-bold text-sm sm:text-base flex items-center gap-2 text-white">
                <span>ይፋዊ የተሟላ የምረቃ ትራንስክሪፕት እና የትምህርት መዝገብ</span>
                <span className="bg-amber-400/20 text-amber-300 text-[10px] px-2 py-0.5 rounded font-mono">
                  🇪🇹 እንደ ኢትዮጵያ ዘመን አቆጣጠር
                </span>
                {!allowPdfPrint && (
                  <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] px-2 py-0.5 rounded-full font-bold ml-1">
                    ቅድመ-እይታ ብቻ (ማተም ታግዷል)
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-300">
                የተማሩበትን ሙሉ ትምህርት (ሁሉንም ሴሚስተሮች) በአንድ ላይ የሚያሳይ ይፋዊ የምረቃ ሰነድ
              </p>
            </div>
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
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3.5 py-2 rounded-xl font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-60"
                  title="ሙሉውን የምረቃ ትራንስክሪፕት በፒዲኤፍ (.pdf) ፋይል በቀጥታ አውርድ"
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
                  onClick={handleDownloadCSV}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-2 rounded-xl font-bold transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-700"
                  title="በCSV ሰነድ አውርድ"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>CSV</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs px-3.5 py-2 rounded-xl font-bold shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-amber-300" />
                  <span>አትም (Print)</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg transition-colors cursor-pointer text-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Official Document (A4 Multi-page Optimized) */}
        <div className="p-3 sm:p-6 bg-slate-100/60 overflow-x-auto">
          {!allowPdfPrint && (
            <div className="max-w-[210mm] mx-auto mb-3 p-3 bg-rose-50 border-2 border-rose-300 rounded-2xl text-xs text-rose-950 flex items-center gap-2.5 font-bold no-print shadow-xs">
              <Lock className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>
                🔒 ይፋዊ ማሳሰቢያ፦ የዚህ የተሟላ የምረቃ ትራንስክሪፕት ሰነድ በፒዲኤፍ ማተም ወይም ማውረድ አልተፈቀደም። ሰነዱን ማየት ብቻ ይችላሉ፤ ይፋዊ የታተመ ሰነድ ከዋናው ጽሕፈት ቤት ይሰጣል።
              </span>
            </div>
          )}
          <div
            className={`p-6 sm:p-10 text-slate-900 bg-white a4-portrait-document official-certificate-border shadow-md mx-auto ${
              isBwMode ? 'bw-mode-active' : ''
            }`}
            id="printable-graduation-transcript"
          >
            {/* Institutional Letterhead */}
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
              <div className="mt-2.5 inline-block bg-slate-900 text-white text-xs sm:text-sm font-black px-4 py-1.5 rounded-lg tracking-wide uppercase">
                ይፋዊ የተሟላ የምረቃ ትራንስክሪፕት እና የትምህርት መዝገብ (Official Consolidated Graduation Transcript)
              </div>
              <p className="text-[10px] text-slate-700 font-bold mt-1">
                🇪🇹 የዘመን አቆጣጠር፦ እንደ ኢትዮጵያ ዘመን አቆጣጠር (ዓ.ም)
              </p>
            </div>

            {/* Student Biodata & Degree Program Information Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-semibold mb-5 border-2 border-slate-300 p-3.5 rounded-xl bg-slate-50/70">
              <div className="space-y-1.5">
                <p className="flex items-center gap-2">
                  <span className="text-slate-500 font-normal w-32">የተማሪው ሙሉ ስም:</span>
                  <span className="font-extrabold text-slate-950 text-sm">{student.name}</span>
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-slate-500 font-normal w-32">የተማሪ መለያ ቁጥር (ID):</span>
                  <span className="font-mono font-black text-slate-900 text-sm bg-white px-2 py-0.5 rounded border border-slate-300">
                    {student.id}
                  </span>
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-slate-500 font-normal w-32">ጾታ (Gender):</span>
                  <span className="font-bold text-slate-900">{student.gender}</span>
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-slate-500 font-normal w-32">የገቡበት ዓ.ም:</span>
                  <span className="font-bold text-slate-900">{student.admissionYear || '2018'} ዓ.ም (እንደ ኢትዮጵያ ዘመን አቆጣጠር)</span>
                </p>
              </div>

              <div className="space-y-1.5">
                <p className="flex items-center gap-2">
                  <span className="text-slate-500 font-normal w-36">የትምህርት ፕሮግራም:</span>
                  <span className="font-black text-slate-950">
                    {student.program === 'Degree' ? 'የድግሪ ፕሮግራም (Bachelor of Theology)' : 'የዲፕሎማ ፕሮግራም (Diploma in Bible Studies)'}
                  </span>
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-slate-500 font-normal w-36">የትምህርት ዝግጅት / መንገድ:</span>
                  <span className="font-bold text-slate-900">
                    {student.program === 'Diploma'
                      ? '2 ዓመት (የተሰጡ 3 ሴሚስተሮች፦ 2018 1ኛና 2ኛ፣ 2019 1ኛ ሴሚስተር)'
                      : student.degreeTrack === '2_YEAR' || student.priorDiploma
                      ? '2 ዓመት (ቀድሞ የመጽሐፍ ቅዱስ ዲፕሎማ ያለው)'
                      : '3 ዓመት መደበኛ'}
                  </span>
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-slate-500 font-normal w-36">የተመረቁበት የትምህርት ዘመን:</span>
                  <span className="font-extrabold text-emerald-950 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                    {student.graduationYear || currentYear} ዓ.ም (እንደ ኢትዮጵያ ዘመን አቆጣጠር)
                  </span>
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-slate-500 font-normal w-36">የምረቃ ሁኔታ:</span>
                  <span className="inline-flex items-center gap-1 font-black text-emerald-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>በይፋ የተመረቀ (Officially Conferred)</span>
                  </span>
                </p>
              </div>
            </div>

            {/* Sequential Multi-Semester Course Grade Tables */}
            <div className="space-y-5 mb-5">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2 pb-2 border-b border-slate-300">
                <BookOpen className="w-4 h-4 text-emerald-800" />
                <span>የተሰጡ 3ቱ ሴሚስተሮችና የገቡ ውጤቶች ዝርዝር ሰሌዳ (2018 1ኛና 2ኛ፣ 2019 1ኛ ሴሚስተር — ውጤት የገባቸው ብቻ)</span>
              </h3>

              {semesterRecords.map((sem) => (
                <div key={sem.semesterIndex} className="border-2 border-slate-300 rounded-xl overflow-hidden shadow-xs avoid-break mb-4">
                  {/* Semester Header Bar */}
                  <div className="bg-slate-800 text-white px-4 py-2 flex flex-wrap justify-between items-center text-xs font-bold">
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-black text-[10px]">
                      {sem.semesterIndex}
                    </span>
                    <span>{sem.semesterLabel}</span>
                  </span>
                  <div className="flex items-center gap-4 text-emerald-300 font-mono">
                    <span>ክሬዲት: <strong>{sem.semesterCredits}</strong></span>
                    <span>ሴሚስተር GPA: <strong>{sem.semesterGPA}</strong></span>
                  </div>
                </div>

                {/* Courses Table */}
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-100 text-slate-800 font-bold uppercase text-[10px] border-b border-slate-300">
                    <tr>
                      <th className="p-2 text-center w-10">ተ.ቁ</th>
                      <th className="p-2 w-20">ኮድ</th>
                      <th className="p-2">የኮርስ ርዕስ (Course Title)</th>
                      <th className="p-2 w-32">የተመደበ መምህር</th>
                      <th className="p-2 text-center w-16">ክሬዲት</th>
                      <th className="p-2 text-center w-20">ውጤት (100%)</th>
                      <th className="p-2 text-center w-16">ደረጃ</th>
                      <th className="p-2 text-center w-20">Grade Point</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {sem.courses.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-4 text-center text-slate-400 italic">
                          በዚህ ሴሚስተር እስካሁን የተመዘገበ ውጤት የለም (ምንም ውጤት አልገባም)
                        </td>
                      </tr>
                    ) : (
                      sem.courses.map((c, cIdx) => (
                        <tr key={c.code + c.name} className="hover:bg-slate-50/60">
                          <td className="p-2 text-center font-mono text-slate-400">{cIdx + 1}</td>
                          <td className="p-2 font-mono font-bold text-slate-700 text-[11px]">{c.code}</td>
                          <td className="p-2 font-bold text-slate-900">{c.name}</td>
                          <td className="p-2 text-[11px] text-slate-600">{c.teacher}</td>
                          <td className="p-2 text-center font-mono font-semibold">{c.credits}</td>
                          <td className="p-2 text-center font-mono font-bold text-slate-950">{c.score}</td>
                          <td className="p-2 text-center font-black text-slate-900">{c.letter}</td>
                          <td className="p-2 text-center font-mono font-bold text-emerald-800">{c.points.toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100/90 font-bold border-t border-slate-300 text-slate-900">
                      <td colSpan={4} className="p-2 text-right">
                        የሴሚስተሩ ጠቅላላ ድምር (Term Total):
                      </td>
                      <td className="p-2 text-center font-mono">{sem.semesterCredits}</td>
                      <td className="p-2 text-center font-mono">—</td>
                      <td className="p-2 text-center font-bold">GPA:</td>
                      <td className="p-2 text-center font-mono font-black text-amber-900 bg-amber-50">
                        {sem.semesterGPA}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ))}
          </div>

          {/* Cumulative Summary Card */}
          <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-emerald-950 text-white rounded-2xl p-5 sm:p-6 shadow-md border-2 border-amber-400/80 mb-6 avoid-break">
            <h4 className="text-xs uppercase tracking-wider font-bold text-amber-300 mb-3 flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              <span>አጠቃላይ የምረቃ ውጤት ማጠቃለያ (Cumulative Graduation Academic Summary)</span>
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-center">
              <div className="p-3 bg-white/10 rounded-xl backdrop-blur-xs border border-white/10">
                <span className="block text-[10px] text-slate-300 uppercase font-bold">ጠቅላላ ክሬዲቶች</span>
                <span className="text-xl sm:text-2xl font-black font-mono text-white mt-1 block">
                  {cumulativeCredits}
                </span>
              </div>

              <div className="p-3 bg-white/10 rounded-xl backdrop-blur-xs border border-white/10">
                <span className="block text-[10px] text-slate-300 uppercase font-bold">ጠቅላላ Quality Points</span>
                <span className="text-xl sm:text-2xl font-black font-mono text-white mt-1 block">
                  {cumulativePoints.toFixed(2)}
                </span>
              </div>

              <div className="p-3 bg-amber-400/20 rounded-xl backdrop-blur-xs border border-amber-400/40">
                <span className="block text-[10px] text-amber-300 uppercase font-bold">አጠቃላይ CGPA</span>
                <span className="text-2xl sm:text-3xl font-black font-mono text-amber-300 mt-1 block">
                  {cumulativeGPA}
                </span>
              </div>

              <div className="p-3 bg-white/10 rounded-xl backdrop-blur-xs border border-white/10">
                <span className="block text-[10px] text-slate-300 uppercase font-bold">የምረቃ ማዕረግ (Standing)</span>
                <span className="text-xs sm:text-sm font-extrabold text-amber-200 mt-1.5 block leading-tight">
                  {graduationHonors}
                </span>
              </div>
            </div>
          </div>

          {/* Grading System Reference Legend */}
          <div className="border border-slate-300 rounded-xl p-3 mb-6 bg-slate-50 text-[10px] text-slate-700 avoid-break">
            <div className="flex items-center justify-between mb-1.5 border-b border-slate-200 pb-1">
              <span className="font-bold text-slate-900">የትምህርት ውጤት መስፈርት ይፋዊ መመሪያ (Official 13-Tier Grading Scale):</span>
              <span className="text-[9px] text-slate-500 font-medium">13ቱም የውጤት ደረጃዎች (ከ A+ እስከ F)</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 lg:grid-cols-13 gap-1.5 text-[9.5px]">
              {OFFICIAL_GRADING_SCALE.map((tier) => (
                <div key={tier.letter} className="bg-white px-1.5 py-1 rounded border border-slate-200 text-center">
                  <span className="font-black text-slate-900 block">{tier.letter}</span>
                  <span className="text-slate-600 font-mono text-[9px] block">{tier.min}–{tier.max}%</span>
                  <span className="text-slate-500 font-bold text-[8.5px] block">{tier.points.toFixed(2)} pts</span>
                </div>
              ))}
            </div>
          </div>

          {/* Official Signatures & Seal Verification Block */}
          {/* As explicitly required by user: მთავር አድሚን፣ ዲን እና ሪጅስተራል */}
          <div className="relative pt-6 border-t-2 border-slate-300 avoid-break">
            {/* Institutional Seal / Stamp */}
            {officialConfig?.showStamp && (
              <div className="absolute left-1/2 -top-6 transform -translate-x-1/2 flex flex-col items-center pointer-events-none opacity-95 z-10">
                <img
                  src={
                    officialConfig.useChurchLogoAsStamp
                      ? churchLogo || CHURCH_LOGO
                      : officialConfig.stampImage || churchLogo || CHURCH_LOGO
                  }
                  alt="ይፋዊ ማኅተም"
                  className="w-32 h-32 sm:w-36 sm:h-36 object-contain drop-shadow-sm select-none"
                />
              </div>
            )}

            <div className="grid grid-cols-3 gap-6 text-xs font-semibold">
              {/* 1. Registrar Signature Block */}
              <div className="text-center space-y-2 flex flex-col items-center">
                <p className="text-slate-800 font-bold">
                  {officialConfig?.registrarTitle || 'የሪጅስተራል ስምና ፊርማ (Registrar)'}
                </p>
                <div className="h-14 flex items-end justify-center w-full">
                  {officialConfig?.showRegistrarSignature && officialConfig.registrarSignatureImage ? (
                    <img
                      src={officialConfig.registrarSignatureImage}
                      alt="የሪጅስተራል ፊርማ"
                      className="max-h-12 max-w-[120px] object-contain"
                    />
                  ) : (
                    <div className="w-28 border-b-2 border-slate-400 pb-1">
                      <span className="text-[10px] text-emerald-700 font-bold">✓ የተረጋገጠ</span>
                    </div>
                  )}
                </div>
                <p className="font-bold text-slate-900 text-xs">
                  {officialConfig?.registrarName || 'ሪጅስተራል ቢሮ'}
                </p>
                <p className="text-[10px] text-slate-500">
                  {student.graduationYear || currentYear} ዓ.ም (ኢ.ዘ.አ)
                </p>
              </div>

              {/* 2. Academic Dean Signature Block */}
              <div className="text-center space-y-2 flex flex-col items-center">
                <p className="text-slate-800 font-bold">
                  {officialConfig?.deanTitle || 'የዋና ዲን ስምና ፊርማ (Academic Dean)'}
                </p>
                <div className="h-14 flex items-end justify-center w-full">
                  {officialConfig?.showDeanSignature && officialConfig.deanSignatureImage ? (
                    <img
                      src={officialConfig.deanSignatureImage}
                      alt="የዋና ዲን ፊርማ"
                      className="max-h-12 max-w-[120px] object-contain"
                    />
                  ) : (
                    <div className="w-28 border-b-2 border-slate-400 pb-1">
                      <span className="text-[10px] text-emerald-700 font-bold">✓ የተረጋገጠ</span>
                    </div>
                  )}
                </div>
                <p className="font-bold text-slate-900 text-xs">
                  {officialConfig?.deanName || 'ዋና ዲን'}
                </p>
                <p className="text-[10px] text-slate-500">
                  {student.graduationYear || currentYear} ዓ.ም (ኢ.ዘ.አ)
                </p>
              </div>

              {/* 3. Super Admin Signature Block */}
              <div className="text-center space-y-2 flex flex-col items-center">
                <p className="text-slate-800 font-bold">
                  የዋና አድሚን ይሁንታና ፊርማ (Super Admin)
                </p>
                <div className="h-14 flex items-end justify-center w-full">
                  <div className="w-28 border-b-2 border-slate-400 pb-1 flex flex-col items-center">
                    <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>ይሁንታ አግኝቷል</span>
                    </span>
                  </div>
                </div>
                <p className="font-bold text-slate-900 text-xs">
                  ዋና አድሚን / የት/ቤት የበላይ ኃላፊ
                </p>
                <p className="text-[10px] text-slate-500">
                  ቀን፦ ሰኔ 30/{student.graduationYear || currentYear} ዓ.ም (ኢ.ዘ.አ)
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);
};
