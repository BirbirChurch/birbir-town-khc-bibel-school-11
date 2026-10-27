import React, { useState } from 'react';
import {
  UserPlus,
  Search,
  Filter,
  Camera,
  Printer,
  Trash2,
  Users,
  Download,
  BellRing,
  BookOpen,
  FileSpreadsheet,
  CheckCircle2,
  Upload,
  Save,
  GraduationCap,
  Key,
  Eye,
  Check,
  Copy,
  EyeOff,
  Lock,
  ShieldAlert
} from 'lucide-react';
import { Course, GradeBreakdown, OfficialSignaturesConfig, ProgramType, Student } from '../types.ts';
import { calculateGradeDetails, calculateStudentGPA, getCourseAssessmentItems, getCriterionScore, getEffectiveGradeValues, getGradeKey } from '../utils/gradeCalculations.ts';
import { getCriterionColor } from './TeacherPortal.tsx';
import { ExcelUploadModal } from './ExcelUploadModal.tsx';
import { CourseGradeReportPdfModal } from './CourseGradeReportPdfModal.tsx';
import { exportCourseGradesToExcel, exportMasterSemesterGradeSheetToExcel } from '../utils/excelUtils.ts';
import { GraduationManager } from './GraduationManager.tsx';
import { MasterGradeReportPdfModal } from './MasterGradeReportPdfModal.tsx';
import { StudentCredentialsModal } from './StudentCredentialsModal.tsx';
import { StudentJsonImportModal } from './StudentJsonImportModal.tsx';
import { sortStudentsByAmharicName } from '../utils/amharicSort.ts';
import { DEFAULT_STUDENT_PASSKEYS, generateStudentPasskey } from '../data/initialData.ts';

interface RegistrarPortalProps {
  students: Student[];
  courses: Course[];
  grades: Record<string, GradeBreakdown>;
  photos: Record<string, string>;
  currentYear: string;
  currentSemester: string;
  availableYears?: string[];
  gradePublished?: boolean;
  onToggleGradePublication?: () => void;
  studentPdfPrintAllowed?: boolean;
  onToggleStudentPdfPrint?: () => void;
  onOpenReleaseManager?: () => void;
  onOpenAddStudent: () => void;
  onOpenPhotoModal: (studentUid: string) => void;
  onSelectPrintTranscript: (student: Student) => void;
  onDeleteStudent: (studentUid: string) => void;
  showNotify: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  onSaveGrades?: (updatedGrades: Record<string, GradeBreakdown>) => void;
  officialConfig?: OfficialSignaturesConfig;
  churchLogo?: string;
  onUpdateStudents?: (updated: Student[]) => void;
  teachers?: string[];
  userPasswords?: Record<string, string>;
  onOpenPasswordModal?: (studentUid: string, studentName: string) => void;
  onSaveCourses?: (updatedCourses: Course[]) => void;
}

