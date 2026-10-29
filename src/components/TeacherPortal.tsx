import React, { useState, useEffect, useRef } from 'react';
import {
  GraduationCap,
  Save,
  BookOpen,
  AlertCircle,
  Calendar,
  CheckCircle2,
  SlidersHorizontal,
  RotateCcw,
  X,
  Check,
  Edit3,
  Plus,
  Trash2,
  Sparkles,
  Layers,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  MoveHorizontal,
  FileSpreadsheet,
  Upload,
  Download,
  Printer,
  FileText,
  Shield,
  Award,
  UserCheck,
  CheckCheck,
  Copy
} from 'lucide-react';
import {
  AssessmentCriterionItem,
  Course,
  CourseAssessmentConfig,
  GradeBreakdown,
  OfficialSignaturesConfig,
  Student,
  UserRole
} from '../types.ts';
import { sortStudentsByAmharicName } from '../utils/amharicSort.ts';

import {
  calculateGradeDetails,
  DEFAULT_ASSESSMENT_CONFIG,
  DEFAULT_ASSESSMENT_ITEMS,
  getCourseAssessmentConfig,
  getCourseAssessmentItems,
  getCriterionScore,
  getEffectiveGradeValues,
  getGradeKey,
  resolveGradeBreakdown
} from '../utils/gradeCalculations.ts';
import { OFFICIAL_GRADING_SCALE } from '../data/initialData.ts';
import { exportCourseGradesToExcel, downloadCourseGradeTemplateExcel } from '../utils/excelUtils.ts';
import { ExcelUploadModal } from './ExcelUploadModal.tsx';
import { CourseGradeReportPdfModal } from './CourseGradeReportPdfModal.tsx';
import { BatchScoreFillModal } from './BatchScoreFillModal.tsx';
import { syncGradesToFirestore } from '../services/firebaseSync.ts';

// Dynamic Color Palette for criteria columns and cards
export const CRITERIA_COLORS = [
  { name: 'emerald', border: 'border-emerald-300', bg: 'bg-emerald-50/80', badge: 'bg-emerald-100 text-emerald-900', text: 'text-emerald-700', headerBorder: 'border-emerald-500', headerBg: 'bg-emerald-50 text-emerald-950', focus: 'focus:ring-emerald-700' },
  { name: 'cyan', border: 'border-cyan-300', bg: 'bg-cyan-50/80', badge: 'bg-cyan-100 text-cyan-900', text: 'text-cyan-700', headerBorder: 'border-cyan-500', headerBg: 'bg-cyan-50 text-cyan-950', focus: 'focus:ring-cyan-700' },
  { name: 'indigo', border: 'border-indigo-300', bg: 'bg-indigo-50/80', badge: 'bg-indigo-100 text-indigo-900', text: 'text-indigo-700', headerBorder: 'border-indigo-500', headerBg: 'bg-indigo-50 text-indigo-950', focus: 'focus:ring-indigo-700' },
  { name: 'amber', border: 'border-amber-300', bg: 'bg-amber-50/80', badge: 'bg-amber-100 text-amber-900', text: 'text-amber-700', headerBorder: 'border-amber-500', headerBg: 'bg-amber-50 text-amber-950', focus: 'focus:ring-amber-700' },
  { name: 'purple', border: 'border-purple-300', bg: 'bg-purple-50/80', badge: 'bg-purple-100 text-purple-900', text: 'text-purple-700', headerBorder: 'border-purple-500', headerBg: 'bg-purple-50 text-purple-950', focus: 'focus:ring-purple-700' },
  { name: 'rose', border: 'border-rose-300', bg: 'bg-rose-50/80', badge: 'bg-rose-100 text-rose-900', text: 'text-rose-700', headerBorder: 'border-rose-500', headerBg: 'bg-rose-50 text-rose-950', focus: 'focus:ring-rose-700' },
  { name: 'teal', border: 'border-teal-300', bg: 'bg-teal-50/80', badge: 'bg-teal-100 text-teal-900', text: 'text-teal-700', headerBorder: 'border-teal-500', headerBg: 'bg-teal-50 text-teal-950', focus: 'focus:ring-teal-700' },
  { name: 'orange', border: 'border-orange-300', bg: 'bg-orange-50/80', badge: 'bg-orange-100 text-orange-900', text: 'text-orange-700', headerBorder: 'border-orange-500', headerBg: 'bg-orange-50 text-orange-950', focus: 'focus:ring-orange-700' }
];

export function getCriterionColor(index: number) {
  return CRITERIA_COLORS[index % CRITERIA_COLORS.length];
}

interface TeacherPortalProps {
  teacherName: string;
  courses: Course[];
  students: Student[];
  grades: Record<string, GradeBreakdown>;
  currentYear: string;
  currentSemester: string;
  onSaveGrades: (updatedGrades: Record<string, GradeBreakdown>) => void;
  showNotify: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  onUpdateCourse?: (course: Course) => void;
  userRole?: UserRole;
  teachers?: string[];
  churchLogo?: string;
  officialConfig?: OfficialSignaturesConfig;
}

