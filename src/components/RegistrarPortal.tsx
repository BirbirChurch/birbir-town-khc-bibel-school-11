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
  ShieldAlert,
  Edit3,
  FileCode
} from 'lucide-react';
import { Course, GradeBreakdown, OfficialSignaturesConfig, ProgramType, Student } from '../types.ts';
import { calculateGradeDetails, calculateStudentGPA, getCourseAssessmentItems, getCriterionScore, getEffectiveGradeValues, getGradeKey, rankStudentsByPerformance, RankedStudentEntry, resolveGradeBreakdown } from '../utils/gradeCalculations.ts';
import { getCriterionColor } from './TeacherPortal.tsx';
import { useIsMobile } from '../utils/useIsMobile.ts';
import { StandardGradeDesktopRow, StandardGradeMobileCard } from './GradeEntryRows.tsx';
import { ExcelUploadModal } from './ExcelUploadModal.tsx';
import { CourseGradeReportPdfModal } from './CourseGradeReportPdfModal.tsx';
import { exportCourseGradesToExcel, exportMasterSemesterGradeSheetToExcel, ExcelApplyMeta } from '../utils/excelUtils.ts';
import { GraduationManager } from './GraduationManager.tsx';
import { MasterGradeReportPdfModal } from './MasterGradeReportPdfModal.tsx';
import { StudentCredentialsModal } from './StudentCredentialsModal.tsx';
import { StudentJsonImportModal } from './StudentJsonImportModal.tsx';
import { sortStudentsByAmharicName } from '../utils/amharicSort.ts';
import { DEFAULT_STUDENT_PASSKEYS, generateStudentPasskey } from '../data/initialData.ts';
import {
  useLanguage,
  formatProgram,
  formatGender,
  formatSemester,
  formatYearLevel,
  formatCalendarYear,
  formatCriterionLabel,
  formatGradStatus,
  formatDegreeTrack,
  formatTeacherDisplay,
  formatCourseTitle,
  formatSchedule
} from '../utils/i18n.tsx';

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
  onOpenEditStudent?: (student: Student) => void;
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
  onOpenJsonReaderModal?: () => void;
}

