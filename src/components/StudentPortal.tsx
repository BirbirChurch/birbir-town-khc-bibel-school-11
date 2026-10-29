import React, { useState, useMemo } from 'react';
import {
  User,
  Award,
  Calendar,
  BookOpen,
  Clock,
  Printer,
  AlertTriangle,
  CheckCircle2,
  Bookmark,
  GraduationCap,
  Lock,
  Unlock,
  Sparkles,
  ShieldCheck,
  FileText
} from 'lucide-react';
import { Course, GradeBreakdown, OfficialSignaturesConfig, SemesterReleaseConfig, Student } from '../types.ts';
import {
  calculateGradeDetails,
  calculateStudentGPA,
  getCourseAssessmentItems,
  getEffectiveGradeValues,
  getGradeKey,
  is2018CandidateStudent,
  resolveGradeBreakdown
} from '../utils/gradeCalculations.ts';
import { GraduationTranscriptModal } from './GraduationTranscriptModal.tsx';
import { DIPLOMA_CURRICULUM, getCurriculumForStudent, loadHistorical2018Courses } from '../data/curriculumCourses.ts';
import { OFFICIAL_GRADING_SCALE } from '../data/initialData.ts';

interface StudentPortalProps {
  student: Student;
  courses: Course[];
  grades: Record<string, GradeBreakdown>;
  photoUrl?: string;
  currentYear: string;
  currentSemester: string;
  gradePublished: boolean;
  semesterRelease?: SemesterReleaseConfig;
  individualGradeRelease?: Record<string, boolean>;
  studentPdfPrintAllowed?: boolean;
  individualPdfPrintAllowed?: Record<string, boolean>;
  fullTranscriptPublished?: boolean;
  individualFullTranscriptRelease?: Record<string, boolean>;
  officialConfig?: OfficialSignaturesConfig;
  churchLogo?: string;
  onOpenTranscript: () => void;
}

