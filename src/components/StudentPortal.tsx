import React, { useState, useMemo, useEffect } from 'react';
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
  FileText,
  Search,
  ChevronLeft,
  ChevronRight,
  Users,
  X,
  Eye
} from 'lucide-react';
import { Course, GradeBreakdown, OfficialSignaturesConfig, SemesterReleaseConfig, Student } from '../types.ts';
import {
  calculateStudentGPA,
  getCourseAssessmentItems,
  getEffectiveGradeValues,
  is2018CandidateStudent,
  normalizeCourseAliasId,
  resolveGradeBreakdown
} from '../utils/gradeCalculations.ts';
import { GraduationTranscriptModal } from './GraduationTranscriptModal.tsx';
import { DIPLOMA_CURRICULUM, getCurriculumForStudent, loadHistorical2018Courses, getDeletedCourseIdsSet } from '../data/curriculumCourses.ts';
import { OFFICIAL_GRADING_SCALE } from '../data/initialData.ts';
import {
  useLanguage,
  formatProgram,
  formatGender,
  formatGradeDesc,
  formatCourseTitle,
  formatSchedule,
  formatTeacherDisplay,
  formatCalendarYear,
  formatSemester
} from '../utils/i18n.tsx';

interface StudentPortalProps {
  student: Student;
  allStudents?: Student[];
  photos?: Record<string, string>;
  isAdminViewer?: boolean;
  onSelectStudent?: (uid: string) => void;
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
  onOpenTranscript: (year?: string, sem?: string) => void;
}

