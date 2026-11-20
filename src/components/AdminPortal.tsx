import React, { useRef, useState } from 'react';
import {
  Shield,
  Lock,
  Unlock,
  Key,
  GraduationCap,
  Download,
  Upload,
  RotateCcw,
  Users,
  BookOpen,
  Award,
  CheckCircle2,
  FileSpreadsheet,
  Edit,
  Trash2,
  Cloud,
  RefreshCw,
  UploadCloud,
  ExternalLink,
  Image as ImageIcon,
  UserPlus,
  Eye,
  EyeOff,
  Copy,
  Check,
  Printer,
  Search,
  AlertTriangle,
  UserCheck,
  UserX,
  X,
  Sparkles,
  Save,
  ShieldAlert,
  History,
  Calendar,
  Plus,
  BarChart3,
  FileCode
} from 'lucide-react';
import { GradingScaleItem, Student, Course, GradeBreakdown, OfficialSignaturesConfig, ProgramType, SemesterReleaseConfig, FailedLoginAlert, FailedLoginReason } from '../types.ts';
import { OFFICIAL_GRADING_SCALE, generateTeacherKey, DEFAULT_STUDENT_PASSKEYS, generateStudentPasskey } from '../data/initialData.ts';
import { sortStudentsByAmharicName } from '../utils/amharicSort.ts';
import { StudentCredentialsModal } from './StudentCredentialsModal.tsx';
import { FirebaseConnectionReport } from '../services/firebaseSync.ts';
import { DEFAULT_CHURCH_LOGO } from '../assets/logo.ts';
import { OfficialSignaturesManager } from './OfficialSignaturesManager.tsx';
import { ExcelUploadModal } from './ExcelUploadModal.tsx';
import { CourseGradeReportPdfModal } from './CourseGradeReportPdfModal.tsx';
import { exportCourseGradesToExcel, exportMasterSemesterGradeSheetToExcel, ExcelApplyMeta } from '../utils/excelUtils.ts';
import { getCourseAssessmentItems, getCriterionScore, getEffectiveGradeValues, getGradeKey, resolveGradeBreakdown } from '../utils/gradeCalculations.ts';
import { getCriterionColor } from './TeacherPortal.tsx';
import { useIsMobile } from '../utils/useIsMobile.ts';
import { StandardGradeDesktopRow, StandardGradeMobileCard } from './GradeEntryRows.tsx';
import { printElementDirectly } from '../utils/pdfExport.ts';
import { GraduationManager } from './GraduationManager.tsx';
import { MasterGradeReportPdfModal } from './MasterGradeReportPdfModal.tsx';
import { AdminAnalytics } from './AdminAnalytics.tsx';
import { compressImage } from '../utils/imageCompressor.ts';
import { isSampleCourse } from './SampleCoursesModal.tsx';
import { TeacherAllocationManager } from './TeacherAllocationManager.tsx';
import { SemesterReleaseControl } from './SemesterReleaseControl.tsx';
import {
  useLanguage,
  formatProgram,
  formatGender,
  formatSemester,
  formatCalendarYear,
  formatYearLevel,
  formatGradeDesc,
  formatCriterionLabel,
  formatGradStatus,
  formatDegreeTrack,
  formatTeacherDisplay,
  formatCourseTitle,
  formatSchedule,
  formatRole
} from '../utils/i18n.tsx';

