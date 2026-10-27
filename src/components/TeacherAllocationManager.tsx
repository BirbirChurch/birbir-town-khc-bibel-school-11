import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Users,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  Download,
  Calendar,
  Layers,
  Sparkles,
  ArrowRightLeft,
  X,
  UserCheck,
  UserX,
  CheckSquare,
  Square,
  Trash
} from 'lucide-react';
import { Course, ProgramType } from '../types.ts';

interface TeacherAllocationManagerProps {
  courses: Course[];
  teachers: string[];
  onUpdateCourseTeacher: (courseId: string, newTeacher: string) => void;
  onOpenAddCourse: () => void;
  onOpenEditCourse: (course: Course) => void;
  onDeleteCourse: (courseId: string) => void;
  onBatchDeleteCourses?: (courseIds: string[]) => void;
  onOpenAddTeacher?: () => void;
  onDownloadCourseGrades?: (course: Course) => void;
  showNotify: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  currentYear?: string;
  currentSemester?: string;
  availableYears?: string[];
  allowEditDelete?: boolean;
}

export const TeacherAllocationManager: React.FC<TeacherAllocationManagerProps> = ({
  courses,
  teachers,
  onUpdateCourseTeacher,
  onOpenAddCourse,
  onOpenEditCourse,
  onDeleteCourse,
  onBatchDeleteCourses,
  onOpenAddTeacher,
  onDownloadCourseGrades,
  showNotify,
  currentYear = '2019',
  currentSemester = '1',
  availableYears = ['2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025'],
  allowEditDelete = true
}) => {
  const [viewMode, setViewMode] = useState<'courses' | 'teachers' | 'unassigned'>('courses');
  const [searchTerm, setSearchTerm] = useState('');
  const [programFilter, setProgramFilter] = useState<'ALL' | ProgramType>('ALL');
  const [yearFilter, setYearFilter] = useState<string>(currentYear || '2019');
  const [semesterFilter, setSemesterFilter] = useState<string>('ALL');
  const [teacherFilter, setTeacherFilter] = useState<string>('ALL');

  // Multi-selection state
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [batchTeacherSelection, setBatchTeacherSelection] = useState<string>('');

  const handleTeacherSelectChange = (courseId: string, newTeacher: string) => {
    onUpdateCourseTeacher(courseId, newTeacher);
  };

  // Normalized list of teachers ensuring unassigned option is available
  const normalizedTeachers = useMemo(() => {
    const list = teachers.filter((t) => t && t.trim() !== '');
    if (!list.includes('አልተመደበም (—)')) {
      return ['አልተመደበም (—)', ...list];
    }
    return list;
  }, [teachers]);

  const activeTeachers = useMemo(() => {
    return normalizedTeachers.filter((t) => !t.includes('—'));
  }, [normalizedTeachers]);

  // Derive helper to check semester matching on a course
  const courseMatchesSemester = (c: Course, sem: string) => {
    if (sem === 'ALL') return true;
    if (c.semester) return c.semester === sem;

    // Fallback logic for schedule text or historical course naming
    const sched = c.schedule || '';
    if (sem === '1') {
      return (
        sched.includes('1ኛ') ||
        sched.includes('መስከረም') ||
        sched.includes('ጥቅምት') ||
        sched.includes('ህዳር') ||
        sched.includes('ታህሳስ') ||
        sched.includes('ጥር') ||
        c.id.includes('c1') ||
        c.id.includes('c2') ||
        c.id.includes('sem1') ||
        c.id.includes('sem3')
      );
    }
    if (sem === '2') {
      return (
        sched.includes('2ኛ') ||
        sched.includes('የካቲት') ||
        sched.includes('መጋቢት') ||
        sched.includes('ሚያዝያ') ||
        sched.includes('ግንቦት') ||
        sched.includes('ሰኔ') ||
        sched.includes('ሐምሌ') ||
        c.id.includes('sem2') ||
        c.id.includes('sem4')
      );
    }
    return true;
  };

  const courseMatchesYear = (c: Course, yr: string) => {
    if (yr === 'ALL') return true;
    if (c.academicYear) return c.academicYear === yr;
    const sched = c.schedule || '';
    if (sched.includes(yr)) return true;
    // Default fallback to 2019 if unassigned
    return yr === '2019';
  };

  // Filtered courses for Course view
  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.code && c.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
        c.teacher.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.schedule && c.schedule.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesProgram = programFilter === 'ALL' || c.program === programFilter;
      const matchesYear = courseMatchesYear(c, yearFilter);
      const matchesSemester = courseMatchesSemester(c, semesterFilter);

      const matchesTeacher =
        teacherFilter === 'ALL' ||
        (teacherFilter === 'UNASSIGNED' ? (!c.teacher || c.teacher.includes('—')) : c.teacher === teacherFilter);

      return matchesSearch && matchesProgram && matchesYear && matchesSemester && matchesTeacher;
    });
  }, [courses, searchTerm, programFilter, yearFilter, semesterFilter, teacherFilter]);

  // Courses specifically for 2nd semester in selected year
  const secondSemesterCourses = useMemo(() => {
    return courses.filter((c) => courseMatchesYear(c, yearFilter) && courseMatchesSemester(c, '2'));
  }, [courses, yearFilter]);

  // Derived stats
  const totalCourses = courses.length;
  const unassignedCourses = useMemo(() => {
    return courses.filter((c) => {
      const isUnassigned = !c.teacher || c.teacher === 'አልተመደበም (—)' || c.teacher.trim() === '';
      const matchesYear = courseMatchesYear(c, yearFilter);
      const matchesSemester = courseMatchesSemester(c, semesterFilter);
      const matchesProgram = programFilter === 'ALL' || c.program === programFilter;
      return isUnassigned && matchesYear && matchesSemester && matchesProgram;
    });
  }, [courses, yearFilter, semesterFilter, programFilter]);

  const totalUnassignedAll = useMemo(() => {
    return courses.filter((c) => !c.teacher || c.teacher === 'አልተመደበም (—)' || c.teacher.trim() === '').length;
  }, [courses]);

  const assignedCoursesCount = totalCourses - totalUnassignedAll;

  const teachersWithCourseCounts = useMemo(() => {
    const map = new Map<string, { courses: Course[]; totalCredits: number }>();
    activeTeachers.forEach((t) => {
      map.set(t, { courses: [], totalCredits: 0 });
    });

    courses.forEach((c) => {
      if (c.teacher && !c.teacher.includes('—')) {
        const matchesYear = courseMatchesYear(c, yearFilter);
        const matchesSemester = courseMatchesSemester(c, semesterFilter);
        if (matchesYear && matchesSemester) {
          const entry = map.get(c.teacher) || { courses: [], totalCredits: 0 };
          entry.courses.push(c);
          entry.totalCredits += Number(c.credits) || 0;
          map.set(c.teacher, entry);
        }
      }
    });

    return map;
  }, [courses, activeTeachers, yearFilter, semesterFilter]);

  // Selection handlers
  const handleToggleSelectCourse = (id: string) => {
    setSelectedCourseIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    const allFilteredIds = filteredCourses.map((c) => c.id);
    if (selectedCourseIds.length === allFilteredIds.length && allFilteredIds.length > 0) {
      setSelectedCourseIds([]);
    } else {
      setSelectedCourseIds(allFilteredIds);
    }
  };

  const handleBatchDeleteSelected = () => {
    if (selectedCourseIds.length === 0) return;
    if (onBatchDeleteCourses) {
      onBatchDeleteCourses(selectedCourseIds);
      setSelectedCourseIds([]);
    } else {
      if (window.confirm(`እርግጠኛ ነዎት የተመረጡትን ${selectedCourseIds.length} ኮርሶች ማሰረዝ ይፈልጋሉ?`)) {
        selectedCourseIds.forEach((id) => onDeleteCourse(id));
        setSelectedCourseIds([]);
      }
    }
  };

  const handleBatchAssignTeacherSubmit = () => {
    if (selectedCourseIds.length === 0 || !batchTeacherSelection) return;
    selectedCourseIds.forEach((id) => {
      onUpdateCourseTeacher(id, batchTeacherSelection);
    });
    showNotify(`ለ${selectedCourseIds.length} ኮርሶች መምህር "${batchTeacherSelection}" በስኬት ተመድቧል!`, 'success');
    setSelectedCourseIds([]);
    setBatchTeacherSelection('');
  };

  const handleClearSemesterCourses = (semToClear: string) => {
    const targetCourses = courses.filter(
      (c) => courseMatchesYear(c, yearFilter) && courseMatchesSemester(c, semToClear)
    );
    if (targetCourses.length === 0) {
      showNotify(`በ${yearFilter} ዓ/ም በ${semToClear}ኛ ሴሚስተር ምንም የሚጠፋ ኮርስ የለም!`, 'info');
      return;
    }

    const semLabel = semToClear === '2' ? '2ኛ ሴሚስተር' : `${semToClear}ኛ ሴሚስተር`;
    if (
      window.confirm(
        `እርግጠኛ ነዎት በ${yearFilter} ዓ/ም በ${semLabel} የሚገኙትን ሁሉንም ${targetCourses.length} የትምህርት ዓይነቶች ከሲስተሙ ማሰረዝ ይፈልጋሉ?`
      )
    ) {
      const idsToDel = targetCourses.map((c) => c.id);
      if (onBatchDeleteCourses) {
        onBatchDeleteCourses(idsToDel);
      } else {
        idsToDel.forEach((id) => onDeleteCourse(id));
      }
      showNotify(`በ${yearFilter} ዓ/ም የ${semLabel} ${targetCourses.length} ኮርሶች በሙሉ ተሰርዘዋል!`, 'success');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Allocation Summary */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 shadow-md border border-emerald-800/60 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-bold border border-amber-400/30 mb-2">
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>የመምህራንና የትምህርት ዓይነት መደልደያ ማዕከል (Course & Teacher Allocation)</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
              <BookOpen className="w-6 h-6 text-amber-400" />
              <span>የትምህርት ዓይነትና መምህራን መደልደያ</span>
            </h3>
            <p className="text-xs sm:text-sm text-emerald-100/90 mt-1 max-w-2xl leading-relaxed">
              የትምህርት ዓይነቶችን (ኮርሶችን) በዓመትና በሴሚስተር ለይተው ለመምህራን ይመድቡ፣ የተመደቡትን ያርሙ ወይም የማይፈለጉ ኮርሶችን በጥቅል ይሰርዙ
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {onOpenAddTeacher && (
              <button
                type="button"
                onClick={onOpenAddTeacher}
                className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl border border-white/20 backdrop-blur-xs transition-colors cursor-pointer"
              >
                <Users className="w-4 h-4 text-emerald-300" />
                <span>አዲስ መምህር ጨምር</span>
              </button>
            )}

            {allowEditDelete && (
              <button
                type="button"
                onClick={onOpenAddCourse}
                className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 text-slate-950" />
                <span>አዲስ የትምህርት ዓይነት ጨምር</span>
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Metric Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/10">
          <div className="bg-white/10 rounded-2xl p-3 border border-white/10">
            <span className="text-[11px] text-emerald-300 block">ጠቅላላ የትምህርት ዓይነቶች</span>
            <span className="text-xl font-black text-white">{totalCourses}</span>
          </div>
          <div className="bg-white/10 rounded-2xl p-3 border border-white/10">
            <span className="text-[11px] text-emerald-300 block">መምህር የተመደበላቸው</span>
            <span className="text-xl font-black text-emerald-400">{assignedCoursesCount}</span>
          </div>
          <div
            onClick={() => setViewMode('unassigned')}
            className={`rounded-2xl p-3 border transition-all cursor-pointer ${
              unassignedCourses.length > 0
                ? 'bg-amber-500/20 border-amber-400/50 hover:bg-amber-500/30'
                : 'bg-white/10 border-white/10'
            }`}
          >
            <span className="text-[11px] text-amber-300 block flex items-center gap-1">
              {unassignedCourses.length > 0 && <AlertTriangle className="w-3 h-3 text-amber-400" />}
              ያልተመደቡ ({yearFilter} ዓ/ም)
            </span>
            <span className="text-xl font-black text-amber-300">
              {unassignedCourses.length} {unassignedCourses.length > 0 ? 'ኮርሶች' : '✓'}
            </span>
          </div>
          <div className="bg-white/10 rounded-2xl p-3 border border-white/10">
            <span className="text-[11px] text-indigo-200 block">ተመዳቢ መምህራን</span>
            <span className="text-xl font-black text-white">{activeTeachers.length}</span>
          </div>
        </div>
      </div>

      {/* View Switcher Tabs & Academic Calendar Filters Bar */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80 space-y-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          {/* Main View Mode Selector */}
          <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 text-xs font-bold gap-1 flex-wrap">
            <button
              type="button"
              onClick={() => setViewMode('courses')}
              className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'courses'
                  ? 'bg-white text-emerald-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-4 h-4 text-emerald-700" />
              <span>በየትምህርት ዓይነት ድልድል ({filteredCourses.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('teachers')}
              className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'teachers'
                  ? 'bg-white text-indigo-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-4 h-4 text-indigo-700" />
              <span>በመምህራን ድልድል ({activeTeachers.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('unassigned')}
              className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'unassigned'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-amber-800 hover:text-amber-950'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>ያልተመደቡ ({unassignedCourses.length})</span>
            </button>
          </div>

          {/* Academic Year, Semester & Program Filters Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Year filter */}
            <div className="flex items-center gap-1.5 bg-amber-50/80 border border-amber-300 rounded-xl px-3 py-1.5 shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-amber-700" />
              <label className="text-xs font-bold text-amber-900">ት/ዘመን:</label>
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="text-xs font-bold bg-transparent text-amber-900 focus:outline-none cursor-pointer"
              >
                <option value="ALL">ሁሉም ዓመታት (All)</option>
                {Array.from(new Set([currentYear, ...availableYears, '2018', '2019', '2020'])).map((y) => (
                  <option key={y} value={y} className="text-slate-800">
                    {y} ዓ.ም
                  </option>
                ))}
              </select>
            </div>

            {/* Semester filter */}
            <div className="flex items-center gap-1.5 bg-indigo-50/80 border border-indigo-200 rounded-xl px-3 py-1.5 shadow-2xs">
              <label className="text-xs font-bold text-indigo-900">ሴሚስተር:</label>
              <select
                value={semesterFilter}
                onChange={(e) => setSemesterFilter(e.target.value)}
                className="text-xs font-bold bg-transparent text-indigo-900 focus:outline-none cursor-pointer"
              >
                <option value="ALL">ሁሉም ሴሚስተሮች</option>
                <option value="1">1ኛ ሴሚስተር</option>
                <option value="2">2ኛ ሴሚስተር</option>
              </select>
            </div>

            {/* Program filter */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setProgramFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  programFilter === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                }`}
              >
                ሁሉም
              </button>
              <button
                type="button"
                onClick={() => setProgramFilter('Degree')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  programFilter === 'Degree' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600'
                }`}
              >
                ድግሪ
              </button>
              <button
                type="button"
                onClick={() => setProgramFilter('Diploma')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  programFilter === 'Diploma' ? 'bg-emerald-700 text-white shadow-2xs' : 'text-slate-600'
                }`}
              >
                ዲፕሎማ
              </button>
            </div>
          </div>
        </div>

        {/* Search bar & Teacher filter */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-slate-100">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="የትምህርት ዓይነት ስም፣ መለያ ወይም መምህር ፈልግ..."
              className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-700 font-medium"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-600 whitespace-nowrap">የመምህር ማጣሪያ:</label>
            <select
              value={teacherFilter}
              onChange={(e) => setTeacherFilter(e.target.value)}
              className="p-2 text-xs font-bold rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-emerald-700 cursor-pointer"
            >
              <option value="ALL">ሁሉም መምህራን</option>
              <option value="UNASSIGNED">ያልተመደቡ ብቻ (ክፍት ቦታ)</option>
              {activeTeachers.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 2nd Semester Purge Banner when viewing or clearing 2nd semester */}
        {secondSemesterCourses.length > 0 && allowEditDelete && (
          <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
            <div className="flex items-center gap-2 text-rose-900 font-bold">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>
                በ{yearFilter === 'ALL' ? '2019' : yearFilter} ዓ/ም 2ኛ ሴሚስተር <strong>{secondSemesterCourses.length}</strong> ኮርሶች ይገኛሉ። 2ኛ ሴሚስተር እንዲኖር ካልፈለጉ በአንድ ጠቅታ ማጥፋት ይችላሉ፦
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleClearSemesterCourses('2')}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] px-3.5 py-1.5 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>የ2ኛ ሴሚስተር ኮርሶችን በሙሉ ሰርዝ</span>
            </button>
          </div>
        )}
      </div>

      {/* Batch Action Toolbar when items are checked */}
      {selectedCourseIds.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-400 p-4 rounded-3xl shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-amber-700" />
            <span className="text-xs font-black text-amber-950">
              {selectedCourseIds.length} የትምህርት ዓይነቶች ተመርጠዋል
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Batch assign teacher */}
            <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-amber-300">
              <select
                value={batchTeacherSelection}
                onChange={(e) => setBatchTeacherSelection(e.target.value)}
                className="text-xs font-bold bg-transparent text-slate-800 focus:outline-none p-1 cursor-pointer"
              >
                <option value="">ለተመረጡት መምህር ይምረጡ...</option>
                <option value="አልተመደበም (—)">አልተመደበም (—)</option>
                {activeTeachers.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!batchTeacherSelection}
                onClick={handleBatchAssignTeacherSubmit}
                className="bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white text-[11px] font-bold px-3 py-1 rounded-lg transition-colors cursor-pointer"
              >
                መድብ
              </button>
            </div>

            {allowEditDelete && (
              <button
                type="button"
                onClick={handleBatchDeleteSelected}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>የተመረጡትን ሰርዝ ({selectedCourseIds.length})</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setSelectedCourseIds([])}
              className="p-1.5 text-slate-500 hover:text-slate-800 cursor-pointer"
              title="ምርጫውን ሰርዝ"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* VIEW 1: BY COURSE ALLOCATION */}
      {viewMode === 'courses' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h4 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-emerald-800" />
                <span>የትምህርት ዓይነቶች ሰሌዳና የተመደቡ መምህራን ({filteredCourses.length})</span>
              </h4>
              <p className="text-xs text-slate-500">
                ከዚህ በታች ከሚታየው ዝርዝር በቀጥታ የመምህሩን ስም በመምረጥ ኮርሶችን መደልደል፣ ማስተካከል (Edit) ወይም መደለት (Delete) ይችላሉ
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAllFiltered}
                className="text-xs font-bold text-indigo-700 hover:bg-indigo-50 px-2.5 py-1.5 rounded-xl border border-indigo-200 transition-colors cursor-pointer"
              >
                {selectedCourseIds.length === filteredCourses.length && filteredCourses.length > 0
                  ? 'ምርጫውን ሰርዝ'
                  : 'ሁሉንም መምረጥ'}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[11px] border-b border-slate-200">
                <tr>
                  <th className="p-3 text-center">
                    <input
                      type="checkbox"
                      checked={
                        filteredCourses.length > 0 &&
                        filteredCourses.every((c) => selectedCourseIds.includes(c.id))
                      }
                      onChange={handleSelectAllFiltered}
                      className="rounded border-slate-300 text-emerald-700 focus:ring-emerald-700 cursor-pointer"
                    />
                  </th>
                  <th className="p-3">ተ.ቁ</th>
                  <th className="p-3">ፕሮግራም</th>
                  <th className="p-3">የትምህርት ዓይነት</th>
                  <th className="p-3">ቀን / ሰሌዳ</th>
                  <th className="p-3 text-center">ክሬዲት</th>
                  <th className="p-3 min-w-[220px]">የተመደበ መምህር (መምህር ምረጥ)</th>
                  <th className="p-3 text-center">ሁኔታ</th>
                  {allowEditDelete && <th className="p-3 text-right">ተግባር (Edit / Delete)</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCourses.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-10 text-center space-y-2">
                      <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
                      <p className="text-xs text-slate-500 font-bold">
                        በተመረጠው ማጣሪያ (ዓመት: {yearFilter}፣ ሴሚስተር: {semesterFilter}) ምንም የትምህርት ዓይነት አልተገኘም።
                      </p>
                      {semesterFilter === '2' && (
                        <p className="text-[11px] text-emerald-700 font-semibold">
                          ✓ በ2ኛ ሴሚስተር ምንም የትምህርት ዓይነት አልተመዘገበም (ባዶ ነው)።
                        </p>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredCourses.map((c, idx) => {
                    const isUnassigned = !c.teacher || c.teacher === 'አልተመደበም (—)' || c.teacher.trim() === '';
                    const isChecked = selectedCourseIds.includes(c.id);

                    return (
                      <tr
                        key={c.id}
                        className={`transition-colors ${
                          isChecked ? 'bg-amber-50/60' : 'hover:bg-slate-50/80'
                        }`}
                      >
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleSelectCourse(c.id)}
                            className="rounded border-slate-300 text-emerald-700 focus:ring-emerald-700 cursor-pointer"
                          />
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-400">{idx + 1}</td>
                        <td className="p-3 font-semibold">
                          <span
                            className={`px-2.5 py-1 rounded-md text-[10px] font-bold ${
                              c.program === 'Degree'
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {c.program === 'Degree' ? 'ድግሪ' : 'ዲፕሎማ'}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-slate-900">
                          <div>
                            <span>{c.name}</span>
                            {c.code && (
                              <span className="block text-[10px] text-slate-400 font-mono mt-0.5">
                                {c.code}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 font-semibold text-amber-900 bg-amber-50/40 rounded">
                          {c.schedule || 'አልተወሰነም'}
                        </td>
                        <td className="p-3 text-center font-black text-amber-700 font-mono text-sm">
                          {c.credits || 3}
                        </td>
                        {/* Interactive Teacher Dropdown */}
                        <td className="p-3">
                          <select
                            value={c.teacher || 'አልተመደበም (—)'}
                            onChange={(e) => handleTeacherSelectChange(c.id, e.target.value)}
                            className={`w-full p-2 text-xs font-bold rounded-xl border transition-all cursor-pointer shadow-2xs ${
                              isUnassigned
                                ? 'bg-amber-50/90 border-amber-300 text-amber-950 focus:ring-2 focus:ring-amber-500'
                                : 'bg-slate-50 border-slate-300 text-slate-800 focus:ring-2 focus:ring-emerald-700'
                            }`}
                          >
                            <option value="አልተመደበም (—)">አልተመደበም (—)</option>
                            {activeTeachers.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-3 text-center">
                          {isUnassigned ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              <span>ክፍት ቦታ</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                              <span>ተመድቧል</span>
                            </span>
                          )}
                        </td>
                        {allowEditDelete && (
                          <td className="p-3 text-right space-x-1 space-x-reverse whitespace-nowrap">
                            {onDownloadCourseGrades && (
                              <button
                                type="button"
                                onClick={() => onDownloadCourseGrades(c)}
                                className="p-1.5 rounded-lg text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 transition-colors cursor-pointer"
                                title="ውጤት አውርድ (CSV)"
                              >
                                <Download className="w-4 h-4 inline" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => onOpenEditCourse(c)}
                              className="p-1.5 rounded-lg text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition-colors cursor-pointer"
                              title="የኮርስ መረጃ አስተካክል (Edit)"
                            >
                              <Edit className="w-4 h-4 inline" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteCourse(c.id)}
                              className="p-1.5 rounded-lg text-rose-600 hover:text-rose-800 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="ኮርስ ሰርዝ (Delete)"
                            >
                              <Trash2 className="w-4 h-4 inline" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: BY TEACHER ALLOCATION (መምህራንና የኮርስ ሸክማቸው) */}
      {viewMode === 'teachers' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-4 mb-5">
              <div>
                <h4 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-700" />
                  <span>
                    የመምህራን የትምህርት ሸክምና የተመደቡ ኮርሶች ({activeTeachers.length}) — {yearFilter} ዓ/ም ({semesterFilter === 'ALL' ? 'ሁሉም ሴሚስተሮች' : `${semesterFilter}ኛ ሴሚስተር`})
                  </span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  እያንዳንዱ መምህር የሚያስተምራቸውን ኮርሶች በቀጥታ መመልከት፣ አዳዲስ ኮርሶችን መደልደል፣ ማስተካከል ወይም ማስነሳት
                </p>
              </div>

              {onOpenAddTeacher && (
                <button
                  type="button"
                  onClick={onOpenAddTeacher}
                  className="bg-emerald-800 hover:bg-emerald-900 text-white text-xs px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>አዲስ መምህር መዝግብ</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {activeTeachers.map((teacher, idx) => {
                const info = teachersWithCourseCounts.get(teacher) || { courses: [], totalCredits: 0 };
                const assignedList = info.courses;
                const totalCredits = info.totalCredits;

                const assignableCourses = courses.filter((c) => c.teacher !== teacher);

                return (
                  <div
                    key={teacher}
                    className="p-5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-indigo-300 transition-all space-y-4"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-800 font-black flex items-center justify-center text-sm shadow-2xs">
                          {idx + 1}
                        </div>
                        <div>
                          <h5 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                            <span>{teacher}</span>
                          </h5>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            የተመደቡ ኮርሶች: <strong className="text-slate-800">{assignedList.length}</strong> | ጠቅላላ ክሬዲት:{' '}
                            <strong className="text-amber-800 font-mono">{totalCredits}</strong>
                          </p>
                        </div>
                      </div>

                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          assignedList.length > 0
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : 'bg-amber-100 text-amber-900 border border-amber-300'
                        }`}
                      >
                        {assignedList.length > 0 ? `${assignedList.length} ኮርሶች` : 'ምንም አልተመደበም'}
                      </span>
                    </div>

                    {/* Assigned Courses Roster */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-200">
                      <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                        የተመደቡባቸው የትምህርት ዓይነቶች:
                      </p>

                      {assignedList.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-2">
                          በአሁኑ ወቅት ለዚህ መምህር የተመደበ ኮርስ የለም። ከታች ካለው አማራጭ ኮርስ መምረጥ ይችላሉ።
                        </p>
                      ) : (
                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                          {assignedList.map((c) => (
                            <div
                              key={c.id}
                              className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs text-xs"
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                    c.program === 'Degree'
                                      ? 'bg-indigo-100 text-indigo-800'
                                      : 'bg-emerald-100 text-emerald-800'
                                  }`}
                                >
                                  {c.program === 'Degree' ? 'ድግሪ' : 'ዲፕሎማ'}
                                </span>
                                <span className="font-bold text-slate-800 truncate">{c.name}</span>
                                <span className="text-[10px] text-amber-800 font-mono font-bold whitespace-nowrap">
                                  ({c.credits || 3} ክሬዲት)
                                </span>
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => onOpenEditCourse(c)}
                                  className="p-1 text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                                  title="ኮርስ አስተካክል"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleTeacherSelectChange(c.id, 'አልተመደበም (—)')}
                                  className="ml-1 px-2 py-1 text-[10px] font-bold text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer border border-rose-200 whitespace-nowrap"
                                  title="ይህን ኮርስ ከመምህሩ አስነሳ"
                                >
                                  ከኮርስ አስነሳ
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Quick Add Course to this Teacher */}
                    <div className="pt-2 border-t border-slate-200 flex items-center gap-2">
                      <label className="text-[11px] font-bold text-slate-600 whitespace-nowrap">
                        ➕ አዲስ ኮርስ መድብ:
                      </label>
                      <select
                        defaultValue=""
                        onChange={(e) => {
                          if (e.target.value) {
                            handleTeacherSelectChange(e.target.value, teacher);
                            e.target.value = '';
                          }
                        }}
                        className="w-full p-2 text-xs font-semibold rounded-xl border border-indigo-200 bg-white text-slate-800 focus:ring-2 focus:ring-indigo-600 cursor-pointer shadow-2xs"
                      >
                        <option value="" disabled>
                          ኮርስ ይምረጡ...
                        </option>
                        {assignableCourses.map((c) => (
                          <option key={c.id} value={c.id}>
                            [{c.program}] {c.name} ({c.credits || 3} ክሬዲት) {c.teacher ? `— አሁን: ${c.teacher}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: UNASSIGNED VACANT COURSES (ክፍት ቦታዎች ብቻ) */}
      {viewMode === 'unassigned' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-4">
            <div>
              <h4 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <span>
                  ያልተመደቡ ክፍት የትምህርት ዓይነቶች ({unassignedCourses.length}) — {yearFilter} ዓ/ም ({semesterFilter === 'ALL' ? 'ሁሉም ሴሚስተሮች' : `${semesterFilter}ኛ ሴሚስተር`})
                </span>
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                እነዚህ ኮርሶች በአሁኑ ሰዓት መምህር አልተመደበላቸውም። እባክዎ ከታች መምህር ይምረጡላቸው ወይም ማስተካከያ ያድርጉ
              </p>
            </div>

            {unassignedCourses.length === 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                <span>ምንም ያልተመደበ ክፍት ኮርስ የለም!</span>
              </span>
            )}
          </div>

          {unassignedCourses.length === 0 ? (
            <div className="p-12 text-center space-y-3 bg-emerald-50/50 rounded-2xl border border-emerald-200">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <h5 className="font-extrabold text-slate-900 text-sm">
                በ{yearFilter} ዓ/ም {semesterFilter === 'ALL' ? '' : `${semesterFilter}ኛ ሴሚስተር`} ምንም ያልተመደበ ክፍት ኮርስ የለም!
              </h5>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                ሁሉም የትምህርት ዓይነቶች መምህር ተመድቦላቸዋል ወይም ምንም ክፍት ቦታ የለም።
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {unassignedCourses.map((c) => (
                <div
                  key={c.id}
                  className="p-4 rounded-2xl bg-amber-50/70 border border-amber-300 space-y-3"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          c.program === 'Degree'
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {c.program === 'Degree' ? 'ድግሪ' : 'ዲፕሎማ'}
                      </span>
                      <h5 className="font-black text-slate-900 text-sm mt-1">{c.name}</h5>
                      <p className="text-xs text-amber-900 font-semibold mt-0.5">
                        ቀን/ሰሌዳ: {c.schedule || 'አልተወሰነም'} | ክሬዲት: {c.credits || 3}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onOpenEditCourse(c)}
                        className="p-1.5 text-blue-700 hover:bg-blue-100 rounded-lg cursor-pointer"
                        title="አስተካክል (Edit)"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteCourse(c.id)}
                        className="p-1.5 text-rose-700 hover:bg-rose-100 rounded-lg cursor-pointer"
                        title="ሰርዝ (Delete)"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-amber-200 flex items-center gap-2">
                    <label className="text-xs font-bold text-amber-950 whitespace-nowrap">
                      መምህር ምረጥ:
                    </label>
                    <select
                      value="አልተመደበም (—)"
                      onChange={(e) => {
                        if (e.target.value && e.target.value !== 'አልተመደበም (—)') {
                          handleTeacherSelectChange(c.id, e.target.value);
                        }
                      }}
                      className="w-full p-2 text-xs font-bold rounded-xl border border-amber-400 bg-white text-slate-800 focus:ring-2 focus:ring-emerald-700 cursor-pointer shadow-2xs"
                    >
                      <option value="አልተመደበም (—)">መምህር ይምረጡ...</option>
                      {activeTeachers.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
