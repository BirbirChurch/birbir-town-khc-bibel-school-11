import React, { useState, useRef } from 'react';
import {
  FileCode,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  X,
  FileText,
  Database,
  Sparkles,
  Copy,
  Check,
  Users,
  BookOpen,
  Cloud,
  CheckCheck,
  Eye,
  Info,
  Award
} from 'lucide-react';
import { Course, GradeBreakdown, OfficialSignaturesConfig, Student } from '../types.ts';
import { calculateGradeDetails, getGradeKey } from '../utils/gradeCalculations.ts';
import { generateFullSystemMasterBackup } from '../data/fullSystemMasterJson.ts';
import { useLanguage } from '../utils/i18n.tsx';

export interface JsonImportPayload {
  students?: Student[];
  teachers?: string[];
  courses?: Course[];
  grades?: Record<string, GradeBreakdown>;
  photos?: Record<string, string>;
  userPasswords?: Record<string, string>;
  availableYears?: string[];
  systemLocked?: boolean;
  gradePublished?: boolean;
  currentYear?: string;
  currentSemester?: string;
  officialConfig?: OfficialSignaturesConfig;
  mode: 'REPLACE_ALL' | 'MERGE_GRADES' | 'APPEND_MISSING';
  syncToFirebase?: boolean;
}

interface UniversalJsonReaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStudents: Student[];
  currentCourses: Course[];
  currentGrades: Record<string, GradeBreakdown>;
  onApplyImport: (payload: JsonImportPayload) => Promise<void> | void;
  showNotify: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

interface AnalysisResult {
  isValid: boolean;
  error?: string;
  detectedType: 'FULL_BACKUP' | 'GRADES_OBJECT' | 'GRADES_ARRAY' | 'STUDENTS_LIST' | 'COURSES_LIST' | 'MIXED';
  detectedTypeLabel: string;
  studentsCount: number;
  coursesCount: number;
  gradesCount: number;
  hasMuluken: boolean;
  mulukenDetails?: {
    courseCount: number;
    sampleScores: string[];
  };
  candidateStudentsFound: string[];
  previewGrades: Array<{
    key: string;
    studentUid: string;
    courseId: string;
    total: number;
    letter: string;
    breakdown: GradeBreakdown;
  }>;
  parsedPayload: {
    students?: Student[];
    teachers?: string[];
    courses?: Course[];
    grades?: Record<string, GradeBreakdown>;
    photos?: Record<string, string>;
    userPasswords?: Record<string, string>;
    availableYears?: string[];
    systemLocked?: boolean;
    gradePublished?: boolean;
    currentYear?: string;
    currentSemester?: string;
    officialConfig?: OfficialSignaturesConfig;
  };
}

