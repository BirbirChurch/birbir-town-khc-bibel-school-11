import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  CheckCircle2,
  EyeOff,
  ShieldAlert,
  Users,
  Filter,
  Lock,
  Unlock,
  Printer,
  FileDown,
  UserCheck,
  UserX,
  GraduationCap
} from 'lucide-react';
import { ProgramType, Student } from '../types.ts';
import { sortStudentsByAmharicName } from '../utils/amharicSort.ts';
import { useLanguage, formatProgram, formatYearLevel } from '../utils/i18n.tsx';

interface GradeReleaseManagerModalProps {
  students: Student[];
  gradePublished: boolean;
  individualGradeRelease: Record<string, boolean>;
  fullTranscriptPublished: boolean;
  individualFullTranscriptRelease: Record<string, boolean>;
  studentPdfPrintAllowed: boolean;
  individualPdfPrintAllowed: Record<string, boolean>;
  onToggleGlobalRelease: (value: boolean) => void;
  onSetIndividualRelease: (studentUid: string, released: boolean) => void;
  onBatchSetRelease: (uids: string[], released: boolean) => void;
  onToggleGlobalFullTranscript: (value: boolean) => void;
  onSetIndividualFullTranscript: (studentUid: string, allowed: boolean) => void;
  onBatchSetFullTranscript: (uids: string[], allowed: boolean) => void;
  onToggleGlobalPdfPrint: (value: boolean) => void;
  onSetIndividualPdfPrint: (studentUid: string, allowed: boolean) => void;
  onBatchSetPdfPrint: (uids: string[], allowed: boolean) => void;
  onClose: () => void;
  showNotify?: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const GradeReleaseManagerModal: React.FC<GradeReleaseManagerModalProps> = ({
  students,
  gradePublished,
  individualGradeRelease,
  fullTranscriptPublished,
  individualFullTranscriptRelease,
  studentPdfPrintAllowed,
  individualPdfPrintAllowed,
  onToggleGlobalRelease,
  onSetIndividualRelease,
  onBatchSetRelease,
  onToggleGlobalFullTranscript,
  onSetIndividualFullTranscript,
  onBatchSetFullTranscript,
  onToggleGlobalPdfPrint,
  onSetIndividualPdfPrint,
  onBatchSetPdfPrint,
  onClose,
  showNotify
}) => {
  const { lang, t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [programFilter, setProgramFilter] = useState<'ALL' | ProgramType>('ALL');
  const [statusFilter, setStatusFilter] = useState<
    'ALL' | 'RELEASED' | 'HELD' | 'FULL_TRANSCRIPT_ALLOWED' | 'FULL_TRANSCRIPT_BLOCKED' | 'PRINT_ALLOWED' | 'PRINT_BLOCKED'
  >('ALL');

  // Filter students based on search and status (ordered in Amharic fidel sequence)
  const filteredStudents = useMemo(() => {
    const list = students.filter((s) => {
      const isGradeReleased = individualGradeRelease[s.uid] !== undefined
        ? individualGradeRelease[s.uid]
        : gradePublished;

      const isFullTranscriptAllowed = individualFullTranscriptRelease[s.uid] !== undefined
        ? individualFullTranscriptRelease[s.uid]
        : fullTranscriptPublished;

      const isPrintAllowed = individualPdfPrintAllowed[s.uid] !== undefined
        ? individualPdfPrintAllowed[s.uid]
        : studentPdfPrintAllowed;

      const matchesSearch =
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.program.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesProgram = programFilter === 'ALL' || s.program === programFilter;

      let matchesStatus = true;
      if (statusFilter === 'RELEASED') matchesStatus = isGradeReleased;
      else if (statusFilter === 'HELD') matchesStatus = !isGradeReleased;
      else if (statusFilter === 'FULL_TRANSCRIPT_ALLOWED') matchesStatus = isFullTranscriptAllowed;
      else if (statusFilter === 'FULL_TRANSCRIPT_BLOCKED') matchesStatus = !isFullTranscriptAllowed;
      else if (statusFilter === 'PRINT_ALLOWED') matchesStatus = isPrintAllowed;
      else if (statusFilter === 'PRINT_BLOCKED') matchesStatus = !isPrintAllowed;

      return matchesSearch && matchesProgram && matchesStatus;
    });

    return sortStudentsByAmharicName(list);
  }, [

    students,
    individualGradeRelease,
    gradePublished,
    individualFullTranscriptRelease,
    fullTranscriptPublished,
    individualPdfPrintAllowed,
    studentPdfPrintAllowed,
    searchTerm,
    programFilter,
    statusFilter
  ]);

  // Count metrics
  const totalCount = students.length;
  const gradeReleasedCount = students.filter(
    (s) => (individualGradeRelease[s.uid] !== undefined ? individualGradeRelease[s.uid] : gradePublished) === true
  ).length;

  const fullTranscriptAllowedCount = students.filter(
    (s) => (individualFullTranscriptRelease[s.uid] !== undefined ? individualFullTranscriptRelease[s.uid] : fullTranscriptPublished) === true
  ).length;

  const printAllowedCount = students.filter(
    (s) => (individualPdfPrintAllowed[s.uid] !== undefined ? individualPdfPrintAllowed[s.uid] : studentPdfPrintAllowed) === true
  ).length;

  // Bulk handlers
  const handleReleaseAllFiltered = () => {
    const uids = filteredStudents.map((s) => s.uid);
    onBatchSetRelease(uids, true);
    onToggleGlobalRelease(true);
    showNotify?.(
      t(
        `ለ${uids.length} ተማሪዎች የሴሚስተር ውጤትና ትራንስክሪፕት እይታ ተፈቅዷል!`,
        `Semester grades and transcripts released for ${uids.length} students!`
      ),
      'success'
    );
  };

  const handleHoldAllFiltered = () => {
    const uids = filteredStudents.map((s) => s.uid);
    onBatchSetRelease(uids, false);
    showNotify?.(
      t(
        `ለ${uids.length} ተማሪዎች የሴሚስተር ውጤትና ትራንስክሪፕት እይታ ታግዷል!`,
        `Semester grades and transcripts held for ${uids.length} students!`
      ),
      'warning'
    );
  };

  const handleAllowFullTranscriptFiltered = () => {
    const uids = filteredStudents.map((s) => s.uid);
    onBatchSetFullTranscript(uids, true);
    onToggleGlobalFullTranscript(true);
    showNotify?.(
      t(
        `ለ${uids.length} ተማሪዎች ሙሉ የምረቃ ትራንስክሪፕት በገጻቸው ላይ እንዲታይ ተፈቅዷል!`,
        `Full graduation transcript enabled for ${uids.length} students!`
      ),
      'success'
    );
  };

  const handleBlockFullTranscriptFiltered = () => {
    const uids = filteredStudents.map((s) => s.uid);
    onBatchSetFullTranscript(uids, false);
    onToggleGlobalFullTranscript(false);
    showNotify?.(
      t(
        `ለ${uids.length} ተማሪዎች ሙሉ የምረቃ ትራንስክሪፕት እንዳይታይ ታግዷል!`,
        `Full graduation transcript blocked for ${uids.length} students!`
      ),
      'warning'
    );
  };

  const handleAllowPdfAllFiltered = () => {
    const uids = filteredStudents.map((s) => s.uid);
    onBatchSetPdfPrint(uids, true);
    onToggleGlobalPdfPrint(true);
    showNotify?.(
      t(`ለ${uids.length} ተማሪዎች ፒዲኤፍ ማተም ተፈቅዷል!`, `PDF printing allowed for ${uids.length} students!`),
      'success'
    );
  };

  const handleBlockPdfAllFiltered = () => {
    const uids = filteredStudents.map((s) => s.uid);
    onBatchSetPdfPrint(uids, false);
    onToggleGlobalPdfPrint(false);
    showNotify?.(
      t(`ለ${uids.length} ተማሪዎች ፒዲኤፍ ማተም ታግዷል!`, `PDF printing blocked for ${uids.length} students!`),
      'warning'
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-1.5 sm:p-4 overflow-hidden">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-6xl w-full overflow-hidden border border-slate-300 flex flex-col max-h-[95vh]">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-900 text-white px-4 py-3 sm:px-6 sm:py-4 flex flex-wrap justify-between items-center gap-2.5 sm:gap-3 no-print border-b border-emerald-800 flex-shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <div className="p-2 sm:p-2.5 bg-amber-400/20 text-amber-300 rounded-2xl border border-amber-400/40 shrink-0">
              <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <h3 className="font-extrabold text-sm sm:text-lg text-white flex flex-wrap items-center gap-1.5">
                <span className="truncate">{t('የውጤት፣ የምረቃ ትራንስክሪፕት እና የፒዲኤፍ ፈቃድ መቆጣጠሪያ', 'Grades, Transcript & PDF Permissions Manager')}</span>
                <span className="text-[10px] bg-amber-400/20 text-amber-300 border border-amber-400/40 font-mono px-2 py-0.5 rounded-md font-bold shrink-0">
                  PERMISSIONS
                </span>
              </h3>
              <p className="text-[11px] sm:text-xs text-emerald-200 hidden sm:block">
                {t(
                  'የሴሚስተር ውጤትን፣ ሙሉ የምረቃ ትራንስክሪፕትን እና በፒዲኤፍ ማተምን ለሁሉም ወይም በልዩነት መርጠው ይፍቀዱ/ይእገዱ',
                  'Allow or restrict semester grade visibility, full graduation transcripts, and PDF printing globally or per student'
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-300 hover:text-white p-2 min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            aria-label={t('ዝጋ', 'Close')}
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Global Action Banners (Module 1: Semester Grade, Module 2: Full Graduation Transcript, Module 3: PDF Print) */}
        <div className="bg-slate-900 text-slate-100 p-3 sm:p-4 border-b border-slate-800 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 sm:gap-4 flex-shrink-0">
          {/* Statistics summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs w-full lg:w-auto">
            <div className="bg-slate-800/90 border border-slate-700 rounded-2xl px-3 py-2 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{t('ጠቅላላ፦', 'Total:')} <strong className="text-white text-sm font-mono">{totalCount}</strong></span>
            </div>
            <div className="bg-emerald-950/90 border border-emerald-700/80 rounded-2xl px-3 py-2 flex items-center gap-2 text-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{t('ውጤት የታየ፦', 'Released:')} <strong className="text-amber-300 text-sm font-mono">{gradeReleasedCount}</strong></span>
            </div>
            <div className="bg-amber-950/90 border border-amber-700/80 rounded-2xl px-3 py-2 flex items-center gap-2 text-amber-200">
              <GraduationCap className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>{t('ሙሉ ትራንስክሪፕት፦', 'Full Transcript:')} <strong className="text-amber-300 text-sm font-mono">{fullTranscriptAllowedCount}</strong></span>
            </div>
            <div className="bg-indigo-950/90 border border-indigo-700/80 rounded-2xl px-3 py-2 flex items-center gap-2 text-indigo-200">
              <Printer className="w-4 h-4 text-indigo-400 flex-shrink-0" />
              <span>{t('ፒዲኤፍ፦', 'PDF Print:')} <strong className="text-amber-300 text-sm font-mono">{printAllowedCount}</strong></span>
            </div>
          </div>

          {/* Bulk Action Controls */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-start lg:justify-end">
            {/* Semester Grade Bulk */}
            <div className="flex flex-wrap items-center gap-1 bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700">
              <button
                type="button"
                onClick={handleReleaseAllFiltered}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] px-2.5 py-2 min-h-[36px] rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                title={t('የሴሚስተር ውጤት ለሁሉም እንዲታይ ፍቀድ', 'Release semester grades for all filtered students')}
              >
                <UserCheck className="w-3.5 h-3.5 text-amber-300" />
                <span>{t('🌐 ውጤት አሳይ', '🌐 Release Grades')}</span>
              </button>
              <button
                type="button"
                onClick={handleHoldAllFiltered}
                className="bg-rose-700 hover:bg-rose-800 text-white font-extrabold text-[11px] px-2.5 py-2 min-h-[36px] rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                title={t('የሴሚስተር ውጤት ለሁሉም እንዳይታይ እገድ', 'Hold semester grades for all filtered students')}
              >
                <UserX className="w-3.5 h-3.5 text-white" />
                <span>{t('🔒 ውጤት እገድ', '🔒 Hold Grades')}</span>
              </button>
            </div>

            {/* Full Graduation Transcript Bulk */}
            <div className="flex flex-wrap items-center gap-1 bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700">
              <button
                type="button"
                onClick={handleAllowFullTranscriptFiltered}
                className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-[11px] px-2.5 py-2 min-h-[36px] rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                title={t('ሙሉ የምረቃ ትራንስክሪፕት በተማሪዎች ገጽ ላይ እንዲታይ ፍቀድ', 'Allow full graduation transcript on student portals')}
              >
                <GraduationCap className="w-3.5 h-3.5 text-amber-200" />
                <span>{t('🎓 ሙሉ ፍቀድ', '🎓 Allow Full')}</span>
              </button>
              <button
                type="button"
                onClick={handleBlockFullTranscriptFiltered}
                className="bg-slate-700 hover:bg-rose-800 text-white font-extrabold text-[11px] px-2.5 py-2 min-h-[36px] rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                title={t('ሙሉ የምረቃ ትራንስክሪፕት በተማሪዎች ገጽ እንዳይታይ እገድ', 'Hide full graduation transcript on student portals')}
              >
                <Lock className="w-3.5 h-3.5 text-white" />
                <span>{t('🔒 ሙሉ እገድ', '🔒 Lock Full')}</span>
              </button>
            </div>

            {/* PDF Print Bulk */}
            <div className="flex flex-wrap items-center gap-1 bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700">
              <button
                type="button"
                onClick={handleAllowPdfAllFiltered}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[11px] px-2.5 py-2 min-h-[36px] rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                title={t('ተማሪዎች በፒዲኤፍ እንዲያትሙ ወይም እንዲያወርዱ ፍቀድ', 'Allow students to print/download PDF')}
              >
                <Printer className="w-3.5 h-3.5 text-amber-300" />
                <span>{t('🖨️ ፒዲኤፍ ፍቀድ', '🖨️ Allow PDF')}</span>
              </button>
              <button
                type="button"
                onClick={handleBlockPdfAllFiltered}
                className="bg-slate-700 hover:bg-amber-700 text-white font-extrabold text-[11px] px-2.5 py-2 min-h-[36px] rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                title={t('ተማሪዎች በፒዲኤፍ እንዳያትሙ እገድ (ማየት ብቻ)', 'Disable student PDF printing (View Only)')}
              >
                <Lock className="w-3.5 h-3.5 text-white" />
                <span>{t('🚫 ፒዲኤፍ እገድ', '🚫 Block PDF')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-slate-50 p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-3 items-center flex-shrink-0">
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('ተማሪ በስም፣ በID ቁጥር ወይም በፕሮግራም ይፈልጉ...', 'Search student by name, ID, or program...')}
              className="w-full pl-10 pr-4 py-2 text-xs font-bold border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-700 text-slate-900 shadow-2xs"
            />
          </div>

          {/* Program Filter */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs shadow-2xs w-full sm:w-auto">
            <Filter className="w-3.5 h-3.5 text-emerald-800" />
            <span className="font-bold text-slate-700">{t('ፕሮግራም:', 'Program:')}</span>
            <select
              value={programFilter}
              onChange={(e) => setProgramFilter(e.target.value as any)}
              className="font-bold bg-transparent text-slate-900 focus:outline-none cursor-pointer"
            >
              <option value="ALL">{t('ሁሉንም ፕሮግራሞች', 'All Programs')}</option>
              <option value="Diploma">{formatProgram('Diploma', lang)}</option>
              <option value="Degree">{formatProgram('Degree', lang)}</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs shadow-2xs w-full sm:w-auto">
            <Lock className="w-3.5 h-3.5 text-amber-700" />
            <span className="font-bold text-slate-700">{t('የፈቃድ አይነት:', 'Permission:')}</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="font-bold bg-transparent text-slate-900 focus:outline-none cursor-pointer"
            >
              <option value="ALL">{t('ሁሉንም ተማሪዎች', 'All Students')}</option>
              <option value="RELEASED">{t('ውጤት የታየላቸው', 'Grade Released')}</option>
              <option value="HELD">{t('ውጤት የታገዱ', 'Grade Held')}</option>
              <option value="FULL_TRANSCRIPT_ALLOWED">{t('ሙሉ ትራንስክሪፕት የተፈቀደላቸው', 'Full Transcript Allowed')}</option>
              <option value="FULL_TRANSCRIPT_BLOCKED">{t('ሙሉ ትራንስክሪፕት የታገዱ', 'Full Transcript Locked')}</option>
              <option value="PRINT_ALLOWED">{t('ፒዲኤፍ የተፈቀደላቸው', 'Print Allowed')}</option>
              <option value="PRINT_BLOCKED">{t('ፒዲኤፍ የታገዱ', 'Print Blocked')}</option>
            </select>
          </div>
        </div>

        {/* Scrollable Student List Table */}
        <div className="p-4 overflow-y-auto flex-1">
          {filteredStudents.length === 0 ? (
            <div className="p-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">{t('ምንም ተማሪ አልተገኘም', 'No students found')}</p>
              <p className="text-xs text-slate-500 mt-1">{t('የመፈለጊያ ቃሉን ወይም ማጣሪያውን ቀይረው ይሞክሩ።', 'Try adjusting your search or filter.')}</p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs bg-white">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-extrabold text-[11px] uppercase border-b border-slate-200">
                  <tr>
                    <th className="p-3 text-center w-10">{t('ተ.ቁ', 'No.')}</th>
                    <th className="p-3 w-28">{t('መለያ ቁጥር (ID)', 'Student ID')}</th>
                    <th className="p-3">{t('የተማሪ ሙሉ ስም', 'Full Name')}</th>
                    <th className="p-3 w-32">{t('ፕሮግራም/ደረጃ', 'Program / Year')}</th>
                    <th className="p-3 text-center w-36">{t('የሴሚስተር ውጤት', 'Semester Grade')}</th>
                    <th className="p-3 text-center w-40">{t('ሙሉ የምረቃ ትራንስክሪፕት', 'Full Transcript')}</th>
                    <th className="p-3 text-center w-36">{t('የፒዲኤፍ ህትመት', 'PDF Printing')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {filteredStudents.map((student, idx) => {
                    const isGradeReleased = individualGradeRelease[student.uid] !== undefined
                      ? individualGradeRelease[student.uid]
                      : gradePublished;

                    const isFullTranscriptAllowed = individualFullTranscriptRelease[student.uid] !== undefined
                      ? individualFullTranscriptRelease[student.uid]
                      : fullTranscriptPublished;

                    const isPdfAllowed = individualPdfPrintAllowed[student.uid] !== undefined
                      ? individualPdfPrintAllowed[student.uid]
                      : studentPdfPrintAllowed;

                    return (
                      <tr
                        key={student.uid}
                        className={`hover:bg-slate-50 transition-colors ${
                          !isGradeReleased ? 'bg-rose-50/20' : ''
                        }`}
                      >
                        <td className="p-3 text-center font-mono text-slate-400 font-bold">
                          {idx + 1}
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-900">
                          {student.id}
                        </td>
                        <td className="p-3 font-extrabold text-slate-900">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-emerald-800 text-white font-bold flex items-center justify-center text-xs flex-shrink-0">
                              {student.photoUrl ? (
                                <img
                                  src={student.photoUrl}
                                  alt={student.name}
                                  className="w-full h-full rounded-full object-cover"
                                />
                              ) : (
                                student.name.substring(0, 1)
                              )}
                            </div>
                            <div>
                              <span>{student.name}</span>
                              {student.graduationStatus === 'GRADUATED' && (
                                <span className="ml-1.5 text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded border border-emerald-300">
                                  {t('🎓 የተመረቀ', '🎓 Graduated')}
                                </span>
                              )}
                              {student.graduationStatus === 'CANDIDATE' && (
                                <span className="ml-1.5 text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded border border-amber-300">
                                  {t('⭐ ተማራቂ', '⭐ Candidate')}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-3 font-bold text-slate-700">
                          <div className="flex flex-col gap-0.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold w-fit ${
                                student.program === 'Degree'
                                  ? 'bg-indigo-100 text-indigo-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {formatProgram(student.program, lang)}
                            </span>
                            <span className="text-[10px] text-slate-500 font-medium">
                              {formatYearLevel(student.currentStudyYear || 1, lang)}
                            </span>
                          </div>
                        </td>

                        {/* Column 1: Semester Grade Visibility */}
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center">
                            {isGradeReleased ? (
                              <button
                                type="button"
                                onClick={() => {
                                  onSetIndividualRelease(student.uid, false);
                                  showNotify?.(
                                    t(`የተማሪ ${student.name} የሴሚስተር ውጤት ታግዷል!`, `Semester grade held for ${student.name}!`),
                                    'warning'
                                  );
                                }}
                                className="bg-emerald-700 hover:bg-rose-700 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-xl transition-all inline-flex items-center gap-1 shadow-2xs cursor-pointer group"
                                title={t('ውጤቱን ለማገድ ይጫኑ', 'Click to hold grade')}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-amber-300 group-hover:hidden" />
                                <Lock className="w-3.5 h-3.5 hidden group-hover:inline" />
                                <span className="group-hover:hidden">{t('ተፈቅዷል', 'Released')}</span>
                                <span className="hidden group-hover:inline">{t('እገድ', 'Hold')}</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  onSetIndividualRelease(student.uid, true);
                                  showNotify?.(
                                    t(`ለተማሪ ${student.name} የሴሚስተር ውጤት ተፈቅዷል!`, `Semester grade released for ${student.name}!`),
                                    'success'
                                  );
                                }}
                                className="bg-rose-600 hover:bg-emerald-700 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-xl transition-all inline-flex items-center gap-1 shadow-2xs cursor-pointer group"
                                title={t('ውጤቱን ለመፍቀድ ይጫኑ', 'Click to release grade')}
                              >
                                <EyeOff className="w-3.5 h-3.5 group-hover:hidden" />
                                <Unlock className="w-3.5 h-3.5 hidden group-hover:inline text-amber-300" />
                                <span className="group-hover:hidden">{t('ታግዷል', 'Held')}</span>
                                <span className="hidden group-hover:inline">{t('ፍቀድ', 'Release')}</span>
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Column 2: Full Graduation Transcript Release */}
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center">
                            {isFullTranscriptAllowed ? (
                              <button
                                type="button"
                                onClick={() => {
                                  onSetIndividualFullTranscript(student.uid, false);
                                  showNotify?.(
                                    t(
                                      `የተማሪ ${student.name} ሙሉ የምረቃ ትራንስክሪፕት ታግዷል (በገጹ ላይ አይታይም)!`,
                                      `Full graduation transcript hidden for ${student.name}!`
                                    ),
                                    'warning'
                                  );
                                }}
                                className="bg-amber-600 hover:bg-rose-700 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-xl transition-all inline-flex items-center gap-1 shadow-2xs cursor-pointer group"
                                title={t('ሙሉ የምረቃ ትራንስክሪፕት እንዳይታይ ለማገድ ይጫኑ', 'Click to hide full graduation transcript')}
                              >
                                <GraduationCap className="w-3.5 h-3.5 text-amber-200 group-hover:hidden" />
                                <Lock className="w-3.5 h-3.5 hidden group-hover:inline" />
                                <span className="group-hover:hidden">{t('ይታያል (ተፈቅዷል)', 'Visible (Allowed)')}</span>
                                <span className="hidden group-hover:inline">{t('አስወግድ / እገድ', 'Hide / Lock')}</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  onSetIndividualFullTranscript(student.uid, true);
                                  showNotify?.(
                                    t(
                                      `ለተማሪ ${student.name} ሙሉ የምረቃ ትራንስክሪፕት በገጹ ላይ እንዲታይ ተፈቅዷል!`,
                                      `Full graduation transcript enabled for ${student.name}!`
                                    ),
                                    'success'
                                  );
                                }}
                                className="bg-slate-700 hover:bg-amber-600 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-xl transition-all inline-flex items-center gap-1 shadow-2xs cursor-pointer group"
                                title={t('ሙሉ የምረቃ ትራንስክሪፕት በተማሪው ገጽ ላይ እንዲታይ ለመፍቀድ ይጫኑ', 'Click to allow full graduation transcript')}
                              >
                                <Lock className="w-3.5 h-3.5 text-amber-400 group-hover:hidden" />
                                <GraduationCap className="w-3.5 h-3.5 hidden group-hover:inline text-amber-300" />
                                <span className="group-hover:hidden">{t('አይታይም (ታግዷል)', 'Hidden (Locked)')}</span>
                                <span className="hidden group-hover:inline">{t('እንዲታይ ፍቀድ', 'Allow View')}</span>
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Column 3: PDF Printing & Export Permission */}
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center">
                            {isPdfAllowed ? (
                              <button
                                type="button"
                                onClick={() => {
                                  onSetIndividualPdfPrint(student.uid, false);
                                  showNotify?.(
                                    t(`የተማሪ ${student.name} ፒዲኤፍ ማተም ታግዷል!`, `PDF printing blocked for ${student.name}!`),
                                    'warning'
                                  );
                                }}
                                className="bg-indigo-700 hover:bg-amber-700 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-xl transition-all inline-flex items-center gap-1 shadow-2xs cursor-pointer group"
                                title={t('የተማሪውን ፒዲኤፍ ማተም ለማገድ ይጫኑ', 'Click to block PDF printing')}
                              >
                                <Printer className="w-3.5 h-3.5 text-amber-300 group-hover:hidden" />
                                <Lock className="w-3.5 h-3.5 hidden group-hover:inline" />
                                <span className="group-hover:hidden">{t('ተፈቅዷል', 'Allowed')}</span>
                                <span className="hidden group-hover:inline">{t('እገድ', 'Block')}</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  onSetIndividualPdfPrint(student.uid, true);
                                  showNotify?.(
                                    t(`ለተማሪ ${student.name} ፒዲኤፍ ማተም ተፈቅዷል!`, `PDF printing allowed for ${student.name}!`),
                                    'success'
                                  );
                                }}
                                className="bg-slate-700 hover:bg-indigo-700 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-xl transition-all inline-flex items-center gap-1 shadow-2xs cursor-pointer group"
                                title={t('ለተማሪው ፒዲኤፍ ማተም ለመፍቀድ ይጫኑ', 'Click to allow PDF printing')}
                              >
                                <Lock className="w-3.5 h-3.5 text-amber-400 group-hover:hidden" />
                                <Printer className="w-3.5 h-3.5 hidden group-hover:inline text-amber-300" />
                                <span className="group-hover:hidden">{t('ታግዷል', 'Blocked')}</span>
                                <span className="hidden group-hover:inline">{t('ፍቀድ', 'Allow')}</span>
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
          )}
        </div>
      </div>
    </div>
  );
};
