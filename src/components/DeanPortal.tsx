import React, { useState } from 'react';
import {
  Award,
  BookOpen,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  EyeOff,
  Trophy,
  Calendar,
  Key,
  Download,
  Users,
  Eye,
  Printer,
  UserPlus,
  Save,
  Upload,
  FileSpreadsheet,
  GraduationCap,
  History,
  Lock,
  CheckCheck,
  Copy,
  Cloud,
  FileCode
} from 'lucide-react';
import { Course, GradeBreakdown, OfficialSignaturesConfig, ProgramType, SemesterReleaseConfig, Student } from '../types.ts';
import { FirebaseConnectionReport } from '../services/firebaseSync.ts';
import { sortStudentsByAmharicName } from '../utils/amharicSort.ts';
import { calculateGradeDetails, calculateStudentGPA, getCourseAssessmentConfig, getCourseAssessmentItems, getCriterionScore, getEffectiveGradeValues, getGradeKey, rankStudentsByPerformance, RankedStudentEntry, resolveGradeBreakdown } from '../utils/gradeCalculations.ts';
import { getCriterionColor } from './TeacherPortal.tsx';
import { useIsMobile } from '../utils/useIsMobile.ts';
import { StandardGradeDesktopRow, StandardGradeMobileCard } from './GradeEntryRows.tsx';
import { OfficialSignaturesManager } from './OfficialSignaturesManager.tsx';
import { ExcelUploadModal } from './ExcelUploadModal.tsx';
import { CourseGradeReportPdfModal } from './CourseGradeReportPdfModal.tsx';
import { exportCourseGradesToExcel, downloadCourseGradeTemplateExcel, exportMasterSemesterGradeSheetToExcel, ExcelApplyMeta } from '../utils/excelUtils.ts';
import { GraduationManager } from './GraduationManager.tsx';
import { MasterGradeReportPdfModal } from './MasterGradeReportPdfModal.tsx';
import { TeacherAllocationManager } from './TeacherAllocationManager.tsx';
import { SemesterReleaseControl } from './SemesterReleaseControl.tsx';
import { BatchScoreFillModal } from './BatchScoreFillModal.tsx';
import { syncGradesToFirestore } from '../services/firebaseSync.ts';
import {
  useLanguage,
  formatProgram,
  formatGender,
  formatSemester,
  formatYearLevel,
  formatCalendarYear,
  formatCriterionLabel,
  formatTeacherDisplay,
  formatCourseTitle,
  formatDegreeTrack
} from '../utils/i18n.tsx';

interface DeanPortalProps {
  currentYear: string;
  currentSemester: string;
  onYearChange: (year: string) => void;
  onSemesterChange: (sem: string) => void;
  availableYears: string[];
  onAddAcademicYear: (year: string) => void;
  gradePublished: boolean;
  onToggleGradePublication: () => void;
  semesterRelease?: SemesterReleaseConfig;
  onToggleSemesterRelease?: (key: string, value?: boolean) => void;
  onToggleAllSemestersRelease?: (value: boolean) => void;
  studentPdfPrintAllowed?: boolean;
  onToggleStudentPdfPrint?: () => void;
  onOpenReleaseManager?: () => void;
  onOpenArchiveModal?: () => void;
  onOpenJsonReaderModal?: () => void;
  onDownloadFullBackup?: () => void;
  courses: Course[];
  students: Student[];
  teachers: string[];
  grades: Record<string, GradeBreakdown>;
  onAddTeacher: (teacherName: string) => void;
  onOpenAddCourse: () => void;
  onOpenEditCourse: (course: Course) => void;
  onDeleteCourse: (courseId: string) => void;
  onOpenAddStudent: () => void;
  onOpenEditStudent?: (student: Student) => void;
  onDeleteStudent: (studentUid: string) => void;
  onSaveGrades: (updatedGrades: Record<string, GradeBreakdown>) => void;
  onSelectPrintTranscript: (student: Student) => void;
  showNotify: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  officialConfig: OfficialSignaturesConfig;
  onSaveOfficialConfig: (updated: OfficialSignaturesConfig) => void;
  onClearAllGrades?: () => void;
  churchLogo?: string;
  onUpdateStudents?: (updated: Student[]) => void;
  onSaveCourses?: (updatedCourses: Course[]) => void;
  onQuickAssignTeacher?: (courseId: string, newTeacher: string) => void;
  onBatchDeleteCourses?: (courseIds: string[]) => void;
  firebaseReport?: FirebaseConnectionReport | null;
  isTestingFirebase?: boolean;
  onOpenFirebaseModal?: () => void;
}