interface AdminPortalProps {
  systemLocked: boolean;
  onToggleLock: () => void;
  userPasswords: Record<string, string>;
  onOpenPasswordModal: (userKey: string, displayName: string) => void;
  students: Student[];
  courses: Course[];
  teachers: string[];
  grades: Record<string, GradeBreakdown>;
  currentYear: string;
  currentSemester: string;
  gradePublished: boolean;
  onToggleGradePublication: () => void;
  semesterRelease?: SemesterReleaseConfig;
  onToggleSemesterRelease?: (key: string, value?: boolean) => void;
  onToggleAllSemestersRelease?: (value: boolean) => void;
  onOpenReleaseManager?: () => void;
  onOpenArchiveModal?: () => void;
  onOpenJsonReaderModal?: () => void;
  onExportData: () => void;
  onImportData: (jsonData: string) => void;
  onResetDefaults: () => void;
  onSelectPrintTranscript: (student: Student) => void;
  onSwitchView: (view: 'ADMIN' | 'DEAN' | 'REGISTRAR' | 'TEACHER' | 'STUDENT') => void;
  firebaseReport: FirebaseConnectionReport | null;
  isTestingFirebase: boolean;
  onTestFirebaseConnection: () => Promise<void>;
  onOpenFirebaseModal: () => void;
  onPushAllToFirebase: () => Promise<void>;
  churchLogo: string;
  onUpdateChurchLogo: (newLogo: string) => void;
  onAddTeacher?: (newTeacherName: string, customKey?: string) => void;
  onDeleteTeacher?: (teacherName: string) => void;
  onToggleTeacherLock?: (teacherName: string) => void;
  onBatchGenerateTeacherKeys?: () => void;
  onSaveQuickPassword?: (userKey: string, newPass: string) => void;
  showNotify?: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  officialConfig: OfficialSignaturesConfig;
  onSaveOfficialConfig: (updated: OfficialSignaturesConfig) => void;
  onClearAllGrades?: () => void;
  onSaveGrades?: (updatedGrades: Record<string, GradeBreakdown>) => void;
  onYearChange?: (year: string) => void;
  onSemesterChange?: (sem: string) => void;
  onAddAcademicYear?: (year: string) => void;
  availableYears?: string[];
  onUpdateStudents?: (updatedStudents: Student[]) => void;
  studentPdfPrintAllowed?: boolean;
  onToggleStudentPdfPrint?: () => void;
  onOpenAddStudent?: () => void;
  onOpenEditStudent?: (student: Student) => void;
  onDeleteStudent?: (studentUid: string) => void;
  onSaveCourses?: (updatedCourses: Course[]) => void;
  onOpenAddCourse?: () => void;
  onOpenEditCourse?: (course: Course) => void;
  onDeleteCourse?: (courseId: string) => void;
  onOpenSampleCoursesModal?: () => void;
  onQuickAssignTeacher?: (courseId: string, newTeacher: string) => void;
  onBatchDeleteCourses?: (courseIds: string[]) => void;
  securityAlerts?: FailedLoginAlert[];
  onMarkSecurityAlertRead?: (id: string) => void;
  onMarkAllSecurityAlertsRead?: () => void;
  onDeleteSecurityAlert?: (id: string) => void;
  onClearAllSecurityAlerts?: () => void;
  focusSecurityAlertsToken?: number;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  systemLocked,
  onToggleLock,
  userPasswords,
  onOpenPasswordModal,
  students,
  courses,
  teachers,
  grades,
  currentYear,
  currentSemester,
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
  onExportData,
  onImportData,
  onResetDefaults,
  onSelectPrintTranscript,
  onSwitchView,
  firebaseReport,
  isTestingFirebase,
  onTestFirebaseConnection,
  onOpenFirebaseModal,
  onPushAllToFirebase,
  churchLogo,
  onUpdateChurchLogo,
  onAddTeacher,
  onDeleteTeacher,
  onToggleTeacherLock,
  onBatchGenerateTeacherKeys,
  onSaveQuickPassword,
  showNotify,
  officialConfig,
  onSaveOfficialConfig,
  onClearAllGrades,
  onSaveGrades,
  onYearChange,
  onSemesterChange,
  onAddAcademicYear,
  availableYears = ['2019', '2020', '2021', '2022', '2023', '2024', '2025', '2026', '2027', '2028', '2029', '2030'],
  onUpdateStudents,
  onOpenAddStudent,
  onOpenEditStudent,
  onDeleteStudent,
  onSaveCourses,
  onOpenAddCourse,
  onOpenEditCourse,
  onDeleteCourse,
  onOpenSampleCoursesModal,
  onQuickAssignTeacher,
  onBatchDeleteCourses,
  securityAlerts = [],
  onMarkSecurityAlertRead,
  onMarkAllSecurityAlertsRead,
  onDeleteSecurityAlert,
  onClearAllSecurityAlerts,
  focusSecurityAlertsToken = 0
}) => {
  const { lang, t } = useLanguage();
  const [adminTab, setAdminTab] = useState<'security' | 'academic_calendar' | 'teachers' | 'courses' | 'students' | 'graduation' | 'analytics' | 'official_signatures'>('security');
  const [alertFilter, setAlertFilter] = useState<'all' | 'unread'>('all');
  const securityAlertsSectionRef = useRef<HTMLDivElement | null>(null);

  const unreadSecurityAlerts = React.useMemo(
    () => securityAlerts.filter((a) => !a.read),
    [securityAlerts]
  );

  React.useEffect(() => {
    if (focusSecurityAlertsToken > 0) {
      setAdminTab('security');
      setTimeout(() => {
        securityAlertsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [focusSecurityAlertsToken]);

  const formatAlertReason = (reason: FailedLoginReason) => {
    switch (reason) {
      case 'WRONG_PASSWORD':
        return t('የተሳሳተ የይለፍ ቃል (በውሸት ሙከራ)', 'Wrong Password (Unauthorized Attempt)');
      case 'WRONG_PASSKEY':
        return t('የተሳሳተ ሚስጥር ቁጥር / ቁልፍ', 'Invalid Passkey');
      case 'INVALID_STUDENT_ID':
        return t('ያልታወቀ የተማሪ መለያ ቁጥር', 'Unknown Student ID');
      case 'LOCKED_ACCOUNT':
        return t('በታገደ መለያ የመግባት ሙከራ', 'Attempt on Locked Account');
      case 'SYSTEM_LOCKED':
        return t('ሲስተሙ ተቆልፎ እያለ የመግባት ሙከራ', 'Attempt During Maintenance Lock');
      default:
        return reason;
    }
  };

  const formatAlertTarget = (alert: FailedLoginAlert) => {
    if (alert.attemptedTarget === 'TEACHER_PORTAL') {
      return t('የመምህር መግቢያ (ያልተገኘ ቁልፍ)', 'Instructor Portal (Unmatched Key)');
    }
    if (alert.attemptedTarget === 'STUDENT_PORTAL') {
      return t('የተማሪ መግቢያ', 'Student Portal');
    }
    if (alert.attemptedTarget === 'admin' || alert.attemptedTarget === 'dean' || alert.attemptedTarget === 'registrar') {
      return formatRole(alert.role, lang);
    }
    return alert.attemptedTarget;
  };
  const [teacherSearchTerm, setTeacherSearchTerm] = useState('');
  const [teacherFilter, setTeacherFilter] = useState<'all' | 'active' | 'locked'>('all');
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [showAllKeys, setShowAllKeys] = useState(false);
  const [copiedTeacher, setCopiedTeacher] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  // Student Passkeys & Credentials State
  const [showStudentCredentialsModal, setShowStudentCredentialsModal] = useState(false);
  const [showStudentKeys, setShowStudentKeys] = useState<Record<string, boolean>>({});
  const [copiedStudentUid, setCopiedStudentUid] = useState<string | null>(null);

  // Academic Year Creation State
  const [newYearInput, setNewYearInput] = useState('');
  const [showAddYearModal, setShowAddYearModal] = useState(false);

  const handleCreateYear = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newYearInput.trim();
    if (!clean) return;
    if (availableYears.includes(clean)) {
      showNotify?.(t(`የትምህርት ዘመን ${clean} አስቀድሞ አለ!`, `Academic year ${clean} already exists!`), 'warning');
      return;
    }
    onAddAcademicYear?.(clean);
    onYearChange?.(clean);
    setNewYearInput('');
    setShowAddYearModal(false);
    showNotify?.(
      t(
        `አዲስ የትምህርት ዘመን (${clean} ዓ.ም - ኢ.ዘ.አ) በዋና አድሚን ውሳኔ ተጨምሯል!`,
        `New academic year (${formatCalendarYear(clean, 'en')}) added by Super Admin!`
      ),
      'success'
    );
  };

  const [adminSelectedCourseId, setAdminSelectedCourseId] = useState<string>(courses[0]?.id || '');
  const [isExcelUploadOpen, setIsExcelUploadOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isMasterPdfOpen, setIsMasterPdfOpen] = useState(false);
  const [adminLocalGrades, setAdminLocalGrades] = useState<Record<string, GradeBreakdown>>({});

  // Admin Students Tab Filters
  const [adminStudentSearch, setAdminStudentSearch] = useState('');
  const [adminStudentProgFilter, setAdminStudentProgFilter] = useState<'ALL' | ProgramType>('ALL');
  const [adminStudentYearFilter, setAdminStudentYearFilter] = useState<'ALL' | number>('ALL');
  const [adminStudentStatusFilter, setAdminStudentStatusFilter] = useState<'ALL' | 'ACTIVE' | 'CANDIDATE' | 'GRADUATED'>('ALL');

  const isMobileViewport = useIsMobile(768);
  const adminSelectedCourse = React.useMemo(
    () => courses.find((c) => c.id === adminSelectedCourseId) || courses[0],
    [courses, adminSelectedCourseId]
  );
  const adminEnrolledStudents = React.useMemo(
    () => (adminSelectedCourse ? students.filter((s) => s.program === adminSelectedCourse.program) : []),
    [adminSelectedCourse, students]
  );

  React.useEffect(() => {
    if (!adminSelectedCourse) return;
    const courseYear = adminSelectedCourse.academicYear || currentYear;
    const courseSem = adminSelectedCourse.semester || currentSemester;
    const initial: Record<string, GradeBreakdown> = {};
    adminEnrolledStudents.forEach((s) => {
      initial[s.uid] = resolveGradeBreakdown(grades, s.uid, adminSelectedCourse.id, courseYear, courseSem, s.id);
    });
    setAdminLocalGrades(initial);
  }, [adminSelectedCourseId, adminSelectedCourse?.id, adminEnrolledStudents.length, grades, currentYear, currentSemester]);

  // Export course grades to Excel (.xlsx) for Admin
  const handleExportAdminCourseExcel = () => {
    if (!adminSelectedCourse) return;
    exportCourseGradesToExcel(
      adminSelectedCourse,
      adminEnrolledStudents,
      adminLocalGrades,
      currentYear,
      currentSemester
    );
    showNotify?.(
      t(
        `የ${adminSelectedCourse.name} ውጤት ኤክሴል ሰነድ (.xlsx) በስኬት ወርዷል!`,
        `"${formatCourseTitle(adminSelectedCourse.name, lang)}" grades Excel (.xlsx) exported!`
      ),
      'success'
    );
  };

  // Apply imported Excel scores for Admin with instant persistence
  const handleApplyAdminImportedScores = (
    scoresByUid: Record<string, Record<string, number>>,
    meta?: ExcelApplyMeta
  ) => {
    if (!adminSelectedCourse) return;
    const targetYear = adminSelectedCourse.academicYear || currentYear;
    const targetSem = adminSelectedCourse.semester || currentSemester;

    const nextLocal = { ...adminLocalGrades };
    const updatedGlobal = { ...grades };

    Object.entries(scoresByUid).forEach(([uid, newScores]) => {
      const studentObj = students.find((s) => s.uid === uid || s.id === uid);
      const studentId = studentObj?.id || uid;

      const current = nextLocal[uid] || resolveGradeBreakdown(grades, uid, adminSelectedCourse.id, targetYear, targetSem, studentId);
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

      nextLocal[uid] = updatedBreakdown;

      const keyByUid = getGradeKey(uid, adminSelectedCourse.id, targetYear, targetSem);
      const keyById = getGradeKey(studentId, adminSelectedCourse.id, targetYear, targetSem);
      const directKey = `${uid}_${adminSelectedCourse.id}`;

      updatedGlobal[keyByUid] = updatedBreakdown;
      updatedGlobal[keyById] = updatedBreakdown;
      updatedGlobal[directKey] = updatedBreakdown;
      if (targetYear === currentYear && targetSem === currentSemester) {
        const defaultYearKey = getGradeKey(uid, adminSelectedCourse.id, currentYear, currentSemester);
        updatedGlobal[defaultYearKey] = updatedBreakdown;
      }
    });

    setAdminLocalGrades(nextLocal);
    if (onSaveGrades) {
      onSaveGrades(updatedGlobal);
    }
    try {
      localStorage.setItem('bk_grades', JSON.stringify(updatedGlobal));
    } catch (_) {}

    showNotify?.(
      t(
        `የ${Object.keys(scoresByUid).length} ተማሪዎች ውጤት ከኤክሴል በስኬት ተመዝግቧል!`,
        `Imported and saved Excel scores for ${Object.keys(scoresByUid).length} students!`
      ),
      'success'
    );
  };

  // Save modified course grades for Admin
  const handleSaveAdminGrades = () => {
    if (!adminSelectedCourse || !onSaveGrades) return;
    const targetYear = adminSelectedCourse.academicYear || currentYear;
    const targetSem = adminSelectedCourse.semester || currentSemester;

    const updated = { ...grades };
    adminEnrolledStudents.forEach((s) => {
      const breakdown = adminLocalGrades[s.uid] || { p1: 0, p2: 0, mid: 0, final: 0, att: 0 };
      const keyByUid = getGradeKey(s.uid, adminSelectedCourse.id, targetYear, targetSem);
      const keyById = getGradeKey(s.id, adminSelectedCourse.id, targetYear, targetSem);
      const directKey = `${s.uid}_${adminSelectedCourse.id}`;

      updated[keyByUid] = breakdown;
      updated[keyById] = breakdown;
      updated[directKey] = breakdown;
      if (targetYear === currentYear && targetSem === currentSemester) {
        const defaultYearKey = getGradeKey(s.uid, adminSelectedCourse.id, currentYear, currentSemester);
        updated[defaultYearKey] = breakdown;
      }
    });

    onSaveGrades(updated);
    try {
      localStorage.setItem('bk_grades', JSON.stringify(updated));
    } catch (_) {}
    showNotify?.(t('የተስተካከሉት ውጤቶች በስኬት ተመዝግበዋል!', 'Updated grades saved successfully!'), 'success');
  };

  // Handle cell edit for Admin
  const handleAdminScoreChange = React.useCallback((
    studentUid: string,
    itemId: string,
    val: string,
    maxVal: number,
    itemIndex: number
  ) => {
    const clean = val.trim();
    let num = clean === '' ? 0 : parseFloat(clean);
    if (isNaN(num)) num = 0;
    if (num < 0) num = 0;
    if (num > maxVal) num = maxVal;

    setAdminLocalGrades((prev) => {
      const current = prev[studentUid] || { p1: 0, p2: 0, mid: 0, final: 0, att: 0 };
      const currentScores = current.scores ? { ...current.scores } : {};
      currentScores[itemId] = num;

      return {
        ...prev,
        [studentUid]: {
          ...current,
          scores: currentScores,
          p1: itemIndex === 0 ? num : (currentScores['p1'] ?? current.p1),
          p2: itemIndex === 1 ? num : (currentScores['p2'] ?? current.p2),
          mid: itemIndex === 2 ? num : (currentScores['mid'] ?? current.mid),
          final: itemIndex === 3 ? num : (currentScores['final'] ?? current.final),
          att: itemIndex === 4 ? num : (currentScores['att'] ?? current.att)
        }
      };
    });
  }, []);

  const adminTbodyRef = React.useRef<HTMLTableSectionElement | null>(null);
  const adminRowCountRef = React.useRef(adminEnrolledStudents.length);
  adminRowCountRef.current = adminEnrolledStudents.length;
  const adminColCountRef = React.useRef(5);
  adminColCountRef.current = adminSelectedCourse ? getCourseAssessmentItems(adminSelectedCourse).length : 5;

  const handleAdminCellKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLElement>, r: number, c: number) => {
      const maxRows = adminRowCountRef.current;
      const maxCols = adminColCountRef.current;
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

      const rowEl = adminTbodyRef.current?.rows[nextR];
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
  const [showAddTeacherModal, setShowAddTeacherModal] = useState(false);
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherCustomKey, setNewTeacherCustomKey] = useState('');
  const [showPrintCredentialsModal, setShowPrintCredentialsModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        onImportData(content);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, 512, 0.88, true);
      onUpdateChurchLogo(compressed);
    } catch (err) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) {
          onUpdateChurchLogo(dataUrl);
        }
      };
      reader.readAsDataURL(file);
    }
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  const coreRoles = [
    { key: 'admin', name: t('አድሚን (Admin)', 'Super Admin'), username: 'admin' },
    { key: 'dean', name: t('ዋና ዲን (Academic Dean)', 'Academic Dean'), username: 'dean' },
    { key: 'registrar', name: t('ሪጅስተራል (Registrar)', 'Registrar'), username: 'registrar' }
  ];

  return (
    <div className="space-y-4 sm:space-y-6 no-print">
      {/* Top Banner & Maintenance Mode */}
      <div className="bg-white p-4 sm:p-6 rounded-3xl shadow-sm border border-slate-200/80 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-lg sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Shield className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-800 shrink-0" />
            <span>{t('የአድሚን ጠቅላይ መቆጣጠሪያ ፖርታል (Super Admin)', 'Super Admin Control Portal')}</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {t(
              'ሁሉንም ሌሎች ገጾች (ዲን፣ ሪጅስተራል፣ መምህራን እና ተማሪዎች) ሙሉ በሙሉ የመቆጣጠርና የማስተዳደር ስልጣን',
              'Full administrative authority over Dean, Registrar, Instructor, and Student portals'
            )}
          </p>
        </div>

        {/* Lock Switch & Action Controls */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto">
          <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200">
            <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              {systemLocked ? <Lock className="w-4 h-4 text-rose-600 shrink-0" /> : <Unlock className="w-4 h-4 text-emerald-600 shrink-0" />}
              <span>{t('ጥገና:', 'Lock:')}</span>
            </div>
            <button
              onClick={onToggleLock}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer min-h-[36px] ${
                systemLocked
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {systemLocked ? t('ተቆልፏል', 'Locked') : t('ክፍት ነው', 'Open')}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200 w-full sm:w-auto">
            <button
              type="button"
              onClick={onToggleGradePublication}
              className={`px-3 py-2 text-xs font-extrabold rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer min-h-[38px] ${
                gradePublished
                  ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                  : 'bg-amber-500 hover:bg-amber-600 text-slate-950'
              }`}
            >
              {gradePublished ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
                  <span>{t('🌐 ለሁሉም አሳይ', '🌐 Published')}</span>
                </>
              ) : (
                <>
                  <EyeOff className="w-4 h-4 text-slate-950 shrink-0" />
                  <span>{t('🔒 ለሁሉም እገድ', '🔒 Hidden')}</span>
                </>
              )}
            </button>

            {onToggleStudentPdfPrint && (
              <button
                type="button"
                onClick={onToggleStudentPdfPrint}
                className={`px-3 py-2 text-xs font-extrabold rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer min-h-[38px] ${
                  studentPdfPrintAllowed
                    ? 'bg-indigo-700 hover:bg-indigo-800 text-white'
                    : 'bg-slate-700 hover:bg-slate-800 text-amber-300'
                }`}
                title={t('የተማሪዎችን የፒዲኤፍ ማተም ሁነታ ያብሩ/ያጥፉ', 'Toggle student PDF printing permission')}
              >
                {studentPdfPrintAllowed ? (
                  <>
                    <Printer className="w-4 h-4 text-amber-300 shrink-0" />
                    <span>{t('🖨️ ፒዲኤፍ ተፈቅዷል', '🖨️ PDF Allowed')}</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>{t('🚫 ፒዲኤፍ ታግዷል', '🚫 PDF Locked')}</span>
                  </>
                )}
              </button>
            )}

            {onOpenReleaseManager && (
              <button
                type="button"
                onClick={onOpenReleaseManager}
                className="bg-indigo-700 hover:bg-indigo-800 text-white font-extrabold text-xs px-3 py-2 rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer min-h-[38px]"
                title={t('በተማሪዎች መርጦ ውጤትና ትራንስክሪፕት መፍቀጃና ማገጃ', 'Selective student grade & transcript release control')}
              >
                <ShieldAlert className="w-4 h-4 text-amber-300 shrink-0" />
                <span>{t('🔒 በልዩነት መፍቀድ/ማገድ', '🔒 Selective Release')}</span>
              </button>
            )}

            {onOpenArchiveModal && (
              <button
                type="button"
                onClick={onOpenArchiveModal}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs px-3 py-2 rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer min-h-[38px]"
                title={t('የቀደሙ ሥራዎችና ማህደር መፈለጊያ ማዕከል', 'Historical archives search center')}
              >
                <History className="w-4 h-4 text-slate-950 shrink-0" />
                <span>{t('🔍 ማህደር', '🔍 Archive')}</span>
              </button>
            )}

            {onOpenFirebaseModal && (
              <button
                type="button"
                onClick={onOpenFirebaseModal}
                className={`font-extrabold text-xs px-3 py-2 rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer min-h-[38px] ${
                  firebaseReport?.status === 'connected'
                    ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                    : isTestingFirebase
                    ? 'bg-amber-600 hover:bg-amber-700 text-white animate-pulse'
                    : 'bg-rose-700 hover:bg-rose-800 text-white'
                }`}
                title={t('የFirebase Cloud Firestore ዳታቤዝ የቀጥታ ሁኔታና ማመሳከሪያ', 'Firebase Cloud Firestore sync status')}
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

      {/* Super Admin Semester Grade Approval and Publication Control Panel */}
      {semesterRelease && onToggleSemesterRelease && onToggleAllSemestersRelease && (
        <SemesterReleaseControl
          semesterRelease={semesterRelease}
          onToggleSemesterRelease={onToggleSemesterRelease}
          onToggleAllSemestersRelease={onToggleAllSemestersRelease}
          userRole="ADMIN"
        />
      )}

      {/* Urgent Security Breach / Invalid Login Attempt Banner for Admin */}
      {unreadSecurityAlerts.length > 0 && (
        <div className="bg-gradient-to-r from-rose-950 via-rose-900 to-red-900 text-white rounded-3xl p-4 sm:p-5 shadow-lg border-2 border-rose-400/80 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-2xl bg-rose-500/30 border border-rose-300/50 shrink-0 animate-pulse">
                <ShieldAlert className="w-6 h-6 text-amber-300" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-amber-300 flex items-center gap-2 flex-wrap">
                  <span>
                    {t(
                      `🚨 የደህንነት ማስጠንቀቂያ፦ ልክ ባልሆነ ሚስጥር ቁጥር በውሸት ወደ ውስጥ ለመግባት ${unreadSecurityAlerts.length} ሙከራ ተደርጓል!`,
                      `🚨 Security Alert: ${unreadSecurityAlerts.length} fake/unauthorized login attempt(s) with invalid credentials!`
                    )}
                  </span>
                </h3>
                <p className="text-xs text-rose-100 mt-1">
                  {t(
                    'የቅርብ ጊዜ ሙከራ፦ ',
                    'Latest attempt: '
                  )}
                  <span className="font-bold text-white">
                    {formatRole(unreadSecurityAlerts[0].role, lang)}
                  </span>
                  {' • '}
                  <span>{formatAlertTarget(unreadSecurityAlerts[0])}</span>
                  {' • '}
                  <span className="font-mono bg-black/30 px-1.5 py-0.5 rounded text-amber-200">
                    {unreadSecurityAlerts[0].maskedKey}
                  </span>
                  {' • '}
                  <span className="text-rose-200">
                    {new Date(unreadSecurityAlerts[0].timestampMs).toLocaleString(lang === 'en' ? 'en-US' : 'am-ET')}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setAdminTab('security');
                  setTimeout(() => {
                    securityAlertsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }, 100);
                }}
                className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs px-3.5 py-2 rounded-xl shadow-sm transition-colors cursor-pointer"
              >
                {t('ዝርዝሩን ይመልከቱ', 'Inspect Alerts')}
              </button>
              {onMarkAllSecurityAlertsRead && (
                <button
                  type="button"
                  onClick={onMarkAllSecurityAlertsRead}
                  className="bg-white/15 hover:bg-white/25 text-white font-bold text-xs px-3.5 py-2 rounded-xl border border-white/30 transition-colors cursor-pointer"
                >
                  {t('ሁሉንም እንደታየ ምልክት አድርግ', 'Mark All Read')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Executive Colorful Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-gradient-to-br from-emerald-800 to-teal-900 text-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start gap-2">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-[11px] font-bold text-emerald-200 uppercase tracking-wider truncate">{t('የተመዘገቡ ተማሪዎች', 'Registered Students')}</p>
              <h3 className="text-2xl sm:text-3xl font-black font-mono text-white mt-1">{students.length}</h3>
              <p className="text-[10px] sm:text-[11px] text-emerald-300 mt-1 truncate">{t('ዲፕሎማና ድግሪ ፕሮግራሞች', 'Diploma & Degree Programs')}</p>
            </div>
            <div className="p-2 sm:p-3 bg-white/10 rounded-xl sm:rounded-2xl backdrop-blur-xs hidden sm:flex">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-300" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-700 to-orange-900 text-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start gap-2">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-[11px] font-bold text-amber-200 uppercase tracking-wider truncate">{t('መምህራን በቁልፍ', 'Instructor Keys')}</p>
              <h3 className="text-2xl sm:text-3xl font-black font-mono text-white mt-1">
                {teachers.filter((trItem) => !trItem.includes('—')).length}
              </h3>
              <p className="text-[10px] sm:text-[11px] text-amber-200 mt-1 truncate">{t('በየግል ሚስጥር ቁልፍ ብቻ', 'Private Passkey Access')}</p>
            </div>
            <div className="p-2 sm:p-3 bg-white/10 rounded-xl sm:rounded-2xl backdrop-blur-xs hidden sm:flex">
              <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-800 to-slate-900 text-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start gap-2">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-[11px] font-bold text-indigo-200 uppercase tracking-wider truncate">{t('የትምህርት ዓይነቶች', 'Total Courses')}</p>
              <h3 className="text-2xl sm:text-3xl font-black font-mono text-white mt-1">{courses.length}</h3>
              <p className="text-[10px] sm:text-[11px] text-indigo-300 mt-1 truncate">{formatCalendarYear(currentYear, lang)} ({formatSemester(currentSemester, lang)})</p>
            </div>
            <div className="p-2 sm:p-3 bg-white/10 rounded-xl sm:rounded-2xl backdrop-blur-xs hidden sm:flex">
              <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-300" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-cyan-800 to-blue-950 text-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start gap-2">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-[11px] font-bold text-cyan-200 uppercase tracking-wider truncate">{t('የደህንነት ሁኔታ', 'Security Status')}</p>
              <h3 className="text-base sm:text-xl font-black text-white mt-1.5 truncate">
                {systemLocked ? t('ጥገና ሁነታ', 'Maintenance Mode') : t('ቀጥታ ስራ ላይ', 'Live & Active')}
              </h3>
              <p className="text-[10px] sm:text-[11px] text-cyan-300 mt-1 truncate">
                {t('ውጤት:', 'Grades:')} {gradePublished ? t('ይፋ ሆኗል', 'Published') : t('ተሰውሯል', 'Hidden')}
              </p>
            </div>
            <div className="p-2 sm:p-3 bg-white/10 rounded-xl sm:rounded-2xl backdrop-blur-xs hidden sm:flex">
              <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-300" />
            </div>
          </div>
        </div>
      </div>

      {/* Admin Tabs (Horizontally swipeable on mobile & tablet) */}
      <div className="flex border-b border-slate-200 gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pb-0.5">
        <button
          onClick={() => setAdminTab('academic_calendar')}
          className={`py-2.5 px-3.5 sm:px-4 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 min-h-[44px] ${
            adminTab === 'academic_calendar'
              ? 'border-emerald-700 text-emerald-800 bg-white shadow-xs'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{t('የትምህርት ዘመን (2019–2030)', 'Academic Calendar (2019–2030)')}</span>
        </button>

        <button
          onClick={() => setAdminTab('graduation')}
          className={`py-2.5 px-3.5 sm:px-4 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 min-h-[44px] ${
            adminTab === 'graduation'
              ? 'border-emerald-700 text-emerald-800 bg-white shadow-xs'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Award className="w-4 h-4 text-amber-500 shrink-0" />
          <span>{t('የተማራቂዎች ማህደር', 'Graduation & Alumni')}</span>
        </button>

        <button
          onClick={() => setAdminTab('security')}
          className={`py-2.5 px-3.5 sm:px-4 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 min-h-[44px] ${
            adminTab === 'security'
              ? 'border-emerald-700 text-emerald-800 bg-white shadow-xs'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Key className="w-4 h-4 text-amber-500 shrink-0" />
          <span>{t('ደህንነትና ቁልፎች', 'Security & Keys')}</span>
          {unreadSecurityAlerts.length > 0 && (
            <span className="bg-rose-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full leading-none">
              {unreadSecurityAlerts.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setAdminTab('teachers')}
          className={`py-2.5 px-3.5 sm:px-4 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 min-h-[44px] ${
            adminTab === 'teachers'
              ? 'border-emerald-700 text-emerald-800 bg-white shadow-xs'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <GraduationCap className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{t('የመምህራን ቁልፎች', 'Instructor Keys')} ({teachers.filter((trItem) => !trItem.includes('—')).length})</span>
        </button>

        <button
          onClick={() => setAdminTab('courses')}
          className={`py-2.5 px-3.5 sm:px-4 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 min-h-[44px] ${
            adminTab === 'courses'
              ? 'border-emerald-700 text-emerald-800 bg-white shadow-xs'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>{t('የትምህርት ሰሌዳ', 'Courses & Grades')} ({courses.length})</span>
        </button>

        <button
          onClick={() => setAdminTab('students')}
          className={`py-2.5 px-3.5 sm:px-4 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 min-h-[44px] ${
            adminTab === 'students'
              ? 'border-emerald-700 text-emerald-800 bg-white shadow-xs'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{t('የተማሪዎች ማህደር', 'Student Registry')} ({students.length})</span>
        </button>

        <button
          onClick={() => setAdminTab('analytics')}
          className={`py-2.5 px-3.5 sm:px-4 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 min-h-[44px] ${
            adminTab === 'analytics'
              ? 'border-purple-700 text-purple-900 bg-white shadow-xs'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-purple-600 shrink-0" />
          <span>{t('ትንተና እና ግራፍ', 'Analytics & Charts')}</span>
        </button>

        <button
          onClick={() => setAdminTab('official_signatures')}
          className={`py-2.5 px-3.5 sm:px-4 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 min-h-[44px] ${
            adminTab === 'official_signatures'
              ? 'border-emerald-700 text-emerald-800 bg-white shadow-xs'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Award className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>{t('ይፋዊ ማኅተምና ፊርማ', 'Stamps & Signatures')}</span>
        </button>
      </div>

      {/* TAB: Academic Calendar Management (የዋና አድሚን ውሳኔ) */}
      {adminTab === 'academic_calendar' && (
        <div className="space-y-6">
          {/* Top Banner */}
          <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-900 text-white rounded-3xl p-6 shadow-md border border-emerald-800/80 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xl font-bold flex items-center gap-2.5 text-amber-300">
                  <Calendar className="w-6 h-6 text-amber-400" />
                  <span>{t('የትምህርት ዘመን መወሰኛና አስተዳደር (Academic Calendar Control)', 'Academic Calendar Control')}</span>
                </h3>
                <span className="bg-amber-400/20 text-amber-300 border border-amber-400/40 text-xs px-2.5 py-0.5 rounded-full font-bold">
                  {t('🇪🇹 እንደ ኢትዮጵያ ዘመን አቆጣጠር (ዓ.ም)', '🇪🇹 Ethiopian Calendar (E.C.)')}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-emerald-100/90 mt-1 max-w-2xl">
                {t(
                  'የትምህርት ዘመን መወሰን የዋና አድሚን ኃላፊነት ሲሆን፣ ከ2019 እስከ 2030 ዓ.ም ተዘጋጅቷል። አስፈላጊ ሲሆን አዳዲስ ዓመታት መጨመር ይቻላል። በእያንዳንዱ ዓመት 1ኛ እና 2ኛ ሴሚስተር ይገኛሉ።',
                  'Setting the active academic term is managed by Super Admin (2019–2030 E.C. preconfigured). Additional years can be added anytime, each with 1st and 2nd Semesters.'
                )}
              </p>
            </div>

            <button
              onClick={() => setShowAddYearModal(true)}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>{t('አዲስ የትምህርት ዘመን ጨምር', 'Add Academic Year')}</span>
            </button>
          </div>

          {/* Active Term Selector Card */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6">
            <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-700" />
              <span>{t('በሲስተሙ ላይ በሥራ ላይ የዋለ (ወቅታዊ) የትምህርት ዘመንና ሴሚስተር', 'Currently Active Academic Year & Semester')}</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200 space-y-2">
                <label className="block text-xs font-bold text-emerald-950">
                  {t('ወቅታዊ የትምህርት ዘመን (Active Academic Year):', 'Active Academic Year:')}
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={currentYear}
                    onChange={(e) => onYearChange?.(e.target.value)}
                    className="w-full p-2.5 text-sm font-bold border rounded-xl bg-white border-emerald-300 text-emerald-950 focus:ring-2 focus:ring-emerald-700 cursor-pointer shadow-xs"
                  >
                    {availableYears.map((y) => (
                      <option key={y} value={y}>
                        {formatCalendarYear(y, lang)} {t('(እንደ ኢትዮጵያ ዘመን አቆጣጠር)', '(Ethiopian Calendar)')}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-[11px] text-emerald-800">
                  {t(
                    'የተመረጠው የትምህርት ዘመን በሁሉም መምህራን፣ ዲን፣ ሪጅስተራልና ተማሪዎች ገጽ ላይ በቀጥታ ይሰራል',
                    'Applies immediately across Instructor, Dean, Registrar, and Student portals'
                  )}
                </p>
              </div>

              <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200 space-y-2">
                <label className="block text-xs font-bold text-amber-950">
                  {t('ወቅታዊ ሴሚስተር (Active Semester):', 'Active Semester:')}
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={currentSemester}
                    onChange={(e) => onSemesterChange?.(e.target.value)}
                    className="w-full p-2.5 text-sm font-bold border rounded-xl bg-white border-amber-300 text-amber-950 focus:ring-2 focus:ring-amber-500 cursor-pointer shadow-xs"
                  >
                    <option value="1">{formatSemester('1', lang)}</option>
                    <option value="2">{formatSemester('2', lang)}</option>
                    <option value="ALL">{t('ሁሉም ሴሚስተሮች (All Semesters)', 'All Semesters')}</option>
                  </select>
                </div>
                <p className="text-[11px] text-amber-800">
                  {t('በእያንዳንዱ የትምህርት ዘመን 1ኛ ሴሚስተር እና 2ኛ ሴሚስተር ይገኛሉ', 'Each academic year includes 1st and 2nd Semesters')}
                </p>
              </div>
            </div>
          </div>

          {/* Academic Policy Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs uppercase tracking-wider">
                <Award className="w-4 h-4 text-emerald-600" />
                <span>{t('የዲፕሎማ ፕሮግራም (Diploma)', 'Diploma Program')}</span>
              </div>
              <h5 className="font-extrabold text-slate-900 text-sm">{t('በ2 ዓመት (4 ሴሚስተር)', '2 Years (4 Semesters)')}</h5>
              <p className="text-xs text-slate-600 leading-relaxed">
                {t(
                  'የዲፕሎማ ተማሪዎች በ2 ዓመት ማለትም በአራት ሴሚስተር ይመረቃሉ። በዚህ ዓመት 10 የዲፕሎማ ተማሪዎች በ2ኛ ዓመት ላይ እየተማሩ የሚገኙ ተማራቂዎች ናቸው።',
                  'Diploma students graduate in 2 years (4 semesters). 10 second-year Diploma candidates are currently completing their final year.'
                )}
              </p>
              <div className="pt-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg">
                {t('1ኛ ዓመት (Sem 1 & 2) ➔ 2ኛ ዓመት (Sem 3 & 4) ➔ ምርቃት', 'Year 1 (Sem 1 & 2) ➔ Year 2 (Sem 3 & 4) ➔ Graduation')}
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-indigo-800 font-bold text-xs uppercase tracking-wider">
                <Award className="w-4 h-4 text-indigo-600" />
                <span>{t('የድግሪ ፕሮግራም (ቀድሞ ዲፕሎማ)', 'Degree Track (Prior Diploma)')}</span>
              </div>
              <h5 className="font-extrabold text-slate-900 text-sm">{t('በ2 ዓመት (4 ሴሚስተር)', '2 Years (4 Semesters)')}</h5>
              <p className="text-xs text-slate-600 leading-relaxed">
                {t(
                  'ቀድሞ የመጽሐፍ ቅዱስ ዲፕሎማ ያላቸው የድግሪ ተማሪዎች የትምህርት ዝግጅታቸው ታይቶ በ2 ዓመት (4 ሴሚስተር) ይመረቃሉ።',
                  'Degree students holding a prior Bible Diploma complete their Degree requirements in 2 years (4 semesters).'
                )}
              </p>
              <div className="pt-1 text-[11px] font-bold text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded-lg">
                {t('የቅድመ-ዲፕሎማ ክሬዲት ታሳቢ ➔ 4 ሴሚስተር ➔ ምርቃት', 'Prior Diploma Credit Applied ➔ 4 Semesters ➔ Graduation')}
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-purple-800 font-bold text-xs uppercase tracking-wider">
                <Award className="w-4 h-4 text-purple-600" />
                <span>{t('መደበኛ ድግሪ (Regular Degree)', 'Regular Degree Program')}</span>
              </div>
              <h5 className="font-extrabold text-slate-900 text-sm">{t('በ3 ዓመት (5 ወይም 6 ሴሚስተር)', '3 Years (5–6 Semesters)')}</h5>
              <p className="text-xs text-slate-600 leading-relaxed">
                {t(
                  'መደበኛ የድግሪ ተማሪ እንደየትምህርት ዝግጅታቸው በ3 ዓመት (በ5 ሴሚስተር ወይም ዝቅተኛ ውጤት ካመጡ በ6 ሴሚስተር) ይመረቃሉ።',
                  'Regular Degree students complete the program in 3 years (5 semesters, or 6 semesters when remediation is required).'
                )}
              </p>
              <div className="pt-1 text-[11px] font-bold text-purple-800 bg-purple-50 px-2.5 py-1 rounded-lg">
                {t('1ኛ ዓመት ➔ 2ኛ ዓመት ➔ 3ኛ ዓመት (5-6 ሴሚስተር)', 'Year 1 ➔ Year 2 ➔ Year 3 (5–6 Semesters)')}
              </div>
            </div>
          </div>

          {/* All Configured Years Matrix (2019 - 2030 ዓ.ም እና ተጨማሪ) */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b pb-3">
              <div>
                <h4 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-emerald-700" />
                  <span>{t('የትምህርት ዘመናት ዝርዝር ሰሌዳ (ከ2019 እስከ 2030 ዓ.ም)', 'Configured Academic Years Matrix (2019–2030 E.C.)')}</span>
                </h4>
                <p className="text-xs text-slate-500">
                  {t('ሁሉንም ዓመታት መመልከት፣ ወቅታዊ ማድረግ ወይም አዲስ የትምህርት ዘመን መጨመር', 'View all academic years, set the active year, or register new years')}
                </p>
              </div>

              <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-xl font-bold">
                {t('ጠቅላላ ዓመታት:', 'Total Years:')} {availableYears.length}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {availableYears.map((yr) => {
                const isActive = yr === currentYear;
                return (
                  <div
                    key={yr}
                    className={`p-3.5 rounded-2xl border text-center transition-all ${
                      isActive
                        ? 'bg-emerald-50 border-emerald-500 shadow-sm ring-2 ring-emerald-600/30'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex justify-center mb-1.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isActive ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {isActive ? t('የነቃ (Active)', 'Active') : t('ኢ.ዘ.አ', 'E.C.')}
                      </span>
                    </div>

                    <h5 className="font-extrabold text-base text-slate-900 font-mono">
                      {formatCalendarYear(yr, lang)}
                    </h5>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {t('1ኛ እና 2ኛ ሴሚስተር', 'Semesters 1 & 2')}
                    </p>

                    {!isActive && (
                      <button
                        type="button"
                        onClick={() => onYearChange?.(yr)}
                        className="mt-2.5 w-full text-[11px] font-bold bg-white hover:bg-emerald-600 hover:text-white text-emerald-800 border border-emerald-300 py-1 rounded-lg transition-colors cursor-pointer shadow-2xs"
                      >
                        {t('ወቅታዊ አድርግ', 'Set Active')}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB: Graduation Approvals & Alumni Archive */}
      {adminTab === 'graduation' && (
        <GraduationManager
          students={students}
          courses={courses}
          grades={grades}
          currentYear={currentYear}
          currentSemester={currentSemester}
          availableYears={availableYears}
          currentUserRole="ADMIN"
          officialConfig={officialConfig}
          churchLogo={churchLogo}
          onUpdateStudents={onUpdateStudents || (() => {})}
          onSaveGrades={onSaveGrades}
          onSaveCourses={onSaveCourses}
          showNotify={showNotify || (() => {})}
          teachers={teachers}
          onDeleteCourse={onDeleteCourse}
          onOpenSampleCoursesModal={onOpenSampleCoursesModal}
        />
      )}

      {/* TAB: Analytics & Visualizations using Recharts */}
      {adminTab === 'analytics' && (
        <AdminAnalytics
          students={students}
          courses={courses}
          grades={grades}
          currentYear={currentYear}
          currentSemester={currentSemester}
        />
      )}

      {/* TAB 1: Security & Passwords */}
      {adminTab === 'security' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Key className="w-5 h-5 text-emerald-700" />
                <span>{t('የስርዓቱ ዋና ተጠቃሚዎች የይለፍ ቃል', 'Core System Role Passkeys')}</span>
              </h3>
              <span className="text-xs text-slate-400 font-medium">{t('የተጠቃሚ መለያዎች', 'User Accounts')}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[11px] rounded-lg">
                  <tr>
                    <th className="p-3">{t('ተጠቃሚ / ሚና', 'User / Role')}</th>
                    <th className="p-3">{t('የመግቢያ ስም', 'Username')}</th>
                    <th className="p-3">{t('የአሁኑ ቁልፍ', 'Current Passkey')}</th>
                    <th className="p-3 text-right">{t('ተግባር', 'Action')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {coreRoles.map((item) => (
                    <tr key={item.key} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-bold text-slate-800">{item.name}</td>
                      <td className="p-3 font-mono text-xs text-slate-600">{item.username}</td>
                      <td className="p-3 font-mono text-xs text-emerald-800 font-bold">
                        •••••• ({userPasswords[item.key] || '---'})
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => onOpenPasswordModal(item.key, item.name)}
                          className="inline-flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-white text-[11px] px-3 py-1.5 rounded-lg font-bold shadow-sm transition-colors cursor-pointer"
                        >
                          <Key className="w-3 h-3" />
                          <span>{t('ቁልፍ ቀይር', 'Change Key')}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Backup, Export and Reset Controls */}
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  {t('የመረጃ ጥበቃና አስተዳደር (Local Backup & Data Management)', 'Local Backup & Data Management')}
                </h4>
                <div className="flex flex-wrap gap-2.5">
                  <button
                    onClick={onExportData}
                    className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs px-3.5 py-2 rounded-xl font-bold shadow-sm transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-emerald-400" />
                    <span>{t('መረጃ ወደ ኮምፒውተር አስቀምጥ (Export JSON)', 'Export Backup JSON')}</span>
                  </button>

                  {onOpenJsonReaderModal && (
                    <button
                      onClick={onOpenJsonReaderModal}
                      className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3.5 py-2 rounded-xl font-bold shadow-sm transition-colors cursor-pointer"
                    >
                      <FileCode className="w-4 h-4 text-amber-300" />
                      <span>{t('📂 ሁለገብ JSON አንባቢና መጫኛ (Read JSON)', 'Universal JSON Reader & Loader')}</span>
                    </button>
                  )}

                  <button
                    onClick={() => (onOpenJsonReaderModal ? onOpenJsonReaderModal() : fileInputRef.current?.click())}
                    className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs px-3.5 py-2 rounded-xl font-bold border border-slate-300 transition-colors cursor-pointer"
                  >
                    <Upload className="w-4 h-4 text-indigo-600" />
                    <span>{t('ፋይል ምረጥ (Import JSON)', 'Import JSON')}</span>
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".json"
                    className="hidden"
                  />

                  {onClearAllGrades && (
                    <button
                      onClick={() => {
                        if (
                          window.confirm(
                            t(
                              'ማስጠንቀቂያ፦ ሁሉንም የውጤት ማስገቢያ ቦታዎች ባዶ ማድረግ ይፈልጋሉ? ይህ መምህራን አዲስ ውጤት ከባዶ እንዲያስገቡ ያደርጋል።',
                              'Warning: Are you sure you want to clear all grade entries? Instructors will enter new grades from scratch.'
                            )
                          )
                        ) {
                          onClearAllGrades();
                        }
                      }}
                      className="inline-flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs px-3.5 py-2 rounded-xl font-bold border border-amber-300 transition-colors cursor-pointer"
                      title={t('ሁሉንም የውጤት ማስገቢያዎች ባዶ አድርግ', 'Clear all grade entry fields')}
                    >
                      <Trash2 className="w-4 h-4 text-amber-700" />
                      <span>{t('ውጤቶችን ባዶ አድርግ (Clear Grades)', 'Clear All Grades')}</span>
                    </button>
                  )}

                  <button
                    onClick={onResetDefaults}
                    className="inline-flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs px-3.5 py-2 rounded-xl font-bold border border-rose-200 transition-colors ml-auto cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4 text-rose-600" />
                    <span>{t('ወደ ነባሪ መልስ (Reset Defaults)', 'Reset Defaults')}</span>
                  </button>
                </div>
              </div>

              {/* Firebase Cloud Firestore Sync Card */}
              <div className="bg-gradient-to-r from-emerald-50 via-slate-50 to-amber-50 p-4 rounded-2xl border border-emerald-200">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 bg-emerald-700 text-white rounded-xl shadow-xs">
                      <Cloud className="w-5 h-5" />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                        <span>{t('Firebase Cloud Firestore ዳታቤዝ', 'Firebase Cloud Firestore Database')}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            firebaseReport?.status === 'connected'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : isTestingFirebase
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}
                        >
                          {firebaseReport?.status === 'connected'
                            ? t('● ተገናኝቷል (Connected)', '● Connected')
                            : isTestingFirebase
                            ? t('◌ በመፈተሽ ላይ...', '◌ Checking...')
                            : t('● አልተገናኘም (Not Connected)', '● Not Connected')}
                        </span>
                      </h5>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {firebaseReport?.message || t('ሁሉንም የተማሪዎች፣ ኮርሶች እና ውጤቶች መረጃ ወደ Cloud Firestore ያመሳስላል', 'Syncs all students, courses, and grade records to Cloud Firestore')}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={onTestFirebaseConnection}
                      disabled={isTestingFirebase}
                      className="inline-flex items-center gap-1 bg-white hover:bg-slate-100 text-slate-700 text-xs px-3 py-1.5 rounded-xl font-bold border border-slate-300 transition-colors cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isTestingFirebase ? 'animate-spin' : ''}`} />
                      <span>{isTestingFirebase ? t('በመፈተሽ ላይ...', 'Checking...') : t('ግንኙነት ፈትሽ', 'Test Connection')}</span>
                    </button>

                    <button
                      onClick={onOpenFirebaseModal}
                      className="inline-flex items-center gap-1 bg-emerald-700 hover:bg-emerald-800 text-white text-xs px-3 py-1.5 rounded-xl font-bold shadow-xs transition-colors cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>{t('ዝርዝርና መፍትሔዎች', 'Details & Solutions')}</span>
                    </button>

                    {firebaseReport?.status === 'connected' && (
                      <button
                        onClick={onPushAllToFirebase}
                        className="inline-flex items-center gap-1 bg-indigo-700 hover:bg-indigo-800 text-white text-xs px-3 py-1.5 rounded-xl font-bold shadow-xs transition-colors cursor-pointer"
                      >
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>{t('ወደ Cloud ላክ', 'Push to Cloud')}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Church Logo Management Card */}
              <div className="bg-gradient-to-r from-amber-50/70 via-slate-50 to-emerald-50/70 p-4 rounded-2xl border border-amber-200/90">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-16 h-16 rounded-2xl bg-white p-1.5 border border-amber-300 shadow-sm flex items-center justify-center flex-shrink-0">
                      <img
                        src={churchLogo || DEFAULT_CHURCH_LOGO}
                        alt={t('የቤተ ክርስቲያን አርማ', 'Church Logo')}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-amber-600" />
                        <span>{t('የቤተ ክርስቲያኑ ይፋዊ አርማና ሎጎ (Church Official Logo)', 'Church Official Emblem & Logo')}</span>
                      </h5>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {t(
                          'ይህ ሎጎ በዋናው አርዕስት (Header)፣ በመግቢያ ገጽ (Login) እና በሁሉም ተማሪዎች ትራንስክሪፕት ላይ ይታያል።',
                          'This logo appears on the top header, login page, and all student transcripts.'
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="file"
                      ref={logoInputRef}
                      onChange={handleLogoUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      onClick={() => logoInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs px-3.5 py-2 rounded-xl font-bold shadow-xs transition-colors cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{t('አዲስ ሎጎ ጫን (Upload Logo)', 'Upload New Logo')}</span>
                    </button>

                    <button
                      onClick={() => onUpdateChurchLogo(DEFAULT_CHURCH_LOGO)}
                      className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs px-3 py-2 rounded-xl font-bold border border-slate-300 transition-colors cursor-pointer"
                      title={t('ወደ መጀመሪያው ይፋዊ አርማ መልስ', 'Restore default official emblem')}
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                      <span>{t('ነባሪ አርማ (Reset)', 'Reset Default')}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Official 13-Tier Grading Scale Card */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <GraduationCap className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-bold text-slate-800">
                  {t('ይፋዊ የ13-ደረጃ ውጤት መስፈርት', 'Official 13-Tier Grading Scale')}
                </h3>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                {t('Official 13-Tier Grading Scale', 'Standard institutional grade scale (A+ to F)')}
              </p>

              <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-80 overflow-y-auto">
                <table className="w-full text-xs text-slate-700">
                  <thead className="bg-slate-100 sticky top-0 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2 text-left">{t('የውጤት መጠን (%)', 'Score Range (%)')}</th>
                      <th className="p-2 text-center">{t('ፊደል', 'Letter')}</th>
                      <th className="p-2 text-right">{t('ነጥብ', 'Points')}</th>
                      <th className="p-2 text-center">{t('መግለጫ', 'Description')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px]">
                    {OFFICIAL_GRADING_SCALE.map((g) => (
                      <tr key={g.letter} className="hover:bg-slate-50">
                        <td className="p-2 font-medium">
                          {`${g.min}% – ${g.max}%`}
                        </td>
                        <td className="p-2 text-center font-black text-emerald-800">{g.letter}</td>
                        <td className="p-2 text-right font-bold font-mono">
                          {g.points === 3.7 ? '3.7' : g.points.toFixed(2)}
                        </td>
                        <td className="p-2 text-center text-slate-600 font-medium">{formatGradeDesc(g.desc, lang)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-4 p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-900">
              <p className="font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 flex-shrink-0" />
                <span>{t('አድሚን ሁሉንም የተማሪ ውጤቶች፣ ኮርሶችና ቁልፎች የመቆጣጠር ሙሉ ስልጣን አለው።', 'Super Admin has full authority over all student grades, courses, and passkeys.')}</span>
              </p>
            </div>
          </div>

          {/* Failed / Unauthorized Login Attempts Log Panel (spanning all 3 columns) */}
          <div
            ref={securityAlertsSectionRef}
            className="lg:col-span-3 bg-white rounded-3xl shadow-sm border border-rose-200/80 p-5 sm:p-6 space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                  <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
                  <span>
                    {t(
                      'ልክ ባልሆነ ሚስጥር ቁጥር በውሸት የመግባት ሙከራ ማሳወቂያዎች (Security Alert Log)',
                      'Invalid Credentials & Unauthorized Login Attempt Alerts'
                    )}
                  </span>
                  {unreadSecurityAlerts.length > 0 && (
                    <span className="bg-rose-600 text-white text-[11px] font-black px-2 py-0.5 rounded-full">
                      {t(`${unreadSecurityAlerts.length} አዲስ`, `${unreadSecurityAlerts.length} Unread`)}
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {t(
                    'ማንኛውም ሰው በተሳሳተ የይለፍ ቃል፣ ሚስጥር ቁጥር ወይም መለያ ቁጥር ወደ ሲስተሙ በውሸት ለመግባት ሲሞክር በቀጥታ እዚህ ይመዘገባል።',
                    'Every attempt to sign in with an invalid passkey, wrong password, or unknown Student ID is automatically logged here in real time.'
                  )}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setAlertFilter('all')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg cursor-pointer transition-colors ${
                      alertFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    {t(`ሁሉም (${securityAlerts.length})`, `All (${securityAlerts.length})`)}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAlertFilter('unread')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg cursor-pointer transition-colors ${
                      alertFilter === 'unread' ? 'bg-rose-600 text-white shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    {t(`ያልተነበቡ (${unreadSecurityAlerts.length})`, `Unread (${unreadSecurityAlerts.length})`)}
                  </button>
                </div>

                {unreadSecurityAlerts.length > 0 && onMarkAllSecurityAlertsRead && (
                  <button
                    type="button"
                    onClick={onMarkAllSecurityAlertsRead}
                    className="inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-xs cursor-pointer transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{t('ሁሉንም አንብቤያለሁ', 'Mark All Read')}</span>
                  </button>
                )}

                {securityAlerts.length > 0 && onClearAllSecurityAlerts && (
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        window.confirm(
                          t(
                            'ሁሉንም የመግባት ሙከራ ማሳወቂያዎች ማጽዳት ይፈልጋሉ?',
                            'Are you sure you want to clear all login alert logs?'
                          )
                        )
                      ) {
                        onClearAllSecurityAlerts();
                      }
                    }}
                    className="inline-flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t('መዝገቡን አጽዳ', 'Clear Log')}</span>
                  </button>
                )}
              </div>
            </div>

            {(() => {
              const displayedAlerts = alertFilter === 'unread' ? unreadSecurityAlerts : securityAlerts;
              if (displayedAlerts.length === 0) {
                return (
                  <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-6 text-center space-y-1.5">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                    <p className="text-sm font-bold text-emerald-900">
                      {alertFilter === 'unread'
                        ? t('ምንም ያልተነበበ የውሸት መግቢያ ሙከራ የለም', 'No unread unauthorized login attempts')
                        : t('ምንም የተመዘገበ የውሸት መግቢያ ሙከራ የለም', 'No unauthorized login attempts recorded')}
                    </p>
                    <p className="text-xs text-emerald-700">
                      {t(
                        'ማንኛውም ሰው በተሳሳተ ሚስጥር ቁጥር ሲሞክር ወዲያውኑ ማሳወቂያ እዚህ ይታያል።',
                        'Any failed login using incorrect credentials will appear here immediately.'
                      )}
                    </p>
                  </div>
                );
              }

              return (
                <>
                  {/* Mobile cards (< md) */}
                  <div className="grid grid-cols-1 gap-2.5 md:hidden">
                    {displayedAlerts.map((alert) => (
                      <div
                        key={alert.id}
                        className={`p-3.5 rounded-2xl border space-y-2 ${
                          alert.read
                            ? 'bg-slate-50 border-slate-200'
                            : 'bg-rose-50/90 border-rose-300 shadow-xs'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            {!alert.read && (
                              <span className="bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                                {t('አዲስ', 'NEW')}
                              </span>
                            )}
                            <span className="bg-slate-800 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-lg">
                              {formatRole(alert.role, lang)}
                            </span>
                            <span className="text-xs font-bold text-slate-900">{formatAlertTarget(alert)}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {new Date(alert.timestampMs).toLocaleString(lang === 'en' ? 'en-US' : 'am-ET')}
                          </span>
                        </div>

                        <div className="text-xs text-rose-800 font-semibold">
                          {formatAlertReason(alert.reason)}
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 pt-1 border-t border-slate-200/70">
                          <div className="flex items-center gap-2">
                            <span>{t('የገባ ቁልፍ:', 'Entered:')}</span>
                            <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-slate-200 text-rose-700">
                              {alert.maskedKey}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {!alert.read && onMarkSecurityAlertRead && (
                              <button
                                type="button"
                                onClick={() => onMarkSecurityAlertRead(alert.id)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold cursor-pointer"
                              >
                                {t('እንደታየ', 'Mark Read')}
                              </button>
                            )}
                            {onDeleteSecurityAlert && (
                              <button
                                type="button"
                                onClick={() => onDeleteSecurityAlert(alert.id)}
                                className="p-1.5 bg-white hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg cursor-pointer"
                                title={t('ሰርዝ', 'Delete')}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop table (md+) */}
                  <div className="hidden md:block overflow-x-auto border border-slate-200 rounded-2xl">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[11px] border-b border-slate-200">
                        <tr>
                          <th className="p-3">{t('ሁኔታ', 'Status')}</th>
                          <th className="p-3">{t('ቀንና ሰዓት', 'Time')}</th>
                          <th className="p-3">{t('የተሞከረው ሚና', 'Target Role')}</th>
                          <th className="p-3">{t('ዒላማ መለያ / ስም', 'Target Account')}</th>
                          <th className="p-3">{t('ምክንያት', 'Reason')}</th>
                          <th className="p-3">{t('የተሞከረ ሚስጥር ቁጥር', 'Attempted Key')}</th>
                          <th className="p-3">{t('መሣሪያ', 'Device')}</th>
                          <th className="p-3 text-right">{t('ተግባር', 'Action')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {displayedAlerts.map((alert) => (
                          <tr
                            key={alert.id}
                            className={alert.read ? 'hover:bg-slate-50/70' : 'bg-rose-50/70 hover:bg-rose-50'}
                          >
                            <td className="p-3 whitespace-nowrap">
                              {alert.read ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
                                  <Check className="w-3 h-3" />
                                  {t('የታየ', 'Read')}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-black bg-rose-600 text-white px-2 py-0.5 rounded-full">
                                  <AlertTriangle className="w-3 h-3" />
                                  {t('አዲስ ማሳወቂያ', 'UNREAD')}
                                </span>
                              )}
                            </td>
                            <td className="p-3 font-mono text-[11px] whitespace-nowrap text-slate-600">
                              {new Date(alert.timestampMs).toLocaleString(lang === 'en' ? 'en-US' : 'am-ET')}
                            </td>
                            <td className="p-3 whitespace-nowrap">
                              <span className="bg-slate-800 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-lg">
                                {formatRole(alert.role, lang)}
                              </span>
                            </td>
                            <td className="p-3 font-bold text-slate-900">{formatAlertTarget(alert)}</td>
                            <td className="p-3 font-semibold text-rose-700">{formatAlertReason(alert.reason)}</td>
                            <td className="p-3 font-mono text-rose-700 font-bold">{alert.maskedKey}</td>
                            <td className="p-3 text-[11px] text-slate-500">{alert.deviceInfo || '—'}</td>
                            <td className="p-3 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5">
                                {!alert.read && onMarkSecurityAlertRead && (
                                  <button
                                    type="button"
                                    onClick={() => onMarkSecurityAlertRead(alert.id)}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold cursor-pointer"
                                  >
                                    {t('እንደታየ', 'Mark Read')}
                                  </button>
                                )}
                                {onDeleteSecurityAlert && (
                                  <button
                                    type="button"
                                    onClick={() => onDeleteSecurityAlert(alert.id)}
                                    className="p-1.5 bg-white hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg cursor-pointer"
                                    title={t('ሰርዝ', 'Delete')}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* TAB: Teachers Passkeys & Super Control */}
      {adminTab === 'teachers' && (() => {
        const validTeachers = teachers.filter((tc) => !tc.includes('—'));
        const lockedCount = validTeachers.filter((tc) => userPasswords['_locked_' + tc] === 'true').length;
        const activeCount = validTeachers.length - lockedCount;
        const totalAssignedCourses = courses.filter((c) => validTeachers.includes(c.teacher)).length;

        const filteredTeachers = validTeachers.filter((tc) => {
          const teacherCourses = courses.filter((c) => c.teacher === tc);
          const matchesSearch =
            tc.toLowerCase().includes(teacherSearchTerm.toLowerCase()) ||
            teacherCourses.some(
              (c) =>
                c.name.toLowerCase().includes(teacherSearchTerm.toLowerCase()) ||
                formatCourseTitle(c.name, lang).toLowerCase().includes(teacherSearchTerm.toLowerCase())
            );
          const isLocked = userPasswords['_locked_' + tc] === 'true';
          if (teacherFilter === 'active') return matchesSearch && !isLocked;
          if (teacherFilter === 'locked') return matchesSearch && isLocked;
          return matchesSearch;
        });

        const handleCopyKey = (teacher: string, key: string) => {
          navigator.clipboard.writeText(key);
          setCopiedTeacher(teacher);
          showNotify?.(
            t(`የ${teacher} የመግቢያ ቁልፍ (${key}) ተቀድቷል!`, `${teacher}'s passkey (${key}) copied!`),
            'success'
          );
          setTimeout(() => setCopiedTeacher(null), 2000);
        };

        const handleCopyAllKeys = () => {
          const lines = [
            t('የብርብር ከተማ ቃለ ሕይወት መጽሐፍ ቅዱስ ትምህርት ቤት', 'Birbir City KHC Bible Training School'),
            t('የመምህራን ይፋዊ የመግቢያ ቁልፎች ዝርዝር:', 'Official Instructor Passkeys Directory:'),
            `----------------------------------------`,
            ...validTeachers.map((tc, i) => {
              const k = userPasswords[tc] || generateTeacherKey(tc, i + 1);
              const isLocked = userPasswords['_locked_' + tc] === 'true';
              const cList =
                courses
                  .filter((c) => c.teacher === tc)
                  .map((c) => formatCourseTitle(c.name, lang))
                  .join(', ') || t('ኮርስ አልተመደበም', 'No course assigned');
              return `${i + 1}. ${tc}\n   • ${t('የመግቢያ ቁልፍ', 'Passkey')}: ${k}\n   • ${t('ሁኔታ', 'Status')}: ${
                isLocked ? t('የታገደ', 'Locked') : t('ንቁ / የተፈቀደ', 'Active / Allowed')
              }\n   • ${t('የሚያስተምሩት', 'Assigned Courses')}: ${cList}`;
            })
          ];
          navigator.clipboard.writeText(lines.join('\n\n'));
          setCopiedAll(true);
          showNotify?.(
            t('የሁሉም መምህራን የመግቢያ ቁልፎች ዝርዝር በሙሉ ተቀድቷል!', 'All instructor passkeys copied to clipboard!'),
            'success'
          );
          setTimeout(() => setCopiedAll(false), 2500);
        };

        const handleQuickGenerateKey = (teacher: string, index: number) => {
          const freshKey = generateTeacherKey(teacher, index);
          if (onSaveQuickPassword) {
            onSaveQuickPassword(teacher, freshKey);
          } else {
            onOpenPasswordModal(teacher, teacher);
          }
        };

        return (
          <div className="space-y-5">
            {/* Super Admin Control Hero Banner */}
            <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-900 text-white rounded-3xl p-4 sm:p-7 shadow-lg border border-emerald-800/60 relative overflow-hidden">
              <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5 relative z-10">
                <div className="space-y-1.5 max-w-2xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-[11px] font-bold border border-amber-400/30">
                    <Shield className="w-3.5 h-3.5" />
                    <span>{t('የዋና አድሚን ጠቅላይ መቆጣጠሪያ', 'Super Admin Authority Control')}</span>
                  </div>
                  <h3 className="text-lg sm:text-2xl font-black text-white flex items-center gap-2.5">
                    <GraduationCap className="w-6 h-6 sm:w-7 sm:h-7 text-amber-400 shrink-0" />
                    <span>{t('የመምህራን የመግቢያ ቁልፎችና ሙሉ አስተዳደር', 'Instructor Passkeys & Full Management')}</span>
                  </h3>
                  <p className="text-xs sm:text-sm text-emerald-200/90 leading-relaxed">
                    {t(
                      'ለመምህራን ሁሉ የተዘጋጁ የመግቢያ ቁልፎችን የማመንጨት፣ የመቀየር፣ የመቆጣጠርና የመግቢያ ፍቃድን የማገድ ሙሉ ስልጣን በዋና አድሚን እጅ ብቻ ነው ያለው።',
                      'Only the Super Admin holds full authority to generate, update, inspect, and lock or allow instructor portal access passkeys.'
                    )}
                  </p>
                </div>

                {/* Batch Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                  <button
                    onClick={() => {
                      if (
                        window.confirm(
                          t(
                            'እርግጠኛ ነዎት ለሁሉም መምህራን አዲስ ጠንካራ የመግቢያ ቁልፎች ማመንጨት ይፈልጋሉ? ነባሮቹ ቁልፎች በአዲሶቹ ይተካሉ።',
                            'Are you sure you want to generate new passkeys for all instructors? Existing passkeys will be replaced.'
                          )
                        )
                      ) {
                        onBatchGenerateTeacherKeys?.();
                      }
                    }}
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs px-3.5 py-2.5 rounded-xl shadow-md transition-all cursor-pointer min-h-[40px]"
                  >
                    <Sparkles className="w-4 h-4 text-slate-950 shrink-0" />
                    <span>{t('ለሁሉም ቁልፍ አመንጭ', 'Generate All Keys')}</span>
                  </button>

                  <button
                    onClick={() => setShowPrintCredentialsModal(true)}
                    className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3 py-2.5 rounded-xl border border-white/20 backdrop-blur-xs transition-colors cursor-pointer min-h-[40px]"
                  >
                    <Printer className="w-4 h-4 text-emerald-300 shrink-0" />
                    <span>{t('የቁልፍ ሰነድ አትም', 'Print Key Sheet')}</span>
                  </button>

                  <button
                    onClick={handleCopyAllKeys}
                    className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3 py-2.5 rounded-xl border border-white/20 backdrop-blur-xs transition-colors cursor-pointer min-h-[40px]"
                  >
                    {copiedAll ? <Check className="w-4 h-4 text-emerald-400 shrink-0" /> : <Copy className="w-4 h-4 text-amber-300 shrink-0" />}
                    <span>{copiedAll ? t('ተቀድቷል!', 'Copied!') : t('ሁሉንም ኮፒ', 'Copy All')}</span>
                  </button>

                  <button
                    onClick={() => {
                      setNewTeacherName('');
                      setNewTeacherCustomKey('');
                      setShowAddTeacherModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-2.5 rounded-xl shadow-sm transition-colors cursor-pointer min-h-[40px]"
                  >
                    <UserPlus className="w-4 h-4 shrink-0" />
                    <span>{t('አዲስ መምህር', 'Add Instructor')}</span>
                  </button>
                </div>
              </div>

              {/* Stats Counters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mt-5 pt-4 border-t border-white/10">
                <div className="bg-white/10 rounded-2xl p-3 border border-white/10">
                  <span className="text-[11px] text-emerald-300 block">{t('ጠቅላላ መምህራን', 'Total Instructors')}</span>
                  <span className="text-xl font-black text-white">{validTeachers.length}</span>
                </div>
                <div className="bg-white/10 rounded-2xl p-3 border border-white/10">
                  <span className="text-[11px] text-emerald-300 block">{t('የተፈቀደላቸው', 'Allowed')}</span>
                  <span className="text-xl font-black text-emerald-400">{activeCount}</span>
                </div>
                <div className="bg-white/10 rounded-2xl p-3 border border-white/10">
                  <span className="text-[11px] text-rose-300 block">{t('የታገዱ (Locked)', 'Locked')}</span>
                  <span className="text-xl font-black text-rose-400">{lockedCount}</span>
                </div>
                <div className="bg-white/10 rounded-2xl p-3 border border-white/10">
                  <span className="text-[11px] text-amber-300 block">{t('የተመደቡ ኮርሶች', 'Assigned Courses')}</span>
                  <span className="text-xl font-black text-amber-300">{totalAssignedCourses}</span>
                </div>
              </div>
            </div>

            {/* Filter, Search & View Controls */}
            <div className="bg-white rounded-3xl p-3.5 sm:p-5 shadow-sm border border-slate-200/80 flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3">
              <div className="relative flex-1 lg:max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 sm:top-3 pointer-events-none" />
                <input
                  type="text"
                  value={teacherSearchTerm}
                  onChange={(e) => setTeacherSearchTerm(e.target.value)}
                  placeholder={t('የመምህር ስም ወይም የኮርስ ስም ፈልግ...', 'Search by instructor or course name...')}
                  className="w-full pl-9 pr-3.5 py-2.5 sm:py-2 text-base sm:text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700 font-medium"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs overflow-x-auto no-scrollbar max-w-full">
                  <button
                    onClick={() => setTeacherFilter('all')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                      teacherFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {t('ሁሉም', 'All')} ({validTeachers.length})
                  </button>
                  <button
                    onClick={() => setTeacherFilter('active')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                      teacherFilter === 'active' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {t('የተፈቀዱ', 'Allowed')} ({activeCount})
                  </button>
                  <button
                    onClick={() => setTeacherFilter('locked')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                      teacherFilter === 'locked' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {t('የታገዱ', 'Locked')} ({lockedCount})
                  </button>
                </div>

                <button
                  onClick={() => setShowAllKeys((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 transition-colors cursor-pointer min-h-[38px]"
                >
                  {showAllKeys ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showAllKeys ? t('ቁልፎችን ደብቅ', 'Hide Keys') : t('ሁሉንም አሳይ', 'Show All Keys')}</span>
                </button>
              </div>
            </div>

            {/* Mobile Teacher Key Cards */}
            <div className="md:hidden space-y-3">
              {filteredTeachers.map((teacher, idx) => {
                const teacherKey = userPasswords[teacher] || generateTeacherKey(teacher, idx + 1);
                const isLocked = userPasswords['_locked_' + teacher] === 'true';
                const isKeyVisible = showAllKeys || !!showKeys[teacher];
                const teacherCourses = courses.filter((c) => c.teacher === teacher);

                return (
                  <div key={teacher} className={`p-4 rounded-2xl border shadow-xs space-y-3 ${isLocked ? 'bg-rose-50/40 border-rose-200' : 'bg-white border-slate-200'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                          isLocked ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {teacher.substring(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 text-sm truncate">{teacher}</p>
                          <p className="text-[11px] text-slate-500">{t('ኮርሶች', 'Courses')}: {teacherCourses.length}</p>
                        </div>
                      </div>
                      {isLocked ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 shrink-0">
                          <Lock className="w-3 h-3" /> {t('የታገደ', 'Locked')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 shrink-0">
                          <CheckCircle2 className="w-3 h-3" /> {t('ንቁ', 'Active')}
                        </span>
                      )}
                    </div>

                    {teacherCourses.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {teacherCourses.map((c) => (
                          <span key={c.id} className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                            {formatCourseTitle(c.name, lang)}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                      <span className="font-mono font-bold text-xs text-emerald-800 select-all">
                        {isKeyVisible ? teacherKey : '••••••••••••'}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setShowKeys((prev) => ({ ...prev, [teacher]: !prev[teacher] }))}
                          className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 cursor-pointer"
                        >
                          {isKeyVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleCopyKey(teacher, teacherKey)}
                          className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 cursor-pointer"
                        >
                          {copiedTeacher === teacher ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleQuickGenerateKey(teacher, idx + 1)}
                          className="p-1.5 rounded-lg hover:bg-amber-100 text-amber-600 cursor-pointer"
                        >
                          <Sparkles className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => onOpenPasswordModal(teacher, teacher)}
                        className="flex-1 inline-flex items-center justify-center gap-1 bg-amber-500 hover:bg-amber-600 text-white text-xs px-3 py-2 rounded-xl font-bold cursor-pointer min-h-[38px]"
                      >
                        <Key className="w-3.5 h-3.5" />
                        <span>{t('ቁልፍ ቀይር', 'Change Key')}</span>
                      </button>
                      <button
                        onClick={() => onToggleTeacherLock?.(teacher)}
                        className={`flex-1 inline-flex items-center justify-center gap-1 text-xs px-3 py-2 rounded-xl font-bold cursor-pointer min-h-[38px] ${
                          isLocked ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-rose-600 hover:bg-rose-700 text-white'
                        }`}
                      >
                        {isLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                        <span>{isLocked ? t('ፍቀድ', 'Allow') : t('አግድ', 'Lock')}</span>
                      </button>
                      {onDeleteTeacher && (
                        <button
                          onClick={() => onDeleteTeacher(teacher)}
                          className="p-2 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200 cursor-pointer min-h-[38px]"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Teachers Master Table (Desktop/Tablet) */}
            <div className="hidden md:block bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[11px] border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">{t('ተ.ቁ', '#')}</th>
                      <th className="p-3.5">{t('የመምህር ስም', 'Instructor Name')}</th>
                      <th className="p-3.5">{t('የሚያስተምሯቸው ኮርሶች', 'Assigned Courses')}</th>
                      <th className="p-3.5">{t('የመግቢያ ቁልፍ (Passkey)', 'Passkey')}</th>
                      <th className="p-3.5">{t('ሁኔታ (Status)', 'Status')}</th>
                      <th className="p-3.5 text-right">{t('የዋና አድሚን እርምጃዎች', 'Admin Actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTeachers.map((teacher, idx) => {
                      const teacherKey = userPasswords[teacher] || generateTeacherKey(teacher, idx + 1);
                      const isLocked = userPasswords['_locked_' + teacher] === 'true';
                      const isKeyVisible = showAllKeys || !!showKeys[teacher];
                      const teacherCourses = courses.filter((c) => c.teacher === teacher);

                      return (
                        <tr key={teacher} className={`hover:bg-slate-50/80 transition-colors ${isLocked ? 'bg-rose-50/30' : ''}`}>
                          <td className="p-3.5 font-mono text-slate-400 font-bold">{idx + 1}</td>
                          <td className="p-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                                isLocked ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                {teacher.substring(0, 2)}
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 block">{teacher}</span>
                                <span className="text-[10px] text-slate-400">{t('የመግቢያ ስም', 'Login')}: {teacher}</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-3.5">
                            {teacherCourses.length === 0 ? (
                              <span className="text-slate-400 italic text-[11px]">{t('ኮርስ አልተመደበም', 'No course assigned')}</span>
                            ) : (
                              <div className="flex flex-wrap gap-1.5 max-w-xs">
                                {teacherCourses.map((c) => (
                                  <span
                                    key={c.id}
                                    className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/80"
                                    title={`${formatSchedule(c.schedule, lang)} (${c.credits} Cr)`}
                                  >
                                    {formatCourseTitle(c.name, lang)}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="p-3.5">
                            <div className="flex items-center gap-1.5">
                              {isKeyVisible ? (
                                <span className="font-mono font-bold text-xs text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 select-all tracking-wider">
                                  {teacherKey}
                                </span>
                              ) : (
                                <span className="font-mono text-slate-400 tracking-widest text-xs px-2.5 py-1 bg-slate-100 rounded-lg border border-slate-200">
                                  ••••••••••••
                                </span>
                              )}
                              <button
                                onClick={() => setShowKeys((prev) => ({ ...prev, [teacher]: !prev[teacher] }))}
                                className="p-1 rounded-lg hover:bg-slate-200/70 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                                title={isKeyVisible ? t('ቁልፉን ደብቅ', 'Hide Key') : t('ቁልፉን አሳይ', 'Show Key')}
                              >
                                {isKeyVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                onClick={() => handleCopyKey(teacher, teacherKey)}
                                className="p-1 rounded-lg hover:bg-slate-200/70 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                                title={t('ቁልፉን ኮፒ አድርግ', 'Copy Passkey')}
                              >
                                {copiedTeacher === teacher ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <button
                                onClick={() => handleQuickGenerateKey(teacher, idx + 1)}
                                className="p-1 rounded-lg hover:bg-amber-100 text-amber-600 transition-colors cursor-pointer"
                                title={t('አዲስ ፈጣን ቁልፍ አመንጭ', 'Generate Fresh Key')}
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                          <td className="p-3.5">
                            {isLocked ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                <Lock className="w-3 h-3" />
                                <span>{t('የታገደ (Locked)', 'Locked')}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>{t('ንቁ / የተፈቀደ', 'Active / Allowed')}</span>
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-right space-x-1.5 space-x-reverse whitespace-nowrap">
                            <button
                              onClick={() => onOpenPasswordModal(teacher, teacher)}
                              className="inline-flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-white text-[11px] px-2.5 py-1.5 rounded-lg font-bold shadow-xs transition-colors cursor-pointer"
                              title={t('ቁልፍ ቀይር', 'Change Key')}
                            >
                              <Key className="w-3 h-3" />
                              <span>{t('ቁልፍ ቀይር', 'Change Key')}</span>
                            </button>

                            <button
                              onClick={() => onToggleTeacherLock?.(teacher)}
                              className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg font-bold shadow-xs transition-colors cursor-pointer ${
                                isLocked
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                  : 'bg-rose-600 hover:bg-rose-700 text-white'
                              }`}
                              title={isLocked ? t('መግባት ፍቀድ', 'Allow Login') : t('መግባት አግድ', 'Lock Login')}
                            >
                              {isLocked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                              <span>{isLocked ? t('ፍቀድ', 'Allow') : t('አግድ', 'Lock')}</span>
                            </button>

                            {onDeleteTeacher && (
                              <button
                                onClick={() => onDeleteTeacher(teacher)}
                                className="inline-flex items-center p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title={t('መምህሩን ሰርዝ', 'Delete Instructor')}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* TAB 2: Courses */}
      {adminTab === 'courses' && (
        <div className="space-y-6">
          <TeacherAllocationManager
            courses={courses}
            teachers={teachers}
            onUpdateCourseTeacher={(courseId, newTeacher) => {
              if (onQuickAssignTeacher) {
                onQuickAssignTeacher(courseId, newTeacher);
              } else if (onSaveCourses) {
                const updated = courses.map((c) => (c.id === courseId ? { ...c, teacher: newTeacher } : c));
                onSaveCourses(updated);
                showNotify?.(
                  newTeacher === 'አልተመደበም (—)'
                    ? t('የመምህር ምደባ ተነስቷል!', 'Instructor assignment cleared!')
                    : t(`መምህር ${newTeacher} ተመድቧል!`, `Instructor ${newTeacher} assigned!`),
                  'success'
                );
              }
            }}
            onOpenAddCourse={onOpenAddCourse || (() => {})}
            onOpenEditCourse={onOpenEditCourse || (() => {})}
            onDeleteCourse={onDeleteCourse || (() => {})}
            onBatchDeleteCourses={onBatchDeleteCourses}
            onDownloadCourseGrades={handleExportAdminCourseExcel}
            showNotify={showNotify || (() => {})}
            currentYear={currentYear}
            currentSemester={currentSemester}
            availableYears={availableYears}
            allowEditDelete={true}
          />

          {/* Integrated Course Grade Supervision with Excel Upload, Download & PDF */}
          <div className="pt-6 border-t border-slate-200 space-y-4">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div>
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-emerald-800 shrink-0" />
                  <span>{t('የመምህራን ውጤት መቆጣጠሪያ፣ ኤክሴል መጫኛ/ማውረጃ እና ፒዲኤፍ', 'Course Grade Supervision, Excel Import/Export & PDF')}</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t('የትምህርት ዘመን', 'Academic Year')} {formatCalendarYear(currentYear, lang)} ({formatSemester(currentSemester, lang)}) — {t('መምህር', 'Instructor')}: <span className="font-bold text-slate-700">{formatTeacherDisplay(adminSelectedCourse?.teacher, lang)}</span> | {t('የተመዘገቡ', 'Enrolled')}: <span className="font-bold text-slate-700">{adminEnrolledStudents.length}</span>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                <select
                  value={adminSelectedCourseId}
                  onChange={(e) => setAdminSelectedCourseId(e.target.value)}
                  className="w-full sm:w-auto max-w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-emerald-700 cursor-pointer min-h-[40px]"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      [{formatProgram(c.program, lang)}] {formatCourseTitle(c.name, lang)} — {formatTeacherDisplay(c.teacher, lang)}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => setIsExcelUploadOpen(true)}
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border border-emerald-400 text-xs px-3 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs min-h-[38px]"
                  title={t('ውጤት ከማይክሮሶፍት ኤክሴል (.xlsx / .csv) ለመጫን', 'Upload grades from Excel (.xlsx / .csv)')}
                >
                  <Upload className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span>{t('ኤክሴል ጫን', 'Upload Excel')}</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportAdminCourseExcel}
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border border-emerald-400 text-xs px-3 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs min-h-[38px]"
                  title={t('የዚህን ኮርስ ውጤት በኤክሴል (.xlsx) ለማውረድ', 'Download course grades as Excel (.xlsx)')}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span>{t('ኤክሴል አውርድ', 'Download Excel')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPdfModalOpen(true)}
                  className="bg-cyan-50 hover:bg-cyan-100 text-cyan-950 border border-cyan-300 text-xs px-3 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs min-h-[38px]"
                  title={t('ይፋዊ የውጤት ሰነድ ለማተም ወይም በፒዲኤፍ (PDF) ለማስቀመጥ', 'View or print official course PDF report')}
                >
                  <Printer className="w-3.5 h-3.5 text-cyan-700 shrink-0" />
                  <span>{t('ሰነድ (PDF)', 'Report (PDF)')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    exportMasterSemesterGradeSheetToExcel(
                      students,
                      courses,
                      grades,
                      currentYear,
                      currentSemester
                    );
                    showNotify?.(
                      t(
                        `የትምህርት ዘመን ${currentYear} ሰሚስተር ${currentSemester} ጠቅላላ ውጤት ኤክሴል ተዘጋጅቶ ወርዷል!`,
                        `Master semester grade Excel sheet for ${currentYear} Semester ${currentSemester} downloaded!`
                      ),
                      'success'
                    );
                  }}
                  className="bg-indigo-50 hover:bg-indigo-100 text-indigo-950 border border-indigo-300 text-xs px-3 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs min-h-[38px]"
                  title={t('የሁሉም ተማሪዎች የሰሚስተሩን ጠቅላላ ውጤት ዝርዝር በኤክሴል (.xlsx) ለማውረድ', 'Download master semester grade sheet as Excel (.xlsx)')}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-700 shrink-0" />
                  <span>{t('ጠቅላላ ኤክሴል', 'Master Excel')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsMasterPdfOpen(true)}
                  className="bg-purple-50 hover:bg-purple-100 text-purple-950 border border-purple-300 text-xs px-3 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs min-h-[38px]"
                  title={t('የሁሉንም ተማሪዎች ጠቅላላ የሰሚስተር ውጤት ሉህ (Master Sheet) በፒዲኤፍ ለማየትና ለማተም', 'Preview or print master semester PDF sheet')}
                >
                  <Printer className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                  <span>{t('ጠቅላላ (PDF)', 'Master (PDF)')}</span>
                </button>

                {onSaveGrades && (
                  <button
                    type="button"
                    onClick={handleSaveAdminGrades}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 shadow-sm cursor-pointer min-h-[38px]"
                  >
                    <Save className="w-3.5 h-3.5 shrink-0" />
                    <span>{t('ለውጦችን መዝግብ', 'Save Changes')}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onSwitchView('TEACHER')}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs px-3 py-2 rounded-xl font-bold shadow-2xs cursor-pointer flex items-center gap-1 min-h-[38px]"
                  title={t('በመምህራን የውጤት መሙያ ገጽ ሙሉ በሙሉ ክፈት', 'Open full view in Instructor Portal')}
                >
                  <span>{t('በመምህራን ገጽ ክፈት', 'Open in Instructor Portal')}</span>
                </button>
              </div>
            </div>

            {(() => {
              if (!adminSelectedCourse) {
                return <div className="text-xs text-slate-500 py-4 text-center">{t('ኮርስ ይምረጡ።', 'Select a course.')}</div>;
              }

              const criteria = getCourseAssessmentItems(adminSelectedCourse);
              const totalWeight = criteria.reduce((sum, it) => sum + (Number(it.max) || 0), 0);

              return isMobileViewport ? (
                <div className="space-y-3">
                  {adminEnrolledStudents.map((s) => (
                    <StandardGradeMobileCard
                      key={s.uid}
                      student={s}
                      breakdown={adminLocalGrades[s.uid]}
                      criteria={criteria}
                      onScoreChange={handleAdminScoreChange}
                    />
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto max-h-96 overflow-y-auto border border-slate-200 rounded-2xl">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-100/95 sticky top-0 font-bold uppercase text-[10px] z-20">
                      <tr>
                        <th className="p-2.5 bg-slate-100">{t('ID', 'ID')}</th>
                        <th className="p-2.5 bg-slate-100 sticky left-0 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)]">{t('የተማሪ ስም', 'Student Name')}</th>
                        {criteria.map((it, idx) => {
                          const color = getCriterionColor(idx);
                          return (
                            <th
                              key={it.id}
                              className={`p-2.5 text-center min-w-[75px] ${color.headerBg} border-b-2 ${color.headerBorder}`}
                            >
                              <span className="block font-bold truncate max-w-[80px]">{formatCriterionLabel(it.label, lang)}</span>
                              <span className="block text-[9px] font-mono font-black">({it.max}%)</span>
                            </th>
                          );
                        })}
                        <th className="p-2.5 text-center bg-emerald-100/70 text-emerald-950 border-b-2 border-emerald-500 font-black">
                          {t('ድምር', 'Total')} ({totalWeight}%)
                        </th>
                        <th className="p-2.5 text-center bg-amber-100/70 text-amber-950 border-b-2 border-amber-500 font-black">
                          {t('ፊደል', 'Letter')}
                        </th>
                        <th className="p-2.5 text-center bg-slate-100 text-slate-800">{t('ነጥብ', 'Points')}</th>
                      </tr>
                    </thead>
                    <tbody ref={adminTbodyRef} className="divide-y divide-slate-100">
                      {adminEnrolledStudents.map((s, idx) => (
                        <StandardGradeDesktopRow
                          key={s.uid}
                          student={s}
                          rowIndex={idx}
                          breakdown={adminLocalGrades[s.uid]}
                          criteria={criteria}
                          onScoreChange={handleAdminScoreChange}
                          onCellKeyDown={handleAdminCellKeyDown}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* TAB 3: Students & Individual Passwords */}
      {adminTab === 'students' && (() => {
        const filteredStudents = students.filter((s) => {
          const matchesSearch =
            s.name.toLowerCase().includes(adminStudentSearch.toLowerCase()) ||
            s.id.toLowerCase().includes(adminStudentSearch.toLowerCase());
          const matchesProg = adminStudentProgFilter === 'ALL' || s.program === adminStudentProgFilter;
          const matchesYear = adminStudentYearFilter === 'ALL' || (s.currentStudyYear || 1) === adminStudentYearFilter;
          const matchesStatus = adminStudentStatusFilter === 'ALL' || (s.graduationStatus || 'ACTIVE') === adminStudentStatusFilter;
          return matchesSearch && matchesProg && matchesYear && matchesStatus;
        });

        // Sorted according to official Amharic Fidel alphabetical order (ሀ እስከ ፐ)
        const sortedFilteredStudents = sortStudentsByAmharicName(filteredStudents);

        return (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-4 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-3">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-700 shrink-0" />
                  <span>{t(`የተማሪዎች ማህደር፣ ደረጃ፣ ውጤት እና ቁልፎች (${students.length})`, `Student Directory, Level, Grades & Passkeys (${students.length})`)}</span>
                </h3>
                <p className="text-xs text-slate-500">
                  {t(
                    'ሁሉም ተማሪዎች ከመለያ ኮድ ውጪ የሆነ የግል መግቢያ ቁልፍ (ST-XXXX) አላቸው። ስሞች በአማርኛ ፊደል ተራ ተደርድረዋል።',
                    'Every student has an individual login passkey (ST-XXXX) in addition to their Student ID. Names are sorted alphabetically.'
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                {onOpenAddStudent && (
                  <button
                    type="button"
                    onClick={onOpenAddStudent}
                    className="inline-flex items-center gap-1.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs px-3 py-2 rounded-xl font-bold shadow-sm transition-all cursor-pointer min-h-[38px]"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                    <span>{t('አዲስ ተማሪ ጨምር', 'Add New Student')}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowStudentCredentialsModal(true)}
                  className="inline-flex items-center gap-1.5 bg-gradient-to-r from-emerald-800 to-emerald-700 hover:from-emerald-900 hover:to-emerald-800 text-white text-xs px-3 py-2 rounded-xl font-bold shadow-sm transition-all cursor-pointer min-h-[38px]"
                >
                  <Printer className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <span>{t('የቁልፍ ሰነድ (Print/Export)', 'Passkeys Sheet (Print/Export)')}</span>
                </button>

                <span className="text-xs bg-slate-100 text-slate-700 px-3 py-2 rounded-xl font-bold">
                  {t('የተጣሩ:', 'Filtered:')} {sortedFilteredStudents.length} / {students.length}
                </span>
              </div>
            </div>

            {/* Filters Toolbar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 bg-slate-50 p-3 sm:p-3.5 rounded-2xl border border-slate-200">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 sm:top-2.5" />
                <input
                  type="text"
                  placeholder={t('በስም ወይም በመለያ ቁጥር ፈልግ...', 'Search by name or ID...')}
                  value={adminStudentSearch}
                  onChange={(e) => setAdminStudentSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 sm:py-1.5 text-base sm:text-xs border rounded-xl bg-white border-slate-300 focus:ring-2 focus:ring-emerald-700"
                />
              </div>

              <select
                value={adminStudentProgFilter}
                onChange={(e) => setAdminStudentProgFilter(e.target.value as any)}
                className="p-2 text-xs font-semibold border rounded-xl bg-white border-slate-300 focus:ring-2 focus:ring-emerald-700 cursor-pointer min-h-[40px]"
              >
                <option value="ALL">{t('ፕሮግራም: ሁሉም', 'Program: All')}</option>
                <option value="Degree">{t('ድግሪ (Degree)', 'Degree')}</option>
                <option value="Diploma">{t('ዲፕሎማ (Diploma)', 'Diploma')}</option>
              </select>

              <select
                value={adminStudentYearFilter}
                onChange={(e) => setAdminStudentYearFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                className="p-2 text-xs font-semibold border rounded-xl bg-white border-slate-300 focus:ring-2 focus:ring-emerald-700 cursor-pointer min-h-[40px]"
              >
                <option value="ALL">{t('ደረጃ: ሁሉም ዓመታት', 'Level: All Years')}</option>
                <option value={1}>{t('1ኛ ዓመት (Year 1)', '1st Year')}</option>
                <option value={2}>{t('2ኛ ዓመት (Year 2)', '2nd Year')}</option>
                <option value={3}>{t('3ኛ ዓመት (Year 3)', '3rd Year')}</option>
              </select>

              <select
                value={adminStudentStatusFilter}
                onChange={(e) => setAdminStudentStatusFilter(e.target.value as any)}
                className="p-2 text-xs font-semibold border rounded-xl bg-white border-slate-300 focus:ring-2 focus:ring-emerald-700 cursor-pointer min-h-[40px]"
              >
                <option value="ALL">{t('ሁኔታ: ሁሉም', 'Status: All')}</option>
                <option value="ACTIVE">{t('በመማር ላይ (Active)', 'Active Student')}</option>
                <option value="CANDIDATE">{t('ተማራቂ (Candidate)', 'Graduating Candidate')}</option>
                <option value="GRADUATED">{t('የተመረቀ (Graduated)', 'Graduated')}</option>
              </select>
            </div>

            {/* Mobile Student Cards */}
            <div className="md:hidden space-y-2.5 max-h-[65vh] overflow-y-auto pr-0.5">
              {sortedFilteredStudents.map((s) => {
                const passkey = userPasswords[s.uid] || DEFAULT_STUDENT_PASSKEYS[s.uid] || generateStudentPasskey(s);
                const isVisible = showStudentKeys[s.uid];
                const isCopied = copiedStudentUid === s.uid;

                return (
                  <div key={s.uid} className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2.5">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 text-sm truncate">{s.name}</p>
                        <p className="text-[11px] font-mono text-slate-500">
                          ID: {s.id} • {formatGender(s.gender, lang)} • {formatCalendarYear(s.admissionYear || '2019', lang)}
                        </p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                        s.program === 'Degree' ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {formatProgram(s.program, lang)} ({formatYearLevel(s.currentStudyYear || 1, lang)})
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 text-xs">
                      <span className="font-mono font-bold text-emerald-800">
                        {isVisible ? passkey : `•••• (${passkey})`}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setShowStudentKeys((prev) => ({ ...prev, [s.uid]: !prev[s.uid] }))}
                          className="p-1.5 text-slate-500 hover:text-slate-800 cursor-pointer"
                        >
                          {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(passkey);
                            setCopiedStudentUid(s.uid);
                            showNotify?.(t(`የ${s.name} መግቢያ ቁልፍ ተቀድቷል!`, `Copied passkey for ${s.name}!`), 'success');
                            setTimeout(() => setCopiedStudentUid(null), 2000);
                          }}
                          className="p-1.5 text-slate-500 hover:text-emerald-700 cursor-pointer"
                        >
                          {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {onOpenEditStudent && (
                        <button
                          onClick={() => onOpenEditStudent(s)}
                          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-2.5 py-2 rounded-xl font-bold inline-flex items-center justify-center gap-1 cursor-pointer min-h-[38px]"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>{t('ስም አርም', 'Edit')}</span>
                        </button>
                      )}
                      <button
                        onClick={() => onOpenPasswordModal(s.uid, s.name)}
                        className="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-xs px-2.5 py-2 rounded-xl font-bold cursor-pointer min-h-[38px]"
                      >
                        {t('ቁልፍ ቀይር', 'Change Key')}
                      </button>
                      <button
                        onClick={() => onSelectPrintTranscript(s)}
                        className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white text-xs px-2.5 py-2 rounded-xl font-bold cursor-pointer min-h-[38px]"
                      >
                        {t('ትራንስክሪፕት', 'Transcript')}
                      </button>
                      {onDeleteStudent && (
                        <button
                          onClick={() => onDeleteStudent(s.uid)}
                          className="bg-rose-100 hover:bg-rose-200 text-rose-700 p-2 rounded-xl font-bold cursor-pointer min-h-[38px]"
                          title={t('ተማሪውን ሰርዝ', 'Delete student')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="hidden md:block overflow-x-auto max-h-96 overflow-y-auto border rounded-2xl">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-100/95 sticky top-0 font-bold uppercase text-[10px] z-20">
                  <tr>
                    <th className="p-2.5 bg-slate-100">{t('ተ.ቁ', 'No.')}</th>
                    <th className="p-2.5 bg-slate-100">ID</th>
                    <th className="p-2.5 bg-slate-100 sticky left-0 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)]">{t('የተማሪ ስም (በፊደል ተራ)', 'Student Name')}</th>
                    <th className="p-2.5">{t('ጾታ', 'Gender')}</th>
                    <th className="p-2.5">{t('ፕሮግራም', 'Program')}</th>
                    <th className="p-2.5">{t('ደረጃ / ዓመት', 'Year Level')}</th>
                    <th className="p-2.5">{t('የትምህርት መንገድ', 'Study Track')}</th>
                    <th className="p-2.5">{t('ሁኔታ', 'Status')}</th>
                    <th className="p-2.5">{t('የግል መግቢያ ቁልፍ (Passkey)', 'Personal Passkey')}</th>
                    <th className="p-2.5 text-right">{t('ተግባር', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedFilteredStudents.map((s, idx) => {
                    const passkey = userPasswords[s.uid] || DEFAULT_STUDENT_PASSKEYS[s.uid] || generateStudentPasskey(s);
                    const isVisible = showStudentKeys[s.uid];
                    const isCopied = copiedStudentUid === s.uid;

                    return (
                      <tr key={s.uid} className="hover:bg-slate-50 transition-colors">
                        <td className="p-2.5 font-mono text-slate-400">{idx + 1}</td>
                        <td className="p-2.5 font-mono font-bold text-slate-800 whitespace-nowrap">{s.id}</td>
                        <td className="p-2.5 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] whitespace-nowrap">
                          <span className="font-bold text-slate-900 block">{s.name}</span>
                          <span className="text-[10px] text-slate-400">{t('የገቡበት:', 'Admitted:')} {formatCalendarYear(s.admissionYear || '2019', lang)}</span>
                        </td>
                        <td className="p-2.5 text-slate-600">{formatGender(s.gender, lang)}</td>
                        <td className="p-2.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            s.program === 'Degree' ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {formatProgram(s.program, lang)}
                          </span>
                        </td>
                        <td className="p-2.5">
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                            s.currentStudyYear === 2 ? 'bg-amber-100 text-amber-950 border border-amber-300' : s.currentStudyYear === 3 ? 'bg-purple-100 text-purple-900' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {formatYearLevel(s.currentStudyYear || 1, lang)}
                          </span>
                        </td>
                        <td className="p-2.5 text-[11px] text-slate-600">
                          {s.program === 'Diploma' ? (
                            <span>{t('2 ዓመት (4 ሴሚስተር)', '2 Years (4 Semesters)')}</span>
                          ) : s.degreeTrack === '2_YEAR' || s.priorDiploma ? (
                            <span className="font-bold text-indigo-700">{t('2 ዓመት (ቅድመ ዲፕሎማ)', '2-Year Track (Prior Diploma)')}</span>
                          ) : (
                            <span>{t('3 ዓመት መደበኛ (5-6 ሴሚስተር)', '3-Year Regular (5-6 Semesters)')}</span>
                          )}
                        </td>
                        <td className="p-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            s.graduationStatus === 'GRADUATED'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : s.graduationStatus === 'CANDIDATE'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {formatGradStatus(s.graduationStatus || 'ACTIVE', lang)}
                          </span>
                        </td>
                        <td className="p-2.5">
                          <div className="flex items-center gap-1 font-mono text-xs">
                            <span className={`px-2 py-0.5 rounded font-bold ${isVisible ? 'bg-amber-100 text-amber-950 border border-amber-300' : 'text-emerald-800'}`}>
                              {isVisible ? passkey : `•••••• (${passkey})`}
                            </span>
                            <button
                              type="button"
                              onClick={() => setShowStudentKeys((prev) => ({ ...prev, [s.uid]: !prev[s.uid] }))}
                              className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                              title={isVisible ? t('ደብቅ', 'Hide') : t('አሳይ', 'Show')}
                            >
                              {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(passkey);
                                setCopiedStudentUid(s.uid);
                                showNotify?.(t(`የ${s.name} መግቢያ ቁልፍ ተቀድቷል!`, `Copied passkey for ${s.name}!`), 'success');
                                setTimeout(() => setCopiedStudentUid(null), 2000);
                              }}
                              className="p-1 text-slate-400 hover:text-emerald-700 cursor-pointer"
                              title={t('ቁልፍ ኮፒ አድርግ', 'Copy Passkey')}
                            >
                              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                        <td className="p-2.5 text-right space-x-1 space-x-reverse whitespace-nowrap">
                          {onOpenEditStudent && (
                            <button
                              onClick={() => onOpenEditStudent(s)}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] px-2.5 py-1 rounded-lg font-bold cursor-pointer inline-flex items-center gap-1"
                              title={t('የተማሪውን ስም እና መረጃ አርም', 'Edit student name and info')}
                            >
                              <Edit className="w-3 h-3" />
                              <span>{t('ስም አርም', 'Edit')}</span>
                            </button>
                          )}
                          <button
                            onClick={() => onOpenPasswordModal(s.uid, s.name)}
                            className="bg-amber-500 hover:bg-amber-600 text-white text-[10px] px-2.5 py-1 rounded-lg font-bold cursor-pointer"
                            title={t('ቁልፍ ቀይር', 'Change Passkey')}
                          >
                            {t('ቁልፍ ቀይር', 'Change Key')}
                          </button>
                          <button
                            onClick={() => onSelectPrintTranscript(s)}
                            className="bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] px-2.5 py-1 rounded-lg font-bold cursor-pointer"
                            title={t('ትራንስክሪፕት', 'Transcript')}
                          >
                            {t('ትራንስክሪፕት', 'Transcript')}
                          </button>
                          {onDeleteStudent && (
                            <button
                              onClick={() => onDeleteStudent(s.uid)}
                              className="bg-rose-100 hover:bg-rose-200 text-rose-700 text-[10px] px-2 py-1 rounded-lg font-bold cursor-pointer inline-flex items-center gap-1"
                              title={t('ተማሪውን ሰርዝ', 'Delete student')}
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>{t('ሰርዝ', 'Delete')}</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Student Credentials Modal */}
            {showStudentCredentialsModal && (
              <StudentCredentialsModal
                students={students}
                userPasswords={userPasswords}
                churchLogo={churchLogo}
                currentYear={currentYear}
                currentSemester={currentSemester}
                onClose={() => setShowStudentCredentialsModal(false)}
                showNotify={showNotify || (() => {})}
                onOpenPasswordModal={onOpenPasswordModal}
              />
            )}
          </div>
        );
      })()}


      {/* Modal: Add New Teacher with Custom or Auto-generated Key */}
      {showAddTeacherModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="bg-emerald-950 text-white p-5 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm">{t('አዲስ መምህር መመዝገቢያና ቁልፍ ማዘጋጃ', 'Register New Instructor & Passkey')}</h3>
              </div>
              <button
                onClick={() => setShowAddTeacherModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const cleanName = newTeacherName.trim();
                if (!cleanName) return;
                const finalKey = newTeacherCustomKey.trim() || generateTeacherKey(cleanName, teachers.length + 1);
                onAddTeacher?.(cleanName, finalKey);
                setShowAddTeacherModal(false);
              }}
              className="p-6 space-y-4 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {t('የመምህሩ ሙሉ ስም (ለምሳሌ፦ መ/ር ዮሐንስ ገብሬ)', 'Instructor Full Name (e.g., Instr. Yohannes Gebre)')}
                </label>
                <input
                  type="text"
                  value={newTeacherName}
                  onChange={(e) => setNewTeacherName(e.target.value)}
                  placeholder={t('የመምህር ስም ያስገቡ...', 'Enter instructor name...')}
                  required
                  className="w-full px-3.5 py-2.5 border rounded-xl bg-slate-50 border-slate-300 focus:ring-2 focus:ring-emerald-700 font-medium"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-bold text-slate-700">{t('የመግቢያ ቁልፍ (Passkey)', 'Login Passkey')}</label>
                  <button
                    type="button"
                    onClick={() => {
                      const sampleName = newTeacherName.trim() || 'TCH';
                      setNewTeacherCustomKey(generateTeacherKey(sampleName, teachers.length + 1));
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 hover:text-amber-800 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>{t('ቁልፍ በራስ-ሰር አመንጭ', 'Auto-Generate Key')}</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={newTeacherCustomKey}
                  onChange={(e) => setNewTeacherCustomKey(e.target.value)}
                  placeholder={t('ባዶ ቢተዉት ሲስተሙ ራሱ ጠንካራ ቁልፍ ያዘጋጃል (ለምሳሌ፦ BK-YOH-4921)', 'Leave blank to auto-generate a strong key (e.g., BK-YOH-4921)')}
                  className="w-full px-3.5 py-2.5 border rounded-xl bg-slate-50 border-slate-300 focus:ring-2 focus:ring-emerald-700 font-mono tracking-wider font-bold text-emerald-800"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
                <strong>{t('ማስታወሻ፦', 'Note:')}</strong>{' '}
                {t(
                  'ይህ የመግቢያ ቁልፍ መምህሩ ወደ ሲስተሙ ገብተው ውጤት ለመሙላትና ኮርሳቸውን ለመምራት የሚያስችላቸው የግል ቁልፍ ነው።',
                  'This personal passkey allows the instructor to sign in, enter student grades, and manage their assigned courses.'
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddTeacherModal(false)}
                  className="px-4 py-2 border rounded-xl hover:bg-slate-100 font-semibold text-slate-700 cursor-pointer"
                >
                  {t('ሰርዝ', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{t('መምህሩንና ቁልፉን መዝግብ', 'Register Instructor & Key')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Official Printable Teacher Credentials Roster */}
      {showPrintCredentialsModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-3xl w-full max-h-[94vh] flex flex-col overflow-hidden border border-slate-200">
            {/* Top Toolbar (No-Print) */}
            <div className="bg-emerald-950 text-white p-3 sm:p-4 flex flex-wrap justify-between items-center gap-2 no-print">
              <div className="flex items-center gap-2 min-w-0">
                <Printer className="w-5 h-5 text-amber-400 shrink-0" />
                <h3 className="font-bold text-xs sm:text-sm truncate">{t('የመምህራን ይፋዊ የመግቢያ ቁልፎች ሰነድ', 'Official Instructor Passkeys Document')}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => printElementDirectly('printable-teacher-credentials')}
                  className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs px-3 py-2 rounded-xl shadow-sm transition-colors cursor-pointer min-h-[36px]"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{t('አትም (PDF)', 'Print (PDF)')}</span>
                </button>
                <button
                  onClick={() => setShowPrintCredentialsModal(false)}
                  className="p-2 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Document Body */}
            <div className="flex-1 overflow-y-auto print:overflow-visible">
            <div id="printable-teacher-credentials" className="p-4 sm:p-8 print:p-0 space-y-6 text-slate-800 bg-white">
              {/* Church Letterhead */}
              <div className="text-center border-b-2 border-emerald-900 pb-5 space-y-2">
                <div className="flex justify-center mb-2">
                  <img
                    src={churchLogo || DEFAULT_CHURCH_LOGO}
                    alt={t('የቤተ ክርስቲያን አርማ', 'Church Logo')}
                    className="h-14 sm:h-16 w-auto object-contain"
                  />
                </div>
                <h1 className="text-base sm:text-lg font-black text-emerald-950 tracking-wide">
                  {t('የብርብር ከተማ ቃለ ሕይወት ቤተ ክርስቲያን', 'Birbir City Kale Heywet Church')}
                </h1>
                <h2 className="text-sm sm:text-base font-bold text-slate-800">
                  {t('የመጽሐፍ ቅዱስ ትምህርት ቤት ክፍል', 'Bible Training School Department')}
                </h2>
                <div className="inline-block bg-emerald-50 text-emerald-950 px-3 sm:px-4 py-1 rounded-full text-[11px] sm:text-xs font-bold border border-emerald-200">
                  {t(
                    `የመምህራን ይፋዊ የመግቢያ ቁልፎችና የኮርሶች ምደባ ሰነድ (${currentYear} ዓ.ም)`,
                    `Official Instructor Passkeys & Course Assignments (${formatCalendarYear(currentYear, lang)})`
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  {t(
                    'ሚስጥራዊ ሰነድ - በዋና አድሚን ብቻ ተዘጋጅቶ ለመምህራን የሚሰጥ',
                    'Confidential Document — Prepared by Super Admin for Instructors Only'
                  )}
                </p>
              </div>

              {/* Roster Table */}
              <div className="border border-slate-300 rounded-xl overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[540px]">
                  <thead className="bg-slate-100 font-bold uppercase text-[11px] border-b border-slate-300">
                    <tr>
                      <th className="p-2.5 border-r border-slate-300 w-12 text-center">{t('ተ.ቁ', 'No.')}</th>
                      <th className="p-2.5 border-r border-slate-300">{t('የመምህሩ ሙሉ ስም', 'Instructor Full Name')}</th>
                      <th className="p-2.5 border-r border-slate-300">{t('የሚያስተምሩት ኮርስ', 'Assigned Courses')}</th>
                      <th className="p-2.5 border-r border-slate-300">{t('የመግቢያ ስም', 'Username')}</th>
                      <th className="p-2.5 border-r border-slate-300 font-mono">{t('የመግቢያ ቁልፍ (Passkey)', 'Passkey')}</th>
                      <th className="p-2.5 text-center">{t('ሁኔታ', 'Status')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs">
                    {teachers.filter((t) => !t.includes('—')).map((teacher, idx) => {
                      const key = userPasswords[teacher] || generateTeacherKey(teacher, idx + 1);
                      const isLocked = userPasswords['_locked_' + teacher] === 'true';
                      const teacherCourses = courses.filter((c) => c.teacher === teacher);

                      return (
                        <tr key={teacher} className={idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}>
                          <td className="p-2.5 border-r border-slate-200 text-center font-bold text-slate-500">
                            {idx + 1}
                          </td>
                          <td className="p-2.5 border-r border-slate-200 font-bold text-slate-900">
                            {teacher}
                          </td>
                          <td className="p-2.5 border-r border-slate-200 text-[11px]">
                            {teacherCourses.length > 0
                              ? teacherCourses.map((c) => formatCourseTitle(c.name, lang)).join(lang === 'en' ? ', ' : '፣ ')
                              : t('ኮርስ አልተመደበም', 'No courses assigned')}
                          </td>
                          <td className="p-2.5 border-r border-slate-200 font-mono text-[11px] text-slate-600">
                            {teacher}
                          </td>
                          <td className="p-2.5 border-r border-slate-200 font-mono font-bold text-emerald-900 text-xs">
                            {key}
                          </td>
                          <td className="p-2.5 text-center text-[10px] font-bold">
                            {isLocked ? (
                              <span className="text-rose-700">{t('የታገደ', 'Locked')}</span>
                            ) : (
                              <span className="text-emerald-700">{t('የተፈቀደ', 'Active')}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Signatures */}
              <div className="pt-6 sm:pt-8 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-6 sm:gap-8 text-xs">
                <div className="space-y-4">
                  <p className="font-bold text-slate-700">{t('ያዘጋጀው (ዋና አድሚን)፦', 'Prepared By (Super Admin):')}</p>
                  <p className="text-slate-400">{t('ስም፡', 'Name:')} ___________________________</p>
                  <p className="text-slate-400">{t('ፊርማ፡', 'Signature:')} ___________________________</p>
                  <p className="text-slate-400">{t('ቀን፡', 'Date:')} ___________________________</p>
                </div>
                <div className="space-y-4">
                  <p className="font-bold text-slate-700">{t('ያረጋገጠው (የትምህርት ክፍሉ ዋና ዲን)፦', 'Verified By (Academic Dean):')}</p>
                  <p className="text-slate-400">{t('ስም፡', 'Name:')} ___________________________</p>
                  <p className="text-slate-400">{t('ፊርማ፡', 'Signature:')} ___________________________</p>
                  <p className="text-slate-400">{t('ቀን፡', 'Date:')} ___________________________</p>
                </div>
              </div>
            </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: Official Stamp & Signatures */}
      {adminTab === 'official_signatures' && (
        <OfficialSignaturesManager
          config={officialConfig}
          onSaveConfig={onSaveOfficialConfig}
          showNotify={showNotify || (() => {})}
          userRoleTitle="ዋና አድሚን"
          churchLogo={churchLogo}
        />
      )}

      {/* Excel Upload Modal for Admin */}
      {isExcelUploadOpen && adminSelectedCourse && (
        <ExcelUploadModal
          course={adminSelectedCourse}
          students={adminEnrolledStudents}
          currentYear={currentYear}
          currentSemester={currentSemester}
          onApplyGrades={handleApplyAdminImportedScores}
          onClose={() => setIsExcelUploadOpen(false)}
          showNotify={showNotify || (() => {})}
        />
      )}

      {/* Official PDF Grade Report Modal for Admin */}
      {isPdfModalOpen && adminSelectedCourse && (
        <CourseGradeReportPdfModal
          course={adminSelectedCourse}
          students={adminEnrolledStudents}
          grades={adminLocalGrades}
          currentYear={currentYear}
          currentSemester={currentSemester}
          officialConfig={officialConfig}
          churchLogo={churchLogo}
          onClose={() => setIsPdfModalOpen(false)}
        />
      )}

      {/* Official Master PDF Grade Sheet Modal for Admin */}
      {isMasterPdfOpen && (
        <MasterGradeReportPdfModal
          students={students}
          courses={courses}
          grades={grades}
          currentYear={currentYear}
          currentSemester={currentSemester}
          officialConfig={officialConfig}
          churchLogo={churchLogo}
          onClose={() => setIsMasterPdfOpen(false)}
        />
      )}

      {/* Modal: Add Custom Academic Year (የዋና አድሚን ውሳኔ) */}
      {showAddYearModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-700" />
                <span>{t('አዲስ የትምህርት ዘመን መመዝገቢያ', 'Register New Academic Year')}</span>
              </h3>
              <button
                onClick={() => setShowAddYearModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateYear} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {t('የትምህርት ዘመን (በኢትዮጵያ ዘመን አቆጣጠር ዓ.ም)', 'Academic Year (Ethiopian Calendar E.C.)')}
                </label>
                <input
                  type="text"
                  placeholder={t('ምሳሌ: 2031 ወይም 2032', 'Example: 2031 or 2032')}
                  value={newYearInput}
                  onChange={(e) => setNewYearInput(e.target.value)}
                  className="w-full p-2.5 border rounded-xl bg-slate-50 border-slate-300 font-mono font-bold focus:ring-2 focus:ring-emerald-700 text-slate-900"
                  required
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  {t('አዲሱ የትምህርት ዘመን በ1ኛ እና 2ኛ ሴሚስተር በሲስተሙ ይመዘገባል', 'The new academic year will be registered for 1st & 2nd Semesters')}
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddYearModal(false)}
                  className="px-4 py-2 border rounded-xl hover:bg-slate-100 font-semibold text-slate-700 cursor-pointer"
                >
                  {t('ሰርዝ', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  {t('መዝግብና ወቅታዊ አድርግ', 'Register & Activate')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
