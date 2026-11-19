import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  Award,
  GraduationCap,
  CheckCircle2,
  Clock,
  Shield,
  UserCheck,
  Search,
  Filter,
  Download,
  Printer,
  ChevronRight,
  BookOpen,
  Calendar,
  Sparkles,
  AlertCircle,
  FileSpreadsheet,
  Save,
  Check,
  Edit3,
  Plus,
  Edit,
  Trash2,
  X,
  History,
  Layers,
  Upload,
  Sliders,
  Settings2,
  Percent,
  RotateCcw
} from 'lucide-react';
import { AssessmentCriterionItem, Course, GradeBreakdown, OfficialSignaturesConfig, ProgramType, Student, UserRole } from '../types.ts';
import { sortStudentsByAmharicName } from '../utils/amharicSort.ts';
import {
  calculateGradeDetails,
  calculateStudentGPA,
  getCourseAssessmentItems,
  getCriterionScore,
  getEffectiveGradeValues,
  getGradeKey,
  resolveGradeBreakdown
} from '../utils/gradeCalculations.ts';
import { GraduationTranscriptModal } from './GraduationTranscriptModal.tsx';
import { exportCourseGradesToExcel, exportMasterSemesterGradeSheetToExcel, ExcelApplyMeta } from '../utils/excelUtils.ts';
import { ExcelUploadModal } from './ExcelUploadModal.tsx';
import {
  DIPLOMA_CURRICULUM,
  loadHistorical2018Courses,
  saveHistorical2018Courses,
  getInitial2018HistoricalCourses
} from '../data/curriculumCourses.ts';
import { CourseGradeReportPdfModal } from './CourseGradeReportPdfModal.tsx';
import { OFFICIAL_GRADING_SCALE, PRELOADED_TEACHERS } from '../data/initialData.ts';
import { FastScoreInput } from './FastScoreInput.tsx';
import { useIsMobile } from '../utils/useIsMobile.ts';
import {
  useLanguage,
  formatProgram,
  formatGender,
  formatSemester,
  formatCalendarYear,
  formatYearLevel,
  formatGradeDesc,
  formatCriterionLabel,
  formatTeacherDisplay,
  formatCourseTitle,
  formatRole
} from '../utils/i18n.tsx';

const EMPTY_GRAD_BREAKDOWN: GradeBreakdown = { p1: 0, p2: 0, mid: 0, final: 0, att: 0 };

const STATIC_GRAD_DESKTOP_OPTIONS_AM = OFFICIAL_GRADING_SCALE.map((tier) => (
  <option key={tier.letter} value={tier.letter}>
    {tier.letter} ({tier.min === 0 ? '<50%' : `${tier.min}–${tier.max}%`}, {tier.points.toFixed(2)} ነጥብ) — {tier.desc}
  </option>
));

const STATIC_GRAD_DESKTOP_OPTIONS_EN = OFFICIAL_GRADING_SCALE.map((tier) => (
  <option key={tier.letter} value={tier.letter}>
    {tier.letter} ({tier.min === 0 ? '<50%' : `${tier.min}–${tier.max}%`}, {tier.points.toFixed(2)} pts) — {formatGradeDesc(tier.desc, 'en')}
  </option>
));

const STATIC_GRAD_MOBILE_OPTIONS = OFFICIAL_GRADING_SCALE.map((tier) => (
  <option key={tier.letter} value={tier.letter}>
    {tier.letter} ({tier.min === 0 ? '<50%' : `${tier.min}–${tier.max}%`})
  </option>
));

interface GradStudentItemProps {
  student: Student;
  idx: number;
  breakdown: GradeBreakdown | undefined;
  criteria: AssessmentCriterionItem[];
  totalWeight: number;
  semesterGPA: string;
  onScoreChange: (studentUid: string, itemId: string, val: string, maxVal: number, itemIndex?: number) => void;
  onCustomTotalChange: (studentUid: string, val: string) => void;
  onCustomLetterChange: (studentUid: string, val: string) => void;
  onSelectTranscript: (student: Student) => void;
  onCellKeyDown?: (e: React.KeyboardEvent<HTMLElement>, r: number, c: number) => void;
}

const GradStudentDesktopRow: React.FC<GradStudentItemProps> = React.memo(
  ({
    student,
    idx,
    breakdown,
    criteria,
    semesterGPA,
    onScoreChange,
    onCustomTotalChange,
    onCustomLetterChange,
    onSelectTranscript,
    onCellKeyDown
  }) => {
    const { lang, t } = useLanguage();
    const g = breakdown || EMPTY_GRAD_BREAKDOWN;
    const eff = getEffectiveGradeValues(g, criteria);

    const handleLetterChange = useCallback(
      (e: React.ChangeEvent<HTMLSelectElement>) => {
        onCustomLetterChange(student.uid, e.target.value);
      },
      [onCustomLetterChange, student.uid]
    );

    const handleLetterKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLSelectElement>) => {
        onCellKeyDown?.(e, idx, criteria.length + 1);
      },
      [onCellKeyDown, idx, criteria.length]
    );

    const handleTranscriptClick = useCallback(() => {
      onSelectTranscript(student);
    }, [onSelectTranscript, student]);

    return (
      <tr className="hover:bg-slate-50">
        <td className="p-2.5 font-mono text-slate-400">{idx + 1}</td>
        <td className="p-2.5 font-mono font-bold text-slate-900">{student.id}</td>
        <td className="p-2.5 font-bold text-slate-900 sticky left-0 bg-white z-10 min-w-[170px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]">
          {student.name}
        </td>
        <td className="p-2.5 text-center text-slate-600">{formatGender(student.gender, lang) || '—'}</td>

        {criteria.map((it, itIdx) => {
          const score = getCriterionScore(g, it.id);
          return (
            <td key={it.id} className="p-1.5 text-center border-r border-indigo-50">
              <FastScoreInput
                value={score}
                min={0}
                max={it.max}
                step="0.5"
                placeholder="—"
                dataCellR={idx}
                dataCellC={itIdx}
                studentUid={student.uid}
                itemId={it.id}
                itemIndex={itIdx}
                onCommitScore={onScoreChange}
                onNavigateCell={onCellKeyDown}
                className="compact-cell-input w-14 px-1 py-1 text-center font-mono text-xs border border-indigo-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-600"
                title={`${formatCriterionLabel(it.label, lang)} (${t('ከ', 'out of')} ${it.max}%)`}
              />
            </td>
          );
        })}

        <td className="p-1 text-center bg-slate-50/50"></td>

        <td className="p-1.5 text-center bg-emerald-50/40">
          <FastScoreInput
            value={typeof g.customTotal === 'number' ? g.customTotal : eff.hasAny ? eff.total : undefined}
            emptyAsZero={false}
            min={0}
            max={100}
            step="0.5"
            placeholder={eff.hasAny ? String(eff.total) : '—'}
            dataCellR={idx}
            dataCellC={criteria.length}
            studentUid={student.uid}
            onCommitStudentValue={onCustomTotalChange}
            onNavigateCell={onCellKeyDown}
            className="compact-cell-input w-16 px-1 py-1 text-center font-black font-mono text-xs border border-emerald-300 rounded-lg bg-white text-emerald-950 focus:ring-2 focus:ring-emerald-600"
            title={t('ድምር ውጤት (የተሰላ ወይም ቀጥታ ያስገቡት)', 'Total Score (computed or direct entry)')}
          />
        </td>

        <td className="p-1.5 text-center bg-amber-50/40">
          <select
            data-cell-r={idx}
            data-cell-c={criteria.length + 1}
            onKeyDown={handleLetterKeyDown}
            value={g.customLetter || (eff.hasAny ? eff.letter : '—')}
            onChange={handleLetterChange}
            className="compact-cell-input px-1 py-1 text-center font-black text-xs border border-amber-300 rounded-lg bg-white text-amber-900 focus:ring-2 focus:ring-amber-600 cursor-pointer"
            title={t('ይፋዊ የውጤት ፊደል ደረጃዎች', 'Official Grade Letter Tiers')}
          >
            <option value="—">—</option>
            {lang === 'en' ? STATIC_GRAD_DESKTOP_OPTIONS_EN : STATIC_GRAD_DESKTOP_OPTIONS_AM}
          </select>
        </td>

        <td className="p-2.5 text-center font-bold font-mono">
          {eff.hasAny ? eff.points.toFixed(2) : '—'}
        </td>
        <td className="p-2.5 text-center font-mono font-bold text-indigo-900 bg-indigo-50/30">
          {semesterGPA}
        </td>
        <td className="p-2.5 text-right">
          <button
            type="button"
            onClick={handleTranscriptClick}
            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-900 text-[10px] px-2 py-1 rounded-lg font-bold border border-indigo-200 flex items-center gap-1 ml-auto cursor-pointer"
            title={t('የዚህን ተማሪ ሙሉ ባለ 4 ሴሚስተር የምረቃ ትራንስክሪፕት ይመልከቱ', 'View full 4-semester graduation transcript')}
          >
            <Award className="w-3 h-3 text-indigo-700" />
            <span>{t('ሙሉ ሰነድ', 'Full Transcript')}</span>
          </button>
        </td>
      </tr>
    );
  }
);
GradStudentDesktopRow.displayName = 'GradStudentDesktopRow';

