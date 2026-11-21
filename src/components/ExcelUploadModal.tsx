import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Download,
  AlertCircle,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { Course, Student } from '../types.ts';
import { calculateGradeDetails, getCourseAssessmentItems } from '../utils/gradeCalculations.ts';
import {
  parseExcelGradesFile,
  downloadCourseGradeTemplateExcel,
  ParseExcelResult,
  ParsedGradeRow,
  ExcelApplyMeta
} from '../utils/excelUtils.ts';
import { useLanguage, formatCourseTitle, formatProgram, formatTeacherDisplay, formatCalendarYear, formatCriterionLabel, formatGender } from '../utils/i18n.tsx';

interface ExcelUploadModalProps {
  course: Course;
  students: Student[];
  currentYear: string;
  currentSemester: string;
  onApplyGrades: (updatedScoresByUid: Record<string, Record<string, number>>, meta?: ExcelApplyMeta) => void;
  onClose: () => void;
  showNotify: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  canSyncCourseCriteria?: boolean;
}

export const ExcelUploadModal: React.FC<ExcelUploadModalProps> = ({
  course,
  students,
  currentYear,
  currentSemester,
  onApplyGrades,
  onClose,
  showNotify,
  canSyncCourseCriteria = false
}) => {
  const { lang, t } = useLanguage();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseResult, setParseResult] = useState<ParseExcelResult | null>(null);
  const [editableRows, setEditableRows] = useState<ParsedGradeRow[]>([]);
  const [syncCourseCriteria, setSyncCourseCriteria] = useState(true);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const existingCriteria = getCourseAssessmentItems(course);
  const enrolled = students.filter((s) => s.program === course.program);
  const targetStudentList = enrolled.length > 0 ? enrolled : students;

  const activePreviewCriteria =
    parseResult && parseResult.importMode === 'custom_criteria' && parseResult.detectedCriteria.length > 0
      ? parseResult.detectedCriteria
      : existingCriteria;

  const isTotalOnlyMode = parseResult?.importMode === 'total_only';

  const handleFileChange = async (file: File) => {
    setSelectedFile(file);
    setIsParsing(true);
    setParseResult(null);
    setEditableRows([]);

    try {
      const result = await parseExcelGradesFile(file, course, students);
      setParseResult(result);
      setEditableRows(result.rows);
      setSyncCourseCriteria(result.hasCustomSchemeDiff && canSyncCourseCriteria);

      const validCount = result.rows.filter((r) => r.isValid && r.studentUid).length;
      if (validCount > 0) {
        showNotify(
          t(
            `ኤክሴል ተፈትሾ የ${validCount} ተማሪዎች ውጤት በቀጥታ ተገኝቷል!`,
            `Excel parsed: ${validCount} student grade rows matched automatically!`
          ),
          'success'
        );
      } else if (result.rows.length > 0) {
        showNotify(
          t(
            `ከኤክሴል ${result.rows.length} ረድፍ ውጤቶች ተነበዋል፤ «በቅደም ተከተል አስማማ» በማለት ተማሪዎችን ያገናኙ።`,
            `${result.rows.length} rows read from Excel; click "Map 1-to-1" or choose students manually.`
          ),
          'info'
        );
      } else {
        showNotify(result.errors[0] || t('በፋይሉ ውስጥ ምንም ውጤት አልተገኘም!', 'No grades found in this file!'), 'error');
      }
    } catch (err: any) {
      showNotify(err?.message || t('ፋይሉን ማንበብ አልተቻለም!', 'Unable to read the file!'), 'error');
    } finally {
      setIsParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  // Assign or reassign an Excel row to a specific student
  const handleAssignStudent = (rowIndex: number, studentUid: string) => {
    const student = students.find((s) => s.uid === studentUid);
    setEditableRows((prev) =>
      prev.map((r, idx) => {
        if (idx !== rowIndex) return r;
        if (!student) {
          return {
            ...r,
            studentUid: '',
            isValid: false,
            notes: t('ተማሪ አልተመረጠም', 'No student selected')
          };
        }
        return {
          ...r,
          studentUid: student.uid,
          studentId: student.id,
          studentName: student.name,
          isValid: true,
          notes: t('በተጠቃሚ ተዛምዷል ✓', 'Manually matched ✓')
        };
      })
    );
  };

  // Map all rows 1-to-1 in sequence to target students
  const handleMapByListOrder = () => {
    setEditableRows((prev) =>
      prev.map((r, idx) => {
        const student = targetStudentList[idx];
        if (!student) return r;
        return {
          ...r,
          studentUid: student.uid,
          studentId: student.id,
          studentName: student.name,
          isValid: true,
          notes: t(`በቅደም ተከተል ተራ ቁጥር #${idx + 1} ተዛምዷል ✓`, `Mapped 1-to-1 at row #${idx + 1} ✓`)
        };
      })
    );
    showNotify(
      t('ሁሉም የኤክሴል ውጤቶች ከተማሪዎች ዝርዝር ጋር በቅደም ተከተል ተዛምደዋል!', 'All Excel rows mapped sequentially to the student roster!'),
      'success'
    );
  };

  // Edit an individual criterion score in a row
  const handleScoreEdit = (rowIndex: number, critId: string, val: string, maxVal: number) => {
    const parsed = val.trim() === '' ? 0 : Math.max(0, Math.min(maxVal, parseFloat(val) || 0));
    setEditableRows((prev) =>
      prev.map((r, idx) => {
        if (idx !== rowIndex) return r;
        const nextScores = { ...r.scores, [critId]: parsed };
        const nextTotal = (Object.values(nextScores) as number[]).reduce((sum: number, n: number) => sum + (Number(n) || 0), 0);
        const updatedRow: ParsedGradeRow = {
          ...r,
          scores: nextScores,
          totalScore: Math.round(nextTotal * 10) / 10
        };
        delete updatedRow.customTotal;
        return updatedRow;
      })
    );
  };

  // Edit total score directly (for Total-Only Excel sheets)
  const handleTotalScoreEdit = (rowIndex: number, val: string) => {
    const parsed = val.trim() === '' ? 0 : Math.max(0, Math.min(100, parseFloat(val) || 0));
    const rounded = Math.round(parsed * 10) / 10;
    setEditableRows((prev) =>
      prev.map((r, idx) => {
        if (idx !== rowIndex) return r;
        return {
          ...r,
          totalScore: rounded,
          customTotal: rounded
        };
      })
    );
  };

  const validRowsCount = editableRows.filter((r) => r.isValid && r.studentUid).length;

  const handleConfirmImport = () => {
    const validRows = editableRows.filter((r) => r.isValid && r.studentUid);
    if (validRows.length === 0) {
      showNotify(t('እባክዎ መጀመሪያ ቢያንስ አንድ ተማሪ ከውጤቱ ጋር ያዛምዱ!', 'Please match at least one student row first!'), 'warning');
      return;
    }

    const shouldApplyCustomCriteria = Boolean(syncCourseCriteria && parseResult?.hasCustomSchemeDiff && canSyncCourseCriteria);
    const scoresByUid: Record<string, Record<string, number>> = {};
    const customTotalsByUid: Record<string, number> = {};
    const customLettersByUid: Record<string, string> = {};

    validRows.forEach((row) => {
      scoresByUid[row.studentUid] = row.scores;

      // Preserve exact teacher mark whenever sheet is total_only, has explicit customTotal,
      // or uses custom Excel criteria that are not synced into the course schema
      if (
        row.customTotal !== undefined ||
        isTotalOnlyMode ||
        (parseResult?.hasCustomSchemeDiff && !shouldApplyCustomCriteria)
      ) {
        if (typeof row.totalScore === 'number') {
          customTotalsByUid[row.studentUid] = row.totalScore;
        }
      }

      if (row.customLetter && (row.totalScore ?? 0) === 0) {
        customLettersByUid[row.studentUid] = row.customLetter;
      }
    });

    const meta: ExcelApplyMeta = {
      ...(Object.keys(customTotalsByUid).length > 0 ? { customTotalsByUid } : {}),
      ...(Object.keys(customLettersByUid).length > 0 ? { customLettersByUid } : {}),
      ...(parseResult?.detectedCriteria
        ? {
            detectedCriteria: parseResult.detectedCriteria.map(({ id, label, max }) => ({ id, label, max }))
          }
        : {}),
      applyDetectedCriteriaToCourse: shouldApplyCustomCriteria
    };

    onApplyGrades(scoresByUid, meta);
    showNotify(
      t(
        `የ${validRows.length} ተማሪዎች ውጤት ከኤክሴል በስኬት ተጭኗል!`,
        `Imported grades for ${validRows.length} students from Excel!`
      ),
      'success'
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs z-50 flex items-center justify-center p-2.5 sm:p-5 overflow-y-auto no-print">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full flex flex-col overflow-hidden border border-slate-200 my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-900 text-white px-5 sm:px-6 py-4 flex justify-between items-center border-b border-emerald-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-emerald-700/60 rounded-xl shadow-inner text-amber-300 shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-base text-white truncate">
                {t('የተማሪዎች ውጤት ከኤክሴል (Excel / CSV) መጫኛ', 'Import Student Grades from Excel / CSV')}
              </h3>
              <p className="text-[11px] sm:text-xs text-emerald-200 truncate">
                {t('ኮርስ:', 'Course:')} <span className="font-bold text-amber-300">{formatCourseTitle(course.name, lang)}</span> ({formatProgram(course.program, lang)}) | {t('መምህር:', 'Instructor:')} {formatTeacherDisplay(course.teacher, lang)} | 🇪🇹 {formatCalendarYear(currentYear, lang)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
            title={t('ዝጋ', 'Close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 max-h-[76vh] overflow-y-auto">
          {/* Quick Guide & Download Auto-Calculating Template banner */}
          <div className="bg-gradient-to-r from-amber-50 to-emerald-50/40 p-3.5 sm:p-4 rounded-2xl border border-amber-300/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>{t('ራሱ የሚደምር አብነት ወይም የራስዎን ኤክሴል ይጠቀሙ፦', 'Use Auto-Calculating Template or Your Own Excel Sheet:')}</span>
              </h4>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                {t(
                  'የሲስተሙን አብነት ሲያወርዱ ድምር፣ ፊደል፣ ነጥብና አማካይ ራሱ የሚሰራ (Auto-Formula) ነው። እንዲሁም መምህራን ራሳቸው የሰሩትን ማንኛውንም የኤክሴል ፋይል በሰጡት ማርክ መሰረት ቀጥታ ይቀበላል።',
                  'Downloaded templates include live Auto-Formulas for Total, Letter Grade, Points, and Average. Any custom instructor Excel sheet is also accepted directly based on its marks.'
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                downloadCourseGradeTemplateExcel(course, students);
                showNotify(t('ራሱ የሚደምር የኤክሴል አብነት ሰነድ ወርዷል!', 'Auto-calculating Excel template downloaded!'), 'success');
              }}
              className="min-h-[40px] inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-emerald-900 border border-emerald-400 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer flex-shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-emerald-700" />
              <span>{t('ራሱ የሚሰራ አብነት አውርድ (.xlsx)', 'Download Template (.xlsx)')}</span>
            </button>
          </div>

          {/* Drag & Drop File Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-5 sm:p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
              dragActive
                ? 'border-emerald-600 bg-emerald-50/60 scale-[0.99]'
                : selectedFile
                ? 'border-emerald-500 bg-emerald-50/20'
                : 'border-slate-300 hover:border-emerald-500 hover:bg-slate-50/80'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileChange(e.target.files[0]);
                }
              }}
              className="hidden"
            />

            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shadow-xs">
              <Upload className="w-6 h-6" />
            </div>

            <div>
              <p className="text-xs sm:text-sm font-bold text-slate-800">
                {selectedFile ? selectedFile.name : t('የኤክሴል ወይም የCSV ፋይል ይምረጡ ወይም እዚህ ይጎትቱ', 'Choose an Excel or CSV file, or drag & drop here')}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {t('የሚደገፉ ቅርጸቶች: .xlsx, .xls, .csv (በመምህሩ የተዘጋጀ ማንኛውም ኤክሴል)', 'Supported formats: .xlsx, .xls, .csv (any instructor-prepared spreadsheet)')}
              </p>
            </div>

            {selectedFile && (
              <span className="text-[10px] bg-emerald-100 text-emerald-900 font-bold px-2.5 py-0.5 rounded-full border border-emerald-300">
                {t('መጠን:', 'Size:')} {(selectedFile.size / 1024).toFixed(1)} KB ✓
              </span>
            )}
          </div>

          {/* Loading status */}
          {isParsing && (
            <div className="p-4 bg-slate-50 rounded-2xl text-center text-xs text-slate-600 animate-pulse">
              {t('የኤክሴል ሰነዱ እየተነበበና የመምህሩ ማርክ እየተተነተነ ነው... እባክዎ ይጠብቁ', 'Reading Excel workbook and analyzing marks... please wait')}
            </div>
          )}

          {/* Custom Excel Scheme Alignment Banner */}
          {parseResult && parseResult.hasCustomSchemeDiff && parseResult.detectedCriteria.length > 0 && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-3.5 text-xs text-indigo-950 space-y-2">
              <div className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-indigo-700 shrink-0 mt-0.5" />
                <div className="space-y-1 flex-1">
                  <p className="font-black text-indigo-950">
                    {t('የመምህሩ ራሱን የቻለ የኤክሴል መመዘኛዎች ተገኝተዋል (Direct Teacher Mark Acceptance)', 'Custom Instructor Excel Criteria Detected')}
                  </p>
                  <p className="text-[11px] text-indigo-800">
                    {t('በኤክሴሉ የተገኙ አምዶች፦', 'Detected Excel Columns:')}{' '}
                    <strong>
                      {parseResult.detectedCriteria.map((d) => `${formatCriterionLabel(d.label, lang)} (${d.max}%)`).join(' · ')}
                    </strong>
                  </p>
                  {canSyncCourseCriteria && (
                    <label className="inline-flex items-center gap-2 pt-1 cursor-pointer select-none font-bold text-indigo-950">
                      <input
                        type="checkbox"
                        checked={syncCourseCriteria}
                        onChange={(e) => setSyncCourseCriteria(e.target.checked)}
                        className="w-4 h-4 rounded border-indigo-400 text-emerald-700 focus:ring-emerald-600"
                      />
                      <span>{t('የኮርሱን የውጤት መመዘኛ አምዶች በመምህሩ ኤክሴል መሰረት አስማማ', 'Sync course grading criteria with detected Excel columns')}</span>
                    </label>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Parse Result Summary & Interactive Preview Table */}
          {editableRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`p-2 rounded-xl shadow-xs ${
                      validRowsCount > 0
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {validRowsCount > 0 ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <AlertCircle className="w-4 h-4" />
                    )}
                  </span>
                  <div>
                    <span className="font-bold text-slate-900 block">
                      {t('የተዘጋጁ ተማሪዎች:', 'Matched Students:')} <strong className="text-emerald-800">{validRowsCount}</strong> / {targetStudentList.length}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {t(`በኤክሴል ሰነዱ ውስጥ የተገኙ ጠቅላላ ረድፎች፦ ${editableRows.length}`, `Total rows detected in Excel: ${editableRows.length}`)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleMapByListOrder}
                    className="min-h-[36px] bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-300 text-xs px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1"
                    title={t('በኤክሴል የተገኙትን ውጤቶች ከኮርሱ ተማሪዎች ዝርዝር ጋር በተራ ቁጥር 1-ለ-1 ያዛምዳል', 'Match Excel rows sequentially 1-to-1 with course roster')}
                  >
                    <span>{t('🔗 በቅደም ተከተል አስማማ (Map 1-to-1)', '🔗 Map 1-to-1 by Order')}</span>
                  </button>

                  <span
                    className={`text-[11px] font-bold px-3 py-1 rounded-xl border ${
                      validRowsCount === targetStudentList.length
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                        : validRowsCount > 0
                        ? 'bg-amber-50 text-amber-900 border-amber-300'
                        : 'bg-rose-50 text-rose-900 border-rose-300'
                    }`}
                  >
                    {validRowsCount === targetStudentList.length
                      ? t('ሁሉም ተዛምደዋል ✓', 'All Matched ✓')
                      : t(`${validRowsCount} ተማሪዎች ተዛምደዋል`, `${validRowsCount} Students Matched`)}
                  </span>
                </div>
              </div>

              {parseResult && parseResult.warnings.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 space-y-1">
                  <p className="font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                    <span>{t('የማንበብ ማስታወሻ፦', 'Import Notes:')}</span>
                  </p>
                  <ul className="list-disc list-inside space-y-0.5">
                    {parseResult.warnings.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Interactive Preview Rows Table */}
              <div className="border border-slate-200 rounded-2xl overflow-x-auto max-h-72 overflow-y-auto shadow-inner">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-100 sticky top-0 text-[10px] font-bold uppercase text-slate-600 border-b border-slate-200 z-10">
                    <tr>
                      <th className="p-2.5 text-center w-8">{t('ተ.ቁ', 'No.')}</th>
                      <th className="p-2.5 min-w-[125px]">{t('ከኤክሴል የተነበበ', 'From Excel')}</th>
                      <th className="p-2.5 min-w-[185px] bg-indigo-50/70 text-indigo-950">
                        {t('በሲስተሙ የተዛመደ ተማሪ', 'Matched System Student')}
                      </th>
                      {!isTotalOnlyMode &&
                        activePreviewCriteria.map((c) => (
                          <th key={c.id} className="p-2 text-center min-w-[72px]">
                            <span className="block truncate max-w-[90px]">{formatCriterionLabel(c.label, lang)}</span>
                            <span className="text-[9px] font-mono text-slate-500 font-bold">({c.max}%)</span>
                          </th>
                        ))}
                      <th className="p-2.5 text-center bg-emerald-50 text-emerald-900 font-black min-w-[74px]">
                        {t('ድምር (100%)', 'Total (100%)')}
                      </th>
                      <th className="p-2 text-center bg-amber-50/70 text-amber-950 font-black min-w-[54px]">
                        {t('ፊደል', 'Grade')}
                      </th>
                      <th className="p-2 text-center bg-amber-50/70 text-amber-950 font-black min-w-[54px]">
                        {t('ነጥብ', 'Pts')}
                      </th>
                      <th className="p-2.5 text-center min-w-[78px]">{t('ሁኔታ', 'Status')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {editableRows.map((row, idx) => {
                      const isRowValid = row.isValid && row.studentUid;
                      const totVal = row.totalScore ?? row.customTotal ?? 0;
                      const detail = totVal > 0 ? calculateGradeDetails(totVal) : null;

                      return (
                        <tr
                          key={idx}
                          className={
                            isRowValid
                              ? 'hover:bg-slate-50 transition-colors'
                              : 'bg-rose-50/40 text-rose-900'
                          }
                        >
                          <td className="p-2.5 text-center font-mono text-slate-400">
                            {idx + 1}
                          </td>

                          {/* Raw Excel label */}
                          <td className="p-2.5">
                            <span className="font-mono text-[11px] text-slate-500 block truncate max-w-[125px]">
                              {row.studentId || '—'}
                            </span>
                            <strong className="text-slate-900 block truncate text-xs max-w-[140px]">
                              {row.studentName || t('ያልታወቀ', 'Unknown')}
                            </strong>
                          </td>

                          {/* Target student dropdown selector */}
                          <td className="p-1.5 bg-indigo-50/30">
                            <select
                              value={row.studentUid || ''}
                              onChange={(e) => handleAssignStudent(idx, e.target.value)}
                              className="w-full min-h-[36px] text-xs font-bold p-1.5 rounded-xl border border-indigo-200 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-600 cursor-pointer shadow-2xs"
                            >
                              <option value="">{t('-- ተማሪ ይምረጡ --', '-- Select Student --')}</option>
                              {targetStudentList.map((s) => (
                                <option key={s.uid} value={s.uid}>
                                  [{s.id}] {s.name} ({formatGender(s.gender, lang) || '—'})
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Editable criterion scores (if not total_only) */}
                          {!isTotalOnlyMode &&
                            activePreviewCriteria.map((c) => {
                              const val = row.scores[c.id] ?? 0;
                              return (
                                <td key={c.id} className="p-1.5 text-center">
                                  <input
                                    type="number"
                                    min="0"
                                    max={c.max}
                                    step="0.5"
                                    value={val === 0 ? '' : val}
                                    placeholder="0"
                                    onChange={(e) => handleScoreEdit(idx, c.id, e.target.value, c.max)}
                                    className="w-14 text-center font-mono text-xs font-bold p-1 border rounded-lg border-slate-300 focus:bg-white focus:ring-1 focus:ring-emerald-700 shadow-2xs"
                                  />
                                </td>
                              );
                            })}

                          {/* Total score (editable directly in Total-Only mode!) */}
                          <td className="p-2 text-center font-mono font-black text-emerald-900 bg-emerald-50/50">
                            {isTotalOnlyMode ? (
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.5"
                                value={totVal === 0 ? '' : totVal}
                                placeholder="0"
                                onChange={(e) => handleTotalScoreEdit(idx, e.target.value)}
                                className="w-16 text-center font-mono text-xs font-black p-1 border rounded-lg border-emerald-400 bg-white text-emerald-950 focus:ring-1 focus:ring-emerald-700 shadow-2xs"
                              />
                            ) : (
                              totVal
                            )}
                          </td>

                          {/* Live Letter Grade */}
                          <td className="p-2 text-center font-black text-amber-950 bg-amber-50/40">
                            {detail ? detail.letter : row.customLetter || '—'}
                          </td>

                          {/* Live Points */}
                          <td className="p-2 text-center font-mono font-bold text-slate-700 bg-amber-50/40">
                            {detail ? detail.points.toFixed(2) : '—'}
                          </td>

                          {/* Match status */}
                          <td className="p-2 text-center">
                            {isRowValid ? (
                              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300 whitespace-nowrap">
                                {t('ተዛምዷል ✓', 'Matched ✓')}
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-300">
                                {row.notes || t('ያልተዛመደ', 'Unmatched')}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-5 sm:px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-[11px] text-slate-500">
            {t(
              'ማሳሰቢያ፦ ኤክሴሉ ውስጥ ያሉ ስሞች ወይም መመዘኛዎች ቢለያዩ እንኳ ሲስተሙ በመምህሩ ማርክ መሰረት ቀጥታ ተቀብሎ ፊደልና ነጥብ ራሱ ያሰላል።',
              'Note: Even if column names or assessment schemes differ, the system accepts the instructor marks directly and computes letter grades and GPAs automatically.'
            )}
          </p>

          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[40px] px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              {t('ተመለስ', 'Cancel')}
            </button>

            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={validRowsCount === 0}
              className={`min-h-[40px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-all ${
                validRowsCount === 0
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer shadow-md'
              }`}
            >
              <span>{t(`ውጤቶችን መዝግብና ተግብር (${validRowsCount} ተማሪዎች)`, `Import & Apply Grades (${validRowsCount} Students)`)}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