export const UniversalJsonReaderModal: React.FC<UniversalJsonReaderModalProps> = ({
  isOpen,
  onClose,
  currentStudents,
  currentCourses,
  currentGrades,
  onApplyImport,
  showNotify
}) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'upload' | 'paste' | 'samples'>('upload');
  const [jsonText, setJsonText] = useState('');
  const [fileName, setFileName] = useState<string>('');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [importMode, setImportMode] = useState<'MERGE_GRADES' | 'REPLACE_ALL' | 'APPEND_MISSING'>('MERGE_GRADES');
  const [syncToFirebase, setSyncToFirebase] = useState<boolean>(true);
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [copiedSample, setCopiedSample] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Helper to sanitize & parse JSON string resiliently
  const sanitizeAndParse = (raw: string): any => {
    let clean = raw.trim();
    if (clean.charCodeAt(0) === 0xFEFF) {
      clean = clean.slice(1);
    }
    // Remove markdown code fences if pasted from AI/chat
    clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    // Remove trailing commas before closing braces/brackets
    clean = clean.replace(/,\s*([\]}])/g, '$1');
    return JSON.parse(clean);
  };

  // Inspect and analyze any JSON data structure
  const analyzeJson = (rawContent: string, name = ''): AnalysisResult => {
    try {
      if (!rawContent.trim()) {
        return {
          isValid: false,
          error: t('ባዶ ፋይል ነው፤ እባክዎ ትክክለኛ JSON ፋይል ያስገቡ።', 'File is empty; please provide a valid JSON payload.'),
          detectedType: 'MIXED',
          detectedTypeLabel: t('ያልታወቀ', 'Unknown'),
          studentsCount: 0,
          coursesCount: 0,
          gradesCount: 0,
          hasMuluken: false,
          candidateStudentsFound: [],
          previewGrades: [],
          parsedPayload: {}
        };
      }

      const data = sanitizeAndParse(rawContent);

      let students: Student[] | undefined;
      let teachers: string[] | undefined;
      let courses: Course[] | undefined;
      let grades: Record<string, GradeBreakdown> | undefined;
      let photos: Record<string, string> | undefined;
      let userPasswords: Record<string, string> | undefined;
      let availableYears: string[] | undefined;
      let systemLocked: boolean | undefined;
      let gradePublished: boolean | undefined;
      let currentYear: string | undefined;
      let currentSemester: string | undefined;
      let officialConfig: OfficialSignaturesConfig | undefined;

      let detectedType: AnalysisResult['detectedType'] = 'MIXED';
      let detectedTypeLabel = t('ቅይጥ መረጃ (Mixed Data)', 'Mixed Data');

      // 1. Is it a full system backup?
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        if (data.students || data.courses || data.grades || data.version || data.timestamp) {
          detectedType = 'FULL_BACKUP';
          detectedTypeLabel = t('ሙሉ ሲስተም መጠባበቂያ (Full System Backup)', 'Full System Backup');
          if (Array.isArray(data.students)) students = data.students;
          if (Array.isArray(data.teachers)) teachers = data.teachers;
          if (Array.isArray(data.courses)) courses = data.courses;
          if (data.grades && typeof data.grades === 'object') grades = data.grades;
          if (data.photos) photos = data.photos;
          if (data.userPasswords) userPasswords = data.userPasswords;
          if (Array.isArray(data.availableYears)) availableYears = data.availableYears;
          if (typeof data.systemLocked === 'boolean') systemLocked = data.systemLocked;
          if (typeof data.gradePublished === 'boolean') gradePublished = data.gradePublished;
          if (data.currentYear) currentYear = data.currentYear;
          if (data.currentSemester) currentSemester = data.currentSemester;
          if (data.officialConfig) officialConfig = data.officialConfig;
        } else if (data.system && typeof data.system === 'object') {
          // Wrapped Firestore structure e.g. { system: { grades: {...}, students: {...} } }
          detectedType = 'FULL_BACKUP';
          detectedTypeLabel = t('የክላውድ መጠባበቂያ (Firestore Cloud Backup)', 'Cloud Database Backup');
          if (data.system.grades) grades = data.system.grades;
          if (Array.isArray(data.system.students?.list)) students = data.system.students.list;
          if (Array.isArray(data.system.courses?.list)) courses = data.system.courses.list;
        } else {
          // Direct Grade Map e.g. { "dip_201811_...": { p1: 20, ... } }
          const keys = Object.keys(data);
          const sampleVal = keys.length > 0 ? data[keys[0]] : null;
          const isGradeMap = sampleVal && typeof sampleVal === 'object' && (
            'p1' in sampleVal || 'p2' in sampleVal || 'mid' in sampleVal ||
            'final' in sampleVal || 'att' in sampleVal || 'scores' in sampleVal || 'customTotal' in sampleVal
          );

          if (isGradeMap) {
            detectedType = 'GRADES_OBJECT';
            detectedTypeLabel = t('የተማሪዎች ውጤት መዝገብ (Grades Key-Value Map)', 'Grades Key-Value Map');
            grades = data as Record<string, GradeBreakdown>;
          }
        }
      } else if (Array.isArray(data)) {
        // Array of items: could be students, courses, or grade entries
        if (data.length > 0) {
          const first = data[0];
          if (first && typeof first === 'object') {
            if ('p1' in first || 'mid' in first || 'final' in first || 'score' in first || 'grade' in first) {
              detectedType = 'GRADES_ARRAY';
              detectedTypeLabel = t('የውጤቶች ዝርዝር ሰንጠረዥ (Grades Array)', 'Grades Array');
              const gradeMap: Record<string, GradeBreakdown> = {};
              data.forEach((item: any) => {
                const sUid = item.studentUid || item.uid || item.studentId || item.id;
                const cId = item.courseId || item.id || item.code;
                const yr = item.academicYear || item.year || '2018';
                const sem = item.semester || '1';
                if (sUid && cId) {
                  const key = getGradeKey(String(sUid), String(cId), String(yr), String(sem));
                  const scoreTotal = Number(item.total || item.score || 0);
                  const p1 = Number(item.p1 ?? Math.round(scoreTotal * 0.20));
                  const p2 = Number(item.p2 ?? Math.round(scoreTotal * 0.20));
                  const mid = Number(item.mid ?? Math.round(scoreTotal * 0.30));
                  const final = Number(item.final ?? Math.round(scoreTotal * 0.20));
                  const att = Number(item.att ?? Math.round(scoreTotal * 0.10));
                  gradeMap[key] = {
                    p1, p2, mid, final, att,
                    customTotal: item.total ? Number(item.total) : undefined,
                    customLetter: item.letter || undefined
                  };
                }
              });
              grades = gradeMap;
            } else if ('program' in first && ('gender' in first || 'admissionYear' in first || 'name' in first)) {
              detectedType = 'STUDENTS_LIST';
              detectedTypeLabel = t('የተማሪዎች ዝርዝር (Students Roster)', 'Students Roster');
              students = data as Student[];
            } else if ('credits' in first || 'schedule' in first || 'teacher' in first) {
              detectedType = 'COURSES_LIST';
              detectedTypeLabel = t('የኮርሶች ዝርዝር (Courses List)', 'Courses List');
              courses = data as Course[];
            }
          }
        }
      }

      // Check for Muluken Zeleke Faltamo and 2018 candidates
      const rawString = JSON.stringify(data);
      const hasMuluken = rawString.includes('201811') || rawString.includes('ሙሉቀን');

      const candidateIds = [
        '201801', '201802', '201803', '201804', '201805',
        '201806', '201807', '201808', '201810', '201811'
      ];
      const candidateNames: Record<string, string> = {
        '201801': 'አስራት ዳንኤል',
        '201802': 'አማኑኤል ባሳ',
        '201803': 'ስንታየሁ ቱማቶ',
        '201804': 'ጥሩነሽ መሐመድ',
        '201805': 'ከፍያለዉ ካስትሮ',
        '201806': 'ማርቆስ ቱማ',
        '201807': 'አስራት ኤልያስ',
        '201808': 'ጠቅላዩ ፎላ',
        '201810': 'ደነቀ አለማየሁ',
        '201811': 'ሙሉቀን ዘለቀ ፋልታሞ'
      };

      const candidateStudentsFound: string[] = [];
      candidateIds.forEach((cId) => {
        if (rawString.includes(cId) || rawString.includes(candidateNames[cId])) {
          candidateStudentsFound.push(`${candidateNames[cId]} (${cId})`);
        }
      });

      // Preview Grades
      const previewGrades: AnalysisResult['previewGrades'] = [];
      if (grades) {
        Object.entries(grades).slice(0, 30).forEach(([k, breakdown]) => {
          const parts = k.split('_');
          const studentUid = parts[0] ? `${parts[0]}_${parts[1]}` : k;
          const courseId = parts[2] ? parts.slice(2, parts.length - 2).join('_') : '';
          const total = (breakdown.p1 || 0) + (breakdown.p2 || 0) + (breakdown.mid || 0) + (breakdown.final || 0) + (breakdown.att || 0);
          const detail = calculateGradeDetails(breakdown.customTotal ?? total);
          previewGrades.push({
            key: k,
            studentUid,
            courseId: courseId || k,
            total: breakdown.customTotal ?? total,
            letter: breakdown.customLetter ?? detail.letter,
            breakdown
          });
        });
      }

      return {
        isValid: true,
        detectedType,
        detectedTypeLabel,
        studentsCount: students ? students.length : 0,
        coursesCount: courses ? courses.length : 0,
        gradesCount: grades ? Object.keys(grades).length : 0,
        hasMuluken,
        candidateStudentsFound,
        previewGrades,
        parsedPayload: {
          students,
          teachers,
          courses,
          grades,
          photos,
          userPasswords,
          availableYears,
          systemLocked,
          gradePublished,
          currentYear,
          currentSemester,
          officialConfig
        }
      };
    } catch (err: any) {
      return {
        isValid: false,
        error: t(
          `የJSON ፎርማት ስህተት፦ ${err.message || 'ትክክለኛ የJSON መዋቅር አይደለም'}`,
          `JSON Syntax Error: ${err.message || 'Invalid JSON structure'}`
        ),
        detectedType: 'MIXED',
        detectedTypeLabel: t('ስህተት የተገኘበት', 'Invalid Format'),
        studentsCount: 0,
        coursesCount: 0,
        gradesCount: 0,
        hasMuluken: false,
        candidateStudentsFound: [],
        previewGrades: [],
        parsedPayload: {}
      };
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setJsonText(content);
        const res = analyzeJson(content, file.name);
        setAnalysis(res);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleTextChange = (text: string) => {
    setJsonText(text);
    if (text.trim()) {
      const res = analyzeJson(text);
      setAnalysis(res);
    } else {
      setAnalysis(null);
    }
  };

  const handleApply = async () => {
    if (!analysis || !analysis.isValid) {
      showNotify(t('እባክዎ አስቀድመው ትክክለኛ JSON ፋይል ያስገቡ!', 'Please provide a valid JSON payload first!'), 'error');
      return;
    }

    setIsApplying(true);
    try {
      await onApplyImport({
        ...analysis.parsedPayload,
        mode: importMode,
        syncToFirebase
      });
      showNotify(
        t(
          `JSON ፋይሉ በስኬት ተነቧል! ${analysis.hasMuluken ? 'የተማሪ ሙሉቀን ዘለቀ ፋልታሞ እና ' : ''}የ${analysis.gradesCount} ውጤቶች መዝገብ ተጭኗል።`,
          `JSON imported successfully! ${analysis.gradesCount} grade records loaded.`
        ),
        'success'
      );
      onClose();
    } catch (e: any) {
      showNotify(t(`መረጃውን መጫን አልተቻለም፦ ${e.message}`, `Failed to import data: ${e.message}`), 'error');
    } finally {
      setIsApplying(false);
    }
  };

  // Pre-configured Sample Templates
  const sampleGraduatesGrades = {
    "dip_201811_dip_2018_sem1_1_2018_1": { "p1": 20, "p2": 19, "mid": 29, "final": 19, "att": 9, "customTotal": 96, "customLetter": "A" },
    "dip_201811_dip_2018_sem1_2_2018_1": { "p1": 18, "p2": 17, "mid": 26, "final": 18, "att": 9, "customTotal": 88, "customLetter": "B+" },
    "dip_201811_dip_2018_sem1_3_2018_1": { "p1": 19, "p2": 19, "mid": 28, "final": 19, "att": 9, "customTotal": 94, "customLetter": "A" },
    "dip_201811_dip_2018_sem1_4_2018_1": { "p1": 17, "p2": 17, "mid": 26, "final": 17, "att": 8, "customTotal": 85, "customLetter": "B" },
    "dip_201811_dip_2018_sem1_6_2018_1": { "p1": 20, "p2": 20, "mid": 29, "final": 19, "att": 9, "customTotal": 97, "customLetter": "A+" },
    "dip_201811_dip_2018_sem1_7_2018_1": { "p1": 18, "p2": 18, "mid": 27, "final": 18, "att": 9, "customTotal": 90, "customLetter": "A-" },
    "dip_201811_dip_2018_sem2_1_2018_2": { "p1": 19, "p2": 19, "mid": 29, "final": 19, "att": 9, "customTotal": 95, "customLetter": "A" },
    "dip_201811_dip_2018_sem2_2_2018_2": { "p1": 18, "p2": 18, "mid": 27, "final": 19, "att": 9, "customTotal": 91, "customLetter": "A-" },
    "dip_201811_dip_2018_sem2_3_2018_2": { "p1": 20, "p2": 19, "mid": 29, "final": 19, "att": 9, "customTotal": 96, "customLetter": "A" },
    "dip_201811_dip_2018_sem2_4_2018_2": { "p1": 18, "p2": 17, "mid": 26, "final": 17, "att": 9, "customTotal": 87, "customLetter": "B+" },
    "dip_201811_dip_2018_sem2_5_2018_2": { "p1": 20, "p2": 20, "mid": 30, "final": 19, "att": 9, "customTotal": 98, "customLetter": "A+" },
    "dip_201811_dip_2018_sem2_6_2018_2": { "p1": 19, "p2": 18, "mid": 28, "final": 18, "att": 9, "customTotal": 92, "customLetter": "A-" },
    "dip_201811_dip_2018_sem2_7_2018_2": { "p1": 19, "p2": 19, "mid": 28, "final": 19, "att": 9, "customTotal": 94, "customLetter": "A" }
  };

  const handleLoadSample = (sampleData: any, sampleTitle: string) => {
    const formatted = JSON.stringify(sampleData, null, 2);
    setJsonText(formatted);
    setFileName(sampleTitle);
    const res = analyzeJson(formatted, sampleTitle);
    setAnalysis(res);
    setActiveTab('paste');
    showNotify(
      t(
        `${sampleTitle} ተዘጋጅቷል! ከታች ያለውን "መረጃውን ወደ ሲስተም ጫን" የሚለውን ይጫኑ።`,
        `${sampleTitle} ready! Click "Apply JSON to System" below to import.`
      ),
      'info'
    );
  };

  const handleDownloadJson = (data: any, defaultName: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultName;
    a.click();
    URL.revokeObjectURL(url);
    showNotify(t('የJSON ፋይል በስኬት ወርዷል!', 'JSON file downloaded successfully!'), 'success');
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSample(id);
    setTimeout(() => setCopiedSample(null), 2000);
    showNotify(t('የJSON ኮድ ተቀድቷል!', 'JSON code copied to clipboard!'), 'info');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-1.5 sm:p-4 overflow-hidden">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-6 relative flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute top-3.5 right-3.5 sm:top-5 sm:right-5 text-slate-300 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            aria-label={t('ዝጋ', 'Close')}
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-start sm:items-center gap-3 pr-9">
            <div className="p-2.5 sm:p-3 bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 rounded-2xl shrink-0">
              <FileCode className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm sm:text-xl font-bold text-white leading-snug">
                  {t('ሁለገብ የJSON ፋይል አንባቢና መረጃ መጫኛ', 'Universal JSON Reader & System Importer')}
                </h3>
                <span className="bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full font-bold shrink-0">
                  JSON v3.0
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-300 mt-1 leading-relaxed">
                {t(
                  'የተማሪዎችን ውጤቶች፣ የሙሉቀን ዘለቀ ፋልታሞንና የተመራቂዎችን መዝገብ ወይም ሙሉ የሲስተም ባክአፕ በማንበብ በቀጥታ ወደ ሲስተሙ ያስገቡ።',
                  'Read and directly import student grades, graduate records, or full system backups directly into the platform.'
                )}
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-2 mt-4 sm:mt-5 border-b border-indigo-800/60 pb-1.5 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex items-center gap-2 px-3.5 py-2 min-h-[40px] rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'upload'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Upload className="w-4 h-4 shrink-0" />
              <span>{t('የJSON ፋይል ምረጥ', 'Select JSON File')}</span>
            </button>
            <button
              onClick={() => setActiveTab('paste')}
              className={`flex items-center gap-2 px-3.5 py-2 min-h-[40px] rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'paste'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4 shrink-0" />
              <span>{t('ኮድ ለጥፍ (Paste JSON)', 'Paste JSON Code')}</span>
            </button>
            <button
              onClick={() => setActiveTab('samples')}
              className={`flex items-center gap-2 px-3.5 py-2 min-h-[40px] rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'samples'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
              <span>{t('ዝግጁ ናሙናዎች', 'Sample Templates')}</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* TAB 1: File Upload */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              {/* Quick Master JSON Restore Banner */}
              <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 border border-amber-400/60 rounded-3xl p-4 text-white flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-400 text-slate-950 rounded-2xl shadow-sm">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-extrabold text-amber-300 text-xs sm:text-sm">
                      {t('ይፋዊ ሙሉ ሲስተም ማስተር JSON (Official Complete Master System JSON)', 'Official Complete Master System JSON')}
                    </h5>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      {t(
                        '70 ተማሪዎች፣ 29 ኮርሶች፣ እና የሙሉቀን ዘለቀ ፋልታሞ እና የ10ሩ ተመራቂዎች ሙሉ 13 ኮርሶች ውጤት።',
                        '70 students, 29 courses, and complete 13-course results for Muluken Zeleke & 10 graduates.'
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      const master = generateFullSystemMasterBackup();
                      handleLoadSample(master, 'birbir_full_system_master_backup.json');
                    }}
                    className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs px-3.5 py-2 rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCheck className="w-4 h-4 text-slate-950" />
                    <span>{t('ይህንን ሙሉ ሲስተም አንብብ (Load Master)', 'Load Master JSON')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const master = generateFullSystemMasterBackup();
                      handleDownloadJson(master, 'birbir_full_system_master_backup.json');
                    }}
                    className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs p-2 rounded-xl border border-white/20 transition-all cursor-pointer"
                    title={t('ሙሉ ማስተር ፋይሉን አውርድ', 'Download full master file')}
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-indigo-300 hover:border-indigo-500 rounded-3xl p-8 text-center bg-indigo-50/40 hover:bg-indigo-50/80 transition-all cursor-pointer group"
              >
                <div className="w-14 h-14 bg-indigo-100 group-hover:bg-indigo-200 text-indigo-700 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner transition-colors">
                  <Upload className="w-7 h-7" />
                </div>
                <h4 className="text-base font-bold text-slate-800">
                  {fileName
                    ? t(`የተመረጠ ፋይል፦ ${fileName}`, `Selected file: ${fileName}`)
                    : t('የJSON ፋይልዎን እዚህ ይጫኑ ወይም ይጎትቱ (Drag & Drop)', 'Click to browse or drag & drop your JSON file')}
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  {t(
                    'የተቀመጠ የመጠባበቂያ ፋይል (.json) ወይም የተማሪዎች የውጤት ፋይል ከመረጡ በኋላ ሲስተሙ በራሱ ፈልፍሎ ያነበዋል።',
                    'Select a saved backup file (.json) or student grade export and the system will parse and analyze it automatically.'
                  )}
                </p>
                <button
                  type="button"
                  className="mt-4 inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-sm transition-all"
                >
                  <Upload className="w-4 h-4" />
                  <span>{t('ፋይል ፈልግ (Browse .json)', 'Browse .json File')}</span>
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".json,application/json,text/plain"
                  className="hidden"
                />
              </div>
            </div>
          )}

          {/* TAB 2: Direct Paste */}
          {activeTab === 'paste' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <FileCode className="w-4 h-4 text-indigo-600" />
                  <span>{t('የJSON ጽሑፍ እዚህ ይለጥፉ (Paste JSON content below):', 'Paste JSON content below:')}</span>
                </label>
                {jsonText && (
                  <button
                    onClick={() => { setJsonText(''); setAnalysis(null); setFileName(''); }}
                    className="text-xs text-rose-600 hover:underline cursor-pointer"
                  >
                    {t('አጽዳ (Clear)', 'Clear')}
                  </button>
                )}
              </div>
              <textarea
                value={jsonText}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder='{ "students": [...], "grades": { "dip_201811_...": { "p1": 20, ... } } }'
                className="w-full h-48 font-mono text-xs bg-slate-900 text-emerald-400 p-4 rounded-2xl border border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed overflow-x-auto"
                rows={8}
              />
            </div>
          )}

          {/* TAB 3: Sample Templates */}
          {activeTab === 'samples' && (
            <div className="space-y-4">
              {/* PRIMARY FULL-SYSTEM MASTER JSON HERO CARD */}
              <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-emerald-950 border-2 border-amber-400/90 rounded-3xl p-5 text-white shadow-xl relative overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 bg-amber-400 text-slate-950 rounded-2xl shadow-md">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-extrabold text-amber-300">
                          {t('ይፋዊ ሙሉ ሲስተም ማስተር JSON (Official Complete Master System JSON)', 'Official Complete Master System JSON')}
                        </h4>
                        <span className="bg-amber-400/20 text-amber-300 border border-amber-400/50 text-[10px] px-2.5 py-0.5 rounded-full font-bold">
                          {t('የተሟላ ይፋዊ መዝገብ v3.5', 'Complete Registry v3.5')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5">
                        {t(
                          'የ70 ተማሪዎች ዝርዝር፣ 10 መምህራን፣ 29 ኮርሶች፣ እና የሙሉቀን ዘለቀ ፋልታሞ እና የ10ሩ ተመራቂዎች የ2018 1ኛ እና 2ኛ ሰሚስተር ሙሉ 13 የትምህርት ውጤቶች።',
                          'Includes 70 students, 10 teachers, 29 courses, and complete 13-course results (2018 Sem 1 & 2) for Muluken Zeleke & 10 graduates.'
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-3 text-[11px]">
                  <div className="bg-white/10 rounded-xl p-2.5 border border-white/10">
                    <span className="text-slate-400 block text-[10px]">{t('ተማሪዎች', 'Students')}</span>
                    <span className="text-white font-black text-xs sm:text-sm">{t('70 (35 ዲፕሎማ + 35 ድግሪ)', '70 (35 Diploma + 35 Degree)')}</span>
                  </div>
                  <div className="bg-white/10 rounded-xl p-2.5 border border-white/10">
                    <span className="text-slate-400 block text-[10px]">{t('ኮርሶች', 'Courses')}</span>
                    <span className="text-white font-black text-xs sm:text-sm">{t('29 ኮርሶች (2018 & 2019)', '29 Courses (2018 & 2019)')}</span>
                  </div>
                  <div className="bg-white/10 rounded-xl p-2.5 border border-white/10">
                    <span className="text-amber-300 block text-[10px]">{t('የተመራቂዎች ውጤት', 'Graduate Grades')}</span>
                    <span className="text-amber-300 font-black text-xs sm:text-sm">{t('13ቱ ኮርሶች (100% የተሟላ)', '13 Courses (100% Complete)')}</span>
                  </div>
                  <div className="bg-white/10 rounded-xl p-2.5 border border-white/10">
                    <span className="text-emerald-300 block text-[10px]">{t('ውጤት መለኪያ', 'Grading Scale')}</span>
                    <span className="text-emerald-300 font-black text-xs sm:text-sm">{t('ይፋዊ 13-ደረጃ (A+ 4.00)', 'Official 13-Tier (A+ 4.00)')}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 pt-2">
                  <button
                    onClick={() => {
                      const master = generateFullSystemMasterBackup();
                      handleLoadSample(master, 'birbir_full_system_master_backup.json');
                    }}
                    className="flex-1 min-w-[220px] bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-slate-950 font-black text-xs py-2.5 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CheckCheck className="w-4 h-4 text-slate-950" />
                    <span>{t('ይህን ሙሉ ሲስተም JSON ወዲያውኑ አንብብ (Load Master JSON)', 'Load Master System JSON')}</span>
                  </button>
                  <button
                    onClick={() => {
                      const master = generateFullSystemMasterBackup();
                      handleDownloadJson(master, 'birbir_full_system_master_backup.json');
                    }}
                    className="bg-white/15 hover:bg-white/25 text-white font-bold text-xs py-2.5 px-3.5 rounded-xl border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer"
                    title={t('ሙሉ ሲስተም ፋይሉን በኮምፒውተርህ አውርድ', 'Download full system JSON')}
                  >
                    <Download className="w-4 h-4 text-amber-300" />
                    <span>{t('ሙሉ JSON አውርድ (.json)', 'Download Master (.json)')}</span>
                  </button>
                  <button
                    onClick={() => {
                      const master = generateFullSystemMasterBackup();
                      handleCopy(JSON.stringify(master, null, 2), 'master_full');
                    }}
                    className="bg-white/15 hover:bg-white/25 text-white font-bold text-xs py-2.5 px-3.5 rounded-xl border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer"
                    title={t('ሙሉ JSON ኮዱን ቅዳ', 'Copy full JSON code')}
                  >
                    {copiedSample === 'master_full' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedSample === 'master_full' ? t('ተቀድቷል!', 'Copied!') : t('ኮድ ቅዳ', 'Copy JSON')}</span>
                  </button>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">{t('ዝግጁ የJSON ናሙናዎች (Pre-built Templates)', 'Pre-built JSON Templates')}</p>
                  <p className="mt-0.5 text-amber-800">
                    {t(
                      'የተማሪ ሙሉቀን ዘለቀ ፋልታሞ እና የሌሎች 10 ተመራቂዎች የ2018 ዓ/ም 1ኛ እና 2ኛ ሰሚስተር ውጤት የያዘ ዝግጁ JSON ከታች ተዘጋጅቶሎታል። "ይህን ናሙና አንብብ" በማለት በቀጥታ ወደ ሲስተሙ መጫን ይችላሉ።',
                      'Ready-to-use JSON templates containing 2018 E.C. 1st & 2nd semester grades for Muluken Zeleke and 10 graduates are available below.'
                    )}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* Template 1: Muluken & Graduates */}
                <div className="border border-slate-200 rounded-2xl p-4 hover:border-indigo-300 transition-all bg-white shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-indigo-600" />
                        {t('የሙሉቀን ዘለቀ ፋልታሞ ውጤት JSON', 'Muluken Zeleke Grades JSON')}
                      </span>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                        {t('13 ኮርሶች (A/A+)', '13 Courses (A/A+)')}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1.5">
                      {t(
                        'የ2018 ዓ/ም 1ኛ ሰሚስተር (6 ኮርሶች) እና 2ኛ ሰሚስተር (7 ኮርሶች) የተሟላ ይፋዊ ውጤት።',
                        'Complete official 2018 E.C. 1st Semester (6 courses) & 2nd Semester (7 courses) grades.'
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => handleLoadSample(sampleGraduatesGrades, 'muluken_zeleke_grades.json')}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>{t('ይህን ናሙና አንብብ (Load)', 'Load Sample')}</span>
                    </button>
                    <button
                      onClick={() => handleDownloadJson(sampleGraduatesGrades, 'muluken_zeleke_grades.json')}
                      className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition-all"
                      title={t('ፋይሉን አውርድ', 'Download file')}
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleCopy(JSON.stringify(sampleGraduatesGrades, null, 2), 'sample1')}
                      className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition-all"
                      title={t('ኮድ ቅዳ', 'Copy code')}
                    >
                      {copiedSample === 'sample1' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Template 2: Full System Backup */}
                <div className="border border-slate-200 rounded-2xl p-4 hover:border-indigo-300 transition-all bg-white shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                        <Database className="w-4 h-4 text-emerald-600" />
                        {t('የአሁን ሲስተም ሙሉ መጠባበቂያ (Full Export)', 'Current System Full Backup (Export)')}
                      </span>
                      <span className="bg-slate-100 text-slate-700 text-[10px] px-2 py-0.5 rounded-full font-bold">
                        {currentStudents.length} {t('ተማሪዎች', 'Students')}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1.5">
                      {t(
                        'በአሁኑ ሰዓት በሲስተሙ ውስጥ የሚገኙትን ሁሉንም ተማሪዎች፣ መምህራን እና ውጤቶች የያዘ JSON አውርድ።',
                        'Download a complete JSON backup of all current students, courses, instructors, and grades.'
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => {
                        const fullBackup = {
                          version: '3.0',
                          timestamp: new Date().toISOString(),
                          students: currentStudents,
                          courses: currentCourses,
                          grades: currentGrades
                        };
                        handleDownloadJson(fullBackup, `birbir_backup_${new Date().toISOString().slice(0, 10)}.json`);
                      }}
                      className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{t('ሙሉ ባክአፕ አውርድ (Export)', 'Export Full Backup')}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ANALYSIS & INSPECTION RESULTS */}
          {analysis && (
            <div className="space-y-4 pt-2">
              {analysis.isValid ? (
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-3xl p-5 space-y-4">
                  {/* Status Headline */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-emerald-500 text-white rounded-xl shadow-xs">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 text-sm">
                            {t('የJSON ፋይሉ በተሳካ ሁኔታ ተነቧል! (Valid JSON Detected)', 'Valid JSON Detected!')}
                          </h4>
                          <span className="bg-indigo-100 text-indigo-800 text-[10px] px-2.5 py-0.5 rounded-full font-bold">
                            {analysis.detectedTypeLabel}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">
                          {t(
                            'የተገኘው መረጃ ተተንትኖ ዝግጁ ሆኗል። ከዚህ በታች ያሉትን ዝርዝሮች ይመልከቱ፦',
                            'Parsed data is ready for review. Inspect the summary below:'
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Muluken Highlight Badge */}
                    {analysis.hasMuluken && (
                      <div className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 px-3 py-1 rounded-full text-xs font-black shadow-sm">
                        <Sparkles className="w-4 h-4 text-slate-950" />
                        <span>{t('✨ ሙሉቀን ዘለቀ ፋልታሞ በዚህ ፋይል ውስጥ ተገኝቷል!', '✨ Muluken Zeleke Faltamo found in this file!')}</span>
                      </div>
                    )}
                  </div>

                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="bg-white p-3 rounded-2xl border border-emerald-100 shadow-xs">
                      <span className="text-slate-500 block font-medium">{t('የተገኙ ውጤቶች', 'Grades Found')}</span>
                      <span className="text-lg font-black text-indigo-700">{analysis.gradesCount}</span>
                    </div>
                    <div className="bg-white p-3 rounded-2xl border border-emerald-100 shadow-xs">
                      <span className="text-slate-500 block font-medium">{t('የተማሪዎች ብዛት', 'Students Count')}</span>
                      <span className="text-lg font-black text-emerald-700">
                        {analysis.studentsCount > 0 ? analysis.studentsCount : t('ነባር ተማሪዎች', 'Existing Students')}
                      </span>
                    </div>
                    <div className="bg-white p-3 rounded-2xl border border-emerald-100 shadow-xs">
                      <span className="text-slate-500 block font-medium">{t('የኮርሶች ብዛት', 'Courses Count')}</span>
                      <span className="text-lg font-black text-slate-800">
                        {analysis.coursesCount > 0 ? analysis.coursesCount : t('ነባር ኮርሶች', 'Existing Courses')}
                      </span>
                    </div>
                    <div className="bg-white p-3 rounded-2xl border border-emerald-100 shadow-xs">
                      <span className="text-slate-500 block font-medium">{t('ተመራቂ ተማሪዎች', 'Graduating Candidates')}</span>
                      <span className="text-lg font-black text-amber-700">
                        {analysis.candidateStudentsFound.length} {t('ተገኝተዋል', 'Found')}
                      </span>
                    </div>
                  </div>

                  {/* Candidate List If Found */}
                  {analysis.candidateStudentsFound.length > 0 && (
                    <div className="bg-white p-3 rounded-2xl border border-amber-200">
                      <span className="text-[11px] font-bold text-amber-900 block mb-1">
                        {t('በዚህ ፋይል ውስጥ የተገኙ የተመራቂ ተማሪዎች ዝርዝር፦', 'Graduating candidates detected in this file:')}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {analysis.candidateStudentsFound.map((name, idx) => (
                          <span
                            key={idx}
                            className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${
                              name.includes('ሙሉቀን')
                                ? 'bg-amber-100 text-amber-900 border-amber-300 ring-1 ring-amber-400'
                                : 'bg-slate-100 text-slate-800 border-slate-200'
                            }`}
                          >
                            {name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Preview Table of Grades */}
                  {analysis.previewGrades.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800 flex items-center gap-1.5">
                          <Eye className="w-3.5 h-3.5 text-indigo-600" />
                          {t(
                            `የውጤቶች ቅድመ-እይታ (የመጀመሪያዎቹ ${analysis.previewGrades.length} ኮርሶች)፦`,
                            `Grades Preview (First ${analysis.previewGrades.length} entries):`
                          )}
                        </span>
                      </div>
                      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden max-h-48 overflow-y-auto">
                        <table className="w-full text-left text-[11px]">
                          <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 sticky top-0">
                            <tr>
                              <th className="px-3 py-2">{t('የተማሪ መለያ', 'Student ID')}</th>
                              <th className="px-3 py-2">{t('የኮርስ መለያ', 'Course ID')}</th>
                              <th className="px-3 py-2 text-center">{t('ውጤት (%)', 'Score (%)')}</th>
                              <th className="px-3 py-2 text-center">{t('ደረጃ', 'Grade')}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium">
                            {analysis.previewGrades.map((g, idx) => (
                              <tr
                                key={idx}
                                className={`hover:bg-slate-50 ${
                                  g.key.includes('201811') ? 'bg-amber-50/60 font-bold' : ''
                                }`}
                              >
                                <td className="px-3 py-1.5 text-slate-800">
                                  {g.key.includes('201811') ? t('★ ሙሉቀን ዘለቀ (201811)', '★ Muluken Zeleke (201811)') : g.studentUid}
                                </td>
                                <td className="px-3 py-1.5 text-slate-600 font-mono text-[10px]">{g.courseId}</td>
                                <td className="px-3 py-1.5 text-center font-bold text-indigo-700">{g.total}%</td>
                                <td className="px-3 py-1.5 text-center">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                    g.letter.startsWith('A') ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                                  }`}>
                                    {g.letter}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Import Configuration Options */}
                  <div className="pt-2 border-t border-emerald-200 space-y-3">
                    <span className="text-xs font-bold text-slate-800 block">
                      {t('የመጫኛ ምርጫዎች (Import Action Mode)፦', 'Import Action Mode:')}
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <label
                        className={`p-3 rounded-2xl border text-xs cursor-pointer transition-all flex items-start gap-2.5 ${
                          importMode === 'MERGE_GRADES'
                            ? 'bg-indigo-50 border-indigo-400 ring-2 ring-indigo-400 text-indigo-950'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="importMode"
                          checked={importMode === 'MERGE_GRADES'}
                          onChange={() => setImportMode('MERGE_GRADES')}
                          className="mt-0.5 text-indigo-600"
                        />
                        <div>
                          <span className="font-bold block">{t('ውጤቶችን ብቻ አዋህድ (Merge Grades)', 'Merge Grades Only')}</span>
                          <span className="text-[10px] text-slate-500">
                            {t(
                              'ነባር ተማሪዎችን ሳትነካ የተገኙትን ውጤቶች አሁን ካለው ጋር ያዋህዳል (የተመከረ)።',
                              'Merges imported grades with existing records without overwriting student profiles (Recommended).'
                            )}
                          </span>
                        </div>
                      </label>

                      <label
                        className={`p-3 rounded-2xl border text-xs cursor-pointer transition-all flex items-start gap-2.5 ${
                          importMode === 'REPLACE_ALL'
                            ? 'bg-indigo-50 border-indigo-400 ring-2 ring-indigo-400 text-indigo-950'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="importMode"
                          checked={importMode === 'REPLACE_ALL'}
                          onChange={() => setImportMode('REPLACE_ALL')}
                          className="mt-0.5 text-indigo-600"
                        />
                        <div>
                          <span className="font-bold block">{t('ሁሉንም ጫንና ተካ (Restore All)', 'Restore & Replace All')}</span>
                          <span className="text-[10px] text-slate-500">
                            {t(
                              'የሲስተሙን መረጃ በፋይሉ ውስጥ ባለው ሙሉ በሙሉ ይተካል።',
                              'Fully replaces system records with the contents of this file.'
                            )}
                          </span>
                        </div>
                      </label>

                      <label
                        className={`p-3 rounded-2xl border text-xs cursor-pointer transition-all flex items-start gap-2.5 ${
                          importMode === 'APPEND_MISSING'
                            ? 'bg-indigo-50 border-indigo-400 ring-2 ring-indigo-400 text-indigo-950'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="importMode"
                          checked={importMode === 'APPEND_MISSING'}
                          onChange={() => setImportMode('APPEND_MISSING')}
                          className="mt-0.5 text-indigo-600"
                        />
                        <div>
                          <span className="font-bold block">{t('የጎደሉትን ብቻ ጨምር (Append Only)', 'Append Missing Only')}</span>
                          <span className="text-[10px] text-slate-500">
                            {t(
                              'አስቀድሞ ውጤት የተሞላባቸውን ሳይቀይር ያልነበሩትን ብቻ ያሟላል።',
                              'Fills in only missing grades without altering existing scores.'
                            )}
                          </span>
                        </div>
                      </label>
                    </div>

                    {/* Sync to Firebase Toggle */}
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="syncToFirebaseCheck"
                        checked={syncToFirebase}
                        onChange={(e) => setSyncToFirebase(e.target.checked)}
                        className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                      />
                      <label htmlFor="syncToFirebaseCheck" className="text-xs font-bold text-slate-800 cursor-pointer flex items-center gap-1.5">
                        <Cloud className="w-4 h-4 text-emerald-600" />
                        <span>{t('ውጤቱ ወደፊት እንዳይጠፋ በቀጥታ ወደ Firebase Cloud ዳታቤዝም ይጫን (Push to Firebase Firestore)', 'Also sync directly to Firebase Cloud Firestore')}</span>
                      </label>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-rose-50 border border-rose-200 rounded-3xl p-5 flex items-start gap-3 text-xs text-rose-900">
                  <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold">{t('የJSON ፋይል ንባብ ስህተት (Parsing Error)', 'JSON Parsing Error')}</h5>
                    <p className="mt-1 text-rose-800">{analysis.error}</p>
                    <p className="mt-2 text-[11px] text-slate-600">
                      {t(
                        'እባክዎ ትክክለኛ የJSON ጽሑፍ መሆኑን ያረጋግጡ ወይም ከላይ ካሉት "ዝግጁ ናሙናዎች" አንዱን ይሞክሩ።',
                        'Please verify that the content is valid JSON or try one of the pre-built templates above.'
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            {t('ይቅር / ዝጋ (Cancel)', 'Cancel / Close')}
          </button>

          <button
            onClick={handleApply}
            disabled={!analysis || !analysis.isValid || isApplying}
            className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-all cursor-pointer ${
              !analysis || !analysis.isValid || isApplying
                ? 'bg-slate-400 cursor-not-allowed opacity-60'
                : 'bg-emerald-600 hover:bg-emerald-700 hover:shadow-lg'
            }`}
          >
            {isApplying ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{t('መረጃውን ወደ ሲስተሙ በመጫን ላይ...', 'Applying data to system...')}</span>
              </>
            ) : (
              <>
                <CheckCheck className="w-4 h-4 text-amber-300" />
                <span>
                  {analysis?.hasMuluken
                    ? t('✨ የሙሉቀን ዘለቀ ፋልታሞንና ሁሉንም ውጤቶች ወደ ሲስተም ጫን (Apply & Restore)', '✨ Apply & Restore All Records (incl. Muluken)')
                    : t('መረጃውን ወደ ሲስተም ጫን (Apply JSON to System)', 'Apply JSON to System')}
                </span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
