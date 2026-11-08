import React, { useState, useMemo } from 'react';
import { X, Printer, ShieldCheck, Download, Loader2, Lock } from 'lucide-react';
import { Course, GradeBreakdown, OfficialSignaturesConfig, Student } from '../types.ts';
import { calculateGradeDetails, calculateStudentGPA, getCourseAssessmentItems, getEffectiveGradeValues, getGradeKey, resolveGradeBreakdown, is2018CandidateStudent, is2018DiplomaEntrant } from '../utils/gradeCalculations.ts';
import { OFFICIAL_GRADING_SCALE } from '../data/initialData.ts';
import { CHURCH_LOGO } from '../assets/logo.ts';
import { downloadElementAsPdf, printElementDirectly } from '../utils/pdfExport.ts';
import { loadHistorical2018Courses, getCurriculumForStudent, DIPLOMA_CURRICULUM } from '../data/curriculumCourses.ts';

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

  // Dynamic state for Academic Year and Semester so 2018 2nd Semester can be chosen and viewed
  const [selectedYear, setSelectedYear] = useState<string>(() => {
    if (initialYear) return initialYear;
    return isDip2018Entrant ? '2018' : '2019';
  });

  const [selectedSemester, setSelectedSemester] = useState<string>(() => {
    if (initialSemester) return initialSemester;
    return isDip2018Entrant ? '2' : (currentSemester || '1');
  });

  interface TermOption {
    year: string;
    sem: string;
    label: string;
    badge?: string;
  }

  const availableTerms: TermOption[] = useMemo(() => {
    if (isDip2018Entrant) {
      return [
        { year: '2018', sem: '1', label: '2018 ዓ.ም 1ኛ ሴሚስተር', badge: '1ኛ ዓመት' },
        { year: '2018', sem: '2', label: '2018 ዓ.ም 2ኛ ሴሚስተር', badge: '2ኛ ሴሚስተር' },
        { year: '2019', sem: '1', label: '2019 ዓ.ም 1ኛ ሴሚስተር', badge: '2ኛ ዓመት' },
        { year: '2019', sem: '2', label: '2019 ዓ.ም 2ኛ ሴሚስተር', badge: 'የምረቃ' }
      ];
    }
    if (student.program === 'Degree' && (student.degreeTrack === '2_YEAR' || student.priorDiploma)) {
      return [
        { year: '2018', sem: '1', label: '2018 ዓ.ም 1ኛ ሴሚስተር (ቅድመ-ዲፕሎማ)', badge: 'ዲፕሎማ' },
        { year: '2019', sem: '1', label: '2019 ዓ.ም 1ኛ ሴሚስተር', badge: 'ድግሪ' },
        { year: '2019', sem: '2', label: '2019 ዓ.ም 2ኛ ሴሚስተር', badge: 'ድግሪ' }
      ];
    }
    // Default 1st Year (2019 entrants): Only 2019 1st & 2nd Semesters! 2018 courses are strictly omitted.
    return [
      { year: '2019', sem: '1', label: '2019 ዓ.ም 1ኛ ሴሚስተር' },
      { year: '2019', sem: '2', label: '2019 ዓ.ም 2ኛ ሴሚስተር' }
    ];
  }, [student, isDip2018Entrant]);

  const studentCourses = useMemo(() => {
    if (is2019Entrant && selectedYear !== '2019') {
      // 2019 entrants (Diploma & Degree) have NO courses outside 2019 academic year!
      return [];
    }

    if (selectedYear === '2018') {
      if (student.program === 'Diploma') {
        if (!isDip2018Entrant) {
          // Non-2018 Diploma entrants do NOT have 2018 courses!
          return [];
        }
        const historical = loadHistorical2018Courses();
        if (selectedSemester === '2') {
          // Official 7 courses of 2018 2nd Semester
          const defaultSem2 = DIPLOMA_CURRICULUM[1]?.courses || [];
          const map = new Map<string, Course>();
          defaultSem2.forEach((c) => {
            map.set(c.name.trim(), {
              id: c.id,
              code: c.code,
              name: c.name,
              teacher: c.teacher,
              credits: c.credits,
              program: 'Diploma',
              academicYear: '2018',
              semester: '2',
              schedule: '2018 ዓ.ም — 2ኛ ሴሚስተር'
            });
          });
          historical
            .filter((c) => (c.program === 'Diploma' || !c.program) && (c.semester === '2' || c.id.includes('sem2') || c.schedule?.includes('2ኛ')))
            .forEach((c) => {
              if (!map.has(c.name.trim())) {
                map.set(c.name.trim(), c);
              }
            });
          return Array.from(map.values());
        }

        // Official 6 courses of 2018 1st Semester
        const defaultSem1 = DIPLOMA_CURRICULUM[0]?.courses || [];
        const map = new Map<string, Course>();
        defaultSem1.forEach((c) => {
          map.set(c.name.trim(), {
            id: c.id,
            code: c.code,
            name: c.name,
            teacher: c.teacher,
            credits: c.credits,
            program: 'Diploma',
            academicYear: '2018',
            semester: '1',
            schedule: '2018 ዓ.ም — 1ኛ ሴሚስተር'
          });
        });
        historical
          .filter((c) => (c.program === 'Diploma' || !c.program) && (c.semester === '1' || c.id.includes('sem1') || !c.semester))
          .forEach((c) => {
            if (!map.has(c.name.trim())) {
              map.set(c.name.trim(), c);
            }
          });
        return Array.from(map.values());
      } else {
        const curriculum = getCurriculumForStudent(student);
        const semIdx = selectedSemester === '2' ? 1 : 0;
        const semCourses = curriculum[semIdx]?.courses || [];
        return semCourses.map((c) => ({
          id: c.id,
          code: c.code,
          name: c.name,
          credits: c.credits,
          teacher: c.teacher,
          program: 'Degree' as const,
          academicYear: '2018',
          semester: selectedSemester,
          schedule: `2018 ዓ.ም — ${selectedSemester}ኛ ሴሚስተር`
        }));
      }
    }

    // 2019 Courses for Diploma & Degree 2019 entrants
    return courses.filter((c) => {
      if (c.program !== student.program) return false;
      if (is2019Entrant || !isCandidate) {
        if (
          c.academicYear === '2018' ||
          c.id.includes('2018') ||
          c.id.startsWith('dip_sem1') ||
          c.id.startsWith('dip_sem2') ||
          c.id.startsWith('dip_2018_sem') ||
          c.id.startsWith('deg_p') ||
          (c.schedule && c.schedule.includes('2018'))
        ) {
          return false;
        }
      }
      const cYear = c.academicYear || (c.schedule && c.schedule.includes('2018') ? '2018' : '2019');
      if (cYear !== selectedYear) return false;

      if (c.semester && selectedSemester && c.semester !== selectedSemester) {
        return false;
      }
      return true;
    });
  }, [courses, student, isCandidate, isDip2018Entrant, is2019Entrant, selectedYear, selectedSemester]);

  const gpa = calculateStudentGPA(
    student,
    selectedYear === '2018' ? (student.program === 'Diploma' ? studentCourses : courses.filter((c) => c.program === 'Degree')) : courses,
    grades,
    selectedYear,
    selectedSemester
  );

  let totalCredits = 0;
  let totalGradePoints = 0;
  let gradedCoursesCount = 0;

  const courseRows = studentCourses.map((c, idx) => {
    const g = resolveGradeBreakdown(grades, student.uid, c.id, selectedYear, selectedSemester, student.id);
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

        {/* Dynamic Semester Switcher Bar (Quickly switch to 2018 2nd Sem, 2018 1st Sem, etc.) */}
        <div className="bg-slate-800 text-slate-200 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-700 text-xs no-print">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-amber-400 font-bold text-xs flex items-center gap-1">
              <span>📅 የትራንስክሪፕት ሴሚስተር ምረጥ፦</span>
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
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
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 border shadow-xs ${
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
          <span className="text-[11px] text-slate-400 font-semibold hidden md:inline">
            የሚታየው፦ <strong>{selectedYear} ዓ.ም {selectedSemester}ኛ ሴሚስተር</strong>
          </span>
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
