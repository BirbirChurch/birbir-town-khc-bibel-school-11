import React, { useMemo, useState } from 'react';
import { X, Printer, Download, Award, CheckCircle2, ShieldCheck, GraduationCap, Calendar, BookOpen, Loader2, Lock, AlertCircle } from 'lucide-react';
import { Course, GradeBreakdown, OfficialSignaturesConfig, Student } from '../types.ts';
import { getCourseAssessmentItems, getEffectiveGradeValues, is2018CandidateStudent, normalizeCourseAliasId, resolveGradeBreakdown } from '../utils/gradeCalculations.ts';
import { getCurriculumForStudent, loadHistorical2018Courses, getDeletedCourseIdsSet } from '../data/curriculumCourses.ts';
import { CHURCH_LOGO } from '../assets/logo.ts';
import { downloadElementAsPdf, printElementDirectly } from '../utils/pdfExport.ts';
import { OFFICIAL_GRADING_SCALE } from '../data/initialData.ts';
import {
  useLanguage,
  formatGender,
  formatCalendarYear,
  formatCourseTitle,
  formatTeacherDisplay
} from '../utils/i18n.tsx';

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
  const { lang, t } = useLanguage();
  const curriculum = useMemo(() => getCurriculumForStudent(student), [student]);

  // Compute multi-semester grades and cumulative statistics
  // Strictly constrained to the 3 administered semesters (2018 Sem 1, 2018 Sem 2, and 2019 Sem 1)
  // and ONLY showing courses with actually entered grades ("ውጤት የገባውን ብቻ")
  const { semesterRecords, cumulativeCredits, cumulativePoints, cumulativeGPA, graduationHonors } = useMemo(() => {
    let cumCredits = 0;
    let cumPoints = 0;

    const deletedSet = getDeletedCourseIdsSet();
    const historicalCourses = loadHistorical2018Courses().filter((c) => !deletedSet.has(c.id));
    const isDiploma = student.program === 'Diploma';

    const getCourseYear = (c: Course) =>
      c.academicYear || (c.schedule && c.schedule.includes('2018') ? '2018' : '2019');
    const getCourseSem = (c: Course) =>
      c.semester || (c.schedule && c.schedule.includes('2ኛ') ? '2' : '1');
    const is2018IdOrCourse = (c: Course) =>
      getCourseYear(c) === '2018' ||
      c.id.includes('2018') ||
      c.id.startsWith('dip_sem1') ||
      c.id.startsWith('dip_sem2') ||
      c.id.startsWith('dip_2018_sem') ||
      c.id.startsWith('deg_p');

    type TermCourseEntry = {
      id: string;
      code?: string;
      name: string;
      credits: number;
      teacher: string;
      courseObj?: Course;
    };

    const buildDedupedList = (
      primaryLive: Course[],
      secondaryHist: Course[],
      fallbackCur: { id: string; code?: string; name: string; credits: number; teacher: string }[],
      defaultCode: string
    ): TermCourseEntry[] => {
      const byAlias = new Map<string, TermCourseEntry>();
      const seenNames = new Set<string>();

      const addItem = (item: TermCourseEntry) => {
        if (deletedSet.has(item.id)) return;
        const aliasKey = normalizeCourseAliasId(item.id);
        const nameKey = item.name.trim();
        if (byAlias.has(aliasKey) || seenNames.has(nameKey)) return;
        byAlias.set(aliasKey, item);
        seenNames.add(nameKey);
      };

      primaryLive.forEach((c) =>
        addItem({
          id: c.id,
          code: c.code || defaultCode,
          name: c.name,
          credits: c.credits,
          teacher: c.teacher,
          courseObj: c
        })
      );
      secondaryHist.forEach((c) =>
        addItem({
          id: c.id,
          code: c.code || defaultCode,
          name: c.name,
          credits: c.credits,
          teacher: c.teacher,
          courseObj: c
        })
      );
      fallbackCur.forEach((c) =>
        addItem({
          id: c.id,
          code: c.code || defaultCode,
          name: c.name,
          credits: c.credits,
          teacher: c.teacher
        })
      );

      return Array.from(byAlias.values());
    };

    // 1. Term 1: 2018 ዓ.ም — 1ኛ ሴሚስተር
    const term1Curriculum = (curriculum[0]?.courses || []).filter((c) => !deletedSet.has(c.id));
    const term1Historical = isDiploma
      ? historicalCourses.filter((c) => (c.program === 'Diploma' || !c.program) && getCourseYear(c) === '2018' && getCourseSem(c) === '1')
      : [];
    const term1All = allCourses.filter(
      (c) => !deletedSet.has(c.id) && c.program === student.program && is2018IdOrCourse(c) && getCourseSem(c) === '1'
    );
    const term1Courses = buildDedupedList(term1All, term1Historical, term1Curriculum, isDiploma ? 'DIP-101' : 'BTH-101');

    // 2. Term 2: 2018 ዓ.ም — 2ኛ ሴሚስተር
    const term2Curriculum = (curriculum[1]?.courses || []).filter((c) => !deletedSet.has(c.id));
    const term2Historical = isDiploma
      ? historicalCourses.filter((c) => (c.program === 'Diploma' || !c.program) && getCourseYear(c) === '2018' && getCourseSem(c) === '2')
      : [];
    const term2All = allCourses.filter(
      (c) => !deletedSet.has(c.id) && c.program === student.program && is2018IdOrCourse(c) && getCourseSem(c) === '2'
    );
    const term2Courses = buildDedupedList(term2All, term2Historical, term2Curriculum, isDiploma ? 'DIP-109' : 'BTH-107');

    // 3. Term 3: 2019 ዓ.ም — 1ኛ ሴሚስተር
    const term3Active = allCourses.filter(
      (c) =>
        !deletedSet.has(c.id) &&
        !is2018IdOrCourse(c) &&
        getCourseYear(c) === '2019' &&
        getCourseSem(c) === '1' &&
        (!c.program || c.program === student.program)
    );
    const term3Courses = buildDedupedList(term3Active, [], [], 'C-101');

    // 4. Term 4: 2019 ዓ.ም — 2ኛ ሴሚስተር (only if actually administered/allocated)
    const term4Active = allCourses.filter(
      (c) =>
        !deletedSet.has(c.id) &&
        !is2018IdOrCourse(c) &&
        getCourseYear(c) === '2019' &&
        getCourseSem(c) === '2' &&
        (!c.program || c.program === student.program)
    );
    const term4Courses = buildDedupedList(term4Active, [], [], 'C-201');

    // Administered / designated terms
    const terms = [
      {
        semesterIndex: 1,
        yearNumber: 1,
        semesterInYear: 1,
        academicYear: '2018',
        semesterNumber: '1',
        semesterLabel: t('1ኛ ዓመት — 1ኛ ሴሚስተር (2018 ዓ.ም)', 'Year 1 — 1st Semester (2018 E.C.)'),
        rawCourses: term1Courses
      },
      {
        semesterIndex: 2,
        yearNumber: 1,
        semesterInYear: 2,
        academicYear: '2018',
        semesterNumber: '2',
        semesterLabel: t('1ኛ ዓመት — 2ኛ ሴሚስተር (2018 ዓ.ም)', 'Year 1 — 2nd Semester (2018 E.C.)'),
        rawCourses: term2Courses
      },
      {
        semesterIndex: 3,
        yearNumber: 2,
        semesterInYear: 1,
        academicYear: '2019',
        semesterNumber: '1',
        semesterLabel: t('2ኛ ዓመት — 1ኛ ሴሚስተር (2019 ዓ.ም)', 'Year 2 — 1st Semester (2019 E.C.)'),
        rawCourses: term3Courses
      },
      ...(term4Courses.length > 0 ? [{
        semesterIndex: 4,
        yearNumber: 2,
        semesterInYear: 2,
        academicYear: '2019',
        semesterNumber: '2',
        semesterLabel: t('2ኛ ዓመት — 2ኛ ሴሚስተር (2019 ዓ.ም — የምረቃ ሴሚስተር)', 'Year 2 — 2nd Semester (2019 E.C. — Graduating)'),
        rawCourses: term4Courses
      }] : [])
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
        hasGrade: boolean;
      }> = [];

      term.rawCourses.forEach((curCourse) => {
        const curAlias = normalizeCourseAliasId(curCourse.id);
        const matchedCourse =
          curCourse.courseObj ||
          allCourses.find(
            (c) =>
              c.program === student.program &&
              (normalizeCourseAliasId(c.id) === curAlias || c.name.trim() === curCourse.name.trim())
          ) ||
          (student.program === 'Diploma'
            ? historicalCourses.find(
                (c) => normalizeCourseAliasId(c.id) === curAlias || c.name.trim() === curCourse.name.trim()
              )
            : undefined);

        const criteria = matchedCourse ? getCourseAssessmentItems(matchedCourse) : undefined;
        let score = 0;
        let letter = '—';
        let points = 0;
        let desc = 'አልተሞላም';
        let hasActualGrade = false;

        // 1. Resolve grade breakdown by curCourse.id (resolveGradeBreakdown handles aliases too)
        const breakdown = resolveGradeBreakdown(
          grades,
          student.uid,
          curCourse.id,
          term.academicYear,
          term.semesterNumber,
          student.id
        );
        const eff1 = getEffectiveGradeValues(breakdown, criteria);
        if (eff1.hasAny) {
          hasActualGrade = true;
          score = eff1.total;
          letter = eff1.letter;
          points = eff1.points;
          desc = eff1.desc;
        }

        // 2. Fallback to matchedCourse id if distinct
        if (!hasActualGrade && matchedCourse && normalizeCourseAliasId(matchedCourse.id) !== curAlias) {
          const mBreakdown = resolveGradeBreakdown(
            grades,
            student.uid,
            matchedCourse.id,
            term.academicYear,
            term.semesterNumber,
            student.id
          );
          const eff2 = getEffectiveGradeValues(mBreakdown, criteria);
          if (eff2.hasAny) {
            hasActualGrade = true;
            score = eff2.total;
            letter = eff2.letter;
            points = eff2.points;
            desc = eff2.desc;
          }
        }

        const courseCredits = matchedCourse?.credits || curCourse.credits || 3;

        if (hasActualGrade) {
          semCredits += courseCredits;
          semPoints += points * courseCredits;
        }

        courseRows.push({
          code: curCourse.code || (isDiploma ? 'DIP-101' : 'BTH-101'),
          name: formatCourseTitle(curCourse.name, lang),
          credits: courseCredits,
          teacher: formatTeacherDisplay(matchedCourse?.teacher || curCourse.teacher, lang),
          score,
          letter,
          points,
          desc,
          hasGrade: hasActualGrade
        });
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
    let honors = t('ውጤት በመጠባበቅ ላይ (No Grades)', 'Awaiting Grades');
    if (cumCredits > 0) {
      if (numCGPA >= 3.8) honors = t('በእጅግ ከፍተኛ ማዕረግ (Great Distinction)', 'Great Distinction');
      else if (numCGPA >= 3.5) honors = t('በከፍተኛ ማዕረግ (Distinction)', 'Distinction');
      else if (numCGPA >= 3.25) honors = t('በጥሩ ማዕረግ (Very Good)', 'Very Good Standing');
      else if (numCGPA >= 2.0) honors = t('ብቁ (Passed)', 'Passed');
      else honors = t('ዝቅተኛ (Low Standing)', 'Low Standing');
    }

    return {
      semesterRecords: records,
      cumulativeCredits: cumCredits,
      cumulativePoints: cumPoints,
      cumulativeGPA: cGPA,
      graduationHonors: honors
    };
  }, [curriculum, allCourses, grades, student, currentYear, currentSemester, lang]);

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
          <h3 className="text-base font-extrabold text-slate-900">{t('ይህ ሰነድ ለተመራቂ ተማሪዎች ብቻ ነው!', 'For Graduating Candidates Only!')}</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            {t(
              `የተሟላ የምረቃ ትራንስክሪፕት የሚሰጠው ለ2018 ተመራቂ ተማሪዎች ብቻ ነው። ተመራቂ ላልሆኑ (የ1ኛ ዓመት) ተማሪዎች ከዚህ ዓመት (${currentYear} ዓ.ም) ውጪ ያለ ምንም የትራንስክሪፕት ሰነድ የለም።`,
              `Consolidated graduation transcripts are issued only to 2018 E.C. graduating candidates. First-year students only receive current-year (${currentYear} E.C.) records.`
            )}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer transition-all"
          >
            {t('መስኮቱን ዝጋ (Close)', 'Close')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-1.5 sm:p-4 overflow-hidden">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-5xl w-full max-h-[95vh] flex flex-col overflow-hidden border border-slate-300">
        {/* Top Control Bar (Hidden when printed) */}
        <div className="bg-slate-900 text-white px-3.5 py-3 sm:px-6 sm:py-4 flex flex-wrap justify-between items-center no-print border-b border-slate-800 gap-2.5 sm:gap-3 shrink-0">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
            <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400 shrink-0" />
            <div className="min-w-0">
              <h3 className="font-bold text-xs sm:text-base flex flex-wrap items-center gap-1.5 text-white">
                <span className="truncate">{t('ይፋዊ የተሟላ የምረቃ ትራንስክሪፕት', 'Official Consolidated Graduation Transcript')}</span>
                <span className="bg-amber-400/20 text-amber-300 text-[10px] px-2 py-0.5 rounded font-mono shrink-0">
                  🇪🇹 {t('እንደ ኢትዮጵያ ዘመን አቆጣጠር', 'Ethiopian Calendar (E.C.)')}
                </span>
                {!allowPdfPrint && (
                  <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0">
                    {t('ቅድመ-እይታ ብቻ', 'Preview Only')}
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-300 truncate hidden sm:block">
                {t(
                  'የተማሩበትን ሙሉ ትምህርት (ሁሉንም ሴሚስተሮች) በአንድ ላይ የሚያሳይ ይፋዊ የምረቃ ሰነድ',
                  'Official consolidated graduation transcript covering all administered semesters'
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap w-full sm:w-auto justify-end">
            {/* Black & White Ink Saver Print Mode Toggle */}
            <button
              type="button"
              onClick={() => setIsBwMode(!isBwMode)}
              className={`text-[11px] sm:text-xs px-2.5 sm:px-3 py-2 min-h-[38px] rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                isBwMode
                  ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-sm'
                  : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
              }`}
              title={t('ለቢሮ ፕሪንተር የሚሆን የጥቁርና ነጭ (Ink-Saver) የፕሪንት አማራጭን ያብሩ/ያጥፉ', 'Toggle Black & White Ink-Saver Mode')}
            >
              <Printer className="w-4 h-4 shrink-0" />
              <span>{isBwMode ? t('🖨️ ጥቁርና ነጭ (B&W)', '🖨️ B&W Mode') : t('🌈 በቀለም (Color)', '🌈 Color Mode')}</span>
            </button>

            {!allowPdfPrint ? (
              <div
                className="flex items-center gap-1.5 px-3 py-2 min-h-[38px] rounded-xl bg-rose-950/90 text-rose-300 border border-rose-700/80 text-[11px] sm:text-xs font-bold shadow-xs select-none"
                title={t('ለተማሪዎች ማተምና ማውረድ አልተፈቀደም (በጽሕፈት ቤት ብቻ ይታተማል)', 'Restricted to administration')}
              >
                <Lock className="w-4 h-4 text-rose-400 shrink-0" />
                <span>🔒 {t('ፒዲኤፍ ማተም ታግዷል', 'PDF Print Locked')}</span>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isExportingPdf}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] sm:text-xs px-3 sm:px-3.5 py-2 min-h-[38px] rounded-xl font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-60"
                  title={t('ሙሉውን የምረቃ ትራንስክሪፕት በፒዲኤፍ (.pdf) ፋይል በቀጥታ አውርድ', 'Download graduation transcript as PDF')}
                >
                  {isExportingPdf ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white shrink-0" />
                  ) : (
                    <Download className="w-4 h-4 text-white shrink-0" />
                  )}
                  <span>{isExportingPdf ? t('ፒዲኤፍ እየተዘጋጀ...', 'Preparing PDF...') : t('PDF አውርድ', 'Download PDF')}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadCSV}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] sm:text-xs px-3 py-2 min-h-[38px] rounded-xl font-bold transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-700"
                  title={t('በCSV ሰነድ አውርድ', 'Export CSV')}
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>CSV</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] sm:text-xs px-3 sm:px-3.5 py-2 min-h-[38px] rounded-xl font-bold shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-amber-300 shrink-0" />
                  <span>{t('አትም (Print)', 'Print')}</span>
                </button>
              </>
            )}

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

        {/* Printable Official Document (A4 Multi-page Optimized) */}
        <div className="flex-1 p-2.5 sm:p-6 bg-slate-100/60 overflow-x-auto overflow-y-auto print:max-h-none print:overflow-visible print:p-0">
          <div className="md:hidden text-[11px] font-bold text-slate-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5 mb-2 text-center no-print">
            ↔ {t('ሰነዱን ሙሉ ለማየት ወደ ጎን እና ወደ ታች ያንሸራትቱ', 'Scroll horizontally and vertically to view full document')}
          </div>
          {!allowPdfPrint && (
            <div className="max-w-[210mm] mx-auto mb-3 p-3 bg-rose-50 border-2 border-rose-300 rounded-2xl text-xs text-rose-950 flex items-center gap-2.5 font-bold no-print shadow-xs">
              <Lock className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>
                🔒 {t(
                  'ይፋዊ ማሳሰቢያ፦ የዚህ የተሟላ የምረቃ ትራንስክሪፕት ሰነድ በፒዲኤፍ ማተም ወይም ማውረድ አልተፈቀደም። ሰነዱን ማየት ብቻ ይችላሉ፤ ይፋዊ የታተመ ሰነድ ከዋናው ጽሕፈት ቤት ይሰጣል።',
                  'Notice: PDF printing and downloading of this consolidated transcript are disabled for student view. Official copies are issued by the Administration.'
                )}
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
                  alt={t('የብርብር ከተማ ቃለ ሕይወት ቤተ ክርስቲያን', 'Birbir City Kale Heywet Church')}
                  className={`h-20 sm:h-24 w-auto object-contain drop-shadow-xs ${
                    isBwMode ? 'filter grayscale contrast-125' : ''
                  }`}
                />
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-wide text-slate-900 font-serif-ethiopic leading-tight">
                {t('የብርብር ከተማ ቃለ ሕይወት ቤተ ክርስቲያን', 'Birbir City Kale Heywet Church')}
              </h1>
              <h2 className="text-base sm:text-lg font-bold text-slate-800 mt-0.5">
                {t('መጽሐፍ ቅዱስ ትምህርት ቤት', 'Bible Training School')}
              </h2>
              <p className="text-[11px] uppercase font-semibold text-slate-600 mt-0.5 tracking-wider">
                Birbir City Kale Heywet Church Bible Training School
              </p>
              <div className="mt-2.5 inline-block bg-slate-900 text-white text-xs sm:text-sm font-black px-4 py-1.5 rounded-lg tracking-wide uppercase">
                {t(
                  'ይፋዊ የተሟላ የምረቃ ትራንስክሪፕት እና የትምህርት መዝገብ (Official Consolidated Graduation Transcript)',
                  'Official Consolidated Graduation Academic Transcript'
                )}
              </div>
              <p className="text-[10px] text-slate-700 font-bold mt-1">
                🇪🇹 {t('የዘመን አቆጣጠር፦ እንደ ኢትዮጵያ ዘመን አቆጣጠር (ዓ.ም)', 'Calendar System: Ethiopian Calendar (E.C.)')}
              </p>
            </div>

            {/* Student Biodata & Degree Program Information Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-semibold mb-5 border-2 border-slate-300 p-3.5 rounded-xl bg-slate-50/70">
              <div className="space-y-1.5">
                <p className="flex items-center gap-2">
                  <span className="text-slate-500 font-normal w-32">{t('የተማሪው ሙሉ ስም:', 'Full Name:')}</span>
                  <span className="font-extrabold text-slate-950 text-sm">{student.name}</span>
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-slate-500 font-normal w-32">{t('የተማሪ መለያ ቁጥር (ID):', 'Student ID:')}</span>
                  <span className="font-mono font-black text-slate-900 text-sm bg-white px-2 py-0.5 rounded border border-slate-300">
                    {student.id}
                  </span>
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-slate-500 font-normal w-32">{t('ጾታ (Gender):', 'Gender:')}</span>
                  <span className="font-bold text-slate-900">{formatGender(student.gender, lang)}</span>
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-slate-500 font-normal w-32">{t('የገቡበት ዓ.ም:', 'Admission Year:')}</span>
                  <span className="font-bold text-slate-900">{formatCalendarYear(student.admissionYear || '2018', lang)}</span>
                </p>
              </div>

              <div className="space-y-1.5">
                <p className="flex items-center gap-2">
                  <span className="text-slate-500 font-normal w-36">{t('የትምህርት ፕሮግራም:', 'Program:')}</span>
                  <span className="font-black text-slate-950">
                    {student.program === 'Degree'
                      ? t('የድግሪ ፕሮግራም (Bachelor of Theology)', 'Bachelor of Theology (Degree)')
                      : t('የዲፕሎማ ፕሮግራም (Diploma in Bible Studies)', 'Diploma in Bible Studies')}
                  </span>
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-slate-500 font-normal w-36">{t('የትምህርት ዝግጅት / መንገድ:', 'Study Track:')}</span>
                  <span className="font-bold text-slate-900">
                    {student.program === 'Diploma'
                      ? t('2 ዓመት (የተሰጡ 4 ሴሚስተሮች፦ 2018 1ኛና 2ኛ፣ 2019 1ኛና 2ኛ ሴሚስተር)', '2 Years (4 Semesters: 2018 Sem 1 & 2, 2019 Sem 1 & 2)')
                      : student.degreeTrack === '2_YEAR' || student.priorDiploma
                      ? t('2 ዓመት (ቀድሞ የመጽሐፍ ቅዱስ ዲፕሎማ ያለው)', '2 Years (Prior Bible Diploma)')
                      : t('3 ዓመት መደበኛ', '3 Years Regular')}
                  </span>
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-slate-500 font-normal w-36">{t('የተመረቁበት የትምህርት ዘመን:', 'Graduation Year:')}</span>
                  <span className="font-extrabold text-emerald-950 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                    {formatCalendarYear(student.graduationYear || currentYear, lang)}
                  </span>
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-slate-500 font-normal w-36">{t('የምረቃ ሁኔታ:', 'Graduation Status:')}</span>
                  <span className="inline-flex items-center gap-1 font-black text-emerald-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{t('በይፋ የተመረቀ (Officially Conferred)', 'Officially Conferred')}</span>
                  </span>
                </p>
              </div>
            </div>

            {/* Sequential Multi-Semester Course Grade Tables */}
            <div className="space-y-5 mb-5">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2 pb-2 border-b border-slate-300">
                <BookOpen className="w-4 h-4 text-emerald-800" />
                <span>
                  {t(
                    'የአራቱ ሴሚስተሮችና የገቡ ውጤቶች ዝርዝር ሰሌዳ (2018 1ኛና 2ኛ፣ 2019 1ኛና 2ኛ ሴሚስተር — ውጤት የገባቸው ብቻ)',
                    'Detailed Academic Record Across Administered Semesters'
                  )}
                </span>
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
                    <span>{t('ክሬዲት:', 'Credits:')} <strong>{sem.semesterCredits}</strong></span>
                    <span>{t('ሴሚስተር GPA:', 'Term GPA:')} <strong>{sem.semesterGPA}</strong></span>
                  </div>
                </div>

                {/* Courses Table */}
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-100 text-slate-800 font-bold uppercase text-[10px] border-b border-slate-300">
                    <tr>
                      <th className="p-2 text-center w-10">{t('ተ.ቁ', '#')}</th>
                      <th className="p-2 w-20">{t('ኮድ', 'Code')}</th>
                      <th className="p-2">{t('የኮርስ ርዕስ (Course Title)', 'Course Title')}</th>
                      <th className="p-2 w-32">{t('የተመደበ መምህር', 'Instructor')}</th>
                      <th className="p-2 text-center w-16">{t('ክሬዲት', 'Cr')}</th>
                      <th className="p-2 text-center w-20">{t('ውጤት (100%)', 'Score (100%)')}</th>
                      <th className="p-2 text-center w-16">{t('ደረጃ', 'Grade')}</th>
                      <th className="p-2 text-center w-20">{t('Grade Point', 'Grade Point')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {sem.courses.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-4 text-center text-slate-400 italic">
                          {t('በዚህ ሴሚስተር እስካሁን የተመዘገበ ውጤት የለም (ምንም ውጤት አልገባም)', 'No recorded grades in this semester yet')}
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
                          <td className="p-2 text-center font-mono font-bold text-slate-950">
                            {c.hasGrade ? c.score : '—'}
                          </td>
                          <td className="p-2 text-center font-black text-slate-900">
                            {c.hasGrade ? c.letter : '—'}
                          </td>
                          <td className="p-2 text-center font-mono font-bold text-emerald-800">
                            {c.hasGrade ? c.points.toFixed(2) : '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100/90 font-bold border-t border-slate-300 text-slate-900">
                      <td colSpan={4} className="p-2 text-right">
                        {t('የሴሚስተሩ ጠቅላላ ድምር (Term Total):', 'Term Total:')}
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
              <span>{t('አጠቃላይ የምረቃ ውጤት ማጠቃለያ (Cumulative Graduation Academic Summary)', 'Cumulative Graduation Academic Summary')}</span>
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-center">
              <div className="p-3 bg-white/10 rounded-xl backdrop-blur-xs border border-white/10">
                <span className="block text-[10px] text-slate-300 uppercase font-bold">{t('ጠቅላላ ክሬዲቶች', 'Total Credits')}</span>
                <span className="text-xl sm:text-2xl font-black font-mono text-white mt-1 block">
                  {cumulativeCredits}
                </span>
              </div>

              <div className="p-3 bg-white/10 rounded-xl backdrop-blur-xs border border-white/10">
                <span className="block text-[10px] text-slate-300 uppercase font-bold">{t('ጠቅላላ Quality Points', 'Total Quality Points')}</span>
                <span className="text-xl sm:text-2xl font-black font-mono text-white mt-1 block">
                  {cumulativePoints.toFixed(2)}
                </span>
              </div>

              <div className="p-3 bg-amber-400/20 rounded-xl backdrop-blur-xs border border-amber-400/40">
                <span className="block text-[10px] text-amber-300 uppercase font-bold">{t('አጠቃላይ CGPA', 'Cumulative CGPA')}</span>
                <span className="text-2xl sm:text-3xl font-black font-mono text-amber-300 mt-1 block">
                  {cumulativeGPA}
                </span>
              </div>

              <div className="p-3 bg-white/10 rounded-xl backdrop-blur-xs border border-white/10">
                <span className="block text-[10px] text-slate-300 uppercase font-bold">{t('የምረቃ ማዕረግ (Standing)', 'Graduation Standing')}</span>
                <span className="text-xs sm:text-sm font-extrabold text-amber-200 mt-1.5 block leading-tight">
                  {graduationHonors}
                </span>
              </div>
            </div>
          </div>

          {/* Grading System Reference Legend */}
          <div className="border border-slate-300 rounded-xl p-3 mb-6 bg-slate-50 text-[10px] text-slate-700 avoid-break">
            <div className="flex items-center justify-between mb-1.5 border-b border-slate-200 pb-1">
              <span className="font-bold text-slate-900">{t('ይፋዊ የ13-ደረጃ ውጤት መስፈርት (Official 13-Tier Grading Scale):', 'Official 13-Tier Grading Scale:')}</span>
              <span className="text-[9px] text-slate-500 font-medium">{t('13ቱም የውጤት ደረጃዎች (ከ A+ እስከ F)', 'All 13 Grade Levels (A+ to F)')}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 lg:grid-cols-13 gap-1.5 text-[9.5px]">
              {OFFICIAL_GRADING_SCALE.map((tier) => (
                <div key={tier.letter} className="bg-white px-1.5 py-1 rounded border border-slate-200 text-center shadow-2xs">
                  <span className="font-black text-slate-900 block">{tier.letter}</span>
                  <span className="text-slate-600 font-mono text-[9px] block">{tier.min}%–{tier.max}%</span>
                  <span className="text-slate-700 font-bold text-[8.5px] block font-mono">
                    {tier.points === 3.7 ? '3.70' : tier.points.toFixed(2)} pts
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Official Signatures & Seal Verification Block */}
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
                  alt={t('ይፋዊ ማኅተም', 'Official Seal')}
                  className="w-32 h-32 sm:w-36 sm:h-36 object-contain drop-shadow-sm select-none"
                />
              </div>
            )}

            <div className="grid grid-cols-3 gap-6 text-xs font-semibold">
              {/* 1. Registrar Signature Block */}
              <div className="text-center space-y-2 flex flex-col items-center">
                <p className="text-slate-800 font-bold">
                  {officialConfig?.registrarTitle || t('የሪጅስተራል ስምና ፊርማ (Registrar)', 'Registrar Signature')}
                </p>
                <div className="h-14 flex items-end justify-center w-full">
                  {officialConfig?.showRegistrarSignature && officialConfig.registrarSignatureImage ? (
                    <img
                      src={officialConfig.registrarSignatureImage}
                      alt={t('የሪጅስተራል ፊርማ', 'Registrar Signature')}
                      className="max-h-12 max-w-[120px] object-contain"
                    />
                  ) : (
                    <div className="w-28 border-b-2 border-slate-400 pb-1">
                      <span className="text-[10px] text-emerald-700 font-bold">✓ {t('የተረጋገጠ', 'Verified')}</span>
                    </div>
                  )}
                </div>
                <p className="font-bold text-slate-900 text-xs">
                  {officialConfig?.registrarName || t('ሪጅስተራል ቢሮ', "Registrar's Office")}
                </p>
                <p className="text-[10px] text-slate-500">
                  {formatCalendarYear(student.graduationYear || currentYear, lang)}
                </p>
              </div>

              {/* 2. Academic Dean Signature Block */}
              <div className="text-center space-y-2 flex flex-col items-center">
                <p className="text-slate-800 font-bold">
                  {officialConfig?.deanTitle || t('የዋና ዲን ስምና ፊርማ (Academic Dean)', 'Academic Dean Signature')}
                </p>
                <div className="h-14 flex items-end justify-center w-full">
                  {officialConfig?.showDeanSignature && officialConfig.deanSignatureImage ? (
                    <img
                      src={officialConfig.deanSignatureImage}
                      alt={t('የዋና ዲን ፊርማ', 'Academic Dean Signature')}
                      className="max-h-12 max-w-[120px] object-contain"
                    />
                  ) : (
                    <div className="w-28 border-b-2 border-slate-400 pb-1">
                      <span className="text-[10px] text-emerald-700 font-bold">✓ {t('የተረጋገጠ', 'Verified')}</span>
                    </div>
                  )}
                </div>
                <p className="font-bold text-slate-900 text-xs">
                  {officialConfig?.deanName || t('ዋና ዲን', 'Academic Dean')}
                </p>
                <p className="text-[10px] text-slate-500">
                  {formatCalendarYear(student.graduationYear || currentYear, lang)}
                </p>
              </div>

              {/* 3. Super Admin Signature Block */}
              <div className="text-center space-y-2 flex flex-col items-center">
                <p className="text-slate-800 font-bold">
                  {t('የዋና አድሚን ይሁንታና ፊርማ (Super Admin)', 'Super Admin Approval')}
                </p>
                <div className="h-14 flex items-end justify-center w-full">
                  <div className="w-28 border-b-2 border-slate-400 pb-1 flex flex-col items-center">
                    <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{t('ይሁንታ አግኝቷል', 'Approved')}</span>
                    </span>
                  </div>
                </div>
                <p className="font-bold text-slate-900 text-xs">
                  {t('ዋና አድሚን / የት/ቤት የበላይ ኃላፊ', 'Super Admin / School Head')}
                </p>
                <p className="text-[10px] text-slate-500">
                  {t(`ቀን፦ ሰኔ 30/${student.graduationYear || currentYear} ዓ.ም (ኢ.ዘ.አ)`, `Date: Sene 30, ${student.graduationYear || currentYear} E.C.`)}
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
