import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  Calendar,
  BookOpen,
  User,
  GraduationCap,
  Download,
  Printer,
  FileSpreadsheet,
  Award,
  Clock,
  CheckCircle2,
  FileText,
  Filter,
  History,
  Sparkles,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import {
  Course,
  GradeBreakdown,
  OfficialSignaturesConfig,
  ProgramType,
  Student
} from '../types.ts';
import {
  calculateGradeDetails,
  calculateStudentGPA,
  getCourseAssessmentItems,
  getEffectiveGradeValues,
  resolveGradeBreakdown
} from '../utils/gradeCalculations.ts';
import { getCurriculumForStudent } from '../data/curriculumCourses.ts';
import { CHURCH_LOGO } from '../assets/logo.ts';
import { exportCourseGradesToExcel, exportMasterSemesterGradeSheetToExcel } from '../utils/excelUtils.ts';
import { downloadElementAsPdf, printElementDirectly } from '../utils/pdfExport.ts';
import { useLanguage, formatProgram, formatCalendarYear, formatSemester, formatYearLevel, formatGender, formatCourseTitle, formatTeacherDisplay, formatSchedule } from '../utils/i18n.tsx';

interface HistoricalArchiveModalProps {
  students: Student[];
  courses: Course[];
  grades: Record<string, GradeBreakdown>;
  teachers: string[];
  availableYears: string[];
  currentYear: string;
  currentSemester: string;
  churchLogo?: string;
  officialConfig?: OfficialSignaturesConfig;
  onClose: () => void;
  onOpenStudentTranscript?: (student: Student) => void;
  onOpenCourseReport?: (course: Course) => void;
  onOpenMasterReport?: () => void;
}