export const DeanPortal: React.FC<DeanPortalProps> = ({
  currentYear,
  currentSemester,
  onYearChange,
  onSemesterChange,
  availableYears,
  onAddAcademicYear,
  gradePublished,
  onToggleGradePublication,
  semesterRelease,
  onToggleSemesterRelease,
  onToggleAllSemestersRelease,
  studentPdfPrintAllowed,
  onToggleStudentPdfPrint,
  onOpenReleaseManager,
  onOpenArchiveModal,
  onOpenJsonReaderModal,
  onDownloadFullBackup,
  courses,
  students,
  teachers,
  grades,
  onAddTeacher,
  onOpenAddCourse,
  onOpenEditCourse,
  onDeleteCourse,
  onOpenAddStudent,
  onOpenEditStudent,
  onDeleteStudent,
  onSaveGrades,
  onSelectPrintTranscript,
  showNotify,
  officialConfig,
  onSaveOfficialConfig,
  onClearAllGrades,
  churchLogo,
  onUpdateStudents,
  onSaveCourses,
  onQuickAssignTeacher,
  onBatchDeleteCourses,
  firebaseReport,
  isTestingFirebase,
  onOpenFirebaseModal
}) => {
  const { lang, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'courses' | 'supervision' | 'transcripts' | 'teachers' | 'graduation' | 'official_signatures'>('courses');
  const [courseProgramFilter, setCourseProgramFilter] = useState<'ALL' | ProgramType>('ALL');
  const [newYearInput, setNewYearInput] = useState('');
  const [showAddYearModal, setShowAddYearModal] = useState(false);

  // New Teacher Modal
  const [showAddTeacherModal, setShowAddTeacherModal] = useState(false);
  const [newTeacherName, setNewTeacherName] = useState('');

  // Grade supervision view & edit
  const [superviseCourseId, setSuperviseCourseId] = useState<string>(courses[0]?.id || '');
  const [editingGradeMatrix, setEditingGradeMatrix] = useState<Record<string, GradeBreakdown>>({});
  const [isExcelUploadOpen, setIsExcelUploadOpen] = useState(false);
  const [isBatchFillOpen, setIsBatchFillOpen] = useState(false);
  const [batchInitialCriterionId, setBatchInitialCriterionId] = useState<string | undefined>(undefined);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isMasterPdfOpen, setIsMasterPdfOpen] = useState(false);
  const [showAllRanks, setShowAllRanks] = useState(false);

  // Sync supervision matrix when course changes using resolveGradeBreakdown
  React.useEffect(() => {
    const course = courses.find((c) => c.id === superviseCourseId);
    if (!course) return;
    const courseYear = course.academicYear || currentYear;
    const courseSem = course.semester || currentSemester;
    const enrolled = students.filter((s) => s.program === course.program);
    const initial: Record<string, GradeBreakdown> = {};
    enrolled.forEach((s) => {
      initial[s.uid] = resolveGradeBreakdown(grades, s.uid, course.id, courseYear, courseSem, s.id);
    });
    setEditingGradeMatrix(initial);
  }, [superviseCourseId, courses, students, grades, currentYear, currentSemester]);

  const isMobileViewport = useIsMobile(768);

  const filteredCourses = React.useMemo(() => {
    return courses.filter((c) => {
      if (courseProgramFilter === 'ALL') return true;
      return c.program === courseProgramFilter;
    });
  }, [courses, courseProgramFilter]);

  const selectedSupervisedCourse = React.useMemo(
    () => courses.find((c) => c.id === superviseCourseId) || courses[0],
    [courses, superviseCourseId]
  );

  const supervisedStudents = React.useMemo(() => {
    if (!selectedSupervisedCourse) return [];
    return sortStudentsByAmharicName(
      students.filter((s) => s.program === selectedSupervisedCourse.program)
    );
  }, [selectedSupervisedCourse, students]);

  const transcriptSortedStudents = React.useMemo(
    () => sortStudentsByAmharicName(students),
    [students]
  );


  const handleCreateYear = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newYearInput.trim();
    if (!clean) return;
    if (availableYears.includes(clean)) {
      showNotify(
        t(`የትምህርት ዘመን ${clean} አስቀድሞ አለ!`, `Academic year ${clean} already exists!`),
        'warning'
      );
      return;
    }
    onAddAcademicYear(clean);
    onYearChange(clean);
    setNewYearInput('');
    setShowAddYearModal(false);
    showNotify(
      t(`አዲስ የትምህርት ዘመን (${clean} ዓ.ም) ተጨምሯል!`, `New academic year (${clean} E.C.) added!`),
      'success'
    );
  };

  const handleCreateTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newTeacherName.trim();
    if (!clean) return;
    if (teachers.includes(clean)) {
      showNotify(t('ይህ መምህር አስቀድሞ ተመዝግቧል!', 'This instructor is already registered!'), 'warning');
      return;
    }
    onAddTeacher(clean);
    setNewTeacherName('');
    setShowAddTeacherModal(false);
    showNotify(
      t(`አዲስ መምህር "${clean}" በስኬት ተመዝግቧል!`, `New instructor "${clean}" registered successfully!`),
      'success'
    );
  };

  const handleDeanCriterionChange = React.useCallback((
    studentUid: string,
    itemId: string,
    val: string,
    maxVal: number,
    itemIndex: number
  ) => {
    const clean = val.trim();
    const num = clean === '' ? 0 : Math.min(maxVal, Math.max(0, parseFloat(clean) || 0));
    setEditingGradeMatrix((prev) => {
      const current = prev[studentUid] || { p1: 0, p2: 0, mid: 0, final: 0, att: 0 };
      const currentScores = current.scores ? { ...current.scores } : {};
      currentScores[itemId] = num;

      return {
        ...prev,
        [studentUid]: {
          ...current,
          scores: currentScores,
          ...(itemId === 'p1' || itemIndex === 0 ? { p1: num } : {}),
          ...(itemId === 'p2' || itemIndex === 1 ? { p2: num } : {}),
          ...(itemId === 'mid' || itemIndex === 2 ? { mid: num } : {}),
          ...(itemId === 'final' || itemIndex === 3 ? { final: num } : {}),
          ...(itemId === 'att' || itemIndex === 4 ? { att: num } : {})
        }
      };
    });
  }, []);

  const handleSaveDeanGrades = async () => {
    if (!selectedSupervisedCourse) return;
    try {
      const targetYear = selectedSupervisedCourse.academicYear || currentYear;
      const targetSem = selectedSupervisedCourse.semester || currentSemester;

      const updated = { ...grades };
      supervisedStudents.forEach((s) => {
        const breakdown = editingGradeMatrix[s.uid] || { p1: 0, p2: 0, mid: 0, final: 0, att: 0 };
        const keyByUid = getGradeKey(s.uid, selectedSupervisedCourse.id, targetYear, targetSem);
        const keyById = getGradeKey(s.id, selectedSupervisedCourse.id, targetYear, targetSem);
        const directKey = `${s.uid}_${selectedSupervisedCourse.id}`;
        const directKeyById = s.id ? `${s.id}_${selectedSupervisedCourse.id}` : '';

        updated[keyByUid] = breakdown;
        updated[keyById] = breakdown;
        updated[directKey] = breakdown;
        if (directKeyById) {
          updated[directKeyById] = breakdown;
        }
      });

      try {
        localStorage.setItem('bk_grades', JSON.stringify(updated));
      } catch (_) {}

      await onSaveGrades(updated);
      const res = await syncGradesToFirestore(updated);

      if (res && !res.success) {
        showNotify(
          t(
            `ለውጦች በኮምፒውተር ተቀምጠዋል፤ ወደ Firebase ሲላክ ማስታወሻ: ${res.error}`,
            `Saved locally; Firestore sync notice: ${res.error}`
          ),
          'warning'
        );
      } else {
        showNotify(
          t(
            'የተስተካከሉት ውጤቶች በዳታቤዝ እና በሲስተሙ በስኬት ተመዝግበዋል!',
            'Updated grades saved and synced successfully!'
          ),
          'success'
        );
      }
    } catch (err: any) {
      showNotify(
        t(
          `ውጤት ሲመዘገብ ስህተት ገጥሟል: ${err?.message || 'እባክዎ እንደገና ይሞክሩ'}`,
          `Error saving grades: ${err?.message || 'Please try again'}`
        ),
        'error'
      );
    }
  };

  // Export Dean supervised grades to Excel (.xlsx)
  const handleExportDeanExcel = () => {
    if (!selectedSupervisedCourse) return;
    const targetYear = selectedSupervisedCourse.academicYear || currentYear;
    const targetSem = selectedSupervisedCourse.semester || (selectedSupervisedCourse.schedule && selectedSupervisedCourse.schedule.includes('2ኛ') ? '2' : '1') || currentSemester;
    exportCourseGradesToExcel(
      selectedSupervisedCourse,
      supervisedStudents,
      editingGradeMatrix,
      targetYear,
      targetSem
    );
    showNotify(
      t(
        `የ${selectedSupervisedCourse.name} ውጤት ኤክሴል ሰነድ (.xlsx) በስኬት ወርዷል!`,
        `Excel grade sheet (.xlsx) for ${formatCourseTitle(selectedSupervisedCourse.name, lang)} downloaded!`
      ),
      'success'
    );
  };

  // Apply imported Excel scores to Dean supervised grades with instant persistence
  const handleApplyDeanImportedScores = (
    scoresByUid: Record<string, Record<string, number>>,
    meta?: ExcelApplyMeta
  ) => {
    if (!selectedSupervisedCourse) return;
    const targetYear = selectedSupervisedCourse.academicYear || currentYear;
    const targetSem = selectedSupervisedCourse.semester || currentSemester;

    const nextMatrix = { ...editingGradeMatrix };
    const updatedGlobal = { ...grades };

    Object.entries(scoresByUid).forEach(([uid, newScores]) => {
      const studentObj = students.find((s) => s.uid === uid || s.id === uid);
      const studentId = studentObj?.id || uid;

      const current = nextMatrix[uid] || resolveGradeBreakdown(grades, uid, selectedSupervisedCourse.id, targetYear, targetSem, studentId);
      const currentScores = current.scores ? { ...current.scores } : {};
      Object.entries(newScores).forEach(([itemId, scoreVal]) => {
        currentScores[itemId] = scoreVal;
      });

      const updatedBreakdown: GradeBreakdown = {
        ...current,
        scores: currentScores,
        p1: currentScores['p1'] ?? currentScores['crit_1'] ?? current.p1,
        p2: currentScores['p2'] ?? currentScores['crit_2'] ?? current.p2,
        mid: currentScores['mid'] ?? currentScores['crit_3'] ?? current.mid,
        final: currentScores['final'] ?? currentScores['crit_4'] ?? current.final,
        att: currentScores['att'] ?? currentScores['crit_5'] ?? current.att
      };

      if (meta?.customTotalsByUid && meta.customTotalsByUid[uid] !== undefined) {
        updatedBreakdown.customTotal = meta.customTotalsByUid[uid];
      } else {
        delete updatedBreakdown.customTotal;
      }

      if (meta?.customLettersByUid && meta.customLettersByUid[uid]) {
        updatedBreakdown.customLetter = meta.customLettersByUid[uid];
      } else {
        delete updatedBreakdown.customLetter;
      }

      nextMatrix[uid] = updatedBreakdown;

      const keyByUid = getGradeKey(uid, selectedSupervisedCourse.id, targetYear, targetSem);
      const keyById = getGradeKey(studentId, selectedSupervisedCourse.id, targetYear, targetSem);
      const directKey = `${uid}_${selectedSupervisedCourse.id}`;

      updatedGlobal[keyByUid] = updatedBreakdown;
      updatedGlobal[keyById] = updatedBreakdown;
      updatedGlobal[directKey] = updatedBreakdown;
      if (targetYear === currentYear && targetSem === currentSemester) {
        const defaultYearKey = getGradeKey(uid, selectedSupervisedCourse.id, currentYear, currentSemester);
        updatedGlobal[defaultYearKey] = updatedBreakdown;
      }
    });

    setEditingGradeMatrix(nextMatrix);
    onSaveGrades(updatedGlobal);
    try {
      localStorage.setItem('bk_grades', JSON.stringify(updatedGlobal));
    } catch (_) {}

    showNotify(
      t(
        `የ${Object.keys(scoresByUid).length} ተማሪዎች ውጤት ከኤክሴል በስኬት ተመዝግቧል!`,
        `Scores for ${Object.keys(scoresByUid).length} students imported from Excel and saved!`
      ),
      'success'
    );
  };

  // Apply batch fill scores in Dean Portal with instant persistence
  const handleApplyDeanBatchScores = (updatedLocal: Record<string, GradeBreakdown>, summaryMsg: string) => {
    if (!selectedSupervisedCourse) return;
    const targetYear = selectedSupervisedCourse.academicYear || currentYear;
    const targetSem = selectedSupervisedCourse.semester || currentSemester;

    setEditingGradeMatrix(updatedLocal);

    const updatedGlobal = { ...grades };
    supervisedStudents.forEach((s) => {
      const breakdown = updatedLocal[s.uid];
      if (breakdown) {
        const keyByUid = getGradeKey(s.uid, selectedSupervisedCourse.id, targetYear, targetSem);
        const keyById = getGradeKey(s.id, selectedSupervisedCourse.id, targetYear, targetSem);
        const directKey = `${s.uid}_${selectedSupervisedCourse.id}`;

        updatedGlobal[keyByUid] = breakdown;
        updatedGlobal[keyById] = breakdown;
        updatedGlobal[directKey] = breakdown;
        if (targetYear === currentYear && targetSem === currentSemester) {
          const defaultYearKey = getGradeKey(s.uid, selectedSupervisedCourse.id, currentYear, currentSemester);
          updatedGlobal[defaultYearKey] = breakdown;
        }
      }
    });

    onSaveGrades(updatedGlobal);
    try {
      localStorage.setItem('bk_grades', JSON.stringify(updatedGlobal));
    } catch (_) {}

    showNotify(summaryMsg, 'success');
  };

  // Download course grades as CSV
  const handleDownloadCourseGrades = (course: Course) => {
    const enrolled = students.filter((s) => s.program === course.program);
    const criteria = getCourseAssessmentItems(course);
    const headers = criteria.map((it) => `"${formatCriterionLabel(it.label, lang)} (${it.max}%)"`).join(',');
    let csv = `\uFEFF${t('ተ.ቁ', 'No.')},${t('መለያ ቁጥር (ID)', 'Student ID')},${t('የተማሪ ስም', 'Student Name')},${t('ጾታ', 'Gender')},${headers},${t('ድምር (100%)', 'Total (100%)')},${t('የውጤት ፊደል', 'Grade')},${t('ነጥብ', 'Points')}\n`;

    enrolled.forEach((s, idx) => {
      const targetYear = course.academicYear || currentYear;
      const targetSem = course.semester || (course.schedule && course.schedule.includes('2ኛ') ? '2' : '1') || currentSemester;
      const g = resolveGradeBreakdown(grades, s.uid, course.id, targetYear, targetSem, s.id);
      const eff = getEffectiveGradeValues(g, criteria);
      const scoresCols = criteria.map((it, itIdx) => getCriterionScore(g, it.id, itIdx)).join(',');

      csv += `${idx + 1},"${s.id}","${s.name}","${formatGender(s.gender, lang)}",${scoresCols},${eff.total},"${eff.letter}",${eff.points.toFixed(2)}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Grades_${course.id}_${course.program}_${currentYear}_S${currentSemester}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showNotify(
      t(
        `የ${course.name} ውጤት CSV ፋይል ዳውንሎድ ተደርጓል!`,
        `CSV grade report for ${formatCourseTitle(course.name, lang)} downloaded!`
      ),
      'success'
    );
  };

  // Memoized Top Performers (ranked by GPA, breaking 4.00/equal GPA ties by most A+ course grades)
  const { rankedDegreeAll, rankedDiplomaAll, rankByUid } = React.useMemo(() => {
    const deg = rankStudentsByPerformance(
      students.filter((s) => s.program === 'Degree'),
      courses,
      grades,
      currentYear,
      currentSemester
    );
    const dip = rankStudentsByPerformance(
      students.filter((s) => s.program === 'Diploma'),
      courses,
      grades,
      currentYear,
      currentSemester
    );
    const lookup = new Map<string, RankedStudentEntry>();
    deg.forEach((entry) => lookup.set(entry.student.uid, entry));
    dip.forEach((entry) => lookup.set(entry.student.uid, entry));

    return {
      rankedDegreeAll: deg,
      rankedDiplomaAll: dip,
      rankByUid: lookup
    };
  }, [students, courses, grades, currentYear, currentSemester]);

  const topDegree = showAllRanks ? rankedDegreeAll : rankedDegreeAll.slice(0, 3);
  const topDiploma = showAllRanks ? rankedDiplomaAll : rankedDiplomaAll.slice(0, 3);

  const deanTbodyRef = React.useRef<HTMLTableSectionElement | null>(null);
  const deanRowCountRef = React.useRef(supervisedStudents.length);
  deanRowCountRef.current = supervisedStudents.length;
  const deanColCountRef = React.useRef(5);
  deanColCountRef.current = selectedSupervisedCourse ? getCourseAssessmentItems(selectedSupervisedCourse).length : 5;

  const handleDeanCellKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLElement>, r: number, c: number) => {
      const maxRows = deanRowCountRef.current;
      const maxCols = deanColCountRef.current;
      let nextR = r;
      let nextC = c;

      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        nextR = Math.min(maxRows - 1, r + 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        nextR = Math.max(0, r - 1);
      } else if (e.key === 'ArrowRight') {
        const input = e.currentTarget as HTMLInputElement;
        if (input.selectionStart === null || input.selectionStart === input.value.length) {
          e.preventDefault();
          nextC = Math.min(maxCols - 1, c + 1);
        }
      } else if (e.key === 'ArrowLeft') {
        const input = e.currentTarget as HTMLInputElement;
        if (input.selectionStart === null || input.selectionStart === 0) {
          e.preventDefault();
          nextC = Math.max(0, c - 1);
        }
      } else {
        return;
      }

      if (nextR === r && nextC === c) return;

      const rowEl = deanTbodyRef.current?.rows[nextR];
      const target = rowEl
        ? rowEl.querySelector<HTMLElement>(`[data-cell-c="${nextC}"]`)
        : document.querySelector<HTMLElement>(`[data-cell-r="${nextR}"][data-cell-c="${nextC}"]`);
      if (target) {
        target.focus();
        if (target instanceof HTMLInputElement) {
          target.select();
        }
      }
    },
    []
  );

  return (
    <div className="space-y-4 sm:space-y-6 no-print">
      {/* Top Dean Controls */}
      <div className="bg-white p-4 sm:p-6 rounded-3xl shadow-sm border border-slate-200/80 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-lg sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Award className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-800 shrink-0" />
            <span>{t('የዋና ዲን (Academic Dean) ፖርታል', 'Academic Dean Portal')}</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {t(
              'የትምህርት ዘመን፣ የኮርሶችና የመምህራን ምደባ፣ የውጤት ማጽደቂያ፣ እና ይፋዊ ትራንስክሪፕት ማዘጋጃ',
              'Academic calendar, course & instructor allocations, grade supervision & official transcripts'
            )}
          </p>
        </div>

        {/* Academic Year, Semester & Grade Publish */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Year select + Add year */}
          <div className="flex items-center gap-1.5 bg-amber-50/80 border border-amber-300 rounded-xl px-2.5 sm:px-3 py-1.5 shadow-xs min-h-[40px]">
            <Calendar className="w-4 h-4 text-amber-700 shrink-0" />
            <label className="text-[11px] sm:text-xs font-bold text-amber-900">{t('ዘመን:', 'Year:')}</label>
            <select
              value={currentYear}
              onChange={(e) => onYearChange(e.target.value)}
              className="text-xs font-bold bg-transparent text-amber-900 focus:outline-none cursor-pointer"
            >
              {availableYears.map((y) => (
                <option key={y} value={y} className="text-slate-800">
                  {formatCalendarYear(y, lang)}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowAddYearModal(true)}
              className="ml-1 p-1.5 rounded-md bg-amber-200 hover:bg-amber-300 text-amber-900 font-bold text-xs cursor-pointer"
              title={t('አዲስ የትምህርት ዘመን ጨምር', 'Add New Academic Year')}
            >
              <Plus className="w-3 h-3 inline" />
            </button>
          </div>

          {/* Semester select */}
          <div className="flex items-center gap-1.5 bg-amber-50/80 border border-amber-300 rounded-xl px-2.5 sm:px-3 py-1.5 shadow-xs min-h-[40px]">
            <label className="text-[11px] sm:text-xs font-bold text-amber-900">{t('ሴሚስተር:', 'Semester:')}</label>
            <select
              value={currentSemester}
              onChange={(e) => onSemesterChange(e.target.value)}
              className="text-xs font-bold bg-transparent text-amber-900 focus:outline-none cursor-pointer"
            >
              <option value="1" className="text-slate-800">{formatSemester('1', lang)}</option>
              <option value="2" className="text-slate-800">{formatSemester('2', lang)}</option>
              <option value="ALL" className="text-slate-800">{t('ሁሉም ሴሚስተሮች', 'All Semesters')}</option>
            </select>
          </div>

          {/* Grade Approval / Publish Buttons */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onToggleGradePublication}
              className={`px-3 py-2 text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer min-h-[40px] ${
                gradePublished
                  ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                  : 'bg-amber-600 hover:bg-amber-700 text-white'
              }`}
            >
              {gradePublished ? (
                <>
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>🌐 {t('ለሁሉም አሳይ', 'Visible to All')}</span>
                </>
              ) : (
                <>
                  <EyeOff className="w-4 h-4 shrink-0" />
                  <span>🔒 {t('ለሁሉም እገድ', 'Hidden from All')}</span>
                </>
              )}
            </button>

            {onToggleStudentPdfPrint && (
              <button
                type="button"
                onClick={onToggleStudentPdfPrint}
                className={`px-3 py-2 text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer min-h-[40px] ${
                  studentPdfPrintAllowed
                    ? 'bg-indigo-700 hover:bg-indigo-800 text-white'
                    : 'bg-slate-700 hover:bg-slate-800 text-amber-300'
                }`}
                title={t('የተማሪዎችን የፒዲኤፍ ማተም ሁነታ ያብሩ/ያጥፉ', 'Toggle student PDF printing')}
              >
                {studentPdfPrintAllowed ? (
                  <>
                    <Printer className="w-4 h-4 text-amber-300 shrink-0" />
                    <span>🖨️ {t('ፒዲኤፍ ተፈቅዷል', 'PDF Allowed')}</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>🚫 {t('ፒዲኤፍ ታግዷል', 'PDF Blocked')}</span>
                  </>
                )}
              </button>
            )}

            {onOpenReleaseManager && (
              <button
                type="button"
                onClick={onOpenReleaseManager}
                className="bg-indigo-700 hover:bg-indigo-800 text-white font-extrabold text-xs px-3 py-2 rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer min-h-[40px]"
                title={t('በተማሪዎች መርጦ ውጤትና ትራንስክሪፕት መፍቀጃና ማገጃ', 'Selective student grade & transcript release')}
              >
                <span>🔒 {t('በልዩነት መፍቀድ/ማገድ', 'Selective Release')}</span>
              </button>
            )}

            {onDownloadFullBackup && (
              <button
                type="button"
                onClick={onDownloadFullBackup}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs px-3 py-2 rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer min-h-[40px]"
                title={t('ሙሉ የሲስተም JSON ፋይል ወደ ኮምፒውተርህ አውርድ (Download Complete Master JSON)', 'Download Complete Master JSON Backup')}
              >
                <Download className="w-4 h-4 text-amber-300 shrink-0" />
                <span>💾 {t('JSON አውርድ', 'Download JSON')}</span>
              </button>
            )}

            {onOpenJsonReaderModal && (
              <button
                type="button"
                onClick={onOpenJsonReaderModal}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-3 py-2 rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer min-h-[40px]"
                title={t('የተማሪዎችን ውጤቶችና ባክአፕ መረጃ ከJSON ፋይል አንብብ', 'Read grades & backup data from JSON file')}
              >
                <FileCode className="w-4 h-4 text-amber-300 shrink-0" />
                <span>📂 {t('JSON አንብብ', 'Read JSON')}</span>
              </button>
            )}

            {onOpenArchiveModal && (
              <button
                type="button"
                onClick={onOpenArchiveModal}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs px-3 py-2 rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer min-h-[40px]"
                title={t('የቀደሙ ሥራዎችና ማህደር መፈለጊያ ማዕከል', 'Historical Records & Archive Center')}
              >
                <History className="w-4 h-4 text-slate-950 shrink-0" />
                <span>🔍 {t('ማህደር', 'Archive')}</span>
              </button>
            )}

            {onOpenFirebaseModal && (
              <button
                type="button"
                onClick={onOpenFirebaseModal}
                className={`font-extrabold text-xs px-3 py-2 rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer min-h-[40px] ${
                  firebaseReport?.status === 'connected'
                    ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                    : isTestingFirebase
                    ? 'bg-amber-600 hover:bg-amber-700 text-white animate-pulse'
                    : 'bg-rose-700 hover:bg-rose-800 text-white'
                }`}
                title={t('የFirebase Cloud Firestore ዳታቤዝ የቀጥታ ሁኔታና ማመሳከሪያ', 'Firebase Cloud Firestore live status & sync')}
              >
                <Cloud className="w-4 h-4 text-amber-300 shrink-0" />
                <span>
                  ☁️ Firebase (
                  {isTestingFirebase
                    ? t('በመፈተሽ ላይ...', 'Checking...')
                    : firebaseReport?.status === 'connected'
                    ? t('ተገናኝቷል', 'Connected')
                    : t('ፈትሽ / እደስ', 'Check / Sync')}
                  )
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Dean Semester Release Control Panel */}
      {semesterRelease && onToggleSemesterRelease && onToggleAllSemestersRelease && (
        <SemesterReleaseControl
          semesterRelease={semesterRelease}
          onToggleSemesterRelease={onToggleSemesterRelease}
          onToggleAllSemestersRelease={onToggleAllSemestersRelease}
          userRole="DEAN"
        />
      )}

      {/* Top Academic Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-gradient-to-br from-indigo-800 to-indigo-950 text-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold text-indigo-200 uppercase tracking-wider">{t('የድግሪ ከፍተኛ ውጤት (Rank 1)', 'Top Degree Student (Rank 1)')}</p>
              <h4 className="text-sm font-extrabold text-amber-300 mt-1 truncate max-w-[170px]">
                {rankedDegreeAll[0]?.student.name || '—'}
              </h4>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <p className="text-xl font-black font-mono text-white">
                  GPA: {rankedDegreeAll[0]?.stats.gpaStr || '0.00'}
                </p>
                {(rankedDegreeAll[0]?.stats.aPlusCount || 0) > 0 && (
                  <span className="text-[10px] font-black bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full">
                    A+ ×{rankedDegreeAll[0].stats.aPlusCount}
                  </span>
                )}
              </div>
            </div>
            <div className="p-2 sm:p-3 bg-white/10 rounded-xl sm:rounded-2xl backdrop-blur-xs hidden sm:flex">
              <Award className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-800 to-teal-950 text-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start gap-2">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-[11px] font-bold text-emerald-200 uppercase tracking-wider truncate">{t('የዲፕሎማ 1ኛ ደረጃ', 'Top Diploma Student')}</p>
              <h4 className="text-xs sm:text-sm font-extrabold text-amber-300 mt-1 truncate">
                {rankedDiplomaAll[0]?.student.name || '—'}
              </h4>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <p className="text-lg sm:text-xl font-black font-mono text-white">
                  GPA: {rankedDiplomaAll[0]?.stats.gpaStr || '0.00'}
                </p>
                {(rankedDiplomaAll[0]?.stats.aPlusCount || 0) > 0 && (
                  <span className="text-[10px] font-black bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full">
                    A+ ×{rankedDiplomaAll[0].stats.aPlusCount}
                  </span>
                )}
              </div>
            </div>
            <div className="p-2 sm:p-3 bg-white/10 rounded-xl sm:rounded-2xl backdrop-blur-xs hidden sm:flex">
              <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-300" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-700 to-amber-950 text-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start gap-2">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-[11px] font-bold text-amber-200 uppercase tracking-wider truncate">{t('የትምህርት ሰሌዳና ኮርሶች', 'Courses & Schedule')}</p>
              <h3 className="text-2xl sm:text-3xl font-black font-mono text-white mt-1">{courses.length}</h3>
              <p className="text-[10px] sm:text-[11px] text-amber-200 mt-1 truncate">
                {t('መምህራን:', 'Instructors:')} {teachers.filter((trItem) => !trItem.includes('—')).length} {t('ተመድበዋል', 'assigned')}
              </p>
            </div>
            <div className="p-2 sm:p-3 bg-white/10 rounded-xl sm:rounded-2xl backdrop-blur-xs hidden sm:flex">
              <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-cyan-800 to-blue-950 text-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start gap-2">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-[11px] font-bold text-cyan-200 uppercase tracking-wider truncate">{t('የተማሪዎች ይፋዊ ትራንስክሪፕት', 'Official Transcripts')}</p>
              <h3 className="text-2xl sm:text-3xl font-black font-mono text-white mt-1">{students.length}</h3>
              <p className="text-[10px] sm:text-[11px] text-cyan-200 mt-1 truncate">
                {officialConfig?.showStamp ? t('ከማኅተም ጋር', 'With Official Stamp') : t('ክፍት የፊርማ ቦታ', 'Open Signature Area')}
              </p>
            </div>
            <div className="p-2 sm:p-3 bg-white/10 rounded-xl sm:rounded-2xl backdrop-blur-xs hidden sm:flex">
              <Printer className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-300" />
            </div>
          </div>
        </div>
      </div>

      {/* Dean Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pb-0.5">
        <button
          onClick={() => setActiveTab('courses')}
          className={`py-2.5 px-3.5 sm:px-4 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 min-h-[44px] ${
            activeTab === 'courses'
              ? 'border-emerald-700 text-emerald-800 bg-white shadow-xs'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{t('የኮርሶች ድልድልና ሰሌዳ', 'Courses & Allocations')} ({courses.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('supervision')}
          className={`py-2.5 px-3.5 sm:px-4 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 min-h-[44px] ${
            activeTab === 'supervision'
              ? 'border-indigo-700 text-indigo-800 bg-white shadow-xs'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Eye className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>{t('የመምህራን ውጤት መቆጣጠሪያ', 'Grade Supervision')}</span>
        </button>

        <button
          onClick={() => setActiveTab('transcripts')}
          className={`py-2.5 px-3.5 sm:px-4 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 min-h-[44px] ${
            activeTab === 'transcripts'
              ? 'border-amber-600 text-amber-800 bg-white shadow-xs'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Printer className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{t('ትራንስክሪፕት ማዘጋጃ', 'Transcripts')} ({students.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('teachers')}
          className={`py-2.5 px-3.5 sm:px-4 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 min-h-[44px] ${
            activeTab === 'teachers'
              ? 'border-teal-700 text-teal-800 bg-white shadow-xs'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4 text-teal-700 shrink-0" />
          <span>{t('የመምህራን ዝርዝር', 'Instructors')} ({teachers.filter(trItem => !trItem.includes('—')).length})</span>
        </button>

        <button
          onClick={() => setActiveTab('graduation')}
          className={`py-2.5 px-3.5 sm:px-4 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 min-h-[44px] ${
            activeTab === 'graduation'
              ? 'border-emerald-700 text-emerald-800 bg-white shadow-xs'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <GraduationCap className="w-4 h-4 text-amber-500 shrink-0" />
          <span>{t('የተማራቂዎች ማህደር', 'Graduation & Alumni')}</span>
        </button>

        <button
          onClick={() => setActiveTab('official_signatures')}
          className={`py-2.5 px-3.5 sm:px-4 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 min-h-[44px] ${
            activeTab === 'official_signatures'
              ? 'border-purple-700 text-purple-800 bg-white shadow-xs'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Award className="w-4 h-4 text-purple-700 shrink-0" />
          <span>{t('ይፋዊ ማኅተምና ፊርማ', 'Stamps & Signatures')}</span>
        </button>
      </div>

      {/* TAB 1: Course Allocations & Schedule */}
      {activeTab === 'courses' && (
        <TeacherAllocationManager
          courses={courses}
          teachers={teachers}
          onUpdateCourseTeacher={(courseId, newTeacher) => {
            if (onQuickAssignTeacher) {
              onQuickAssignTeacher(courseId, newTeacher);
            } else if (onSaveCourses) {
              const updated = courses.map((c) => (c.id === courseId ? { ...c, teacher: newTeacher } : c));
              onSaveCourses(updated);
              showNotify(
                newTeacher === 'አልተመደበም (—)'
                  ? t('የመምህር ምደባ ተነስቷል!', 'Instructor assignment cleared!')
                  : t(`መምህር ${newTeacher} ተመድቧል!`, `Instructor ${newTeacher} assigned!`),
                'success'
              );
            }
          }}
          onOpenAddCourse={onOpenAddCourse}
          onOpenEditCourse={onOpenEditCourse}
          onDeleteCourse={onDeleteCourse}
          onBatchDeleteCourses={onBatchDeleteCourses}
          onOpenAddTeacher={() => setShowAddTeacherModal(true)}
          onDownloadCourseGrades={handleDownloadCourseGrades}
          showNotify={showNotify}
          currentYear={currentYear}
          currentSemester={currentSemester}
          availableYears={availableYears}
          allowEditDelete={true}
        />
      )}

      {/* TAB 2: Grade Supervision, Editing & Approval */}
      {activeTab === 'supervision' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-4 sm:p-6 space-y-4">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 border-b pb-3">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
                <Eye className="w-5 h-5 text-indigo-700 shrink-0" />
                <span>{t('የመምህራን ውጤት መቆጣጠሪያ፣ ማረሚያ እና ማጽደቂያ', 'Instructor Grade Supervision, Editing & Approval')}</span>
              </h3>
              <p className="text-xs text-slate-500">
                {t(
                  'ዲን የሁሉም መምህራንን ውጤት በቀጥታ ማየት፣ ማስተካከልና ማረም ይችላል',
                  'The Dean can directly review, edit, and approve grades for all courses'
                )}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
              <select
                value={superviseCourseId}
                onChange={(e) => setSuperviseCourseId(e.target.value)}
                className="w-full sm:w-auto max-w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-indigo-600 min-h-[40px]"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    [{formatProgram(c.program, lang)}] {formatCourseTitle(c.name, lang)} — {formatTeacherDisplay(c.teacher, lang)}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => {
                  setBatchInitialCriterionId(undefined);
                  setIsBatchFillOpen(true);
                }}
                className="bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 border border-amber-500 text-xs px-3 py-2 rounded-xl font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs hover:shadow-sm min-h-[38px]"
                title={t('ተመሳሳይ ውጤት በአንድ ጊዜ ለሁሉም ተማሪዎች ለመሙላት ይጫኑ', 'Batch fill identical score for all students')}
              >
                <CheckCheck className="w-3.5 h-3.5 text-slate-950 shrink-0" />
                <span>{t('ተመሳሳይ ውጤት ሙላ', 'Batch Fill')}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsExcelUploadOpen(true)}
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border border-emerald-400 text-xs px-3 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs min-h-[38px]"
                title={t('ውጤት ከማይክሮሶፍት ኤክሴል (.xlsx / .csv) ለመጫን', 'Upload scores from Excel (.xlsx / .csv)')}
              >
                <Upload className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span>{t('ኤክሴል ጫን', 'Upload Excel')}</span>
              </button>

              <button
                type="button"
                onClick={handleExportDeanExcel}
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border border-emerald-400 text-xs px-3 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs min-h-[38px]"
                title={t('የዚህን ኮርስ ውጤት በኤክሴል (.xlsx) ለማውረድ', 'Download course grades as Excel (.xlsx)')}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span>{t('ኤክሴል አውርድ', 'Download Excel')}</span>
              </button>

              <button
                type="button"
                onClick={() => exportMasterSemesterGradeSheetToExcel(students, courses, grades, currentYear, currentSemester)}
                className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs px-3 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs min-h-[38px]"
                title={t('የሁሉንም ተማሪዎች አጠቃላይ ውጤት በኤክሴል (.xlsx) ለማውረድ', 'Download Master Semester Grade Sheet (.xlsx)')}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200 shrink-0" />
                <span>{t('ጠቅላላ ኤክሴል', 'Master Excel')}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsPdfModalOpen(true)}
                className="bg-cyan-50 hover:bg-cyan-100 text-cyan-950 border border-cyan-300 text-xs px-3 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs min-h-[38px]"
                title={t('ይፋዊ የውጤት ሰነድ ለማተም ወይም በፒዲኤፍ (PDF) ለማስቀመጥ', 'Print or save course grade report PDF')}
              >
                <Printer className="w-3.5 h-3.5 text-cyan-700 shrink-0" />
                <span>{t('ሰነድ (PDF)', 'Report (PDF)')}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsMasterPdfOpen(true)}
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-950 border border-indigo-300 text-xs px-3 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs min-h-[38px]"
                title={t('የሁሉንም ተማሪዎች አጠቃላይ ውጤት በፒዲኤፍ ለማየትና ለማተም', 'Preview & print Master Semester PDF')}
              >
                <Printer className="w-3.5 h-3.5 text-indigo-700 shrink-0" />
                <span>{t('ጠቅላላ (PDF)', 'Master (PDF)')}</span>
              </button>

              {onClearAllGrades && (
                <button
                  type="button"
                  onClick={() => {
                    if (
                      window.confirm(
                        t(
                          'ማስጠንቀቂያ፦ ሁሉንም የውጤት ማስገቢያ ቦታዎች ባዶ ማድረግ ይፈልጋሉ? ይህ መምህራን አዲስ ውጤት ከባዶ እንዲያስገቡ ያደርጋል።',
                          'Warning: Clear all grade entry fields? Instructors will need to re-enter scores from scratch.'
                        )
                      )
                    ) {
                      onClearAllGrades();
                    }
                  }}
                  className="bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs px-3 py-2 rounded-xl font-bold border border-rose-200 transition-colors flex items-center gap-1 cursor-pointer min-h-[38px]"
                  title={t('ሁሉንም የውጤት ማስገቢያዎች ባዶ አድርግ', 'Clear all grade entries')}
                >
                  <Trash2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{t('ባዶ አድርግ', 'Clear All')}</span>
                </button>
              )}

              <button
                onClick={handleSaveDeanGrades}
                className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 shadow-sm cursor-pointer min-h-[38px]"
              >
                <Save className="w-3.5 h-3.5 shrink-0" />
                <span>{t('ለውጦችን መዝግብ', 'Save Changes')}</span>
              </button>
            </div>
          </div>

          {(() => {
            const criteria = getCourseAssessmentItems(selectedSupervisedCourse);
            const totalWeight = criteria.reduce((sum, it) => sum + (Number(it.max) || 0), 0);

            return isMobileViewport ? (
              <div className="space-y-3">
                {supervisedStudents.map((s) => (
                  <StandardGradeMobileCard
                    key={s.uid}
                    student={s}
                    breakdown={editingGradeMatrix[s.uid]}
                    criteria={criteria}
                    onScoreChange={handleDeanCriterionChange}
                  />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto max-h-96 overflow-y-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-100/95 sticky top-0 font-bold uppercase text-[10px] z-20">
                    <tr>
                      <th className="p-2.5 bg-slate-100">ID</th>
                      <th className="p-2.5 bg-slate-100 sticky left-0 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)]">{t('የተማሪ ስም', 'Student Name')}</th>
                      {criteria.map((it, idx) => {
                        const color = getCriterionColor(idx);
                        const label = formatCriterionLabel(it.label, lang);
                        return (
                          <th
                            key={it.id}
                            className={`p-2.5 text-center min-w-[75px] ${color.headerBg} border-b-2 ${color.headerBorder}`}
                          >
                            <div className="flex items-center justify-center gap-1">
                              <span className="font-bold truncate max-w-[70px]">{label}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setBatchInitialCriterionId(it.id);
                                  setIsBatchFillOpen(true);
                                }}
                                className="p-0.5 rounded text-amber-700 hover:text-amber-950 hover:bg-amber-100 transition-colors cursor-pointer"
                                title={t(`ለሙሉ ተማሪዎች '${it.label}' ተመሳሳይ ውጤት ሙላ`, `Batch fill '${label}' for all students`)}
                              >
                                <Copy className="w-2.5 h-2.5" />
                              </button>
                            </div>
                            <span className="block text-[9px] font-mono font-black">({it.max}%)</span>
                          </th>
                        );
                      })}
                      <th className="p-2.5 text-center bg-emerald-100/70 text-emerald-950 border-b-2 border-emerald-500 font-black">
                        <div className="flex items-center justify-center gap-1">
                          <span>{t('ድምር', 'Total')} ({totalWeight}%)</span>
                          <button
                            type="button"
                            onClick={() => {
                              setBatchInitialCriterionId('TOTAL');
                              setIsBatchFillOpen(true);
                            }}
                            className="p-0.5 rounded text-emerald-800 hover:bg-emerald-200 transition-colors cursor-pointer"
                            title={t('ለሙሉ ተማሪዎች ተመሳሳይ ድምር ውጤት (Total) ሙላ', 'Batch fill Total score for all students')}
                          >
                            <Copy className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </th>
                      <th className="p-2.5 text-center bg-amber-100/70 text-amber-950 border-b-2 border-amber-500 font-black">
                        {t('ፊደል', 'Grade')}
                      </th>
                      <th className="p-2.5 text-center bg-slate-100 text-slate-800">{t('ነጥብ', 'Points')}</th>
                    </tr>
                  </thead>
                  <tbody ref={deanTbodyRef} className="divide-y divide-slate-100">
                    {supervisedStudents.map((s, idx) => (
                      <StandardGradeDesktopRow
                        key={s.uid}
                        student={s}
                        rowIndex={idx}
                        breakdown={editingGradeMatrix[s.uid]}
                        criteria={criteria}
                        onScoreChange={handleDeanCriterionChange}
                        onCellKeyDown={handleDeanCellKeyDown}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      )}

      {/* TAB 3: Direct Transcript Printing for Degree & Diploma */}
      {activeTab === 'transcripts' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-3">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
                <Printer className="w-5 h-5 text-amber-600 shrink-0" />
                <span>{t('የትራንስክሪፕት ማዘጋጃና ማተሚያ (Transcript Preparation)', 'Transcript Preparation & Printing')}</span>
              </h3>
              <p className="text-xs text-slate-500">
                {t(
                  'ዋና ዲን የድግሪም ሆነ የዲፕሎማ ተማሪዎችን ይፋዊ ትራንስክሪፕት በቀጥታ ማዘጋጀትና ማተም ይችላል',
                  'Prepare and print official transcripts for both Degree and Diploma students'
                )}
              </p>
            </div>
            {onOpenAddStudent && (
              <button
                onClick={onOpenAddStudent}
                className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs px-3.5 py-2.5 rounded-xl font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs min-h-[40px] shrink-0"
              >
                <UserPlus className="w-4 h-4" />
                <span>{t('አዲስ ተማሪ መዝግብ', 'Register Student')}</span>
              </button>
            )}
          </div>

          {isMobileViewport ? (
            <div className="space-y-2.5 max-h-[65vh] overflow-y-auto pr-0.5">
              {transcriptSortedStudents.map((s) => {
                const rankEntry = rankByUid.get(s.uid);
                const gpa = rankEntry ? rankEntry.stats.gpaStr : calculateStudentGPA(s, courses, grades, currentYear, currentSemester);
                return (
                  <div key={s.uid} className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2.5">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 text-sm truncate">{s.name}</p>
                        <p className="text-[11px] font-mono text-slate-500">
                          ID: {s.id} • {formatProgram(s.program, lang)} • {formatYearLevel(s.currentStudyYear || 1, lang)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {rankEntry && rankEntry.rank > 0 && (
                          <span className="font-mono font-black text-indigo-800 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg text-[11px]">
                            #{rankEntry.rank}
                          </span>
                        )}
                        <span className="font-mono font-black text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg text-xs">
                          GPA {gpa}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      {onOpenEditStudent && (
                        <button
                          onClick={() => onOpenEditStudent(s)}
                          className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs py-2 rounded-xl font-bold inline-flex items-center justify-center gap-1 cursor-pointer min-h-[40px]"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>{t('ስም አርም', 'Edit Info')}</span>
                        </button>
                      )}
                      <button
                        onClick={() => onSelectPrintTranscript(s)}
                        className="flex-1 bg-emerald-800 hover:bg-emerald-900 text-white text-xs py-2 rounded-xl font-bold shadow-xs inline-flex items-center justify-center gap-1 cursor-pointer min-h-[40px]"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>{t('ትራንስክሪፕት አትም', 'Print Transcript')}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[11px] sticky top-0 z-10">
                  <tr>
                    <th className="p-2.5">{t('ተ.ቁ', 'No.')}</th>
                    <th className="p-2.5">{t('መለያ ቁጥር (ID)', 'Student ID')}</th>
                    <th className="p-2.5">{t('የተማሪ ስም', 'Student Name')}</th>
                    <th className="p-2.5">{t('ፕሮግራም', 'Program')}</th>
                    <th className="p-2.5">{t('ደረጃ / ዓመት', 'Year Level')}</th>
                    <th className="p-2.5">{t('የትምህርት ዝግጅት', 'Study Track')}</th>
                    <th className="p-2.5 text-center">{t('ሴሚስተር GPA', 'Semester GPA')}</th>
                    <th className="p-2.5 text-center">{t('ደረጃ (Rank)', 'Rank')}</th>
                    <th className="p-2.5 text-right">{t('ተግባር (Actions)', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transcriptSortedStudents.map((s, idx) => {
                    const rankEntry = rankByUid.get(s.uid);
                    const gpa = rankEntry ? rankEntry.stats.gpaStr : calculateStudentGPA(s, courses, grades, currentYear, currentSemester);

                    return (
                      <tr key={s.uid} className="hover:bg-slate-50">
                        <td className="p-2.5 font-mono text-slate-400">{idx + 1}</td>
                        <td className="p-2.5 font-mono font-bold text-slate-800">{s.id}</td>
                        <td className="p-2.5 font-bold text-slate-900">{s.name}</td>
                        <td className="p-2.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            s.program === 'Degree' ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {formatProgram(s.program, lang)}
                          </span>
                        </td>
                        <td className="p-2.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            s.currentStudyYear === 2 ? 'bg-amber-100 text-amber-950 border border-amber-300' : s.currentStudyYear === 3 ? 'bg-purple-100 text-purple-900' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {formatYearLevel(s.currentStudyYear || 1, lang)}
                          </span>
                        </td>
                        <td className="p-2.5 text-[11px] text-slate-600">
                          {s.program === 'Diploma'
                            ? t('ዲፕሎማ (2 ዓመት)', 'Diploma (2 Years)')
                            : formatDegreeTrack(s.degreeTrack, s.priorDiploma, lang)}
                        </td>
                        <td className="p-2.5 text-center font-black text-amber-700 font-mono">{gpa}</td>
                        <td className="p-2.5 text-center font-mono">
                          {rankEntry && rankEntry.rank > 0 ? (
                            <div className="inline-flex items-center gap-1">
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-indigo-50 text-indigo-800 border border-indigo-200">
                                #{rankEntry.rank}
                              </span>
                              {rankEntry.stats.aPlusCount > 0 && (
                                <span className="text-[10px] font-bold text-emerald-700" title={t('የA+ ብዛት', 'A+ Count')}>
                                  ({rankEntry.stats.aPlusCount} A+)
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="p-2.5 text-right space-x-1.5 space-x-reverse whitespace-nowrap">
                          {onOpenEditStudent && (
                            <button
                              onClick={() => onOpenEditStudent(s)}
                              className="bg-amber-500 hover:bg-amber-600 text-slate-950 text-[11px] px-2.5 py-1.5 rounded-lg font-bold inline-flex items-center gap-1 cursor-pointer"
                              title={t('የተማሪውን ስም እና መረጃ አዲት አድርግ', 'Edit Student Name & Details')}
                            >
                              <Edit className="w-3.5 h-3.5" />
                              <span>{t('ስም አርም', 'Edit')}</span>
                            </button>
                          )}
                          <button
                            onClick={() => onSelectPrintTranscript(s)}
                            className="bg-emerald-800 hover:bg-emerald-900 text-white text-[11px] px-3 py-1.5 rounded-lg font-bold shadow-xs inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>{t('ትራንስክሪፕት አትም', 'Print Transcript')}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Manage Teachers */}
      {activeTab === 'teachers' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-3">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-800 shrink-0" />
                <span>{t('የመምህራን ማህደርና ምደባ', 'Instructor Directory & Assignments')}</span>
              </h3>
              <p className="text-xs text-slate-500">
                {t('አዳዲስ መምህራንን መመዝገብና ለኮርሶች መመደብ', 'Register new instructors and review course assignments')}
              </p>
            </div>

            <button
              onClick={() => setShowAddTeacherModal(true)}
              className="bg-emerald-800 hover:bg-emerald-900 text-white text-xs px-3.5 py-2.5 rounded-xl font-bold flex items-center gap-1.5 shadow-sm cursor-pointer min-h-[40px] shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              <span>{t('አዲስ መምህር ጨምር', 'Add Instructor')}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {teachers.filter(trItem => !trItem.includes('—')).map((trName, idx) => {
              const assignedCount = courses.filter(c => c.teacher === trName).length;
              return (
                <div key={trName} className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200 flex justify-between items-center gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-xs text-slate-900 truncate">{trName}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {t('የተመደቡ ኮርሶች:', 'Assigned Courses:')} <strong>{assignedCount}</strong>
                    </p>
                  </div>
                  <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
                    {idx + 1}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Top Performers Ranking */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-start gap-2.5">
            <Trophy className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-800">
                {t('የሴሚስተሩ ከፍተኛ ውጤት ያመጡ ተማሪዎች (Top Performers Ranking)', 'Semester Top Performers & Ranking')}
              </h3>
              <p className="text-xs text-slate-500">
                {t('የትምህርት ዘመን', 'Academic Year')} {formatCalendarYear(currentYear, lang)} | {formatSemester(currentSemester, lang)}
              </p>
              <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-2.5 py-1 mt-1.5 inline-block font-semibold">
                {t(
                  '★ የደረጃ መስፈርት፦ GPA እኩል ሲሆን (ለምሳሌ ሁሉም 4.00 ሲያመጡ) አብዛኛውን A+ ያመጣ ተማሪ ቅድሚያ ደረጃ ያገኛል።',
                  '★ Tie-Breaker: When GPAs are equal (e.g., 4.00), students with more A+ course grades rank higher.'
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowAllRanks((prev) => !prev)}
            className="self-start sm:self-center text-xs font-bold px-3.5 py-2 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800 transition-colors cursor-pointer shrink-0"
          >
            {showAllRanks
              ? t('ምርጥ 3 ብቻ አሳይ (Top 3)', 'Show Top 3 Only')
              : t('የሁሉንም ተማሪዎች ደረጃ አሳይ (View All Ranks)', 'Show All Student Ranks')}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200/80">
            <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider mb-3 flex items-center justify-between pb-2 border-b border-indigo-200">
              <span>{t('የድግሪ ፕሮግራም (Degree)', 'Degree Program')}</span>
              <span className="text-[11px] font-normal text-indigo-700">
                {showAllRanks ? `${rankedDegreeAll.length} ${t('ተማሪዎች', 'Students')}` : 'Top 3'}
              </span>
            </h4>
            <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
              {topDegree.map((entry) => (
                <div
                  key={entry.student.uid}
                  className="flex justify-between items-center gap-2 bg-white p-3 rounded-xl border border-slate-200 shadow-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${
                        entry.rank === 1
                          ? 'bg-amber-400 text-slate-950'
                          : entry.rank === 2
                          ? 'bg-slate-300 text-slate-800'
                          : entry.rank === 3
                          ? 'bg-amber-700 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {entry.rank > 0 ? entry.rank : '—'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{entry.student.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        ID: {entry.student.id}
                        {entry.stats.gradedCourseCount > 0 && ` • ${t('አማካይ', 'Avg')}: ${entry.stats.averageScore.toFixed(1)}%`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {entry.stats.aPlusCount > 0 && (
                      <span
                        className="font-mono font-black text-[10px] text-emerald-900 bg-emerald-100 px-2 py-1 rounded-lg border border-emerald-300"
                        title={t('በኮርሶች ያገኙት የA+ ብዛት', 'Number of A+ course grades')}
                      >
                        A+ ×{entry.stats.aPlusCount}
                      </span>
                    )}
                    <span className="font-mono font-black text-xs text-indigo-900 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
                      GPA: {entry.stats.gpaStr}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200/80">
            <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider mb-3 flex items-center justify-between pb-2 border-b border-emerald-200">
              <span>{t('የዲፕሎማ ፕሮግራም (Diploma)', 'Diploma Program')}</span>
              <span className="text-[11px] font-normal text-emerald-700">
                {showAllRanks ? `${rankedDiplomaAll.length} ${t('ተማሪዎች', 'Students')}` : 'Top 3'}
              </span>
            </h4>
            <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
              {topDiploma.map((entry) => (
                <div
                  key={entry.student.uid}
                  className="flex justify-between items-center gap-2 bg-white p-3 rounded-xl border border-slate-200 shadow-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${
                        entry.rank === 1
                          ? 'bg-amber-400 text-slate-950'
                          : entry.rank === 2
                          ? 'bg-slate-300 text-slate-800'
                          : entry.rank === 3
                          ? 'bg-amber-700 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {entry.rank > 0 ? entry.rank : '—'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{entry.student.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        ID: {entry.student.id}
                        {entry.stats.gradedCourseCount > 0 && ` • ${t('አማካይ', 'Avg')}: ${entry.stats.averageScore.toFixed(1)}%`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {entry.stats.aPlusCount > 0 && (
                      <span
                        className="font-mono font-black text-[10px] text-amber-950 bg-amber-100 px-2 py-1 rounded-lg border border-amber-300"
                        title={t('በኮርሶች ያገኙት የA+ ብዛት', 'Number of A+ course grades')}
                      >
                        A+ ×{entry.stats.aPlusCount}
                      </span>
                    )}
                    <span className="font-mono font-black text-xs text-emerald-900 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                      GPA: {entry.stats.gpaStr}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* TAB: Graduation Candidates & Archive */}
      {activeTab === 'graduation' && (
        <GraduationManager
          students={students}
          courses={courses}
          grades={grades}
          currentYear={currentYear}
          currentSemester={currentSemester}
          availableYears={availableYears}
          currentUserRole="DEAN"
          officialConfig={officialConfig}
          churchLogo={churchLogo}
          onUpdateStudents={onUpdateStudents || (() => {})}
          showNotify={showNotify}
          onSaveGrades={onSaveGrades}
          onSaveCourses={onSaveCourses}
          teachers={teachers}
        />

      )}

      {/* TAB 5: Official Signatures and Stamp */}
      {activeTab === 'official_signatures' && (
        <OfficialSignaturesManager
          config={officialConfig}
          onSaveConfig={onSaveOfficialConfig}
          showNotify={showNotify}
          userRoleTitle="ዋና ዲን"
          churchLogo={churchLogo}
        />
      )}

      {/* Add Custom Academic Year Modal */}
      {showAddYearModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-slate-200">
            <h3 className="font-bold text-sm text-slate-800">{t('አዲስ የትምህርት ዘመን ጨምር', 'Add New Academic Year')}</h3>
            <form onSubmit={handleCreateYear} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('የትምህርት ዘመን (በኢትዮጵያ ካላንደር ዓ.ም)', 'Academic Year (Ethiopian Calendar E.C.)')}
                </label>
                <input
                  type="text"
                  value={newYearInput}
                  onChange={(e) => setNewYearInput(e.target.value)}
                  placeholder={t('ምሳሌ: 2031', 'e.g., 2031')}
                  required
                  className="w-full p-2.5 border rounded-xl bg-slate-50 text-xs font-bold focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddYearModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold border rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  {t('ሰርዝ', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg cursor-pointer"
                >
                  {t('አክል', 'Add Year')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Teacher Modal */}
      {showAddTeacherModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-slate-200">
            <h3 className="font-bold text-sm text-slate-800">{t('አዲስ መምህር መመዝገቢያ', 'Register New Instructor')}</h3>
            <form onSubmit={handleCreateTeacher} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('የመምህሩ ሙሉ ስም (ከነ ማዕረጉ)', 'Instructor Full Name (with title)')}
                </label>
                <input
                  type="text"
                  value={newTeacherName}
                  onChange={(e) => setNewTeacherName(e.target.value)}
                  placeholder={t('ምሳሌ: መ/ር ዮሐንስ አበበ ወይም ፓ/ር...', 'e.g., Inst. Yohannes Abebe or Pastor...')}
                  required
                  className="w-full p-2.5 border rounded-xl bg-slate-50 text-xs font-bold focus:ring-2 focus:ring-emerald-700"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddTeacherModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold border rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  {t('ሰርዝ', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-bold bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg cursor-pointer"
                >
                  {t('መዝግብ', 'Register')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Batch Score Fill Modal for Dean (ተመሳሳይ ውጤት ለሁሉም መሙያ) */}
      {isBatchFillOpen && selectedSupervisedCourse && (
        <BatchScoreFillModal
          course={selectedSupervisedCourse}
          students={supervisedStudents}
          currentGrades={editingGradeMatrix}
          initialCriterionId={batchInitialCriterionId}
          onApply={handleApplyDeanBatchScores}
          onClose={() => {
            setIsBatchFillOpen(false);
            setBatchInitialCriterionId(undefined);
          }}
          showNotify={showNotify}
        />
      )}

      {/* Excel Upload Modal for Dean */}
      {isExcelUploadOpen && selectedSupervisedCourse && (
        <ExcelUploadModal
          course={selectedSupervisedCourse}
          students={supervisedStudents}
          currentYear={currentYear}
          currentSemester={currentSemester}
          onApplyGrades={handleApplyDeanImportedScores}
          onClose={() => setIsExcelUploadOpen(false)}
          showNotify={showNotify}
        />
      )}

      {/* Official PDF Grade Report Modal for Dean */}
      {isPdfModalOpen && selectedSupervisedCourse && (
        <CourseGradeReportPdfModal
          course={selectedSupervisedCourse}
          students={supervisedStudents}
          grades={editingGradeMatrix}
          currentYear={currentYear}
          currentSemester={currentSemester}
          officialConfig={officialConfig}
          churchLogo={churchLogo}
          onClose={() => setIsPdfModalOpen(false)}
        />
      )}

      {/* Master Semester Grade Report PDF Modal for Dean */}
      {isMasterPdfOpen && (
        <MasterGradeReportPdfModal
          students={students}
          courses={courses}
          grades={grades}
          currentYear={currentYear}
          currentSemester={currentSemester}
          churchLogo={churchLogo}
          officialConfig={officialConfig}
          onClose={() => setIsMasterPdfOpen(false)}
        />
      )}
    </div>
  );
};
