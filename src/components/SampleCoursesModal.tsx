import React, { useState, useMemo } from 'react';
import {
  Trash2,
  X,
  AlertTriangle,
  CheckSquare,
  Square,
  Search,
  BookOpen,
  Filter,
  RotateCcw,
  Sparkles,
  Layers,
  GraduationCap
} from 'lucide-react';
import { Course } from '../types.ts';
import { PRELOADED_COURSES } from '../data/initialData.ts';
import { getInitial2018HistoricalCourses } from '../data/curriculumCourses.ts';
import { useLanguage, formatCourseTitle, formatProgram, formatTeacherDisplay, formatSemester, formatCalendarYear, formatSchedule } from '../utils/i18n.tsx';

interface SampleCoursesModalProps {
  courses: Course[];
  historical2018Courses?: Course[];
  onClose: () => void;
  onDeleteCourse: (courseId: string) => void;
  onBatchDeleteCourses: (courseIds: string[]) => void;
  onResetSampleCourses?: () => void;
  showNotify: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

// Helper to determine if a course is a preloaded sample/template course
export function isSampleCourse(course: Course): boolean {
  if (!course || !course.id) return false;
  const id = course.id;
  // Known sample ID patterns in the codebase
  if (
    id.startsWith('deg_c') ||
    id.startsWith('dip_c') ||
    id.startsWith('dip_sem') ||
    id.startsWith('deg_p_') ||
    id.startsWith('deg_r_') ||
    id.startsWith('sample_')
  ) {
    return true;
  }
  // Check against PRELOADED_COURSES
  const isPreloaded = PRELOADED_COURSES.some((c) => c.id === id);
  if (isPreloaded) return true;

  // Check against default 2018 historical curriculum
  const isHist = getInitial2018HistoricalCourses().some((c) => c.id === id);
  if (isHist) return true;

  return false;
}

export const SampleCoursesModal: React.FC<SampleCoursesModalProps> = ({
  courses,
  historical2018Courses = [],
  onClose,
  onDeleteCourse,
  onBatchDeleteCourses,
  onResetSampleCourses,
  showNotify
}) => {
  const { lang, t } = useLanguage();
  // Combine all active and historical courses into one unified list (without duplicate IDs)
  const allAvailableCourses = useMemo(() => {
    const map = new Map<string, Course>();
    courses.forEach((c) => map.set(c.id, c));
    historical2018Courses.forEach((c) => {
      if (!map.has(c.id)) {
        map.set(c.id, c);
      }
    });
    return Array.from(map.values());
  }, [courses, historical2018Courses]);

  const [filterTab, setFilterTab] = useState<'SAMPLES' | '2018' | '2019' | 'DEGREE' | 'DIPLOMA' | 'ALL'>('SAMPLES');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeletingBatch, setIsDeletingBatch] = useState(false);

