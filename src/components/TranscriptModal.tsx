import React, { useState, useMemo, useEffect } from 'react';
import { X, Printer, ShieldCheck, Download, Loader2, Lock } from 'lucide-react';
import { Course, GradeBreakdown, OfficialSignaturesConfig, Student } from '../types.ts';
import { getCourseAssessmentItems, getEffectiveGradeValues, resolveGradeBreakdown, is2018CandidateStudent, is2018DiplomaEntrant, normalizeCourseAliasId } from '../utils/gradeCalculations.ts';
import { OFFICIAL_GRADING_SCALE } from '../data/initialData.ts';
import { CHURCH_LOGO } from '../assets/logo.ts';
import { downloadElementAsPdf, printElementDirectly } from '../utils/pdfExport.ts';
import { loadHistorical2018Courses, getCurriculumForStudent, DIPLOMA_CURRICULUM, getDeletedCourseIdsSet } from '../data/curriculumCourses.ts';

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
  initialYear?: string;
  initialSemester?: string;
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
  isStudentViewer = false,
  initialYear,
  initialSemester
}) => {
  const isCandidate = is2018CandidateStudent(student);
  const isDip2018Entrant = is2018DiplomaEntrant(student);
  const is2019Entrant =
    student.admissionYear === '2019' ||
    (!isDip2018Entrant && !isCandidate && student.currentStudyYear === 1 && !student.priorDiploma && student.degreeTrack !== '2_YEAR');

  interface TermOption {
    year: string;
    sem: string;
    label: string;
    badge?: string;
  }

  const availableTerms: TermOption[] = useMemo(() => {
    const terms: TermOption[] = [];
    if (isDip2018Entrant) {
      terms.push(
        { year: '2018', sem: '1', label: '2018 ዓ.ም 1ኛ ሴሚስተር', badge: '1ኛ ዓመት' },
        { year: '2018', sem: '2', label: '2018 ዓ.ም 2ኛ ሴሚስተር', badge: '2ኛ ሴሚስተር' },
        { year: '2019', sem: '1', label: '2019 ዓ.ም 1ኛ ሴሚስተር', badge: '2ኛ ዓመት' },
        { year: '2019', sem: '2', label: '2019 ዓ.ም 2ኛ ሴሚስተር', badge: 'የምረቃ' }
      );
    } else if (student.program === 'Degree' && (student.degreeTrack === '2_YEAR' || student.priorDiploma)) {
      terms.push(
        { year: '2018', sem: '1', label: '2018 ዓ.ም 1ኛ ሴሚስተር (ቅድመ-ዲፕሎማ)', badge: 'ዲፕሎማ' },
        { year: '2019', sem: '1', label: '2019 ዓ.ም 1ኛ ሴሚስተር', badge: 'ድግሪ' },
        { year: '2019', sem: '2', label: '2019 ዓ.ም 2ኛ ሴሚስተር', badge: 'ድግሪ' }
      );
    } else {
      terms.push(
        { year: '2019', sem: '1', label: '2019 ዓ.ም 1ኛ ሴሚስተር' },
        { year: '2019', sem: '2', label: '2019 ዓ.ም 2ኛ ሴሚስተር' }
      );
    }

    // Include any additional years/semesters registered in live courses for this student's program
    courses.forEach((c) => {
      if (c.program !== student.program) return;
      const cYear = c.academicYear || (c.schedule && c.schedule.includes('2018') ? '2018' : '2019');
      const cSem = c.semester || (c.schedule && c.schedule.includes('2ኛ') ? '2' : '1');
      if (is2019Entrant && cYear === '2018') return;
      if (!terms.some((t) => t.year === cYear && t.sem === cSem)) {
        terms.push({ year: cYear, sem: cSem, label: `${cYear} ዓ.ም ${cSem}ኛ ሴሚስተር` });
      }
    });

    return terms;
  }, [student, courses, isDip2018Entrant, is2019Entrant]);

  const resolveDefaultTerm = () => {
    if (initialYear && initialSemester) {
      const exact = availableTerms.find((t) => t.year === initialYear && t.sem === initialSemester);
      if (exact) return { year: exact.year, sem: exact.sem };
    }
    if (initialYear) {
      const byYear = availableTerms.find((t) => t.year === initialYear);
      if (byYear) return { year: byYear.year, sem: byYear.sem };
    }
    if (isDip2018Entrant) {
      return { year: '2018', sem: '2' };
    }
    return { year: '2019', sem: currentSemester || '1' };
  };

  // Dynamic state for Academic Year and Semester so 2018 2nd Semester can be chosen and viewed
  const [selectedYear, setSelectedYear] = useState<string>(() => resolveDefaultTerm().year);
  const [selectedSemester, setSelectedSemester] = useState<string>(() => resolveDefaultTerm().sem);

  useEffect(() => {
    const def = resolveDefaultTerm();
    setSelectedYear(def.year);
    setSelectedSemester(def.sem);
  }, [student.uid, initialYear, initialSemester, isDip2018Entrant, currentSemester]);

  const studentCourses = useMemo(() => {
    if (is2019Entrant && selectedYear === '2018') {
      // 2019 entrants (Diploma & Degree) have NO 2018 courses!
      return [];
    }

    const deletedSet = getDeletedCourseIdsSet();
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

    if (selectedYear === '2018') {
      if (student.program === 'Diploma' && !isDip2018Entrant) {
        return [];
      }

      const mapByAlias = new Map<string, Course>();
      const seenNames = new Set<string>();
      const addCourseIfNew = (course: Course) => {
        if (deletedSet.has(course.id)) return;
        const aliasKey = normalizeCourseAliasId(course.id);
        const nameKey = course.name.trim();
        if (mapByAlias.has(aliasKey) || seenNames.has(nameKey)) return;
        mapByAlias.set(aliasKey, course);
        seenNames.add(nameKey);
      };

      // 1. Live system courses (preserves assessmentConfig, credits, teacher edits)
      courses
        .filter((c) => {
          if (deletedSet.has(c.id)) return false;
          if (c.program !== student.program) return false;
          if (!is2018IdOrCourse(c)) return false;
          return getCourseSem(c) === selectedSemester;
        })
        .forEach(addCourseIfNew);

      // 2. Historical 2018 courses (saved edits for 2018 Diploma)
      if (student.program === 'Diploma') {
        loadHistorical2018Courses()
          .filter((c) => {
            if (deletedSet.has(c.id)) return false;
            if (c.program && c.program !== 'Diploma') return false;
            return getCourseSem(c) === selectedSemester;
          })
          .forEach(addCourseIfNew);
      }

      // 3. Curriculum defaults as fallback for any courses not yet customized
      const fallbackCurriculum =
        student.program === 'Diploma' ? DIPLOMA_CURRICULUM : getCurriculumForStudent(student);
      const semIdx = selectedSemester === '2' ? 1 : 0;
      const semCourses = fallbackCurriculum[semIdx]?.courses || [];
      semCourses.forEach((c) => {
        if (deletedSet.has(c.id)) return;
        addCourseIfNew({
          id: c.id,
          code: c.code,
          name: c.name,
          credits: c.credits,
          teacher: c.teacher,
          program: student.program,
          academicYear: '2018',
          semester: selectedSemester,
          schedule: `2018 ዓ.ም — ${selectedSemester}ኛ ሴሚስተር`
        });
      });

      return Array.from(mapByAlias.values());
    }

    // 2019+ Courses for Diploma & Degree
    const seenIds = new Set<string>();
    return courses.filter((c) => {
      if (deletedSet.has(c.id)) return false;
      if (c.program !== student.program) return false;
      if (is2018IdOrCourse(c)) return false;
      if (getCourseYear(c) !== selectedYear) return false;
      if (selectedSemester && getCourseSem(c) !== selectedSemester) return false;
      const aliasKey = normalizeCourseAliasId(c.id);
      if (seenIds.has(aliasKey)) return false;
      seenIds.add(aliasKey);
      return true;
    });
  }, [courses, student, isCandidate, isDip2018Entrant, is2019Entrant, selectedYear, selectedSemester]);

  let totalCredits = 0;
  let gradedCredits = 0;
  let totalGradePoints = 0;
  let gradedCoursesCount = 0;

  const courseRows = studentCourses.map((c, idx) => {
    const g = resolveGradeBreakdown(grades, student.uid, c.id, selectedYear, selectedSemester, student.id);
    const eff = getEffectiveGradeValues(g, getCourseAssessmentItems(c));
    const isGraded = eff.hasAny;

    totalCredits += c.credits;

    if (isGraded) {
      gradedCoursesCount++;
      gradedCredits += c.credits;
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

  const gpa = gradedCredits > 0 ? (totalGradePoints / gradedCredits).toFixed(2) : '0.00';

  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isBwMode, setIsBwMode] = useState(false);

  const handleDownloadPdf = async () => {
    if (!allowPdfPrint) return;
    setIsExportingPdf(true);
    try {
      const filename = `Transcript_${student.id || student.name}_${selectedYear}_Sem${selectedSemester}.pdf`;
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
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-1.5 sm:p-4 overflow-hidden">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-4xl w-full max-h-[95vh] flex flex-col overflow-hidden border border-slate-300">
        {/* Modal Toolbar (hidden when printed) */}
        <div className="bg-slate-900 text-white px-3.5 py-3 sm:px-6 sm:py-4 flex flex-wrap justify-between items-center gap-2.5 sm:gap-3 no-print border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Printer className="w-5 h-5 text-amber-400 shrink-0" />
            <h3 className="font-bold text-xs sm:text-sm truncate">የትራንስክሪፕት ቅድመ-እይታ (Transcript Preview)</h3>
            {!allowPdfPrint && (
              <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap shrink-0">
                ቅድመ-እይታ ብቻ
              </span>
            )}
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
              title="ለቢሮ ፕሪንተር የሚሆን የጥቁርና ነጭ (Ink-Saver) የፕሪንት አማራጭን ያብሩ/ያጥፉ"
            >
              <Printer className="w-4 h-4 shrink-0" />
              <span>{isBwMode ? '🖨️ ጥቁርና ነጭ (B&W)' : '🌈 በቀለም (Color)'}</span>
            </button>

            {!allowPdfPrint ? (
              <div
                className="flex items-center gap-1.5 px-3 py-2 min-h-[38px] rounded-xl bg-rose-950/90 text-rose-300 border border-rose-700/80 text-[11px] sm:text-xs font-bold shadow-xs select-none"
                title="ለተማሪዎች ማተምና ማውረድ አልተፈቀደም (በጽሕፈት ቤት ብቻ ይታተማል)"
              >
                <Lock className="w-4 h-4 text-rose-400 shrink-0" />
                <span>🔒 ፒዲኤፍ ማተም ታግዷል</span>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isExportingPdf}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] sm:text-xs px-3 sm:px-3.5 py-2 min-h-[38px] rounded-xl font-bold shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                  title="ትራንስክሪፕቱን በፒዲኤፍ (.pdf) ፋይል በቀጥታ አውርድ"
                >
                  {isExportingPdf ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white shrink-0" />
                  ) : (
                    <Download className="w-4 h-4 text-white shrink-0" />
                  )}
                  <span>{isExportingPdf ? 'ፒዲኤፍ እየተዘጋጀ...' : 'PDF አውርድ'}</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] sm:text-xs px-3 sm:px-3.5 py-2 min-h-[38px] rounded-xl font-bold shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4 shrink-0" />
                  <span>አትም (Print)</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="text-slate-300 hover:text-white p-2 min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="ዝጋ"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Dynamic Semester Switcher Bar (Quickly switch to 2018 2nd Sem, 2018 1st Sem, etc.) */}
        <div className="bg-slate-800 text-slate-200 px-3.5 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-700 text-xs no-print shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full md:w-auto min-w-0">
            <span className="text-amber-400 font-bold text-[11px] sm:text-xs flex items-center gap-1 shrink-0">
              <span>📅 የትራንስክሪፕት ሴሚስተር ምረጥ፦</span>
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 max-w-full">
              {availableTerms.map((t) => {
                const isActive = selectedYear === t.year && selectedSemester === t.sem;
                return (
                  <button
                    key={`${t.year}_${t.sem}`}
                    type="button"
                    onClick={() => {
                      setSelectedYear(t.year);
                      setSelectedSemester(t.sem);
                    }}
                    className={`px-3 py-1.5 min-h-[36px] rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 border shadow-xs whitespace-nowrap shrink-0 ${
                      isActive
                        ? 'bg-amber-400 text-slate-950 border-amber-300 ring-2 ring-amber-300/40'
                        : 'bg-slate-900/90 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    <span>{t.label}</span>
                    {t.badge && (
                      <span
                        className={`text-[9.5px] px-1.5 py-0.5 rounded font-black uppercase ${
                          isActive
                            ? 'bg-slate-950 text-amber-300'
                            : t.year === '2018' && t.sem === '2'
                            ? 'bg-emerald-600 text-white animate-pulse'
                            : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {t.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          <span className="text-[11px] text-slate-400 font-semibold hidden md:inline shrink-0">
            የሚታየው፦ <strong>{selectedYear} ዓ.ም {selectedSemester}ኛ ሴሚስተር</strong>
          </span>
        </div>

        {/* Printable Transcript Document (A4 Optimized) */}
        <div className="flex-1 p-2.5 sm:p-6 bg-slate-100/60 overflow-x-auto overflow-y-auto print:max-h-none print:overflow-visible print:p-0">
          <div className="md:hidden text-[11px] font-bold text-slate-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5 mb-2 text-center no-print">
            ↔ ሰነዱን ሙሉ ለማየት ወደ ጎን እና ወደ ታች ያንሸራትቱ
          </div>
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
                ይፋዊ የ{selectedYear} ዓ.ም {selectedSemester}ኛ ሴሚስተር ትራንስክሪፕት (Official {selectedYear} Semester {selectedSemester} Transcript)
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
                <span className="font-bold text-slate-900">{selectedYear} ዓ.ም (እንደ ኢትዮጵያ ዘመን አቆጣጠር)</span>
              </p>
              <p>
                <span className="text-slate-500 font-normal">ሴሚስተር:</span>{' '}
                <span className="font-bold text-slate-900">{selectedSemester}ኛ ሴሚስተር</span>
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
                <td className="border border-slate-400 p-2.5 text-center font-mono text-sm">
                  {gradedCoursesCount > 0 ? gradedCredits : totalCredits}
                </td>
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
          <div className="border border-slate-300 rounded-xl p-3 mb-8 bg-slate-50 text-[10px] text-slate-700 avoid-break">
            <div className="flex items-center justify-between mb-1.5 border-b border-slate-200 pb-1">
              <span className="font-bold text-slate-900">ይፋዊ የ13-ደረጃ ውጤት መስፈርት (Official 13-Tier Grading Scale):</span>
              <span className="text-[9px] text-slate-500 font-medium">13ቱም የውጤት ደረጃዎች (ከ A+ እስከ F)</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 lg:grid-cols-13 gap-1.5 text-[9px]">
              {OFFICIAL_GRADING_SCALE.map((tier) => (
                <div key={tier.letter} className="bg-white px-1.5 py-1 rounded border border-slate-200 text-center shadow-2xs">
                  <span className="font-black text-slate-900 block">{tier.letter}</span>
                  <span className="text-slate-600 font-mono text-[8.5px] block">{tier.min}%–{tier.max}%</span>
                  <span className="text-slate-500 font-bold text-[8.5px] block">
                    {tier.points === 3.7 ? '3.7' : tier.points.toFixed(2)}
                  </span>
                </div>
              ))}
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
