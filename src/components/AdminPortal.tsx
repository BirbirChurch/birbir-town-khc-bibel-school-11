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
  BarChart3
} from 'lucide-react';
import { GradingScaleItem, Student, Course, GradeBreakdown, OfficialSignaturesConfig, ProgramType, SemesterReleaseConfig } from '../types.ts';
import { OFFICIAL_GRADING_SCALE, generateTeacherKey, DEFAULT_STUDENT_PASSKEYS, generateStudentPasskey } from '../data/initialData.ts';
import { sortStudentsByAmharicName } from '../utils/amharicSort.ts';
import { StudentCredentialsModal } from './StudentCredentialsModal.tsx';
import { FirebaseConnectionReport } from '../services/firebaseSync.ts';
import { DEFAULT_CHURCH_LOGO } from '../assets/logo.ts';
import { OfficialSignaturesManager } from './OfficialSignaturesManager.tsx';
import { ExcelUploadModal } from './ExcelUploadModal.tsx';
import { CourseGradeReportPdfModal } from './CourseGradeReportPdfModal.tsx';
import { exportCourseGradesToExcel, exportMasterSemesterGradeSheetToExcel } from '../utils/excelUtils.ts';
import { getCourseAssessmentItems, getCriterionScore, getEffectiveGradeValues, getGradeKey, resolveGradeBreakdown } from '../utils/gradeCalculations.ts';
import { getCriterionColor } from './TeacherPortal.tsx';
import { GraduationManager } from './GraduationManager.tsx';
import { MasterGradeReportPdfModal } from './MasterGradeReportPdfModal.tsx';
import { AdminAnalytics } from './AdminAnalytics.tsx';
import { compressImage } from '../utils/imageCompressor.ts';
import { isSampleCourse } from './SampleCoursesModal.tsx';
import { TeacherAllocationManager } from './TeacherAllocationManager.tsx';
import { SemesterReleaseControl } from './SemesterReleaseControl.tsx';

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
  onSaveCourses?: (updatedCourses: Course[]) => void;
  onOpenAddCourse?: () => void;
  onOpenEditCourse?: (course: Course) => void;
  onDeleteCourse?: (courseId: string) => void;
  onOpenSampleCoursesModal?: () => void;
  onQuickAssignTeacher?: (courseId: string, newTeacher: string) => void;
  onBatchDeleteCourses?: (courseIds: string[]) => void;
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
  onSaveCourses,
  onOpenAddCourse,
  onOpenEditCourse,
  onDeleteCourse,
  onOpenSampleCoursesModal,
  onQuickAssignTeacher,
  onBatchDeleteCourses
}) => {
  const [adminTab, setAdminTab] = useState<'security' | 'academic_calendar' | 'teachers' | 'courses' | 'students' | 'graduation' | 'analytics' | 'official_signatures'>('security');
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
      showNotify?.(`የትምህርት ዘመን ${clean} አስቀድሞ አለ!`, 'warning');
      return;
    }
    onAddAcademicYear?.(clean);
    onYearChange?.(clean);
    setNewYearInput('');
    setShowAddYearModal(false);
    showNotify?.(`አዲስ የትምህርት ዘመን (${clean} ዓ.ም - ኢ.ዘ.አ) በዋና አድሚን ውሳኔ ተጨምሯል!`, 'success');
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

  const adminSelectedCourse = courses.find((c) => c.id === adminSelectedCourseId) || courses[0];
  const adminEnrolledStudents = adminSelectedCourse
    ? students.filter((s) => s.program === adminSelectedCourse.program)
    : [];

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
    showNotify?.(`የ${adminSelectedCourse.name} ውጤት ኤክሴል ሰነድ (.xlsx) በስኬት ወርዷል!`, 'success');
  };

  // Apply imported Excel scores for Admin with instant persistence
  const handleApplyAdminImportedScores = (scoresByUid: Record<string, Record<string, number>>) => {
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

      nextLocal[uid] = updatedBreakdown;

      const keyByUid = getGradeKey(uid, adminSelectedCourse.id, targetYear, targetSem);
      const keyById = getGradeKey(studentId, adminSelectedCourse.id, targetYear, targetSem);
      const directKey = `${uid}_${adminSelectedCourse.id}`;
      const defaultYearKey = getGradeKey(uid, adminSelectedCourse.id, currentYear, currentSemester);

      updatedGlobal[keyByUid] = updatedBreakdown;
      updatedGlobal[keyById] = updatedBreakdown;
      updatedGlobal[directKey] = updatedBreakdown;
      updatedGlobal[defaultYearKey] = updatedBreakdown;
    });

    setAdminLocalGrades(nextLocal);
    if (onSaveGrades) {
      onSaveGrades(updatedGlobal);
    }
    try {
      localStorage.setItem('bk_grades', JSON.stringify(updatedGlobal));
    } catch (_) {}

    showNotify?.(`የ${Object.keys(scoresByUid).length} ተማሪዎች ውጤት ከኤክሴል በስኬት ተመዝግቧል!`, 'success');
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
      const defaultYearKey = getGradeKey(s.uid, adminSelectedCourse.id, currentYear, currentSemester);

      updated[keyByUid] = breakdown;
      updated[keyById] = breakdown;
      updated[directKey] = breakdown;
      updated[defaultYearKey] = breakdown;
    });

    onSaveGrades(updated);
    try {
      localStorage.setItem('bk_grades', JSON.stringify(updated));
    } catch (_) {}
    showNotify?.('የተስተካከሉት ውጤቶች በስኬት ተመዝግበዋል!', 'success');
  };

  // Handle cell edit for Admin
  const handleAdminScoreChange = (
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
  };
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
    { key: 'admin', name: 'አድሚን (Admin)', username: 'admin' },
    { key: 'dean', name: 'ዋና ዲን (Academic Dean)', username: 'dean' },
    { key: 'registrar', name: 'ሪጅስተራል (Registrar)', username: 'registrar' }
  ];

  return (
    <div className="space-y-6 no-print">
      {/* Top Banner & Maintenance Mode */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/80 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Shield className="w-7 h-7 text-emerald-800" />
            <span>የአድሚን ጠቅላይ መቆጣጠሪያ ፖርታል (Super Admin Hub)</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            ሁሉንም ሌሎች ገጾች (ዲን፣ ሪጅስተራል፣ መምህራን እና ተማሪዎች) ሙሉ በሙሉ የመቆጣጠርና የማስተዳደር ስልጣን
          </p>
        </div>

        {/* Lock Switch */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
            <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              {systemLocked ? <Lock className="w-4 h-4 text-rose-600" /> : <Unlock className="w-4 h-4 text-emerald-600" />}
              <span>የጥገና ሁነታ:</span>
            </div>
            <button
              onClick={onToggleLock}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer ${
                systemLocked
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {systemLocked ? 'ተቆልፏል' : 'ክፍት ነው'}
            </button>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={onToggleGradePublication}
              className={`px-3.5 py-1.5 text-xs font-extrabold rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer ${
                gradePublished
                  ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                  : 'bg-amber-500 hover:bg-amber-600 text-slate-950'
              }`}
            >
              {gradePublished ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                  <span>🌐 ለሁሉም አሳይ (Release All)</span>
                </>
              ) : (
                <>
                  <EyeOff className="w-4 h-4 text-slate-950" />
                  <span>🔒 ለሁሉም እገድ (Hold All)</span>
                </>
              )}
            </button>

            {onToggleStudentPdfPrint && (
              <button
                type="button"
                onClick={onToggleStudentPdfPrint}
                className={`px-3.5 py-1.5 text-xs font-extrabold rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer ${
                  studentPdfPrintAllowed
                    ? 'bg-indigo-700 hover:bg-indigo-800 text-white'
                    : 'bg-slate-700 hover:bg-slate-800 text-amber-300'
                }`}
                title="የተማሪዎችን የፒዲኤፍ ማተም ሁነታ ያብሩ/ያጥፉ"
              >
                {studentPdfPrintAllowed ? (
                  <>
                    <Printer className="w-4 h-4 text-amber-300" />
                    <span>🖨️ ፒዲኤፍ ማተም ተፈቅዷል</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 text-amber-400" />
                    <span>🚫 ፒዲኤፍ ማተም ታግዷል</span>
                  </>
                )}
              </button>
            )}

            {onOpenReleaseManager && (
              <button
                type="button"
                onClick={onOpenReleaseManager}
                className="bg-indigo-700 hover:bg-indigo-800 text-white font-extrabold text-xs px-3.5 py-1.5 rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                title="በተማሪዎች መርጦ ውጤትና ትራንስክሪፕት መፍቀጃና ማገጃ"
              >
                <ShieldAlert className="w-4 h-4 text-amber-300" />
                <span>🔒 በልዩነት መርጦ መፍቀድ/ማገድ</span>
              </button>
            )}

            {onOpenArchiveModal && (
              <button
                type="button"
                onClick={onOpenArchiveModal}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs px-3.5 py-1.5 rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                title="የቀደሙ ሥራዎችና ማህደር መፈለጊያ ማዕከል"
              >
                <History className="w-4 h-4 text-slate-950" />
                <span>🔍 የቀደሙ ሥራዎችና ማህደር</span>
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

      {/* Executive Colorful Stat Cards (Clean and aesthetic) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-emerald-800 to-teal-900 text-white rounded-3xl p-5 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold text-emerald-200 uppercase tracking-wider">የተመዘገቡ ተማሪዎች</p>
              <h3 className="text-2xl sm:text-3xl font-black font-mono text-white mt-1">{students.length}</h3>
              <p className="text-[11px] text-emerald-300 mt-1">ዲፕሎማና ድግሪ ፕሮግራሞች</p>
            </div>
            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-xs">
              <Users className="w-6 h-6 text-emerald-300" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-700 to-orange-900 text-white rounded-3xl p-5 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold text-amber-200 uppercase tracking-wider">መምህራን በቁልፍ የሚገቡ</p>
              <h3 className="text-2xl sm:text-3xl font-black font-mono text-white mt-1">
                {teachers.filter((t) => !t.includes('—')).length}
              </h3>
              <p className="text-[11px] text-amber-200 mt-1">በየግል ሚስጥር ቁልፍ ብቻ</p>
            </div>
            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-xs">
              <GraduationCap className="w-6 h-6 text-amber-300" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-800 to-slate-900 text-white rounded-3xl p-5 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold text-indigo-200 uppercase tracking-wider">የትምህርት ዓይነቶች (Courses)</p>
              <h3 className="text-2xl sm:text-3xl font-black font-mono text-white mt-1">{courses.length}</h3>
              <p className="text-[11px] text-indigo-300 mt-1">{currentYear} ዓ.ም ({currentSemester}ኛ ሴሚስተር)</p>
            </div>
            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-xs">
              <BookOpen className="w-6 h-6 text-indigo-300" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-cyan-800 to-blue-950 text-white rounded-3xl p-5 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold text-cyan-200 uppercase tracking-wider">የደህንነትና የመረጃ ሁኔታ</p>
              <h3 className="text-lg sm:text-xl font-black text-white mt-1.5 flex items-center gap-1.5">
                {systemLocked ? 'ጥገና ሁነታ' : 'ቀጥታ ስራ ላይ'}
              </h3>
              <p className="text-[11px] text-cyan-300 mt-1">
                ውጤት: {gradePublished ? 'ይፋ ሆኗል' : 'ተሰውሯል'}
              </p>
            </div>
            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-xs">
              <Shield className="w-6 h-6 text-cyan-300" />
            </div>
          </div>
        </div>
      </div>

      {/* Admin Tabs */}
      <div className="flex border-b border-slate-200 gap-2 flex-wrap">
        <button
          onClick={() => setAdminTab('academic_calendar')}
          className={`py-2.5 px-4 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            adminTab === 'academic_calendar'
              ? 'border-emerald-700 text-emerald-800 bg-white shadow-xs'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4 text-emerald-700" />
          <span>የትምህርት ዘመን መወሰኛ (2019–2030 ዓ.ም)</span>
        </button>

        <button
          onClick={() => setAdminTab('graduation')}
          className={`py-2.5 px-4 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            adminTab === 'graduation'
              ? 'border-emerald-700 text-emerald-800 bg-white shadow-xs'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Award className="w-4 h-4 text-amber-500" />
          <span>የተማራቂዎች ማረጋገጫና ማህደር</span>
        </button>

        <button
          onClick={() => setAdminTab('security')}
          className={`py-2.5 px-4 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            adminTab === 'security'
              ? 'border-emerald-700 text-emerald-800 bg-white shadow-xs'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Key className="w-4 h-4 text-amber-500" />
          <span>የደህንነትና የመግቢያ ቁልፎች</span>
        </button>

        <button
          onClick={() => setAdminTab('teachers')}
          className={`py-2.5 px-4 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            adminTab === 'teachers'
              ? 'border-emerald-700 text-emerald-800 bg-white shadow-xs'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <GraduationCap className="w-4 h-4 text-amber-600" />
          <span>የመምህራን ቁልፎችና መቆጣጠሪያ ({teachers.filter((t) => !t.includes('—')).length})</span>
        </button>

        <button
          onClick={() => setAdminTab('courses')}
          className={`py-2.5 px-4 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            adminTab === 'courses'
              ? 'border-emerald-700 text-emerald-800 bg-white shadow-xs'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4 text-indigo-600" />
          <span>የትምህርት ሰሌዳና መምህራን ({courses.length})</span>
        </button>

        <button
          onClick={() => setAdminTab('students')}
          className={`py-2.5 px-4 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            adminTab === 'students'
              ? 'border-emerald-700 text-emerald-800 bg-white shadow-xs'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4 text-emerald-700" />
          <span>የተማሪዎች ማህደርና ቁልፎች ({students.length})</span>
        </button>

        <button
          onClick={() => setAdminTab('analytics')}
          className={`py-2.5 px-4 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            adminTab === 'analytics'
              ? 'border-purple-700 text-purple-900 bg-white shadow-xs'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-purple-600" />
          <span>የመረጃ ትንተና እና ግራፍ (Charts)</span>
        </button>

        <button
          onClick={() => setAdminTab('official_signatures')}
          className={`py-2.5 px-4 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            adminTab === 'official_signatures'
              ? 'border-emerald-700 text-emerald-800 bg-white shadow-xs'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Award className="w-4 h-4 text-indigo-600" />
          <span>ይፋዊ ማኅተምና ፊርማ</span>
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
                  <span>የትምህርት ዘመን መወሰኛና አስተዳደር (Academic Calendar Control)</span>
                </h3>
                <span className="bg-amber-400/20 text-amber-300 border border-amber-400/40 text-xs px-2.5 py-0.5 rounded-full font-bold">
                  🇪🇹 እንደ ኢትዮጵያ ዘመን አቆጣጠር (ዓ.ም)
                </span>
              </div>
              <p className="text-xs sm:text-sm text-emerald-100/90 mt-1 max-w-2xl">
                የትምህርት ዘመን መወሰን የዋና አድሚን ኃላፊነት ሲሆን፣ ከ2019 እስከ 2030 ዓ.ም ተዘጋጅቷል። አስፈላጊ ሲሆን አዳዲስ ዓመታት መጨመር ይቻላል። በእያንዳንዱ ዓመት 1ኛ እና 2ኛ ሴሚስተር ይገኛሉ።
              </p>
            </div>

            <button
              onClick={() => setShowAddYearModal(true)}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>አዲስ የትምህርት ዘመን ጨምር</span>
            </button>
          </div>

          {/* Active Term Selector Card */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6">
            <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-700" />
              <span>በሲስተሙ ላይ በሥራ ላይ የዋለ (ወቅታዊ) የትምህርት ዘመንና ሴሚስተር</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200 space-y-2">
                <label className="block text-xs font-bold text-emerald-950">
                  ወቅታዊ የትምህርት ዘመን (Active Academic Year):
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={currentYear}
                    onChange={(e) => onYearChange?.(e.target.value)}
                    className="w-full p-2.5 text-sm font-bold border rounded-xl bg-white border-emerald-300 text-emerald-950 focus:ring-2 focus:ring-emerald-700 cursor-pointer shadow-xs"
                  >
                    {availableYears.map((y) => (
                      <option key={y} value={y}>
                        {y} ዓ.ም (እንደ ኢትዮጵያ ዘመን አቆጣጠር)
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-[11px] text-emerald-800">
                  የተመረጠው የትምህርት ዘመን በሁሉም መምህራን፣ ዲን፣ ሪጅስተራልና ተማሪዎች ገጽ ላይ በቀጥታ ይሰራል
                </p>
              </div>

              <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200 space-y-2">
                <label className="block text-xs font-bold text-amber-950">
                  ወቅታዊ ሴሚስተር (Active Semester):
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={currentSemester}
                    onChange={(e) => onSemesterChange?.(e.target.value)}
                    className="w-full p-2.5 text-sm font-bold border rounded-xl bg-white border-amber-300 text-amber-950 focus:ring-2 focus:ring-amber-500 cursor-pointer shadow-xs"
                  >
                    <option value="1">1ኛ ሴሚስተር (Semester 1)</option>
                    <option value="2">2ኛ ሴሚስተር (Semester 2)</option>
                    <option value="ALL">ሁሉም ሴሚስተሮች (All Semesters)</option>
                  </select>
                </div>
                <p className="text-[11px] text-amber-800">
                  በእያንዳንዱ የትምህርት ዘመን 1ኛ ሴሚስተር እና 2ኛ ሴሚስተር ይገኛሉ
                </p>
              </div>
            </div>
          </div>

          {/* Academic Policy Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs uppercase tracking-wider">
                <Award className="w-4 h-4 text-emerald-600" />
                <span>የዲፕሎማ ፕሮግራም (Diploma)</span>
              </div>
              <h5 className="font-extrabold text-slate-900 text-sm">በ2 ዓመት (4 ሴሚስተር)</h5>
              <p className="text-xs text-slate-600 leading-relaxed">
                የዲፕሎማ ተማሪዎች በ2 ዓመት ማለትም በአራት ሴሚስተር ይመረቃሉ። በዚህ ዓመት 10 የዲፕሎማ ተማሪዎች በ2ኛ ዓመት ላይ እየተማሩ የሚገኙ ተማራቂዎች ናቸው።
              </p>
              <div className="pt-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg">
                1ኛ ዓመት (Sem 1 & 2) ➔ 2ኛ ዓመት (Sem 3 & 4) ➔ ምርቃት
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-indigo-800 font-bold text-xs uppercase tracking-wider">
                <Award className="w-4 h-4 text-indigo-600" />
                <span>የድግሪ ፕሮግራም (ቀድሞ ዲፕሎማ)</span>
              </div>
              <h5 className="font-extrabold text-slate-900 text-sm">በ2 ዓመት (4 ሴሚስተር)</h5>
              <p className="text-xs text-slate-600 leading-relaxed">
                ቀድሞ የመጽሐፍ ቅዱስ ዲፕሎማ ያላቸው የድግሪ ተማሪዎች የትምህርት ዝግጅታቸው ታይቶ በ2 ዓመት (4 ሴሚስተር) ይመረቃሉ።
              </p>
              <div className="pt-1 text-[11px] font-bold text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded-lg">
                የቅድመ-ዲፕሎማ ክሬዲት ታሳቢ ➔ 4 ሴሚስተር ➔ ምርቃት
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-purple-800 font-bold text-xs uppercase tracking-wider">
                <Award className="w-4 h-4 text-purple-600" />
                <span>መደበኛ ድግሪ (Regular Degree)</span>
              </div>
              <h5 className="font-extrabold text-slate-900 text-sm">በ3 ዓመት (5 ወይም 6 ሴሚስተር)</h5>
              <p className="text-xs text-slate-600 leading-relaxed">
                መደበኛ የድግሪ ተማሪ እንደየትምህርት ዝግጅታቸው በ3 ዓመት (በ5 ሴሚስተር ወይም ዝቅተኛ ውጤት ካመጡ በ6 ሴሚስተር) ይመረቃሉ።
              </p>
              <div className="pt-1 text-[11px] font-bold text-purple-800 bg-purple-50 px-2.5 py-1 rounded-lg">
                1ኛ ዓመት ➔ 2ኛ ዓመት ➔ 3ኛ ዓመት (5-6 ሴሚስተር)
              </div>
            </div>
          </div>

          {/* All Configured Years Matrix (2019 - 2030 ዓ.ም እና ተጨማሪ) */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b pb-3">
              <div>
                <h4 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-emerald-700" />
                  <span>የትምህርት ዘመናት ዝርዝር ሰሌዳ (ከ2019 እስከ 2030 ዓ.ም)</span>
                </h4>
                <p className="text-xs text-slate-500">
                  ሁሉንም ዓመታት መመልከት፣ ወቅታዊ ማድረግ ወይም አዲስ የትምህርት ዘመን መጨመር
                </p>
              </div>

              <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-xl font-bold">
                ጠቅላላ ዓመታት: {availableYears.length}
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
                        {isActive ? 'የነቃ (Active)' : 'ኢ.ዘ.አ'}
                      </span>
                    </div>

                    <h5 className="font-extrabold text-base text-slate-900 font-mono">
                      {yr} ዓ.ም
                    </h5>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      1ኛ እና 2ኛ ሴሚስተር
                    </p>

                    {!isActive && (
                      <button
                        type="button"
                        onClick={() => onYearChange?.(yr)}
                        className="mt-2.5 w-full text-[11px] font-bold bg-white hover:bg-emerald-600 hover:text-white text-emerald-800 border border-emerald-300 py-1 rounded-lg transition-colors cursor-pointer shadow-2xs"
                      >
                        ወቅታዊ አድርግ
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
                <span>የስርዓቱ ዋና ተጠቃሚዎች የይለፍ ቃል</span>
              </h3>
              <span className="text-xs text-slate-400 font-medium">የተጠቃሚ መለያዎች</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[11px] rounded-lg">
                  <tr>
                    <th className="p-3">ተጠቃሚ / ሚና</th>
                    <th className="p-3">የመግቢያ ስም</th>
                    <th className="p-3">የአሁኑ ቁልፍ</th>
                    <th className="p-3 text-right">ተግባር</th>
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
                          <span>ቁልፍ ቀይር</span>
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
                  የመረጃ ጥበቃና አስተዳደር (Local Backup & Data Management)
                </h4>
                <div className="flex flex-wrap gap-2.5">
                  <button
                    onClick={onExportData}
                    className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs px-3.5 py-2 rounded-xl font-bold shadow-sm transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-emerald-400" />
                    <span>መረጃ ወደ ኮምፒውተር አስቀምጥ (Export JSON)</span>
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs px-3.5 py-2 rounded-xl font-bold border border-slate-300 transition-colors cursor-pointer"
                  >
                    <Upload className="w-4 h-4 text-indigo-600" />
                    <span>የተቀመጠ መረጃ አንብብ (Import JSON)</span>
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
                        if (window.confirm('ማስጠንቀቂያ፦ ሁሉንም የውጤት ማስገቢያ ቦታዎች ባዶ ማድረግ ይፈልጋሉ? ይህ መምህራን አዲስ ውጤት ከባዶ እንዲያስገቡ ያደርጋል።')) {
                          onClearAllGrades();
                        }
                      }}
                      className="inline-flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs px-3.5 py-2 rounded-xl font-bold border border-amber-300 transition-colors cursor-pointer"
                      title="ሁሉንም የውጤት ማስገቢያዎች ባዶ አድርግ"
                    >
                      <Trash2 className="w-4 h-4 text-amber-700" />
                      <span>ውጤቶችን ባዶ አድርግ (Clear Grades)</span>
                    </button>
                  )}

                  <button
                    onClick={onResetDefaults}
                    className="inline-flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs px-3.5 py-2 rounded-xl font-bold border border-rose-200 transition-colors ml-auto cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4 text-rose-600" />
                    <span>ወደ ነባሪ መልስ (Reset Defaults)</span>
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
                        <span>Firebase Cloud Firestore ዳታቤዝ</span>
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
                            ? '● ተገናኝቷል (Connected)'
                            : isTestingFirebase
                            ? '◌ በመፈተሽ ላይ...'
                            : '● አልተገናኘም (Not Connected)'}
                        </span>
                      </h5>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {firebaseReport?.message || 'ሁሉንም የተማሪዎች፣ ኮርሶች እና ውጤቶች መረጃ ወደ Cloud Firestore ያመሳስላል'}
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
                      <span>{isTestingFirebase ? 'በመፈተሽ ላይ...' : 'ግንኙነት ፈትሽ'}</span>
                    </button>

                    <button
                      onClick={onOpenFirebaseModal}
                      className="inline-flex items-center gap-1 bg-emerald-700 hover:bg-emerald-800 text-white text-xs px-3 py-1.5 rounded-xl font-bold shadow-xs transition-colors cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>ዝርዝርና መፍትሔዎች</span>
                    </button>

                    {firebaseReport?.status === 'connected' && (
                      <button
                        onClick={onPushAllToFirebase}
                        className="inline-flex items-center gap-1 bg-indigo-700 hover:bg-indigo-800 text-white text-xs px-3 py-1.5 rounded-xl font-bold shadow-xs transition-colors cursor-pointer"
                      >
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>ወደ Cloud ላክ</span>
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
                        alt="የቤተ ክርስቲያን አርማ"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-amber-600" />
                        <span>የቤተ ክርስቲያኑ ይፋዊ አርማና ሎጎ (Church Official Logo)</span>
                      </h5>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        ይህ ሎጎ በዋናው አርዕስት (Header)፣ በመግቢያ ገጽ (Login) እና በሁሉም ተማሪዎች ትራንስክሪፕት ላይ ይታያል።
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
                      <span>አዲስ ሎጎ ጫን (Upload Logo)</span>
                    </button>

                    <button
                      onClick={() => onUpdateChurchLogo(DEFAULT_CHURCH_LOGO)}
                      className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs px-3 py-2 rounded-xl font-bold border border-slate-300 transition-colors cursor-pointer"
                      title="ወደ መጀመሪያው ይፋዊ አርማ መልስ"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                      <span>ነባሪ አርማ (Reset)</span>
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
                  ይፋዊ የ13-ደረጃ ውጤት መስፈርት
                </h3>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                Official 13-Tier Grading Scale
              </p>

              <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-80 overflow-y-auto">
                <table className="w-full text-xs text-slate-700">
                  <thead className="bg-slate-100 sticky top-0 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2 text-left">የውጤት መጠን (%)</th>
                      <th className="p-2 text-center">ፊደል</th>
                      <th className="p-2 text-right">ነጥብ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px]">
                    {OFFICIAL_GRADING_SCALE.map((g) => (
                      <tr key={g.letter} className="hover:bg-slate-50">
                        <td className="p-2 font-medium">
                          {g.min === 97 ? '97% – 100%' : g.min === 0 ? '0% – 59%' : `${g.min}% – ${g.max}%`}
                        </td>
                        <td className="p-2 text-center font-black text-emerald-800">{g.letter}</td>
                        <td className="p-2 text-right font-bold font-mono">{g.points.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-4 p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-900">
              <p className="font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 flex-shrink-0" />
                <span>አድሚን ሁሉንም የተማሪ ውጤቶች፣ ኮርሶችና ቁልፎች የመቆጣጠር ሙሉ ስልጣን አለው።</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB: Teachers Passkeys & Super Control */}
      {adminTab === 'teachers' && (() => {
        const validTeachers = teachers.filter((t) => !t.includes('—'));
        const lockedCount = validTeachers.filter((t) => userPasswords['_locked_' + t] === 'true').length;
        const activeCount = validTeachers.length - lockedCount;
        const totalAssignedCourses = courses.filter((c) => validTeachers.includes(c.teacher)).length;

        const filteredTeachers = validTeachers.filter((t) => {
          const teacherCourses = courses.filter((c) => c.teacher === t);
          const matchesSearch =
            t.toLowerCase().includes(teacherSearchTerm.toLowerCase()) ||
            teacherCourses.some((c) => c.name.toLowerCase().includes(teacherSearchTerm.toLowerCase()));
          const isLocked = userPasswords['_locked_' + t] === 'true';
          if (teacherFilter === 'active') return matchesSearch && !isLocked;
          if (teacherFilter === 'locked') return matchesSearch && isLocked;
          return matchesSearch;
        });

        const handleCopyKey = (teacher: string, key: string) => {
          navigator.clipboard.writeText(key);
          setCopiedTeacher(teacher);
          showNotify?.(`የ${teacher} የመግቢያ ቁልፍ (${key}) ተቀድቷል!`, 'success');
          setTimeout(() => setCopiedTeacher(null), 2000);
        };

        const handleCopyAllKeys = () => {
          const lines = [
            `የብርብር ከተማ ቃለ ሕይወት መጽሐፍ ቅዱስ ትምህርት ቤት`,
            `የመምህራን ይፋዊ የመግቢያ ቁልፎች ዝርዝር:`,
            `----------------------------------------`,
            ...validTeachers.map((t, i) => {
              const k = userPasswords[t] || generateTeacherKey(t, i + 1);
              const isLocked = userPasswords['_locked_' + t] === 'true';
              const cList = courses.filter((c) => c.teacher === t).map((c) => c.name).join(', ') || 'ኮርስ አልተመደበም';
              return `${i + 1}. ${t}\n   • የመግቢያ ቁልፍ: ${k}\n   • ሁኔታ: ${isLocked ? 'የታገደ' : 'ንቁ / የተፈቀደ'}\n   • የሚያስተምሩት: ${cList}`;
            })
          ];
          navigator.clipboard.writeText(lines.join('\n\n'));
          setCopiedAll(true);
          showNotify?.('የሁሉም መምህራን የመግቢያ ቁልፎች ዝርዝር በሙሉ ተቀድቷል!', 'success');
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
            <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-900 text-white rounded-3xl p-6 sm:p-7 shadow-lg border border-emerald-800/60 relative overflow-hidden">
              <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5 relative z-10">
                <div className="space-y-1.5 max-w-2xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-[11px] font-bold border border-amber-400/30">
                    <Shield className="w-3.5 h-3.5" />
                    <span>የዋና አድሚን ጠቅላይ መቆጣጠሪያ</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
                    <GraduationCap className="w-7 h-7 text-amber-400" />
                    <span>የመምህራን የመግቢያ ቁልፎችና ሙሉ አስተዳደር</span>
                  </h3>
                  <p className="text-xs sm:text-sm text-emerald-200/90 leading-relaxed">
                    ለመምህራን ሁሉ የተዘጋጁ የመግቢያ ቁልፎችን የማመንጨት፣ የመቀየር፣ የመቆጣጠርና የመግቢያ ፍቃድን የማገድ ሙሉ ስልጣን በዋና አድሚን እጅ ብቻ ነው ያለው።
                  </p>
                </div>

                {/* Batch Action Buttons */}
                <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
                  <button
                    onClick={() => {
                      if (window.confirm('እርግጠኛ ነዎት ለሁሉም መምህራን አዲስ ጠንካራ የመግቢያ ቁልፎች ማመንጨት ይፈልጋሉ? ነባሮቹ ቁልፎች በአዲሶቹ ይተካሉ።')) {
                        onBatchGenerateTeacherKeys?.();
                      }
                    }}
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-slate-950" />
                    <span>ለሁሉም መምህራን አዲስ ቁልፍ አመንጭ</span>
                  </button>

                  <button
                    onClick={() => setShowPrintCredentialsModal(true)}
                    className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl border border-white/20 backdrop-blur-xs transition-colors cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-emerald-300" />
                    <span>የቁልፍ ሰነድ አትም</span>
                  </button>

                  <button
                    onClick={handleCopyAllKeys}
                    className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl border border-white/20 backdrop-blur-xs transition-colors cursor-pointer"
                  >
                    {copiedAll ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-amber-300" />}
                    <span>{copiedAll ? 'ተቀድቷል!' : 'ሁሉንም ቁልፎች ኮፒ አድርግ'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setNewTeacherName('');
                      setNewTeacherCustomKey('');
                      setShowAddTeacherModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl shadow-sm transition-colors cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>አዲስ መምህር ጨምር</span>
                  </button>
                </div>
              </div>

              {/* Stats Counters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/10">
                <div className="bg-white/10 rounded-2xl p-3 border border-white/10">
                  <span className="text-[11px] text-emerald-300 block">ጠቅላላ መምህራን</span>
                  <span className="text-xl font-black text-white">{validTeachers.length}</span>
                </div>
                <div className="bg-white/10 rounded-2xl p-3 border border-white/10">
                  <span className="text-[11px] text-emerald-300 block">የተፈቀደላቸው (Active)</span>
                  <span className="text-xl font-black text-emerald-400">{activeCount}</span>
                </div>
                <div className="bg-white/10 rounded-2xl p-3 border border-white/10">
                  <span className="text-[11px] text-rose-300 block">የታገዱ (Locked)</span>
                  <span className="text-xl font-black text-rose-400">{lockedCount}</span>
                </div>
                <div className="bg-white/10 rounded-2xl p-3 border border-white/10">
                  <span className="text-[11px] text-amber-300 block">የተመደቡ ኮርሶች</span>
                  <span className="text-xl font-black text-amber-300">{totalAssignedCourses}</span>
                </div>
              </div>
            </div>

            {/* Filter, Search & View Controls */}
            <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-sm border border-slate-200/80 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="text"
                  value={teacherSearchTerm}
                  onChange={(e) => setTeacherSearchTerm(e.target.value)}
                  placeholder="የመምህር ስም ወይም የኮርስ ስም ፈልግ..."
                  className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700 font-medium"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                  <button
                    onClick={() => setTeacherFilter('all')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      teacherFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    ሁሉም ({validTeachers.length})
                  </button>
                  <button
                    onClick={() => setTeacherFilter('active')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      teacherFilter === 'active' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    የተፈቀደላቸው ({activeCount})
                  </button>
                  <button
                    onClick={() => setTeacherFilter('locked')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      teacherFilter === 'locked' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    የታገዱ ({lockedCount})
                  </button>
                </div>

                <button
                  onClick={() => setShowAllKeys((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 transition-colors cursor-pointer"
                >
                  {showAllKeys ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showAllKeys ? 'ቁልፎችን ደብቅ' : 'ሁሉንም ቁልፎች አሳይ'}</span>
                </button>
              </div>
            </div>

            {/* Teachers Master Table */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[11px] border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">ተ.ቁ</th>
                      <th className="p-3.5">የመምህር ስም</th>
                      <th className="p-3.5">የሚያስተምሯቸው ኮርሶች</th>
                      <th className="p-3.5">የመግቢያ ቁልፍ (Passkey)</th>
                      <th className="p-3.5">ሁኔታ (Status)</th>
                      <th className="p-3.5 text-right">የዋና አድሚን እርምጃዎች</th>
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
                                <span className="text-[10px] text-slate-400">የመግቢያ ስም: {teacher}</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-3.5">
                            {teacherCourses.length === 0 ? (
                              <span className="text-slate-400 italic text-[11px]">ኮርስ አልተመደበም</span>
                            ) : (
                              <div className="flex flex-wrap gap-1.5 max-w-xs">
                                {teacherCourses.map((c) => (
                                  <span
                                    key={c.id}
                                    className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/80"
                                    title={`${c.schedule} (${c.credits} Cr)`}
                                  >
                                    {c.name}
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
                                title={isKeyVisible ? 'ቁልፉን ደብቅ' : 'ቁልፉን አሳይ'}
                              >
                                {isKeyVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                onClick={() => handleCopyKey(teacher, teacherKey)}
                                className="p-1 rounded-lg hover:bg-slate-200/70 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                                title="ቁልፉን ኮፒ አድርግ"
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
                                title="አዲስ ፈጣን ቁልፍ አመንጭ"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                          <td className="p-3.5">
                            {isLocked ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                <Lock className="w-3 h-3" />
                                <span>የታገደ (Locked)</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>ንቁ / የተፈቀደ</span>
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-right space-x-1.5 space-x-reverse">
                            <button
                              onClick={() => onOpenPasswordModal(teacher, teacher)}
                              className="inline-flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-white text-[11px] px-2.5 py-1.5 rounded-lg font-bold shadow-xs transition-colors cursor-pointer"
                              title="ቁልፍ ቀይር"
                            >
                              <Key className="w-3 h-3" />
                              <span>ቁልፍ ቀይር</span>
                            </button>

                            <button
                              onClick={() => onToggleTeacherLock?.(teacher)}
                              className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg font-bold shadow-xs transition-colors cursor-pointer ${
                                isLocked
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                  : 'bg-rose-600 hover:bg-rose-700 text-white'
                              }`}
                              title={isLocked ? 'መግባት ፍቀድ' : 'መግባት አግድ'}
                            >
                              {isLocked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                              <span>{isLocked ? 'ፍቀድ' : 'አግድ'}</span>
                            </button>

                            {onDeleteTeacher && (
                              <button
                                onClick={() => onDeleteTeacher(teacher)}
                                className="inline-flex items-center p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="መምህሩን ሰርዝ"
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
                showNotify?.(newTeacher === 'አልተመደበም (—)' ? 'የመምህር ምደባ ተነስቷል!' : `መምህር ${newTeacher} ተመድቧል!`, 'success');
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
                  <GraduationCap className="w-5 h-5 text-emerald-800" />
                  <span>የመምህራን ውጤት መቆጣጠሪያ፣ ኤክሴል መጫኛ/ማውረጃ እና ፒዲኤፍ (Grade Management)</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  የትምህርት ዘመን {currentYear} ዓ.ም ({currentSemester}ኛ ሴሚስተር) — መምህር: <span className="font-bold text-slate-700">{adminSelectedCourse?.teacher}</span> | የተመዘገቡ: <span className="font-bold text-slate-700">{adminEnrolledStudents.length}</span>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={adminSelectedCourseId}
                  onChange={(e) => setAdminSelectedCourseId(e.target.value)}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-emerald-700 cursor-pointer"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      [{c.program}] {c.name} — {c.teacher}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => setIsExcelUploadOpen(true)}
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border border-emerald-400 text-xs px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="ውጤት ከማይክሮሶፍት ኤክሴል (.xlsx / .csv) ለመጫን"
                >
                  <Upload className="w-3.5 h-3.5 text-emerald-700" />
                  <span>ኤክሴል ጫን (Upload)</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportAdminCourseExcel}
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border border-emerald-400 text-xs px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="የዚህን ኮርስ ውጤት በኤክሴል (.xlsx) ለማውረድ"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                  <span>ኤክሴል አውርድ (.xlsx)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPdfModalOpen(true)}
                  className="bg-cyan-50 hover:bg-cyan-100 text-cyan-950 border border-cyan-300 text-xs px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="ይፋዊ የውጤት ሰነድ ለማተም ወይም በፒዲኤፍ (PDF) ለማስቀመጥ"
                >
                  <Printer className="w-3.5 h-3.5 text-cyan-700" />
                  <span>ይፋዊ ሰነድ (PDF)</span>
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
                    showNotify?.(`የትምህርት ዘመን ${currentYear} ሰሚስተር ${currentSemester} ጠቅላላ ውጤት ኤክሴል ተዘጋጅቶ ወርዷል!`, 'success');
                  }}

                  className="bg-indigo-50 hover:bg-indigo-100 text-indigo-950 border border-indigo-300 text-xs px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="የሁሉም ተማሪዎች የሰሚስተሩን ጠቅላላ ውጤት ዝርዝር በኤክሴል (.xlsx) ለማውረድ"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-700" />
                  <span>ጠቅላላ ውጤት ኤክሴል</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsMasterPdfOpen(true)}
                  className="bg-purple-50 hover:bg-purple-100 text-purple-950 border border-purple-300 text-xs px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="የሁሉንም ተማሪዎች ጠቅላላ የሰሚስተር ውጤት ሉህ (Master Sheet) በፒዲኤፍ ለማየትና ለማተም"
                >
                  <Printer className="w-3.5 h-3.5 text-purple-700" />
                  <span>ጠቅላላ ሰነድ (PDF)</span>
                </button>

                {onSaveGrades && (
                  <button
                    type="button"
                    onClick={handleSaveAdminGrades}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>ለውጦችን መዝግብ</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onSwitchView('TEACHER')}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs px-3 py-1.5 rounded-xl font-bold shadow-2xs cursor-pointer flex items-center gap-1"
                  title="በመምህራን የውጤት መሙያ ገጽ ሙሉ በሙሉ ክፈት"
                >
                  <span>በመምህራን ገጽ ክፈት</span>
                </button>
              </div>
            </div>

            {(() => {
              if (!adminSelectedCourse) {
                return <div className="text-xs text-slate-500 py-4 text-center">ኮርስ ይምረጡ።</div>;
              }

              const criteria = getCourseAssessmentItems(adminSelectedCourse);
              const totalWeight = criteria.reduce((sum, it) => sum + (Number(it.max) || 0), 0);

              return (
                <div className="overflow-x-auto max-h-96 overflow-y-auto border border-slate-200 rounded-2xl">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-100/90 sticky top-0 font-bold uppercase text-[10px] z-10">
                      <tr>
                        <th className="p-2.5 bg-slate-100">ID</th>
                        <th className="p-2.5 bg-slate-100">የተማሪ ስም</th>
                        {criteria.map((it, idx) => {
                          const color = getCriterionColor(idx);
                          return (
                            <th
                              key={it.id}
                              className={`p-2.5 text-center min-w-[75px] ${color.headerBg} border-b-2 ${color.headerBorder}`}
                            >
                              <span className="block font-bold truncate max-w-[80px]">{it.label}</span>
                              <span className="block text-[9px] font-mono font-black">({it.max}%)</span>
                            </th>
                          );
                        })}
                        <th className="p-2.5 text-center bg-emerald-100/70 text-emerald-950 border-b-2 border-emerald-500 font-black">
                          ድምር ({totalWeight}%)
                        </th>
                        <th className="p-2.5 text-center bg-amber-100/70 text-amber-950 border-b-2 border-amber-500 font-black">
                          ፊደል
                        </th>
                        <th className="p-2.5 text-center bg-slate-100 text-slate-800">ነጥብ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {adminEnrolledStudents.map((s) => {
                        const g = adminLocalGrades[s.uid] || { p1: 0, p2: 0, mid: 0, final: 0, att: 0 };
                        const eff = getEffectiveGradeValues(g, criteria);

                        return (
                          <tr key={s.uid} className="hover:bg-slate-50 transition-colors">
                            <td className="p-2.5 font-mono font-bold text-slate-800">{s.id}</td>
                            <td className="p-2.5 font-bold text-slate-900">{s.name}</td>
                            {criteria.map((it, idx) => {
                              const score = getCriterionScore(g, it.id, idx);
                              const color = getCriterionColor(idx);
                              return (
                                <td key={it.id} className="p-1.5 text-center">
                                  <input
                                    type="number"
                                    min="0"
                                    max={it.max}
                                    step="0.5"
                                    placeholder="—"
                                    value={score === 0 ? '' : score}
                                    onChange={(e) =>
                                      handleAdminScoreChange(s.uid, it.id, e.target.value, it.max, idx)
                                    }
                                    className={`w-14 px-1 py-0.5 text-center font-mono text-xs border ${color.border} rounded bg-white placeholder:text-slate-300 shadow-2xs`}
                                    title={`${it.label} (ከ ${it.max}%)`}
                                  />
                                </td>
                              );
                            })}
                            <td className="p-2.5 text-center font-black font-mono text-emerald-800">
                              {eff.hasAny ? eff.total : '—'}
                            </td>
                            <td className="p-2.5 text-center font-black text-amber-700">
                              {eff.hasAny ? eff.letter : '—'}
                            </td>
                            <td className="p-2.5 text-center font-bold font-mono">
                              {eff.hasAny ? eff.points.toFixed(2) : '—'}
                            </td>
                          </tr>
                        );
                      })}
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
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-700" />
                  <span>የተማሪዎች ማህደር፣ ደረጃ፣ ውጤት እና የግል መግቢያ ቁልፎች ({students.length})</span>
                </h3>
                <p className="text-xs text-slate-500">
                  ሁሉም ተማሪዎች ከመለያ ኮድ ውጪ የሆነ የግል መግቢያ ቁልፍ (ST-XXXX) አላቸው። ስሞች በአማርኛ ፊደል ተራ ተደርድረዋል።
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowStudentCredentialsModal(true)}
                  className="inline-flex items-center gap-1.5 bg-gradient-to-r from-emerald-800 to-emerald-700 hover:from-emerald-900 hover:to-emerald-800 text-white text-xs px-3.5 py-2 rounded-xl font-bold shadow-sm transition-all cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-amber-300" />
                  <span>የተማሪዎች መግቢያ ቁልፍ ሰነድ (Print/Export)</span>
                </button>

                <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl font-bold">
                  የተጣሩ: {sortedFilteredStudents.length} / {students.length}
                </span>
              </div>
            </div>

            {/* Filters Toolbar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="በስም ወይም በመለያ ቁጥር ፈልግ..."
                  value={adminStudentSearch}
                  onChange={(e) => setAdminStudentSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border rounded-xl bg-white border-slate-300 focus:ring-2 focus:ring-emerald-700"
                />
              </div>

              <select
                value={adminStudentProgFilter}
                onChange={(e) => setAdminStudentProgFilter(e.target.value as any)}
                className="p-1.5 text-xs font-semibold border rounded-xl bg-white border-slate-300 focus:ring-2 focus:ring-emerald-700 cursor-pointer"
              >
                <option value="ALL">ፕሮግራም: ሁሉም</option>
                <option value="Degree">ድግሪ (Degree)</option>
                <option value="Diploma">ዲፕሎማ (Diploma)</option>
              </select>

              <select
                value={adminStudentYearFilter}
                onChange={(e) => setAdminStudentYearFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                className="p-1.5 text-xs font-semibold border rounded-xl bg-white border-slate-300 focus:ring-2 focus:ring-emerald-700 cursor-pointer"
              >
                <option value="ALL">ደረጃ: ሁሉም ዓመታት</option>
                <option value={1}>1ኛ ዓመት (Year 1)</option>
                <option value={2}>2ኛ ዓመት (Year 2)</option>
                <option value={3}>3ኛ ዓመት (Year 3)</option>
              </select>

              <select
                value={adminStudentStatusFilter}
                onChange={(e) => setAdminStudentStatusFilter(e.target.value as any)}
                className="p-1.5 text-xs font-semibold border rounded-xl bg-white border-slate-300 focus:ring-2 focus:ring-emerald-700 cursor-pointer"
              >
                <option value="ALL">ሁኔታ: ሁሉም</option>
                <option value="ACTIVE">በመማር ላይ (Active)</option>
                <option value="CANDIDATE">ተማራቂ (Candidate)</option>
                <option value="GRADUATED">የተመረቀ (Graduated)</option>
              </select>
            </div>

            <div className="overflow-x-auto max-h-96 overflow-y-auto border rounded-2xl">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-100/90 sticky top-0 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-2.5">ተ.ቁ</th>
                    <th className="p-2.5">ID</th>
                    <th className="p-2.5">የተማሪ ስም (በፊደል ተራ)</th>
                    <th className="p-2.5">ጾታ</th>
                    <th className="p-2.5">ፕሮግራም</th>
                    <th className="p-2.5">ደረጃ / ዓመት</th>
                    <th className="p-2.5">የትምህርት መንገድ</th>
                    <th className="p-2.5">ሁኔታ</th>
                    <th className="p-2.5">የግል መግቢያ ቁልፍ (Passkey)</th>
                    <th className="p-2.5 text-right">ተግባር</th>
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
                        <td className="p-2.5 font-mono font-bold text-slate-800">{s.id}</td>
                        <td className="p-2.5">
                          <span className="font-bold text-slate-900 block">{s.name}</span>
                          <span className="text-[10px] text-slate-400">የገቡበት: {s.admissionYear || '2019'} ዓ.ም</span>
                        </td>
                        <td className="p-2.5 text-slate-600">{s.gender}</td>
                        <td className="p-2.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            s.program === 'Degree' ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {s.program}
                          </span>
                        </td>
                        <td className="p-2.5">
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                            s.currentStudyYear === 2 ? 'bg-amber-100 text-amber-950 border border-amber-300' : s.currentStudyYear === 3 ? 'bg-purple-100 text-purple-900' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {s.currentStudyYear ? `${s.currentStudyYear}ኛ ዓመት` : '1ኛ ዓመት'}
                          </span>
                        </td>
                        <td className="p-2.5 text-[11px] text-slate-600">
                          {s.program === 'Diploma' ? (
                            <span>2 ዓመት (4 ሴሚስተር)</span>
                          ) : s.degreeTrack === '2_YEAR' || s.priorDiploma ? (
                            <span className="font-bold text-indigo-700">2 ዓመት (ቅድመ ዲፕሎማ)</span>
                          ) : (
                            <span>3 ዓመት መደበኛ (5-6 ሴሚስተር)</span>
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
                            {s.graduationStatus === 'GRADUATED' ? 'የተመረቀ' : s.graduationStatus === 'CANDIDATE' ? 'ተማራቂ' : 'በመማር ላይ'}
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
                              title={isVisible ? 'ደብቅ' : 'አሳይ'}
                            >
                              {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(passkey);
                                setCopiedStudentUid(s.uid);
                                showNotify?.(`የ${s.name} መግቢያ ቁልፍ ተቀድቷል!`, 'success');
                                setTimeout(() => setCopiedStudentUid(null), 2000);
                              }}
                              className="p-1 text-slate-400 hover:text-emerald-700 cursor-pointer"
                              title="ቁልፍ ኮፒ አድርግ"
                            >
                              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                        <td className="p-2.5 text-right space-x-1 space-x-reverse whitespace-nowrap">
                          <button
                            onClick={() => onOpenPasswordModal(s.uid, s.name)}
                            className="bg-amber-500 hover:bg-amber-600 text-white text-[10px] px-2.5 py-1 rounded-lg font-bold cursor-pointer"
                            title="ቁልፍ ቀይር"
                          >
                            ቁልፍ ቀይር
                          </button>
                          <button
                            onClick={() => onSelectPrintTranscript(s)}
                            className="bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] px-2.5 py-1 rounded-lg font-bold cursor-pointer"
                            title="ትራንስክሪፕት"
                          >
                            ትራንስክሪፕት
                          </button>
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
                <h3 className="font-bold text-sm">አዲስ መምህር መመዝገቢያና ቁልፍ ማዘጋጃ</h3>
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
                  የመምህሩ ሙሉ ስም (ለምሳሌ፦ መ/ር ዮሐንስ ገብሬ)
                </label>
                <input
                  type="text"
                  value={newTeacherName}
                  onChange={(e) => setNewTeacherName(e.target.value)}
                  placeholder="የመምህር ስም ያስገቡ..."
                  required
                  className="w-full px-3.5 py-2.5 border rounded-xl bg-slate-50 border-slate-300 focus:ring-2 focus:ring-emerald-700 font-medium"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-bold text-slate-700">የመግቢያ ቁልፍ (Passkey)</label>
                  <button
                    type="button"
                    onClick={() => {
                      const sampleName = newTeacherName.trim() || 'TCH';
                      setNewTeacherCustomKey(generateTeacherKey(sampleName, teachers.length + 1));
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 hover:text-amber-800 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>ቁልፍ በራስ-ሰር አመንጭ</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={newTeacherCustomKey}
                  onChange={(e) => setNewTeacherCustomKey(e.target.value)}
                  placeholder="ባዶ ቢተዉት ሲስተሙ ራሱ ጠንካራ ቁልፍ ያዘጋጃል (ለምሳሌ፦ BK-YOH-4921)"
                  className="w-full px-3.5 py-2.5 border rounded-xl bg-slate-50 border-slate-300 focus:ring-2 focus:ring-emerald-700 font-mono tracking-wider font-bold text-emerald-800"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
                <strong>ማስታወሻ፦</strong> ይህ የመግቢያ ቁልፍ መምህሩ ወደ ሲስተሙ ገብተው ውጤት ለመሙላትና ኮርሳቸውን ለመምራት የሚያስችላቸው የግል ቁልፍ ነው።
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddTeacherModal(false)}
                  className="px-4 py-2 border rounded-xl hover:bg-slate-100 font-semibold text-slate-700 cursor-pointer"
                >
                  ሰርዝ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>መምህሩንና ቁልፉን መዝግብ</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Official Printable Teacher Credentials Roster */}
      {showPrintCredentialsModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
            {/* Top Toolbar (No-Print) */}
            <div className="bg-emerald-950 text-white p-4 flex justify-between items-center no-print">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm">የመምህራን ይፋዊ የመግቢያ ቁልፎች ሰነድ (Print Preview)</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-sm transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>አትም (Print / Save PDF)</span>
                </button>
                <button
                  onClick={() => setShowPrintCredentialsModal(false)}
                  className="p-1.5 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Document Body */}
            <div className="p-8 overflow-y-auto print:p-0 space-y-6 text-slate-800 bg-white">
              {/* Church Letterhead */}
              <div className="text-center border-b-2 border-emerald-900 pb-5 space-y-2">
                <div className="flex justify-center mb-2">
                  <img
                    src={churchLogo || DEFAULT_CHURCH_LOGO}
                    alt="የቤተ ክርስቲያን አርማ"
                    className="h-16 w-auto object-contain"
                  />
                </div>
                <h1 className="text-lg font-black text-emerald-950 tracking-wide">
                  የብርብር ከተማ ቃለ ሕይወት ቤተ ክርስቲያን
                </h1>
                <h2 className="text-base font-bold text-slate-800">
                  የመጽሐፍ ቅዱስ ትምህርት ቤት ክፍል
                </h2>
                <div className="inline-block bg-emerald-50 text-emerald-950 px-4 py-1 rounded-full text-xs font-bold border border-emerald-200">
                  የመምህራን ይፋዊ የመግቢያ ቁልፎችና የኮርሶች ምደባ ሰነድ ({currentYear} ዓ.ም)
                </div>
                <p className="text-[11px] text-slate-500">
                  ሚስጥራዊ ሰነድ - በዋና አድሚን ብቻ ተዘጋጅቶ ለመምህራን የሚሰጥ
                </p>
              </div>

              {/* Roster Table */}
              <div className="border border-slate-300 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 font-bold uppercase text-[11px] border-b border-slate-300">
                    <tr>
                      <th className="p-2.5 border-r border-slate-300 w-12 text-center">ተ.ቁ</th>
                      <th className="p-2.5 border-r border-slate-300">የመምህሩ ሙሉ ስም</th>
                      <th className="p-2.5 border-r border-slate-300">የሚያስተምሩት ኮርስ</th>
                      <th className="p-2.5 border-r border-slate-300">የመግቢያ ስም</th>
                      <th className="p-2.5 border-r border-slate-300 font-mono">የመግቢያ ቁልፍ (Passkey)</th>
                      <th className="p-2.5 text-center">ሁኔታ</th>
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
                              ? teacherCourses.map((c) => c.name).join('፣ ')
                              : 'ኮርስ አልተመደበም'}
                          </td>
                          <td className="p-2.5 border-r border-slate-200 font-mono text-[11px] text-slate-600">
                            {teacher}
                          </td>
                          <td className="p-2.5 border-r border-slate-200 font-mono font-bold text-emerald-900 text-xs">
                            {key}
                          </td>
                          <td className="p-2.5 text-center text-[10px] font-bold">
                            {isLocked ? (
                              <span className="text-rose-700">የታገደ</span>
                            ) : (
                              <span className="text-emerald-700">የተፈቀደ</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Signatures */}
              <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-8 text-xs">
                <div className="space-y-4">
                  <p className="font-bold text-slate-700">ያዘጋጀው (ዋና አድሚን)፦</p>
                  <p className="text-slate-400">ስም፡ ___________________________</p>
                  <p className="text-slate-400">ፊርማ፡ ___________________________</p>
                  <p className="text-slate-400">ቀን፡ ___________________________</p>
                </div>
                <div className="space-y-4">
                  <p className="font-bold text-slate-700">ያረጋገጠው (የትምህርት ክፍሉ ዋና ዲን)፦</p>
                  <p className="text-slate-400">ስም፡ ___________________________</p>
                  <p className="text-slate-400">ፊርማ፡ ___________________________</p>
                  <p className="text-slate-400">ቀን፡ ___________________________</p>
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
                <span>አዲስ የትምህርት ዘመን መመዝገቢያ</span>
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
                  የትምህርት ዘመን (በኢትዮጵያ ዘመን አቆጣጠር ዓ.ም)
                </label>
                <input
                  type="text"
                  placeholder="ምሳሌ: 2031 ወይም 2032"
                  value={newYearInput}
                  onChange={(e) => setNewYearInput(e.target.value)}
                  className="w-full p-2.5 border rounded-xl bg-slate-50 border-slate-300 font-mono font-bold focus:ring-2 focus:ring-emerald-700 text-slate-900"
                  required
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  አዲሱ የትምህርት ዘመን በ1ኛ እና 2ኛ ሴሚስተር በሲስተሙ ይመዘገባል
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddYearModal(false)}
                  className="px-4 py-2 border rounded-xl hover:bg-slate-100 font-semibold text-slate-700 cursor-pointer"
                >
                  ሰርዝ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  መዝግብና ወቅታዊ አድርግ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