  // Filtered list
  const filteredCourses = useMemo(() => {
    return allAvailableCourses.filter((c) => {
      const isSample = isSampleCourse(c);
      const is2018 = c.academicYear === '2018' || c.id.startsWith('dip_sem');
      const is2019 = c.academicYear === '2019' || (!c.academicYear && !is2018);

      if (filterTab === 'SAMPLES' && !isSample) return false;
      if (filterTab === '2018' && !is2018) return false;
      if (filterTab === '2019' && !is2019) return false;
      if (filterTab === 'DEGREE' && c.program !== 'Degree') return false;
      if (filterTab === 'DIPLOMA' && c.program !== 'Diploma') return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = c.name?.toLowerCase().includes(q);
        const matchesTeacher = c.teacher?.toLowerCase().includes(q);
        const matchesCode = c.code?.toLowerCase().includes(q);
        if (!matchesName && !matchesTeacher && !matchesCode) return false;
      }

      return true;
    });
  }, [allAvailableCourses, filterTab, searchTerm]);

  // Sample courses count
  const totalSamplesCount = useMemo(() => {
    return allAvailableCourses.filter((c) => isSampleCourse(c)).length;
  }, [allAvailableCourses]);

  // Selection handlers
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllVisible = () => {
    const visibleIds = filteredCourses.map((c) => c.id);
    const allSelected = visibleIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      // Unselect visible
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      // Select all visible
      setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  // Delete selected courses
  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) {
      showNotify(t('እባክዎ መጀመሪያ የሚሰረዙ የትምህርት ዓይነቶችን ይምረጡ!', 'Please select courses to delete first!'), 'warning');
      return;
    }

    if (
      window.confirm(
        t(
          `እርግጠኛ ነዎት? የተመረጡትን ${selectedIds.length} የትምህርት ዓይነቶች ከሲስተሙ ማሰረዝ ይፈልጋሉ? ይህ እርምጃ ናሙናዎቹ እንዳይመለሱ ያደርጋል።`,
          `Are you sure you want to permanently delete the ${selectedIds.length} selected courses? They will not return on page reload.`
        )
      )
    ) {
      setIsDeletingBatch(true);
      onBatchDeleteCourses(selectedIds);
      setSelectedIds([]);
      setIsDeletingBatch(false);
      showNotify(
        t(`${selectedIds.length} የትምህርት ዓይነቶች በስኬት ተሰርዘዋል!`, `${selectedIds.length} courses deleted successfully!`),
        'success'
      );
    }
  };

  // Delete all sample courses at once
  const handleDeleteAllSamples = () => {
    const sampleIds = allAvailableCourses.filter((c) => isSampleCourse(c)).map((c) => c.id);
    if (sampleIds.length === 0) {
      showNotify(t('ምንም የሚሰረዝ የናሙና ኮርስ አልተገኘም!', 'No sample courses found to delete!'), 'info');
      return;
    }

    if (
      window.confirm(
        t(
          `⚠️ ማረጋገጫ፦ በሲስተሙ ውስጥ የሚገኙትን ሁሉንም (${sampleIds.length}) የናሙና / ምሳሌ የትምህርት ዓይነቶች ሙሉ በሙሉ ማሰረዝ ይፈልጋሉ?\n\nእነዚህ ተሰርዘው የእርስዎ ትክክለኛ የትምህርት ዓይነቶች ብቻ ይቀራሉ።`,
          `⚠️ Confirm: Delete all (${sampleIds.length}) sample/template courses from the system?\n\nOnly your actual courses will remain.`
        )
      )
    ) {
      setIsDeletingBatch(true);
      onBatchDeleteCourses(sampleIds);
      setSelectedIds([]);
      setIsDeletingBatch(false);
      showNotify(
        t(`ሁሉም (${sampleIds.length}) የናሙና የትምህርት ዓይነቶች በስኬት ተደምስሰዋል!`, `All (${sampleIds.length}) sample courses removed successfully!`),
        'success'
      );
    }
  };

  // Delete single course
  const handleDeleteSingle = (course: Course) => {
    const courseLabel = formatCourseTitle(course.name, lang);
    const teacherLabel = formatTeacherDisplay(course.teacher, lang);
    if (
      window.confirm(
        t(
          `«${course.name}» (${course.program} — ${course.teacher}) የሚለውን የትምህርት ዓይነት ከሲስተሙ ማሰረዝ ይፈልጋሉ?`,
          `Delete "${courseLabel}" (${formatProgram(course.program, lang)} — ${teacherLabel}) from the system?`
        )
      )
    ) {
      onDeleteCourse(course.id);
      setSelectedIds((prev) => prev.filter((id) => id !== course.id));
      showNotify(
        t(`«${course.name}» ከሲስተሙ ተሰርዟል!`, `"${courseLabel}" has been deleted!`),
        'info'
      );
    }
  };

  const isAllVisibleSelected =
    filteredCourses.length > 0 &&
    filteredCourses.every((c) => selectedIds.includes(c.id));

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 no-print overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-rose-950 via-slate-900 to-indigo-950 text-white p-5 flex justify-between items-start shrink-0">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[11px] font-bold border border-rose-500/30">
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t('የናሙና የትምህርት ዓይነቶች መደለቻ', 'Sample Courses Manager')}</span>
            </div>
            <h3 className="font-black text-lg sm:text-xl text-white flex items-center gap-2">
              <span>{t('ሳንፈልጋቸው እንደ ናሙና የተሰሩ የትምህርት ዓይነቶች መደለቻ', 'Remove Unwanted Sample / Template Courses')}</span>
            </h3>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              {t(
                'እንደ ምሳሌ የተቀመጡትን ወይም የማያስፈልጉዎትን የትምህርት ዓይነቶች (ኮርሶች) እዚህ ላይ አንድ በአንድ ወይም በጅምላ መደለት ይችላሉ። የተደለቱ ኮርሶች ዳግም ገጹ ሲታደስ አይመለሱም።',
                'Delete preloaded sample or unwanted courses individually or in bulk. Deleted sample courses will not reappear upon page refresh.'
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title={t('ዝጋ', 'Close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter & Action Toolbar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3 shrink-0">
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
            {/* Search Box */}
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={t('ኮርስ በስም፣ በመምህር ወይም በኮድ ፈልግ...', 'Search by course name, instructor, or code...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border rounded-xl border-slate-300 bg-white focus:ring-2 focus:ring-rose-700 font-medium"
              />
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {totalSamplesCount > 0 && (
                <button
                  type="button"
                  onClick={handleDeleteAllSamples}
                  disabled={isDeletingBatch}
                  className="bg-rose-700 hover:bg-rose-800 text-white text-xs px-3.5 py-2 rounded-xl font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title={t('ሁሉንም የናሙና ኮርሶች በአንድ ላይ ደምስስ', 'Delete all sample courses at once')}
                >
                  <Trash2 className="w-4 h-4 text-rose-200" />
                  <span>{t(`ሁሉንም የናሙና ኮርሶች ሰርዝ (${totalSamplesCount})`, `Delete All Sample Courses (${totalSamplesCount})`)}</span>
                </button>
              )}

              {selectedIds.length > 0 && (
                <button
                  type="button"
                  onClick={handleDeleteSelected}
                  disabled={isDeletingBatch}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs px-3.5 py-2 rounded-xl font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title={t('የተመረጡትን ሰርዝ', 'Delete selected')}
                >
                  <Trash2 className="w-4 h-4 text-rose-200" />
                  <span>{t(`የተመረጡትን (${selectedIds.length}) ሰርዝ`, `Delete Selected (${selectedIds.length})`)}</span>
                </button>
              )}

              {onResetSampleCourses && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(t('የተሰረዙትን ነባሪ የናሙና ኮርሶች እንደገና ወደ ነበሩበት መመለስ ይፈልጋሉ?', 'Restore default sample courses?'))) {
                      onResetSampleCourses();
                    }
                  }}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs px-3 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  title={t('ነባሪ ናሙናዎችን እንደነበሩ መልስ', 'Restore default sample courses')}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{t('ነባሪዎችን መልስ', 'Restore Defaults')}</span>
                </button>
              )}
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-semibold">
            <span className="text-slate-500 font-bold mr-1 text-[11px] whitespace-nowrap">{t('ማጣሪያ፦', 'Filter:')}</span>
            <button
              type="button"
              onClick={() => setFilterTab('SAMPLES')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                filterTab === 'SAMPLES'
                  ? 'bg-rose-700 text-white shadow-xs font-bold'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t(`የናሙና ኮርሶች ብቻ (${allAvailableCourses.filter((c) => isSampleCourse(c)).length})`, `Sample Courses Only (${allAvailableCourses.filter((c) => isSampleCourse(c)).length})`)}</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('2018')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                filterTab === '2018'
                  ? 'bg-indigo-700 text-white shadow-xs font-bold'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <span>{t(`የ2018 ዓ.ም ኮርሶች (${allAvailableCourses.filter((c) => c.academicYear === '2018' || c.id.startsWith('dip_sem')).length})`, `2018 E.C. Courses (${allAvailableCourses.filter((c) => c.academicYear === '2018' || c.id.startsWith('dip_sem')).length})`)}</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('2019')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                filterTab === '2019'
                  ? 'bg-emerald-700 text-white shadow-xs font-bold'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <span>{t('የ2019 ዓ.ም ኮርሶች', '2019 E.C. Courses')}</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('DEGREE')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                filterTab === 'DEGREE'
                  ? 'bg-purple-700 text-white shadow-xs font-bold'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              {t(`የድግሪ (${allAvailableCourses.filter((c) => c.program === 'Degree').length})`, `Degree (${allAvailableCourses.filter((c) => c.program === 'Degree').length})`)}
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('DIPLOMA')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                filterTab === 'DIPLOMA'
                  ? 'bg-teal-700 text-white shadow-xs font-bold'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              {t(`የዲፕሎማ (${allAvailableCourses.filter((c) => c.program === 'Diploma').length})`, `Diploma (${allAvailableCourses.filter((c) => c.program === 'Diploma').length})`)}
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('ALL')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                filterTab === 'ALL'
                  ? 'bg-slate-800 text-white shadow-xs font-bold'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              {t(`ሁሉም (${allAvailableCourses.length})`, `All (${allAvailableCourses.length})`)}
            </button>
          </div>
        </div>

        {/* Course List Table */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredCourses.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                <BookOpen className="w-7 h-7" />
              </div>
              <h4 className="font-bold text-slate-800 text-base">{t('ምንም የሚሰረዝ የትምህርት ዓይነት አልተገኘም!', 'No courses found!')}</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {t(
                  'ያልተፈለጉ የናሙና ኮርሶች በሙሉ ተሰርዘዋል ወይም በፍለጋው መስፈርት የሚስማማ ኮርስ የለም።',
                  'All unwanted sample courses have been removed, or no courses match your current search filter.'
                )}
              </p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[11px] sticky top-0 z-10 border-b">
                  <tr>
                    <th className="p-3 w-10 text-center">
                      <button
                        type="button"
                        onClick={handleSelectAllVisible}
                        className="text-slate-600 hover:text-slate-900 cursor-pointer"
                        title={isAllVisibleSelected ? t('ሁሉንም አንሳ', 'Unselect All') : t('ሁሉንም ምረጥ', 'Select All')}
                      >
                        {isAllVisibleSelected ? (
                          <CheckSquare className="w-4 h-4 text-rose-700 inline" />
                        ) : (
                          <Square className="w-4 h-4 inline" />
                        )}
                      </button>
                    </th>
                    <th className="p-3">{t('ተ.ቁ', 'No.')}</th>
                    <th className="p-3">{t('የኮርስ ስም', 'Course Name')}</th>
                    <th className="p-3">{t('ፕሮግራም', 'Program')}</th>
                    <th className="p-3">{t('የትምህርት ጊዜ / ሴሚስተር', 'Term / Semester')}</th>
                    <th className="p-3">{t('የተመደበ መምህር', 'Assigned Instructor')}</th>
                    <th className="p-3 text-center">{t('ክሬዲት', 'Credits')}</th>
                    <th className="p-3 text-center">{t('ሁኔታ', 'Status')}</th>
                    <th className="p-3 text-right">{t('እርምጃ', 'Action')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCourses.map((c, idx) => {
                    const isSample = isSampleCourse(c);
                    const isSelected = selectedIds.includes(c.id);

                    return (
                      <tr
                        key={c.id}
                        className={`hover:bg-slate-50 transition-colors ${
                          isSelected ? 'bg-rose-50/60' : ''
                        }`}
                      >
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleSelect(c.id)}
                            className="text-slate-500 hover:text-slate-900 cursor-pointer"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-rose-700" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                        <td className="p-3 font-mono text-slate-400 font-bold">{idx + 1}</td>
                        <td className="p-3">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{formatCourseTitle(c.name, lang)}</span>
                            {c.code && (
                              <span className="font-mono text-[10px] text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                                {c.code}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              c.program === 'Degree'
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {formatProgram(c.program, lang)}
                          </span>
                        </td>
                        <td className="p-3 font-medium text-slate-700">
                          {c.schedule
                            ? formatSchedule(c.schedule, lang)
                            : c.academicYear
                            ? `${formatCalendarYear(c.academicYear, lang)} (${formatSemester(c.semester || '1', lang)})`
                            : t('መደበኛ', 'Regular')}
                        </td>
                        <td className="p-3 font-semibold text-slate-800">
                          {formatTeacherDisplay(c.teacher, lang)}
                        </td>
                        <td className="p-3 text-center font-bold font-mono text-amber-800">
                          {c.credits || 3}
                        </td>
                        <td className="p-3 text-center">
                          {isSample ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              {t('የናሙና ኮርስ', 'Sample Course')}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                              {t('የተፈጠረ ኮርስ', 'Custom Course')}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteSingle(c)}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-900 p-1.5 rounded-xl border border-rose-200 transition-colors cursor-pointer inline-flex items-center gap-1 font-bold text-[11px]"
                            title={t('ይህንን ኮርስ ከሲስተሙ ደምስስ', 'Delete this course')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">{t('ሰርዝ', 'Delete')}</span>
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

        {/* Modal Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
          <div className="text-xs text-slate-500 font-medium">
            {t('ድምር ኮርሶች፦', 'Total Courses:')}{' '}
            <strong className="text-slate-800">{allAvailableCourses.length}</strong> |{' '}
            {t('የናሙና ኮርሶች፦', 'Sample Courses:')}{' '}
            <strong className="text-rose-700">{totalSamplesCount}</strong>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer"
          >
            {t('ጨርስና ዝጋ', 'Done & Close')}
          </button>
        </div>
      </div>
    </div>
  );
};