export const StudentPortal: React.FC<StudentPortalProps> = ({
  student,
  courses,
  grades,
  photoUrl,
  currentYear,
  currentSemester,
  gradePublished,
  semesterRelease,
  individualGradeRelease,
  studentPdfPrintAllowed = false,
  individualPdfPrintAllowed,
  fullTranscriptPublished = false,
  individualFullTranscriptRelease,
  officialConfig,
  churchLogo,
  onOpenTranscript
}) => {
  const [showGraduationTranscript, setShowGraduationTranscript] = useState(false);

  // Check if grade/transcript release is authorized for this specific student
  const isStudentReleased = (
    individualGradeRelease && individualGradeRelease[student.uid] !== undefined
      ? individualGradeRelease[student.uid]
      : gradePublished
  ) === true;

  // 10 Diploma students admitted in 2018 (በዚህ ዓመት ተመራቂ የሆኑ 10 ተማሪዎች)
  const is2018DiplomaEntrant =
    student.program === 'Diploma' &&
    (student.admissionYear === '2018' ||
      (student.id && student.id.startsWith('2018')) ||
      student.currentStudyYear === 2 ||
      student.graduationStatus === 'CANDIDATE');

  // Available tabs defined strictly according to college regulations
  // Graduating students: 2018 Sem 1, 2018 Sem 2, 2019 Sem 1, 2019 Sem 2, and Combined 4-Sem Transcript
  // 1st Year (Degree & Diploma): 2019 Sem 1 (and 2019 Sem 2 when enabled by Dean/Admin)
  const availableTabs = useMemo(() => {
    if (is2018DiplomaEntrant) {
      return [
        { id: '2018_1', year: '2018', sem: '1', label: '2018 ዓ/ም 1ኛ ሴሚስተር', isCumulative: false },
        { id: '2018_2', year: '2018', sem: '2', label: '2018 ዓ/ም 2ኛ ሴሚስተር', isCumulative: false },
        { id: '2019_1', year: '2019', sem: '1', label: '2019 ዓ/ም 1ኛ ሴሚስተር', isCumulative: false },
        { id: '2019_2', year: '2019', sem: '2', label: '2019 ዓ/ም 2ኛ ሴሚስተር', isCumulative: false },
        { id: 'cumulative', year: 'ALL', sem: 'ALL', label: 'የአራቱ ሰሚስተር ውጤት በአንድ ላይ (ጥምር)', isCumulative: true }
      ];
    }

    // 1st-Year Students (Both Degree & Diploma): 2019 1st Semester
    const firstYearTabs = [
      { id: '2019_1', year: '2019', sem: '1', label: '2019 ዓ/ም 1ኛ ሴሚስተር', isCumulative: false }
    ];

    // Show 2nd semester only when Dean or Admin has enabled it
    const isSem2Enabled = currentSemester === '2' || (semesterRelease && semesterRelease['2019_2'] === true);
    if (isSem2Enabled) {
      firstYearTabs.push({ id: '2019_2', year: '2019', sem: '2', label: '2019 ዓ/ም 2ኛ ሴሚስተር', isCumulative: false });
    }

    return firstYearTabs;
  }, [is2018DiplomaEntrant, currentSemester, semesterRelease]);

  // Active Tab state
  const [activeTabId, setActiveTabId] = useState<string>(() => {
    return is2018DiplomaEntrant ? '2019_1' : '2019_1';
  });

  const activeTab = availableTabs.find((t) => t.id === activeTabId) || availableTabs[0];
  const activeYear = activeTab.year;
  const activeSem = activeTab.sem;

  // Granular Release check for this specific tab/semester
  const isCurrentTabReleased = useMemo(() => {
    if (!isStudentReleased) return false;
    if (!semesterRelease) return gradePublished;
    if (semesterRelease.all) return true;

    if (activeTab.isCumulative) {
      return semesterRelease.cumulative !== undefined ? semesterRelease.cumulative : true;
    }

    const key = `${activeYear}_${activeSem}`;
    if (semesterRelease[key] !== undefined) {
      return semesterRelease[key];
    }

    return gradePublished;
  }, [isStudentReleased, semesterRelease, activeTab, activeYear, activeSem, gradePublished]);

  // Combine active courses with historical 2018 courses for 2018 Diploma entrants
  const studentCourses = useMemo(() => {
    if (activeYear === '2018') {
      const historical = loadHistorical2018Courses();
      return historical.filter((c) => c.program === 'Diploma' && (c.semester === activeSem || !c.semester));
    }

    if (activeYear === '2019') {
      const live = courses.filter((c) => {
        if (c.program !== student.program) return false;
        if (c.academicYear === '2018' || c.id.startsWith('dip_sem1') || c.id.startsWith('dip_sem2') || c.id.startsWith('deg_p')) {
          return false;
        }
        if (c.semester && c.semester !== activeSem) {
          return false;
        }
        return true;
      });

      if (live.length > 0) return live;

      // Fallback for 2019 Semester 2 if not yet manually seeded in courses
      if (activeSem === '2') {
        if (is2018DiplomaEntrant) {
          return DIPLOMA_CURRICULUM[3].courses.map((c) => ({
            id: c.id,
            code: c.code,
            name: c.name,
            credits: c.credits,
            teacher: c.teacher,
            program: 'Diploma' as const,
            academicYear: '2019',
            semester: '2',
            schedule: '2019 ዓ.ም — 2ኛ ሴሚስተር'
          }));
        } else {
          const cur = getCurriculumForStudent(student);
          const sem2Courses = cur[1]?.courses || [];
          return sem2Courses.map((c) => ({
            id: c.id,
            code: c.code,
            name: c.name,
            credits: c.credits,
            teacher: c.teacher,
            program: student.program,
            academicYear: '2019',
            semester: '2',
            schedule: '2019 ዓ.ም — 2ኛ ሴሚስተር'
          }));
        }
      }

      return live;
    }

    return [];
  }, [courses, student.program, activeYear, activeSem, is2018DiplomaEntrant, student]);

  // Current semester GPA calculation
  const currentSemesterGPA = useMemo(() => {
    if (activeTab.isCumulative) return '0.00';
    const coursesList = activeYear === '2018' ? loadHistorical2018Courses() : courses;
    return calculateStudentGPA(student, coursesList, grades, activeYear, activeSem);
  }, [student, courses, grades, activeYear, activeSem, activeTab]);

  // Check if PDF print is allowed for this student
  const isPdfPrintAllowed = (
    individualPdfPrintAllowed && individualPdfPrintAllowed[student.uid] !== undefined
      ? individualPdfPrintAllowed[student.uid]
      : studentPdfPrintAllowed
  ) === true;

  // 4-Semester Cumulative Transcript data calculation for graduating students
  const cumulativeData = useMemo(() => {
    if (!is2018DiplomaEntrant) return null;

    const historical = loadHistorical2018Courses();
    const sem1_2018 = historical.filter((c) => c.program === 'Diploma' && (c.semester === '1' || c.id.startsWith('dip_sem1')));
    const sem2_2018 = historical.filter((c) => c.program === 'Diploma' && (c.semester === '2' || c.id.startsWith('dip_sem2')));
    const sem1_2019 = courses.filter((c) => c.program === 'Diploma' && (c.semester === '1' || !c.semester) && c.academicYear !== '2018');
    const sem2_2019 = courses.filter((c) => c.program === 'Diploma' && c.semester === '2');

    const sem2CoursesFinal = sem2_2019.length > 0 ? sem2_2019 : DIPLOMA_CURRICULUM[3].courses.map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      credits: c.credits,
      teacher: c.teacher,
      program: 'Diploma' as const,
      academicYear: '2019',
      semester: '2',
      schedule: '2019 ዓ.ም — 2ኛ ሴሚስተር'
    }));

    const semesters = [
      { id: '2018_1', label: '1ኛ ዓመት — 1ኛ ሴሚስተር (2018 ዓ.ም)', year: '2018', sem: '1', courses: sem1_2018 },
      { id: '2018_2', label: '1ኛ ዓመት — 2ኛ ሴሚስተር (2018 ዓ.ም)', year: '2018', sem: '2', courses: sem2_2018 },
      { id: '2019_1', label: '2ኛ ዓመት — 1ኛ ሴሚስተር (2019 ዓ.ም)', year: '2019', sem: '1', courses: sem1_2019 },
      { id: '2019_2', label: '2ኛ ዓመት — 2ኛ ሴሚስተር (2019 ዓ.ም — የምረቃ ሴሚስተር)', year: '2019', sem: '2', courses: sem2CoursesFinal }
    ];

    let grandTotalCredits = 0;
    let grandQualityPoints = 0;

    const computedSemesters = semesters.map((s) => {
      let semCredits = 0;
      let semPoints = 0;

      const rows = s.courses.map((c) => {
        const breakdown = resolveGradeBreakdown(grades, student.uid, c.id, s.year, s.sem, student.id);
        const eff = getEffectiveGradeValues(breakdown, getCourseAssessmentItems(c));

        if (eff.hasAny) {
          semCredits += c.credits;
          semPoints += eff.points * c.credits;
        }

        return {
          id: c.id,
          code: c.code || 'DIP-100',
          name: c.name,
          credits: c.credits,
          teacher: c.teacher,
          score: eff.hasAny ? eff.total : 0,
          letter: eff.hasAny ? eff.letter : '—',
          points: eff.hasAny ? eff.points : 0,
          desc: eff.hasAny ? eff.desc : 'አልተሞላም',
          hasGrade: eff.hasAny
        };
      });

      grandTotalCredits += semCredits;
      grandQualityPoints += semPoints;

      const semGPA = semCredits > 0 ? (semPoints / semCredits).toFixed(2) : '0.00';

      return {
        ...s,
        rows,
        semCredits,
        semPoints,
        semGPA
      };
    });

    const cgpaNum = grandTotalCredits > 0 ? grandQualityPoints / grandTotalCredits : 0;
    const cgpa = cgpaNum.toFixed(2);

    let standing = 'ጥሩ አቋም';
    if (cgpaNum >= 3.75) standing = 'በከፍተኛ ማዕረግ (Very Great Distinction) 🏆';
    else if (cgpaNum >= 3.5) standing = 'በማዕረግ (Great Distinction) ⭐';
    else if (cgpaNum >= 3.0) standing = 'ጥሩ ማዕረግ (Distinction)';

    return {
      computedSemesters,
      grandTotalCredits,
      grandQualityPoints,
      cgpa,
      standing
    };
  }, [is2018DiplomaEntrant, courses, grades, student]);

  return (
    <div className="space-y-6 no-print">
      {/* Student Profile & GPA Hero Card */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200/80 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-amber-400 shadow-md bg-emerald-800 flex-shrink-0 flex items-center justify-center text-white text-2xl font-bold">
            {photoUrl ? (
              <img src={photoUrl} alt={student.name} className="w-full h-full object-cover" />
            ) : (
              <span>{student.name.charAt(0)}</span>
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-800">{student.name}</h2>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  student.program === 'Degree'
                    ? 'bg-indigo-100 text-indigo-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {student.program === 'Degree' ? 'የድግሪ ፕሮግራም' : 'የዲፕሎማ ፕሮግራም'}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                is2018DiplomaEntrant ? 'bg-amber-100 text-amber-950 border border-amber-300 font-extrabold' : 'bg-slate-100 text-slate-700'
              }`}>
                {is2018DiplomaEntrant ? '2ኛ ዓመት (ተመራቂ ዕጩ)' : '1ኛ ዓመት (2019 ዓ.ም ጀማሪ)'}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                is2018DiplomaEntrant ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-slate-100 text-slate-600'
              }`}>
                {is2018DiplomaEntrant ? '🎓 ተመራቂ (4 ሴሚስተር)' : '📚 በመማር ላይ (1ኛ ሴሚስተር)'}
              </span>
            </div>
            <p className="text-xs text-slate-600 font-semibold mt-1.5 flex flex-wrap items-center gap-2">
              <span>መለያ ኮድ: <strong className="font-mono text-slate-900 bg-slate-100 px-2 py-0.5 rounded">{student.id}</strong></span>
              <span>| ጾታ: <strong>{student.gender}</strong></span>
              <span>| መንገድ: <strong>{student.program === 'Diploma' ? (is2018DiplomaEntrant ? 'የ2 ዓመት ዲፕሎማ ተመራቂ (4 ሴሚስተር)' : 'የዲፕሎማ መደበኛ 1ኛ ዓመት') : 'የ2019 ዓ.ም ድግሪ 1ኛ ዓመት'}</strong></span>
            </p>
            <p className="text-[11px] text-emerald-800 font-bold mt-1">
              🇪🇹 የሚመለከቱት፦ {activeTab.label}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-between md:justify-end">
          {isStudentReleased && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onOpenTranscript}
                className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs px-3.5 py-2.5 rounded-xl font-bold shadow-sm transition-all cursor-pointer"
                title="የሴሚስተር ትራንስክሪፕት ሰነድ ይመልከቱ"
              >
                <Printer className="w-4 h-4 text-amber-400" />
                <span>የሴሚስተር ትራንስክሪፕት</span>
              </button>

              {is2018DiplomaEntrant && (
                <button
                  type="button"
                  onClick={() => setShowGraduationTranscript(true)}
                  className="inline-flex items-center gap-1.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs px-3.5 py-2.5 rounded-xl font-bold shadow-sm transition-all cursor-pointer"
                  title="የተማሩበትን ሙሉ 4 ሴሚስተር የምረቃ ትራንስክሪፕት በአንድ ላይ ይመልከቱ"
                >
                  <GraduationCap className="w-4 h-4 text-amber-300" />
                  <span>ሙሉ የምረቃ ትራንስክሪፕት</span>
                </button>
              )}
            </div>
          )}

          <div className="bg-gradient-to-br from-amber-50 to-amber-100/70 border border-amber-300 rounded-2xl p-3 text-center min-w-[130px] shadow-xs">
            <span className="block text-[10px] uppercase font-bold text-amber-800 tracking-wider">
              {activeTab.isCumulative ? 'ድምር CGPA (4 ሴሚስተር)' : `የሴሚስተሩ GPA (${activeYear}/${activeSem})`}
            </span>
            <span className="text-2xl sm:text-3xl font-black text-amber-950 font-mono">
              {!isCurrentTabReleased ? '🔒 ***' : activeTab.isCumulative ? (cumulativeData?.cgpa || '0.00') : currentSemesterGPA}
            </span>
          </div>
        </div>
      </div>

      {/* Global Grade Release Hold Notice */}
      {!isStudentReleased && (
        <div className="bg-rose-50 border-2 border-rose-300 text-rose-950 p-4 rounded-2xl text-xs flex items-start gap-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-extrabold text-sm text-rose-900 flex items-center gap-1.5">
              <span>🔒 የእርሶ ውጤትና ትራንስክሪፕት ለጊዜው አልተለቀቀም / ታግዷል</span>
              <span className="bg-rose-200 text-rose-950 px-2 py-0.5 rounded text-[10px] font-mono">RELEASE HELD</span>
            </p>
            <p className="text-rose-800 font-medium">
              የዚህ ሴሚስተር ውጤትና የትራንስክሪፕት ሰነዶች በኃላፊነት ባላቸው አካላት (በዋና አድሚን፣ በዋና ዲን እና በሪጅስተራል) ተረጋግጠው በይፋ እስኪፈቀዱ ድረስ ተሰውረዋል። እባክዎን በጽሕፈት ቤት በኩል ይፋ እስኪደረግ ይታገሱ።
            </p>
          </div>
        </div>
      )}

      {/* Interactive Semester Selection Navigation Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-3xl shadow-sm border border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-700 px-1 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-amber-600" />
            <span>ሴሚስተር ይምረጡ፦</span>
          </span>

          {availableTabs.map((tab) => {
            const isActive = activeTabId === tab.id;
            const isTabPermitted = isStudentReleased && (
              !semesterRelease ||
              semesterRelease.all ||
              (tab.isCumulative
                ? semesterRelease.cumulative !== undefined ? semesterRelease.cumulative : true
                : semesterRelease[`${tab.year}_${tab.sem}`] !== undefined ? semesterRelease[`${tab.year}_${tab.sem}`] : gradePublished)
            );

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTabId(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-emerald-800 text-white shadow-sm ring-2 ring-emerald-600'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-200/70 border border-slate-300'
                }`}
              >
                {tab.isCumulative && <GraduationCap className="w-4 h-4 text-amber-300" />}
                <span>{tab.label}</span>
                {!isTabPermitted && <Lock className="w-3 h-3 text-amber-400 opacity-90" />}
              </button>
            );
          })}
        </div>

        {is2018DiplomaEntrant && (
          <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-300">
            🎓 4ቱ ሴሚስተሮች ለ2018 ተመራቂዎች ተከፍተዋል
          </span>
        )}
      </div>

      {/* Main Body: Either Cumulative 4-Semester View OR Individual Semester View */}
      {activeTab.isCumulative ? (
        /* CUMULATIVE 4-SEMESTER TRANSCRIPT VIEW (የአራቱ ሰሚስተር ውጤት በአንድ ላይ) */
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-100 rounded-2xl text-amber-900">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                  <span>የአራቱም ሴሚስተር ጥምር የትምህርት ውጤት (4-Semester Cumulative Transcript)</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-900 px-2.5 py-0.5 rounded-full font-bold">
                    ይፋዊ ማጠቃለያ
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  የ2018 ዓ.ም (1ኛ እና 2ኛ ሴሚስተር) እና የ2019 ዓ.ም (1ኛ እና 2ኛ ሴሚስተር) ውጤቶች በአንድ ላይ
                </p>
              </div>
            </div>

            {isCurrentTabReleased && (
              <button
                type="button"
                onClick={() => setShowGraduationTranscript(true)}
                className="inline-flex items-center gap-1.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs px-4 py-2.5 rounded-xl font-bold shadow-sm transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4 text-amber-300" />
                <span>ይፋዊ የምረቃ ትራንስክሪፕት ሰነድ አትም / ፒዲኤፍ</span>
              </button>
            )}
          </div>

          {!isCurrentTabReleased ? (
            /* Locked notification when Dean/Admin holds release */
            <div className="bg-amber-50 border-2 border-amber-300 text-amber-950 p-8 rounded-3xl text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-amber-100 flex items-center justify-center text-amber-800 shadow-inner">
                <Lock className="w-7 h-7" />
              </div>
              <h4 className="font-black text-base sm:text-lg text-amber-950">
                🔒 የአራቱም ሴሚስተር ጥምር የምረቃ ውጤት በዋና ዲን / አድሚን ገና አልተፈቀደም
              </h4>
              <p className="text-xs text-amber-800 max-w-lg mx-auto leading-relaxed">
                የተመራቂ ተማሪዎች ሙሉ የ4 ሴሚስተር ጥምር ውጤትና ይፋዊ ማጠቃለያ በዲንና በአድሚን እስኪለቀቅ ድረስ ተሰውሯል። እባክዎን በጽሕፈት ቤት በኩል ይፋ እስኪደረግ በትዕግሥት ይጠብቁ።
              </p>
            </div>
          ) : (
            /* Render all 4 semester tables */
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {cumulativeData?.computedSemesters.map((sem) => (
                  <div
                    key={sem.id}
                    className="rounded-2xl border border-slate-200 overflow-hidden shadow-2xs flex flex-col justify-between"
                  >
                    <div className="bg-slate-100/90 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                      <span className="font-black text-xs text-slate-800">{sem.label}</span>
                      <span className="text-[11px] font-mono font-black text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                        SGPA: {sem.semGPA}
                      </span>
                    </div>

                    <div className="overflow-x-auto p-2">
                      <table className="w-full text-left text-xs">
                        <thead className="text-[10px] uppercase text-slate-500 font-bold bg-slate-50 border-b">
                          <tr>
                            <th className="p-2">ኮርስ</th>
                            <th className="p-2 text-center">ክሬዲት</th>
                            <th className="p-2 text-center">ውጤት</th>
                            <th className="p-2 text-center">ደረጃ</th>
                            <th className="p-2 text-center">ነጥብ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {sem.rows.map((r, idx) => (
                            <tr key={r.id || idx} className="hover:bg-slate-50/60">
                              <td className="p-2">
                                <span className="font-bold text-slate-900 block truncate max-w-[180px]">{r.name}</span>
                                <span className="font-mono text-[10px] text-slate-400">{r.code}</span>
                              </td>
                              <td className="p-2 text-center font-mono font-bold text-slate-600">{r.credits}</td>
                              <td className="p-2 text-center font-mono font-black text-slate-800">{r.hasGrade ? r.score : '—'}</td>
                              <td className="p-2 text-center font-black text-emerald-800">{r.hasGrade ? r.letter : '—'}</td>
                              <td className="p-2 text-center font-mono font-bold text-slate-700">{r.hasGrade ? r.points : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="bg-slate-50 px-4 py-2 border-t text-[11px] flex justify-between items-center text-slate-600">
                      <span>የሴሚስተሩ ክሬዲት ድምር: <strong>{sem.semCredits}</strong></span>
                      <span>የጥራት ነጥብ: <strong>{sem.semPoints.toFixed(1)}</strong></span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Grand Cumulative Academic Standing Card */}
              <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 shadow-md border border-emerald-800 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="space-y-1.5 text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start gap-2 text-amber-300 text-xs font-black">
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    <span>የተመራቂው ጠቅላላ የምረቃ ማጠቃለያ (Cumulative Summary)</span>
                  </div>
                  <h4 className="text-xl sm:text-2xl font-black text-white">
                    {student.name} ({student.id})
                  </h4>
                  <p className="text-xs text-emerald-200">
                    የምረቃ ማዕረግ፦ <strong className="text-amber-300 text-sm">{cumulativeData?.standing}</strong>
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3">
                  <div className="bg-white/10 rounded-2xl p-3 text-center min-w-[100px] backdrop-blur-xs border border-white/10">
                    <span className="block text-[10px] text-emerald-200 font-bold uppercase">ጠቅላላ ክሬዲት</span>
                    <span className="text-xl font-mono font-black text-white">{cumulativeData?.grandTotalCredits}</span>
                  </div>

                  <div className="bg-white/10 rounded-2xl p-3 text-center min-w-[100px] backdrop-blur-xs border border-white/10">
                    <span className="block text-[10px] text-emerald-200 font-bold uppercase">ድምር ነጥብ</span>
                    <span className="text-xl font-mono font-black text-white">{cumulativeData?.grandQualityPoints.toFixed(1)}</span>
                  </div>

                  <div className="bg-amber-400 rounded-2xl p-3 text-center min-w-[110px] shadow-md text-slate-950">
                    <span className="block text-[10px] font-black uppercase tracking-wider text-slate-900">ድምር CGPA</span>
                    <span className="text-2xl sm:text-3xl font-mono font-black text-slate-950">{cumulativeData?.cgpa}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* INDIVIDUAL SEMESTER GRADE REPORT VIEW */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-3">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-700" />
                <span>የ{activeTab.label} የትምህርት ውጤት (Grade Report)</span>
              </h3>
              <span className="text-xs font-mono text-slate-500">{studentCourses.length} ኮርሶች</span>
            </div>

            {!isCurrentTabReleased ? (
              /* Locked Notice for this individual semester */
              <div className="bg-amber-50 border-2 border-amber-300 text-amber-950 p-6 rounded-2xl text-center space-y-2">
                <div className="w-10 h-10 mx-auto rounded-full bg-amber-100 flex items-center justify-center text-amber-800">
                  <Lock className="w-5 h-5" />
                </div>
                <h4 className="font-black text-sm text-amber-950">
                  🔒 የ{activeTab.label} ውጤት በዋና ዲን / አድሚን ገና አልተፈቀደም
                </h4>
                <p className="text-xs text-amber-800 max-w-md mx-auto">
                  የዚህ ሴሚስተር ውጤት በይፋ ተረጋግጦ በዲንና በአድሚን እስኪለቀቅ ድረስ ተሰውሯል።
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[11px] rounded-lg">
                    <tr>
                      <th className="p-3">ተ.ቁ</th>
                      <th className="p-3">የኮርስ ስም</th>
                      <th className="p-3">ቀን / ሰሌዳ</th>
                      <th className="p-3">የተመደበ መምህር</th>
                      <th className="p-3 text-center">ውጤት</th>
                      <th className="p-3 text-center">ፊደል ደረጃ</th>
                      <th className="p-3 text-center">ትርጉም</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {studentCourses.map((c, idx) => {
                      const g = resolveGradeBreakdown(grades, student.uid, c.id, activeYear, activeSem, student.id);
                      const eff = getEffectiveGradeValues(g, getCourseAssessmentItems(c));

                      return (
                        <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3 font-mono font-bold text-slate-400">{idx + 1}</td>
                          <td className="p-3 font-bold text-slate-900">{c.name}</td>
                          <td className="p-3 text-amber-900 font-medium bg-amber-50/50 rounded">{c.schedule}</td>
                          <td className="p-3 text-slate-600 font-semibold">{c.teacher}</td>
                          <td className="p-3 text-center font-black font-mono">
                            {eff.hasAny ? eff.total : '—'}
                          </td>
                          <td className="p-3 text-center font-black text-emerald-800 text-sm">
                            {eff.hasAny ? eff.letter : '—'}
                          </td>
                          <td className="p-3 text-center text-[10px] text-slate-500 font-medium">
                            {eff.hasAny ? eff.desc : 'አልተሞላም'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Timetable / Schedule */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 space-y-4">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b pb-3">
                <Calendar className="w-5 h-5 text-amber-600" />
                <span>የኮርሶች የቀን ሰሌዳ (Course Schedule)</span>
              </h3>

              <div className="space-y-3">
                {studentCourses.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 hover:border-emerald-300 transition-colors"
                  >
                    <p className="font-bold text-xs text-slate-800">{c.name}</p>
                    <div className="flex items-center gap-1.5 text-[11px] text-amber-900 font-semibold mt-1">
                      <Clock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                      <span>{c.schedule || 'አልተወሰነም'}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 font-medium">መምህር: {c.teacher}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Student Guidance Motto */}
            <div className="bg-gradient-to-br from-emerald-900 to-slate-900 text-white rounded-3xl p-6 shadow-sm border border-emerald-800 space-y-2 relative overflow-hidden">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                <Award className="w-4 h-4 text-amber-400" />
                <span>የተማሪዎች መንፈሳዊ መመሪያ</span>
              </div>
              <p className="text-xs text-emerald-100 leading-relaxed font-sans">
                በትምህርት ወቅት በትጋት፣ በጸሎትና በአክብሮት በመገኘት የቤተ ክርስቲያንን አደራ በታማኝነት መወጣት ይገባል።
              </p>
              <p className="text-[11px] text-amber-300/90 font-medium pt-1">
                የብርብር ከተማ ቃለ ሕይወት ቤተ ክርስቲያን መጽሐፍ ቅዱስ ትምህርት ቤት
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Complete Consolidated Graduation Transcript Modal */}
      {showGraduationTranscript && (
        <GraduationTranscriptModal
          student={student}
          allCourses={courses}
          grades={grades}
          currentYear={currentYear}
          currentSemester={currentSemester}
          officialConfig={officialConfig}
          churchLogo={churchLogo}
          allowPdfPrint={isPdfPrintAllowed}
          isStudentViewer={true}
          onClose={() => setShowGraduationTranscript(false)}
        />
      )}
    </div>
  );
};