export const RegistrarPortal: React.FC<RegistrarPortalProps> = ({
  students,
  courses,
  grades,
  photos,
  currentYear,
  currentSemester,
  availableYears,
  onOpenJsonReaderModal,
  gradePublished,
  onToggleGradePublication,
  studentPdfPrintAllowed,
  onToggleStudentPdfPrint,
  onOpenReleaseManager,
  onOpenAddStudent,
  onOpenEditStudent,
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
  const { lang, t } = useLanguage();
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

  const isMobileViewport = useIsMobile(768);
  const selectedCourse = React.useMemo(
    () => courses.find((c) => c.id === selectedCourseId) || courses[0],
    [courses, selectedCourseId]
  );
  const enrolledStudents = React.useMemo(
    () => (selectedCourse ? students.filter((s) => s.program === selectedCourse.program) : []),
    [selectedCourse, students]
  );

  React.useEffect(() => {
    if (!selectedCourse) return;
    const targetYear = selectedCourse.academicYear || currentYear;
    const targetSem = selectedCourse.semester || (selectedCourse.schedule && selectedCourse.schedule.includes('2ኛ') ? '2' : '1') || currentSemester;
    const initial: Record<string, GradeBreakdown> = {};
    enrolledStudents.forEach((s) => {
      initial[s.uid] = resolveGradeBreakdown(grades, s.uid, selectedCourse.id, targetYear, targetSem, s.id);
    });
    setLocalGrades(initial);
  }, [selectedCourseId, selectedCourse?.id, enrolledStudents.length, grades, currentYear, currentSemester]);

  // Export Course Grades to Excel (.xlsx)
  const handleExportCourseExcel = () => {
    if (!selectedCourse) return;
    const targetYear = selectedCourse.academicYear || currentYear;
    const targetSem = selectedCourse.semester || (selectedCourse.schedule && selectedCourse.schedule.includes('2ኛ') ? '2' : '1') || currentSemester;
    exportCourseGradesToExcel(
      selectedCourse,
      enrolledStudents,
      localGrades,
      targetYear,
      targetSem
    );
    showNotify(
      t(
        `የ${selectedCourse.name} ውጤት ኤክሴል ሰነድ (.xlsx) በስኬት ወርዷል!`,
        `Excel grade sheet (.xlsx) for ${formatCourseTitle(selectedCourse.name, lang)} downloaded successfully!`
      ),
      'success'
    );
  };

  // Apply imported Excel scores
  const handleApplyImportedScores = (
    scoresByUid: Record<string, Record<string, number>>,
    meta?: ExcelApplyMeta
  ) => {
    if (!selectedCourse) return;
    setLocalGrades((prev) => {
      const next = { ...prev };
      Object.entries(scoresByUid).forEach(([uid, newScores]) => {
        const current = next[uid] || { p1: 0, p2: 0, mid: 0, final: 0, att: 0 };
        const currentScores = current.scores ? { ...current.scores } : {};
        Object.entries(newScores).forEach(([itemId, scoreVal]) => {
          currentScores[itemId] = scoreVal;
        });
        const updatedItem: GradeBreakdown = {
          ...current,
          scores: currentScores,
          p1: currentScores['p1'] ?? currentScores['crit_1'] ?? current.p1,
          p2: currentScores['p2'] ?? currentScores['crit_2'] ?? current.p2,
          mid: currentScores['mid'] ?? currentScores['crit_3'] ?? current.mid,
          final: currentScores['final'] ?? currentScores['crit_4'] ?? current.final,
          att: currentScores['att'] ?? currentScores['crit_5'] ?? current.att
        };
        if (meta?.customTotalsByUid && meta.customTotalsByUid[uid] !== undefined) {
          updatedItem.customTotal = meta.customTotalsByUid[uid];
        } else {
          delete updatedItem.customTotal;
        }
        if (meta?.customLettersByUid && meta.customLettersByUid[uid]) {
          updatedItem.customLetter = meta.customLettersByUid[uid];
        } else {
          delete updatedItem.customLetter;
        }
        next[uid] = updatedItem;
      });
      return next;
    });
    showNotify(
      t(
        'ውጤቶች ከኤክሴል ተጭነዋል! ለውጦቹን ለማስቀረት «ውጤቶችን መዝግብ» የሚለውን ይጫኑ',
        'Scores loaded from Excel! Click "Save Changes" to persist updates.'
      ),
      'info'
    );
  };

  // Save modified course grades
  const handleSaveCourseGrades = () => {
    if (!selectedCourse || !onSaveGrades) return;
    const targetYear = selectedCourse.academicYear || currentYear;
    const targetSem = selectedCourse.semester || (selectedCourse.schedule && selectedCourse.schedule.includes('2ኛ') ? '2' : '1') || currentSemester;
    const updated = { ...grades };
    enrolledStudents.forEach((s) => {
      const breakdown = localGrades[s.uid] || { p1: 0, p2: 0, mid: 0, final: 0, att: 0 };
      const keyByUid = getGradeKey(s.uid, selectedCourse.id, targetYear, targetSem);
      const keyById = getGradeKey(s.id, selectedCourse.id, targetYear, targetSem);
      const directKey = `${s.uid}_${selectedCourse.id}`;
      const directKeyById = s.id ? `${s.id}_${selectedCourse.id}` : '';

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
    onSaveGrades(updated);
    showNotify(
      t('የተስተካከሉት ውጤቶች በስኬት ተመዝግበዋል!', 'Updated grades saved successfully!'),
      'success'
    );
  };

  // Handle cell edit
  const handleScoreChange = React.useCallback((
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
  }, []);

  const regTbodyRef = React.useRef<HTMLTableSectionElement | null>(null);
  const regRowCountRef = React.useRef(enrolledStudents.length);
  regRowCountRef.current = enrolledStudents.length;
  const regColCountRef = React.useRef(5);
  regColCountRef.current = selectedCourse ? getCourseAssessmentItems(selectedCourse).length : 5;

  const handleRegCellKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLElement>, r: number, c: number) => {
      const maxRows = regRowCountRef.current;
      const maxCols = regColCountRef.current;
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

      const rowEl = regTbodyRef.current?.rows[nextR];
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

  // Compute program-level ranks (breaking 4.00 / equal GPA ties by most A+ grades)
  const rankByUid = React.useMemo(() => {
    const map = new Map<string, RankedStudentEntry>();
    (['Degree', 'Diploma'] as ProgramType[]).forEach((prog) => {
      rankStudentsByPerformance(
        students.filter((s) => s.program === prog),
        courses,
        grades,
        currentYear,
        currentSemester
      ).forEach((entry) => map.set(entry.student.uid, entry));
    });
    return map;
  }, [students, courses, grades, currentYear, currentSemester]);

  // Export all students' roster + GPA as CSV (including UID, Name, Program, etc.)
  const handleExportRosterCSV = (exportAll = true) => {
    const listToExport = exportAll ? students : filteredStudents;
    let csv = `\uFEFF${t('ተ.ቁ', 'No.')},${t('UID (የተማሪ ዩኒክ መለያ)', 'Student UID')},${t('የተማሪ ሙሉ ስም', 'Full Name')},${t('መለያ ቁጥር (ID)', 'Student ID')},${t('ፕሮግራም', 'Program')},${t('ጾታ', 'Gender')},${t('የትምህርት ዓመት', 'Study Year')},${t('የገቡበት ዓመት', 'Admission Year')},${t('የምረቃ ሁኔታ', 'Graduation Status')},${t('ስልክ ቁጥር', 'Phone')},${t(`የሴሚስተር GPA (${currentYear} ዓ.ም)`, `Semester GPA (${currentYear} E.C.)`)},${t('የA+ ብዛት', 'A+ Count')},${t('ደረጃ (Rank)', 'Rank')}\n`;

    sortStudentsByAmharicName(listToExport).forEach((s, idx) => {
      const rankEntry = rankByUid.get(s.uid);
      const gpa = rankEntry ? rankEntry.stats.gpaStr : calculateStudentGPA(s, courses, grades, currentYear, currentSemester);
      const studyYear = formatYearLevel(s.currentStudyYear || 1, lang);
      const admissionYr = s.admissionYear ? formatCalendarYear(s.admissionYear, lang) : '—';
      const statusText = formatGradStatus(s.graduationStatus || 'ACTIVE', lang);
      const aPlusCount = rankEntry ? rankEntry.stats.aPlusCount : 0;
      const rankStr = rankEntry && rankEntry.rank > 0 ? String(rankEntry.rank) : '—';
      csv += `${idx + 1},"${s.uid}","${s.name}","${s.id}","${formatProgram(s.program, lang)}","${formatGender(s.gender || 'ወንድ', lang)}","${studyYear}","${admissionYr}","${statusText}","${s.phone || '—'}",${gpa},${aPlusCount},"${rankStr}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Student_List_${currentYear}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showNotify(
      t(
        `የ${listToExport.length} ተማሪዎች ዝርዝር መረጃ (UID, Name, Program) በCSV ፋይል በስኬት ወርዷል!`,
        `Roster CSV for ${listToExport.length} students downloaded successfully!`
      ),
      'success'
    );
  };

  // Export comprehensive master grade sheet for all courses
  const handleExportMasterGradeSheet = () => {
    let csv = `\uFEFF${t('ተ.ቁ', 'No.')},ID,${t('የተማሪ ስም', 'Student Name')},${t('ፕሮግራም', 'Program')}`;
    courses.forEach((c) => {
      csv += `,"${formatCourseTitle(c.name, lang)} (${formatProgram(c.program, lang)})"`;
    });
    csv += `,${t('ጠቅላላ GPA', 'Overall GPA')},${t('የA+ ብዛት', 'A+ Count')},${t('ደረጃ (Rank)', 'Rank')}\n`;

    students.forEach((s, idx) => {
      const rankEntry = rankByUid.get(s.uid);
      const gpa = rankEntry ? rankEntry.stats.gpaStr : calculateStudentGPA(s, courses, grades, currentYear, currentSemester);
      csv += `${idx + 1},"${s.id}","${s.name}","${formatProgram(s.program, lang)}"`;

      courses.forEach((c) => {
        if (c.program === s.program) {
          const targetYear = c.academicYear || currentYear;
          const targetSem = c.semester || (c.schedule && c.schedule.includes('2ኛ') ? '2' : '1') || currentSemester;
          const g = resolveGradeBreakdown(grades, s.uid, c.id, targetYear, targetSem, s.id);
          const eff = getEffectiveGradeValues(g, getCourseAssessmentItems(c));
          csv += `,${eff.hasAny ? eff.total : '-'}`;
        } else {
          csv += `,-`;
        }
      });
      const aPlusCount = rankEntry ? rankEntry.stats.aPlusCount : 0;
      const rankStr = rankEntry && rankEntry.rank > 0 ? String(rankEntry.rank) : '—';
      csv += `,${gpa},${aPlusCount},"${rankStr}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Master_Grade_Sheet_${currentYear}_S${currentSemester}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showNotify(
      t('አጠቃላይ የውጤት ሰነድ (Master Grade Sheet) ወርዷል!', 'Master Grade Sheet CSV downloaded!'),
      'success'
    );
  };

  // Notify teacher assignment simulated
  const handleNotifyTeacher = (teacherName: string, courseName: string, schedule: string) => {
    showNotify(
      t(
        `ለመምህር ${teacherName} ለ"${courseName}" (${schedule}) የማሳወቂያ መልእክት ተልኳል!`,
        `Assignment notice sent to ${teacherName} for "${formatCourseTitle(courseName, lang)}" (${formatSchedule(schedule, lang)})!`
      ),
      'success'
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 no-print">
      {/* Top Banner & Quick Actions */}
      <div className="bg-white p-4 sm:p-6 rounded-3xl shadow-sm border border-slate-200/80 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-lg sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-800 shrink-0" />
            <span>{t('የሪጅስተራል (Registrar) ፖርታል', 'Registrar Portal')}</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {t(
              'የተማሪዎች ምዝገባ፣ ፎቶ፣ የመምህራን ምደባ ማሳወቂያ እና ይፋዊ ትራንስክሪፕት ማዘጋጃ',
              'Student registration, photos, instructor assignment notices & official transcripts'
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {onToggleGradePublication && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onToggleGradePublication}
                className={`inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl font-bold shadow-md transition-all cursor-pointer min-h-[40px] ${
                  gradePublished
                    ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                    : 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                }`}
                title={t('ውጤት ለተማሪዎች ይታይ/ይሰወር የሚለውን የሬጅስተራል ፈቃድ ይቆጣጠሩ', 'Toggle student grade visibility')}
              >
                {gradePublished ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
                    <span>🌐 {t('ለሁሉም አሳይ', 'Visible to All')}</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="w-4 h-4 text-slate-950 shrink-0" />
                    <span>🔒 {t('ለሁሉም እገድ', 'Hidden from All')}</span>
                  </>
                )}
              </button>

              {onToggleStudentPdfPrint && (
                <button
                  type="button"
                  onClick={onToggleStudentPdfPrint}
                  className={`inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl font-bold shadow-md transition-all cursor-pointer min-h-[40px] ${
                    studentPdfPrintAllowed
                      ? 'bg-indigo-700 hover:bg-indigo-800 text-white'
                      : 'bg-slate-700 hover:bg-slate-800 text-amber-300'
                  }`}
                  title={t('የተማሪዎችን የፒዲኤፍ ማተም ሁነታ ያብሩ/ያጥፉ', 'Enable/disable student PDF printing')}
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
                  className="bg-indigo-700 hover:bg-indigo-800 text-white font-extrabold text-xs px-3 py-2 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer min-h-[40px]"
                  title={t('በተማሪዎች መርጦ ውጤትና ትራንስክሪፕት መፍቀጃና ማገጃ', 'Selective student grade & transcript release')}
                >
                  <ShieldAlert className="w-4 h-4 text-amber-300 shrink-0" />
                  <span>🔒 {t('በልዩነት መፍቀድ/ማገድ', 'Selective Release')}</span>
                </button>
              )}
            </div>
          )}

          {onOpenJsonReaderModal && (
            <button
              type="button"
              onClick={onOpenJsonReaderModal}
              className="bg-indigo-700 hover:bg-indigo-800 text-white text-xs px-3 py-2 rounded-xl font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer min-h-[40px]"
              title={t('ሁለገብ የJSON ፋይል አንባቢ (የውጤቶች፣ የተማሪዎችና ባክአፕ መጫኛ)', 'Universal JSON File Reader (Grades, Students & Backups)')}
            >
              <FileCode className="w-4 h-4 text-amber-300 shrink-0" />
              <span>📂 {t('JSON አንብብ', 'Read JSON')}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowJsonImportModal(true)}
            className="bg-purple-900 hover:bg-purple-950 text-white text-xs px-3 py-2 rounded-xl font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer min-h-[40px]"
            title={t('ተማሪዎችን ከJSON ፋይል ጫን/አስገባ', 'Import students from JSON file')}
          >
            <Upload className="w-4 h-4 text-purple-300 shrink-0" />
            <span>{t('ተማሪዎችን ከJSON ጫን', 'Import Students JSON')}</span>
          </button>

          <button
            onClick={onOpenAddStudent}
            className="bg-emerald-800 hover:bg-emerald-900 text-white text-xs sm:text-sm px-3.5 py-2 rounded-xl font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer min-h-[40px]"
          >
            <UserPlus className="w-4 h-4 shrink-0" />
            <span>{t('አዲስ ተማሪ መዝግብ', 'Register Student')}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowStudentCredentialsModal(true)}
            className="bg-gradient-to-r from-emerald-800 to-emerald-700 hover:from-emerald-900 hover:to-emerald-800 text-white text-xs px-3 py-2 rounded-xl font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer min-h-[40px]"
            title={t('የተማሪዎችን ይፋዊ መግቢያ ቁልፎች ሰነድ አትም ወይም በ CSV አውርድ', 'Print or download official student passkeys')}
          >
            <Key className="w-4 h-4 text-amber-300 shrink-0" />
            <span>{t('የመግቢያ ቁልፍ ሰነድ', 'Passkey Sheet')}</span>
          </button>

          <button
            type="button"
            onClick={() => handleExportRosterCSV(true)}
            className="bg-slate-800 hover:bg-slate-900 text-white text-xs px-3 py-2 rounded-xl font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer min-h-[40px]"
            title={t('የተማሪዎችን ሙሉ መረጃ (UID, Name, Program) በ CSV ፋይል አውርድ', 'Download full student roster CSV')}
          >
            <Download className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{t('ዝርዝር አውርድ (CSV)', 'Download Roster (CSV)')}</span>
          </button>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="flex border-b border-slate-200 gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pb-0.5">
        <button
          onClick={() => setActiveTab('students')}
          className={`py-2.5 px-3.5 sm:px-4 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 whitespace-nowrap shrink-0 min-h-[44px] cursor-pointer ${
            activeTab === 'students'
              ? 'border-emerald-700 text-emerald-800 bg-white shadow-xs'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4 shrink-0" />
          <span>{t('የተማሪዎች ማህደር', 'Student Directory')} ({students.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('teacher_assignments')}
          className={`py-2.5 px-3.5 sm:px-4 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 whitespace-nowrap shrink-0 min-h-[44px] cursor-pointer ${
            activeTab === 'teacher_assignments'
              ? 'border-emerald-700 text-emerald-800 bg-white shadow-xs'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BellRing className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{t('የመምህራን ምደባ', 'Instructor Assignments')} ({courses.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('course_grades')}
          className={`py-2.5 px-3.5 sm:px-4 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 whitespace-nowrap shrink-0 min-h-[44px] cursor-pointer ${
            activeTab === 'course_grades'
              ? 'border-emerald-700 text-emerald-800 bg-white shadow-xs'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <GraduationCap className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{t('የኮርስ ውጤት (Excel/PDF)', 'Course Grades (Excel/PDF)')}</span>
        </button>

        <button
          onClick={() => setActiveTab('all_grades')}
          className={`py-2.5 px-3.5 sm:px-4 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 whitespace-nowrap shrink-0 min-h-[44px] cursor-pointer ${
            activeTab === 'all_grades'
              ? 'border-emerald-700 text-emerald-800 bg-white shadow-xs'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>{t('አጠቃላይ ውጤት', 'Master Grade Sheet')}</span>
        </button>

        <button
          onClick={() => setActiveTab('graduation')}
          className={`py-2.5 px-3.5 sm:px-4 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 whitespace-nowrap shrink-0 min-h-[44px] cursor-pointer ${
            activeTab === 'graduation'
              ? 'border-emerald-700 text-emerald-800 bg-white shadow-xs'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <GraduationCap className="w-4 h-4 text-amber-500 shrink-0" />
          <span>{t('የተማራቂዎች ማህደር', 'Graduation & Alumni')}</span>
        </button>
      </div>

      {/* TAB 1: Student Roster */}
      {activeTab === 'students' && (
        <div className="space-y-4">
          {/* Quick Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs flex justify-between items-center">
              <div>
                <p className="text-xs text-slate-500 font-semibold">{t('ጠቅላላ የተመዘገቡ ተማሪዎች', 'Total Registered Students')}</p>
                <h3 className="text-xl sm:text-2xl font-black text-slate-800">{students.length}</h3>
              </div>
              <span className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs sm:text-sm">
                100%
              </span>
            </div>
            <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs flex justify-between items-center">
              <div>
                <p className="text-xs text-indigo-700 font-semibold">{t('የድግሪ ተማሪዎች (Degree)', 'Degree Students')}</p>
                <h3 className="text-xl sm:text-2xl font-black text-indigo-950">{degreeCount}</h3>
              </div>
              <span className="w-16 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs">
                {formatProgram('Degree', lang)}
              </span>
            </div>
            <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs flex justify-between items-center">
              <div>
                <p className="text-xs text-emerald-700 font-semibold">{t('የዲፕሎማ ተማሪዎች (Diploma)', 'Diploma Students')}</p>
                <h3 className="text-xl sm:text-2xl font-black text-emerald-950">{diplomaCount}</h3>
              </div>
              <span className="w-16 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs">
                {formatProgram('Diploma', lang)}
              </span>
            </div>
          </div>

          {/* Search and Filters Toolbar */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col lg:flex-row gap-3 justify-between items-stretch lg:items-center">
            <div className="relative w-full lg:w-1/2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 sm:top-3 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('የተማሪውን ስም ወይም መለያ ቁጥር (ID) ፈልግ...', 'Search student by name or ID...')}
                className="w-full pl-9 pr-4 py-2.5 sm:py-2 text-base sm:text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700 bg-slate-50"
              />
            </div>

            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full lg:w-auto lg:justify-end">
              <div className="flex items-center gap-1.5 col-span-2 sm:col-span-1">
                <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0 hidden sm:block" />
                <select
                  value={programFilter}
                  onChange={(e) => setProgramFilter(e.target.value as any)}
                  className="w-full sm:w-auto px-3 py-2 text-xs rounded-xl border border-slate-300 font-semibold bg-slate-50 min-h-[40px]"
                >
                  <option value="ALL">{t('ሁሉም ፕሮግራሞች', 'All Programs')}</option>
                  <option value="Degree">{t('ድግሪ (Degree)', 'Degree Program')}</option>
                  <option value="Diploma">{t('ዲፕሎማ (Diploma)', 'Diploma Program')}</option>
                </select>
              </div>

              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value as any)}
                className="w-full sm:w-auto px-3 py-2 text-xs rounded-xl border border-slate-300 font-semibold bg-slate-50 min-h-[40px]"
              >
                <option value="ALL">{t('ጾታ: ሁሉም', 'Gender: All')}</option>
                <option value="ወንድ">{t('ወንድ ብቻ', 'Male Only')}</option>
                <option value="ሴት">{t('ሴት ብቻ', 'Female Only')}</option>
              </select>

              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                className="w-full sm:w-auto px-3 py-2 text-xs rounded-xl border border-slate-300 font-semibold bg-slate-50 cursor-pointer min-h-[40px]"
              >
                <option value="ALL">{t('ደረጃ: ሁሉም', 'Year: All')}</option>
                <option value={1}>{formatYearLevel(1, lang)}</option>
                <option value={2}>{formatYearLevel(2, lang)}</option>
                <option value={3}>{formatYearLevel(3, lang)}</option>
              </select>

              <span className="col-span-2 sm:col-span-1 text-xs text-slate-500 font-medium text-right sm:text-left">
                {t('የተገኙ:', 'Found:')} <strong className="text-slate-800">{filteredStudents.length}</strong>
              </span>
            </div>
          </div>

          {/* Student Roster Container */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-3.5 sm:p-6 space-y-4">
            {/* Mobile Student Directory Cards */}
            <div className="md:hidden space-y-3">
              {filteredStudents.length === 0 ? (
                <div className="p-8 text-center text-slate-400 italic text-xs">{t('ምንም የተገኘ ተማሪ የለም።', 'No students found.')}</div>
              ) : (
                filteredStudents.map((s) => {
                  const rankEntry = rankByUid.get(s.uid);
                  const gpa = rankEntry ? rankEntry.stats.gpaStr : calculateStudentGPA(s, courses, grades, currentYear, currentSemester);
                  const photoSrc = photos[s.uid];
                  const passkey = userPasswords[s.uid] || DEFAULT_STUDENT_PASSKEYS[s.uid] || generateStudentPasskey(s);
                  const isVisible = showStudentKeys[s.uid];
                  const isCopied = copiedPasskeyUid === s.uid;

                  return (
                    <div key={s.uid} className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3">
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            onClick={() => onOpenPhotoModal(s.uid)}
                            className="cursor-pointer relative w-11 h-11 rounded-full overflow-hidden border border-amber-300 shadow-xs shrink-0"
                            title={t('ፎቶ ቀይር / ጨምር', 'Add / Change Photo')}
                          >
                            {photoSrc ? (
                              <img src={photoSrc} alt={s.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-emerald-800 text-white flex items-center justify-center font-bold text-sm">
                                {s.name.charAt(0)}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 text-sm truncate">{s.name}</p>
                            <p className="text-[11px] font-mono text-slate-500">
                              ID: {s.id} • {formatGender(s.gender, lang)} • {formatCalendarYear(s.admissionYear || '2019', lang)}
                            </p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                s.program === 'Degree' ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                {formatProgram(s.program, lang)}
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                                {formatYearLevel(s.currentStudyYear || 1, lang)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="font-mono font-black text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg text-xs">
                            GPA {gpa}
                          </span>
                          {rankEntry && rankEntry.rank > 0 && (
                            <span className="font-mono font-bold text-indigo-800 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg text-[10px]">
                              #{rankEntry.rank} {rankEntry.stats.aPlusCount > 0 ? `(${rankEntry.stats.aPlusCount} A+)` : ''}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 text-xs">
                        <span className="text-[11px] text-slate-500 font-semibold">{t('ቁልፍ:', 'Passkey:')}</span>
                        <div className="flex items-center gap-1.5 font-mono">
                          <span className={`font-bold ${isVisible ? 'text-amber-900' : 'text-emerald-800'}`}>
                            {isVisible ? passkey : `•••• (${passkey})`}
                          </span>
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
                              setCopiedPasskeyUid(s.uid);
                              showNotify(
                                t(`የ${s.name} መግቢያ ቁልፍ ተቀድቷል!`, `Passkey copied for ${s.name}!`),
                                'success'
                              );
                              setTimeout(() => setCopiedPasskeyUid(null), 2000);
                            }}
                            className="p-1.5 text-slate-500 hover:text-emerald-700 cursor-pointer"
                          >
                            {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {onOpenEditStudent && (
                          <button
                            onClick={() => onOpenEditStudent(s)}
                            className="flex-1 inline-flex items-center justify-center gap-1 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs px-2.5 py-2 rounded-xl font-bold cursor-pointer min-h-[38px]"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>{t('ስም አርም', 'Edit Info')}</span>
                          </button>
                        )}
                        <button
                          onClick={() => onSelectPrintTranscript(s)}
                          className="flex-1 inline-flex items-center justify-center gap-1 bg-emerald-800 hover:bg-emerald-900 text-white text-xs px-2.5 py-2 rounded-xl font-bold cursor-pointer min-h-[38px]"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>{t('ትራንስክሪፕት', 'Transcript')}</span>
                        </button>
                        <button
                          onClick={() => onOpenPhotoModal(s.uid)}
                          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer min-h-[38px]"
                          title={t('ፎቶ ማያያዣ', 'Attach Photo')}
                        >
                          <Camera className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDeleteStudent(s.uid)}
                          className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 cursor-pointer min-h-[38px]"
                          title={t('ሰርዝ', 'Delete')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[11px] rounded-lg">
                  <tr>
                    <th className="p-3">{t('ተ/ቁ', 'No.')}</th>
                    <th className="p-3">{t('ፎቶ', 'Photo')}</th>
                    <th className="p-3">{t('መለያ ቁጥር (ID)', 'Student ID')}</th>
                    <th className="p-3">{t('የተማሪው ሙሉ ስም', 'Full Name')}</th>
                    <th className="p-3">{t('ጾታ', 'Gender')}</th>
                    <th className="p-3">{t('ፕሮግራም', 'Program')}</th>
                    <th className="p-3">{t('ደረጃ / ዓመት', 'Year Level')}</th>
                    <th className="p-3">{t('የትምህርት መንገድ', 'Study Track')}</th>
                    <th className="p-3">{t('ሁኔታ', 'Status')}</th>
                    <th className="p-3">{t('መግቢያ ቁልፍ (Passkey)', 'Passkey')}</th>
                    <th className="p-3 text-center">{t('ሴሚስተር GPA', 'Semester GPA')}</th>
                    <th className="p-3 text-center">{t('ደረጃ (Rank)', 'Rank')}</th>
                    <th className="p-3 text-right">{t('ተግባር (Actions)', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="p-8 text-center text-slate-400 italic">
                        {t('ምንም የተገኘ ተማሪ የለም።', 'No students found.')}
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((s, idx) => {
                      const rankEntry = rankByUid.get(s.uid);
                      const gpa = rankEntry ? rankEntry.stats.gpaStr : calculateStudentGPA(s, courses, grades, currentYear, currentSemester);
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
                              title={t('ፎቶ ቀይር / ጨምር', 'Add / Change Photo')}
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
                            <span className="text-[10px] text-slate-400">
                              {t('የገቡበት:', 'Admitted:')} {formatCalendarYear(s.admissionYear || '2019', lang)}
                            </span>
                          </td>
                          <td className="p-3 text-slate-600 font-semibold">{formatGender(s.gender, lang)}</td>
                          <td className="p-3">
                            <span
                              className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold ${
                                s.program === 'Degree'
                                  ? 'bg-indigo-100 text-indigo-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {formatProgram(s.program, lang)}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                              s.currentStudyYear === 2 ? 'bg-amber-100 text-amber-950 border border-amber-300' : s.currentStudyYear === 3 ? 'bg-purple-100 text-purple-900' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {formatYearLevel(s.currentStudyYear || 1, lang)}
                            </span>
                          </td>
                          <td className="p-3 text-[11px] text-slate-600">
                            {s.program === 'Diploma' ? (
                              <span>{t('2 ዓመት (4 ሴሚስተር)', '2 Years (4 Semesters)')}</span>
                            ) : (
                              <span className={s.degreeTrack === '2_YEAR' || s.priorDiploma ? 'font-bold text-indigo-700' : ''}>
                                {formatDegreeTrack(s.degreeTrack, s.priorDiploma, lang)}
                              </span>
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
                              {formatGradStatus(s.graduationStatus || 'ACTIVE', lang)}
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
                                title={isVisible ? t('ደብቅ', 'Hide') : t('አሳይ', 'Show')}
                              >
                                {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(passkey);
                                  setCopiedPasskeyUid(s.uid);
                                  showNotify(
                                    t(`የ${s.name} መግቢያ ቁልፍ ተቀድቷል!`, `Passkey copied for ${s.name}!`),
                                    'success'
                                  );
                                  setTimeout(() => setCopiedPasskeyUid(null), 2000);
                                }}
                                className="p-1 text-slate-400 hover:text-emerald-700 cursor-pointer"
                                title={t('ቁልፍ ኮፒ አድርግ', 'Copy Passkey')}
                              >
                                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </td>
                          <td className="p-3 text-center font-black text-amber-700 font-mono text-sm">
                            {gpa}
                          </td>
                          <td className="p-3 text-center font-mono">
                            {rankEntry && rankEntry.rank > 0 ? (
                              <div className="inline-flex items-center gap-1">
                                <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-indigo-50 text-indigo-800 border border-indigo-200">
                                  #{rankEntry.rank}
                                </span>
                                {rankEntry.stats.aPlusCount > 0 && (
                                  <span className="text-[10px] font-bold text-emerald-700">
                                    ({rankEntry.stats.aPlusCount} A+)
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                          <td className="p-3 text-right space-x-1.5 space-x-reverse">
                            {onOpenEditStudent && (
                              <button
                                onClick={() => onOpenEditStudent(s)}
                                className="inline-flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-slate-950 text-[11px] px-2.5 py-1.5 rounded-lg font-bold transition-colors cursor-pointer"
                                title={t('የተማሪውን ስም እና መረጃ አዲት አድርግ', 'Edit Student Name & Details')}
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>{t('ስም አርም', 'Edit')}</span>
                              </button>
                            )}
                            <button
                              onClick={() => onOpenPhotoModal(s.uid)}
                              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                              title={t('ፎቶ ማያያዣ', 'Attach Photo')}
                            >
                              <Camera className="w-4 h-4 inline" />
                            </button>
                            <button
                              onClick={() => onSelectPrintTranscript(s)}
                              className="inline-flex items-center gap-1 bg-emerald-800 hover:bg-emerald-900 text-white text-[11px] px-3 py-1.5 rounded-lg font-bold shadow-xs transition-colors"
                              title={t('ይፋዊ ትራንስክሪፕት አዘጋጅ', 'Prepare Official Transcript')}
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>{t('ትራንስክሪፕት', 'Transcript')}</span>
                            </button>
                            <button
                              onClick={() => onDeleteStudent(s.uid)}
                              className="p-1.5 rounded-lg text-rose-600 hover:text-rose-800 hover:bg-rose-50 transition-colors"
                              title={t('ሰርዝ', 'Delete')}
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
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-4 sm:p-6 space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
                <BellRing className="w-5 h-5 text-amber-600 shrink-0" />
                <span>{t('የመምህራን የኮርስ ምደባና የማሳወቂያ ሰሌዳ', 'Instructor Course Assignments & Notices')}</span>
              </h3>
              <p className="text-xs text-slate-500">
                {t(
                  'የተመደቡ መምህራንን መመልከት እና የማሳወቂያ መልእክት (Notice Memo) መላክ',
                  'View assigned instructors and send course assignment notice memos'
                )}
              </p>
            </div>
          </div>

          {/* Mobile Teacher Assignment Cards */}
          <div className="md:hidden space-y-2.5">
            {courses.map((c, idx) => (
              <div key={c.id} className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold mb-1 ${
                      c.program === 'Degree' ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {idx + 1}. {formatProgram(c.program, lang)}
                    </span>
                    <p className="font-bold text-slate-900 text-sm">{formatCourseTitle(c.name, lang)}</p>
                    <p className="text-[11px] text-amber-900 font-semibold mt-0.5">{formatSchedule(c.schedule, lang)}</p>
                    <p className="text-xs text-slate-700 mt-1">
                      {t('መምህር:', 'Instructor:')} <strong>{formatTeacherDisplay(c.teacher, lang)}</strong>
                    </p>
                  </div>
                  {c.teacher === 'አልተመደበም (—)' ? (
                    <span className="px-2 py-0.5 rounded text-[10px] bg-rose-100 text-rose-800 font-bold shrink-0">{t('ክፍት ቦታ', 'Unassigned')}</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 font-bold shrink-0">{t('ተመድቧል', 'Assigned')}</span>
                  )}
                </div>
                {c.teacher !== 'አልተመደበም (—)' && (
                  <button
                    onClick={() => handleNotifyTeacher(c.teacher, c.name, c.schedule)}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-xs flex items-center justify-center gap-1.5 min-h-[38px]"
                  >
                    <BellRing className="w-3.5 h-3.5" />
                    <span>{t('ምደባ አሳውቅ', 'Send Notice')}</span>
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[11px] rounded-lg">
                <tr>
                  <th className="p-3">{t('ተ/ቁ', 'No.')}</th>
                  <th className="p-3">{t('ፕሮግራም', 'Program')}</th>
                  <th className="p-3">{t('ቀን / የጊዜ ሰሌዳ', 'Schedule / Term')}</th>
                  <th className="p-3">{t('የኮርስ ስም', 'Course Title')}</th>
                  <th className="p-3">{t('የተመደበ መምህር', 'Assigned Instructor')}</th>
                  <th className="p-3 text-center">{t('ሁኔታ', 'Status')}</th>
                  <th className="p-3 text-right">{t('ማሳወቂያ', 'Notice')}</th>
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
                        {formatProgram(c.program, lang)}
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-amber-900 bg-amber-50/50 rounded">{formatSchedule(c.schedule, lang)}</td>
                    <td className="p-3 font-bold text-slate-900">{formatCourseTitle(c.name, lang)}</td>
                    <td className="p-3 font-semibold text-slate-800">{formatTeacherDisplay(c.teacher, lang)}</td>
                    <td className="p-3 text-center">
                      {c.teacher === 'አልተመደበም (—)' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-rose-100 text-rose-800 font-bold">
                          {t('ክፍት ቦታ', 'Unassigned')}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{t('ተመድቧል', 'Assigned')}</span>
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
                          <span>{t('ምደባ አሳውቅ', 'Send Notice')}</span>
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
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-3">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-indigo-700 shrink-0" />
                <span>{t('የተማሪዎች አጠቃላይ የውጤት መመልከቻና ማውረጃ (Master Grade Sheet)', 'Master Grade Sheet & Export')}</span>
              </h3>
              <p className="text-xs text-slate-500">
                {t('የትምህርት ዘመን', 'Academic Year')} {formatCalendarYear(currentYear, lang)} ({formatSemester(currentSemester, lang)})
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
              <button
                type="button"
                onClick={() => exportMasterSemesterGradeSheetToExcel(students, courses, grades, currentYear, currentSemester, programFilter)}
                className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs px-3 py-2 rounded-xl font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer min-h-[38px]"
                title={t('አጠቃላይ ውጤቱን በማይክሮሶፍት ኤክሴል ፋይል አውርድ', 'Export Master Grade Sheet as Excel (.xlsx)')}
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-200 shrink-0" />
                <span>{t('ጠቅላላ ኤክሴል (.xlsx)', 'Master Excel (.xlsx)')}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsMasterPdfOpen(true)}
                className="bg-cyan-50 hover:bg-cyan-100 text-cyan-950 border border-cyan-300 text-xs px-3 py-2 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs min-h-[38px]"
                title={t('አጠቃላይ ውጤቱን በይፋዊ ፒዲኤፍ (PDF) ለማየትና ለማተም', 'Preview & Print Official Master PDF')}
              >
                <Printer className="w-4 h-4 text-cyan-700 shrink-0" />
                <span>{t('ጠቅላላ ሰነድ (PDF)', 'Master PDF')}</span>
              </button>

              <button
                type="button"
                onClick={handleExportMasterGradeSheet}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-3 py-2 rounded-xl font-bold flex items-center gap-1.5 border border-slate-300 cursor-pointer min-h-[38px]"
                title={t('በCSV ፋይል ለማውረድ', 'Download as CSV')}
              >
                <Download className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>{t('CSV ፋይል', 'CSV File')}</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto max-h-96 overflow-y-auto border rounded-2xl">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-100/95 sticky top-0 font-bold uppercase text-[10px] z-20">
                <tr>
                  <th className="p-2.5 border-b bg-slate-100">ID</th>
                  <th className="p-2.5 border-b bg-slate-100 sticky left-0 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)]">{t('የተማሪ ስም', 'Student Name')}</th>
                  <th className="p-2.5 border-b">{t('ፕሮግራም', 'Program')}</th>
                  {courses.slice(0, 8).map((c) => (
                    <th key={c.id} className="p-2.5 border-b text-center whitespace-nowrap" title={formatCourseTitle(c.name, lang)}>
                      {formatCourseTitle(c.name, lang).slice(0, 10)}..
                    </th>
                  ))}
                  <th className="p-2.5 border-b text-center">GPA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((s) => {
                  const gpa = calculateStudentGPA(s, courses, grades, currentYear, currentSemester);

                  return (
                    <tr key={s.uid} className="hover:bg-slate-50">
                      <td className="p-2 font-mono font-bold whitespace-nowrap">{s.id}</td>
                      <td className="p-2 font-bold text-slate-900 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] whitespace-nowrap">{s.name}</td>
                      <td className="p-2">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          s.program === 'Degree' ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {formatProgram(s.program, lang)}
                        </span>
                      </td>
                      {courses.slice(0, 8).map((c) => {
                        if (c.program === s.program) {
                          const targetYear = c.academicYear || currentYear;
                          const targetSem = c.semester || (c.schedule && c.schedule.includes('2ኛ') ? '2' : '1') || currentSemester;
                          const g = resolveGradeBreakdown(grades, s.uid, c.id, targetYear, targetSem, s.id);
                          const eff = getEffectiveGradeValues(g, getCourseAssessmentItems(c));
                          return (
                            <td key={c.id} className="p-2 text-center font-mono font-bold text-slate-700">
                              {eff.hasAny ? (
                                <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-bold">
                                  {eff.total}
                                </span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
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
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-4 sm:p-6 space-y-4">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b pb-4">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-emerald-700 shrink-0" />
                <span>{t('የኮርስ ውጤት ማስገቢያ፣ ኤክሴልና ፒዲኤፍ', 'Course Grade Entry, Excel & PDF')}</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {t('የትምህርት ዘመን', 'Academic Year')} {formatCalendarYear(currentYear, lang)} ({formatSemester(currentSemester, lang)}) — {t('መምህር:', 'Instructor:')} <span className="font-bold text-slate-700">{formatTeacherDisplay(selectedCourse?.teacher, lang)}</span> | {t('ተማሪዎች:', 'Students:')} <span className="font-bold text-slate-700">{enrolledStudents.length}</span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
              {/* Course Selector */}
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="w-full sm:w-auto max-w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-emerald-700 cursor-pointer min-h-[40px]"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    [{formatProgram(c.program, lang)}] {formatCourseTitle(c.name, lang)} — {formatTeacherDisplay(c.teacher, lang)}
                  </option>
                ))}
              </select>

              {/* Excel Upload Button */}
              <button
                type="button"
                onClick={() => setIsExcelUploadOpen(true)}
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border border-emerald-400 text-xs px-3 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs min-h-[38px]"
                title={t('ውጤት ከማይክሮሶፍት ኤክሴል (.xlsx / .csv) ለመጫን', 'Upload scores from Excel (.xlsx / .csv)')}
              >
                <Upload className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span>{t('ኤክሴል ጫን', 'Upload Excel')}</span>
              </button>

              {/* Excel Download Button */}
              <button
                type="button"
                onClick={handleExportCourseExcel}
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border border-emerald-400 text-xs px-3 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs min-h-[38px]"
                title={t('የዚህን ኮርስ ውጤት በኤክሴል (.xlsx) ለማውረድ', 'Download course grades as Excel (.xlsx)')}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span>{t('ኤክሴል አውርድ', 'Download Excel')}</span>
              </button>

              {/* Official PDF Button */}
              <button
                type="button"
                onClick={() => setIsPdfModalOpen(true)}
                className="bg-cyan-50 hover:bg-cyan-100 text-cyan-950 border border-cyan-300 text-xs px-3 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs min-h-[38px]"
                title={t('ይፋዊ የውጤት ሰነድ ለማተም ወይም በፒዲኤፍ (PDF) ለማስቀመጥ', 'Print or save official course grade report PDF')}
              >
                <Printer className="w-3.5 h-3.5 text-cyan-700 shrink-0" />
                <span>{t('ሰነድ (PDF)', 'Report (PDF)')}</span>
              </button>

              {/* Save All Button */}
              {onSaveGrades && (
                <button
                  type="button"
                  onClick={handleSaveCourseGrades}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 shadow-sm cursor-pointer min-h-[38px]"
                >
                  <Save className="w-3.5 h-3.5 shrink-0" />
                  <span>{t('ለውጦችን መዝግብ', 'Save Changes')}</span>
                </button>
              )}
            </div>
          </div>

          {(() => {
            if (!selectedCourse) {
              return <div className="text-xs text-slate-500 py-6 text-center">{t('እባክዎ መጀመሪያ ኮርስ ይምረጡ።', 'Please select a course first.')}</div>;
            }

            const criteria = getCourseAssessmentItems(selectedCourse);
            const totalWeight = criteria.reduce((sum, it) => sum + (Number(it.max) || 0), 0);

            return isMobileViewport ? (
              <div className="space-y-3">
                {enrolledStudents.map((s) => (
                  <StandardGradeMobileCard
                    key={s.uid}
                    student={s}
                    breakdown={localGrades[s.uid]}
                    criteria={criteria}
                    onScoreChange={handleScoreChange}
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
                        {t('ፊደል', 'Grade')}
                      </th>
                      <th className="p-2.5 text-center bg-slate-100 text-slate-800">{t('ነጥብ', 'Points')}</th>
                    </tr>
                  </thead>
                  <tbody ref={regTbodyRef} className="divide-y divide-slate-100">
                    {enrolledStudents.map((s, idx) => (
                      <StandardGradeDesktopRow
                        key={s.uid}
                        student={s}
                        rowIndex={idx}
                        breakdown={localGrades[s.uid]}
                        criteria={criteria}
                        onScoreChange={handleScoreChange}
                        onCellKeyDown={handleRegCellKeyDown}
                      />
                    ))}
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