export const HistoricalArchiveModal: React.FC<HistoricalArchiveModalProps> = ({
  students,
  courses,
  grades,
  teachers,
  availableYears,
  currentYear,
  currentSemester,
  churchLogo,
  officialConfig,
  onClose,
  onOpenStudentTranscript,
  onOpenCourseReport,
  onOpenMasterReport
}) => {
  const { lang, t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'students' | 'courses' | 'master' | 'history'>('students');
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>('ALL');
  const [selectedProgramFilter, setSelectedProgramFilter] = useState<'ALL' | ProgramType>('ALL');

  // Filter students based on search term and filters
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchSearch =
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.program.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchProg = selectedProgramFilter === 'ALL' || s.program === selectedProgramFilter;
      const matchYear =
        selectedYearFilter === 'ALL' ||
        s.admissionYear === selectedYearFilter ||
        s.graduationYear === selectedYearFilter ||
        s.currentStudyYear?.toString() === selectedYearFilter;

      return matchSearch && matchProg && matchYear;
    });
  }, [students, searchTerm, selectedProgramFilter, selectedYearFilter]);

  // Filter courses based on search term
  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.code && c.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
        c.teacher.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.program.toLowerCase().includes(searchTerm.toLowerCase());

      const matchProg = selectedProgramFilter === 'ALL' || c.program === selectedProgramFilter;
      return matchSearch && matchProg;
    });
  }, [courses, searchTerm, selectedProgramFilter]);

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full overflow-hidden my-auto border border-slate-300 flex flex-col max-h-[92vh]">
        {/* Modal Top Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-900 text-white px-6 py-4 flex flex-wrap justify-between items-center gap-3 no-print border-b border-emerald-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-400/20 text-amber-300 rounded-2xl border border-amber-400/40">
              <History className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-white flex items-center gap-2">
                <span>{t('የቀደሙ ሥራዎችና የውጤት ማህደር መፈለጊያ ማዕከል', 'Historical Archive & Records Center')}</span>
                <span className="text-[10px] bg-amber-400/20 text-amber-300 border border-amber-400/40 font-mono px-2 py-0.5 rounded-md font-bold">
                  ARCHIVE LOOKUP
                </span>
              </h3>
              <p className="text-xs text-emerald-200">
                {t(
                  'የተማሪዎችን የቀደመ ውጤት፣ ትራንስክሪፕት፣ የኮርሶች ማህደር እና የሴሚስተር ሪፖርቶች በቀላሉ ፈልገው ያውርዱ',
                  'Search and download student academic records, transcripts, course grade sheets, and semester master reports'
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-300 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer text-lg"
            title={t('ዝጋ', 'Close')}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Global Search & Filters Bar */}
        <div className="bg-slate-50 p-4 border-b border-slate-200 flex-shrink-0 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t(
                  'በተማሪ ስም፣ በመለያ ቁጥር (ID)፣ በኮርስ ስም ወይም በመምህር ስም ይፈልጉ...',
                  'Search by student name, ID, course title, or instructor...'
                )}
                className="w-full pl-11 pr-4 py-2.5 text-xs sm:text-sm font-bold border border-slate-300 rounded-2xl bg-white focus:ring-2 focus:ring-emerald-700 text-slate-900 placeholder:text-slate-400 shadow-2xs"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs font-bold"
                >
                  {t('አጽዳ', 'Clear')}
                </button>
              )}
            </div>

            {/* Program Filter */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-2xl px-3 py-2 text-xs shadow-2xs w-full sm:w-auto">
              <Filter className="w-4 h-4 text-emerald-800" />
              <span className="font-bold text-slate-700">{t('ፕሮግራም:', 'Program:')}</span>
              <select
                value={selectedProgramFilter}
                onChange={(e) => setSelectedProgramFilter(e.target.value as any)}
                className="font-bold bg-transparent text-slate-900 focus:outline-none cursor-pointer"
              >
                <option value="ALL">{t('ሁሉንም ፕሮግራሞች', 'All Programs')}</option>
                <option value="Diploma">{formatProgram('Diploma', lang)}</option>
                <option value="Degree">{formatProgram('Degree', lang)}</option>
              </select>
            </div>

            {/* Year Filter */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-2xl px-3 py-2 text-xs shadow-2xs w-full sm:w-auto">
              <Calendar className="w-4 h-4 text-amber-700" />
              <span className="font-bold text-slate-700">{t('ዘመን:', 'Year:')}</span>
              <select
                value={selectedYearFilter}
                onChange={(e) => setSelectedYearFilter(e.target.value)}
                className="font-bold bg-transparent text-slate-900 focus:outline-none cursor-pointer"
              >
                <option value="ALL">{t('ሁሉንም ዓመታት', 'All Years')}</option>
                {availableYears.map((y) => (
                  <option key={y} value={y}>
                    {formatCalendarYear(y, lang)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Modal Category Tabs */}
          <div className="flex border-b border-slate-200 gap-2 overflow-x-auto pt-1">
            <button
              onClick={() => setActiveTab('students')}
              className={`py-2 px-4 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                activeTab === 'students'
                  ? 'border-emerald-800 text-emerald-950 bg-white shadow-xs'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <User className="w-4 h-4 text-emerald-700" />
              <span>{t(`የተማሪዎች የቀደመ ውጤት ማህደር (${filteredStudents.length})`, `Student Historical Records (${filteredStudents.length})`)}</span>
            </button>

            <button
              onClick={() => setActiveTab('courses')}
              className={`py-2 px-4 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                activeTab === 'courses'
                  ? 'border-emerald-800 text-emerald-950 bg-white shadow-xs'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <BookOpen className="w-4 h-4 text-cyan-700" />
              <span>{t(`የኮርሶች የቀደመ የውጤት ሰነዶች (${filteredCourses.length})`, `Course Grade Sheets (${filteredCourses.length})`)}</span>
            </button>

            <button
              onClick={() => setActiveTab('master')}
              className={`py-2 px-4 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                activeTab === 'master'
                  ? 'border-emerald-800 text-emerald-950 bg-white shadow-xs'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Printer className="w-4 h-4 text-indigo-600" />
              <span>{t('የሴሚስተር ማስተር ሪፖርት ማህደር', 'Semester Master Report Archive')}</span>
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: Student Historical Academic Search */}
          {activeTab === 'students' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs font-bold text-slate-600">
                <span>{t(`የተገኙ ተማሪዎች: ${filteredStudents.length}`, `Found Students: ${filteredStudents.length}`)}</span>
                <span className="text-[11px] text-emerald-800">
                  {t('ተማሪውን ሲጫኑ የተሟላ የቀደመ ትራንስክሪፕትና ውጤት ይከፈታል', 'Click a student to open their full transcript and historical grades')}
                </span>
              </div>

              {filteredStudents.length === 0 ? (
                <div className="p-12 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-300">
                  <User className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-700">{t('ምንም ተማሪ አልተገኘም', 'No students found')}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {t('የመፈለጊያ ቃሉን ወይም የፕሮግራም/ዘመን ማጣሪያውን ቀይረው ይሞክሩ።', 'Try adjusting your search query or program/year filters.')}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredStudents.map((student) => {
                    const gpa = calculateStudentGPA(student, courses, grades, currentYear, currentSemester);
                    const curriculum = getCurriculumForStudent(student);

                    return (
                      <div
                        key={student.uid}
                        className="bg-white border-2 border-slate-200 hover:border-emerald-500 rounded-3xl p-4 shadow-2xs hover:shadow-md transition-all space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-800 to-teal-900 text-white font-black text-base flex items-center justify-center shadow-xs flex-shrink-0">
                              {student.photoUrl ? (
                                <img
                                  src={student.photoUrl}
                                  alt={student.name}
                                  className="w-full h-full object-cover rounded-2xl"
                                />
                              ) : (
                                student.name.substring(0, 1)
                              )}
                            </div>
                            <div>
                              <h4 className="font-extrabold text-sm text-slate-900">{student.name}</h4>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                  {student.id}
                                </span>
                                <span className="text-[11px] font-bold text-emerald-800">
                                  {formatProgram(student.program, lang)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">{t('አጠቃላይ GPA', 'Cumulative GPA')}</span>
                            <span className="text-base font-black font-mono text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200 inline-block mt-0.5">
                              {gpa}
                            </span>
                          </div>
                        </div>

                        {/* Academic History Details */}
                        <div className="text-xs bg-slate-50 border border-slate-200 p-2.5 rounded-xl space-y-1 text-slate-700">
                          <div className="flex justify-between">
                            <span>{t('የገቡበት ዘመን፦', 'Admission Year:')}</span>
                            <strong className="text-slate-900">{formatCalendarYear(student.admissionYear || '2018', lang)}</strong>
                          </div>
                          <div className="flex justify-between">
                            <span>{t('ደረጃ፦', 'Level:')}</span>
                            <strong className="text-slate-900">
                              {formatYearLevel(student.currentStudyYear || 1, lang)} ({formatGender(student.gender, lang)})
                            </strong>
                          </div>
                          <div className="flex justify-between">
                            <span>{t('የተሟሉ ሴሚስተሮች፦', 'Curriculum Semesters:')}</span>
                            <strong className="text-emerald-800">
                              {t(`${curriculum.length} ሴሚስተሮች`, `${curriculum.length} Semesters`)}
                            </strong>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              onOpenStudentTranscript?.(student);
                              onClose();
                            }}
                            className="flex-1 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold py-2 px-3 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>{t('ትራንስክሪፕት ክፈት', 'Open Transcript')}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Course Historical Grade Sheets Search */}
          {activeTab === 'courses' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs font-bold text-slate-600">
                <span>{t(`የተገኙ ኮርሶች: ${filteredCourses.length}`, `Found Courses: ${filteredCourses.length}`)}</span>
                <span className="text-[11px] text-emerald-800">
                  {t('የማንኛውንም ኮርስ የቀደመ የውጤት ሰነድ በፒዲኤፍ ወይም ኤክሴል ማውረድ ይችላሉ', 'Download any course grade sheet as PDF or Excel')}
                </span>
              </div>

              {filteredCourses.length === 0 ? (
                <div className="p-12 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-300">
                  <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-700">{t('ምንም ኮርስ አልተገኘም', 'No courses found')}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredCourses.map((course) => {
                    const enrolled = students.filter((s) => s.program === course.program);

                    return (
                      <div
                        key={course.id}
                        className="bg-white border-2 border-slate-200 hover:border-cyan-500 rounded-3xl p-4 shadow-2xs hover:shadow-md transition-all space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              {course.code && (
                                <span className="font-mono text-xs font-bold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                                  {course.code}
                                </span>
                              )}
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
                                {formatProgram(course.program, lang)}
                              </span>
                            </div>
                            <h4 className="font-extrabold text-sm text-slate-900 mt-1">{formatCourseTitle(course.name, lang)}</h4>
                            <p className="text-xs text-slate-600 mt-0.5">
                              {t('መምህር፦', 'Instructor:')} <strong className="text-slate-800">{formatTeacherDisplay(course.teacher, lang)}</strong>
                            </p>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">{t('ተማሪዎች', 'Students')}</span>
                            <span className="text-sm font-black font-mono text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200 inline-block mt-0.5">
                              {enrolled.length}
                            </span>
                          </div>
                        </div>

                        <div className="text-xs bg-slate-50 border border-slate-200 p-2.5 rounded-xl flex items-center justify-between text-slate-700">
                          <span>{t('ቀን ሰሌዳ፦', 'Schedule:')} <strong className="text-slate-900">{formatSchedule(course.schedule, lang)}</strong></span>
                          <span>{t('ክሬዲት፦', 'Credits:')} <strong className="text-emerald-800">{course.credits} cr</strong></span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              onOpenCourseReport?.(course);
                              onClose();
                            }}
                            className="flex-1 bg-cyan-700 hover:bg-cyan-800 text-white text-xs font-bold py-2 px-3 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>{t('የውጤት ሰነድ (PDF)', 'Grade Sheet (PDF)')}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              exportCourseGradesToExcel(course, students, grades, currentYear, currentSemester);
                            }}
                            className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold py-2 px-3 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                            title={t('በኤክሴል (.xlsx) አውርድ', 'Download Excel (.xlsx)')}
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                            <span>{t('ኤክሴል', 'Excel')}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Semester Master Report Historical Archive */}
          {activeTab === 'master' && (
            <div className="bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-950 text-white rounded-3xl p-6 shadow-md border-2 border-amber-400/70 space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-lg font-black text-amber-300 flex items-center gap-2">
                    <Printer className="w-6 h-6 text-amber-400" />
                    <span>{t('የሴሚስተር አጠቃላይ የውጤት ሰነድ ማህደር', 'Semester Master Grade Sheet Archive')}</span>
                  </h4>
                  <p className="text-xs text-slate-300 mt-1 max-w-xl">
                    {t(
                      'የማንኛውንም የትምህርት ዘመን እና ሴሚስተር አጠቃላይ የተማሪዎች ውጤት ሰነድ (Master Sheet) በA4 Landscape ዲዛይን በፒዲኤፍ ወይም በኤክሴል አውርድ።',
                      'Download the official A4 Landscape Master Grade Sheet for any academic year and semester in PDF or Excel.'
                    )}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-xs border border-white/10 space-y-2">
                  <label className="text-xs font-bold text-amber-300 block">{t('የማህደር ዘመን ይምረጡ፦', 'Select Archive Year:')}</label>
                  <select
                    value={selectedYearFilter}
                    onChange={(e) => setSelectedYearFilter(e.target.value)}
                    className="w-full p-2.5 text-xs font-bold rounded-xl bg-slate-900 text-white border border-slate-700 cursor-pointer"
                  >
                    <option value="ALL">{t('ሁሉንም የትምህርት ዘመናት', 'All Academic Years')}</option>
                    {availableYears.map((y) => (
                      <option key={y} value={y}>
                        {formatCalendarYear(y, lang)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-xs border border-white/10 space-y-2">
                  <label className="text-xs font-bold text-amber-300 block">{t('የማህደር ሴሚስተር፦', 'Archive Semester:')}</label>
                  <div className="p-2.5 text-xs font-bold rounded-xl bg-slate-900 text-emerald-300 border border-slate-700 flex items-center justify-between">
                    <span>
                      {currentSemester === 'ALL'
                        ? t('ሁሉም ሴሚስተሮች (Combined)', 'All Semesters (Combined)')
                        : formatSemester(currentSemester, lang)}
                    </span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onOpenMasterReport?.();
                    onClose();
                  }}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs py-3 px-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>{t('ይፋዊ የሴሚስተር ማስተር ሪፖርት (PDF) ክፈት', 'Open Official Master Report (PDF)')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    exportMasterSemesterGradeSheetToExcel(
                      students,
                      courses,
                      grades,
                      selectedYearFilter === 'ALL' ? currentYear : selectedYearFilter,
                      currentSemester,
                      selectedProgramFilter
                    );
                  }}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs py-3 px-4 rounded-2xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
                  <span>{t('ኤክሴል አውርድ (.xlsx)', 'Download Excel (.xlsx)')}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
