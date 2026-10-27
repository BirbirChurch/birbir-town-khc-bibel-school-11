import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Download,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { Course, GradeBreakdown, Student } from '../types.ts';
import { getCourseAssessmentItems } from '../utils/gradeCalculations.ts';
import {
  parseExcelGradesFile,
  downloadCourseGradeTemplateExcel,
  ParseExcelResult,
  ParsedGradeRow
} from '../utils/excelUtils.ts';

interface ExcelUploadModalProps {
  course: Course;
  students: Student[];
  currentYear: string;
  currentSemester: string;
  onApplyGrades: (updatedScoresByUid: Record<string, Record<string, number>>) => void;
  onClose: () => void;
  showNotify: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const ExcelUploadModal: React.FC<ExcelUploadModalProps> = ({
  course,
  students,
  currentYear,
  currentSemester,
  onApplyGrades,
  onClose,
  showNotify
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseResult, setParseResult] = useState<ParseExcelResult | null>(null);
  const [editableRows, setEditableRows] = useState<ParsedGradeRow[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const criteria = getCourseAssessmentItems(course);
  const enrolled = students.filter((s) => s.program === course.program);
  const targetStudentList = enrolled.length > 0 ? enrolled : students;

  const handleFileChange = async (file: File) => {
    setSelectedFile(file);
    setIsParsing(true);
    setParseResult(null);
    setEditableRows([]);

    try {
      const result = await parseExcelGradesFile(file, course, students);
      setParseResult(result);
      setEditableRows(result.rows);

      const validCount = result.rows.filter((r) => r.isValid && r.studentUid).length;
      if (validCount > 0) {
        showNotify(
          `ኤክሴል ተፈትሾ የ${validCount} ተማሪዎች ውጤት በቀጥታ ተገኝቷል!`,
          'success'
        );
      } else if (result.rows.length > 0) {
        showNotify(
          `ከኤክሴል ${result.rows.length} ረድፍ ውጤቶች ተነበዋል፤ «በቅደም ተከተል አስማማ» በማለት ተማሪዎችን ያገናኙ።`,
          'info'
        );
      } else {
        showNotify(result.errors[0] || 'በፋይሉ ውስጥ ምንም ውጤት አልተገኘም!', 'error');
      }
    } catch (err: any) {
      showNotify(err?.message || 'ፋይሉን ማንበብ አልተቻለም!', 'error');
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
            notes: 'ተማሪ አልተመረጠም'
          };
        }
        return {
          ...r,
          studentUid: student.uid,
          studentId: student.id,
          studentName: student.name,
          isValid: true,
          notes: 'በተጠቃሚ ተዛምዷል ✓'
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
          notes: `በቅደም ተከተል ተራ ቁጥር #${idx + 1} ተዛምዷል ✓`
        };
      })
    );
    showNotify('ሁሉም የኤክሴል ውጤቶች ከተማሪዎች ዝርዝር ጋር በቅደም ተከተል ተዛምደዋል!', 'success');
  };

  // Edit an individual score in a row
  const handleScoreEdit = (rowIndex: number, critId: string, val: string, maxVal: number) => {
    const parsed = val.trim() === '' ? 0 : Math.max(0, Math.min(maxVal, parseFloat(val) || 0));
    setEditableRows((prev) =>
      prev.map((r, idx) => {
        if (idx !== rowIndex) return r;
        const nextScores = { ...r.scores, [critId]: parsed };
        const nextTotal = (Object.values(nextScores) as number[]).reduce((sum: number, n: number) => sum + (Number(n) || 0), 0);
        return {
          ...r,
          scores: nextScores,
          totalScore: Math.round(nextTotal * 10) / 10
        };
      })
    );
  };

  const validRowsCount = editableRows.filter((r) => r.isValid && r.studentUid).length;

  const handleConfirmImport = () => {
    const validRows = editableRows.filter((r) => r.isValid && r.studentUid);
    if (validRows.length === 0) {
      showNotify('እባክዎ መጀመሪያ ቢያንስ አንድ ተማሪ ከውጤቱ ጋር ያዛምዱ!', 'warning');
      return;
    }

    const scoresByUid: Record<string, Record<string, number>> = {};
    validRows.forEach((row) => {
      scoresByUid[row.studentUid] = row.scores;
    });

    onApplyGrades(scoresByUid);
    showNotify(
      `የ${validRows.length} ተማሪዎች ውጤት ከኤክሴል በስኬት ተጭኗል! ለውጦቹን ለማጽደቅ «ለውጦችን መዝግብ» የሚለውን ይጫኑ።`,
      'success'
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto no-print">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full flex flex-col overflow-hidden border border-slate-200 my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-900 text-white px-6 py-4 flex justify-between items-center border-b border-emerald-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-700/60 rounded-xl shadow-inner text-amber-300">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                <span>የተማሪዎች ውጤት ከኤክሴል (Excel / CSV) መጫኛ</span>
              </h3>
              <p className="text-xs text-emerald-200">
                ኮርስ: <span className="font-bold text-amber-300">{course.name}</span> ({course.program}) | መምህር: {course.teacher} | 🇪🇹 {currentYear} ዓ.ም ({currentSemester}ኛ ሴሚስተር - ኢ.ዘ.አ)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="ዝጋ"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Quick Guide & Download Template banner */}
          <div className="bg-gradient-to-r from-amber-50 to-emerald-50/40 p-4 rounded-2xl border border-amber-300/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                <span>ትክክለኛውን የውጤት ፎርማት ለመጠቀም፦</span>
              </h4>
              <p className="text-[11px] text-slate-600">
                የተማሪዎችን ስም ዝርዝርና የመመዘኛ አምዶችን ያካተተ የተዘጋጀ አብነት አውርደው ውጤቱን ሞልተው ይጫኑ።
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                downloadCourseGradeTemplateExcel(course, students);
                showNotify('የኤክሴል አብነት ሰነድ ወርዷል!', 'success');
              }}
              className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-emerald-900 border border-emerald-400 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer flex-shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-emerald-700" />
              <span>የኤክሴል አብነት አውርድ (.xlsx)</span>
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
            className={`border-2 border-dashed rounded-3xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
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
                {selectedFile ? selectedFile.name : 'የኤክሴል ወይም የCSV ፋይል ይምረጡ ወይም እዚህ ይጎትቱ'}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                የሚደገፉ ቅርጸቶች: .xlsx, .xls, .csv (የማይክሮሶፍት ኤክሴል ፋይሎች)
              </p>
            </div>

            {selectedFile && (
              <span className="text-[10px] bg-emerald-100 text-emerald-900 font-bold px-2.5 py-0.5 rounded-full border border-emerald-300">
                መጠን: {(selectedFile.size / 1024).toFixed(1)} KB ✓
              </span>
            )}
          </div>

          {/* Loading status */}
          {isParsing && (
            <div className="p-4 bg-slate-50 rounded-2xl text-center text-xs text-slate-600 animate-pulse">
              የኤክሴል ሰነዱ እየተነበበና እየተፈተሸ ነው... እባክዎ ይጠብቁ
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
                      የተዘጋጁ ተማሪዎች: <strong className="text-emerald-800">{validRowsCount}</strong> / {targetStudentList.length}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      በኤክሴል ሰነዱ ውስጥ የተገኙ ጠቅላላ ረድፎች፦ {editableRows.length}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleMapByListOrder}
                    className="bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-300 text-xs px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1"
                    title="በኤክሴል የተገኙትን ውጤቶች ከኮርሱ ተማሪዎች ዝርዝር ጋር በተራ ቁጥር 1-ለ-1 ያዛምዳል"
                  >
                    <span>🔗 በቅደም ተከተል አስማማ (Map 1-to-1)</span>
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
                      ? 'ሁሉም ተዛምደዋል ✓'
                      : `${validRowsCount} ተማሪዎች ተዛምደዋል`}
                  </span>
                </div>
              </div>

              {parseResult && parseResult.warnings.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 space-y-1">
                  <p className="font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                    <span>የማንበብ ማስታወሻ፦</span>
                  </p>
                  <ul className="list-disc list-inside space-y-0.5">
                    {parseResult.warnings.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Interactive Preview Rows Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-72 overflow-y-auto shadow-inner">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-100 sticky top-0 text-[10px] font-bold uppercase text-slate-600 border-b border-slate-200 z-10">
                    <tr>
                      <th className="p-2.5 text-center w-8">ተ.ቁ</th>
                      <th className="p-2.5 min-w-[130px]">ከኤክሴል የተነበበ</th>
                      <th className="p-2.5 min-w-[200px] bg-indigo-50/70 text-indigo-950">
                        በሲስተሙ የተዛመደ ተማሪ (መምረጥ ይችላሉ)
                      </th>
                      {criteria.map((c) => (
                        <th key={c.id} className="p-2 text-center min-w-[70px]">
                          <span className="block truncate max-w-[80px]">{c.label}</span>
                          <span className="text-[9px] font-mono text-slate-500 font-bold">({c.max}%)</span>
                        </th>
                      ))}
                      <th className="p-2.5 text-center bg-emerald-50 text-emerald-900 font-black min-w-[60px]">
                        ድምር
                      </th>
                      <th className="p-2.5 text-center min-w-[80px]">ሁኔታ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {editableRows.map((row, idx) => {
                      const isRowValid = row.isValid && row.studentUid;

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
                            <span className="font-mono text-[11px] text-slate-500 block truncate">
                              {row.studentId || '—'}
                            </span>
                            <strong className="text-slate-900 block truncate text-xs">
                              {row.studentName || 'ያልታወቀ'}
                            </strong>
                          </td>

                          {/* Target student dropdown selector */}
                          <td className="p-1.5 bg-indigo-50/30">
                            <select
                              value={row.studentUid || ''}
                              onChange={(e) => handleAssignStudent(idx, e.target.value)}
                              className="w-full text-xs font-bold p-1.5 rounded-xl border border-indigo-200 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-600 cursor-pointer shadow-2xs"
                            >
                              <option value="">-- ተማሪ ይምረጡ --</option>
                              {targetStudentList.map((s) => (
                                <option key={s.uid} value={s.uid}>
                                  [{s.id}] {s.name} ({s.gender || '—'})
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Editable scores */}
                          {criteria.map((c) => {
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

                          {/* Total score badge */}
                          <td className="p-2 text-center font-mono font-black text-emerald-900 bg-emerald-50/50">
                            {row.totalScore ?? 0}
                          </td>

                          {/* Match status */}
                          <td className="p-2 text-center">
                            {isRowValid ? (
                              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                                ተዛምዷል ✓
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-300">
                                {row.notes || 'ያልተዛመደ'}
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
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-[11px] text-slate-500">
            ማሳሰቢያ፦ ኤክሴሉ ውስጥ ያሉ ስሞች ወይም ኮዶች ባይመሳሰሉ እንኳ «በቅደም ተከተል አስማማ» ወይም ተማሪውን በመምረጥ መጫን ይችላሉ።
          </p>

          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              ተመለስ
            </button>

            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={validRowsCount === 0}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-all ${
                validRowsCount === 0
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer shadow-md'
              }`}
            >
              <span>ውጤቶችን መዝግብና ተግብር ({validRowsCount} ተማሪዎች)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