const GradStudentMobileCard: React.FC<GradStudentItemProps> = React.memo(
  ({
    student,
    idx,
    breakdown,
    criteria,
    totalWeight,
    semesterGPA,
    onScoreChange,
    onCustomTotalChange,
    onCustomLetterChange,
    onSelectTranscript
  }) => {
    const { lang, t } = useLanguage();
    const g = breakdown || EMPTY_GRAD_BREAKDOWN;
    const eff = getEffectiveGradeValues(g, criteria);

    const handleLetterChange = useCallback(
      (e: React.ChangeEvent<HTMLSelectElement>) => {
        onCustomLetterChange(student.uid, e.target.value);
      },
      [onCustomLetterChange, student.uid]
    );

    const handleTranscriptClick = useCallback(() => {
      onSelectTranscript(student);
    }, [onSelectTranscript, student]);

    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-2xs space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[11px] font-mono text-slate-400">#{idx + 1} • {student.id}</span>
            <h5 className="font-bold text-slate-900 text-sm leading-snug">{student.name}</h5>
          </div>
          <button
            type="button"
            onClick={handleTranscriptClick}
            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-900 text-[11px] px-2.5 py-1.5 min-h-[34px] rounded-xl font-bold border border-indigo-200 flex items-center gap-1 cursor-pointer shrink-0"
          >
            <Award className="w-3.5 h-3.5 text-indigo-700" />
            <span>{t('ሙሉ ሰነድ', 'Transcript')}</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {criteria.map((it, itIdx) => {
            const score = getCriterionScore(g, it.id);
            return (
              <div key={it.id} className="bg-indigo-50/50 rounded-xl p-2 border border-indigo-100">
                <label className="block text-[11px] font-bold text-indigo-950 truncate mb-1" title={formatCriterionLabel(it.label, lang)}>
                  {formatCriterionLabel(it.label, lang)} ({it.max}%)
                </label>
                <FastScoreInput
                  value={score}
                  min={0}
                  max={it.max}
                  step="0.5"
                  placeholder="—"
                  studentUid={student.uid}
                  itemId={it.id}
                  itemIndex={itIdx}
                  onCommitScore={onScoreChange}
                  className="w-full px-2.5 py-1.5 min-h-[40px] text-center font-mono text-base font-bold border border-indigo-200 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-indigo-600 tabular-nums"
                />
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 items-end">
          <div>
            <label className="block text-[10px] font-bold text-emerald-900 mb-1">{t('ድምር', 'Total')} ({totalWeight}%)</label>
            <FastScoreInput
              value={typeof g.customTotal === 'number' ? g.customTotal : eff.hasAny ? eff.total : undefined}
              emptyAsZero={false}
              min={0}
              max={100}
              step="0.5"
              placeholder={eff.hasAny ? String(eff.total) : '—'}
              studentUid={student.uid}
              onCommitStudentValue={onCustomTotalChange}
              className="w-full px-2 py-1.5 min-h-[40px] text-center font-black font-mono text-base border border-emerald-300 rounded-lg bg-emerald-50/40 text-emerald-950 tabular-nums"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-amber-900 mb-1">{t('ደረጃ', 'Grade')}</label>
            <select
              value={g.customLetter || (eff.hasAny ? eff.letter : '—')}
              onChange={handleLetterChange}
              className="w-full px-2 py-1.5 min-h-[40px] text-center font-black text-sm border border-amber-300 rounded-lg bg-amber-50/40 text-amber-900 cursor-pointer"
            >
              <option value="—">—</option>
              {STATIC_GRAD_MOBILE_OPTIONS}
            </select>
          </div>
          <div className="bg-slate-50 rounded-xl p-2 border border-slate-200 text-center">
            <span className="text-[10px] text-slate-500 block font-bold">{t('ነጥብ / GPA', 'Pts / GPA')}</span>
            <span className="text-xs font-black font-mono text-indigo-900 tabular-nums">
              {eff.hasAny ? eff.points.toFixed(2) : '—'} / {semesterGPA}
            </span>
          </div>
        </div>
      </div>
    );
  }
);
GradStudentMobileCard.displayName = 'GradStudentMobileCard';

interface GraduationManagerProps {
  students: Student[];
  courses: Course[];
  grades: Record<string, GradeBreakdown>;
  currentYear: string;
  currentSemester: string;
  availableYears: string[];
  currentUserRole: UserRole;
  officialConfig?: OfficialSignaturesConfig;
  churchLogo?: string;
  onUpdateStudents: (updatedStudents: Student[]) => void;
  showNotify: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  onSaveGrades?: (updatedGrades: Record<string, GradeBreakdown>) => void;
  onSaveCourses?: (updatedCourses: Course[]) => void;
  teachers?: string[];
  onDeleteCourse?: (courseId: string) => void;
  onOpenSampleCoursesModal?: () => void;
}

export const GraduationManager: React.FC<GraduationManagerProps> = ({
  students,
  courses,
  grades,
  currentYear,
  currentSemester,
  availableYears,
  currentUserRole,
  officialConfig,
  churchLogo,
  onUpdateStudents,
  showNotify,
  onSaveGrades,
  onSaveCourses,
  teachers = PRELOADED_TEACHERS,
  onDeleteCourse,
  onOpenSampleCoursesModal
}) => {
  const { lang, t } = useLanguage();
  const [activeSubTab, setActiveSubTab] = useState<'verification' | 'graduates_grading' | 'archive'>('graduates_grading');
  const [searchTerm, setSearchTerm] = useState('');
  const [programFilter, setProgramFilter] = useState<'ALL' | ProgramType>('ALL');
  const [yearFilter, setYearFilter] = useState<'ALL' | number>('ALL');
  const [archiveYearFilter, setArchiveYearFilter] = useState<string>(currentYear);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'CANDIDATE' | 'GRADUATED'>('ALL');
  const [selectedTranscriptStudent, setSelectedTranscriptStudent] = useState<Student | null>(null);

  // Dedicated 2018.. Diploma Graduates Grading State
  const diploma2018Students = useMemo(() => {
    const list = students.filter(
      (s) => s.program === 'Diploma' && (s.admissionYear === '2018' || s.id.startsWith('2018'))
    );
    return sortStudentsByAmharicName(list);
  }, [students]);


  const isMobileViewport = useIsMobile(768);

  // Historical 2018 Courses State
  const [historical2018Courses, setHistorical2018Courses] = useState<Course[]>(() => loadHistorical2018Courses());

  // Grading Period Selection (Default to 2018 Sem 1 for historical grade entry)
  const [gradingYear, setGradingYear] = useState<string>('2018');
  const [gradingSemester, setGradingSemester] = useState<string>('1');

  // Courses available for the chosen grading period
  const activeCoursesForGrading = useMemo(() => {
    if (gradingYear === '2018') {
      const filtered = historical2018Courses.filter(
        (c) => (c.academicYear === '2018' || !c.academicYear) && (c.semester === gradingSemester || !c.semester)
      );
      return filtered.length > 0 ? filtered : historical2018Courses;
    } else {
      // 2019 active diploma courses
      return courses.filter((c) => c.program === 'Diploma');
    }
  }, [gradingYear, gradingSemester, historical2018Courses, courses]);

  // Selected Course for grading
  const [selectedGradCourseId, setSelectedGradCourseId] = useState<string>(
    activeCoursesForGrading[0]?.id || 'dip_sem1_1'
  );

  const selectedGradCourse = useMemo(() => {
    return activeCoursesForGrading.find((c) => c.id === selectedGradCourseId) || activeCoursesForGrading[0];
  }, [activeCoursesForGrading, selectedGradCourseId]);

  // Synchronize selected course when grading period or course list changes
  useEffect(() => {
    if (activeCoursesForGrading.length > 0) {
      const exists = activeCoursesForGrading.some((c) => c.id === selectedGradCourseId);
      if (!exists) {
        setSelectedGradCourseId(activeCoursesForGrading[0].id);
      }
    }
  }, [activeCoursesForGrading, selectedGradCourseId]);

  // Local scores matrix for the active course and period
  const [localGradingGrades, setLocalGradingGrades] = useState<Record<string, GradeBreakdown>>({});
  const [isPdfGradeReportOpen, setIsPdfGradeReportOpen] = useState(false);
  const [isExcelUploadOpen, setIsExcelUploadOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const unsavedRef = useRef(false);
  const currentMatrixRef = useRef<Record<string, GradeBreakdown>>({});
  const prevCourseIdRef = useRef(selectedGradCourseId);
  const prevYearRef = useRef(gradingYear);
  const prevSemRef = useRef(gradingSemester);

  // Keep matrix ref in sync
  currentMatrixRef.current = localGradingGrades;

  // Sync local grading matrix when course or period changes (with auto-save for unsaved changes)
  useEffect(() => {
    // If the user had typed unsaved grades on the PREVIOUS course/semester, auto-save them now so they don't vanish!
    if (unsavedRef.current && prevCourseIdRef.current && onSaveGrades) {
      const prevCId = prevCourseIdRef.current;
      const prevYr = prevYearRef.current;
      const prevSm = prevSemRef.current;
      const prevMatrix = currentMatrixRef.current;

      const updated = { ...grades };
      diploma2018Students.forEach((s) => {
        const keyByUid = getGradeKey(s.uid, prevCId, prevYr, prevSm);
        const directKey = `${s.uid}_${prevCId}`;
        const scoreVal = prevMatrix[s.uid] || { p1: 0, p2: 0, mid: 0, final: 0, att: 0 };
        updated[keyByUid] = scoreVal;
        updated[directKey] = scoreVal;
        if (s.id) {
          const keyById = getGradeKey(s.id, prevCId, prevYr, prevSm);
          updated[keyById] = scoreVal;
        }
      });
      onSaveGrades(updated);
      try {
        const stored = localStorage.getItem('bk_grades');
        const curr = stored ? JSON.parse(stored) : {};
        localStorage.setItem('bk_grades', JSON.stringify({ ...curr, ...updated }));
      } catch (_) {}
      unsavedRef.current = false;
      setHasUnsavedChanges(false);
    }

    prevCourseIdRef.current = selectedGradCourse?.id || '';
    prevYearRef.current = gradingYear;
    prevSemRef.current = gradingSemester;

    if (!selectedGradCourse) return;
    const initial: Record<string, GradeBreakdown> = {};
    diploma2018Students.forEach((s) => {
      const g = resolveGradeBreakdown(
        grades,
        s.uid,
        selectedGradCourse.id,
        gradingYear,
        gradingSemester,
        s.id
      );
      initial[s.uid] = { ...g };
    });
    setLocalGradingGrades(initial);
    unsavedRef.current = false;
    setHasUnsavedChanges(false);
  }, [selectedGradCourse?.id, gradingYear, gradingSemester, diploma2018Students.length]);

  // Add/Edit Course Modal State for 2018 Historical Courses
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [editingCourseTarget, setEditingCourseTarget] = useState<Course | null>(null);

  // Assessment Criteria Customization State (መምህሩ ባስፈተነበት መንገድ መጨመር/መቀነስ/ኤዲት ማድረጊያ)
  const [isCriterionModalOpen, setIsCriterionModalOpen] = useState(false);
  const [editingCriterionTarget, setEditingCriterionTarget] = useState<AssessmentCriterionItem | null>(null);
  const [criterionFormLabel, setCriterionFormLabel] = useState('');
  const [criterionFormMax, setCriterionFormMax] = useState<number>(20);
  const [showGradingScaleRef, setShowGradingScaleRef] = useState(true);

  const mergeHistIntoAllCourses = (updatedHist: Course[], deletedId?: string): Course[] => {
    const histById = new Map<string, Course>();
    updatedHist.forEach((c) => histById.set(c.id, c));
    const merged = courses
      .filter((c) => {
        if (deletedId && c.id === deletedId) return false;
        const isHist2018 =
          c.academicYear === '2018' ||
          c.id.includes('2018') ||
          c.id.startsWith('dip_sem1') ||
          c.id.startsWith('dip_sem2') ||
          c.id.startsWith('hist_');
        if (isHist2018 && !histById.has(c.id)) {
          return false;
        }
        return true;
      })
      .map((c) => histById.get(c.id) || c);

    updatedHist.forEach((hc) => {
      if (!merged.some((c) => c.id === hc.id)) {
        merged.push(hc);
      }
    });
    return merged;
  };

  // Helper to persist updated criteria on selected course
  const updateGradCourseCriteria = (newItems: AssessmentCriterionItem[]) => {
    if (!selectedGradCourse) return;
    const updatedCourse: Course = {
      ...selectedGradCourse,
      assessmentConfig: {
        items: newItems,
        p1Label: newItems[0]?.label || 'ክፍል 1',
        p1Max: newItems[0]?.max || 20,
        p2Label: newItems[1]?.label || 'ክፍል 2',
        p2Max: newItems[1]?.max || 20,
        midLabel: newItems[2]?.label || 'ሚድ',
        midMax: newItems[2]?.max || 30,
        finalLabel: newItems[3]?.label || 'ፋይናል',
        finalMax: newItems[3]?.max || 20,
        attLabel: newItems[4]?.label || 'ተሳትፎ',
        attMax: newItems[4]?.max || 10
      }
    };

    const updatedCourses = historical2018Courses.map((c) =>
      c.id === selectedGradCourse.id ? updatedCourse : c
    );
    setHistorical2018Courses(updatedCourses);
    saveHistorical2018Courses(updatedCourses);
    onSaveCourses?.(mergeHistIntoAllCourses(updatedCourses));
  };

  // Add a new criterion
  const handleAddGradCriterion = (customLabel?: string, customMax?: number) => {
    if (!selectedGradCourse) return;
    const currentCriteria = getCourseAssessmentItems(selectedGradCourse);
    if (currentCriteria.length >= 10) {
      showNotify(t('ከ 10 መመዘኛ በላይ ማከል አይቻልም!', 'Cannot add more than 10 assessment criteria!'), 'warning');
      return;
    }
    const nextNum = currentCriteria.length + 1;
    const newItem: AssessmentCriterionItem = {
      id: 'crit_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 5),
      label: customLabel || `${t('መመዘኛ', 'Criterion')} ${nextNum}`,
      max: typeof customMax === 'number' ? customMax : 20
    };
    updateGradCourseCriteria([...currentCriteria, newItem]);
    showNotify(
      t(
        `አዲስ የውጤት መመዘኛ «${newItem.label}» (${newItem.max}%) ተጨምሯል!`,
        `New grading criterion "${newItem.label}" (${newItem.max}%) added!`
      ),
      'success'
    );
  };

  // Remove a criterion
  const handleRemoveGradCriterion = (criterionId: string, label: string) => {
    if (!selectedGradCourse) return;
    const currentCriteria = getCourseAssessmentItems(selectedGradCourse);
    if (currentCriteria.length <= 1) {
      showNotify(t('ቢያንስ 1 የውጤት ማስገቢያ መመዘኛ መኖር አለበት!', 'At least 1 assessment criterion must remain!'), 'warning');
      return;
    }
    const displayLabel = formatCriterionLabel(label, lang);
    if (
      window.confirm(
        t(
          `እርግጠኛ ነዎት? «${displayLabel}» የሚለውን የውጤት ማስገቢያ መቀነስ/ማስወገድ ይፈልጋሉ?`,
          `Are you sure you want to remove the "${displayLabel}" grading criterion?`
        )
      )
    ) {
      const remaining = currentCriteria.filter((it) => it.id !== criterionId);
      updateGradCourseCriteria(remaining);
      showNotify(
        t(`የውጤት ማስገቢያ «${displayLabel}» ተቀንሷል!`, `Grading criterion "${displayLabel}" removed!`),
        'info'
      );
    }
  };

  // Open Edit Criterion Modal
  const handleOpenCriterionModal = (criterion?: AssessmentCriterionItem) => {
    if (criterion) {
      setEditingCriterionTarget(criterion);
      setCriterionFormLabel(criterion.label);
      setCriterionFormMax(criterion.max);
    } else {
      const currentCriteria = selectedGradCourse ? getCourseAssessmentItems(selectedGradCourse) : [];
      setEditingCriterionTarget(null);
      setCriterionFormLabel(`${t('መመዘኛ', 'Criterion')} ${currentCriteria.length + 1}`);
      setCriterionFormMax(20);
    }
    setIsCriterionModalOpen(true);
  };

  // Save Criterion from Modal
  const handleSaveCriterionModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGradCourse) return;
    const cleanLabel = criterionFormLabel.trim();
    if (!cleanLabel) {
      showNotify(t('እባክዎ የመመዘኛውን ስም ያስገቡ!', 'Please enter a criterion label!'), 'warning');
      return;
    }
    const cleanMax = Math.max(1, Math.min(100, Number(criterionFormMax) || 20));
    const currentCriteria = getCourseAssessmentItems(selectedGradCourse);

    if (editingCriterionTarget) {
      const updated = currentCriteria.map((it) =>
        it.id === editingCriterionTarget.id ? { ...it, label: cleanLabel, max: cleanMax } : it
      );
      updateGradCourseCriteria(updated);
      showNotify(
        t(
          `የመመዘኛ «${formatCriterionLabel(cleanLabel, lang)}» መረጃ በስኬት ተስተካክሏል!`,
          `Criterion "${formatCriterionLabel(cleanLabel, lang)}" updated successfully!`
        ),
        'success'
      );
    } else {
      if (currentCriteria.length >= 10) {
        showNotify(t('ከ 10 መመዘኛ በላይ ማከል አይቻልም!', 'Cannot add more than 10 assessment criteria!'), 'warning');
        return;
      }
      const newItem: AssessmentCriterionItem = {
        id: 'crit_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 5),
        label: cleanLabel,
        max: cleanMax
      };
      updateGradCourseCriteria([...currentCriteria, newItem]);
      showNotify(
        t(
          `አዲስ መመዘኛ «${cleanLabel}» (${cleanMax}%) ተጨምሯል!`,
          `New criterion "${cleanLabel}" (${cleanMax}%) added!`
        ),
        'success'
      );
    }
    setIsCriterionModalOpen(false);
  };

  // Apply Quick Assessment Presets
  const handleApplyGradPreset = (presetKey: string) => {
    if (!selectedGradCourse) return;
    let presetItems: AssessmentCriterionItem[] = [];
    if (presetKey === '1_100') {
      presetItems = [{ id: 'crit_1', label: 'ፈተና/ምዘና', max: 100 }];
    } else if (presetKey === '2_50_50') {
      presetItems = [
        { id: 'crit_1', label: 'ክፍል 1 (ሚድ)', max: 50 },
        { id: 'crit_2', label: 'ክፍል 2 (ፋይናል)', max: 50 }
      ];
    } else if (presetKey === '2_40_60') {
      presetItems = [
        { id: 'crit_1', label: 'ሚድ ፈተና', max: 40 },
        { id: 'crit_2', label: 'ፋይናል ፈተና', max: 60 }
      ];
    } else if (presetKey === '3_30_30_40') {
      presetItems = [
        { id: 'crit_1', label: 'ክፍል 1', max: 30 },
        { id: 'crit_2', label: 'ክፍል 2', max: 30 },
        { id: 'crit_3', label: 'ፋይናል', max: 40 }
      ];
    } else if (presetKey === '3_20_30_50') {
      presetItems = [
        { id: 'crit_1', label: 'አሳይመንት', max: 20 },
        { id: 'crit_2', label: 'ሚድ ፈተና', max: 30 },
        { id: 'crit_3', label: 'ፋይናል ፈተና', max: 50 }
      ];
    } else if (presetKey === '4_20_20_30_30') {
      presetItems = [
        { id: 'crit_1', label: 'ክፍል 1', max: 20 },
        { id: 'crit_2', label: 'ክፍል 2', max: 20 },
        { id: 'crit_3', label: 'ሚድ', max: 30 },
        { id: 'crit_4', label: 'ፋይናል', max: 30 }
      ];
    } else {
      presetItems = [
        { id: 'p1', label: 'ክፍል 1', max: 20 },
        { id: 'p2', label: 'ክፍል 2', max: 20 },
        { id: 'mid', label: 'ሚድ', max: 30 },
        { id: 'final', label: 'ፋይናል', max: 20 },
        { id: 'att', label: 'ተሳትፎ', max: 10 }
      ];
    }

    updateGradCourseCriteria(presetItems);
    showNotify(t('የውጤት ማስገቢያ ቅንብር በስኬት ተተግብሯል!', 'Assessment scheme preset applied successfully!'), 'success');
  };

  // Form State for Course metadata
  const [formCourseCode, setFormCourseCode] = useState('');
  const [formCourseName, setFormCourseName] = useState('');
  const [formCourseTeacher, setFormCourseTeacher] = useState('');
  const [formCourseCredits, setFormCourseCredits] = useState<number>(3);
  const [formCourseYear, setFormCourseYear] = useState('2018');
  const [formCourseSemester, setFormCourseSemester] = useState('1');

  const openAddCourseModal = () => {
    setEditingCourseTarget(null);
    setFormCourseCode(`DIP-1${historical2018Courses.length + 1}`);
    setFormCourseName('');
    setFormCourseTeacher(teachers[0] || 'መ/ር አስራት አማኑኤል');
    setFormCourseCredits(3);
    setFormCourseYear('2018');
    setFormCourseSemester(gradingSemester);
    setIsCourseModalOpen(true);
  };

  const openEditCourseModal = (courseToEdit: Course) => {
    setEditingCourseTarget(courseToEdit);
    setFormCourseCode(courseToEdit.code || '');
    setFormCourseName(courseToEdit.name);
    setFormCourseTeacher(courseToEdit.teacher);
    setFormCourseCredits(courseToEdit.credits || 3);
    setFormCourseYear(courseToEdit.academicYear || '2018');
    setFormCourseSemester(courseToEdit.semester || gradingSemester);
    setIsCourseModalOpen(true);
  };

  const handleSaveCourseModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCourseName.trim()) {
      showNotify(t('እባክዎ የትምህርቱን ዓይነት ስም ያስገቡ!', 'Please enter the course title!'), 'warning');
      return;
    }

    if (editingCourseTarget) {
      // Update existing course
      const updated = historical2018Courses.map((c) =>
        c.id === editingCourseTarget.id
          ? {
              ...c,
              code: formCourseCode.trim() || undefined,
              name: formCourseName.trim(),
              teacher: formCourseTeacher.trim(),
              credits: Number(formCourseCredits) || 3,
              academicYear: formCourseYear,
              semester: formCourseSemester,
              schedule: `${formCourseYear} ዓ.ም — ${formCourseSemester}ኛ ሴሚስተር`
            }
          : c
      );
      setHistorical2018Courses(updated);
      saveHistorical2018Courses(updated);
      onSaveCourses?.(mergeHistIntoAllCourses(updated));
      showNotify(
        t(
          `የኮርስ «${formCourseName}» መረጃ በስኬት ተስተካክሏል!`,
          `Course "${formatCourseTitle(formCourseName, lang)}" updated successfully!`
        ),
        'success'
      );
    } else {
      // Create new course
      const newCourse: Course = {
        id: `hist_${Date.now()}`,
        program: 'Diploma',
        code: formCourseCode.trim() || undefined,
        name: formCourseName.trim(),
        teacher: formCourseTeacher.trim(),
        credits: Number(formCourseCredits) || 3,
        academicYear: formCourseYear,
        semester: formCourseSemester,
        schedule: `${formCourseYear} ዓ.ም — ${formCourseSemester}ኛ ሴሚስተር`
      };
      const updated = [...historical2018Courses, newCourse];
      setHistorical2018Courses(updated);
      saveHistorical2018Courses(updated);
      onSaveCourses?.(mergeHistIntoAllCourses(updated));
      setSelectedGradCourseId(newCourse.id);
      showNotify(
        t(
          `አዲስ የ2018 ኮርስ «${formCourseName}» (${formCourseSemester}ኛ ሴሚስተር) በስኬት ተመዝግቧል!`,
          `New 2018 course "${formCourseName}" (${formatSemester(formCourseSemester, lang)}) registered!`
        ),
        'success'
      );
    }

    setIsCourseModalOpen(false);
  };

  const handleDeleteHistoricalCourse = (courseId: string) => {
    const targetCourse =
      historical2018Courses.find((c) => c.id === courseId) ||
      activeCoursesForGrading.find((c) => c.id === courseId) ||
      courses.find((c) => c.id === courseId);
    const courseName = targetCourse
      ? `«${formatCourseTitle(targetCourse.name, lang)}»`
      : t('ይህንን የትምህርት ዓይነት', 'this course');

    if (
      window.confirm(
        t(
          `${courseName} የሚለውን የትምህርት ዓይነት ከሲስተሙ ማሰረዝ ይፈልጋሉ?`,
          `Are you sure you want to delete ${courseName} from the system?`
        )
      )
    ) {
      // Record permanently in deleted course IDs
      try {
        const storedDel = localStorage.getItem('bk_deleted_course_ids');
        const currentDel = storedDel ? JSON.parse(storedDel) : [];
        const updatedDel = Array.from(new Set([...currentDel, courseId]));
        localStorage.setItem('bk_deleted_course_ids', JSON.stringify(updatedDel));
      } catch (_) {}

      const updated = historical2018Courses.filter((c) => c.id !== courseId);
      setHistorical2018Courses(updated);
      saveHistorical2018Courses(updated);
      onDeleteCourse?.(courseId);
      onSaveCourses?.(mergeHistIntoAllCourses(updated, courseId));
      if (selectedGradCourseId === courseId) {
        setSelectedGradCourseId(updated[0]?.id || '');
      }
      showNotify(t(`${courseName} ከሲስተሙ ተሰርዟል!`, `${courseName} has been deleted!`), 'info');
    }
  };

  const canApprove = currentUserRole === 'ADMIN' || currentUserRole === 'DEAN' || currentUserRole === 'REGISTRAR';

  // Toggle approval by role
  const handleToggleApproval = (studentUid: string, roleToToggle: 'admin' | 'dean' | 'registrar') => {
    if (!canApprove) return;
    const updated = students.map((s) => {
      if (s.uid !== studentUid) return s;
      const currentApprovals = s.graduationApprovedBy || {};
      const newStatus = !currentApprovals[roleToToggle];
      const newApprovals = { ...currentApprovals, [roleToToggle]: newStatus };
      const allApproved = newApprovals.admin && newApprovals.dean && newApprovals.registrar;

      return {
        ...s,
        graduationApprovedBy: newApprovals,
        graduationStatus: allApproved ? ('CANDIDATE' as const) : s.graduationStatus
      };
    });

    onUpdateStudents(updated);
    const roleLabels = {
      admin: formatRole('ADMIN', lang),
      dean: formatRole('DEAN', lang),
      registrar: formatRole('REGISTRAR', lang)
    };
    showNotify(
      t(
        `የ${roleLabels[roleToToggle]} ማረጋገጫ በስኬት ተስተካክሏል!`,
        `${roleLabels[roleToToggle]} approval updated successfully!`
      ),
      'success'
    );
  };

  // Toggle Candidate Selection
  const handleToggleCandidate = (studentUid: string) => {
    const updated = students.map((s) => {
      if (s.uid !== studentUid) return s;
      const willBeCandidate = s.graduationStatus !== 'CANDIDATE';
      return {
        ...s,
        graduationStatus: (willBeCandidate ? 'CANDIDATE' : 'ACTIVE') as any,
        graduationApprovedBy: willBeCandidate
          ? {
              ...s.graduationApprovedBy,
              ...(currentUserRole === 'ADMIN' ? { admin: true } : {}),
              ...(currentUserRole === 'DEAN' ? { dean: true } : {}),
              ...(currentUserRole === 'REGISTRAR' ? { registrar: true } : {})
            }
          : s.graduationApprovedBy
      };
    });
    onUpdateStudents(updated);
    showNotify(
      t('የተማሪው የተማራቂነት ምርጫ በስኬት ተስተካክሏል!', 'Student graduation candidacy status updated!'),
      'success'
    );
  };

  // Batch Select all 2018.. Diploma students as Candidates
  const handleSelectAll2018Candidates = () => {
    const updated = students.map((s) => {
      if (s.program === 'Diploma' && (s.admissionYear === '2018' || s.id.startsWith('2018'))) {
        return {
          ...s,
          graduationStatus: 'CANDIDATE' as const,
          graduationApprovedBy: {
            admin: true,
            dean: true,
            registrar: true
          }
        };
      }
      return s;
    });
    onUpdateStudents(updated);
    showNotify(
      t(
        'ሁሉም የ2018.. መለያ ቁጥር ያላቸው የዲፕሎማ ተማሪዎች የ2019 ዓ.ም ተማራቂ ተብለው ተመርጠዋል!',
        'All 2018.. Diploma students designated as 2019 E.C. graduating candidates!'
      ),
      'success'
    );
  };

  // Finalize Graduation: move to official graduates archive
  const handleGraduateStudent = (studentUid: string) => {
    const updated = students.map((s) => {
      if (s.uid !== studentUid) return s;
      return {
        ...s,
        graduationStatus: 'GRADUATED' as const,
        graduationYear: currentYear,
        graduationSemester: currentSemester,
        graduationApprovedBy: {
          admin: true,
          dean: true,
          registrar: true
        }
      };
    });
    onUpdateStudents(updated);
    showNotify(
      t(
        `ተማሪው በ${currentYear} ዓ.ም (${currentSemester}ኛ ሴሚስተር) በይፋ ተመርቆ ወደ ተመራቂዎች ማህደር ተመዝግቧል!`,
        `Student officially graduated for ${formatCalendarYear(currentYear, lang)} (${formatSemester(currentSemester, lang)}) and archived!`
      ),
      'success'
    );
  };

  // Filter students for Verification Tab (memoized so typing scores never re-sorts)
  const candidateStudents = useMemo(
    () =>
      sortStudentsByAmharicName(
        students.filter((s) => {
          const matchesSearch =
            s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.id.toLowerCase().includes(searchTerm.toLowerCase());
          const matchesProg = programFilter === 'ALL' || s.program === programFilter;
          const matchesYear = yearFilter === 'ALL' || s.currentStudyYear === yearFilter;
          const matchesStatus = statusFilter === 'ALL' || (s.graduationStatus || 'ACTIVE') === statusFilter;
          return matchesSearch && matchesProg && matchesYear && matchesStatus;
        })
      ),
    [students, searchTerm, programFilter, yearFilter, statusFilter]
  );

  // Filter students for Archive Tab (memoized so typing scores never re-sorts)
  const archivedGraduates = useMemo(
    () =>
      sortStudentsByAmharicName(
        students.filter((s) => {
          const matchesSearch =
            s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.id.toLowerCase().includes(searchTerm.toLowerCase());
          const matchesProg = programFilter === 'ALL' || s.program === programFilter;
          const isGrad = s.graduationStatus === 'GRADUATED';
          const matchesYear = archiveYearFilter === 'ALL' || (s.graduationYear || currentYear) === archiveYearFilter;
          return matchesSearch && matchesProg && isGrad && matchesYear;
        })
      ),
    [students, searchTerm, programFilter, archiveYearFilter, currentYear]
  );

  const gradTbodyRef = useRef<HTMLTableSectionElement | null>(null);
  const gradRowCountRef = useRef(diploma2018Students.length);
  gradRowCountRef.current = diploma2018Students.length;
  const gradCriteriaLenRef = useRef(5);
  gradCriteriaLenRef.current = selectedGradCourse ? getCourseAssessmentItems(selectedGradCourse).length : 5;

  const handleGradCellKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLElement>, r: number, c: number) => {
      const maxRows = gradRowCountRef.current;
      const maxCols = gradCriteriaLenRef.current + 2;

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

      if (nextR === r && nextC === c) return;

      const rowEl = gradTbodyRef.current?.rows[nextR];
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


  // Pre-compute semester GPAs only when saved grades/courses/period change (never on every keystroke)
  const semesterGpaMap = useMemo(() => {
    const map: Record<string, string> = {};
    diploma2018Students.forEach((s) => {
      map[s.uid] = calculateStudentGPA(s, activeCoursesForGrading, grades, gradingYear, gradingSemester);
    });
    return map;
  }, [diploma2018Students, activeCoursesForGrading, grades, gradingYear, gradingSemester]);

  // Handle Score Input in Dedicated Grading Tab
  const handleGradingScoreChange = useCallback((
    studentUid: string,
    itemId: string,
    val: string,
    maxVal: number
  ) => {
    const parsed = val.trim() === '' ? 0 : Math.min(maxVal, Math.max(0, parseFloat(val) || 0));
    if (!unsavedRef.current) {
      unsavedRef.current = true;
      setHasUnsavedChanges(true);
    }
    setLocalGradingGrades((prev) => {
      const current = prev[studentUid] || { p1: 0, p2: 0, mid: 0, final: 0, att: 0 };
      const currentScores = current.scores ? { ...current.scores } : {};
      currentScores[itemId] = parsed;

      return {
        ...prev,
        [studentUid]: {
          ...current,
          scores: currentScores,
          ...(itemId === 'p1' ? { p1: parsed } : {}),
          ...(itemId === 'p2' ? { p2: parsed } : {}),
          ...(itemId === 'mid' ? { mid: parsed } : {}),
          ...(itemId === 'final' ? { final: parsed } : {}),
          ...(itemId === 'att' ? { att: parsed } : {})
        }
      };
    });
  }, []);

  // Handle Direct Custom Total Override (ድምር 100%)
  const handleCustomTotalChange = useCallback((studentUid: string, val: string) => {
    if (!unsavedRef.current) {
      unsavedRef.current = true;
      setHasUnsavedChanges(true);
    }
    setLocalGradingGrades((prev) => {
      const current = prev[studentUid] || { p1: 0, p2: 0, mid: 0, final: 0, att: 0 };
      if (val.trim() === '') {
        const { customTotal, ...rest } = current;
        return { ...prev, [studentUid]: rest };
      }
      const num = Math.min(100, Math.max(0, parseFloat(val) || 0));
      return {
        ...prev,
        [studentUid]: {
          ...current,
          customTotal: num
        }
      };
    });
  }, []);

  // Handle Direct Custom Letter Override (ደረጃ A+, A, B, ወዘተ)
  const handleCustomLetterChange = useCallback((studentUid: string, val: string) => {
    if (!unsavedRef.current) {
      unsavedRef.current = true;
      setHasUnsavedChanges(true);
    }
    setLocalGradingGrades((prev) => {
      const current = prev[studentUid] || { p1: 0, p2: 0, mid: 0, final: 0, att: 0 };
      if (!val || val === '—') {
        const { customLetter, ...rest } = current;
        return { ...prev, [studentUid]: rest };
      }
      return {
        ...prev,
        [studentUid]: {
          ...current,
          customLetter: val
        }
      };
    });
  }, []);

  // Save Grades for Chosen Course and Period
  const handleSaveGradingScores = () => {
    if (!selectedGradCourse || !onSaveGrades) return;
    const updated = { ...grades };
    diploma2018Students.forEach((s) => {
      const keyByUid = getGradeKey(s.uid, selectedGradCourse.id, gradingYear, gradingSemester);
      const directKey = `${s.uid}_${selectedGradCourse.id}`;
      const scoreVal = localGradingGrades[s.uid] || { p1: 0, p2: 0, mid: 0, final: 0, att: 0 };
      updated[keyByUid] = scoreVal;
      updated[directKey] = scoreVal;
      if (s.id) {
        const keyById = getGradeKey(s.id, selectedGradCourse.id, gradingYear, gradingSemester);
        updated[keyById] = scoreVal;
      }
    });
    onSaveGrades(updated);
    try {
      const stored = localStorage.getItem('bk_grades');
      const curr = stored ? JSON.parse(stored) : {};
      localStorage.setItem('bk_grades', JSON.stringify({ ...curr, ...updated }));
    } catch (_) {}
    setHasUnsavedChanges(false);
    unsavedRef.current = false;
    showNotify(
      t(
        `የተመራቂ ተማሪዎች የ${gradingYear} ዓ.ም ${gradingSemester}ኛ ሴሚስተር የ«${selectedGradCourse.name}» ውጤት በስኬት ተመዝግቧል!`,
        `Graduating students' grades for "${formatCourseTitle(selectedGradCourse.name, lang)}" (${formatCalendarYear(gradingYear, lang)}, ${formatSemester(gradingSemester, lang)}) saved!`
      ),
      'success'
    );
  };

  // Export Chosen Period Course Grades to Excel
  const handleExport2018GraduatesExcel = () => {
    if (!selectedGradCourse) return;
    exportCourseGradesToExcel(
      selectedGradCourse,
      diploma2018Students,
      localGradingGrades,
      gradingYear,
      gradingSemester
    );
    showNotify(
      t(
        `የ${selectedGradCourse.name} የተመራቂዎች ውጤት ኤክሴል (.xlsx) በስኬት ወርዷል!`,
        `Graduates' "${formatCourseTitle(selectedGradCourse.name, lang)}" grades Excel (.xlsx) exported!`
      ),
      'success'
    );
  };

  // Handle Grades Imported via Excel for the Active Course
  const handleApplyExcelGrades = (
    updatedScoresByUid: Record<string, Record<string, number>>,
    meta?: ExcelApplyMeta
  ) => {
    if (!selectedGradCourse) return;

    setLocalGradingGrades((prev) => {
      const next = { ...prev };
      Object.entries(updatedScoresByUid).forEach(([uid, scoresMap]) => {
        const current = next[uid] || { p1: 0, p2: 0, mid: 0, final: 0, att: 0 };
        const currentScores = current.scores ? { ...current.scores } : {};
        Object.entries(scoresMap).forEach(([itemId, val]) => {
          currentScores[itemId] = val;
        });

        const updatedItem: GradeBreakdown = {
          ...current,
          scores: currentScores,
          ...(scoresMap['p1'] !== undefined ? { p1: scoresMap['p1'] } : {}),
          ...(scoresMap['p2'] !== undefined ? { p2: scoresMap['p2'] } : {}),
          ...(scoresMap['mid'] !== undefined ? { mid: scoresMap['mid'] } : {}),
          ...(scoresMap['final'] !== undefined ? { final: scoresMap['final'] } : {}),
          ...(scoresMap['att'] !== undefined ? { att: scoresMap['att'] } : {})
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

    if (onSaveGrades) {
      const updatedGlobal = { ...grades };
      diploma2018Students.forEach((s) => {
        const incomingScores = updatedScoresByUid[s.uid];
        if (incomingScores) {
          const current = localGradingGrades[s.uid] || { p1: 0, p2: 0, mid: 0, final: 0, att: 0 };
          const scoreVal: GradeBreakdown = {
            ...current,
            scores: { ...(current.scores || {}), ...incomingScores },
            ...(incomingScores['p1'] !== undefined ? { p1: incomingScores['p1'] } : {}),
            ...(incomingScores['p2'] !== undefined ? { p2: incomingScores['p2'] } : {}),
            ...(incomingScores['mid'] !== undefined ? { mid: incomingScores['mid'] } : {}),
            ...(incomingScores['final'] !== undefined ? { final: incomingScores['final'] } : {}),
            ...(incomingScores['att'] !== undefined ? { att: incomingScores['att'] } : {})
          };
          if (meta?.customTotalsByUid && meta.customTotalsByUid[s.uid] !== undefined) {
            scoreVal.customTotal = meta.customTotalsByUid[s.uid];
          } else {
            delete scoreVal.customTotal;
          }
          if (meta?.customLettersByUid && meta.customLettersByUid[s.uid]) {
            scoreVal.customLetter = meta.customLettersByUid[s.uid];
          } else {
            delete scoreVal.customLetter;
          }
          const keyByUid = getGradeKey(s.uid, selectedGradCourse.id, gradingYear, gradingSemester);
          const directKey = `${s.uid}_${selectedGradCourse.id}`;
          updatedGlobal[keyByUid] = scoreVal;
          updatedGlobal[directKey] = scoreVal;
          if (s.id) {
            const keyById = getGradeKey(s.id, selectedGradCourse.id, gradingYear, gradingSemester);
            updatedGlobal[keyById] = scoreVal;
          }
        }
      });
      onSaveGrades(updatedGlobal);
    }

    setIsExcelUploadOpen(false);
    showNotify(
      t(
        `ከኤክሴል የተጫኑ ውጤቶች ለ«${selectedGradCourse.name}» በስኬት ተመዝግበዋል!`,
        `Excel scores imported for "${formatCourseTitle(selectedGradCourse.name, lang)}" successfully!`
      ),
      'success'
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 text-white p-4 sm:p-6 rounded-3xl shadow-md border border-emerald-900/60">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1 min-w-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-[11px] sm:text-xs font-bold border border-amber-500/30 max-w-full">
              <Shield className="w-4 h-4 shrink-0" />
              <span className="truncate">{t('የተማሪዎች ምረቃ ማረጋገጫና የ2018 ውጤት መቆጣጠሪያ', 'Graduation Verification & 2018 Cohort Grade Manager')}</span>
            </div>
            <h2 className="text-lg sm:text-2xl font-black text-white flex items-center gap-2.5">
              <GraduationCap className="w-6 h-6 sm:w-7 sm:h-7 text-amber-400 shrink-0" />
              <span>{t('የተማሪዎች ይፋዊ የምረቃና ውጤት ማረጋገጫ', 'Official Graduation Verification & Historical Grading')}</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              {t(
                `የትምህርት ዘመን ${currentYear} ዓ.ም (${currentSemester}ኛ ሴሚስተር)። ዋና አድሚን፣ ዲን እና ሪጅስተራል ወደኋላ ያለውን የ2018 ዓ.ም (1ኛ እና 2ኛ ሴሚስተር) ውጤት ማስገባት፣ የመምህር ስም፣ የትምህርት ዓይነት፣ የክሬዲት ሰዓትና ኮድ ማስተካከል፣ ተማሪዎችን እንደ ተማራቂ መምረጥና ባለ 4-ሴሚስተር ሙሉ የምረቃ ትራንስክሪፕት ማዘጋጀት ይችላሉ።`,
                `Academic Year ${formatCalendarYear(currentYear, 'en')} (${formatSemester(currentSemester, 'en')}). Super Admin, Dean, and Registrar can enter 2018 E.C. (Semesters 1 & 2) historical grades, edit course instructors/credits/codes, designate graduating candidates, and generate complete 4-semester graduation transcripts.`
              )}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
            <button
              onClick={() => setSelectedTranscriptStudent(diploma2018Students[0] || students[0])}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 min-h-[42px] rounded-2xl shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer w-full sm:w-auto"
            >
              <Award className="w-4 h-4 text-amber-300 shrink-0" />
              <span>{t('የተማራቂ ሙሉ ትራንስክሪፕት', 'Full Graduate Transcript')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sub Tabs: 3 Main Sections */}
      <div className="flex border-b border-slate-200 overflow-x-auto no-scrollbar gap-1.5 sm:gap-2 pb-0.5">
        <button
          onClick={() => setActiveSubTab('graduates_grading')}
          className={`py-3 px-3.5 sm:px-4 min-h-[44px] font-bold text-xs sm:text-sm border-b-2 flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
            activeSubTab === 'graduates_grading'
              ? 'border-indigo-700 text-indigo-900 bg-indigo-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-4 h-4 text-indigo-700 shrink-0" />
          <span>{t('የ2018.. ተመራቂዎች ውጤት ማስገቢያ', '2018 Cohort Grade Entry')}</span>
          <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold">
            {diploma2018Students.length} {t('ተማሪዎች', 'Students')}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('verification')}
          className={`py-3 px-3.5 sm:px-4 min-h-[44px] font-bold text-xs sm:text-sm border-b-2 flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
            activeSubTab === 'verification'
              ? 'border-emerald-700 text-emerald-900 bg-emerald-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <UserCheck className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{t('ተማራቂዎችን መምረጫና ማረጋገጫ', 'Candidate Selection & Sign-off')}</span>
          <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-mono">
            {candidateStudents.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('archive')}
          className={`py-3 px-3.5 sm:px-4 min-h-[44px] font-bold text-xs sm:text-sm border-b-2 flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
            activeSubTab === 'archive'
              ? 'border-amber-700 text-amber-900 bg-amber-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Award className="w-4 h-4 text-amber-700 shrink-0" />
          <span>{t('የተመረቁ ተማሪዎች ቋሚ ማህደር', 'Official Alumni Archive')}</span>
          <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-[10px] font-mono">
            {archivedGraduates.length}
          </span>
        </button>
      </div>

      {/* TAB 1: Candidates Selection & Approvals */}
      {activeSubTab === 'verification' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-4 sm:p-6 space-y-5 sm:space-y-6">
          {/* Quick Action: Batch Designate all 2018.. as Candidates */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h4 className="font-bold text-xs sm:text-sm text-emerald-950 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-700" />
                <span>{t('የ2019 ዓ.ም የዲፕሎማ ተማራቂዎች ፈጣን ምርጫ (2018.. Students)', 'Quick Select 2019 E.C. Diploma Graduating Candidates (2018.. Cohort)')}</span>
              </h4>
              <p className="text-xs text-emerald-800 mt-0.5">
                {t(
                  'መለያ ቁጥራቸው በ«2018..» የሚጀምሩት 10 የዲፕሎማ ተማሪዎች የ2019 ዓ.ም ይፋዊ ተመራቂዎች ናቸው። በአንድ ክሊክ እጩ ተማራቂ አድርገው ይምረጡ።',
                  'The 10 Diploma students whose IDs begin with "2018.." are the official 2019 E.C. graduating class. Designate all as graduating candidates with one click.'
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={handleSelectAll2018Candidates}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{t('ሁሉንም 2018.. ተማሪዎች እንደ ተመራቂ ምረጥ', 'Select All 2018.. as Candidates')}</span>
            </button>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={t('ተማሪ በስም ወይም በID ፈልግ...', 'Search student by name or ID...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-700 focus:border-transparent"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
              <select
                value={programFilter}
                onChange={(e) => setProgramFilter(e.target.value as any)}
                className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 text-slate-700 cursor-pointer"
              >
                <option value="ALL">{t('ሁሉንም ፕሮግራም', 'All Programs')}</option>
                <option value="Degree">{t('የድግሪ (Degree)', 'Degree')}</option>
                <option value="Diploma">{t('የዲፕሎማ (Diploma)', 'Diploma')}</option>
              </select>

              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 text-slate-700 cursor-pointer"
              >
                <option value="ALL">{t('ሁሉንም ዓመት', 'All Years')}</option>
                <option value="1">{formatYearLevel(1, lang)}</option>
                <option value="2">{t('2ኛ ዓመት (ተመራቂ)', '2nd Year (Graduating)')}</option>
                <option value="3">{formatYearLevel(3, lang)}</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 text-slate-700 cursor-pointer"
              >
                <option value="ALL">{t('ሁሉንም የምረቃ ሁኔታ', 'All Statuses')}</option>
                <option value="CANDIDATE">{t('ተማራቂዎች (Candidates)', 'Candidates')}</option>
                <option value="ACTIVE">{t('መደበኛ ተማሪዎች (Active)', 'Active Students')}</option>
                <option value="GRADUATED">{t('የተመረቁ (Graduated)', 'Graduated')}</option>
              </select>
            </div>
          </div>

          {/* Roster Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-2xl max-h-[500px] overflow-y-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 font-bold uppercase text-[11px] text-slate-700 sticky top-0 z-10 border-b">
                <tr>
                  <th className="p-3">{t('ተ.ቁ', '#')}</th>
                  <th className="p-3">{t('መለያ ቁጥር (ID)', 'ID')}</th>
                  <th className="p-3">{t('የተማሪ ሙሉ ስም', 'Full Name')}</th>
                  <th className="p-3">{t('ፕሮግራም', 'Program')}</th>
                  <th className="p-3 text-center">{t('የትምህርት ዓመት', 'Year')}</th>
                  <th className="p-3 text-center">{t('የምረቃ እጩነት', 'Candidacy')}</th>
                  <th className="p-3 text-center">{formatRole('ADMIN', lang)}</th>
                  <th className="p-3 text-center">{t('ዲን', 'Dean')}</th>
                  <th className="p-3 text-center">{formatRole('REGISTRAR', lang)}</th>
                  <th className="p-3 text-right">{t('እርምጃዎች', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {candidateStudents.map((s, idx) => {
                  const isGraduated = s.graduationStatus === 'GRADUATED';
                  const isCandidate = s.graduationStatus === 'CANDIDATE';
                  const approvals = s.graduationApprovedBy || {};

                  return (
                    <tr key={s.uid} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                      <td className="p-3 font-mono font-bold text-slate-900">{s.id}</td>
                      <td className="p-3 font-bold text-slate-900">{s.name}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            s.program === 'Degree'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {formatProgram(s.program, lang)}
                        </span>
                      </td>
                      <td className="p-3 text-center font-mono">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold">
                          {formatYearLevel(s.currentStudyYear || 1, lang)}
                        </span>
                      </td>

                      {/* Candidate Toggle */}
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleCandidate(s.uid)}
                          className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                            isCandidate
                              ? 'bg-amber-100 text-amber-950 border border-amber-300'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                        >
                          {isCandidate ? t('★ የምረቃ እጩ', '★ Candidate') : t('መደበኛ ተማሪ', 'Regular')}
                        </button>
                      </td>

                      {/* Admin Signoff */}
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          disabled={!canApprove}
                          onClick={() => handleToggleApproval(s.uid, 'admin')}
                          className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-all flex items-center justify-center gap-1 mx-auto ${
                            approvals.admin
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                          title={t('አድሚን ይሁንታ', 'Admin Sign-off')}
                        >
                          {approvals.admin ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <Clock className="w-3 h-3 text-slate-400" />}
                          <span>{approvals.admin ? t('አጽድቋል', 'Approved') : t('ይጠብቃል', 'Pending')}</span>
                        </button>
                      </td>

                      {/* Dean Signoff */}
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          disabled={!canApprove}
                          onClick={() => handleToggleApproval(s.uid, 'dean')}
                          className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-all flex items-center justify-center gap-1 mx-auto ${
                            approvals.dean
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                          title={t('ዲን ይሁንታ', 'Dean Sign-off')}
                        >
                          {approvals.dean ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <Clock className="w-3 h-3 text-slate-400" />}
                          <span>{approvals.dean ? t('አጽድቋል', 'Approved') : t('ይጠብቃል', 'Pending')}</span>
                        </button>
                      </td>

                      {/* Registrar Signoff */}
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          disabled={!canApprove}
                          onClick={() => handleToggleApproval(s.uid, 'registrar')}
                          className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-all flex items-center justify-center gap-1 mx-auto ${
                            approvals.registrar
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                          title={t('ሪጅስተራል ይሁንታ', 'Registrar Sign-off')}
                        >
                          {approvals.registrar ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <Clock className="w-3 h-3 text-slate-400" />}
                          <span>{approvals.registrar ? t('አጽድቋል', 'Approved') : t('ይጠብቃል', 'Pending')}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setSelectedTranscriptStudent(s)}
                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 text-[10px] px-2 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer"
                            title={t('የተማሩበትን ሙሉ ትምህርት የምረቃ ትራንስክሪፕት በአንድ ላይ ጄኔሬት አድርግ', 'Generate full cumulative graduation transcript')}
                          >
                            <Award className="w-3 h-3 text-indigo-700" />
                            <span>{t('ሙሉ ትራንስክሪፕት', 'Full Transcript')}</span>
                          </button>

                          {isGraduated ? (
                            <span className="bg-emerald-100 text-emerald-950 font-bold px-2 py-1 rounded-lg text-[10px] flex items-center gap-1 border border-emerald-300">
                              <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                              <span>{t('ተመርቋል', 'Graduated')} ({s.graduationYear || currentYear})</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleGraduateStudent(s.uid)}
                              className="bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] px-2.5 py-1 rounded-lg font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                              title={t('በይፋ መርቅና ወደ ተመራቂዎች ማህደር መዝግብ', 'Officially graduate and archive student')}
                            >
                              <GraduationCap className="w-3 h-3 text-amber-300" />
                              <span>{t('መርቅ', 'Graduate')}</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Dedicated 2018.. Diploma Graduates Grade Entry (ወደኋላ ያለ የ2018 ውጤት መሙያ) */}
      {activeSubTab === 'graduates_grading' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-4 sm:p-6 space-y-5 sm:space-y-6">
          {/* Header & Description */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b pb-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 text-indigo-900 text-xs font-bold mb-1">
                <BookOpen className="w-4 h-4 text-indigo-700 shrink-0" />
                <span>{t('የ2019 ዓ.ም የዲፕሎማ ተመራቂዎች (2018.. መለያ ያላቸው ተማሪዎች)', '2019 E.C. Diploma Graduating Class (2018.. Student IDs)')}</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                {t('የተመራቂ ተማሪዎች ወደኋላ ያለ የ2018 ውጤት እና የአሁን ውጤት ማስገቢያ', 'Graduating Class Historical (2018) & Current Grade Entry')}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 max-w-3xl">
                {t(
                  'እነዚህ ተማሪዎች በዚህ ዓመት (2019 ዓ.ም) 2ኛ ዓመት 4ኛ ሴሚስተር በማጠናቀቅ ላይ ያሉ ይፋዊ ተመራቂዎች ናቸው። ወደኋላ ያለውን የ2018 ዓ.ም (1ኛ እና 2ኛ ሴሚስተር) ውጤት ጨምሮ የመምህር ስም፣ የትምህርት ዓይነት፣ የክሬዲት ሰዓትና ኮድ እያስተካከሉ እዚህ መሙላት ይችላሉ።',
                  'These students are the 2019 E.C. 2nd-year (4th semester) graduating Diploma cohort. You can enter historical 2018 E.C. (Semesters 1 & 2) and current scores while editing course titles, instructors, credit hours, and codes.'
                )}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto">
              <button
                type="button"
                onClick={openAddCourseModal}
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border border-emerald-400 text-xs px-3 py-2 min-h-[40px] rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title={t('አዲስ የ2018 ኮርስ ወደ ሲስተሙ ጨምር', 'Add a new 2018 historical course')}
              >
                <Plus className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>{t('+ አዲስ 2018 ኮርስ', '+ New 2018 Course')}</span>
              </button>

              {onOpenSampleCoursesModal && (
                <button
                  type="button"
                  onClick={onOpenSampleCoursesModal}
                  className="bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-300 text-xs px-3 py-2 min-h-[40px] rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title={t('ሳንፈልጋቸው እንደ ናሙና የተሰሩ የትምህርት ዓይነቶችን መርጦ ለመደለት', 'Remove unwanted sample/template courses')}
                >
                  <Trash2 className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{t('ናሙና መደለቻ', 'Delete Samples')}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsExcelUploadOpen(true)}
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-950 border border-indigo-300 text-xs px-3 py-2 min-h-[40px] rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title={t('የተመራቂዎችን ውጤት ከኤክሴል ሰነድ ጫን (Excel Upload)', 'Upload graduate grades from Excel')}
              >
                <Upload className="w-4 h-4 text-indigo-700 shrink-0" />
                <span>{t('ኤክሴል ጫን', 'Upload Excel')}</span>
              </button>

              <button
                type="button"
                onClick={handleExport2018GraduatesExcel}
                className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs px-3 py-2 min-h-[40px] rounded-xl font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                title={t('የተመራቂዎችን ውጤት በኤክሴል አውርድ', 'Download graduate grades as Excel')}
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-200 shrink-0" />
                <span>{t('ኤክሴል አውርድ', 'Download Excel')}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsPdfGradeReportOpen(true)}
                className="bg-cyan-50 hover:bg-cyan-100 text-cyan-950 border border-cyan-300 text-xs px-3 py-2 min-h-[40px] rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title={t('የተመራቂዎችን ይፋዊ የውጤት ሰነድ በፒዲኤፍ (PDF) ለማየትና ለማተም', 'Preview and print official PDF grade sheet')}
              >
                <Printer className="w-4 h-4 text-cyan-700 shrink-0" />
                <span>{t('ይፋዊ PDF', 'Official PDF')}</span>
              </button>

              {onSaveGrades && (
                <button
                  type="button"
                  onClick={handleSaveGradingScores}
                  className="bg-indigo-700 hover:bg-indigo-800 text-white text-xs px-4 py-2 min-h-[40px] rounded-xl font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Save className="w-4 h-4 shrink-0" />
                  <span>{t('ውጤቶችን መዝግብ', 'Save Grades')}</span>
                </button>
              )}
            </div>
          </div>

          {/* Academic Period Selector Bar (ትምህርቱ የተሰጠበት ጊዜ መራጭ) */}
          <div className="bg-slate-50 p-3.5 sm:p-4 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo-700 shrink-0" />
                <span>{t('ትምህርቱ የተሰጠበት ጊዜ (የትምህርት ዘመን እና ሴሚስተር ይምረጡ)፦', 'Academic Term (Select Year & Semester):')}</span>
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                {t('የተመረጠው ጊዜ፦', 'Selected Term:')}{' '}
                <strong className="text-indigo-900 font-bold">
                  {formatCalendarYear(gradingYear, lang)} — {formatSemester(gradingSemester, lang)}
                </strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => {
                  setGradingYear('2018');
                  setGradingSemester('1');
                }}
                className={`p-3 min-h-[54px] rounded-xl text-xs font-bold border transition-all text-left flex flex-col justify-between cursor-pointer ${
                  gradingYear === '2018' && gradingSemester === '1'
                    ? 'bg-indigo-700 text-white border-indigo-800 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <span className="text-[10px] uppercase tracking-wide opacity-80">{t('የቀደመ 1ኛ ዓመት', 'Prior 1st Year')}</span>
                <span className="text-sm font-black mt-0.5">{formatCalendarYear('2018', lang)} — {formatSemester('1', lang)}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setGradingYear('2018');
                  setGradingSemester('2');
                }}
                className={`p-3 min-h-[54px] rounded-xl text-xs font-bold border transition-all text-left flex flex-col justify-between cursor-pointer ${
                  gradingYear === '2018' && gradingSemester === '2'
                    ? 'bg-indigo-700 text-white border-indigo-800 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <span className="text-[10px] uppercase tracking-wide opacity-80">{t('የቀደመ 1ኛ ዓመት', 'Prior 1st Year')}</span>
                <span className="text-sm font-black mt-0.5">{formatCalendarYear('2018', lang)} — {formatSemester('2', lang)}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setGradingYear('2019');
                  setGradingSemester('1');
                }}
                className={`p-3 min-h-[54px] rounded-xl text-xs font-bold border transition-all text-left flex flex-col justify-between cursor-pointer ${
                  gradingYear === '2019' && gradingSemester === '1'
                    ? 'bg-emerald-700 text-white border-emerald-800 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <span className="text-[10px] uppercase tracking-wide opacity-80">{t('የአሁኑ 2ኛ ዓመት', 'Current 2nd Year')}</span>
                <span className="text-sm font-black mt-0.5">{formatCalendarYear('2019', lang)} — {formatSemester('1', lang)}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setGradingYear('2019');
                  setGradingSemester('2');
                }}
                className={`p-3 min-h-[54px] rounded-xl text-xs font-bold border transition-all text-left flex flex-col justify-between cursor-pointer ${
                  gradingYear === '2019' && gradingSemester === '2'
                    ? 'bg-emerald-700 text-white border-emerald-800 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <span className="text-[10px] uppercase tracking-wide opacity-80">{t('የምረቃ ሴሚስተር', 'Graduating Semester')}</span>
                <span className="text-sm font-black mt-0.5">{formatCalendarYear('2019', lang)} — {formatSemester('2', lang)}</span>
              </button>
            </div>
          </div>

          {/* Course Selector & Metadata Card (የመምህር ስም፥ የትምህርት ዓይነት፥ የትምህርቱ ጊዜ፥ ኮድ እና ጊዜ) */}
          <div className="bg-indigo-50/60 border border-indigo-200/80 p-4 sm:p-5 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto flex-1">
                <label className="text-xs font-bold text-indigo-950 whitespace-nowrap">{t('የኮርስ ምርጫ፦', 'Select Course:')}</label>
                <select
                  value={selectedGradCourseId}
                  onChange={(e) => setSelectedGradCourseId(e.target.value)}
                  className="w-full sm:max-w-md p-2.5 min-h-[42px] text-xs font-bold border rounded-xl bg-white border-indigo-300 focus:ring-2 focus:ring-indigo-700 cursor-pointer shadow-2xs"
                >
                  {activeCoursesForGrading.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code ? `[${c.code}] ` : ''}{formatCourseTitle(c.name, lang)} ({c.credits} {t('ክሬዲት', 'Cr')}) | {t('መምህር፦', 'Instructor:')} {formatTeacherDisplay(c.teacher, lang)}
                    </option>
                  ))}
                </select>
              </div>

              {selectedGradCourse && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEditCourseModal(selectedGradCourse)}
                    className="bg-white hover:bg-indigo-100 text-indigo-900 border border-indigo-300 text-xs px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    title={t('የዚህን ኮርስ ስም፣ መምህር፣ ክሬዲት ሰዓት ወይም ኮድ አሻሽል', 'Edit course title, instructor, credits, or code')}
                  >
                    <Edit className="w-3.5 h-3.5 text-indigo-700" />
                    <span>{t('የኮርሱን መረጃ አሻሽል (Edit)', 'Edit Course Details')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteHistoricalCourse(selectedGradCourse.id)}
                    className="bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 text-xs px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    title={t('ይህንን ኮርስ ከሲስተሙ አስወግድ (Delete)', 'Delete this course from the system')}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>{t('ይህንን ኮርስ ሰርዝ (Delete)', 'Delete Course')}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Prominent Metadata Badges Grid */}
            {selectedGradCourse && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 border-t border-indigo-200/60 text-xs">
                <div className="bg-white p-2.5 rounded-xl border border-indigo-100 shadow-2xs">
                  <span className="text-[10px] text-slate-500 font-bold block">{t('የትምህርት ዓይነት (Course):', 'Course Title:')}</span>
                  <strong className="text-slate-900 text-xs font-bold truncate block">{formatCourseTitle(selectedGradCourse.name, lang)}</strong>
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-indigo-100 shadow-2xs">
                  <span className="text-[10px] text-slate-500 font-bold block">{t('የትምህርቱ መለያ ኮድ (Code):', 'Course Code:')}</span>
                  <strong className="text-indigo-800 font-mono font-bold text-xs block">{selectedGradCourse.code || 'DIP-Course'}</strong>
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-indigo-100 shadow-2xs">
                  <span className="text-[10px] text-slate-500 font-bold block">{t('የመምህር ስም (Instructor):', 'Instructor:')}</span>
                  <strong className="text-slate-900 text-xs font-bold truncate block">{formatTeacherDisplay(selectedGradCourse.teacher, lang)}</strong>
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-indigo-100 shadow-2xs">
                  <span className="text-[10px] text-slate-500 font-bold block">{t('የትምህርቱ ጊዜ / ክሬዲት (Duration):', 'Credit Hours:')}</span>
                  <strong className="text-emerald-800 text-xs font-bold block">{selectedGradCourse.credits} {t('ክሬዲት ሰዓት', 'Credit Hours')}</strong>
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-indigo-100 shadow-2xs">
                  <span className="text-[10px] text-slate-500 font-bold block">{t('ትምህርቱ የተሰጠበት ጊዜ:', 'Term Offered:')}</span>
                  <strong className="text-indigo-950 font-black text-xs block">{formatCalendarYear(gradingYear, lang)} — {formatSemester(gradingSemester, lang)}</strong>
                </div>
              </div>
            )}
          </div>

          {/* Interactive Grade Entry Table & Assessment Customizer */}
          {(() => {
            if (!selectedGradCourse) {
              return <div className="text-xs text-slate-500 py-6 text-center">{t('እባክዎ መጀመሪያ ኮርስ ይምረጡ።', 'Please select a course first.')}</div>;
            }

            const criteria = getCourseAssessmentItems(selectedGradCourse);
            const totalWeight = criteria.reduce((sum, it) => sum + (Number(it.max) || 0), 0);

            return (
              <div className="space-y-4">
                {/* Assessment Scheme & Criteria Customizer (የውጤት ማስገቢያውን መቀነስ፣ መጨመር እንዲሁም ኤዲት ማድረጊያ) */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-indigo-200/90 shadow-2xs space-y-3">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-indigo-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-indigo-700" />
                      <span className="text-xs font-black text-slate-900">
                        {t(
                          'የውጤት ማስገቢያ መመዘኛዎች (መምህሩ ባስፈተነበት መንገድ መቀነስ፣ መጨመርና ኤዲት ማድረጊያ)፦',
                          'Assessment Criteria (Add, Remove & Customize Weights):'
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                          totalWeight === 100
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-amber-50 text-amber-900 border-amber-300'
                        }`}
                      >
                        {t('የመመዘኛዎች ድምር፦', 'Total Weight:')} {totalWeight}%
                      </span>
                      {totalWeight !== 100 && (
                        <button
                          type="button"
                          onClick={() => {
                            if (criteria.length === 0) return;
                            const factor = 100 / totalWeight;
                            const normalized = criteria.map((c, i) => ({
                              ...c,
                              max:
                                i === criteria.length - 1
                                  ? 100 - criteria.slice(0, -1).reduce((s, it) => s + Math.round(it.max * factor), 0)
                                  : Math.round(c.max * factor)
                            }));
                            updateGradCourseCriteria(normalized);
                            showNotify(t('የመመዘኛዎቹ ድምር ወደ 100% ተስተካክሏል!', 'Criteria weights normalized to 100%!'), 'success');
                          }}
                          className="text-[10px] text-amber-900 bg-amber-100 hover:bg-amber-200 font-bold px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                          title={t('ሁሉንም መመዘኛዎች በድምሩ 100% እንዲሆኑ አስተካክል', 'Normalize all criteria weights to sum to 100%')}
                        >
                          {t('ወደ 100% አስተካክል', 'Normalize to 100%')}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Criteria Chips with Edit & Delete */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {criteria.map((it) => (
                      <div
                        key={it.id}
                        className="inline-flex items-center gap-1.5 bg-white border border-indigo-200 text-indigo-950 px-2.5 py-1.5 rounded-xl text-xs font-bold shadow-2xs"
                      >
                        <span className="font-bold">{formatCriterionLabel(it.label, lang)}</span>
                        <span className="bg-indigo-100 text-indigo-900 font-mono text-[10px] px-1.5 py-0.5 rounded-md font-black">
                          {it.max}%
                        </span>
                        <button
                          type="button"
                          onClick={() => handleOpenCriterionModal(it)}
                          className="text-indigo-600 hover:text-indigo-900 p-0.5 rounded hover:bg-indigo-50 transition-colors cursor-pointer"
                          title={t('ይህን መመዘኛ ኤዲት አድርግ (ስም ወይም ነጥብ ቀይር)', 'Edit criterion label or weight')}
                        >
                          <Edit className="w-3 h-3" />
                        </button>
                        {criteria.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveGradCriterion(it.id, it.label)}
                            className="text-rose-500 hover:text-rose-700 p-0.5 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                            title={t('ይህን መመዘኛ ቀንስ/አስወግድ', 'Remove this criterion')}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => handleOpenCriterionModal()}
                      className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                      title={t('አዲስ የውጤት መመዘኛ ጨምር', 'Add a new grading criterion')}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t('+ መመዘኛ ጨምር (Add)', '+ Add Criterion')}</span>
                    </button>
                  </div>

                  {/* Quick Presets Buttons */}
                  <div className="flex items-center gap-2 flex-wrap pt-1 text-[11px] text-slate-500">
                    <span className="font-bold text-slate-700">{t('ፈጣን ቅንብሮች፦', 'Quick Presets:')}</span>
                    <button
                      type="button"
                      onClick={() => handleApplyGradPreset('1_100')}
                      className="bg-white hover:bg-indigo-50 hover:text-indigo-950 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 transition-colors cursor-pointer font-medium shadow-2xs"
                    >
                      {t('1 ፈተና (100%)', '1 Exam (100%)')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyGradPreset('2_50_50')}
                      className="bg-white hover:bg-indigo-50 hover:text-indigo-950 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 transition-colors cursor-pointer font-medium shadow-2xs"
                    >
                      {t('2 ክፍሎች (50% / 50%)', '2 Parts (50/50)')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyGradPreset('2_40_60')}
                      className="bg-white hover:bg-indigo-50 hover:text-indigo-950 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 transition-colors cursor-pointer font-medium shadow-2xs"
                    >
                      {t('2 ክፍሎች (40% / 60%)', '2 Parts (40/60)')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyGradPreset('3_30_30_40')}
                      className="bg-white hover:bg-indigo-50 hover:text-indigo-950 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 transition-colors cursor-pointer font-medium shadow-2xs"
                    >
                      {t('3 ክፍሎች (30/30/40%)', '3 Parts (30/30/40)')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyGradPreset('3_20_30_50')}
                      className="bg-white hover:bg-indigo-50 hover:text-indigo-950 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 transition-colors cursor-pointer font-medium shadow-2xs"
                    >
                      {t('3 ክፍሎች (20/30/50%)', '3 Parts (20/30/50)')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyGradPreset('4_20_20_30_30')}
                      className="bg-white hover:bg-indigo-50 hover:text-indigo-950 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 transition-colors cursor-pointer font-medium shadow-2xs"
                    >
                      {t('4 ክፍሎች (20/20/30/30%)', '4 Parts (20/20/30/30)')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyGradPreset('5_standard')}
                      className="bg-white hover:bg-indigo-50 hover:text-indigo-950 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 transition-colors cursor-pointer font-medium shadow-2xs"
                    >
                      {t('መደበኛ 5 ክፍሎች', 'Standard 5 Parts')}
                    </button>
                  </div>
                </div>

                {/* Official 13-Tier Grading Scale Reference Legend Card */}
                <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 shadow-2xs space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">
                          {t('ይፋዊ የ13-ደረጃ ውጤት መስፈርት (Official 13-Tier Grading Scale)', 'Official 13-Tier Grading Scale')}
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          {t(
                            'ለተመራቂዎች የጸደቀው 13ቱም የውጤት ደረጃዎች (ከ A+ እስከ F)፣ የመቶኛ ወሰን እና የነጥብ መጠን',
                            'Approved 13-tier letter grades (A+ through F), percentage ranges, and grade point values'
                          )}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowGradingScaleRef((prev) => !prev)}
                      className="text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-white border border-indigo-200 px-3 py-1 rounded-xl cursor-pointer shadow-2xs transition-all self-start sm:self-auto"
                    >
                      {showGradingScaleRef
                        ? t('መመሪያውን ደብቅ (Hide)', 'Hide Scale')
                        : t('13ቱንም ደረጃዎች አሳይ (View All 13 Tiers)', 'Show All 13 Tiers')}
                    </button>
                  </div>

                  {showGradingScaleRef && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 lg:grid-cols-13 gap-1.5 pt-2 border-t border-slate-200/80">
                      {OFFICIAL_GRADING_SCALE.map((tier) => (
                        <div
                          key={tier.letter}
                          className={`p-2 rounded-xl border text-center transition-all ${
                            tier.letter.startsWith('A')
                              ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
                              : tier.letter.startsWith('B')
                              ? 'bg-blue-50/90 border-blue-300 text-blue-950'
                              : tier.letter.startsWith('C')
                              ? 'bg-amber-50/90 border-amber-300 text-amber-950'
                              : tier.letter.startsWith('D')
                              ? 'bg-orange-50/90 border-orange-300 text-orange-950'
                              : 'bg-rose-50/90 border-rose-300 text-rose-950'
                          }`}
                        >
                          <div className="text-sm font-black tracking-tight">{tier.letter}</div>
                          <div className="text-[11px] font-bold font-mono">
                            {tier.min}%–{tier.max}%
                          </div>
                          <div className="text-[10px] font-semibold opacity-90 font-mono">
                            {tier.points === 3.7 ? '3.70' : tier.points.toFixed(2)} {t('ነጥብ', 'pts')}
                          </div>
                          <div className="text-[9px] truncate mt-0.5 opacity-75 font-medium" title={formatGradeDesc(tier.desc, lang)}>
                            {formatGradeDesc(tier.desc, lang)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {isMobileViewport ? (
                  <div className="space-y-3">
                    {diploma2018Students.map((s, idx) => (
                      <GradStudentMobileCard
                        key={s.uid}
                        student={s}
                        idx={idx}
                        breakdown={localGradingGrades[s.uid]}
                        criteria={criteria}
                        totalWeight={totalWeight}
                        semesterGPA={semesterGpaMap[s.uid] || '0.00'}
                        onScoreChange={handleGradingScoreChange}
                        onCustomTotalChange={handleCustomTotalChange}
                        onCustomLetterChange={handleCustomLetterChange}
                        onSelectTranscript={setSelectedTranscriptStudent}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded-2xl max-h-[520px] overflow-y-auto">
                    <table className="w-full text-left text-xs text-slate-600">
                      <thead className="bg-slate-100 sticky top-0 font-bold uppercase text-[10px] text-slate-700 z-10 border-b">
                        <tr>
                          <th className="p-2.5">{t('ተ.ቁ', '#')}</th>
                          <th className="p-2.5">ID</th>
                          <th className="p-2.5 sticky left-0 bg-slate-100 z-20 min-w-[170px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]">{t('የተማሪ ሙሉ ስም', 'Full Name')}</th>
                          <th className="p-2.5 text-center">{t('ጾታ', 'Gender')}</th>
                          {criteria.map((it) => (
                            <th key={it.id} className="p-2 text-center min-w-[85px] bg-indigo-50/70 border-r border-indigo-100">
                              <div className="flex items-center justify-center gap-1">
                                <span className="block font-bold truncate max-w-[80px]" title={formatCriterionLabel(it.label, lang)}>
                                  {formatCriterionLabel(it.label, lang)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleOpenCriterionModal(it)}
                                  className="text-slate-400 hover:text-indigo-700 cursor-pointer p-0.5"
                                  title={t('መመዘኛውን ኤዲት አድርግ', 'Edit criterion')}
                                >
                                  <Edit className="w-2.5 h-2.5" />
                                </button>
                                {criteria.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveGradCriterion(it.id, it.label)}
                                    className="text-slate-400 hover:text-rose-600 cursor-pointer p-0.5"
                                    title={t('መመዘኛውን ቀንስ', 'Remove criterion')}
                                  >
                                    <X className="w-2.5 h-2.5" />
                                  </button>
                                )}
                              </div>
                              <span className="block text-[9px] font-mono font-black text-indigo-900">({it.max}%)</span>
                            </th>
                          ))}
                          <th className="p-1.5 text-center bg-indigo-50/40 w-8">
                            <button
                              type="button"
                              onClick={() => handleOpenCriterionModal()}
                              className="bg-indigo-100 hover:bg-indigo-200 text-indigo-900 rounded-md p-1 transition-colors cursor-pointer"
                              title={t('አዲስ የውጤት ማስገቢያ መመዘኛ ጨምር', 'Add new criterion')}
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </th>
                          <th className="p-2.5 text-center bg-emerald-100/70 text-emerald-950 border-b-2 border-emerald-500 font-black">
                            {t('ድምር', 'Total')} ({totalWeight}%)
                          </th>
                          <th className="p-2.5 text-center bg-amber-100/70 text-amber-950 border-b-2 border-amber-500 font-black">
                            {t('ደረጃ', 'Grade')}
                          </th>
                          <th className="p-2.5 text-center bg-slate-100 text-slate-800">{t('ነጥብ', 'Points')}</th>
                          <th className="p-2.5 text-center bg-indigo-50/70 text-indigo-950">{t('የሴሚስተር GPA', 'Sem GPA')}</th>
                          <th className="p-2.5 text-right">{t('ትራንስክሪፕት', 'Transcript')}</th>
                        </tr>
                      </thead>
                      <tbody ref={gradTbodyRef} className="divide-y divide-slate-100">
                        {diploma2018Students.map((s, idx) => (
                          <GradStudentDesktopRow
                            key={s.uid}
                            student={s}
                            idx={idx}
                            breakdown={localGradingGrades[s.uid]}
                            criteria={criteria}
                            totalWeight={totalWeight}
                            semesterGPA={semesterGpaMap[s.uid] || '0.00'}
                            onScoreChange={handleGradingScoreChange}
                            onCustomTotalChange={handleCustomTotalChange}
                            onCustomLetterChange={handleCustomLetterChange}
                            onSelectTranscript={setSelectedTranscriptStudent}
                            onCellKeyDown={handleGradCellKeyDown}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Bottom Save & Status Bar */}
                <div className="bg-slate-900 text-white p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-3 shadow-md mt-2">
                  <div className="flex items-center gap-2.5">
                    {hasUnsavedChanges ? (
                      <span className="flex items-center gap-2 text-amber-300 text-xs font-bold">
                        <AlertCircle className="w-4 h-4 text-amber-400" />
                        <span>{t('ያልተመዘገቡ አዳዲስ ውጤቶች አሉ! እባክዎ «ለውጦችን መዝግብ» የሚለውን ይጫኑ።', 'You have unsaved grade edits. Click "Save Now" to persist.')}</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>
                          {t('ሁሉም ውጤቶች በስኬት ተመዝግበዋል!', 'All grades saved!')}{' '}
                          ({formatCalendarYear(gradingYear, lang)} — {formatSemester(gradingSemester, lang)} | {formatCourseTitle(selectedGradCourse.name, lang)})
                        </span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <button
                      type="button"
                      onClick={handleSaveGradingScores}
                      className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm ${
                        hasUnsavedChanges
                          ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-black shadow-amber-500/20'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                    >
                      <Save className="w-4 h-4" />
                      <span>{hasUnsavedChanges ? t('ለውጦችን አሁን መዝግብ (Save Now)', 'Save Changes Now') : t('ውጤቶችን መዝግብ (Saved)', 'Grades Saved')}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* TAB 3: Alumni Archive (የተመረቁ ተማሪዎች ቋሚ ማህደር) */}
      {activeSubTab === 'archive' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-600" />
                <span>{t('የተመረቁ ተማሪዎች ቋሚ ማህደር (Official Alumni Archive)', 'Official Alumni Archive')}</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {t(
                  'የተመረቁ ተማሪዎች ዝርዝር፣ የተመረቁበት ዓመት፣ የተሰጣቸው ክብርና ሙሉ ትራንስክሪፕት በቋሚነት እዚህ ይቀመጣል።',
                  'Permanent registry of graduated alumni, graduation year, honors, and full official transcripts.'
                )}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={archiveYearFilter}
                onChange={(e) => setArchiveYearFilter(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 text-slate-700 cursor-pointer"
              >
                <option value="ALL">{t('ሁሉንም የምረቃ ዓመታት', 'All Graduation Years')}</option>
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    {formatCalendarYear(yr, lang)} {t('ተመራቂዎች', 'Graduates')}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-2xl max-h-[500px] overflow-y-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 font-bold uppercase text-[11px] text-slate-700 sticky top-0 z-10 border-b">
                <tr>
                  <th className="p-3">{t('ተ.ቁ', '#')}</th>
                  <th className="p-3">{t('መለያ ቁጥር (ID)', 'ID')}</th>
                  <th className="p-3">{t('የተማሪ ሙሉ ስም', 'Full Name')}</th>
                  <th className="p-3">{t('ጾታ', 'Gender')}</th>
                  <th className="p-3">{t('ፕሮግራም', 'Program')}</th>
                  <th className="p-3 text-center">{t('የምረቃ ዓመት', 'Grad Year')}</th>
                  <th className="p-3 text-center">{t('ሴሚስተር', 'Semester')}</th>
                  <th className="p-3 text-center">{t('ሁኔታ', 'Status')}</th>
                  <th className="p-3 text-right">{t('ይፋዊ ሰነድ', 'Official Document')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {archivedGraduates.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400">
                      {t(
                        'በዚህ መስፈርት የተገኘ የተመረቀ ተማሪ የለም። ከተማራቂዎች ማረጋገጫ ገጽ «መርቅ» የሚለውን በመጫን ተማሪዎችን መመርቅ ይችላሉ።',
                        'No graduated students found for this filter. Use "Graduate" on the Candidate Selection tab to graduate students.'
                      )}
                    </td>
                  </tr>
                ) : (
                  archivedGraduates.map((s, idx) => {
                    return (
                      <tr key={s.uid} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                        <td className="p-3 font-mono font-bold text-slate-900">{s.id}</td>
                        <td className="p-3 font-bold text-slate-900">{s.name}</td>
                        <td className="p-3">{formatGender(s.gender, lang) || '—'}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              s.program === 'Degree'
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {formatProgram(s.program, lang)}
                          </span>
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-emerald-800">
                          {formatCalendarYear(s.graduationYear || currentYear, lang)}
                        </td>
                        <td className="p-3 text-center font-mono">
                          {formatSemester(s.graduationSemester || currentSemester, lang)}
                        </td>
                        <td className="p-3 text-center">
                          <span className="bg-emerald-100 text-emerald-950 font-bold px-2.5 py-1 rounded-full text-[10px] inline-flex items-center gap-1 border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                            <span>{t('ተመርቋል', 'Graduated')}</span>
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedTranscriptStudent(s)}
                            className="bg-indigo-700 hover:bg-indigo-800 text-white text-[10px] px-3 py-1.5 rounded-xl font-bold shadow-xs flex items-center gap-1 ml-auto cursor-pointer"
                            title={t('ይፋዊ የምረቃ ትራንስክሪፕት በፒዲኤፍ አትም / አስቀምጥ', 'Print or save official graduation transcript as PDF')}
                          >
                            <Printer className="w-3 h-3 text-amber-300" />
                            <span>{t('ትራንስክሪፕት አትም', 'Print Transcript')}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Add / Edit Historical 2018 Course (የመምህር ስም፥ የትምህርት ዓይነት፥ የትምህርቱ ጊዜ፥ ኮድ እና ጊዜ) */}
      {isCourseModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-4 sm:p-6 max-w-md w-full max-h-[92vh] overflow-y-auto space-y-4 shadow-2xl border border-slate-200 my-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-700" />
                <span>
                  {editingCourseTarget
                    ? t('የኮርስ መረጃ ማሻሻያ (Edit Course)', 'Edit Course Details')
                    : t('አዲስ የ2018 ኮርስ መመዝገቢያ', 'Register New 2018 Historical Course')}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setIsCourseModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCourseModal} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {t('የትምህርት ዓይነት (Course Name) *', 'Course Name *')}
                </label>
                <input
                  type="text"
                  placeholder={t('ምሳሌ፦ እግዚአብሔርና መጽሐፍ ቅዱስ', 'e.g., God and the Bible')}
                  value={formCourseName}
                  onChange={(e) => setFormCourseName(e.target.value)}
                  className="w-full p-2.5 border rounded-xl bg-slate-50 border-slate-300 font-bold focus:ring-2 focus:ring-indigo-700 text-slate-900"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {t('የትምህርቱ መለያ ኮድ (Course Code)', 'Course Code')}
                  </label>
                  <input
                    type="text"
                    placeholder={t('ምሳሌ፦ DIP-101', 'e.g., DIP-101')}
                    value={formCourseCode}
                    onChange={(e) => setFormCourseCode(e.target.value)}
                    className="w-full p-2.5 border rounded-xl bg-slate-50 border-slate-300 font-mono font-bold focus:ring-2 focus:ring-indigo-700 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {t('የትምህርቱ ጊዜ / ክሬዲት (Credits)', 'Credit Hours')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="6"
                    value={formCourseCredits}
                    onChange={(e) => setFormCourseCredits(parseInt(e.target.value) || 3)}
                    className="w-full p-2.5 border rounded-xl bg-slate-50 border-slate-300 font-mono font-bold focus:ring-2 focus:ring-indigo-700 text-slate-900"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {t('የመምህር ስም (Instructor / Teacher Name) *', 'Instructor Name *')}
                </label>
                <input
                  type="text"
                  list="teachers-datalist"
                  placeholder={t('ምሳሌ፦ መ/ር አስራት አማኑኤል', 'e.g., Instructor Asrat Amanuel')}
                  value={formCourseTeacher}
                  onChange={(e) => setFormCourseTeacher(e.target.value)}
                  className="w-full p-2.5 border rounded-xl bg-slate-50 border-slate-300 font-bold focus:ring-2 focus:ring-indigo-700 text-slate-900"
                  required
                />
                <datalist id="teachers-datalist">
                  {teachers.map((trItem) => (
                    <option key={trItem} value={trItem} />
                  ))}
                </datalist>
                <p className="text-[10px] text-slate-400 mt-1">
                  {t('ከመምህራን ዝርዝር መምረጥ ወይም አዲስ የመምህር ስም መተየብ ይችላሉ', 'Choose from existing instructors or type a new name')}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {t('የትምህርት ዘመን (Academic Year)', 'Academic Year')}
                  </label>
                  <select
                    value={formCourseYear}
                    onChange={(e) => setFormCourseYear(e.target.value)}
                    className="w-full p-2.5 border rounded-xl bg-slate-50 border-slate-300 font-bold focus:ring-2 focus:ring-indigo-700 text-slate-900 cursor-pointer"
                  >
                    <option value="2018">{t('2018 ዓ.ም (የቀደመ ዓመት)', '2018 E.C. (Historical)')}</option>
                    <option value="2019">{t('2019 ዓ.ም (የአሁን ዓመት)', '2019 E.C. (Current)')}</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {t('ትምህርቱ የተሰጠበት ሴሚስተር', 'Semester')}
                  </label>
                  <select
                    value={formCourseSemester}
                    onChange={(e) => setFormCourseSemester(e.target.value)}
                    className="w-full p-2.5 border rounded-xl bg-slate-50 border-slate-300 font-bold focus:ring-2 focus:ring-indigo-700 text-slate-900 cursor-pointer"
                  >
                    <option value="1">{formatSemester('1', lang)}</option>
                    <option value="2">{formatSemester('2', lang)}</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsCourseModalOpen(false)}
                  className="px-4 py-2.5 min-h-[42px] border rounded-xl hover:bg-slate-100 font-bold text-slate-700 cursor-pointer"
                >
                  {t('ሰርዝ', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 min-h-[42px] bg-indigo-700 hover:bg-indigo-800 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  {editingCourseTarget ? t('ለውጦችን መዝግብ', 'Save Changes') : t('ኮርሱን መዝግብ', 'Register Course')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assessment Criterion Add/Edit Modal (የውጤት መመዘኛ ማስተካከያ ሞዳል) */}
      {isCriterionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2.5 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-2xl max-w-md w-full max-h-[92vh] overflow-y-auto border border-slate-200 space-y-4 my-auto animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-700" />
                <span>
                  {editingCriterionTarget
                    ? t('የውጤት መመዘኛን ኤዲት አድርግ', 'Edit Grading Criterion')
                    : t('አዲስ የውጤት መመዘኛ ጨምር', 'Add New Grading Criterion')}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setIsCriterionModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCriterionModal} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {t('የመመዘኛው ስም / ርዕስ (Criterion Label)', 'Criterion Label')}
                </label>
                <input
                  type="text"
                  required
                  placeholder={t('ለምሳሌ፦ ክፍል 1፣ ፈተና፣ አሳይመንት፣ ተግባር...', 'e.g., Part 1, Exam, Assignment, Project...')}
                  value={criterionFormLabel}
                  onChange={(e) => setCriterionFormLabel(e.target.value)}
                  className="w-full p-2.5 border rounded-xl bg-slate-50 border-slate-300 font-bold focus:ring-2 focus:ring-indigo-700 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {t('የመመዘኛው ከፍተኛ ነጥብ / መቶኛ (Max Points / Weight %)', 'Max Points / Weight (%)')}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={criterionFormMax}
                    onChange={(e) => setCriterionFormMax(Number(e.target.value) || 0)}
                    className="w-full p-2.5 border rounded-xl bg-slate-50 border-slate-300 font-mono font-bold focus:ring-2 focus:ring-indigo-700 text-slate-900 text-base"
                  />
                  <span className="font-mono font-bold text-slate-600 text-sm">%</span>
                </div>
              </div>

              {/* Quick Percentage Chips */}
              <div>
                <span className="block text-[11px] font-bold text-slate-500 mb-1.5">{t('ፈጣን የመቶኛ ምርጫዎች፦', 'Quick Weight Presets:')}</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[10, 15, 20, 25, 30, 40, 50, 60, 100].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setCriterionFormMax(pct)}
                      className={`px-2 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                        criterionFormMax === pct
                          ? 'bg-indigo-700 text-white border-indigo-700'
                          : 'bg-slate-100 hover:bg-indigo-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsCriterionModalOpen(false)}
                  className="px-4 py-2 border rounded-xl hover:bg-slate-100 font-bold text-slate-700 cursor-pointer"
                >
                  {t('ሰርዝ', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingCriterionTarget ? t('ለውጦችን መዝግብ', 'Save Changes') : t('መመዘኛውን ጨምር', 'Add Criterion')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full Consolidated Graduation Transcript Modal */}
      {selectedTranscriptStudent && (
        <GraduationTranscriptModal
          student={selectedTranscriptStudent}
          allCourses={[...courses, ...historical2018Courses]}
          grades={grades}
          currentYear={currentYear}
          currentSemester={currentSemester}
          churchLogo={churchLogo}
          officialConfig={officialConfig}
          onClose={() => setSelectedTranscriptStudent(null)}
        />
      )}

      {/* Course Grade Report PDF Modal for Diploma Graduates Course */}
      {isPdfGradeReportOpen && selectedGradCourse && (
        <CourseGradeReportPdfModal
          course={selectedGradCourse}
          students={diploma2018Students}
          grades={(() => {
            const mapped = { ...grades };
            diploma2018Students.forEach((s) => {
              const bd = localGradingGrades[s.uid];
              if (bd) {
                mapped[getGradeKey(s.uid, selectedGradCourse.id, gradingYear, gradingSemester)] = bd;
                mapped[`${s.uid}_${selectedGradCourse.id}`] = bd;
                if (s.id) {
                  mapped[getGradeKey(s.id, selectedGradCourse.id, gradingYear, gradingSemester)] = bd;
                }
              }
            });
            return mapped;
          })()}
          currentYear={gradingYear}
          currentSemester={gradingSemester}
          churchLogo={churchLogo}
          officialConfig={officialConfig}
          onClose={() => setIsPdfGradeReportOpen(false)}
        />
      )}

      {/* Excel Upload Modal for Diploma Graduates Course */}
      {isExcelUploadOpen && selectedGradCourse && (
        <ExcelUploadModal
          course={selectedGradCourse}
          students={diploma2018Students}
          currentYear={gradingYear}
          currentSemester={gradingSemester}
          onApplyGrades={handleApplyExcelGrades}
          onClose={() => setIsExcelUploadOpen(false)}
          showNotify={showNotify}
        />
      )}
    </div>
  );
};