export const TeacherPortal: React.FC<TeacherPortalProps> = ({
  teacherName,
  courses,
  students,
  grades,
  currentYear,
  currentSemester,
  onSaveGrades,
  showNotify,
  onUpdateCourse,
  userRole = 'TEACHER',
  teachers = [],
  churchLogo,
  officialConfig
}) => {
  const isElevatedRole = userRole === 'ADMIN' || userRole === 'DEAN' || userRole === 'REGISTRAR';
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState<string>('ALL');

  const accessibleCourses = isElevatedRole
    ? selectedTeacherFilter === 'ALL'
      ? courses
      : courses.filter((c) => c.teacher === selectedTeacherFilter)
    : courses.filter((c) => c.teacher === teacherName);

  const [selectedCourseId, setSelectedCourseId] = useState<string>(
    accessibleCourses[0]?.id || courses[0]?.id || ''
  );
  const [selectedSemesterFilter, setSelectedSemesterFilter] = useState<string>(currentSemester || '1');
  const [localGrades, setLocalGrades] = useState<Record<string, GradeBreakdown>>({});

  // Assessment Scheme & Export/Import & Batch Fill Modal States
  const [isSchemeModalOpen, setIsSchemeModalOpen] = useState(false);
  const [isExcelUploadOpen, setIsExcelUploadOpen] = useState(false);
  const [isBatchFillOpen, setIsBatchFillOpen] = useState(false);
  const [batchInitialCriterionId, setBatchInitialCriterionId] = useState<string | undefined>(undefined);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [pdfAutoDownload, setPdfAutoDownload] = useState(false);
  const [isInlineEditorOpen, setIsInlineEditorOpen] = useState(true);
  const [modalViewMode, setModalViewMode] = useState<'horizontal' | 'grid'>('horizontal');
  const [isSavingGrades, setIsSavingGrades] = useState(false);
  const inlineScrollRef = useRef<HTMLDivElement>(null);
  const modalScrollRef = useRef<HTMLDivElement>(null);

  const handleTriggerDirectPdfDownload = () => {
    if (!activeCourse) return;
    setPdfAutoDownload(true);
    setIsPdfModalOpen(true);
    showNotify(`የ${activeCourse.name} ውጤት ሰነድ በፒዲኤፍ (PDF) በቀጥታ በመውረድ ላይ ነው...`, 'info');
  };

  const handleOpenPdfPreview = () => {
    setPdfAutoDownload(false);
    setIsPdfModalOpen(true);
  };

  const scrollHorizontal = (ref: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right') => {
    if (ref.current) {
      const amount = direction === 'left' ? -280 : 280;
      ref.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (accessibleCourses.length > 0 && (!selectedCourseId || !accessibleCourses.some((c) => c.id === selectedCourseId))) {
      setSelectedCourseId(accessibleCourses[0].id);
    }
  }, [accessibleCourses, selectedCourseId]);

  const activeCourse = courses.find((c) => c.id === selectedCourseId);
  const activeItems = getCourseAssessmentItems(activeCourse);

  const [editingItems, setEditingItems] = useState<AssessmentCriterionItem[]>(() =>
    getCourseAssessmentItems(activeCourse)
  );

  // Sync scheme edit form when active course changes
  useEffect(() => {
    if (activeCourse) {
      setEditingItems(getCourseAssessmentItems(activeCourse));
    }
  }, [activeCourse?.id, activeCourse?.assessmentConfig]);

  // Sync initial local grades for this course & semester
  useEffect(() => {
    const course = courses.find((c) => c.id === selectedCourseId);
    if (!course) return;

    const targetYear = course.academicYear || currentYear;
    const targetSem = course.semester || selectedSemesterFilter || currentSemester;

    const enrolled = students.filter((s) => s.program === course.program);
    const initial: Record<string, GradeBreakdown> = {};

    enrolled.forEach((s) => {
      const existing = resolveGradeBreakdown(grades, s.uid, course.id, targetYear, targetSem, s.id);
      initial[s.uid] = { ...existing };
    });

    setLocalGrades(initial);
  }, [selectedCourseId, courses, students, grades, currentYear, selectedSemesterFilter, currentSemester]);

  const enrolledStudents = activeCourse
    ? sortStudentsByAmharicName(students.filter((s) => s.program === activeCourse.program))
    : [];


  // Excel-like Keyboard Navigation (Arrow Keys / Enter / Tab) for score input grid
  const handleCellKeyDown = (
    e: React.KeyboardEvent<HTMLElement>,
    r: number,
    c: number
  ) => {
    const maxRows = enrolledStudents.length;
    const maxCols = activeItems.length + 3; // criteria + total + letter + desc

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
      if (
        input.tagName === 'SELECT' ||
        input.selectionStart === null ||
        input.selectionStart === input.value.length
      ) {
        e.preventDefault();
        nextC = Math.min(maxCols - 1, c + 1);
      }
    } else if (e.key === 'ArrowLeft') {
      const input = e.currentTarget as HTMLInputElement;
      if (
        input.tagName === 'SELECT' ||
        input.selectionStart === null ||
        input.selectionStart === 0
      ) {
        e.preventDefault();
        nextC = Math.max(0, c - 1);
      }
    } else {
      return;
    }

    const target = document.querySelector<HTMLElement>(
      `[data-cell-r="${nextR}"][data-cell-c="${nextC}"]`
    );
    if (target) {
      target.focus();
      if (target instanceof HTMLInputElement) {
        target.select();
      }
    }
  };

  // Add new criterion (መመዘኛ ጨምር)
  const handleAddCriterion = (customLabel?: string, customMax?: number) => {
    if (editingItems.length >= 10) {
      showNotify('ከ 10 መመዘኛ በላይ ማከል አይቻልም!', 'warning');
      return;
    }
    const nextNum = editingItems.length + 1;
    const newItem: AssessmentCriterionItem = {
      id: 'crit_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 5),
      label: customLabel || `መመዘኛ ${nextNum}`,
      max: typeof customMax === 'number' ? customMax : 10
    };
    setEditingItems((prev) => [...prev, newItem]);
    showNotify(`አዲስ መመዘኛ (${newItem.label}) ተጨምሯል!`, 'info');
  };

  // Remove/decrease criterion (መመዘኛ ቀንስ/አጥፋ)
  const handleRemoveCriterion = (index: number) => {
    if (editingItems.length <= 1) {
      showNotify('ቢያንስ 1 የውጤት መመዘኛ መኖር አለበት!', 'warning');
      return;
    }
    const removed = editingItems[index];
    setEditingItems((prev) => prev.filter((_, i) => i !== index));
    showNotify(`መመዘኛ '${removed?.label}' ተቀንሷል!`, 'info');
  };

  // Quick remove last criterion (የመጨረሻውን መመዘኛ ቀንስ)
  const handleRemoveLastCriterion = () => {
    if (editingItems.length <= 1) {
      showNotify('ቢያንስ 1 የውጤት መመዘኛ መኖር አለበት!', 'warning');
      return;
    }
    const last = editingItems[editingItems.length - 1];
    setEditingItems((prev) => prev.slice(0, -1));
    showNotify(`የመጨረሻው መመዘኛ '${last.label}' ተቀንሷል!`, 'info');
  };

  // Step criterion weight by delta (+5, -5)
  const handleStepCriterionWeight = (index: number, delta: number) => {
    setEditingItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const current = Number(item.max) || 0;
        const next = Math.max(0, Math.min(100, current + delta));
        return { ...item, max: next };
      })
    );
  };

  // Direct remove criterion from main table
  const handleDirectRemoveCriterionFromTable = (criterionId: string, label: string) => {
    if (!activeCourse) return;
    if (activeItems.length <= 1) {
      showNotify('ቢያንስ 1 የውጤት መመዘኛ መኖር አለበት!', 'warning');
      return;
    }
    if (window.confirm(`እርግጠኛ ነዎት? '${label}' የሚለውን መመዘኛ መቀነስ/ማጥፋት ይፈልጋሉ?`)) {
      const remaining = activeItems.filter((it) => it.id !== criterionId);
      const updatedCourse: Course = {
        ...activeCourse,
        assessmentConfig: {
          items: remaining,
          p1Label: remaining[0]?.label || 'ክፍል 1',
          p1Max: remaining[0]?.max || 20,
          p2Label: remaining[1]?.label || 'ክፍል 2',
          p2Max: remaining[1]?.max || 20,
          midLabel: remaining[2]?.label || 'ሚድ',
          midMax: remaining[2]?.max || 30,
          finalLabel: remaining[3]?.label || 'ፋይናል',
          finalMax: remaining[3]?.max || 20,
          attLabel: remaining[4]?.label || 'ተሳትፎ',
          attMax: remaining[4]?.max || 10
        }
      };
      if (onUpdateCourse) {
        onUpdateCourse(updatedCourse);
      }
      showNotify(`'${label}' የሚለው መመዘኛ ተቀንሷል!`, 'info');
    }
  };

  // Update criterion label or max percentage
  const handleCriterionItemChange = (index: number, field: 'label' | 'max', val: string | number) => {
    setEditingItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        if (field === 'max') {
          const num = Math.max(0, Math.min(100, typeof val === 'string' ? parseFloat(val) || 0 : val));
          return { ...item, max: num };
        }
        return { ...item, label: String(val) };
      })
    );
  };

  // Apply quick criteria presets
  const handleApplyPreset = (presetName: '2' | '3' | '4' | '5' | '6') => {
    if (presetName === '2') {
      setEditingItems([
        { id: 'crit_1', label: 'ሚድ ፈተና', max: 40 },
        { id: 'crit_2', label: 'ፋይናል ፈተና', max: 60 }
      ]);
    } else if (presetName === '3') {
      setEditingItems([
        { id: 'crit_1', label: 'አሳይመንት', max: 30 },
        { id: 'crit_2', label: 'ሚድ ፈተና', max: 30 },
        { id: 'crit_3', label: 'ፋይናል ፈተና', max: 40 }
      ]);
    } else if (presetName === '4') {
      setEditingItems([
        { id: 'crit_1', label: 'ክፍል 1', max: 20 },
        { id: 'crit_2', label: 'ክፍል 2', max: 20 },
        { id: 'crit_3', label: 'ሚድ ፈተና', max: 30 },
        { id: 'crit_4', label: 'ፋይናል ፈተና', max: 30 }
      ]);
    } else if (presetName === '5') {
      setEditingItems([
        { id: 'p1', label: 'ክፍል 1', max: 20 },
        { id: 'p2', label: 'ክፍል 2', max: 20 },
        { id: 'mid', label: 'ሚድ', max: 30 },
        { id: 'final', label: 'ፋይናል', max: 20 },
        { id: 'att', label: 'ተሳትፎ', max: 10 }
      ]);
    } else if (presetName === '6') {
      setEditingItems([
        { id: 'crit_1', label: 'አሳይመንት 1', max: 15 },
        { id: 'crit_2', label: 'አሳይመንት 2', max: 15 },
        { id: 'crit_3', label: 'የቡድን ስራ', max: 10 },
        { id: 'crit_4', label: 'ሚድ ፈተና', max: 25 },
        { id: 'crit_5', label: 'ፋይናል ፈተና', max: 25 },
        { id: 'crit_6', label: 'ተሳትፎ', max: 10 }
      ]);
    }
  };

  // Auto-balance criteria weights to 100%
  const handleAutoBalance = () => {
    const currentTotal = editingItems.reduce((acc, it) => acc + (Number(it.max) || 0), 0);
    if (currentTotal === 100) {
      showNotify('መቶኛው አስቀድሞ 100% ነው!', 'info');
      return;
    }
    const diff = 100 - currentTotal;
    const lastIndex = editingItems.length - 1;
    const lastItem = editingItems[lastIndex];
    if (lastItem && lastItem.max + diff >= 1) {
      setEditingItems((prev) =>
        prev.map((it, i) => (i === lastIndex ? { ...it, max: it.max + diff } : it))
      );
      showNotify(`የመጨረሻው መመዘኛ (${lastItem.label}) ተስተካክሎ ድምሩ 100% ሆኗል!`, 'success');
    } else {
      const factor = 100 / (currentTotal || 1);
      let running = 0;
      setEditingItems((prev) =>
        prev.map((it, i) => {
          if (i === prev.length - 1) {
            return { ...it, max: Math.max(1, 100 - running) };
          }
          const m = Math.max(1, Math.round(it.max * factor));
          running += m;
          return { ...it, max: m };
        })
      );
      showNotify('መቶኛዎቹ በሙሉ ተስተካክለው ድምሩ 100% ሆኗል!', 'success');
    }
  };

  // Save customized assessment criteria & weights
  const handleSaveEditingScheme = () => {
    if (!activeCourse) return;

    const totalWeight = editingItems.reduce((sum, item) => sum + (Number(item.max) || 0), 0);

    const updatedCourse: Course = {
      ...activeCourse,
      assessmentConfig: {
        items: editingItems.map((it) => ({
          id: it.id,
          label: it.label.trim() || 'መመዘኛ',
          max: Number(it.max) || 10
        })),
        p1Label: editingItems[0]?.label || 'ክፍል 1',
        p1Max: editingItems[0]?.max || 20,
        p2Label: editingItems[1]?.label || 'ክፍል 2',
        p2Max: editingItems[1]?.max || 20,
        midLabel: editingItems[2]?.label || 'ሚድ',
        midMax: editingItems[2]?.max || 30,
        finalLabel: editingItems[3]?.label || 'ፋይናል',
        finalMax: editingItems[3]?.max || 20,
        attLabel: editingItems[4]?.label || 'ተሳትፎ',
        attMax: editingItems[4]?.max || 10
      }
    };

    if (onUpdateCourse) {
      onUpdateCourse(updatedCourse);
    }

    setIsSchemeModalOpen(false);
    showNotify(
      `የኮርሱ የውጤት መመዘኛዎችና መቶኛዎች በስኬት ተስተካክለዋል! (${editingItems.length} መመዘኛዎች፣ ጠቅላላ መቶኛ፡ ${totalWeight}%)`,
      'success'
    );
  };

  const handleSaveScheme = (e: React.FormEvent) => {
    e.preventDefault();
    handleSaveEditingScheme();
  };

  const handleResetSchemeToDefault = () => {
    setEditingItems(DEFAULT_ASSESSMENT_ITEMS.map((item) => ({ ...item })));
  };

  // Export grades to Excel (.xlsx)
  const handleExportExcel = () => {
    if (!activeCourse) return;
    exportCourseGradesToExcel(activeCourse, students, localGrades, currentYear, currentSemester);
    showNotify(`የ${activeCourse.name} ውጤት ኤክሴል ሰነድ (.xlsx) በስኬት ወርዷል!`, 'success');
  };

  // Download pre-filled template
  const handleDownloadTemplate = () => {
    if (!activeCourse) return;
    downloadCourseGradeTemplateExcel(activeCourse, students);
    showNotify(`የ${activeCourse.name} የውጤት ማስገቢያ ኤክሴል አብነት ወርዷል!`, 'success');
  };

  // Apply imported scores from ExcelUploadModal with INSTANT PERSISTENCE to database & state
  const handleApplyImportedScores = (scoresByUid: Record<string, Record<string, number>>) => {
    if (!activeCourse) return;
    const targetYear = activeCourse.academicYear || currentYear;
    const targetSem = activeCourse.semester || selectedSemesterFilter || currentSemester;

    const updatedLocal = { ...localGrades };
    const updatedGlobal = { ...grades };

    Object.entries(scoresByUid).forEach(([uid, newScores]) => {
      const studentObj = students.find((s) => s.uid === uid || s.id === uid);
      const studentId = studentObj?.id || uid;

      const current = updatedLocal[uid] || resolveGradeBreakdown(grades, uid, activeCourse.id, targetYear, targetSem, studentId);
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

      updatedLocal[uid] = updatedBreakdown;

      // Persist across canonical and fallback keys so student portal and transcripts immediately show it
      const keyByUid = getGradeKey(uid, activeCourse.id, targetYear, targetSem);
      const keyById = getGradeKey(studentId, activeCourse.id, targetYear, targetSem);
      const directKey = `${uid}_${activeCourse.id}`;
      const defaultYearKey = getGradeKey(uid, activeCourse.id, currentYear, currentSemester);

      updatedGlobal[keyByUid] = updatedBreakdown;
      updatedGlobal[keyById] = updatedBreakdown;
      updatedGlobal[directKey] = updatedBreakdown;
      updatedGlobal[defaultYearKey] = updatedBreakdown;
    });

    setLocalGrades(updatedLocal);
    onSaveGrades(updatedGlobal);
    try {
      localStorage.setItem('bk_grades', JSON.stringify(updatedGlobal));
    } catch (_) {}

    showNotify(`የ${Object.keys(scoresByUid).length} ተማሪዎች ውጤት ወዲያውኑ በስኬት በሲስተሙ ተመዝግቧል!`, 'success');
  };

  // Apply batch fill scores with instant persistence
  const handleApplyBatchScores = (updatedLocal: Record<string, GradeBreakdown>, summaryMsg: string) => {
    if (!activeCourse) return;
    const targetYear = activeCourse.academicYear || currentYear;
    const targetSem = activeCourse.semester || selectedSemesterFilter || currentSemester;

    setLocalGrades(updatedLocal);

    // Sync to global grades state & persistence
    const updatedGlobal = { ...grades };
    enrolledStudents.forEach((s) => {
      const breakdown = updatedLocal[s.uid];
      if (breakdown) {
        const keyByUid = getGradeKey(s.uid, activeCourse.id, targetYear, targetSem);
        const keyById = getGradeKey(s.id, activeCourse.id, targetYear, targetSem);
        const directKey = `${s.uid}_${activeCourse.id}`;
        const defaultYearKey = getGradeKey(s.uid, activeCourse.id, currentYear, currentSemester);

        updatedGlobal[keyByUid] = breakdown;
        updatedGlobal[keyById] = breakdown;
        updatedGlobal[directKey] = breakdown;
        updatedGlobal[defaultYearKey] = breakdown;
      }
    });

    onSaveGrades(updatedGlobal);
    try {
      localStorage.setItem('bk_grades', JSON.stringify(updatedGlobal));
    } catch (_) {}

    showNotify(summaryMsg, 'success');
  };

  // Handle changing numeric criterion for a student
  const handleCriterionScoreChange = (
    studentUid: string,
    itemId: string,
    val: string,
    maxVal: number,
    itemIndex: number
  ) => {
    const clean = val.trim();
    const parsed = clean === '' ? 0 : Math.min(maxVal, Math.max(0, parseFloat(clean) || 0));

    setLocalGrades((prev) => {
      const current = prev[studentUid] || { p1: 0, p2: 0, mid: 0, final: 0, att: 0 };
      const currentScores = current.scores ? { ...current.scores } : {};

      // Seed any missing criterion scores
      activeItems.forEach((it, idx) => {
        if (currentScores[it.id] === undefined) {
          currentScores[it.id] = getCriterionScore(current, it.id, idx);
        }
      });

      currentScores[itemId] = parsed;

      const updatedItem: GradeBreakdown = {
        ...current,
        scores: currentScores,
        ...(itemId === 'p1' || itemIndex === 0 ? { p1: parsed } : {}),
        ...(itemId === 'p2' || itemIndex === 1 ? { p2: parsed } : {}),
        ...(itemId === 'mid' || itemIndex === 2 ? { mid: parsed } : {}),
        ...(itemId === 'final' || itemIndex === 3 ? { final: parsed } : {}),
        ...(itemId === 'att' || itemIndex === 4 ? { att: parsed } : {})
      };

      try {
        if (activeCourse) {
          const targetYear = activeCourse.academicYear || currentYear;
          const targetSem = activeCourse.semester || selectedSemesterFilter || currentSemester;
          const keyByUid = getGradeKey(studentUid, activeCourse.id, targetYear, targetSem);
          const directKey = `${studentUid}_${activeCourse.id}`;
          const currentStored = JSON.parse(localStorage.getItem('bk_grades') || '{}');
          currentStored[keyByUid] = updatedItem;
          currentStored[directKey] = updatedItem;
          localStorage.setItem('bk_grades', JSON.stringify(currentStored));
        }
      } catch (_) {}

      return {
        ...prev,
        [studentUid]: updatedItem
      };
    });
  };

  // Handle direct edit of Total (ድምር 100%)
  const handleCustomTotalChange = (studentUid: string, val: string) => {
    const clean = val.trim();
    setLocalGrades((prev) => {
      const current = prev[studentUid] || { p1: 0, p2: 0, mid: 0, final: 0, att: 0 };
      let updatedItem: GradeBreakdown;
      if (clean === '') {
        const copy = { ...current };
        delete copy.customTotal;
        updatedItem = copy;
      } else {
        const num = Math.min(100, Math.max(0, parseFloat(clean) || 0));
        updatedItem = {
          ...current,
          customTotal: num
        };
      }

      try {
        if (activeCourse) {
          const targetYear = activeCourse.academicYear || currentYear;
          const targetSem = activeCourse.semester || selectedSemesterFilter || currentSemester;
          const keyByUid = getGradeKey(studentUid, activeCourse.id, targetYear, targetSem);
          const directKey = `${studentUid}_${activeCourse.id}`;
          const currentStored = JSON.parse(localStorage.getItem('bk_grades') || '{}');
          currentStored[keyByUid] = updatedItem;
          currentStored[directKey] = updatedItem;
          localStorage.setItem('bk_grades', JSON.stringify(currentStored));
        }
      } catch (_) {}

      return {
        ...prev,
        [studentUid]: updatedItem
      };
    });
  };

  // Handle direct edit/override of Letter Grade (ፊደል ደረጃ)
  const handleCustomLetterChange = (studentUid: string, letter: string) => {
    setLocalGrades((prev) => {
      const current = prev[studentUid] || { p1: 0, p2: 0, mid: 0, final: 0, att: 0 };
      let updatedItem: GradeBreakdown;
      if (!letter) {
        const copy = { ...current };
        delete copy.customLetter;
        updatedItem = copy;
      } else {
        const matched = OFFICIAL_GRADING_SCALE.find((g) => g.letter === letter);
        updatedItem = {
          ...current,
          customLetter: letter,
          customDesc: current.customDesc ?? matched?.desc
        };
      }

      try {
        if (activeCourse) {
          const targetYear = activeCourse.academicYear || currentYear;
          const targetSem = activeCourse.semester || selectedSemesterFilter || currentSemester;
          const keyByUid = getGradeKey(studentUid, activeCourse.id, targetYear, targetSem);
          const directKey = `${studentUid}_${activeCourse.id}`;
          const currentStored = JSON.parse(localStorage.getItem('bk_grades') || '{}');
          currentStored[keyByUid] = updatedItem;
          currentStored[directKey] = updatedItem;
          localStorage.setItem('bk_grades', JSON.stringify(currentStored));
        }
      } catch (_) {}

      return {
        ...prev,
        [studentUid]: updatedItem
      };
    });
  };

  // Handle direct edit of Description / Meaning (ትርጉም)
  const handleCustomDescChange = (studentUid: string, desc: string) => {
    setLocalGrades((prev) => {
      const current = prev[studentUid] || { p1: 0, p2: 0, mid: 0, final: 0, att: 0 };
      const updatedItem: GradeBreakdown = {
        ...current,
        customDesc: desc
      };

      try {
        if (activeCourse) {
          const targetYear = activeCourse.academicYear || currentYear;
          const targetSem = activeCourse.semester || selectedSemesterFilter || currentSemester;
          const keyByUid = getGradeKey(studentUid, activeCourse.id, targetYear, targetSem);
          const directKey = `${studentUid}_${activeCourse.id}`;
          const currentStored = JSON.parse(localStorage.getItem('bk_grades') || '{}');
          currentStored[keyByUid] = updatedItem;
          currentStored[directKey] = updatedItem;
          localStorage.setItem('bk_grades', JSON.stringify(currentStored));
        }
      } catch (_) {}

      return {
        ...prev,
        [studentUid]: updatedItem
      };
    });
  };


  // Clear all course grades to blank
  const handleClearCourse = () => {
    if (!window.confirm('እርግጠኛ ነዎት? የዚህ ኮርስ ውጤቶች በሙሉ ባዶ (0) ይሆናሉ?')) return;
    const targetYear = activeCourse?.academicYear || currentYear;
    const targetSem = activeCourse?.semester || selectedSemesterFilter || currentSemester;

    const cleared: Record<string, GradeBreakdown> = {};
    enrolledStudents.forEach((s) => {
      cleared[s.uid] = { p1: 0, p2: 0, mid: 0, final: 0, att: 0 };
    });
    setLocalGrades(cleared);

    if (activeCourse) {
      const updated = { ...grades };
      enrolledStudents.forEach((s) => {
        const key = getGradeKey(s.uid, activeCourse.id, targetYear, targetSem);
        const keyId = getGradeKey(s.id, activeCourse.id, targetYear, targetSem);
        const directKey = `${s.uid}_${activeCourse.id}`;
        updated[key] = { p1: 0, p2: 0, mid: 0, final: 0, att: 0 };
        updated[keyId] = { p1: 0, p2: 0, mid: 0, final: 0, att: 0 };
        updated[directKey] = { p1: 0, p2: 0, mid: 0, final: 0, att: 0 };
      });
      onSaveGrades(updated);
      try {
        localStorage.setItem('bk_grades', JSON.stringify(updated));
      } catch (_) {}
    }
    showNotify('የኮርሱ ውጤቶች በሙሉ ባዶ ሆነዋል!', 'info');
  };

  // Save all grades with instant persistence
  // Save all grades with instant persistence
  const handleSaveAll = async () => {
    if (!activeCourse) return;
    setIsSavingGrades(true);
    try {
      const targetYear = activeCourse.academicYear || currentYear;
      const targetSem = activeCourse.semester || selectedSemesterFilter || currentSemester;

      const updated = { ...grades };
      enrolledStudents.forEach((s) => {
        const breakdown = localGrades[s.uid] || { p1: 0, p2: 0, mid: 0, final: 0, att: 0 };
        const keyByUid = getGradeKey(s.uid, activeCourse.id, targetYear, targetSem);
        const keyById = getGradeKey(s.id, activeCourse.id, targetYear, targetSem);
        const directKey = `${s.uid}_${activeCourse.id}`;
        const directKeyById = s.id ? `${s.id}_${activeCourse.id}` : '';

        updated[keyByUid] = breakdown;
        updated[keyById] = breakdown;
        updated[directKey] = breakdown;
        if (directKeyById) {
          updated[directKeyById] = breakdown;
        }
      });

      // Synchronously write to localStorage right now
      try {
        localStorage.setItem('bk_grades', JSON.stringify(updated));
      } catch (_) {}

      // Update parent state & await cloud persistence
      await onSaveGrades(updated);
      const cloudRes = await syncGradesToFirestore(updated);

      if (cloudRes && !cloudRes.success) {
        showNotify(`ውጤቶች በኮምፒውተር ተቀምጠዋል፤ ወደ ዳታቤዝ ሲላክ ማስታወሻ: ${cloudRes.error}`, 'warning');
      } else {
        showNotify('የሁሉም ተማሪዎች ውጤቶች በዳታቤዝ እና በሲስተሙ በስኬት ተመዝግበዋል!', 'success');
      }
    } catch (err: any) {
      showNotify(`ውጤት ሲመዘገብ ስህተት ገጥሟል: ${err?.message || 'እባክዎ እንደገና ይሞክሩ'}`, 'error');
    } finally {
      setIsSavingGrades(false);
    }
  };

  // Live class statistics
  let totalScoreSum = 0;
  let gradedCount = 0;
  const gradeDistribution: Record<string, number> = { 'A+': 0, A: 0, B: 0, C: 0, D: 0, F: 0 };

  enrolledStudents.forEach((s) => {
    const g = localGrades[s.uid];
    const eff = getEffectiveGradeValues(g);
    if (eff.hasAny) {
      totalScoreSum += eff.total;
      gradedCount++;
      if (gradeDistribution[eff.letter] !== undefined) {
        gradeDistribution[eff.letter]++;
      }
    }
  });

  const classAverage = gradedCount > 0 ? (totalScoreSum / gradedCount).toFixed(1) : '0.0';

  const totalSchemeWeight = editingItems.reduce((acc, it) => acc + (Number(it.max) || 0), 0);
  const totalActiveWeight = activeItems.reduce((acc, it) => acc + (Number(it.max) || 0), 0);

  return (
    <div className="space-y-6 no-print">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/80 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
              <GraduationCap className="w-7 h-7 text-emerald-800" />
              <span>የመምህራን ውጤት መሙያ ገጽ</span>
            </h2>
            {isElevatedRole && (
              <span className="text-xs bg-amber-100 text-amber-950 border border-amber-300 px-2.5 py-1 rounded-full font-bold flex items-center gap-1 shadow-2xs">
                <Shield className="w-3.5 h-3.5 text-amber-700" />
                <span>
                  {userRole === 'ADMIN'
                    ? 'የአድሚን ጠቅላይ ቁጥጥር'
                    : userRole === 'DEAN'
                    ? 'የዋና ዲን ይፋዊ ቁጥጥር'
                    : 'የሬጅስትራር ይፋዊ ቁጥጥር'}
                </span>
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            የትምህርት ዘመን {currentYear} ዓ.ም ({currentSemester}ኛ ሴሚስተር - እንደ ኢትዮጵያ ዘመን አቆጣጠር) {isElevatedRole && '— ሁሉንም መምህራንና ኮርሶች ማስተዳደር ይችላሉ'}
          </p>
        </div>

        {/* Teacher & Course selection dropdowns */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Teacher selector for Admin/Dean/Registrar */}
          {isElevatedRole && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-2xl px-3 py-2 text-xs shadow-2xs">
              <UserCheck className="w-4 h-4 text-emerald-700" />
              <label className="font-bold text-slate-700">መምህር ምረጥ:</label>
              <select
                value={selectedTeacherFilter}
                onChange={(e) => setSelectedTeacherFilter(e.target.value)}
                className="font-bold bg-transparent text-slate-900 focus:outline-none cursor-pointer"
              >
                <option value="ALL">ሁሉም መምህራን ({courses.length} ኮርሶች)</option>
                {teachers.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Semester selection dropdown */}
          <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-300 rounded-2xl px-3 py-2 text-xs shadow-2xs">
            <Calendar className="w-4 h-4 text-amber-700" />
            <label className="font-bold text-amber-950">ሴሚስተር:</label>
            <select
              value={selectedSemesterFilter}
              onChange={(e) => setSelectedSemesterFilter(e.target.value)}
              className="font-bold bg-transparent text-amber-950 focus:outline-none cursor-pointer"
            >
              <option value="1">1ኛ ሴሚስተር</option>
              <option value="2">2ኛ ሴሚስተር</option>
              <option value="ALL">ሁሉም ሴሚስተሮች (All Semesters)</option>
            </select>
          </div>

          {/* Course selection dropdown */}
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-300 rounded-2xl px-3.5 py-2 shadow-2xs">
            <BookOpen className="w-4 h-4 text-emerald-800" />
            <label className="text-xs font-bold text-emerald-900">ኮርስ ይምረጡ:</label>
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="text-xs font-bold bg-transparent text-emerald-950 focus:outline-none cursor-pointer"
            >
              {accessibleCourses.length === 0 ? (
                <option value="">የተመደበ ኮርስ የለም</option>
              ) : (
                accessibleCourses.map((c) => (
                  <option key={c.id} value={c.id}>
                    [{c.program}] {c.name} {isElevatedRole ? `— (${c.teacher})` : ''}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
      </div>

      {accessibleCourses.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">ምንም የተመደበ ኮርስ አልተገኘም</h3>
          <p className="text-xs text-slate-500 mt-1">ዋና ዲን ኮርስ ሲመድቡ በዚህ ገጽ ላይ ተዘርዝረው ይታያሉ።</p>
        </div>
      ) : (
        <>
          {/* Top 4 Colorful Academic Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-emerald-800 to-teal-950 text-white rounded-3xl p-5 shadow-sm relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[11px] font-bold text-emerald-200 uppercase tracking-wider">የኮርሱ ተማሪዎች</p>
                  <h3 className="text-2xl sm:text-3xl font-black font-mono text-white mt-1">{enrolledStudents.length}</h3>
                  <p className="text-[11px] text-emerald-200 mt-1">ፕሮግራም: {activeCourse?.program}</p>
                </div>
                <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-xs">
                  <GraduationCap className="w-6 h-6 text-emerald-300" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-700 to-orange-950 text-white rounded-3xl p-5 shadow-sm relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[11px] font-bold text-amber-200 uppercase tracking-wider">የክፍሉ አማካይ ውጤት</p>
                  <h3 className="text-2xl sm:text-3xl font-black font-mono text-white mt-1">{classAverage}%</h3>
                  <p className="text-[11px] text-amber-200 mt-1">{gradedCount} ከተማሪዎች ተሞልቷል</p>
                </div>
                <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-xs">
                  <CheckCircle2 className="w-6 h-6 text-amber-300" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-800 to-slate-900 text-white rounded-3xl p-5 shadow-sm relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[11px] font-bold text-indigo-200 uppercase tracking-wider">የቀን ሰሌዳ</p>
                  <h4 className="text-sm font-black text-amber-300 mt-1 truncate max-w-[160px]">
                    {activeCourse?.schedule || 'አልተወሰነም'}
                  </h4>
                  <p className="text-[11px] text-indigo-200 mt-1">ክሬዲት: {activeCourse?.credits || 0}</p>
                </div>
                <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-xs">
                  <Calendar className="w-6 h-6 text-indigo-300" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-cyan-800 to-blue-950 text-white rounded-3xl p-5 shadow-sm relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[11px] font-bold text-cyan-200 uppercase tracking-wider">የውጤት መመዘኛዎች</p>
                  <h3 className="text-2xl sm:text-3xl font-black font-mono text-white mt-1">
                    {activeItems.length} መመዘኛ ({totalActiveWeight}%)
                  </h3>
                  <button
                    onClick={() => setIsSchemeModalOpen(true)}
                    className="text-[10px] font-bold text-cyan-200 hover:text-white underline mt-1 block cursor-pointer"
                  >
                    መመዘኛ ጨምር / ቀንስ ✎
                  </button>
                </div>
                <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-xs">
                  <SlidersHorizontal className="w-6 h-6 text-cyan-300" />
                </div>
              </div>
            </div>
          </div>

          {/* Official Grading Scale Reference Card */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300/80 rounded-3xl p-5 space-y-2 shadow-2xs">
            <p className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-amber-700" />
              <span>ይፋዊ የውጤት መስፈርት (Official Grading Scale):</span>
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-[11px] text-slate-800">
              <div className="bg-white p-2 rounded-xl border border-emerald-200 shadow-2xs">
                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 mr-1">A+</span>
                <strong className="text-emerald-800">90–100%</strong> (እጅግ በጣም ጥሩ)
              </div>
              <div className="bg-white p-2 rounded-xl border border-green-200 shadow-2xs">
                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-black bg-green-100 text-green-800 mr-1">A</span>
                <strong className="text-green-800">80–89%</strong> (በጣም ጥሩ)
              </div>
              <div className="bg-white p-2 rounded-xl border border-indigo-200 shadow-2xs">
                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-black bg-indigo-100 text-indigo-800 mr-1">B</span>
                <strong className="text-indigo-800">70–79%</strong> (ጥሩ)
              </div>
              <div className="bg-white p-2 rounded-xl border border-amber-200 shadow-2xs">
                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-800 mr-1">C</span>
                <strong className="text-amber-800">60–69%</strong> (አልፏል)
              </div>
              <div className="bg-white p-2 rounded-xl border border-orange-200 shadow-2xs">
                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-black bg-orange-100 text-orange-800 mr-1">D</span>
                <strong className="text-orange-800">50–59%</strong> (ዝቅተኛ)
              </div>
              <div className="bg-white p-2 rounded-xl border border-rose-200 shadow-2xs">
                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-800 mr-1">F</span>
                <strong className="text-rose-800">&lt;50%</strong> (ወድቋል)
              </div>
            </div>
          </div>

          {/* Grade Entry Table with Fully Editable Criteria, Total, Letter & Meaning */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <span>የተማሪዎች ውጤት ማስገቢያ ሰንጠረዥ: {activeCourse?.name} ({activeCourse?.program})</span>
                  <button
                    onClick={() => setIsSchemeModalOpen(true)}
                    className="inline-flex items-center gap-1 text-[11px] text-emerald-800 hover:text-emerald-950 font-bold bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-xl transition-all cursor-pointer shadow-2xs"
                    title="የመመዘኛ ስሞችንና መቶኛዎችን ኤዲት ለማድረግ፣ ለመጨመር ወይም ለመቀነስ ይጫኑ"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>መመዘኛ ጨምር / ቀንስ ({activeItems.length})</span>
                  </button>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {activeItems.map((it) => `${it.label} (${it.max}%)`).join(' + ')} = ድምር ({totalActiveWeight}%)
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Toggle Inline Horizontal Criteria Editor */}
                <button
                  type="button"
                  onClick={() => setIsInlineEditorOpen((prev) => !prev)}
                  className={`text-xs px-3 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                    isInlineEditorOpen
                      ? 'bg-emerald-800 text-white shadow-sm'
                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300'
                  }`}
                  title="የመመዘኛ ስሞችንና መቶኛዎችን እዚህ ጋር ወደ ጎን ኤዲት ማድረጊያ አሳይ/ደብቅ"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>የመመዘኛ ኤዲተር (ወደ ጎን)</span>
                  {isInlineEditorOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {/* Direct quick button to Add Criterion */}
                <button
                  type="button"
                  onClick={() => {
                    handleAddCriterion();
                    setIsInlineEditorOpen(true);
                  }}
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs px-3 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="አዲስ የውጤት መመዘኛ ጨምር"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-700" />
                  <span>+ መመዘኛ ጨምር</span>
                </button>

                {/* Direct quick button to Remove Last Criterion */}
                <button
                  type="button"
                  onClick={handleRemoveLastCriterion}
                  disabled={activeItems.length <= 1}
                  className={`text-xs px-3 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 shadow-2xs ${
                    activeItems.length <= 1
                      ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                      : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 cursor-pointer'
                  }`}
                  title="የመጨረሻውን መመዘኛ ቀንስ"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>- መመዘኛ ቀንስ</span>
                </button>

                {/* Open Modal for Full Scheme Customization */}
                <button
                  type="button"
                  onClick={() => setIsSchemeModalOpen(true)}
                  className="bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs px-3 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  title="በሙሉ መስኮት (Modal) ለማስተካከል"
                >
                  <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                  <span>ሙሉ መስኮት</span>
                </button>

                {/* Batch Score Fill Button (ተመሳሳይ ውጤት ለሁሉም ሙላ) */}
                <button
                  type="button"
                  onClick={() => {
                    setBatchInitialCriterionId(undefined);
                    setIsBatchFillOpen(true);
                  }}
                  className="bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 border border-amber-500 text-xs px-3.5 py-2 rounded-xl font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-sm hover:shadow-md"
                  title="ተመሳሳይ ውጤት በአንድ ጊዜ ለሁሉም ተማሪዎች ለመሙላት ይጫኑ"
                >
                  <CheckCheck className="w-4 h-4 text-slate-950" />
                  <span>ተመሳሳይ ውጤት ለሁሉም ሙላ</span>
                </button>

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
                  onClick={handleExportExcel}
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border border-emerald-400 text-xs px-3 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="የዚህን ኮርስ ውጤት በኤክሴል (.xlsx) ለማውረድ"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                  <span>ኤክሴል አውርድ (.xlsx)</span>
                </button>

                {/* Direct PDF Download Button (ቀጥታ PDF አውርድ) */}
                <button
                  type="button"
                  onClick={handleTriggerDirectPdfDownload}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md hover:shadow-lg"
                  title="የውጤት ሰነዱን በፒዲኤፍ (PDF) በቀጥታ ለማውረድ ይጫኑ"
                >
                  <Download className="w-3.5 h-3.5 text-white" />
                  <span>PDF ቀጥታ አውርድ</span>
                </button>

                {/* Official PDF / Print Button (ይፋዊ ሰነድ / ፕሪንት) */}
                <button
                  type="button"
                  onClick={handleOpenPdfPreview}
                  className="bg-cyan-50 hover:bg-cyan-100 text-cyan-950 border border-cyan-300 text-xs px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="ይፋዊ የውጤት ሰነድ ለማየትና ለማተም"
                >
                  <Printer className="w-3.5 h-3.5 text-cyan-700" />
                  <span>ይፋዊ ሰነድ (PDF)</span>
                </button>

                {/* Save All Button */}
                <button
                  type="button"
                  onClick={handleSaveAll}
                  disabled={isSavingGrades}
                  className={`text-white text-xs px-4 py-2 rounded-xl font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer ${
                    isSavingGrades
                      ? 'bg-emerald-600 cursor-wait opacity-80'
                      : 'bg-emerald-700 hover:bg-emerald-800'
                  }`}
                >
                  <Save className={`w-4 h-4 ${isSavingGrades ? 'animate-spin' : ''}`} />
                  <span>{isSavingGrades ? 'በዳታቤዝ በመመዝገብ ላይ...' : 'ውጤቶችን መዝግብ (Save All)'}</span>
                </button>
              </div>
            </div>

            {/* Inline Horizontal Criteria Editor ("እዚህ ጋር ኤዲት ማድረጊያ - ወደ ጎን የሚንሸራተት") */}
            {isInlineEditorOpen && (
              <div className="bg-gradient-to-r from-slate-50 via-emerald-50/25 to-slate-50 border-2 border-emerald-300 rounded-3xl p-4 sm:p-5 space-y-3.5 shadow-xs transition-all animate-in fade-in duration-200">
                {/* Top Control Bar of Inline Editor */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-200/80 pb-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="p-2 rounded-xl bg-emerald-700 text-white shadow-xs">
                      <SlidersHorizontal className="w-4 h-4 text-amber-300" />
                    </span>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                        <span>የመመዘኛ ስሞች እና የመቶኛ ክብደት (%) ኤዲት ማድረጊያ</span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <MoveHorizontal className="w-3 h-3 text-emerald-700" />
                          <span>ወደ ጎን የሚንሸራተት</span>
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-600">
                        የመመዘኛ መጠሪያ ስሞችንና መቶኛዎችን (%) እዚህ ጋር በቀጥታ ይቀይሩ፤ መመዘኛ ለመጨመር ወይም ለመቀነስ ከስር ያሉትን ይጠቀሙ።
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 self-stretch md:self-auto justify-end">
                    {/* Left & Right Horizontal Scroll Buttons */}
                    <div className="inline-flex items-center gap-1 bg-white border border-slate-300 rounded-xl p-0.5 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => scrollHorizontal(inlineScrollRef, 'left')}
                        className="p-1.5 rounded-lg text-slate-700 hover:text-emerald-900 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="ወደ ግራ ሸብልል"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-[10px] font-bold text-slate-500 px-1">ወደ ጎን</span>
                      <button
                        type="button"
                        onClick={() => scrollHorizontal(inlineScrollRef, 'right')}
                        className="p-1.5 rounded-lg text-slate-700 hover:text-emerald-900 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="ወደ ቀኝ ሸብልል"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Auto Balance to 100% */}
                    <button
                      type="button"
                      onClick={handleAutoBalance}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 font-bold text-xs transition-colors cursor-pointer shadow-2xs"
                      title="ድምሩ 100% እንዲሆን በራስ-ሰር አስማማ"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>100% አስማማ</span>
                    </button>

                    {/* Save Scheme Button */}
                    <button
                      type="button"
                      onClick={handleSaveEditingScheme}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
                      title="የተስተካከሉትን የመመዘኛ ስሞችና መቶኛዎች መዝግብ"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>መመዘኛዎችን መዝግብ</span>
                    </button>

                    {/* Reset to Default */}
                    <button
                      type="button"
                      onClick={handleResetSchemeToDefault}
                      className="p-1.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-white border border-transparent hover:border-slate-300 transition-colors cursor-pointer"
                      title="ወደ ነባሪ መልስ"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Quick Presets & Quick Add Chips */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-700">ፈጣን አብነቶች:</span>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('2')}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 shadow-2xs cursor-pointer"
                    >
                      2 መመዘኛ (40/60)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('3')}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 shadow-2xs cursor-pointer"
                    >
                      3 መመዘኛ (30/30/40)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('4')}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 shadow-2xs cursor-pointer"
                    >
                      4 መመዘኛ (20/20/30/30)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('5')}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 shadow-2xs cursor-pointer"
                    >
                      5 መመዘኛ (20/20/30/20/10)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('6')}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 shadow-2xs cursor-pointer"
                    >
                      6 መመዘኛ (15/15/10/25/25/10)
                    </button>
                  </div>

                  {/* Total Weight Status Pill */}
                  <div
                    className={`px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1.5 border shadow-2xs ${
                      totalSchemeWeight === 100
                        ? 'bg-emerald-100 text-emerald-950 border-emerald-400'
                        : 'bg-amber-100 text-amber-950 border-amber-400'
                    }`}
                  >
                    <CheckCircle2 className={`w-3.5 h-3.5 ${totalSchemeWeight === 100 ? 'text-emerald-700' : 'text-amber-700'}`} />
                    <span>ጠቅላላ መቶኛ፡ {totalSchemeWeight}% {totalSchemeWeight === 100 ? '✓ ትክክል' : `(${100 - totalSchemeWeight > 0 ? `+${100 - totalSchemeWeight}% ይቀራል` : `${totalSchemeWeight - 100}% በልጧል`})`}</span>
                  </div>
                </div>

                {/* Quick Add Criterion Chips */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[10px] font-bold text-slate-600">በቀጥታ ጨምር:</span>
                  <button
                    type="button"
                    onClick={() => handleAddCriterion('አሳይመንት', 15)}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100/70 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 cursor-pointer"
                  >
                    + አሳይመንት (15%)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddCriterion('ፕሮጀክት', 15)}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-cyan-100/70 hover:bg-cyan-200 text-cyan-900 border border-cyan-300 cursor-pointer"
                  >
                    + ፕሮጀክት (15%)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddCriterion('የቡድን ስራ', 10)}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100/70 hover:bg-purple-200 text-purple-900 border border-purple-300 cursor-pointer"
                  >
                    + የቡድን ስራ (10%)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddCriterion('የተግባር ፈተና', 20)}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100/70 hover:bg-amber-200 text-amber-900 border border-amber-300 cursor-pointer"
                  >
                    + የተግባር ፈተና (20%)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddCriterion('የቤት ስራ', 10)}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-100/70 hover:bg-indigo-200 text-indigo-900 border border-indigo-300 cursor-pointer"
                  >
                    + የቤት ስራ (10%)
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveLastCriterion}
                    disabled={editingItems.length <= 1}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                      editingItems.length <= 1
                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                        : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-300 cursor-pointer'
                    }`}
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>- የመጨረሻውን ቀንስ</span>
                  </button>
                </div>

                {/* HORIZONTAL SCROLL TRACK - Cards laid out side-by-side (ወደ ጎን) */}
                <div
                  ref={inlineScrollRef}
                  className="overflow-x-auto flex items-stretch gap-3 pb-3 pt-1 scrollbar-thin scroll-smooth"
                >
                  {editingItems.map((item, idx) => {
                    const color = getCriterionColor(idx);
                    return (
                      <div
                        key={item.id}
                        className={`min-w-[215px] max-w-[245px] flex-shrink-0 bg-white border-2 ${color.border} rounded-2xl p-3 shadow-2xs space-y-2 relative group hover:shadow-sm transition-all`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${color.badge}`}>
                            መመዘኛ {idx + 1}
                          </span>

                          <div className="flex items-center gap-1.5">
                            <span className={`font-mono text-xs font-black ${color.text}`}>
                              {item.max}%
                            </span>

                            {/* Remove button (ቀንስ / አጥፋ) */}
                            <button
                              type="button"
                              onClick={() => handleRemoveCriterion(idx)}
                              disabled={editingItems.length <= 1}
                              className={`p-1 rounded-lg transition-colors cursor-pointer ${
                                editingItems.length <= 1
                                  ? 'text-slate-300 cursor-not-allowed'
                                  : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                              }`}
                              title={editingItems.length <= 1 ? 'ቢያንስ 1 መመዘኛ መኖር አለበት' : `ይህን መመዘኛ (${item.label}) ቀንስ/አጥፋ`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                            የመመዘኛ ስም
                          </label>
                          <input
                            type="text"
                            value={item.label}
                            onChange={(e) => handleCriterionItemChange(idx, 'label', e.target.value)}
                            required
                            placeholder={`መመዘኛ ${idx + 1}`}
                            className={`w-full px-2.5 py-1 text-xs font-bold border ${color.border} rounded-xl bg-white ${color.focus} text-slate-800 shadow-2xs`}
                          />
                        </div>

                        <div>
                          <div className="flex justify-between items-center mb-0.5">
                            <label className="text-[10px] font-bold text-slate-600">
                              መቶኛ ክብደት (%)
                            </label>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleStepCriterionWeight(idx, -5)}
                                className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                                title="5% ቀንስ"
                              >
                                -5%
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStepCriterionWeight(idx, +5)}
                                className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-800 transition-colors cursor-pointer"
                                title="5% ጨምር"
                              >
                                +5%
                              </button>
                            </div>
                          </div>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={item.max}
                            onChange={(e) => handleCriterionItemChange(idx, 'max', e.target.value)}
                            required
                            className={`w-full px-2 py-1 text-xs font-mono font-black text-center border ${color.border} rounded-xl bg-white ${color.focus} text-slate-900 shadow-2xs`}
                          />
                        </div>
                      </div>
                    );
                  })}

                  {/* Add New Criterion Card in the horizontal row */}
                  <button
                    type="button"
                    onClick={() => handleAddCriterion()}
                    className="min-w-[175px] flex-shrink-0 rounded-2xl border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/50 hover:bg-emerald-100/60 transition-all flex flex-col items-center justify-center gap-1.5 p-3 text-emerald-800 font-bold text-xs cursor-pointer group"
                    title="አዲስ መመዘኛ ጨምር"
                  >
                    <div className="w-8 h-8 rounded-full bg-emerald-100 group-hover:bg-emerald-200 flex items-center justify-center transition-colors">
                      <Plus className="w-4 h-4 text-emerald-800" />
                    </div>
                    <span>+ መመዘኛ ጨምር</span>
                    <span className="text-[9px] font-normal text-slate-500">ወደ ጎን ይታከላል</span>
                  </button>
                </div>
              </div>
            )}

            {/* Keyboard Navigation Helper Banner */}
            <div className="bg-amber-50/90 border border-amber-300/80 rounded-2xl px-4 py-2.5 text-xs font-bold text-amber-950 flex flex-wrap items-center justify-between gap-2 shadow-2xs">
              <span className="flex items-center gap-2">
                <span className="bg-amber-200 text-amber-950 px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wide">
                  ⌨️ የክይቦርድ መርጃ
                </span>
                <span>
                  በክይቦርድ ቀስቶች (<b>ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Enter, Tab</b>) ወደ ጎን፣ ወደላይ እና ወደታች እያሳለፉ በቀላሉ መሙላት ይችላሉ!
                </span>
              </span>
              <span className="text-[10px] text-amber-800 font-semibold bg-white/80 px-2 py-0.5 rounded-md border border-amber-200">
                ሲነኩት ቁጥሩ አውቶማቲክ ይደምቃል (Auto-selected)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[10px] rounded-lg">
                  <tr>
                    <th className="p-2.5 border-b border-slate-200 bg-slate-100">ተ.ቁ</th>
                    <th className="p-2.5 border-b border-slate-200 bg-slate-100">ID No</th>
                    <th className="p-2.5 border-b border-slate-200 bg-slate-100">የተማሪ ስም</th>
                    
                    {/* Dynamic Criteria Headers */}
                    {activeItems.map((item, idx) => {
                      const color = getCriterionColor(idx);
                      return (
                        <th
                          key={item.id}
                          className={`p-2.5 border-b-2 ${color.headerBorder} ${color.headerBg} text-center min-w-[95px] relative group`}
                        >
                          <div className="flex flex-col items-center">
                            <div className="flex items-center gap-1 justify-center w-full">
                              <span className="font-bold truncate max-w-[70px]" title={item.label}>
                                {item.label}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setBatchInitialCriterionId(item.id);
                                  setIsBatchFillOpen(true);
                                }}
                                className="opacity-70 group-hover:opacity-100 p-0.5 rounded text-amber-700 hover:text-amber-950 hover:bg-amber-100 transition-all cursor-pointer"
                                title={`ለሙሉ ተማሪዎች '${item.label}' ተመሳሳይ ውጤት ሙላ`}
                              >
                                <Copy className="w-2.5 h-2.5" />
                              </button>
                              {activeItems.length > 1 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDirectRemoveCriterionFromTable(item.id, item.label);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-rose-600 hover:bg-rose-100 transition-opacity cursor-pointer"
                                  title={`'${item.label}' መመዘኛን ቀንስ/ሰርዝ`}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                            <span className="text-[9px] font-mono font-black">({item.max}%)</span>
                          </div>
                        </th>
                      );
                    })}

                    {/* Quick Add Criterion Column Header Button */}
                    <th className="p-1 border-b-2 border-dashed border-emerald-300 bg-emerald-50/40 text-center w-14">
                      <button
                        type="button"
                        onClick={() => {
                          handleAddCriterion();
                          setIsSchemeModalOpen(true);
                        }}
                        className="w-full py-2 flex flex-col items-center justify-center text-emerald-800 hover:text-emerald-950 font-bold text-[9px] hover:bg-emerald-100/60 rounded-lg transition-colors cursor-pointer"
                        title="አዲስ መመዘኛ ጨምር"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>ጨምር</span>
                      </button>
                    </th>

                    {/* Total (100%) - Editable */}
                    <th className="p-2.5 border-b-2 border-emerald-600 bg-emerald-100 text-emerald-950 text-center w-22 font-black">
                      <div className="flex flex-col items-center">
                        <div className="flex items-center gap-1">
                          <span>ድምር</span>
                          <button
                            type="button"
                            onClick={() => {
                              setBatchInitialCriterionId('TOTAL');
                              setIsBatchFillOpen(true);
                            }}
                            className="p-0.5 rounded text-emerald-800 hover:bg-emerald-200 transition-colors cursor-pointer"
                            title="ለሙሉ ተማሪዎች ተመሳሳይ ድምር ውጤት (Total) ሙላ"
                          >
                            <Copy className="w-2.5 h-2.5" />
                          </button>
                        </div>
                        <span className="text-[9px] text-emerald-800 font-mono">({totalActiveWeight}%) ✎</span>
                      </div>
                    </th>
                    {/* Letter Grade - Editable */}
                    <th className="p-2.5 border-b-2 border-amber-600 bg-amber-100 text-amber-950 text-center w-24 font-black">
                      <div className="flex flex-col items-center">
                        <div className="flex items-center gap-1">
                          <span>ፊደል ደረጃ</span>
                          <button
                            type="button"
                            onClick={() => {
                              setBatchInitialCriterionId('LETTER');
                              setIsBatchFillOpen(true);
                            }}
                            className="p-0.5 rounded text-amber-800 hover:bg-amber-200 transition-colors cursor-pointer"
                            title="ለሙሉ ተማሪዎች ተመሳሳይ ፊደል ደረጃ (Grade) ሙላ"
                          >
                            <Copy className="w-2.5 h-2.5" />
                          </button>
                        </div>
                        <span className="text-[9px] text-amber-800">ምረጡ ✎</span>
                      </div>
                    </th>
                    {/* Meaning / Remark - Editable */}
                    <th className="p-2.5 border-b-2 border-sky-400 bg-sky-50 text-sky-950 text-center min-w-[130px] font-bold">
                      <div className="flex flex-col items-center">
                        <span>ትርጉም / አስተያየት</span>
                        <span className="text-[9px] text-slate-500">ኤዲት ✎</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {enrolledStudents.map((s, idx) => {
                    const g = localGrades[s.uid] || { p1: 0, p2: 0, mid: 0, final: 0, att: 0 };
                    
                    // Compute dynamic parts sum
                    const partsSum = activeItems.reduce(
                      (sum, it, itIdx) => sum + getCriterionScore(g, it.id, itIdx),
                      0
                    );
                    const hasParts = partsSum > 0;
                    const hasCustomTotal = typeof g.customTotal === 'number' && !isNaN(g.customTotal);
                    const eff = getEffectiveGradeValues(g, activeItems);

                    // Standard auto values
                    const effectiveTotal = hasCustomTotal ? g.customTotal! : partsSum;
                    const autoGrade = calculateGradeDetails(effectiveTotal);
                    const defaultDesc = eff.hasAny ? autoGrade.desc : 'አልተሞላም';

                    return (
                      <tr key={s.uid} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-2.5 font-mono text-slate-400">{idx + 1}</td>
                        <td className="p-2.5 font-mono font-bold text-slate-800">{s.id}</td>
                        <td className="p-2.5 font-bold text-slate-900">{s.name}</td>

                        {/* Dynamic Criteria Input Cells with Keyboard Grid Navigation */}
                        {activeItems.map((item, itemIdx) => {
                          const color = getCriterionColor(itemIdx);
                          const score = getCriterionScore(g, item.id, itemIdx);
                          return (
                            <td key={item.id} className="p-2 text-center">
                              <input
                                type="number"
                                min="0"
                                max={item.max}
                                step="0.5"
                                placeholder="—"
                                data-cell-r={idx}
                                data-cell-c={itemIdx}
                                onKeyDown={(e) => handleCellKeyDown(e, idx, itemIdx)}
                                onFocus={(e) => e.target.select()}
                                value={score === 0 ? '' : score}
                                onChange={(e) =>
                                  handleCriterionScoreChange(s.uid, item.id, e.target.value, item.max, itemIdx)
                                }
                                className={`w-16 px-1.5 py-1 text-center font-mono font-bold text-xs border ${color.border} rounded-lg ${color.focus} bg-white placeholder:text-slate-300 shadow-2xs focus:ring-2 focus:ring-amber-500`}
                                title={`${item.label} (ከ ${item.max}%) — በክይቦርድ ቀስቶች መንቀሳቀስ ይችላሉ`}
                              />
                            </td>
                          );
                        })}

                        {/* Blank cell for the + ጨምር column */}
                        <td className="p-1 text-center bg-emerald-50/10 border-r border-dashed border-emerald-100"></td>

                        {/* Editable Total (ድምር 100%) */}
                        <td className="p-2 text-center">
                          <div className="relative inline-block">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.5"
                              placeholder="—"
                              data-cell-r={idx}
                              data-cell-c={activeItems.length}
                              onKeyDown={(e) => handleCellKeyDown(e, idx, activeItems.length)}
                              onFocus={(e) => e.target.select()}
                              value={
                                hasCustomTotal
                                  ? g.customTotal === 0
                                    ? ''
                                    : g.customTotal
                                  : hasParts
                                  ? partsSum
                                  : ''
                              }
                              onChange={(e) => handleCustomTotalChange(s.uid, e.target.value)}
                              className={`w-18 px-1.5 py-1 text-center font-mono font-black text-xs rounded-lg border focus:ring-2 focus:ring-emerald-700 transition-colors ${
                                hasCustomTotal
                                  ? 'border-indigo-400 bg-indigo-50/80 text-indigo-950 font-extrabold ring-1 ring-indigo-300'
                                  : 'border-emerald-300 bg-emerald-50/50 text-emerald-900'
                              } placeholder:text-slate-300 shadow-2xs`}
                              title={
                                hasCustomTotal
                                  ? 'በቀጥታ በመምህሩ የተሞላ ድምር (Custom Total)። ለማስላት ባዶ አድርገው ይተዉት።'
                                  : 'የተደመረ ድምር (በቀጥታ መተየብም ይችላሉ)'
                              }
                            />
                            {hasCustomTotal && (
                              <span
                                className="absolute -top-1 -right-1 flex h-2 w-2 cursor-pointer"
                                title="በእጅ የተሞላ ድምር"
                              >
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Editable Letter Grade (ፊደል ደረጃ) */}
                        <td className="p-2 text-center">
                          <select
                            data-cell-r={idx}
                            data-cell-c={activeItems.length + 1}
                            onKeyDown={(e) => handleCellKeyDown(e, idx, activeItems.length + 1)}
                            value={g.customLetter || ''}
                            onChange={(e) => handleCustomLetterChange(s.uid, e.target.value)}
                            className={`w-20 px-1 py-1 text-center font-black text-xs rounded-lg border focus:ring-2 focus:ring-amber-500 cursor-pointer shadow-2xs transition-colors ${
                              g.customLetter
                                ? 'bg-amber-100/90 text-amber-950 border-amber-400 font-extrabold ring-1 ring-amber-300'
                                : 'bg-amber-50/50 text-amber-900 border-amber-300'
                            }`}
                            title="የፊደል ደረጃን ኤዲት ማድረግ ይችላሉ"
                          >
                            <option value="">
                              {eff.hasAny ? `${autoGrade.letter} (አውቶ)` : '— (አውቶ)'}
                            </option>
                            <option value="A+">A+ (4.00)</option>
                            <option value="A">A (3.75)</option>
                            <option value="B">B (3.00)</option>
                            <option value="C">C (2.00)</option>
                            <option value="D">D (1.00)</option>
                            <option value="F">F (0.00)</option>
                          </select>
                        </td>

                        {/* Editable Description / Meaning (ትርጉም) */}
                        <td className="p-2 text-center">
                          <input
                            type="text"
                            data-cell-r={idx}
                            data-cell-c={activeItems.length + 2}
                            onKeyDown={(e) => handleCellKeyDown(e, idx, activeItems.length + 2)}
                            onFocus={(e) => e.target.select()}
                            placeholder={defaultDesc}
                            value={g.customDesc !== undefined ? g.customDesc : ''}
                            onChange={(e) => handleCustomDescChange(s.uid, e.target.value)}
                            className={`w-32 px-2 py-1 text-xs text-slate-800 rounded-lg border focus:ring-2 focus:ring-emerald-700 placeholder:text-slate-400 font-medium shadow-2xs transition-colors ${
                              g.customDesc
                                ? 'bg-blue-50/80 border-blue-400 text-blue-950 ring-1 ring-blue-300'
                                : 'bg-white border-slate-300'
                            }`}
                            title="ትርጉሙን ወይም ልዩ አስተያየቱን ኤዲት ማድረግ ይችላሉ"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="pt-3 border-t flex flex-wrap justify-between items-center gap-3">
              <span className="text-xs text-slate-500 font-semibold">
                የክፍሉ አማካይ ውጤት: <strong className="text-slate-800">{classAverage}%</strong> ({gradedCount} ከተማሪዎች ተሞልቷል)
              </span>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="bg-white hover:bg-emerald-50 text-emerald-950 border border-emerald-300 text-xs px-3.5 py-2.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="ኤክሴል አውርድ"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                  <span>ኤክሴል (.xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsExcelUploadOpen(true)}
                  className="bg-white hover:bg-emerald-50 text-emerald-950 border border-emerald-300 text-xs px-3.5 py-2.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="ኤክሴል ጫን"
                >
                  <Upload className="w-3.5 h-3.5 text-emerald-700" />
                  <span>ኤክሴል ጫን</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPdfModalOpen(true)}
                  className="bg-white hover:bg-cyan-50 text-cyan-950 border border-cyan-300 text-xs px-3.5 py-2.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="ይፋዊ ሰነድ / ፕዴፍ አትም"
                >
                  <Printer className="w-3.5 h-3.5 text-cyan-700" />
                  <span>ይፋዊ ሰነድ (PDF)</span>
                </button>
                <button
                  type="button"
                  onClick={handleClearCourse}
                  className="bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 text-xs px-4 py-2.5 rounded-xl font-bold border border-slate-300 transition-colors cursor-pointer"
                >
                  ውጤቶችን አጽዳ
                </button>
                <button
                  onClick={handleSaveAll}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs px-5 py-2.5 rounded-xl font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>ውጤቶችን መዝግብ (Save All)</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* MODAL: Edit Assessment Criteria & Weights with Add/Remove capability (መመዘኛ ለመጨመርና ለመቀነስ) */}
      {isSchemeModalOpen && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full flex flex-col overflow-hidden border border-slate-200 my-auto animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-900 text-white px-6 py-4 flex justify-between items-center border-b border-emerald-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-700/60 rounded-xl shadow-inner">
                  <SlidersHorizontal className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                    <span>የውጤት መመዘኛዎችንና የመቶኛ ክብደት (%) ኤዲት ማድረጊያ</span>
                    <span className="text-xs bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded-lg">
                      {editingItems.length} መመዘኛዎች
                    </span>
                  </h3>
                  <p className="text-xs text-emerald-200">
                    ኮርስ: <span className="font-bold text-amber-300">{activeCourse?.name}</span> ({activeCourse?.program})
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsSchemeModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="ዝጋ"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveScheme} className="p-5 sm:p-6 space-y-4">
              {/* Toolbar: Add criterion button, quick chips, presets, auto-balance */}
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs">
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-700">ፈጣን አብነቶች (Presets):</span>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('2')}
                      className="text-[10px] font-bold px-2 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 shadow-2xs cursor-pointer"
                    >
                      2 መመዘኛ (40/60)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('3')}
                      className="text-[10px] font-bold px-2 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 shadow-2xs cursor-pointer"
                    >
                      3 መመዘኛ (30/30/40)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('4')}
                      className="text-[10px] font-bold px-2 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 shadow-2xs cursor-pointer"
                    >
                      4 መመዘኛ (20/20/30/30)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('5')}
                      className="text-[10px] font-bold px-2 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 shadow-2xs cursor-pointer"
                    >
                      5 መመዘኛ (20/20/30/20/10)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('6')}
                      className="text-[10px] font-bold px-2 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 shadow-2xs cursor-pointer"
                    >
                      6 መመዘኛ (15/15/10/25/25/10)
                    </button>
                  </div>

                  {/* Quick-add chips */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] font-bold text-slate-500">በቀጥታ ጨምር:</span>
                    <button
                      type="button"
                      onClick={() => handleAddCriterion('አሳይመንት', 15)}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 cursor-pointer"
                    >
                      + አሳይመንት (15%)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddCriterion('ፕሮጀክት', 15)}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-cyan-50 hover:bg-cyan-100 text-cyan-900 border border-cyan-200 cursor-pointer"
                    >
                      + ፕሮጀክት (15%)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddCriterion('የቡድን ስራ', 10)}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 cursor-pointer"
                    >
                      + የቡድን ስራ (10%)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddCriterion('የተግባር ፈተና', 20)}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 cursor-pointer"
                    >
                      + የተግባር ፈተና (20%)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddCriterion('የቤት ስራ', 10)}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 cursor-pointer"
                    >
                      + የቤት ስራ (10%)
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 self-stretch lg:self-auto justify-end">
                  {/* View Mode Toggle (ወደ ጎን vs ፍርግርግ) */}
                  <div className="inline-flex items-center bg-white border border-slate-300 rounded-xl p-0.5 shadow-2xs text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setModalViewMode('horizontal')}
                      className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer ${
                        modalViewMode === 'horizontal'
                          ? 'bg-emerald-700 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                      title="መመዘኛዎችን ወደ ጎን (Horizontally) አሳይ"
                    >
                      <MoveHorizontal className="w-3.5 h-3.5" />
                      <span>ወደ ጎን</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalViewMode('grid')}
                      className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer ${
                        modalViewMode === 'grid'
                          ? 'bg-emerald-700 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                      title="መመዘኛዎችን በፍርግርግ (Grid) አሳይ"
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      <span>ፍርግርግ</span>
                    </button>
                  </div>

                  {modalViewMode === 'horizontal' && (
                    <div className="inline-flex items-center gap-1 bg-white border border-slate-300 rounded-xl p-0.5 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => scrollHorizontal(modalScrollRef, 'left')}
                        className="p-1 rounded-lg text-slate-700 hover:text-emerald-900 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="ወደ ግራ ሸብልል"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => scrollHorizontal(modalScrollRef, 'right')}
                        className="p-1 rounded-lg text-slate-700 hover:text-emerald-900 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="ወደ ቀኝ ሸብልል"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleAutoBalance}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs transition-colors cursor-pointer shadow-2xs"
                    title="ድምሩ 100% እንዲሆን በራስ-ሰር አስማማ"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>100% አስማማ</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleRemoveLastCriterion}
                    disabled={editingItems.length <= 1}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl font-bold text-xs shadow-2xs transition-all ${
                      editingItems.length <= 1
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 cursor-pointer'
                    }`}
                    title="የመጨረሻውን መመዘኛ ቀንስ"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>- መመዘኛ ቀንስ</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddCriterion()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ መመዘኛ ጨምር</span>
                  </button>
                </div>
              </div>

              {/* Dynamic Assessment Criteria Laid Out Side-by-Side (ወደ ጎን) OR Grid */}
              <div
                ref={modalScrollRef}
                className={
                  modalViewMode === 'horizontal'
                    ? 'overflow-x-auto flex items-stretch gap-3.5 pb-3 pt-1 scrollbar-thin scroll-smooth'
                    : 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5 max-h-[50vh] overflow-y-auto p-1'
                }
              >
                {editingItems.map((item, idx) => {
                  const color = getCriterionColor(idx);
                  return (
                    <div
                      key={item.id}
                      className={`${
                        modalViewMode === 'horizontal'
                          ? 'min-w-[220px] max-w-[260px] flex-shrink-0'
                          : ''
                      } p-3.5 rounded-2xl bg-gradient-to-b from-white to-slate-50/50 border-2 ${color.border} shadow-2xs space-y-2.5 relative group`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${color.badge}`}>
                          መመዘኛ {idx + 1}
                        </span>
                        
                        <div className="flex items-center gap-1.5">
                          <span className={`font-mono text-xs font-black ${color.text}`}>
                            {item.max}%
                          </span>

                          {/* Remove button (ቀንስ / አጥፋ) */}
                          <button
                            type="button"
                            onClick={() => handleRemoveCriterion(idx)}
                            disabled={editingItems.length <= 1}
                            className={`p-1 rounded-lg transition-colors cursor-pointer ${
                              editingItems.length <= 1
                                ? 'text-slate-300 cursor-not-allowed'
                                : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                            }`}
                            title={editingItems.length <= 1 ? 'ቢያንስ 1 መመዘኛ መኖር አለበት' : `ይህን መመዘኛ (${item.label}) ቀንስ/አጥፋ`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">
                          የመመዘኛ ስም
                        </label>
                        <input
                          type="text"
                          value={item.label}
                          onChange={(e) => handleCriterionItemChange(idx, 'label', e.target.value)}
                          required
                          placeholder={`መመዘኛ ${idx + 1}`}
                          className={`w-full px-2.5 py-1.5 text-xs font-bold border ${color.border} rounded-xl bg-white ${color.focus} text-slate-800 shadow-2xs`}
                        />
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[10px] font-bold text-slate-600">
                            መቶኛ ክብደት (%)
                          </label>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleStepCriterionWeight(idx, -5)}
                              className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                              title="5% ቀንስ"
                            >
                              -5%
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStepCriterionWeight(idx, +5)}
                              className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-800 transition-colors cursor-pointer"
                              title="5% ጨምር"
                            >
                              +5%
                            </button>
                          </div>
                        </div>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={item.max}
                          onChange={(e) => handleCriterionItemChange(idx, 'max', e.target.value)}
                          required
                          className={`w-full px-2 py-1.5 text-xs font-mono font-black text-center border ${color.border} rounded-xl bg-white ${color.focus} text-slate-900 shadow-2xs`}
                        />
                      </div>
                    </div>
                  );
                })}

                {/* Big Card to add more criterion if needed */}
                <button
                  type="button"
                  onClick={() => handleAddCriterion()}
                  className={`${
                    modalViewMode === 'horizontal' ? 'min-w-[180px] flex-shrink-0' : ''
                  } p-3.5 rounded-2xl border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50 transition-all flex flex-col items-center justify-center gap-2 min-h-[140px] text-emerald-800 font-bold text-xs cursor-pointer group`}
                >
                  <div className="w-8 h-8 rounded-full bg-emerald-100 group-hover:bg-emerald-200 flex items-center justify-center transition-colors">
                    <Plus className="w-5 h-5 text-emerald-800" />
                  </div>
                  <span>+ አዲስ መመዘኛ ጨምር</span>
                  <span className="text-[10px] font-normal text-slate-500">ለምሳሌ፡ አሳይመንት፣ ፕሮጀክት</span>
                </button>
              </div>

              {/* Total Percentage Calculation Badge */}
              <div
                className={`p-3.5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs font-bold transition-all ${
                  totalSchemeWeight === 100
                    ? 'bg-emerald-50 text-emerald-950 border border-emerald-300 shadow-xs'
                    : 'bg-amber-50 text-amber-950 border border-amber-300 shadow-xs'
                }`}
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className={`w-4 h-4 ${totalSchemeWeight === 100 ? 'text-emerald-700' : 'text-amber-700'}`} />
                  <span>
                    የመመዘኛዎቹ ድምር መቶኛ (Total Weight):{' '}
                    <strong className="text-slate-900 font-mono">
                      {editingItems.map((it) => it.max).join(' + ')}
                    </strong>
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm sm:text-base font-black px-3 py-1 rounded-xl bg-white border border-slate-200 shadow-2xs">
                    = {totalSchemeWeight}% {totalSchemeWeight === 100 ? '✓ (ትክክል - 100%)' : '⚠️ (100% መሙላት ይመረጣል)'}
                  </span>

                  {totalSchemeWeight !== 100 && (
                    <button
                      type="button"
                      onClick={handleAutoBalance}
                      className="text-[11px] font-bold text-amber-800 underline hover:text-amber-950 cursor-pointer"
                    >
                      100% አስማማ
                    </button>
                  )}
                </div>
              </div>

              {/* Footer buttons */}
              <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleResetSchemeToDefault}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 px-3.5 py-2 rounded-xl transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>ወደ ነባሪ መልስ (Reset Default)</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsSchemeModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                  >
                    ሰርዝ
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs px-5 py-2.5 rounded-xl font-bold shadow-md hover:shadow-lg transition-all cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>ቅንብሩን መዝግብ (Save Scheme)</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Batch Score Fill (ተመሳሳይ ውጤት ለሁሉም መሙያ) */}
      {isBatchFillOpen && activeCourse && (
        <BatchScoreFillModal
          course={activeCourse}
          students={students}
          currentGrades={localGrades}
          initialCriterionId={batchInitialCriterionId}
          onApply={handleApplyBatchScores}
          onClose={() => {
            setIsBatchFillOpen(false);
            setBatchInitialCriterionId(undefined);
          }}
          showNotify={showNotify}
        />
      )}

      {/* MODAL: Excel Upload / Import */}
      {isExcelUploadOpen && activeCourse && (
        <ExcelUploadModal
          course={activeCourse}
          students={students}
          currentYear={currentYear}
          currentSemester={currentSemester}
          onApplyGrades={handleApplyImportedScores}
          onClose={() => setIsExcelUploadOpen(false)}
          showNotify={showNotify}
        />
      )}

      {/* MODAL: Official Course Grade Report PDF / Printable View */}
      {isPdfModalOpen && activeCourse && (
        <CourseGradeReportPdfModal
          course={activeCourse}
          students={students}
          grades={localGrades}
          currentYear={currentYear}
          currentSemester={currentSemester}
          churchLogo={churchLogo}
          officialConfig={officialConfig}
          onClose={() => {
            setIsPdfModalOpen(false);
            setPdfAutoDownload(false);
          }}
          autoDownload={pdfAutoDownload}
        />
      )}
    </div>
  );
};
