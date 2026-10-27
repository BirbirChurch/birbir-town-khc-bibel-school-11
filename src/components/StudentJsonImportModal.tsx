import React, { useState } from 'react';
import {
  Upload,
  X,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Users,
  Download,
  Copy,
  Check,
  Code
} from 'lucide-react';
import { Student, ProgramType } from '../types.ts';
import { sortStudentsByAmharicName } from '../utils/amharicSort.ts';

interface StudentJsonImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingStudents: Student[];
  currentYear: string;
  onUpdateStudents?: (updated: Student[]) => void;
  showNotify: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

interface ParsedStudentResult {
  raw: any;
  student: Student | null;
  status: 'valid' | 'duplicate' | 'invalid';
  errorMessage?: string;
}

const SAMPLE_JSON_CONTENT = [
  {
    "name": "አበበ በቀለ ገብሬ",
    "uid": "dip_201935",
    "program": "Diploma",
    "id": "201935",
    "gender": "ወንድ"
  },
  {
    "name": "ማርታ ተሰማ ወልዴ",
    "uid": "deg_201936",
    "program": "Degree",
    "id": "201936",
    "gender": "ሴት"
  }
];

export const StudentJsonImportModal: React.FC<StudentJsonImportModalProps> = ({
  isOpen,
  onClose,
  existingStudents,
  currentYear,
  onUpdateStudents,
  showNotify
}) => {
  const [jsonInput, setJsonInput] = useState('');
  const [parsedResults, setParsedResults] = useState<ParsedStudentResult[]>([]);
  const [isCopied, setIsCopied] = useState(false);
  const [activeInputTab, setActiveInputTab] = useState<'upload' | 'paste'>('upload');

  if (!isOpen) return null;

  // Set of UIDs in existing student state (case-insensitive)
  const existingUidSet = new Set(
    existingStudents.map((s) => s.uid.trim().toLowerCase())
  );

  // Download Sample JSON file
  const handleDownloadSample = () => {
    const dataStr = JSON.stringify(SAMPLE_JSON_CONTENT, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_students.json';
    a.click();
    URL.revokeObjectURL(url);
    showNotify('የናሙና JSON ፋይል በስኬት ወርዷል!', 'success');
  };

  // Copy Sample JSON to Clipboard
  const handleCopySample = () => {
    navigator.clipboard.writeText(JSON.stringify(SAMPLE_JSON_CONTENT, null, 2));
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
    showNotify('የናሙና JSON ኮድ ተቅድቷል!', 'info');
  };

  // Parse and Validate JSON input (string or file content)
  const validateJsonString = (content: string) => {
    setJsonInput(content);

    if (!content.trim()) {
      setParsedResults([]);
      return;
    }

    try {
      const parsed = JSON.parse(content);
      const items = Array.isArray(parsed) ? parsed : [parsed];

      const internalUidSet = new Set<string>();
      const results: ParsedStudentResult[] = [];

      items.forEach((item: any, idx: number) => {
        if (!item || typeof item !== 'object') {
          results.push({
            raw: item,
            student: null,
            status: 'invalid',
            errorMessage: `ተ.ቁ ${idx + 1}፦ የትክክለኛ JSON ኦብጀክት መረጃ አይደለም`
          });
          return;
        }

        // Extract required fields (Name, UID, Program)
        const name = (item.Name || item.name || item.fullName || '').toString().trim();
        const uid = (item.UID || item.uid || item.studentUid || '').toString().trim();
        const rawProgram = (item.Program || item.program || '').toString().trim();

        // 1. Missing required field validation
        if (!name) {
          results.push({
            raw: item,
            student: null,
            status: 'invalid',
            errorMessage: `ተ.ቁ ${idx + 1}፦ የተማሪ ስም (Name) ይጎድላል`
          });
          return;
        }

        if (!uid) {
          results.push({
            raw: item,
            student: null,
            status: 'invalid',
            errorMessage: `ተ.ቁ ${idx + 1}፦ የተማሪ መለያ UID ይጎድላል`
          });
          return;
        }

        if (!rawProgram) {
          results.push({
            raw: item,
            student: null,
            status: 'invalid',
            errorMessage: `ተ.ቁ ${idx + 1}፦ ፕሮግራም (Diploma/Degree) አልተገለጸም`
          });
          return;
        }

        // Program normalization
        let program: ProgramType = 'Diploma';
        const progLower = rawProgram.toLowerCase();
        if (progLower.includes('degree') || progLower.includes('ድግሪ')) {
          program = 'Degree';
        } else if (progLower.includes('diploma') || progLower.includes('ዲፕሎማ')) {
          program = 'Diploma';
        }

        const cleanUidLower = uid.toLowerCase();

        // 2. Duplicate UID validation against existing system state
        if (existingUidSet.has(cleanUidLower)) {
          results.push({
            raw: item,
            student: null,
            status: 'duplicate',
            errorMessage: `UID [${uid}] በሲስተሙ ውስጥ አስቀድሞ ይገኛል (Duplicate UID)`
          });
          return;
        }

        // 3. Duplicate UID validation within the imported JSON itself
        if (internalUidSet.has(cleanUidLower)) {
          results.push({
            raw: item,
            student: null,
            status: 'duplicate',
            errorMessage: `UID [${uid}] በዚህ ፋይል ውስጥ ከአንድ ጊዜ በላይ ተደግሟል`
          });
          return;
        }

        internalUidSet.add(cleanUidLower);

        // Smart fallbacks for secondary fields
        const id = (item.ID || item.id || uid.replace(/\D/g, '') || uid).toString().trim();
        const genderRaw = (item.Gender || item.gender || 'ወንድ').toString().trim();
        const gender: 'ወንድ' | 'ሴት' = genderRaw.includes('ሴት') || genderRaw.toLowerCase() === 'female' ? 'ሴት' : 'ወንድ';

        const student: Student = {
          uid,
          id,
          name,
          program,
          gender,
          admissionYear: item.admissionYear || currentYear,
          currentStudyYear: item.currentStudyYear || 1,
          graduationStatus: 'ACTIVE'
        };

        results.push({
          raw: item,
          student,
          status: 'valid'
        });
      });

      setParsedResults(results);
    } catch (err: any) {
      setParsedResults([
        {
          raw: content,
          student: null,
          status: 'invalid',
          errorMessage: `የJSON ፋይል ቅርጸት ትክክል አይደለም (Syntax Error)፦ ${err?.message || ''}`
        }
      ]);
    }
  };

  // Handle File Drag / File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        validateJsonString(text);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Confirm Import
  const handleConfirmImport = () => {
    const validStudents = parsedResults
      .filter((r) => r.status === 'valid' && r.student)
      .map((r) => r.student!);

    if (validStudents.length === 0) {
      showNotify('ምንም የሚገባ ትክክለኛ የተማሪ መረጃ አልተገኘም!', 'warning');
      return;
    }

    const merged = sortStudentsByAmharicName([...existingStudents, ...validStudents]);
    onUpdateStudents?.(merged);

    showNotify(`${validStudents.length} አዳዲስ ተማሪዎች ከJSON ፋይል በስኬት ተመዝግበዋል!`, 'success');
    onClose();
  };

  const validCount = parsedResults.filter((r) => r.status === 'valid').length;
  const duplicateCount = parsedResults.filter((r) => r.status === 'duplicate').length;
  const invalidCount = parsedResults.filter((r) => r.status === 'invalid').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-3xl w-full p-6 space-y-5 animate-in fade-in zoom-in duration-200 my-8">
        {/* Header */}
        <div className="flex justify-between items-start border-b pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 text-purple-900 rounded-2xl">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">
                ተማሪዎችን ከJSON ፋይል ማስገቢያ (Import Students from JSON)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                የተማሪዎችን ስም (Name)፣ መለያ (UID) እና ፕሮግራም (Diploma/Degree) የያዘ የJSON ሰነድ ይጫኑ።
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input Method Selector & Sample Download */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveInputTab('upload')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeInputTab === 'upload'
                  ? 'bg-purple-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>ፋይል ጫን (Upload .JSON)</span>
            </button>

            <button
              onClick={() => setActiveInputTab('paste')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeInputTab === 'paste'
                  ? 'bg-purple-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              <Code className="w-4 h-4" />
              <span>JSON ኮድ ለጥፍ (Paste JSON)</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadSample}
              className="text-xs bg-white border border-slate-300 text-slate-700 hover:bg-purple-50 hover:text-purple-900 font-bold px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-purple-700" />
              <span>ናሙና JSON አውርድ</span>
            </button>

            <button
              onClick={handleCopySample}
              className="text-xs bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              <span>{isCopied ? 'ተቀድቷል!' : 'ኮፒ አድርግ'}</span>
            </button>
          </div>
        </div>

        {/* Upload Mode */}
        {activeInputTab === 'upload' && (
          <div className="border-2 border-dashed border-purple-200 hover:border-purple-500 bg-purple-50/40 rounded-3xl p-6 text-center transition-colors">
            <input
              type="file"
              id="student-json-file"
              accept=".json,application/json"
              onChange={handleFileUpload}
              className="hidden"
            />
            <label
              htmlFor="student-json-file"
              className="flex flex-col items-center justify-center cursor-pointer space-y-2"
            >
              <div className="p-3 bg-purple-100 text-purple-900 rounded-full">
                <Upload className="w-7 h-7" />
              </div>
              <span className="font-bold text-sm text-slate-800">
                የተማሪዎች JSON ፋይል ለመምረጥ እዚህ ይጫኑ (ወይም ፋይሉን ይጎትቱ)
              </span>
              <p className="text-xs text-slate-500">
                የፋይል ዓይነት: <strong>.json</strong> (Name, UID, and Program fields required)
              </p>
            </label>
          </div>
        )}

        {/* Paste Mode */}
        {activeInputTab === 'paste' && (
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block">
              የJSON ኮድ እዚህ ይለጥፉ (Paste JSON content below):
            </label>
            <textarea
              rows={6}
              value={jsonInput}
              onChange={(e) => validateJsonString(e.target.value)}
              placeholder={`[\n  {\n    "Name": "አበበ በቀለ",\n    "UID": "dip_201935",\n    "Program": "Diploma"\n  }\n]`}
              className="w-full p-3 font-mono text-xs rounded-2xl border border-slate-300 focus:ring-2 focus:ring-purple-700 bg-slate-900 text-emerald-400"
            />
          </div>
        )}

        {/* Real-time Validation Summary Badges */}
        {parsedResults.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-emerald-800 font-bold block uppercase">ለማስገባት ዝግጁ</span>
                  <strong className="text-xl font-black text-emerald-950 font-mono">{validCount}</strong>
                </div>
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>

              <div className="bg-rose-50 border border-rose-200 p-3 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-rose-800 font-bold block uppercase">እጥፍ UIDs (Duplicates)</span>
                  <strong className="text-xl font-black text-rose-950 font-mono">{duplicateCount}</strong>
                </div>
                <AlertTriangle className="w-6 h-6 text-rose-600" />
              </div>

              <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-amber-800 font-bold block uppercase">የጎደለ/የተሳሳተ</span>
                  <strong className="text-xl font-black text-amber-950 font-mono">{invalidCount}</strong>
                </div>
                <FileText className="w-6 h-6 text-amber-600" />
              </div>
            </div>

            {/* Validation Preview Table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[11px] sticky top-0">
                  <tr>
                    <th className="p-2.5">ሁኔታ (Status)</th>
                    <th className="p-2.5">የተማሪ ስም</th>
                    <th className="p-2.5">UID</th>
                    <th className="p-2.5">ፕሮግራም</th>
                    <th className="p-2.5">መልእክት / ማረጋገጫ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parsedResults.map((res, idx) => (
                    <tr
                      key={idx}
                      className={
                        res.status === 'valid'
                          ? 'bg-emerald-50/30'
                          : res.status === 'duplicate'
                          ? 'bg-rose-50/50'
                          : 'bg-amber-50/50'
                      }
                    >
                      <td className="p-2.5 font-bold">
                        {res.status === 'valid' && (
                          <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md text-[10px]">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>ዝግጁ</span>
                          </span>
                        )}
                        {res.status === 'duplicate' && (
                          <span className="inline-flex items-center gap-1 text-rose-800 bg-rose-100 px-2 py-0.5 rounded-md text-[10px]">
                            <AlertTriangle className="w-3 h-3" />
                            <span>እጥፍ UID</span>
                          </span>
                        )}
                        {res.status === 'invalid' && (
                          <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md text-[10px]">
                            <FileText className="w-3 h-3" />
                            <span>የጎደለ</span>
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 font-bold text-slate-900">
                        {res.student?.name || res.raw?.Name || res.raw?.name || '—'}
                      </td>
                      <td className="p-2.5 font-mono text-slate-700 font-bold">
                        {res.student?.uid || res.raw?.UID || res.raw?.uid || '—'}
                      </td>
                      <td className="p-2.5">
                        <span className="px-2 py-0.5 bg-slate-200 text-slate-800 rounded text-[10px] font-bold">
                          {res.student?.program || res.raw?.Program || res.raw?.program || '—'}
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-600 font-medium text-[11px]">
                        {res.status === 'valid' ? (
                          <span className="text-emerald-700 font-semibold">ማረጋገጫ አልፏል (Valid)</span>
                        ) : (
                          <span className="text-rose-700 font-bold">{res.errorMessage}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Actions Footer */}
        <div className="flex justify-between items-center pt-4 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            ሰርዝ (Cancel)
          </button>

          <button
            onClick={handleConfirmImport}
            disabled={validCount === 0}
            className={`px-5 py-2.5 text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer ${
              validCount > 0
                ? 'bg-emerald-800 hover:bg-emerald-900 text-white'
                : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {validCount > 0 ? `የተረጋገጡትን ${validCount} ተማሪዎች አስገባ` : 'ምንም የሚገባ ተማሪ አልተገኘም'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
