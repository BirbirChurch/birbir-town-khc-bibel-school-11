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
    showNotify?.(`ለ${uids.length} ተማሪዎች የሴሚስተር ውጤትና ትራንስክሪፕት እይታ ተፈቅዷል!`, 'success');
  };

  const handleHoldAllFiltered = () => {
    const uids = filteredStudents.map((s) => s.uid);
    onBatchSetRelease(uids, false);
    showNotify?.(`ለ${uids.length} ተማሪዎች የሴሚስተር ውጤትና ትራንስክሪፕት እይታ ታግዷል!`, 'warning');
  };

  const handleAllowFullTranscriptFiltered = () => {
    const uids = filteredStudents.map((s) => s.uid);
    onBatchSetFullTranscript(uids, true);
    onToggleGlobalFullTranscript(true);
    showNotify?.(`ለ${uids.length} ተማሪዎች ሙሉ የምረቃ ትራንስክሪፕት በገጻቸው ላይ እንዲታይ ተፈቅዷል!`, 'success');
  };

  const handleBlockFullTranscriptFiltered = () => {
    const uids = filteredStudents.map((s) => s.uid);
    onBatchSetFullTranscript(uids, false);
    onToggleGlobalFullTranscript(false);
    showNotify?.(`ለ${uids.length} ተማሪዎች ሙሉ የምረቃ ትራንስክሪፕት እንዳይታይ ታግዷል!`, 'warning');
  };

  const handleAllowPdfAllFiltered = () => {
    const uids = filteredStudents.map((s) => s.uid);
    onBatchSetPdfPrint(uids, true);
    onToggleGlobalPdfPrint(true);
    showNotify?.(`ለ${uids.length} ተማሪዎች ፒዲኤፍ ማተም ተፈቅዷል!`, 'success');
  };

  const handleBlockPdfAllFiltered = () => {
    const uids = filteredStudents.map((s) => s.uid);
    onBatchSetPdfPrint(uids, false);
    onToggleGlobalPdfPrint(false);
    showNotify?.(`ለ${uids.length} ተማሪዎች ፒዲኤፍ ማተም ታግዷል!`, 'warning');
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-6xl w-full overflow-hidden my-auto border border-slate-300 flex flex-col max-h-[95vh]">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-900 text-white px-6 py-4 flex flex-wrap justify-between items-center gap-3 no-print border-b border-emerald-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-400/20 text-amber-300 rounded-2xl border border-amber-400/40">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-white flex items-center gap-2">
                <span>የውጤት፣ የምረቃ ትራንስክሪፕት እና የፒዲኤፍ ፈቃድ መቆጣጠሪያ ማዕከል</span>
                <span className="text-[10px] bg-amber-400/20 text-amber-300 border border-amber-400/40 font-mono px-2 py-0.5 rounded-md font-bold">
                  PERMISSIONS MANAGER
                </span>
              </h3>
              <p className="text-xs text-emerald-200">
                የሴሚስተር ውጤትን፣ ሙሉ የምረቃ ትራንስክሪፕትን እና በፒዲኤፍ ማተምን ለሁሉም ወይም በልዩነት መርጠው ይፍቀዱ/ይእገዱ
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-300 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            title="ዝጋ"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Global Action Banners (Module 1: Semester Grade, Module 2: Full Graduation Transcript, Module 3: PDF Print) */}
        <div className="bg-slate-900 text-slate-100 p-4 border-b border-slate-800 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 flex-shrink-0">
          {/* Statistics summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs w-full lg:w-auto">
            <div className="bg-slate-800/90 border border-slate-700 rounded-2xl px-3 py-2 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>ጠቅላላ፦ <strong className="text-white text-sm font-mono">{totalCount}</strong></span>
            </div>
            <div className="bg-emerald-950/90 border border-emerald-700/80 rounded-2xl px-3 py-2 flex items-center gap-2 text-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>ውጤት የታየ፦ <strong className="text-amber-300 text-sm font-mono">{gradeReleasedCount}</strong></span>
            </div>
            <div className="bg-amber-950/90 border border-amber-700/80 rounded-2xl px-3 py-2 flex items-center gap-2 text-amber-200">
              <GraduationCap className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>ሙሉ ትራንስክሪፕት፦ <strong className="text-amber-300 text-sm font-mono">{fullTranscriptAllowedCount}</strong></span>
            </div>
            <div className="bg-indigo-950/90 border border-indigo-700/80 rounded-2xl px-3 py-2 flex items-center gap-2 text-indigo-200">
              <Printer className="w-4 h-4 text-indigo-400 flex-shrink-0" />
              <span>ፒዲኤፍ፦ <strong className="text-amber-300 text-sm font-mono">{printAllowedCount}</strong></span>
            </div>
          </div>

          {/* Bulk Action Controls */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-start lg:justify-end">
            {/* Semester Grade Bulk */}
            <div className="flex items-center gap-1 bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700">
              <button
                type="button"
                onClick={handleReleaseAllFiltered}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] px-2.5 py-1.5 rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                title="የሴሚስተር ውጤት ለሁሉም እንዲታይ ፍቀድ"
              >
                <UserCheck className="w-3.5 h-3.5 text-amber-300" />
                <span>🌐 ውጤት አሳይ</span>
              </button>
              <button
                type="button"
                onClick={handleHoldAllFiltered}
                className="bg-rose-700 hover:bg-rose-800 text-white font-extrabold text-[11px] px-2.5 py-1.5 rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                title="የሴሚስተር ውጤት ለሁሉም እንዳይታይ እገድ"
              >
                <UserX className="w-3.5 h-3.5 text-white" />
                <span>🔒 ውጤት እገድ</span>
              </button>
            </div>

            {/* Full Graduation Transcript Bulk */}
            <div className="flex items-center gap-1 bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700">
              <button
                type="button"
                onClick={handleAllowFullTranscriptFiltered}
                className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-[11px] px-2.5 py-1.5 rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                title="ሙሉ የምረቃ ትራንስክሪፕት በተማሪዎች ገጽ ላይ እንዲታይ ፍቀድ"
              >
                <GraduationCap className="w-3.5 h-3.5 text-amber-200" />
                <span>🎓 ሙሉ ትራንስክሪፕት ፍቀድ</span>
              </button>
              <button
                type="button"
                onClick={handleBlockFullTranscriptFiltered}
                className="bg-slate-700 hover:bg-rose-800 text-white font-extrabold text-[11px] px-2.5 py-1.5 rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                title="ሙሉ የምረቃ ትራንስክሪፕት በተማሪዎች ገጽ እንዳይታይ እገድ"
              >
                <Lock className="w-3.5 h-3.5 text-white" />
                <span>🔒 ሙሉ እገድ</span>
              </button>
            </div>

            {/* PDF Print Bulk */}
            <div className="flex items-center gap-1 bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700">
              <button
                type="button"
                onClick={handleAllowPdfAllFiltered}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[11px] px-2.5 py-1.5 rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                title="ተማሪዎች በፒዲኤፍ እንዲያትሙ ወይም እንዲያወርዱ ፍቀድ"
              >
                <Printer className="w-3.5 h-3.5 text-amber-300" />
                <span>🖨️ ፒዲኤፍ ፍቀድ</span>
              </button>
              <button
                type="button"
                onClick={handleBlockPdfAllFiltered}
                className="bg-slate-700 hover:bg-amber-700 text-white font-extrabold text-[11px] px-2.5 py-1.5 rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                title="ተማሪዎች በፒዲኤፍ እንዳያትሙ እገድ (ማየት ብቻ)"
              >
                <Lock className="w-3.5 h-3.5 text-white" />
                <span>🚫 ፒዲኤፍ እገድ</span>
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
              placeholder="ተማሪ በስም፣ በID ቁጥር ወይም በፕሮግራም ይፈልጉ..."
              className="w-full pl-10 pr-4 py-2 text-xs font-bold border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-700 text-slate-900 shadow-2xs"
            />
          </div>

          {/* Program Filter */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs shadow-2xs w-full sm:w-auto">
            <Filter className="w-3.5 h-3.5 text-emerald-800" />
            <span className="font-bold text-slate-700">ፕሮግራም:</span>
            <select
              value={programFilter}
              onChange={(e) => setProgramFilter(e.target.value as any)}
              className="font-bold bg-transparent text-slate-900 focus:outline-none cursor-pointer"
            >
              <option value="ALL">ሁሉንም ፕሮግራሞች</option>
              <option value="Diploma">ዲፕሎማ</option>
              <option value="Degree">ድግሪ</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs shadow-2xs w-full sm:w-auto">
            <Lock className="w-3.5 h-3.5 text-amber-700" />
            <span className="font-bold text-slate-700">የፈቃድ አይነት:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="font-bold bg-transparent text-slate-900 focus:outline-none cursor-pointer"
            >
              <option value="ALL">ሁሉንም ተማሪዎች</option>
              <option value="RELEASED">ውጤት የታየላቸው (Grade Released)</option>
              <option value="HELD">ውጤት የታገዱ (Grade Held)</option>
              <option value="FULL_TRANSCRIPT_ALLOWED">ሙሉ ትራንስክሪፕት የተፈቀደላቸው (Full Transcript)</option>
              <option value="FULL_TRANSCRIPT_BLOCKED">ሙሉ ትራንስክሪፕት የታገዱ (Full Transcript Locked)</option>
              <option value="PRINT_ALLOWED">ፒዲኤፍ የተፈቀደላቸው (Print Allowed)</option>
              <option value="PRINT_BLOCKED">ፒዲኤፍ የታገዱ (Print Blocked)</option>
            </select>
          </div>
        </div>

        {/* Scrollable Student List Table */}
        <div className="p-4 overflow-y-auto flex-1">
          {filteredStudents.length === 0 ? (
            <div className="p-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">ምንም ተማሪ አልተገኘም</p>
              <p className="text-xs text-slate-500 mt-1">የመፈለጊያ ቃሉን ወይም ማጣሪያውን ቀይረው ይሞክሩ።</p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs bg-white">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-extrabold text-[11px] uppercase border-b border-slate-200">
                  <tr>
                    <th className="p-3 text-center w-10">ተ.ቁ</th>
                    <th className="p-3 w-28">መለያ ቁጥር (ID)</th>
                    <th className="p-3">የተማሪ ሙሉ ስም</th>
                    <th className="p-3 w-32">ፕሮግራም/ደረጃ</th>
                    <th className="p-3 text-center w-36">የሴሚስተር ውጤት</th>
                    <th className="p-3 text-center w-40">ሙሉ የምረቃ ትራንስክሪፕት</th>
                    <th className="p-3 text-center w-36">የፒዲኤፍ ህትመት</th>
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
                                  🎓 የተመረቀ
                                </span>
                              )}
                              {student.graduationStatus === 'CANDIDATE' && (
                                <span className="ml-1.5 text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded border border-amber-300">
                                  ⭐ ተማራቂ
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
                              {student.program}
                            </span>
                            <span className="text-[10px] text-slate-500 font-medium">
                              {student.currentStudyYear ? `${student.currentStudyYear}ኛ ዓመት` : '1ኛ ዓመት'}
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
                                  showNotify?.(`የተማሪ ${student.name} የሴሚስተር ውጤት ታግዷል!`, 'warning');
                                }}
                                className="bg-emerald-700 hover:bg-rose-700 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-xl transition-all inline-flex items-center gap-1 shadow-2xs cursor-pointer group"
                                title="ውጤቱን ለማገድ ይጫኑ"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-amber-300 group-hover:hidden" />
                                <Lock className="w-3.5 h-3.5 hidden group-hover:inline" />
                                <span className="group-hover:hidden">ተፈቅዷል</span>
                                <span className="hidden group-hover:inline">እገድ</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  onSetIndividualRelease(student.uid, true);
                                  showNotify?.(`ለተማሪ ${student.name} የሴሚስተር ውጤት ተፈቅዷል!`, 'success');
                                }}
                                className="bg-rose-600 hover:bg-emerald-700 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-xl transition-all inline-flex items-center gap-1 shadow-2xs cursor-pointer group"
                                title="ውጤቱን ለመፍቀድ ይጫኑ"
                              >
                                <EyeOff className="w-3.5 h-3.5 group-hover:hidden" />
                                <Unlock className="w-3.5 h-3.5 hidden group-hover:inline text-amber-300" />
                                <span className="group-hover:hidden">ታግዷል</span>
                                <span className="hidden group-hover:inline">ፍቀድ</span>
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
                                  showNotify?.(`የተማሪ ${student.name} ሙሉ የምረቃ ትራንስክሪፕት ታግዷል (በገጹ ላይ አይታይም)!`, 'warning');
                                }}
                                className="bg-amber-600 hover:bg-rose-700 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-xl transition-all inline-flex items-center gap-1 shadow-2xs cursor-pointer group"
                                title="ሙሉ የምረቃ ትራንስክሪፕት እንዳይታይ ለማገድ ይጫኑ"
                              >
                                <GraduationCap className="w-3.5 h-3.5 text-amber-200 group-hover:hidden" />
                                <Lock className="w-3.5 h-3.5 hidden group-hover:inline" />
                                <span className="group-hover:hidden">ይታያል (ተፈቅዷል)</span>
                                <span className="hidden group-hover:inline">አስወግድ / እገድ</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  onSetIndividualFullTranscript(student.uid, true);
                                  showNotify?.(`ለተማሪ ${student.name} ሙሉ የምረቃ ትራንስክሪፕት በገጹ ላይ እንዲታይ ተፈቅዷል!`, 'success');
                                }}
                                className="bg-slate-700 hover:bg-amber-600 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-xl transition-all inline-flex items-center gap-1 shadow-2xs cursor-pointer group"
                                title="ሙሉ የምረቃ ትራንስክሪፕት በተማሪው ገጽ ላይ እንዲታይ ለመፍቀድ ይጫኑ"
                              >
                                <Lock className="w-3.5 h-3.5 text-amber-400 group-hover:hidden" />
                                <GraduationCap className="w-3.5 h-3.5 hidden group-hover:inline text-amber-300" />
                                <span className="group-hover:hidden">አይታይም (ታግዷል)</span>
                                <span className="hidden group-hover:inline">እንዲታይ ፍቀድ</span>
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
                                  showNotify?.(`የተማሪ ${student.name} ፒዲኤፍ ማተም ታግዷል!`, 'warning');
                                }}
                                className="bg-indigo-700 hover:bg-amber-700 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-xl transition-all inline-flex items-center gap-1 shadow-2xs cursor-pointer group"
                                title="የተማሪውን ፒዲኤፍ ማተም ለማገድ ይጫኑ"
                              >
                                <Printer className="w-3.5 h-3.5 text-amber-300 group-hover:hidden" />
                                <Lock className="w-3.5 h-3.5 hidden group-hover:inline" />
                                <span className="group-hover:hidden">ተፈቅዷል</span>
                                <span className="hidden group-hover:inline">እገድ</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  onSetIndividualPdfPrint(student.uid, true);
                                  showNotify?.(`ለተማሪ ${student.name} ፒዲኤፍ ማተም ተፈቅዷል!`, 'success');
                                }}
                                className="bg-slate-700 hover:bg-indigo-700 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-xl transition-all inline-flex items-center gap-1 shadow-2xs cursor-pointer group"
                                title="ለተማሪው ፒዲኤፍ ማተም ለመፍቀድ ይጫኑ"
                              >
                                <Lock className="w-3.5 h-3.5 text-amber-400 group-hover:hidden" />
                                <Printer className="w-3.5 h-3.5 hidden group-hover:inline text-amber-300" />
                                <span className="group-hover:hidden">ታግዷል</span>
                                <span className="hidden group-hover:inline">ፍቀድ</span>
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
