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
  Lock
} from 'lucide-react';
import { Course, GradeBreakdown, OfficialSignaturesConfig, ProgramType, SemesterReleaseConfig, Student } from '../types.ts';
import { sortStudentsByAmharicName } from '../utils/amharicSort.ts';
import { calculateGradeDetails, calculateStudentGPA, getCourseAssessmentConfig, getCourseAssessmentItems, getCriterionScore, getEffectiveGradeValues, getGradeKey, resolveGradeBreakdown } from '../utils/gradeCalculations.ts';
import { getCriterionColor } from './TeacherPortal.tsx';
import { OfficialSignaturesManager } from './OfficialSignaturesManager.tsx';
import { ExcelUploadModal } from './ExcelUploadModal.tsx';
import { CourseGradeReportPdfModal } from './CourseGradeReportPdfModal.tsx';
import { exportCourseGradesToExcel, downloadCourseGradeTemplateExcel, exportMasterSemesterGradeSheetToExcel } from '../utils/excelUtils.ts';
import { GraduationManager } from './GraduationManager.tsx';
import { MasterGradeReportPdfModal } from './MasterGradeReportPdfModal.tsx';
import { TeacherAllocationManager } from './TeacherAllocationManager.tsx';
import { SemesterReleaseControl } from './SemesterReleaseControl.tsx';

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
  courses: Course[];
  students: Student[];
  teachers: string[];
  grades: Record<string, GradeBreakdown>;
  onAddTeacher: (teacherName: string) => void;
  onOpenAddCourse: () => void;
  onOpenEditCourse: (course: Course) => void;
  onDeleteCourse: (courseId: string) => void;
  onOpenAddStudent: () => void;
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
  courses,
  students,
  teachers,
  grades,
  onAddTeacher,
  onOpenAddCourse,
  onOpenEditCourse,
  onDeleteCourse,
  onOpenAddStudent,
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
  onBatchDeleteCourses
}) => {
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
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isMasterPdfOpen, setIsMasterPdfOpen] = useState(false);

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

  const filteredCourses = courses.filter((c) => {
    if (courseProgramFilter === 'ALL') return true;
    return c.program === courseProgramFilter;
  });

  const selectedSupervisedCourse = courses.find((c) => c.id === superviseCourseId) || courses[0];
  const supervisedStudents = selectedSupervisedCourse
    ? sortStudentsByAmharicName(students.filter((s) => s.program === selectedSupervisedCourse.program))
    : [];


  const handleCreateYear = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newYearInput.trim();
    if (!clean) return;
    if (availableYears.includes(clean)) {
      showNotify(`የትምህርት ዘመን ${clean} አስቀድሞ አለ!`, 'warning');
      return;
    }
    onAddAcademicYear(clean);
    onYearChange(clean);
    setNewYearInput('');
    setShowAddYearModal(false);
    showNotify(`አዲስ የትምህርት ዘመን (${clean} ዓ.ም) ተጨምሯል!`, 'success');
  };

  const handleCreateTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newTeacherName.trim();
    if (!clean) return;
    if (teachers.includes(clean)) {
      showNotify('ይህ መምህር አስቀድሞ ተመዝግቧል!', 'warning');
      return;
    }
    onAddTeacher(clean);
    setNewTeacherName('');
    setShowAddTeacherModal(false);
    showNotify(`አዲስ መምህር "${clean}" በስኬት ተመዝግቧል!`, 'success');
  };

  const handleDeanCriterionChange = (
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
  };

  const handleSaveDeanGrades = () => {
    if (!selectedSupervisedCourse) return;
    const targetYear = selectedSupervisedCourse.academicYear || currentYear;
    const targetSem = selectedSupervisedCourse.semester || currentSemester;

    const updated = { ...grades };
    supervisedStudents.forEach((s) => {
      const breakdown = editingGradeMatrix[s.uid] || { p1: 0, p2: 0, mid: 0, final: 0, att: 0 };
      const keyByUid = getGradeKey(s.uid, selectedSupervisedCourse.id, targetYear, targetSem);
      const keyById = getGradeKey(s.id, selectedSupervisedCourse.id, targetYear, targetSem);
      const directKey = `${s.uid}_${selectedSupervisedCourse.id}`;
      const defaultYearKey = getGradeKey(s.uid, selectedSupervisedCourse.id, currentYear, currentSemester);

      updated[keyByUid] = breakdown;
      updated[keyById] = breakdown;
      updated[directKey] = breakdown;
      updated[defaultYearKey] = breakdown;
    });

    onSaveGrades(updated);
    try {
      localStorage.setItem('bk_grades', JSON.stringify(updated));
    } catch (_) {}
    showNotify('የተስተካከሉት ውጤቶች በስኬት ተመዝግበዋል!', 'success');
  };

  // Export Dean supervised grades to Excel (.xlsx)
  const handleExportDeanExcel = () => {
    if (!selectedSupervisedCourse) return;
    exportCourseGradesToExcel(
      selectedSupervisedCourse,
      supervisedStudents,
      editingGradeMatrix,
      currentYear,
      currentSemester
    );
    showNotify(`የ${selectedSupervisedCourse.name} ውጤት ኤክሴል ሰነድ (.xlsx) በስኬት ወርዷል!`, 'success');
  };

  // Apply imported Excel scores to Dean supervised grades with instant persistence
  const handleApplyDeanImportedScores = (scoresByUid: Record<string, Record<string, number>>) => {
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

      nextMatrix[uid] = updatedBreakdown;

      const keyByUid = getGradeKey(uid, selectedSupervisedCourse.id, targetYear, targetSem);
      const keyById = getGradeKey(studentId, selectedSupervisedCourse.id, targetYear, targetSem);
      const directKey = `${uid}_${selectedSupervisedCourse.id}`;
      const defaultYearKey = getGradeKey(uid, selectedSupervisedCourse.id, currentYear, currentSemester);

      updatedGlobal[keyByUid] = updatedBreakdown;
      updatedGlobal[keyById] = updatedBreakdown;
      updatedGlobal[directKey] = updatedBreakdown;
      updatedGlobal[defaultYearKey] = updatedBreakdown;
    });

    setEditingGradeMatrix(nextMatrix);
    onSaveGrades(updatedGlobal);
    try {
      localStorage.setItem('bk_grades', JSON.stringify(updatedGlobal));
    } catch (_) {}

    showNotify(`የ${Object.keys(scoresByUid).length} ተማሪዎች ውጤት ከኤክሴል በስኬት ተመዝግቧል!`, 'success');
  };

  // Download course grades as CSV
  const handleDownloadCourseGrades = (course: Course) => {
    const enrolled = students.filter((s) => s.program === course.program);
    const criteria = getCourseAssessmentItems(course);
    const headers = criteria.map((it) => `"${it.label} (${it.max}%)"`).join(',');
    let csv = `\uFEFFተ.ቁ,መለያ ቁጥር (ID),የተማሪ ስም,ጾታ,${headers},ድምር (100%),የውጤት ፊደል,ነጥብ\n`;

    enrolled.forEach((s, idx) => {
      const key = getGradeKey(s.uid, course.id, currentYear, currentSemester);
      const g = grades[key] || { p1: 0, p2: 0, mid: 0, final: 0, att: 0 };
      const eff = getEffectiveGradeValues(g, criteria);
      const scoresCols = criteria.map((it, itIdx) => getCriterionScore(g, it.id, itIdx)).join(',');

      csv += `${idx + 1},"${s.id}","${s.name}","${s.gender}",${scoresCols},${eff.total},"${eff.letter}",${eff.points.toFixed(2)}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ውጤት_${course.name}_${course.program}_${currentYear}_${currentSemester}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showNotify(`የ${course.name} ውጤት CSV ፋይል ዳውንሎድ ተደርጓል!`, 'success');
  };

  // Rank Top Performers
  const getTopStudents = (prog: ProgramType) => {
    return students
      .filter((s) => s.program === prog)
      .map((s) => ({
        ...s,
        gpa: parseFloat(calculateStudentGPA(s, courses, grades, currentYear, currentSemester))
      }))
      .sort((a, b) => b.gpa - a.gpa)
      .slice(0, 3);
  };

  const topDegree = getTopStudents('Degree');
  const topDiploma = getTopStudents('Diploma');

  return (
    <div className="space-y-6 no-print">
      {/* Top Dean Controls */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/80 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Award className="w-7 h-7 text-emerald-800" />
            <span>የዋና ዲን (Academic Dean) ፖርታል</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            የትምህርት ዘመን፣ የኮርሶችና የመምህራን ምደባ፣ የውጤት ማጽደቂያ፣ እና ይፋዊ ትራንስክሪፕት ማዘጋጃ
          </p>
        </div>

        {/* Academic Year, Semester & Grade Publish */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Year select + Add year */}
          <div className="flex items-center gap-1.5 bg-amber-50/80 border border-amber-300 rounded-xl px-3 py-1.5 shadow-xs">
            <Calendar className="w-4 h-4 text-amber-700" />
            <label className="text-xs font-bold text-amber-900">የትምህርት ዘመን:</label>
            <select
              value={currentYear}
              onChange={(e) => onYearChange(e.target.value)}
              className="text-xs font-bold bg-transparent text-amber-900 focus:outline-none cursor-pointer"
            >
              {availableYears.map((y) => (
                <option key={y} value={y} className="text-slate-800">
                  {y} ዓ.ም
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowAddYearModal(true)}
              className="ml-1 p-1 rounded-md bg-amber-200 hover:bg-amber-300 text-amber-900 font-bold text-xs cursor-pointer"
              title="አዲስ የትምህርት ዘመን ጨምር"
            >
              <Plus className="w-3 h-3 inline" />
            </button>
          </div>

          {/* Semester select */}
          <div className="flex items-center gap-2 bg-amber-50/80 border border-amber-300 rounded-xl px-3 py-1.5 shadow-xs">
            <label className="text-xs font-bold text-amber-900">ሴሚስተር:</label>
            <select
              value={currentSemester}
              onChange={(e) => onSemesterChange(e.target.value)}
              className="text-xs font-bold bg-transparent text-amber-900 focus:outline-none cursor-pointer"
            >
              <option value="1" className="text-slate-800">1ኛ ሴሚስተር</option>
              <option value="2" className="text-slate-800">2ኛ ሴሚስተር</option>
              <option value="ALL" className="text-slate-800">ሁሉም ሴሚስተሮች (All Semesters)</option>
            </select>
          </div>

          {/* Grade Approval / Publish Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onToggleGradePublication}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer ${
                gradePublished
                  ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                  : 'bg-amber-600 hover:bg-amber-700 text-white'
              }`}
            >
              {gradePublished ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>🌐 ለሁሉም አሳይ</span>
                </>
              ) : (
                <>
                  <EyeOff className="w-4 h-4" />
                  <span>🔒 ለሁሉም እገድ</span>
                </>
              )}
            </button>

            {onToggleStudentPdfPrint && (
              <button
                type="button"
                onClick={onToggleStudentPdfPrint}
                className={`px-3.5 py-2 text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer ${
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
                className="bg-indigo-700 hover:bg-indigo-800 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                title="በተማሪዎች መርጦ ውጤትና ትራንስክሪፕት መፍቀጃና ማገጃ"
              >
                <span>🔒 በልዩነት መርጦ መፍቀድ/ማገድ</span>
              </button>
            )}

            {onOpenArchiveModal && (
              <button
                type="button"
                onClick={onOpenArchiveModal}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs px-3.5 py-2 rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                title="የቀደሙ ሥራዎችና ማህደር መፈለጊያ ማዕከል"
              >
                <History className="w-4 h-4 text-slate-950" />
                <span>🔍 የቀደሙ ሥራዎችና ማህደር</span>
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-indigo-800 to-indigo-950 text-white rounded-3xl p-5 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold text-indigo-200 uppercase tracking-wider">የድግሪ ከፍተኛ ውጤት (Rank 1)</p>
              <h4 className="text-sm font-extrabold text-amber-300 mt-1 truncate max-w-[150px]">
                {topDegree[0]?.name || '—'}
              </h4>
              <p className="text-xl font-black font-mono text-white mt-1">
                GPA: {topDegree[0]?.gpa.toFixed(2) || '0.00'}
              </p>
            </div>
            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-xs">
              <Award className="w-6 h-6 text-amber-300" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-800 to-teal-950 text-white rounded-3xl p-5 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold text-emerald-200 uppercase tracking-wider">የዲፕሎማ ከፍተኛ ውጤት (Rank 1)</p>
              <h4 className="text-sm font-extrabold text-amber-300 mt-1 truncate max-w-[150px]">
                {topDiploma[0]?.name || '—'}
              </h4>
              <p className="text-xl font-black font-mono text-white mt-1">
                GPA: {topDiploma[0]?.gpa.toFixed(2) || '0.00'}
              </p>
            </div>
            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-xs">
              <CheckCircle2 className="w-6 h-6 text-emerald-300" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-700 to-amber-950 text-white rounded-3xl p-5 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold text-amber-200 uppercase tracking-wider">የትምህርት ሰሌዳና ኮርሶች</p>
              <h3 className="text-2xl sm:text-3xl font-black font-mono text-white mt-1">{courses.length}</h3>
              <p className="text-[11px] text-amber-200 mt-1">
                መምህራን: {teachers.filter((t) => !t.includes('—')).length} ተመድበዋል
              </p>
            </div>
            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-xs">
              <BookOpen className="w-6 h-6 text-amber-300" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-cyan-800 to-blue-950 text-white rounded-3xl p-5 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold text-cyan-200 uppercase tracking-wider">የተማሪዎች ይፋዊ ትራንስክሪፕት</p>
              <h3 className="text-2xl sm:text-3xl font-black font-mono text-white mt-1">{students.length}</h3>
              <p className="text-[11px] text-cyan-200 mt-1">
                {officialConfig?.showStamp ? 'ከማኅተም ጋር' : 'ክፍት የፊርማ ቦታ'}
              </p>
            </div>
            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-xs">
              <Printer className="w-6 h-6 text-cyan-300" />
            </div>
          </div>
        </div>
      </div>

      {/* Dean Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab('courses')}
          className={`py-2.5 px-4 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'courses'
              ? 'border-emerald-700 text-emerald-800 bg-white shadow-xs'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4 text-emerald-700" />
          <span>የኮርሶች ድልድልና የቀን ሰሌዳ ({courses.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('supervision')}
          className={`py-2.5 px-4 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'supervision'
              ? 'border-indigo-700 text-indigo-800 bg-white shadow-xs'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Eye className="w-4 h-4 text-indigo-600" />
          <span>የመምህራን ውጤት መቆጣጠሪያና ማረሚያ</span>
        </button>

        <button
          onClick={() => setActiveTab('transcripts')}
          className={`py-2.5 px-4 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'transcripts'
              ? 'border-amber-600 text-amber-800 bg-white shadow-xs'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Printer className="w-4 h-4 text-amber-600" />
          <span>ትራንስክሪፕት ማዘጋጃ ({students.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('teachers')}
          className={`py-2.5 px-4 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'teachers'
              ? 'border-teal-700 text-teal-800 bg-white shadow-xs'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4 text-teal-700" />
          <span>የመምህራን ዝርዝር ({teachers.filter(t => !t.includes('—')).length})</span>
        </button>

        <button
          onClick={() => setActiveTab('graduation')}
          className={`py-2.5 px-4 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'graduation'
              ? 'border-emerald-700 text-emerald-800 bg-white shadow-xs'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <GraduationCap className="w-4 h-4 text-amber-500" />
          <span>የተማራቂዎች ማረጋገጫና ማህደር</span>
        </button>

        <button
          onClick={() => setActiveTab('official_signatures')}
          className={`py-2.5 px-4 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'official_signatures'
              ? 'border-purple-700 text-purple-800 bg-white shadow-xs'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Award className="w-4 h-4 text-purple-700" />
          <span>ይፋዊ ማኅተምና ፊርማ</span>
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
              showNotify(newTeacher === 'አልተመደበም (—)' ? 'የመምህር ምደባ ተነስቷል!' : `መምህር ${newTeacher} ተመድቧል!`, 'success');
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
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Eye className="w-5 h-5 text-indigo-700" />
                <span>የመምህራን ውጤት መቆጣጠሪያ፣ ማረሚያ እና ማጽደቂያ</span>
              </h3>
              <p className="text-xs text-slate-500">
                ዲን የሁሉም መምህራንን ውጤት በቀጥታ ማየት፣ ማስተካከልና ማረም ይችላል
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={superviseCourseId}
                onChange={(e) => setSuperviseCourseId(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-indigo-600"
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
                onClick={handleExportDeanExcel}
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border border-emerald-400 text-xs px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="የዚህን ኮርስ ውጤት በኤክሴል (.xlsx) ለማውረድ"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                <span>ኤክሴል አውርድ (.xlsx)</span>
              </button>

              <button
                type="button"
                onClick={() => exportMasterSemesterGradeSheetToExcel(students, courses, grades, currentYear, currentSemester)}
                className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="የሁሉንም ተማሪዎች አጠቃላይ ውጤት በኤክሴል (.xlsx) ለማውረድ"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
                <span>ጠቅላላ ውጤት ኤክሴል</span>
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
                onClick={() => setIsMasterPdfOpen(true)}
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-950 border border-indigo-300 text-xs px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="የሁሉንም ተማሪዎች አጠቃላይ ውጤት በፒዲኤፍ ለማየትና ለማተም"
              >
                <Printer className="w-3.5 h-3.5 text-indigo-700" />
                <span>ጠቅላላ ሰነድ (PDF)</span>
              </button>

              {onClearAllGrades && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('ማስጠንቀቂያ፦ ሁሉንም የውጤት ማስገቢያ ቦታዎች ባዶ ማድረግ ይፈልጋሉ? ይህ መምህራን አዲስ ውጤት ከባዶ እንዲያስገቡ ያደርጋል።')) {
                      onClearAllGrades();
                    }
                  }}
                  className="bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs px-3 py-1.5 rounded-xl font-bold border border-rose-200 transition-colors flex items-center gap-1 cursor-pointer"
                  title="ሁሉንም የውጤት ማስገቢያዎች ባዶ አድርግ"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>ውጤቶችን ባዶ አድርግ</span>
                </button>
              )}

              <button
                onClick={handleSaveDeanGrades}
                className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>ለውጦችን መዝግብ</span>
              </button>
            </div>
          </div>

          {(() => {
            const criteria = getCourseAssessmentItems(selectedSupervisedCourse);
            const totalWeight = criteria.reduce((sum, it) => sum + (Number(it.max) || 0), 0);

            return (
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-100/90 sticky top-0 font-bold uppercase text-[10px]">
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
                    {supervisedStudents.map((s) => {
                      const g = editingGradeMatrix[s.uid] || { p1: 0, p2: 0, mid: 0, final: 0, att: 0 };
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
                                    handleDeanCriterionChange(s.uid, it.id, e.target.value, it.max, idx)
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
      )}

      {/* TAB 3: Direct Transcript Printing for Degree & Diploma */}
      {activeTab === 'transcripts' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Printer className="w-5 h-5 text-amber-600" />
                <span>የትራንስክሪፕት ማዘጋጃና ማተሚያ (Transcript Preparation)</span>
              </h3>
              <p className="text-xs text-slate-500">
                ዋና ዲን የድግሪም ሆነ የዲፕሎማ ተማሪዎችን ይፋዊ ትራንስክሪፕት በቀጥታ ማዘጋጀትና ማተም ይችላል
              </p>
            </div>
          </div>

          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[11px]">
                <tr>
                  <th className="p-2.5">ተ.ቁ</th>
                  <th className="p-2.5">መለያ ቁጥር (ID)</th>
                  <th className="p-2.5">የተማሪ ስም</th>
                  <th className="p-2.5">ፕሮግራም</th>
                  <th className="p-2.5">ደረጃ / ዓመት</th>
                  <th className="p-2.5">የትምህርት ዝግጅት</th>
                  <th className="p-2.5 text-center">ሴሚስተር GPA</th>
                  <th className="p-2.5 text-right">ትራንስክሪፕት</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortStudentsByAmharicName(students).map((s, idx) => {
                  const gpa = calculateStudentGPA(s, courses, grades, currentYear, currentSemester);

                  return (
                    <tr key={s.uid} className="hover:bg-slate-50">
                      <td className="p-2.5 font-mono text-slate-400">{idx + 1}</td>
                      <td className="p-2.5 font-mono font-bold text-slate-800">{s.id}</td>
                      <td className="p-2.5 font-bold text-slate-900">{s.name}</td>
                      <td className="p-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          s.program === 'Degree' ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {s.program}
                        </span>
                      </td>
                      <td className="p-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          s.currentStudyYear === 2 ? 'bg-amber-100 text-amber-950 border border-amber-300' : s.currentStudyYear === 3 ? 'bg-purple-100 text-purple-900' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {s.currentStudyYear ? `${s.currentStudyYear}ኛ ዓመት` : '1ኛ ዓመት'}
                        </span>
                      </td>
                      <td className="p-2.5 text-[11px] text-slate-600">
                        {s.program === 'Diploma' ? 'ዲፕሎማ (2 ዓመት)' : s.degreeTrack === '2_YEAR' ? 'ድግሪ (2 ዓመት - ቅድመ ዲፕሎማ)' : 'መደበኛ ድግሪ (3 ዓመት)'}
                      </td>
                      <td className="p-2.5 text-center font-black text-amber-700 font-mono">{gpa}</td>
                      <td className="p-2.5 text-right">
                        <button
                          onClick={() => onSelectPrintTranscript(s)}
                          className="bg-emerald-800 hover:bg-emerald-900 text-white text-[11px] px-3 py-1.5 rounded-lg font-bold shadow-xs inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>ትራንስክሪፕት አትም</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Manage Teachers */}
      {activeTab === 'teachers' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-800" />
                <span>የመምህራን ማህደርና ምደባ</span>
              </h3>
              <p className="text-xs text-slate-500">
                አዳዲስ መምህራንን መመዝገብና ለኮርሶች መመደብ
              </p>
            </div>

            <button
              onClick={() => setShowAddTeacherModal(true)}
              className="bg-emerald-800 hover:bg-emerald-900 text-white text-xs px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>አዲስ መምህር ጨምር</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {teachers.filter(t => !t.includes('—')).map((t, idx) => {
              const assignedCount = courses.filter(c => c.teacher === t).length;
              return (
                <div key={t} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-xs text-slate-900">{t}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">የተመደቡ ኮርሶች: <strong>{assignedCount}</strong></p>
                  </div>
                  <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                    {idx + 1}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Top Performers Ranking */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-6 h-6 text-amber-500" />
          <div>
            <h3 className="text-base font-bold text-slate-800">
              የሴሚስተሩ ከፍተኛ ውጤት ያመጡ ተማሪዎች (Top Performers)
            </h3>
            <p className="text-xs text-slate-500">
              የትምህርት ዘመን {currentYear} ዓ.ም | {currentSemester}ኛ ሴሚስተር
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/80">
            <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider mb-3 flex items-center justify-between pb-2 border-b border-indigo-200">
              <span>የድግሪ ፕሮግራም (Degree)</span>
              <span className="text-[11px] font-normal text-indigo-700">Top 3</span>
            </h4>
            <div className="space-y-2.5">
              {topDegree.map((s, idx) => (
                <div
                  key={s.uid}
                  className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200 shadow-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                        idx === 0
                          ? 'bg-amber-400 text-slate-950 font-black'
                          : idx === 1
                          ? 'bg-slate-300 text-slate-800 font-black'
                          : 'bg-amber-700 text-white font-black'
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">{s.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">ID: {s.id}</p>
                    </div>
                  </div>
                  <span className="font-mono font-black text-xs text-indigo-900 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
                    GPA: {s.gpa.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/80">
            <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider mb-3 flex items-center justify-between pb-2 border-b border-emerald-200">
              <span>የዲፕሎማ ፕሮግራም (Diploma)</span>
              <span className="text-[11px] font-normal text-emerald-700">Top 3</span>
            </h4>
            <div className="space-y-2.5">
              {topDiploma.map((s, idx) => (
                <div
                  key={s.uid}
                  className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200 shadow-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                        idx === 0
                          ? 'bg-amber-400 text-slate-950 font-black'
                          : idx === 1
                          ? 'bg-slate-300 text-slate-800 font-black'
                          : 'bg-amber-700 text-white font-black'
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">{s.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">ID: {s.id}</p>
                    </div>
                  </div>
                  <span className="font-mono font-black text-xs text-emerald-900 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                    GPA: {s.gpa.toFixed(2)}
                  </span>
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
            <h3 className="font-bold text-sm text-slate-800">አዲስ የትምህርት ዘመን ጨምር</h3>
            <form onSubmit={handleCreateYear} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  የትምህርት ዘመን (በኢትዮጵያ ካላንደር ዓ.ም)
                </label>
                <input
                  type="text"
                  value={newYearInput}
                  onChange={(e) => setNewYearInput(e.target.value)}
                  placeholder="ምሳሌ: 2031"
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
                  ሰርዝ
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg cursor-pointer"
                >
                  አክል
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
            <h3 className="font-bold text-sm text-slate-800">አዲስ መምህር መመዝገቢያ</h3>
            <form onSubmit={handleCreateTeacher} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  የመምህሩ ሙሉ ስም (ከነ ማዕረጉ)
                </label>
                <input
                  type="text"
                  value={newTeacherName}
                  onChange={(e) => setNewTeacherName(e.target.value)}
                  placeholder="ምሳሌ: መ/ር ዮሐንስ አበበ ወይም ፓ/ር..."
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
                  ሰርዝ
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-bold bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg cursor-pointer"
                >
                  መዝግብ
                </button>
              </div>
            </form>
          </div>
        </div>
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