export const StudentPortal: React.FC<StudentPortalProps> = ({
  student,
  allStudents,
  photos,
  isAdminViewer = false,
  onSelectStudent,
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
  const { lang, t } = useLanguage();
  const [showGraduationTranscript, setShowGraduationTranscript] = useState(false);
  const [adminProgramFilter, setAdminProgramFilter] = useState<'ALL' | 'Diploma' | 'Degree'>('ALL');
  const [adminSearchTerm, setAdminSearchTerm] = useState('');
  const [showAdminDirectory, setShowAdminDirectory] = useState(false);

  // Close graduation transcript preview when switching students
  useEffect(() => {
    setShowGraduationTranscript(false);
  }, [student.uid]);

  const adminCounts = useMemo(() => {
    const list = allStudents || [];
    return {
      all: list.length,
      diploma: list.filter((s) => s.program === 'Diploma').length,
      degree: list.filter((s) => s.program === 'Degree').length
    };
  }, [allStudents]);

  const filteredAdminStudents = useMemo(() => {
    if (!isAdminViewer || !allStudents) return [];
    const q = adminSearchTerm.trim().toLowerCase();
    return allStudents.filter((s) => {
      if (adminProgramFilter !== 'ALL' && s.program !== adminProgramFilter) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q) ||
        (s.program === 'Diploma' ? 'ዲፕሎማ diploma' : 'ድግሪ degree').includes(q)
      );
    });
  }, [isAdminViewer, allStudents, adminProgramFilter, adminSearchTerm]);

  const currentAdminIndex = filteredAdminStudents.findIndex((s) => s.uid === student.uid);

  const handleSelectPrevStudent = () => {
    if (!onSelectStudent || filteredAdminStudents.length === 0) return;
    const prevIdx = currentAdminIndex > 0 ? currentAdminIndex - 1 : filteredAdminStudents.length - 1;
    onSelectStudent(filteredAdminStudents[prevIdx].uid);
  };

  const handleSelectNextStudent = () => {
    if (!onSelectStudent || filteredAdminStudents.length === 0) return;
    const nextIdx =
      currentAdminIndex >= 0 && currentAdminIndex < filteredAdminStudents.length - 1 ? currentAdminIndex + 1 : 0;
    onSelectStudent(filteredAdminStudents[nextIdx].uid);
  };

  const handleAdminProgramFilterChange = (program: 'ALL' | 'Diploma' | 'Degree') => {
    setAdminProgramFilter(program);
    if (program !== 'ALL' && student.program !== program && allStudents && onSelectStudent) {
      const q = adminSearchTerm.trim().toLowerCase();
      const firstMatch =
        allStudents.find(
          (s) =>
            s.program === program &&
            (!q || s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q))
        ) || allStudents.find((s) => s.program === program);
      if (firstMatch) onSelectStudent(firstMatch.uid);
    }
  };

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
        { id: '2018_1', year: '2018', sem: '1', label: t('2018 ዓ/ም 1ኛ ሴሚስተር', '2018 E.C. 1st Semester'), isCumulative: false },
        { id: '2018_2', year: '2018', sem: '2', label: t('2018 ዓ/ም 2ኛ ሴሚስተር', '2018 E.C. 2nd Semester'), isCumulative: false },
        { id: '2019_1', year: '2019', sem: '1', label: t('2019 ዓ/ም 1ኛ ሴሚስተር', '2019 E.C. 1st Semester'), isCumulative: false },
        { id: '2019_2', year: '2019', sem: '2', label: t('2019 ዓ/ም 2ኛ ሴሚስተር', '2019 E.C. 2nd Semester'), isCumulative: false },
        { id: 'cumulative', year: 'ALL', sem: 'ALL', label: t('የአራቱ ሰሚስተር ውጤት በአንድ ላይ (ጥምር)', 'All 4 Semesters Cumulative Summary'), isCumulative: true }
      ];
    }

    // 1st-Year Students (Both Degree & Diploma): 2019 1st Semester
    const firstYearTabs = [
      { id: '2019_1', year: '2019', sem: '1', label: t('2019 ዓ/ም 1ኛ ሴሚስተር', '2019 E.C. 1st Semester'), isCumulative: false }
    ];

    // Show 2nd semester only when Dean or Admin has enabled it
    const isSem2Enabled = currentSemester === '2' || (semesterRelease && semesterRelease['2019_2'] === true);
    if (isSem2Enabled) {
      firstYearTabs.push({ id: '2019_2', year: '2019', sem: '2', label: t('2019 ዓ/ም 2ኛ ሴሚስተር', '2019 E.C. 2nd Semester'), isCumulative: false });
    }

    return firstYearTabs;
  }, [is2018DiplomaEntrant, currentSemester, semesterRelease, lang]);

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
    let result: Course[] = [];

    const is2019Entrant =
      student.admissionYear === '2019' ||
      (!is2018DiplomaEntrant && student.currentStudyYear === 1 && !student.priorDiploma && student.degreeTrack !== '2_YEAR');

    const deletedSet = getDeletedCourseIdsSet();
    const getCourseYear = (c: Course) =>
      c.academicYear || (c.schedule && c.schedule.includes('2018') ? '2018' : '2019');
    const getCourseSem = (c: Course) =>
      c.semester || (c.schedule && c.schedule.includes('2ኛ') ? '2' : '1');
    const is2018Course = (c: Course) =>
      getCourseYear(c) === '2018' ||
      c.id.includes('2018') ||
      c.id.startsWith('dip_sem1') ||
      c.id.startsWith('dip_sem2') ||
      c.id.startsWith('dip_2018_sem') ||
      c.id.startsWith('deg_p');

    if (activeYear === '2018') {
      if (is2019Entrant) {
        // 2019 entrants have NO 2018 courses!
        return [];
      }
      const historical = loadHistorical2018Courses().filter((c) => !deletedSet.has(c.id));
      const inCourses = courses.filter(
        (c) => !deletedSet.has(c.id) && c.program === student.program && is2018Course(c) && getCourseSem(c) === activeSem
      );
      const map = new Map<string, Course>();
      const seenNames = new Set<string>();
      const addIfNew = (c: Course) => {
        const aliasKey = normalizeCourseAliasId(c.id);
        const nameKey = c.name.trim();
        if (map.has(aliasKey) || seenNames.has(nameKey)) return;
        map.set(aliasKey, c);
        seenNames.add(nameKey);
      };
      // Live courses take precedence so assessmentConfig & credit edits are preserved
      inCourses.forEach(addIfNew);
      if (student.program === 'Diploma') {
        historical
          .filter((c) => (c.program === 'Diploma' || !c.program) && getCourseSem(c) === activeSem)
          .forEach(addIfNew);
      }
      result = Array.from(map.values());
    } else if (activeYear === '2019') {
      result = courses.filter((c) => {
        if (deletedSet.has(c.id) || c.program !== student.program) return false;
        if (is2018Course(c)) return false;
        return getCourseSem(c) === activeSem;
      });
    }

    // Include entered-grade courses strictly within student's program and year
    courses.forEach((c) => {
      if (deletedSet.has(c.id) || c.program !== student.program) return;
      if (is2019Entrant && is2018Course(c)) {
        return;
      }
      const cYear = getCourseYear(c);
      const cSem = getCourseSem(c);
      const cAlias = normalizeCourseAliasId(c.id);
      if (
        cYear === activeYear &&
        cSem === activeSem &&
        !result.some((item) => normalizeCourseAliasId(item.id) === cAlias)
      ) {
        const bd = resolveGradeBreakdown(grades, student.uid, c.id, cYear, cSem, student.id);
        const eff = getEffectiveGradeValues(bd, getCourseAssessmentItems(c));
        if (eff.hasAny) {
          result.push(c);
        }
      }
    });

    return result;
  }, [courses, student, grades, activeYear, activeSem, is2018DiplomaEntrant]);

  // Current semester GPA calculation (aligned 1:1 with displayed studentCourses)
  const currentSemesterGPA = useMemo(() => {
    if (activeTab.isCumulative) return '0.00';
    return calculateStudentGPA(student, studentCourses, grades, activeYear, activeSem);
  }, [student, studentCourses, grades, activeYear, activeSem, activeTab]);

  // Check if PDF print is allowed for this student
  const isPdfPrintAllowed = (
    individualPdfPrintAllowed && individualPdfPrintAllowed[student.uid] !== undefined
      ? individualPdfPrintAllowed[student.uid]
      : studentPdfPrintAllowed
  ) === true;

  // Admin has full unrestricted authority to inspect grades & print PDFs for all Diploma & Degree students
  const canViewStudentGrades = isAdminViewer || isStudentReleased;
  const canViewCurrentTab = isAdminViewer || isCurrentTabReleased;
  const canPrintPdf = isAdminViewer || isPdfPrintAllowed;

  // Cumulative Transcript data calculation for graduating students (only administered courses)
  const cumulativeData = useMemo(() => {
    if (!is2018DiplomaEntrant) return null;

    const deletedSet = getDeletedCourseIdsSet();
    const historical = loadHistorical2018Courses().filter((c) => !deletedSet.has(c.id));
    const mergeTerm2018 = (sem: '1' | '2') => {
      const map = new Map<string, Course>();
      const seenNames = new Set<string>();
      const pushCourse = (c: Course) => {
        if (deletedSet.has(c.id)) return;
        const alias = normalizeCourseAliasId(c.id);
        const nameKey = c.name.trim();
        if (map.has(alias) || seenNames.has(nameKey)) return;
        map.set(alias, c);
        seenNames.add(nameKey);
      };
      courses
        .filter((c) => {
          if (c.program !== 'Diploma') return false;
          const yr = c.academicYear || (c.schedule?.includes('2018') ? '2018' : '2019');
          const cSem = c.semester || (c.schedule?.includes('2ኛ') ? '2' : '1');
          return (yr === '2018' || c.id.includes('2018') || c.id.startsWith('dip_sem')) && cSem === sem;
        })
        .forEach(pushCourse);
      historical
        .filter((c) => (c.program === 'Diploma' || !c.program) && (c.semester === sem || c.id.includes(`sem${sem}`)))
        .forEach(pushCourse);
      return Array.from(map.values());
    };

    const sem1_2018 = mergeTerm2018('1');
    const sem2_2018 = mergeTerm2018('2');
    const sem1_2019 = courses.filter((c) => {
      if (deletedSet.has(c.id) || c.program !== 'Diploma') return false;
      const yr = c.academicYear || (c.schedule?.includes('2018') ? '2018' : '2019');
      const cSem = c.semester || (c.schedule?.includes('2ኛ') ? '2' : '1');
      return yr === '2019' && cSem === '1' && !c.id.includes('2018') && !c.id.startsWith('dip_sem');
    });
    const sem2_2019 = courses.filter((c) => {
      if (deletedSet.has(c.id) || c.program !== 'Diploma') return false;
      const yr = c.academicYear || (c.schedule?.includes('2018') ? '2018' : '2019');
      const cSem = c.semester || (c.schedule?.includes('2ኛ') ? '2' : '1');
      return yr === '2019' && cSem === '2' && !c.id.includes('2018') && !c.id.startsWith('dip_sem');
    });

    // Only include semesters that actually have administered courses
    const semesters = [
      { id: '2018_1', label: t('1ኛ ዓመት — 1ኛ ሴሚስተር (2018 ዓ.ም)', 'Year 1 — 1st Semester (2018 E.C.)'), year: '2018', sem: '1', courses: sem1_2018 },
      { id: '2018_2', label: t('1ኛ ዓመት — 2ኛ ሴሚስተር (2018 ዓ.ም)', 'Year 1 — 2nd Semester (2018 E.C.)'), year: '2018', sem: '2', courses: sem2_2018 },
      { id: '2019_1', label: t('2ኛ ዓመት — 1ኛ ሴሚስተር (2019 ዓ.ም)', 'Year 2 — 1st Semester (2019 E.C.)'), year: '2019', sem: '1', courses: sem1_2019 },
      ...(sem2_2019.length > 0 ? [{ id: '2019_2', label: t('2ኛ ዓመት — 2ኛ ሴሚስተር (2019 ዓ.ም — የምረቃ ሴሚስተር)', 'Year 2 — 2nd Semester (2019 E.C. — Graduating)'), year: '2019', sem: '2', courses: sem2_2019 }] : [])
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
          name: formatCourseTitle(c.name, lang),
          credits: c.credits,
          teacher: formatTeacherDisplay(c.teacher, lang),
          score: eff.hasAny ? eff.total : 0,
          letter: eff.hasAny ? eff.letter : '—',
          points: eff.hasAny ? eff.points : 0,
          desc: eff.hasAny ? formatGradeDesc(eff.desc, lang) : t('አልተሞላም', 'Not Entered'),
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

    let standing = t('ጥሩ አቋም', 'Good Standing');
    if (cgpaNum >= 3.75) standing = t('በከፍተኛ ማዕረግ (Very Great Distinction) 🏆', 'Very Great Distinction 🏆');
    else if (cgpaNum >= 3.5) standing = t('በማዕረግ (Great Distinction) ⭐', 'Great Distinction ⭐');
    else if (cgpaNum >= 3.0) standing = t('ጥሩ ማዕረግ (Distinction)', 'Distinction');

    return {
      computedSemesters,
      grandTotalCredits,
      grandQualityPoints,
      cgpa,
      standing
    };
  }, [is2018DiplomaEntrant, courses, grades, student, lang]);

  return (
    <div className="space-y-4 sm:space-y-6 no-print">
      {/* Admin Full-Authority Student Selector & Directory (ALL Diploma & Degree Students) */}
      {isAdminViewer && allStudents && allStudents.length > 0 && onSelectStudent && (
        <div className="bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 text-white p-4 sm:p-5 rounded-3xl shadow-md border border-emerald-800/70 space-y-3.5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-400/15 border border-amber-400/30 text-amber-300 shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm sm:text-base font-black text-white">
                    {t('የአድሚን ሙሉ የተማሪዎች ገጽ መቆጣጠሪያ', 'Admin Full Student Portal Inspector')}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950">
                    FULL ACCESS
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-emerald-200/90 mt-0.5">
                  {t(
                    `ሁሉንም የዲፕሎማ (${adminCounts.diploma}) እና የድግሪ (${adminCounts.degree}) ተማሪዎች — በድምሩ ${adminCounts.all} ተማሪዎችን ውጤትና ትራንስክሪፕት ማየትና ማተም ይችላሉ።`,
                    `Inspect grades and print transcripts for all Diploma (${adminCounts.diploma}) and Degree (${adminCounts.degree}) students — ${adminCounts.all} students total.`
                  )}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleAdminProgramFilterChange('ALL')}
                className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  adminProgramFilter === 'ALL'
                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                    : 'bg-white/10 text-emerald-100 hover:bg-white/20'
                }`}
              >
                {t('ሁሉም', 'All')} ({adminCounts.all})
              </button>
              <button
                type="button"
                onClick={() => handleAdminProgramFilterChange('Diploma')}
                className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  adminProgramFilter === 'Diploma'
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'bg-white/10 text-emerald-100 hover:bg-white/20'
                }`}
              >
                {t('የዲፕሎማ', 'Diploma')} ({adminCounts.diploma})
              </button>
              <button
                type="button"
                onClick={() => handleAdminProgramFilterChange('Degree')}
                className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  adminProgramFilter === 'Degree'
                    ? 'bg-indigo-500 text-white shadow-sm'
                    : 'bg-white/10 text-emerald-100 hover:bg-white/20'
                }`}
              >
                {t('የድግሪ', 'Degree')} ({adminCounts.degree})
              </button>
            </div>
          </div>

          {/* Search + Dropdown Switcher + Prev/Next Controls */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-stretch">
            {/* Search Input */}
            <div className="md:col-span-4 relative flex items-center">
              <Search className="w-4 h-4 text-emerald-300 absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={adminSearchTerm}
                onChange={(e) => {
                  setAdminSearchTerm(e.target.value);
                  if (e.target.value.trim()) setShowAdminDirectory(true);
                }}
                placeholder={t('በስም ወይም መለያ ኮድ ይፈልጉ...', 'Search by name or student ID...')}
                className="w-full min-h-[42px] pl-9 pr-9 py-2 rounded-xl bg-white/10 border border-white/20 text-xs text-white placeholder:text-emerald-200/70 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              {adminSearchTerm && (
                <button
                  type="button"
                  onClick={() => setAdminSearchTerm('')}
                  className="absolute right-2.5 p-1 text-emerald-200 hover:text-white cursor-pointer"
                  title={t('ፍለጋውን አጽዳ', 'Clear search')}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Direct Student Selector Dropdown */}
            <div className="md:col-span-5">
              <select
                value={student.uid}
                onChange={(e) => onSelectStudent(e.target.value)}
                aria-label={t('ተማሪ ይምረጡ', 'Select student')}
                className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-slate-800 border border-white/20 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
              >
                {filteredAdminStudents.length === 0 ? (
                  <option value={student.uid}>{t('ምንም ተማሪ አልተገኘም', 'No matching student found')}</option>
                ) : (
                  <>
                    {!filteredAdminStudents.some((s) => s.uid === student.uid) && (
                      <option value={student.uid}>
                        {student.name} ({student.id}) — {formatProgram(student.program, lang)}
                      </option>
                    )}
                    {filteredAdminStudents.map((s, idx) => (
                      <option key={s.uid} value={s.uid}>
                        {idx + 1}. {s.name} ({s.id}) — {formatProgram(s.program, lang)}
                        {s.program === 'Diploma' && (s.admissionYear === '2018' || s.id.startsWith('2018') || s.graduationStatus === 'CANDIDATE')
                          ? t(' [2018 ተመራቂ]', ' [2018 Candidate]')
                          : ''}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>

            {/* Prev / Next + Expand Directory Buttons */}
            <div className="md:col-span-3 flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleSelectPrevStudent}
                disabled={filteredAdminStudents.length === 0}
                className="min-h-[42px] px-2.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-40 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                title={t('ቀዳሚ ተማሪ', 'Previous Student')}
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">{t('ቀዳሚ', 'Prev')}</span>
              </button>
              <span className="text-[11px] font-mono font-bold text-amber-300 px-1.5 whitespace-nowrap text-center flex-1">
                {currentAdminIndex >= 0 ? `${currentAdminIndex + 1}/${filteredAdminStudents.length}` : `0/${filteredAdminStudents.length}`}
              </span>
              <button
                type="button"
                onClick={handleSelectNextStudent}
                disabled={filteredAdminStudents.length === 0}
                className="min-h-[42px] px-2.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-40 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                title={t('ቀጣይ ተማሪ', 'Next Student')}
              >
                <span className="hidden sm:inline">{t('ቀጣይ', 'Next')}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setShowAdminDirectory((v) => !v)}
                className={`min-h-[42px] px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap ${
                  showAdminDirectory
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-emerald-700 hover:bg-emerald-600 text-white'
                }`}
                title={t('ሁሉንም ተማሪዎች ዝርዝር ክፈት/ዝጋ', 'Toggle student directory')}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{showAdminDirectory ? t('ዝጋ', 'Close') : t('ዝርዝር', 'List')}</span>
              </button>
            </div>
          </div>

          {/* Expandable Full Student Directory Grid (All Diploma & Degree Students) */}
          {showAdminDirectory && (
            <div className="pt-2 border-t border-white/15">
              {filteredAdminStudents.length === 0 ? (
                <p className="text-xs text-emerald-200 text-center py-4">
                  {t('በዚህ ፍለጋ የሚዛመድ ተማሪ አልተገኘም።', 'No student matches this filter.')}
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
                  {filteredAdminStudents.map((s, idx) => {
                    const isSelected = s.uid === student.uid;
                    const sPhoto = photos ? photos[s.uid] : undefined;
                    const isCandidate =
                      s.program === 'Diploma' &&
                      (s.admissionYear === '2018' || s.id.startsWith('2018') || s.currentStudyYear === 2 || s.graduationStatus === 'CANDIDATE');
                    return (
                      <button
                        key={s.uid}
                        type="button"
                        onClick={() => onSelectStudent(s.uid)}
                        className={`min-h-[48px] p-2.5 rounded-2xl text-left flex items-center gap-2.5 transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md ring-2 ring-amber-300/60'
                            : 'bg-white/10 hover:bg-white/15 text-white border-white/10'
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-xl overflow-hidden flex items-center justify-center text-xs font-black shrink-0 ${
                            isSelected ? 'bg-slate-900 text-amber-300' : 'bg-emerald-800 text-white'
                          }`}
                        >
                          {sPhoto ? (
                            <img src={sPhoto} alt={s.name} className="w-full h-full object-cover" />
                          ) : (
                            <span>{s.name.charAt(0)}</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold truncate">
                            {idx + 1}. {s.name}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-[10px]">
                            <span className={`font-mono font-bold ${isSelected ? 'text-slate-800' : 'text-emerald-200'}`}>
                              {s.id}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded font-bold ${
                                isSelected
                                  ? 'bg-slate-900/15 text-slate-950'
                                  : s.program === 'Degree'
                                  ? 'bg-indigo-500/40 text-indigo-100'
                                  : 'bg-emerald-500/40 text-emerald-100'
                              }`}
                            >
                              {formatProgram(s.program, lang)}
                            </span>
                            {isCandidate && (
                              <span
                                className={`px-1.5 py-0.5 rounded font-bold ${
                                  isSelected ? 'bg-slate-900 text-amber-300' : 'bg-amber-400/20 text-amber-200'
                                }`}
                              >
                                {t('ተመራቂ', 'Candidate')}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Student Profile & GPA Hero Card */}
      <div className="bg-white p-4 sm:p-6 lg:p-8 rounded-3xl shadow-sm border border-slate-200/80 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 sm:gap-6">
        <div className="flex items-start sm:items-center gap-3.5 sm:gap-5 w-full lg:w-auto">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-amber-400 shadow-md bg-emerald-800 flex-shrink-0 flex items-center justify-center text-white text-xl sm:text-2xl font-bold">
            {photoUrl ? (
              <img src={photoUrl} alt={student.name} className="w-full h-full object-cover" />
            ) : (
              <span>{student.name.charAt(0)}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <h2 className="text-lg sm:text-2xl font-bold text-slate-800 break-words">{student.name}</h2>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold ${
                  student.program === 'Degree'
                    ? 'bg-indigo-100 text-indigo-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {student.program === 'Degree'
                  ? t('የድግሪ ፕሮግራም', 'Degree Program')
                  : t('የዲፕሎማ ፕሮግራም', 'Diploma Program')}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold ${
                is2018DiplomaEntrant ? 'bg-amber-100 text-amber-950 border border-amber-300 font-extrabold' : 'bg-slate-100 text-slate-700'
              }`}>
                {is2018DiplomaEntrant
                  ? t('2ኛ ዓመት (ተመራቂ ዕጩ)', '2nd Year (Graduating Candidate)')
                  : t('1ኛ ዓመት (2019 ዓ.ም ጀማሪ)', '1st Year (2019 E.C. Entrant)')}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-600 font-semibold mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>{t('መለያ ኮድ:', 'Student ID:')} <strong className="font-mono text-slate-900 bg-slate-100 px-2 py-0.5 rounded">{student.id}</strong></span>
              <span>· {t('ጾታ:', 'Gender:')} <strong>{formatGender(student.gender, lang)}</strong></span>
              <span className="hidden sm:inline">· {t('መንገድ:', 'Track:')} <strong>{student.program === 'Diploma' ? (is2018DiplomaEntrant ? t('የ2 ዓመት ዲፕሎማ ተመራቂ (4 ሴሚስተር)', '2-Year Graduating Diploma (4 Semesters)') : t('የዲፕሎማ መደበኛ 1ኛ ዓመት', 'Regular 1st Year Diploma')) : t('የ2019 ዓ.ም ድግሪ 1ኛ ዓመት', '2019 E.C. 1st Year Degree')}</strong></span>
            </p>
            <p className="text-[11px] text-emerald-800 font-bold mt-1">
              🇪🇹 {t('የሚመለከቱት፦', 'Viewing:')} {activeTab.label}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto justify-between lg:justify-end border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
          {canViewStudentGrades && (
            <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenTranscript(activeYear === 'ALL' ? '2018' : activeYear, activeSem === 'ALL' ? '2' : activeSem)}
                className="min-h-[44px] inline-flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs px-3.5 py-2.5 rounded-xl font-bold shadow-sm transition-all cursor-pointer"
                title={t('የሴሚስተር ትራንስክሪፕት ሰነድ ይመልከቱ', 'View Semester Transcript')}
              >
                <Printer className="w-4 h-4 text-amber-400" />
                <span>{t('የሴሚስተር ትራንስክሪፕት', 'Semester Transcript')}</span>
              </button>

              {is2018DiplomaEntrant && (
                <button
                  type="button"
                  onClick={() => setShowGraduationTranscript(true)}
                  className="min-h-[44px] inline-flex items-center justify-center gap-1.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs px-3.5 py-2.5 rounded-xl font-bold shadow-sm transition-all cursor-pointer"
                  title={t('የተማሩበትን ሙሉ 4 ሴሚስተር የምረቃ ትራንስክሪፕት በአንድ ላይ ይመልከቱ', 'View Full 4-Semester Graduation Transcript')}
                >
                  <GraduationCap className="w-4 h-4 text-amber-300" />
                  <span>{t('ሙሉ የምረቃ ትራንስክሪፕት', 'Full Graduation Transcript')}</span>
                </button>
              )}
            </div>
          )}

          <div className="bg-gradient-to-br from-amber-50 to-amber-100/70 border border-amber-300 rounded-2xl p-2.5 sm:p-3 text-center min-w-[120px] shadow-xs flex sm:block items-center justify-between px-4 sm:px-3">
            <span className="block text-[10px] uppercase font-bold text-amber-800 tracking-wider">
              {activeTab.isCumulative ? t('ድምር CGPA (4 ሴሚስተር)', 'Cumulative CGPA') : t(`የሴሚስተሩ GPA (${activeYear}/${activeSem})`, `Term GPA (${activeYear}/${activeSem})`)}
            </span>
            <span className="text-xl sm:text-3xl font-black text-amber-950 font-mono">
              {!canViewCurrentTab ? '🔒 ***' : activeTab.isCumulative ? (cumulativeData?.cgpa || '0.00') : currentSemesterGPA}
            </span>
          </div>
        </div>
      </div>

      {/* Admin Status Banner when a student's release is currently held from the student's own account */}
      {isAdminViewer && (!isStudentReleased || !isCurrentTabReleased || !isPdfPrintAllowed) && (
        <div className="bg-indigo-50 border border-indigo-200 text-indigo-950 px-4 py-3 rounded-2xl text-xs flex items-start gap-2.5 shadow-2xs">
          <ShieldCheck className="w-4 h-4 text-indigo-700 shrink-0 mt-0.5" />
          <p className="font-medium leading-relaxed">
            <strong className="font-black">{t('የአድሚን ሙሉ ስልጣን፦', 'Admin Full Access:')}</strong>{' '}
            {t(
              `የዚህ ተማሪ (${student.name}) ${!isStudentReleased || !isCurrentTabReleased ? 'ውጤት' : 'ፒዲኤፍ ማተም'} ለተማሪው እይታ ለጊዜው ታግዷል (Held)። እርስዎ ግን እንደ አድሚን ሙሉ ውጤቱን፣ GPA እና ትራንስክሪፕቱን ያለ ገደብ ማየትና ማተም ይችላሉ።`,
              `${!isStudentReleased || !isCurrentTabReleased ? 'Grade release' : 'PDF printing'} for ${student.name} is currently held from student view. As Admin, you have unrestricted access to view and print all records.`
            )}
          </p>
        </div>
      )}

      {/* Global Grade Release Hold Notice (Shown only to non-Admin student viewers) */}
      {!isAdminViewer && !isStudentReleased && (
        <div className="bg-rose-50 border-2 border-rose-300 text-rose-950 p-4 rounded-2xl text-xs flex items-start gap-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-extrabold text-sm text-rose-900 flex flex-wrap items-center gap-1.5">
              <span>{t('🔒 የእርሶ ውጤትና ትራንስክሪፕት ለጊዜው አልተለቀቀም / ታግዷል', '🔒 Your Grades & Transcript Are Currently Held')}</span>
              <span className="bg-rose-200 text-rose-950 px-2 py-0.5 rounded text-[10px] font-mono">RELEASE HELD</span>
            </p>
            <p className="text-rose-800 font-medium">
              {t(
                'የዚህ ሴሚስተር ውጤትና የትራንስክሪፕት ሰነዶች በኃላፊነት ባላቸው አካላት (በዋና አድሚን፣ በዋና ዲን እና በሪጅስተራል) ተረጋግጠው በይፋ እስኪፈቀዱ ድረስ ተሰውረዋል። እባክዎን በጽሕፈት ቤት በኩል ይፋ እስኪደረግ ይታገሱ።',
                'Semester grades and transcripts remain hidden until reviewed and officially released by the Administration, Academic Dean, or Registrar.'
              )}
            </p>
          </div>
        </div>
      )}

      {/* Interactive Semester Selection Navigation Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-3xl shadow-sm border border-slate-200/80 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 sm:gap-3">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 lg:pb-0 sm:flex-wrap">
          <span className="text-xs font-bold text-slate-700 px-1 flex items-center gap-1.5 whitespace-nowrap shrink-0">
            <Calendar className="w-4 h-4 text-amber-600" />
            <span>{t('ሴሚስተር:', 'Semester:')}</span>
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
                className={`min-h-[42px] px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
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
          <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-300 self-start lg:self-auto whitespace-nowrap">
            🎓 {t('4ቱ ሴሚስተሮች ለ2018 ተመራቂዎች ተከፍተዋል', '4 Semesters Unlocked for 2018 Candidates')}
          </span>
        )}
      </div>

      {/* Main Body: Either Cumulative 4-Semester View OR Individual Semester View */}
      {activeTab.isCumulative ? (
        /* CUMULATIVE 4-SEMESTER TRANSCRIPT VIEW */
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-4 sm:p-6 lg:p-8 space-y-5 sm:space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 sm:p-3 bg-amber-100 rounded-2xl text-amber-900 shrink-0">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm sm:text-lg font-black text-slate-900 flex flex-wrap items-center gap-2">
                  <span>{t('የአራቱም ሴሚስተር ጥምር የትምህርት ውጤት (4-Semester Cumulative Transcript)', '4-Semester Cumulative Academic Record')}</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-900 px-2.5 py-0.5 rounded-full font-bold">
                    {t('ይፋዊ ማጠቃለያ', 'Official Summary')}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t(
                    'የ2018 ዓ.ም (1ኛ እና 2ኛ ሴሚስተር) እና የ2019 ዓ.ም (1ኛ እና 2ኛ ሴሚስተር) ውጤቶች በአንድ ላይ',
                    'Combined academic grades across 2018 E.C. (Semesters 1 & 2) and 2019 E.C. (Semesters 1 & 2)'
                  )}
                </p>
              </div>
            </div>

            {canViewCurrentTab && (
              <button
                type="button"
                onClick={() => setShowGraduationTranscript(true)}
                className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center gap-1.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs px-4 py-2.5 rounded-xl font-bold shadow-sm transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4 text-amber-300" />
                <span>{t('ይፋዊ የምረቃ ትራንስክሪፕት ሰነድ አትም / ፒዲኤፍ', 'Print / Export Official Graduation Transcript')}</span>
              </button>
            )}
          </div>

          {!canViewCurrentTab ? (
            /* Locked notification when Dean/Admin holds release */
            <div className="bg-amber-50 border-2 border-amber-300 text-amber-950 p-6 sm:p-8 rounded-3xl text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-amber-100 flex items-center justify-center text-amber-800 shadow-inner">
                <Lock className="w-7 h-7" />
              </div>
              <h4 className="font-black text-base sm:text-lg text-amber-950">
                🔒 {t('የአራቱም ሴሚስተር ጥምር የምረቃ ውጤት በዋና ዲን / አድሚን ገና አልተፈቀደም', 'Cumulative 4-Semester Graduation Results Not Yet Released')}
              </h4>
              <p className="text-xs text-amber-800 max-w-lg mx-auto leading-relaxed">
                {t(
                  'የተመራቂ ተማሪዎች ሙሉ የ4 ሴሚስተር ጥምር ውጤትና ይፋዊ ማጠቃለያ በዲንና በአድሚን እስኪለቀቅ ድረስ ተሰውሯል። እባክዎን በጽሕፈት ቤት በኩል ይፋ እስኪደረግ በትዕግሥት ይጠብቁ።',
                  'Cumulative graduation summaries remain hidden until authorized for release by the Academic Dean or Admin.'
                )}
              </p>
            </div>
          ) : (
            /* Render all 4 semester tables */
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {cumulativeData?.computedSemesters.map((sem) => (
                  <div
                    key={sem.id}
                    className="rounded-2xl border border-slate-200 overflow-hidden shadow-2xs flex flex-col justify-between"
                  >
                    <div className="bg-slate-100/90 px-3.5 sm:px-4 py-3 border-b border-slate-200 flex justify-between items-center gap-2">
                      <span className="font-black text-xs text-slate-800">{sem.label}</span>
                      <span className="text-[11px] font-mono font-black text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300 whitespace-nowrap shrink-0">
                        SGPA: {sem.semGPA}
                      </span>
                    </div>

                    <div className="overflow-x-auto p-1.5 sm:p-2">
                      <table className="w-full text-left text-xs">
                        <thead className="text-[10px] uppercase text-slate-500 font-bold bg-slate-50 border-b">
                          <tr>
                            <th className="p-2">{t('ኮርስ', 'Course')}</th>
                            <th className="p-2 text-center">{t('ክሬዲት', 'Cr')}</th>
                            <th className="p-2 text-center">{t('ውጤት', 'Score')}</th>
                            <th className="p-2 text-center">{t('ደረጃ', 'Grade')}</th>
                            <th className="p-2 text-center">{t('ነጥብ', 'Pts')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {sem.rows.map((r, idx) => (
                            <tr key={r.id || idx} className="hover:bg-slate-50/60">
                              <td className="p-2">
                                <span className="font-bold text-slate-900 block min-w-[120px] sm:max-w-[200px]">{r.name}</span>
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
                      <span>{t('የሴሚስተሩ ክሬዲት ድምር:', 'Term Credits:')} <strong>{sem.semCredits}</strong></span>
                      <span>{t('የጥራት ነጥብ:', 'Quality Points:')} <strong>{sem.semPoints.toFixed(1)}</strong></span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Grand Cumulative Academic Standing Card */}
              <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-indigo-950 text-white rounded-3xl p-5 sm:p-6 shadow-md border border-emerald-800 flex flex-col md:flex-row justify-between items-center gap-5 sm:gap-6">
                <div className="space-y-1.5 text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start gap-2 text-amber-300 text-xs font-black">
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    <span>{t('የተመራቂው ጠቅላላ የምረቃ ማጠቃለያ (Cumulative Summary)', 'Cumulative Graduation Summary')}</span>
                  </div>
                  <h4 className="text-lg sm:text-2xl font-black text-white">
                    {student.name} ({student.id})
                  </h4>
                  <p className="text-xs text-emerald-200">
                    {t('የምረቃ ማዕረግ፦', 'Academic Standing:')} <strong className="text-amber-300 text-sm">{cumulativeData?.standing}</strong>
                  </p>
                </div>

                <div className="grid grid-cols-3 sm:flex sm:flex-wrap items-center justify-center gap-2 sm:gap-3 w-full md:w-auto">
                  <div className="bg-white/10 rounded-2xl p-2.5 sm:p-3 text-center sm:min-w-[100px] backdrop-blur-xs border border-white/10">
                    <span className="block text-[9px] sm:text-[10px] text-emerald-200 font-bold uppercase">{t('ጠቅላላ ክሬዲት', 'Total Credits')}</span>
                    <span className="text-lg sm:text-xl font-mono font-black text-white">{cumulativeData?.grandTotalCredits}</span>
                  </div>

                  <div className="bg-white/10 rounded-2xl p-2.5 sm:p-3 text-center sm:min-w-[100px] backdrop-blur-xs border border-white/10">
                    <span className="block text-[9px] sm:text-[10px] text-emerald-200 font-bold uppercase">{t('ድምር ነጥብ', 'Quality Pts')}</span>
                    <span className="text-lg sm:text-xl font-mono font-black text-white">{cumulativeData?.grandQualityPoints.toFixed(1)}</span>
                  </div>

                  <div className="bg-amber-400 rounded-2xl p-2.5 sm:p-3 text-center sm:min-w-[110px] shadow-md text-slate-950">
                    <span className="block text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-slate-900">{t('ድምር CGPA', 'CGPA')}</span>
                    <span className="text-xl sm:text-3xl font-mono font-black text-slate-950">{cumulativeData?.cgpa}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* INDIVIDUAL SEMESTER GRADE REPORT VIEW */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-200/80 p-4 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b pb-3">
              <h3 className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-700 shrink-0" />
                <span>{t(`የ${activeTab.label} የትምህርት ውጤት (Grade Report)`, `Grade Report — ${activeTab.label}`)}</span>
              </h3>
              <span className="text-xs font-mono text-slate-500">{studentCourses.length} {t('ኮርሶች', 'Courses')}</span>
            </div>

            {!canViewCurrentTab ? (
              /* Locked Notice for this individual semester */
              <div className="bg-amber-50 border-2 border-amber-300 text-amber-950 p-5 sm:p-6 rounded-2xl text-center space-y-2">
                <div className="w-10 h-10 mx-auto rounded-full bg-amber-100 flex items-center justify-center text-amber-800">
                  <Lock className="w-5 h-5" />
                </div>
                <h4 className="font-black text-sm text-amber-950">
                  🔒 {t(`የ${activeTab.label} ውጤት በዋና ዲን / አድሚን ገና አልተፈቀደም`, `${activeTab.label} Grades Not Yet Released`)}
                </h4>
                <p className="text-xs text-amber-800 max-w-md mx-auto">
                  {t(
                    'የዚህ ሴሚስተር ውጤት በይፋ ተረጋግጦ በዲንና በአድሚን እስኪለቀቅ ድረስ ተሰውሯል።',
                    'Grades for this semester remain hidden until approved and released by the Academic Dean or Admin.'
                  )}
                </p>
              </div>
            ) : (
              <>
                {/* Mobile Card View (< md) — Zero horizontal overflow on phones */}
                <div className="md:hidden space-y-3">
                  {studentCourses.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500 font-bold space-y-1 bg-slate-50 rounded-2xl border border-slate-200">
                      <p>{t('በዚህ ሴሚስተር እስካሁን ምንም የተመደበ የትምህርት ዓይነት ወይም መምህር የለም።', 'No courses or instructors assigned for this semester yet.')}</p>
                      {activeYear === '2019' && activeSem === '2' && (
                        <p className="text-[11px] text-amber-700 font-normal">
                          {t(
                            'የ2019 ዓ/ም 2ኛ ሴሚስተር ትምህርት ገና ስላልተጀመረ ባዶ ነው (ትምህርትም ሆነ መምህር ምደባ አልተሰጠም)።',
                            '2019 E.C. 2nd Semester classes have not started yet.'
                          )}
                        </p>
                      )}
                    </div>
                  ) : (
                    studentCourses.map((c, idx) => {
                      const g = resolveGradeBreakdown(grades, student.uid, c.id, activeYear, activeSem, student.id);
                      const eff = getEffectiveGradeValues(g, getCourseAssessmentItems(c));

                      return (
                        <div key={c.id} className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <span className="text-[10px] font-mono font-bold text-slate-400">#{idx + 1}</span>
                              <h4 className="font-bold text-sm text-slate-900 leading-snug">{formatCourseTitle(c.name, lang)}</h4>
                              <p className="text-[11px] text-slate-600 mt-0.5">{t('መምህር:', 'Instructor:')} {formatTeacherDisplay(c.teacher, lang)}</p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <div className="text-center px-2.5 py-1 rounded-xl bg-white border border-slate-200 shadow-2xs min-w-[48px]">
                                <span className="block text-[9px] text-slate-400 font-bold">{t('ውጤት', 'Score')}</span>
                                <span className="font-mono font-black text-sm text-slate-900">
                                  {eff.hasAny ? eff.total : '—'}
                                </span>
                              </div>
                              <div className="text-center px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200 min-w-[44px]">
                                <span className="block text-[9px] text-emerald-700 font-bold">{t('ደረጃ', 'Grade')}</span>
                                <span className="font-black text-sm text-emerald-800">
                                  {eff.hasAny ? eff.letter : '—'}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/70 text-[11px]">
                            <span className="text-amber-900 font-medium">{formatSchedule(c.schedule, lang)}</span>
                            <span className="font-semibold text-slate-600">
                              {eff.hasAny ? formatGradeDesc(eff.desc, lang) : t('አልተሞላም', 'Not Entered')}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Desktop & Tablet Table View (md+) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[11px] rounded-lg">
                      <tr>
                        <th className="p-3">{t('ተ.ቁ', '#')}</th>
                        <th className="p-3">{t('የኮርስ ስም', 'Course Title')}</th>
                        <th className="p-3">{t('ቀን / ሰሌዳ', 'Schedule')}</th>
                        <th className="p-3">{t('የተመደበ መምህር', 'Instructor')}</th>
                        <th className="p-3 text-center">{t('ውጤት', 'Score')}</th>
                        <th className="p-3 text-center">{t('ፊደል ደረጃ', 'Letter')}</th>
                        <th className="p-3 text-center">{t('ትርጉም', 'Standing')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {studentCourses.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-xs text-slate-500 font-bold space-y-1">
                            <p>{t('በዚህ ሴሚስተር እስካሁን ምንም የተመደበ የትምህርት ዓይነት ወይም መምህር የለም።', 'No courses or instructors assigned for this semester yet.')}</p>
                            {activeYear === '2019' && activeSem === '2' && (
                              <p className="text-[11px] text-amber-700 font-normal">
                                {t(
                                  'የ2019 ዓ/ም 2ኛ ሴሚስተር ትምህርት ገና ስላልተጀመረ ባዶ ነው (ትምህርትም ሆነ መምህር ምደባ አልተሰጠም)።',
                                  '2019 E.C. 2nd Semester classes have not started yet.'
                                )}
                              </p>
                            )}
                          </td>
                        </tr>
                      ) : (
                        studentCourses.map((c, idx) => {
                          const g = resolveGradeBreakdown(grades, student.uid, c.id, activeYear, activeSem, student.id);
                          const eff = getEffectiveGradeValues(g, getCourseAssessmentItems(c));

                          return (
                            <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="p-3 font-mono font-bold text-slate-400">{idx + 1}</td>
                              <td className="p-3 font-bold text-slate-900">{formatCourseTitle(c.name, lang)}</td>
                              <td className="p-3 text-amber-900 font-medium bg-amber-50/50 rounded">{formatSchedule(c.schedule, lang)}</td>
                              <td className="p-3 text-slate-600 font-semibold">{formatTeacherDisplay(c.teacher, lang)}</td>
                              <td className="p-3 text-center font-black font-mono">
                                {eff.hasAny ? eff.total : '—'}
                              </td>
                              <td className="p-3 text-center font-black text-emerald-800 text-sm">
                                {eff.hasAny ? eff.letter : '—'}
                              </td>
                              <td className="p-3 text-center text-[10px] text-slate-500 font-medium">
                                {eff.hasAny ? formatGradeDesc(eff.desc, lang) : t('አልተሞላም', 'Not Entered')}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          {/* Timetable / Schedule */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 space-y-4">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b pb-3">
                <Calendar className="w-5 h-5 text-amber-600" />
                <span>{t('የኮርሶች የቀን ሰሌዳ (Course Schedule)', 'Course Schedule')}</span>
              </h3>

              <div className="space-y-3">
                {studentCourses.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-4 text-center">
                    {t('በዚህ ሴሚስተር የተመደበ የትምህርት ሰሌዳ የለም።', 'No course schedule assigned for this semester.')}
                  </p>
                ) : (
                  studentCourses.map((c) => (
                    <div
                      key={c.id}
                      className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 hover:border-emerald-300 transition-colors"
                    >
                      <p className="font-bold text-xs text-slate-800">{formatCourseTitle(c.name, lang)}</p>
                      <div className="flex items-center gap-1.5 text-[11px] text-amber-900 font-semibold mt-1">
                        <Clock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                        <span>{formatSchedule(c.schedule, lang) || t('አልተወሰነም', 'TBD')}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1 font-medium">
                        {t('መምህር:', 'Instructor:')} {formatTeacherDisplay(c.teacher, lang)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Student Guidance Motto */}
            <div className="bg-gradient-to-br from-emerald-900 to-slate-900 text-white rounded-3xl p-6 shadow-sm border border-emerald-800 space-y-2 relative overflow-hidden">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                <Award className="w-4 h-4 text-amber-400" />
                <span>{t('የተማሪዎች መንፈሳዊ መመሪያ', 'Student Spiritual Guidance')}</span>
              </div>
              <p className="text-xs text-emerald-100 leading-relaxed font-sans">
                {t(
                  'በትምህርት ወቅት በትጋት፣ በጸሎትና በአክብሮት በመገኘት የቤተ ክርስቲያንን አደራ በታማኝነት መወጣት ይገባል።',
                  'Fulfill the trust of the Church faithfully during your studies through diligence, prayer, humility, and Christian integrity.'
                )}
              </p>
              <p className="text-[11px] text-amber-300/90 font-medium pt-1">
                {t('የብርብር ከተማ ቃለ ሕይወት ቤተ ክርስቲያን መጽሐፍ ቅዱስ ትምህርት ቤት', 'Birbir City Kale Heywet Church Bible Training School')}
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
          allowPdfPrint={canPrintPdf}
          isStudentViewer={!isAdminViewer}
          onClose={() => setShowGraduationTranscript(false)}
        />
      )}
    </div>
  );
};