export const RegistrarPortal: React.FC<RegistrarPortalProps> = ({
  students,
  courses,
  grades,
  photos,
  currentYear,
  currentSemester,
  availableYears,
  gradePublished,
  onToggleGradePublication,
  studentPdfPrintAllowed,
  onToggleStudentPdfPrint,
  onOpenReleaseManager,
  onOpenAddStudent,
  onOpenPhotoModal,
  onSelectPrintTranscript,
  onDeleteStudent,
  showNotify,
  onSaveGrades,
  officialConfig,
  churchLogo,
  onUpdateStudents,
  teachers,
  userPasswords = {},
  onOpenPasswordModal,
  onSaveCourses
}) => {
  const [activeTab, setActiveTab] = useState<'students' | 'teacher_assignments' | 'course_grades' | 'all_grades' | 'graduation'>('students');
  const [searchTerm, setSearchTerm] = useState('');
  const [programFilter, setProgramFilter] = useState<'ALL' | ProgramType>('ALL');
  const [genderFilter, setGenderFilter] = useState<'ALL' | 'ወንድ' | 'ሴት'>('ALL');
  const [yearFilter, setYearFilter] = useState<'ALL' | number>('ALL');
  const [showStudentCredentialsModal, setShowStudentCredentialsModal] = useState(false);
  const [showJsonImportModal, setShowJsonImportModal] = useState(false);
  const [showStudentKeys, setShowStudentKeys] = useState<Record<string, boolean>>({});
  const [copiedPasskeyUid, setCopiedPasskeyUid] = useState<string | null>(null);

  // Course Grade Entry & Verification State
  const [selectedCourseId, setSelectedCourseId] = useState<string>(courses[0]?.id || '');
  const [isExcelUploadOpen, setIsExcelUploadOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isMasterPdfOpen, setIsMasterPdfOpen] = useState(false);
  const [localGrades, setLocalGrades] = useState<Record<string, GradeBreakdown>>({});

  const selectedCourse = courses.find((c) => c.id === selectedCourseId) || courses[0];
  const enrolledStudents = selectedCourse
    ? students.filter((s) => s.program === selectedCourse.program)
    : [];

  React.useEffect(() => {
    if (!selectedCourse) return;
    const initial: Record<string, GradeBreakdown> = {};
    enrolledStudents.forEach((s) => {
      const key = getGradeKey(s.uid, selectedCourse.id, currentYear, currentSemester);
      initial[s.uid] = grades[key] || { p1: 0, p2: 0, mid: 0, final: 0, att: 0 };
    });
    setLocalGrades(initial);
  }, [selectedCourseId, selectedCourse?.id, enrolledStudents.length, grades, currentYear, currentSemester]);

  // Export Course Grades to Excel (.xlsx)
  const handleExportCourseExcel = () => {
    if (!selectedCourse) return;
    exportCourseGradesToExcel(
      selectedCourse,
      enrolledStudents,
      localGrades,
      currentYear,
      currentSemester
    );
    showNotify(`የ${selectedCourse.name} ውጤት ኤክሴል ሰነድ (.xlsx) በስኬት ወርዷል!`, 'success');
  };

  // Apply imported Excel scores
  const handleApplyImportedScores = (scoresByUid: Record<string, Record<string, number>>) => {
    if (!selectedCourse) return;
    setLocalGrades((prev) => {
      const next = { ...prev };
      Object.entries(scoresByUid).forEach(([uid, newScores]) => {
        const current = next[uid] || { p1: 0, p2: 0, mid: 0, final: 0, att: 0 };
        const currentScores = current.scores ? { ...current.scores } : {};
        Object.entries(newScores).forEach(([itemId, scoreVal]) => {
          currentScores[itemId] = scoreVal;
        });
        next[uid] = {
          ...current,
          scores: currentScores,
          p1: currentScores['p1'] ?? currentScores['crit_1'] ?? current.p1,
          p2: currentScores['p2'] ?? currentScores['crit_2'] ?? current.p2,
          mid: currentScores['mid'] ?? currentScores['crit_3'] ?? current.mid,
          final: currentScores['final'] ?? currentScores['crit_4'] ?? current.final,
          att: currentScores['att'] ?? currentScores['crit_5'] ?? current.att
        };
      });
      return next;
    });
    showNotify('ውጤቶች ከኤክሴል ተጭነዋል! ለውጦቹን ለማስቀረት «ውጤቶችን መዝግብ» የሚለውን ይጫኑ', 'info');
  };

  // Save modified course grades
  const handleSaveCourseGrades = () => {
    if (!selectedCourse || !onSaveGrades) return;
    const updated = { ...grades };
    enrolledStudents.forEach((s) => {
      const key = getGradeKey(s.uid, selectedCourse.id, currentYear, currentSemester);
      updated[key] = localGrades[s.uid] || { p1: 0, p2: 0, mid: 0, final: 0, att: 0 };
    });
    onSaveGrades(updated);
    showNotify('የተስተካከሉት ውጤቶች በስኬት ተመዝግበዋል!', 'success');
  };

  // Handle cell edit
  const handleScoreChange = (
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

    setLocalGrades((prev) => {
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

  const filteredStudents = React.useMemo(() => {
    const list = students.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesProg = programFilter === 'ALL' || s.program === programFilter;
      const matchesGender = genderFilter === 'ALL' || s.gender === genderFilter;
      const matchesYear = yearFilter === 'ALL' || (s.currentStudyYear || 1) === yearFilter;
      return matchesSearch && matchesProg && matchesGender && matchesYear;
    });
    return sortStudentsByAmharicName(list);
  }, [students, searchTerm, programFilter, genderFilter, yearFilter]);


  const degreeCount = students.filter(s => s.program === 'Degree').length;
  const diplomaCount = students.filter(s => s.program === 'Diploma').length;

  // Export all students' roster + GPA as CSV (including UID, Name, Program, etc.)
  const handleExportRosterCSV = (exportAll = true) => {
    const listToExport = exportAll ? students : filteredStudents;
    let csv = `\uFEFFተ.ቁ,UID (የተማሪ ዩኒክ መለያ),የተማሪ ሙሉ ስም,መለያ ቁጥር (ID),ፕሮግራም,ጾታ,የትምህርት ዓመት,የገቡበት ዓመት,የምረቃ ሁኔታ,ስልክ ቁጥር,የሴሚስተር GPA (${currentYear} ዓ.ም)\n`;

    sortStudentsByAmharicName(listToExport).forEach((s, idx) => {
      const gpa = calculateStudentGPA(s, courses, grades, currentYear, currentSemester);
      const studyYear = s.currentStudyYear ? `${s.currentStudyYear}ኛ ዓመት` : '1ኛ ዓመት';
      const admissionYr = s.admissionYear ? `${s.admissionYear} ዓ.ም` : '—';
      const statusText =
        s.graduationStatus === 'GRADUATED'
          ? 'የተመረቀ (Graduated)'
          : s.graduationStatus === 'CANDIDATE'
          ? 'ተማራቂ (Candidate)'
          : 'በመማር ላይ (Active)';
      csv += `${idx + 1},"${s.uid}","${s.name}","${s.id}","${s.program}","${s.gender || 'ወንድ'}","${studyYear}","${admissionYr}","${statusText}","${s.phone || '—'}",${gpa}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `የተማሪዎች_ስም_ዝርዝር_Student_List_${currentYear}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showNotify(`የ${listToExport.length} ተማሪዎች ዝርዝር መረጃ (UID, Name, Program) በCSV ፋይል በስኬት ወርዷል!`, 'success');
  };

  // Export comprehensive master grade sheet for all courses
  const handleExportMasterGradeSheet = () => {
    let csv = `\uFEFFተ.ቁ,ID,የተማሪ ስም,ፕሮግራም`;
    courses.forEach((c) => {
      csv += `,"${c.name} (${c.program})"`;
    });
    csv += `,ጠቅላላ GPA\n`;

    students.forEach((s, idx) => {
      const gpa = calculateStudentGPA(s, courses, grades, currentYear, currentSemester);
      csv += `${idx + 1},"${s.id}","${s.name}","${s.program}"`;

      courses.forEach((c) => {
        if (c.program === s.program) {
          const key = getGradeKey(s.uid, c.id, currentYear, currentSemester);
          const g = grades[key] || { p1: 0, p2: 0, mid: 0, final: 0, att: 0 };
          const tot = (g.p1 || 0) + (g.p2 || 0) + (g.mid || 0) + (g.final || 0) + (g.att || 0);
          csv += `,${tot}`;
        } else {
          csv += `,-`;
        }
      });
      csv += `,${gpa}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `የሁሉም_ኮርሶች_አጠቃላይ_ውጤት_ሰነድ_${currentYear}_${currentSemester}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showNotify('አጠቃላይ የውጤት ሰነድ (Master Grade Sheet) ወርዷል!', 'success');
  };

  // Notify teacher assignment simulated
  const handleNotifyTeacher = (teacherName: string, courseName: string, schedule: string) => {
    showNotify(`ለመምህር ${teacherName} ለ"${courseName}" (${schedule}) የማሳወቂያ መልእክት ተልኳል!`, 'success');
  };

  return (
    <div className="space-y-6 no-print">
      {/* Top Banner & Quick Actions */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/80 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-7 h-7 text-emerald-800" />
            <span>የሪጅስተራል (Registrar) ፖርታል</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            የተማሪዎች ምዝገባ፣ ፎቶ፣ የመምህራን ምደባ ማሳወቂያ እና ይፋዊ ትራንስክሪፕት ማዘጋጃ
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {onToggleGradePublication && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onToggleGradePublication}
                className={`inline-flex items-center gap-1.5 text-xs px-3.5 py-2.5 rounded-xl font-bold shadow-md transition-all cursor-pointer ${
                  gradePublished
                    ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                    : 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                }`}
                title="ውጤት ለተማሪዎች ይታይ/ይሰወር የሚለውን የሬጅስተራል ፈቃድ ይቆጣጠሩ"
              >
                {gradePublished ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                    <span>🌐 ለሁሉም አሳይ</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="w-4 h-4 text-slate-950" />
                    <span>🔒 ለሁሉም እገድ</span>
                  </>
                )}
              </button>

              {onToggleStudentPdfPrint && (
                <button
                  type="button"
                  onClick={onToggleStudentPdfPrint}
                  className={`inline-flex items-center gap-1.5 text-xs px-3.5 py-2.5 rounded-xl font-bold shadow-md transition-all cursor-pointer ${
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
                  className="bg-indigo-700 hover:bg-indigo-800 text-white font-extrabold text-xs px-3.5 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                  title="በተማሪዎች መርጦ ውጤትና ትራንስክሪፕት መፍቀጃና ማገጃ"
                >
                  <ShieldAlert className="w-4 h-4 text-amber-300" />
                  <span>🔒 በልዩነት መርጦ መፍቀድ/ማገድ</span>
                </button>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowJsonImportModal(true)}
            className="bg-purple-900 hover:bg-purple-950 text-white text-xs px-3.5 py-2.5 rounded-xl font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            title="ተማሪዎችን ከJSON ፋይል ጫን/አስገባ"
          >
            <Upload className="w-4 h-4 text-purple-300" />
            <span>ተማሪዎችን ከJSON ጫን</span>
          </button>

          <button
            onClick={onOpenAddStudent}
            className="bg-emerald-800 hover:bg-emerald-900 text-white text-xs sm:text-sm px-4 py-2.5 rounded-xl font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>አዲስ ተማሪ መዝግብ</span>
          </button>

          <button
            type="button"
            onClick={() => setShowStudentCredentialsModal(true)}
            className="bg-gradient-to-r from-emerald-800 to-emerald-700 hover:from-emerald-900 hover:to-emerald-800 text-white text-xs px-3.5 py-2.5 rounded-xl font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            title="የተማሪዎችን ይፋዊ መግቢያ ቁልፎች ሰነድ አትም ወይም በ CSV አውርድ"
          >
            <Key className="w-4 h-4 text-amber-300" />
            <span>የመግቢያ ቁልፍ ሰነድ (Passkeys)</span>
          </button>

          <button
            type="button"
            onClick={() => handleExportRosterCSV(true)}
            className="bg-slate-800 hover:bg-slate-900 text-white text-xs px-3.5 py-2.5 rounded-xl font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            title="የተማሪዎችን ሙሉ መረጃ (UID, Name, Program) በ CSV ፋይል አውርድ (Download Student List)"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>የተማሪዎች ዝርዝር አውርድ (CSV)</span>
          </button>
        </div>
      </div>


      {/* Navigation tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab('students')}
          className={`py-2.5 px-4 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'students'
              ? 'border-emerald-700 text-emerald-800 bg-white shadow-xs'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>የተማሪዎች ማህደር ({students.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('teacher_assignments')}
          className={`py-2.5 px-4 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'teacher_assignments'
              ? 'border-emerald-700 text-emerald-800 bg-white shadow-xs'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BellRing className="w-4 h-4 text-amber-600" />
          <span>የመምህራን ምደባ ማሳወቂያ ({courses.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('course_grades')}
          className={`py-2.5 px-4 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'course_grades'
              ? 'border-emerald-700 text-emerald-800 bg-white shadow-xs'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <GraduationCap className="w-4 h-4 text-emerald-700" />
          <span>የኮርስ ውጤት ማስገቢያ (Excel/PDF)</span>
        </button>

        <button
          onClick={() => setActiveTab('all_grades')}
          className={`py-2.5 px-4 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'all_grades'
              ? 'border-emerald-700 text-emerald-800 bg-white shadow-xs'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
          <span>አጠቃላይ ውጤት መመልከቻና ማውረጃ</span>
        </button>

        <button
          onClick={() => setActiveTab('graduation')}
          className={`py-2.5 px-4 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'graduation'
              ? 'border-emerald-700 text-emerald-800 bg-white shadow-xs'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <GraduationCap className="w-4 h-4 text-amber-500" />
          <span>የተማራቂዎች ማረጋገጫና ማህደር</span>
        </button>
      </div>

      {/* TAB 1: Student Roster */}
      {activeTab === 'students' && (
        <div className="space-y-4">
          {/* Quick Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex justify-between items-center">
              <div>
                <p className="text-xs text-slate-500 font-semibold">ጠቅላላ የተመዘገቡ ተማሪዎች</p>
                <h3 className="text-2xl font-black text-slate-800">{students.length}</h3>
              </div>
              <span className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-sm">
                100%
              </span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex justify-between items-center">
              <div>
                <p className="text-xs text-indigo-700 font-semibold">የድግሪ ተማሪዎች (Degree)</p>
                <h3 className="text-2xl font-black text-indigo-950">{degreeCount}</h3>
              </div>
              <span className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-sm">
                ድግሪ
              </span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex justify-between items-center">
              <div>
                <p className="text-xs text-emerald-700 font-semibold">የዲፕሎማ ተማሪዎች (Diploma)</p>
                <h3 className="text-2xl font-black text-emerald-950">{diplomaCount}</h3>
              </div>
              <span className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-sm">
                ዲፕሎማ
              </span>
            </div>
          </div>

          {/* Search and Filters Toolbar */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col md:flex-row gap-3 justify-between items-center">
            <div className="relative w-full md:w-1/2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="የተማሪውን ስም ወይም መለያ ቁጥር (ID) ፈልግ..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700 bg-slate-50"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={programFilter}
                  onChange={(e) => setProgramFilter(e.target.value as any)}
                  className="px-3 py-1.5 text-xs rounded-xl border border-slate-300 font-semibold bg-slate-50"
                >
                  <option value="ALL">ሁሉም ፕሮግራሞች</option>
                  <option value="Degree">ድግሪ (Degree - 35)</option>
                  <option value="Diploma">ዲፕሎማ (Diploma - 35)</option>
                </select>
              </div>

              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value as any)}
                className="px-3 py-1.5 text-xs rounded-xl border border-slate-300 font-semibold bg-slate-50"
              >
                <option value="ALL">ጾታ: ሁሉም</option>
                <option value="ወንድ">ወንድ ብቻ</option>
                <option value="ሴት">ሴት ብቻ</option>
              </select>

              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                className="px-3 py-1.5 text-xs rounded-xl border border-slate-300 font-semibold bg-slate-50 cursor-pointer"
              >
                <option value="ALL">ደረጃ: ሁሉም ዓመታት</option>
                <option value={1}>1ኛ ዓመት (Year 1)</option>
                <option value={2}>2ኛ ዓመት (Year 2)</option>
                <option value={3}>3ኛ ዓመት (Year 3)</option>
              </select>

              <span className="text-xs text-slate-500 font-medium">
                የተገኙ: <strong className="text-slate-800">{filteredStudents.length}</strong>
              </span>
            </div>
          </div>

          {/* Student Roster Table */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[11px] rounded-lg">
                  <tr>
                    <th className="p-3">ተ/ቁ</th>
                    <th className="p-3">ፎቶ</th>
                    <th className="p-3">መለያ ቁጥር (ID)</th>
                    <th className="p-3">የተማሪው ሙሉ ስም</th>
                    <th className="p-3">ጾታ</th>
                    <th className="p-3">ፕሮግራም</th>
                    <th className="p-3">ደረጃ / ዓመት</th>
                    <th className="p-3">የትምህርት መንገድ</th>
                    <th className="p-3">ሁኔታ</th>
                    <th className="p-3">መግቢያ ቁልፍ (Passkey)</th>
                    <th className="p-3 text-center">ሴሚስተር GPA</th>
                    <th className="p-3 text-right">ተግባር (Actions)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="p-8 text-center text-slate-400 italic">
                        ምንም የተገኘ ተማሪ የለም።
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((s, idx) => {
                      const gpa = calculateStudentGPA(s, courses, grades, currentYear, currentSemester);
                      const photoSrc = photos[s.uid];
                      const passkey = userPasswords[s.uid] || DEFAULT_STUDENT_PASSKEYS[s.uid] || generateStudentPasskey(s);
                      const isVisible = showStudentKeys[s.uid];
                      const isCopied = copiedPasskeyUid === s.uid;

                      return (
                        <tr key={s.uid} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3 font-mono font-bold text-slate-400">{idx + 1}</td>
                          <td className="p-3">
                            <div
                              onClick={() => onOpenPhotoModal(s.uid)}
                              className="cursor-pointer group relative w-10 h-10 rounded-full overflow-hidden border border-amber-300 shadow-xs"
                              title="ፎቶ ቀይር / ጨምር"
                            >
                              {photoSrc ? (
                                <img
                                  src={photoSrc}
                                  alt={s.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-emerald-800 text-white flex items-center justify-center font-bold text-xs">
                                  {s.name.charAt(0)}
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <Camera className="w-3.5 h-3.5 text-white" />
                              </div>
                            </div>
                          </td>
                          <td className="p-3 font-mono font-bold text-slate-800">{s.id}</td>
                          <td className="p-3">
                            <span className="font-bold text-slate-900 block">{s.name}</span>
                            <span className="text-[10px] text-slate-400">የገቡበት: {s.admissionYear || '2019'} ዓ.ም</span>
                          </td>
                          <td className="p-3 text-slate-600 font-semibold">{s.gender}</td>
                          <td className="p-3">
                            <span
                              className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold ${
                                s.program === 'Degree'
                                  ? 'bg-indigo-100 text-indigo-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {s.program === 'Degree' ? 'ድግሪ' : 'ዲፕሎማ'}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                              s.currentStudyYear === 2 ? 'bg-amber-100 text-amber-950 border border-amber-300' : s.currentStudyYear === 3 ? 'bg-purple-100 text-purple-900' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {s.currentStudyYear ? `${s.currentStudyYear}ኛ ዓመት` : '1ኛ ዓመት'}
                            </span>
                          </td>
                          <td className="p-3 text-[11px] text-slate-600">
                            {s.program === 'Diploma' ? (
                              <span>2 ዓመት (4 ሴሚስተር)</span>
                            ) : s.degreeTrack === '2_YEAR' || s.priorDiploma ? (
                              <span className="font-bold text-indigo-700">2 ዓመት (ቅድመ ዲፕሎማ)</span>
                            ) : (
                              <span>3 ዓመት መደበኛ (5-6 ሴሚስተር)</span>
                            )}
                          </td>
                          <td className="p-3">
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
                          <td className="p-3">
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
                                  setCopiedPasskeyUid(s.uid);
                                  showNotify(`የ${s.name} መግቢያ ቁልፍ ተቀድቷል!`, 'success');
                                  setTimeout(() => setCopiedPasskeyUid(null), 2000);
                                }}
                                className="p-1 text-slate-400 hover:text-emerald-700 cursor-pointer"
                                title="ቁልፍ ኮፒ አድርግ"
                              >
                                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </td>
                          <td className="p-3 text-center font-black text-amber-700 font-mono text-sm">
                            {gpa}
                          </td>
                          <td className="p-3 text-right space-x-1.5 space-x-reverse">
                            <button
                              onClick={() => onOpenPhotoModal(s.uid)}
                              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                              title="ፎቶ ማያያዣ"
                            >
                              <Camera className="w-4 h-4 inline" />
                            </button>
                            <button
                              onClick={() => onSelectPrintTranscript(s)}
                              className="inline-flex items-center gap-1 bg-emerald-800 hover:bg-emerald-900 text-white text-[11px] px-3 py-1.5 rounded-lg font-bold shadow-xs transition-colors"
                              title="ይፋዊ ትራንስክሪፕት አዘጋጅ"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>ትራንስክሪፕት</span>
                            </button>
                            <button
                              onClick={() => onDeleteStudent(s.uid)}
                              className="p-1.5 rounded-lg text-rose-600 hover:text-rose-800 hover:bg-rose-50 transition-colors"
                              title="ሰርዝ"
                            >
                              <Trash2 className="w-4 h-4 inline" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
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
                showNotify={showNotify}
                onOpenPasswordModal={onOpenPasswordModal}
              />
            )}
          </div>
        </div>
      )}


      {/* TAB 2: Teacher Assignments & Notices */}
      {activeTab === 'teacher_assignments' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <BellRing className="w-5 h-5 text-amber-600" />
                <span>የመምህራን የኮርስ ምደባና የማሳወቂያ ሰሌዳ</span>
              </h3>
              <p className="text-xs text-slate-500">
                የተመደቡ መምህራንን መመልከት እና የማሳወቂያ መልእክት (Notice Memo) መላክ
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[11px] rounded-lg">
                <tr>
                  <th className="p-3">ተ/ቁ</th>
                  <th className="p-3">ፕሮግራም</th>
                  <th className="p-3">ቀን / የጊዜ ሰሌዳ</th>
                  <th className="p-3">የኮርስ ስም</th>
                  <th className="p-3">የተመደበ መምህር</th>
                  <th className="p-3 text-center">ሁኔታ</th>
                  <th className="p-3 text-right">ማሳወቂያ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {courses.map((c, idx) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-slate-400">{idx + 1}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        c.program === 'Degree' ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {c.program}
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-amber-900 bg-amber-50/50 rounded">{c.schedule}</td>
                    <td className="p-3 font-bold text-slate-900">{c.name}</td>
                    <td className="p-3 font-semibold text-slate-800">{c.teacher}</td>
                    <td className="p-3 text-center">
                      {c.teacher === 'አልተመደበም (—)' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-rose-100 text-rose-800 font-bold">
                          ክፍት ቦታ
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>ተመድቧል</span>
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      {c.teacher !== 'አልተመደበም (—)' && (
                        <button
                          onClick={() => handleNotifyTeacher(c.teacher, c.name, c.schedule)}
                          className="bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-xs flex items-center gap-1 ml-auto"
                        >
                          <BellRing className="w-3 h-3" />
                          <span>ምደባ አሳውቅ</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: All Grades Master Sheet */}
      {activeTab === 'all_grades' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-indigo-700" />
                <span>የተማሪዎች አጠቃላይ የውጤት መመልከቻና ማውረጃ (Master Grade Sheet)</span>
              </h3>
              <p className="text-xs text-slate-500">
                የትምህርት ዘመን {currentYear} ዓ.ም ({currentSemester}ኛ ሴሚስተር)
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => exportMasterSemesterGradeSheetToExcel(students, courses, grades, currentYear, currentSemester, programFilter)}
                className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                title="አጠቃላይ ውጤቱን በማይክሮሶፍት ኤክሴል ፋይል አውርድ"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
                <span>ጠቅላላ ውጤት ኤክሴል (.xlsx)</span>
              </button>

              <button
                type="button"
                onClick={() => setIsMasterPdfOpen(true)}
                className="bg-cyan-50 hover:bg-cyan-100 text-cyan-950 border border-cyan-300 text-xs px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="አጠቃላይ ውጤቱን በይፋዊ ፒዲኤፍ (PDF) ለማየትና ለማተም"
              >
                <Printer className="w-4 h-4 text-cyan-700" />
                <span>ጠቅላላ ሰነድ (PDF)</span>
              </button>

              <button
                type="button"
                onClick={handleExportMasterGradeSheet}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-3 py-2 rounded-xl font-bold flex items-center gap-1.5 border border-slate-300 cursor-pointer"
                title="በCSV ፋይል ለማውረድ"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>CSV ፋይል</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto max-h-96 overflow-y-auto border rounded-2xl">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-100/90 sticky top-0 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-2.5 border-b">ID</th>
                  <th className="p-2.5 border-b">የተማሪ ስም</th>
                  <th className="p-2.5 border-b">ፕሮግራም</th>
                  {courses.slice(0, 8).map((c) => (
                    <th key={c.id} className="p-2.5 border-b text-center" title={c.name}>
                      {c.name.slice(0, 10)}..
                    </th>
                  ))}
                  <th className="p-2.5 border-b text-center">GPA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((s) => {
                  const gpa = calculateStudentGPA(s, courses, grades, currentYear, currentSemester);
                  const progCourses = courses.filter((c) => c.program === s.program);

                  return (
                    <tr key={s.uid} className="hover:bg-slate-50">
                      <td className="p-2 font-mono font-bold">{s.id}</td>
                      <td className="p-2 font-bold text-slate-900">{s.name}</td>
                      <td className="p-2">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          s.program === 'Degree' ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {s.program}
                        </span>
                      </td>
                      {courses.slice(0, 8).map((c) => {
                        if (c.program === s.program) {
                          const key = getGradeKey(s.uid, c.id, currentYear, currentSemester);
                          const g = grades[key] || { p1: 0, p2: 0, mid: 0, final: 0, att: 0 };
                          const tot = (g.p1 || 0) + (g.p2 || 0) + (g.mid || 0) + (g.final || 0) + (g.att || 0);
                          return (
                            <td key={c.id} className="p-2 text-center font-mono font-bold text-slate-700">
                              {tot}
                            </td>
                          );
                        }
                        return <td key={c.id} className="p-2 text-center text-slate-300">-</td>;
                      })}
                      <td className="p-2 text-center font-black font-mono text-amber-700">{gpa}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Course Grade Entry (Excel Upload, Download, PDF Export) */}
      {activeTab === 'course_grades' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 space-y-4">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-emerald-700" />
                <span>የኮርስ ውጤት ማስገቢያ፣ ኤክሴልና ፒዲኤፍ (Course Grade Entry)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                የትምህርት ዘመን {currentYear} ዓ.ም ({currentSemester}ኛ ሴሚስተር) — መምህር: <span className="font-bold text-slate-700">{selectedCourse?.teacher}</span> | የተመዘገቡ ተማሪዎች: <span className="font-bold text-slate-700">{enrolledStudents.length}</span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Course Selector */}
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-emerald-700 cursor-pointer"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    [{c.program}] {c.name} — {c.teacher}
                  </option>
                ))}
              </select>

              {/* Excel Upload Button (ኤክሴል መጫኛ) */}
              <button
                type="button"
                onClick={() => setIsExcelUploadOpen(true)}
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border border-emerald-400 text-xs px-3 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="ውጤት ከማይክሮሶፍት ኤክሴል (.xlsx / .csv) ለመጫን"
              >
                <Upload className="w-3.5 h-3.5 text-emerald-700" />
                <span>ኤክሴል ጫን (Upload)</span>
              </button>

              {/* Excel Download Button (ኤክሴል ማውረጃ) */}
              <button
                type="button"
                onClick={handleExportCourseExcel}
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border border-emerald-400 text-xs px-3 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="የዚህን ኮርስ ውጤት በኤክሴል (.xlsx) ለማውረድ"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                <span>ኤክሴል አውርድ (.xlsx)</span>
              </button>

              {/* Official PDF Button (ይፋዊ ሰነድ / ፕዴፍ) */}
              <button
                type="button"
                onClick={() => setIsPdfModalOpen(true)}
                className="bg-cyan-50 hover:bg-cyan-100 text-cyan-950 border border-cyan-300 text-xs px-3 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="ይፋዊ የውጤት ሰነድ ለማተም ወይም በፒዲኤፍ (PDF) ለማስቀመጥ"
              >
                <Printer className="w-3.5 h-3.5 text-cyan-700" />
                <span>ይፋዊ ሰነድ (PDF)</span>
              </button>

              {/* Save All Button */}
              {onSaveGrades && (
                <button
                  type="button"
                  onClick={handleSaveCourseGrades}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>ለውጦችን መዝግብ</span>
                </button>
              )}
            </div>
          </div>

          {(() => {
            if (!selectedCourse) {
              return <div className="text-xs text-slate-500 py-6 text-center">እባክዎ መጀመሪያ ኮርስ ይምረጡ።</div>;
            }

            const criteria = getCourseAssessmentItems(selectedCourse);
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
                    {enrolledStudents.map((s) => {
                      const g = localGrades[s.uid] || { p1: 0, p2: 0, mid: 0, final: 0, att: 0 };
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
                                    handleScoreChange(s.uid, it.id, e.target.value, it.max, idx)
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

      {/* TAB 5: Graduation Verification & Alumni Archive */}
      {activeTab === 'graduation' && (
        <GraduationManager
          students={students}
          courses={courses}
          grades={grades}
          currentYear={currentYear}
          currentSemester={currentSemester}
          availableYears={availableYears || [currentYear]}
          currentUserRole="REGISTRAR"
          officialConfig={officialConfig}
          churchLogo={churchLogo}
          onUpdateStudents={onUpdateStudents || (() => {})}
          showNotify={showNotify}
          onSaveGrades={onSaveGrades}
          onSaveCourses={onSaveCourses}
          teachers={teachers}
        />
      )}

      {/* Student JSON Import Modal */}
      {showJsonImportModal && (
        <StudentJsonImportModal
          isOpen={showJsonImportModal}
          onClose={() => setShowJsonImportModal(false)}
          existingStudents={students}
          currentYear={currentYear}
          onUpdateStudents={onUpdateStudents}
          showNotify={showNotify}
        />
      )}

      {/* Student Passkeys & Credentials Modal */}
      {showStudentCredentialsModal && (
        <StudentCredentialsModal
          students={students}
          userPasswords={userPasswords}
          churchLogo={churchLogo}
          currentYear={currentYear}
          currentSemester={currentSemester}
          onClose={() => setShowStudentCredentialsModal(false)}
          showNotify={showNotify}
          onOpenPasswordModal={onOpenPasswordModal}
        />
      )}

      {/* Excel Upload Modal for Registrar */}
      {isExcelUploadOpen && selectedCourse && (
        <ExcelUploadModal
          course={selectedCourse}
          students={enrolledStudents}
          currentYear={currentYear}
          currentSemester={currentSemester}
          onApplyGrades={handleApplyImportedScores}
          onClose={() => setIsExcelUploadOpen(false)}
          showNotify={showNotify}
        />
      )}

      {/* Official PDF Grade Report Modal for Registrar */}
      {isPdfModalOpen && selectedCourse && (
        <CourseGradeReportPdfModal
          course={selectedCourse}
          students={enrolledStudents}
          grades={localGrades}
          currentYear={currentYear}
          currentSemester={currentSemester}
          officialConfig={officialConfig}
          churchLogo={churchLogo}
          onClose={() => setIsPdfModalOpen(false)}
        />
      )}

      {/* Master Semester Grade Report PDF Modal for Registrar */}
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
          initialProgram={programFilter}
        />
      )}
    </div>
  );
};
