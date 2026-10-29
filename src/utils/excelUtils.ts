import * as XLSX from 'xlsx';
import { Course, GradeBreakdown, Student } from '../types.ts';
import {
  calculateStudentGPA,
  getCourseAssessmentItems,
  getCriterionScore,
  getEffectiveGradeValues,
  getGradeKey,
  resolveGradeBreakdown
} from './gradeCalculations.ts';

export interface ParsedGradeRow {
  studentUid: string;
  studentId: string;
  studentName: string;
  scores: Record<string, number>;
  totalScore?: number;
  isValid: boolean;
  notes?: string;
}

export interface ParseExcelResult {
  success: boolean;
  courseId: string;
  totalRows: number;
  matchedStudentsCount: number;
  rows: ParsedGradeRow[];
  warnings: string[];
  errors: string[];
}

/**
 * Clean and normalize a header string for matching
 */
function normalizeHeader(str: any): string {
  if (!str) return '';
  return String(str).toLowerCase().replace(/[\s\-_()%]/g, '');
}

/**
 * Export course grades to a formatted Microsoft Excel (.xlsx) file
 */
export function exportCourseGradesToExcel(
  course: Course,
  students: Student[],
  grades: Record<string, GradeBreakdown>,
  currentYear: string,
  currentSemester: string
) {
  let effectiveGrades = { ...grades };
  try {
    const stored = localStorage.getItem('bk_grades');
    if (stored) {
      const parsed = JSON.parse(stored);
      effectiveGrades = { ...parsed, ...grades };
    }
  } catch (_) {}

  const enrolled = students.filter((s) => s.program === course.program);
  const criteria = getCourseAssessmentItems(course);
  const totalWeight = criteria.reduce((sum, it) => sum + (Number(it.max) || 0), 0);
  const targetYear = course.academicYear || currentYear;
  const targetSem = course.semester || currentSemester;

  // Metadata rows
  const rows: any[][] = [
    ['የብርብር ከተማ ቃለ ሕይወት ቤተ ክርስቲያን መጽሐፍ ቅዱስ ትምህርት ቤት'],
    ['ይፋዊ የኮርስ ውጤት ሰነድ (Official Course Grade Sheet)'],
    [
      `የትምህርት ዓይነት: ${course.code ? `[${course.code}] ` : ''}${course.name}`,
      `ፕሮግራም: ${course.program}`,
      `መምህር: ${course.teacher}`,
      `የትምህርቱ ጊዜ / ክሬዲት: ${course.credits} ክሬዲት ሰዓት`
    ],

    [
      `የትምህርት ዘመን: ${targetYear} ዓ.ም`,
      `ሴሚስተር: ${targetSem}ኛ ሴሚስተር`,
      `የተማሪዎች ብዛት: ${enrolled.length}`,
      `ቀን: ${new Date().toLocaleDateString('en-GB')}`
    ],
    [] // blank line
  ];

  // Table headers
  const headerRow = [
    'ተ.ቁ',
    'መለያ ቁጥር (ID)',
    'የተማሪ ሙሉ ስም',
    'ጾታ'
  ];

  criteria.forEach((it) => {
    headerRow.push(`${it.label} (${it.max}%)`);
  });

  headerRow.push(`ጠቅላላ ድምር (${totalWeight}%)`, 'የውጤት ፊደል', 'ነጥብ (Points)', 'አስተያየት');
  rows.push(headerRow);

  // Data rows
  let totalScoreSum = 0;
  let gradedCount = 0;

  enrolled.forEach((student, idx) => {
    const g = resolveGradeBreakdown(effectiveGrades, student.uid, course.id, targetYear, targetSem, student.id);
    const eff = getEffectiveGradeValues(g, criteria);

    if (eff.hasAny) {
      totalScoreSum += eff.total;
      gradedCount++;
    }

    const row: any[] = [
      idx + 1,
      student.id,
      student.name,
      student.gender || '—'
    ];

    criteria.forEach((it, itemIdx) => {
      const score = getCriterionScore(g, it.id, itemIdx);
      row.push(score > 0 ? score : (eff.hasAny ? 0 : ''));
    });

    row.push(
      eff.hasAny ? eff.total : '',
      eff.hasAny ? eff.letter : '',
      eff.hasAny ? eff.points.toFixed(2) : '',
      eff.hasAny ? (eff.points >= 2.0 ? 'አልፏል' : 'ደካማ/ወድቋል') : 'ውጤት አልገባም'
    );

    rows.push(row);
  });

  // Summary statistics row
  rows.push([]);
  const classAvg = gradedCount > 0 ? (totalScoreSum / gradedCount).toFixed(1) : '0.0';
  rows.push([
    'ማጠቃለያ',
    `ተፈታኝ ተማሪዎች: ${gradedCount} / ${enrolled.length}`,
    `የክፍሉ አማካይ ውጤት (Class Average): ${classAvg}%`,
    '',
    ...criteria.map(() => ''),
    '',
    '',
    '',
    ''
  ]);

  // Create worksheet and workbook
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Set column widths
  const colWidths = [
    { wch: 8 },  // ተ.ቁ
    { wch: 18 }, // መለያ ቁጥር
    { wch: 28 }, // ስም
    { wch: 10 }  // ጾታ
  ];
  criteria.forEach(() => colWidths.push({ wch: 18 }));
  colWidths.push({ wch: 20 }, { wch: 14 }, { wch: 16 }, { wch: 20 });
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'ውጤት');

  // Trigger download
  const cleanCourseName = course.name.replace(/[\/\\?%*:|"<>]/g, '_');
  const filename = `ውጤት_${cleanCourseName}_${course.program}_${currentYear}.xlsx`;
  XLSX.writeFile(wb, filename);
}

/**
 * Export comprehensive multi-program master grade sheet to Excel (.xlsx)
 * Contains all courses, student details, semester GPA, and statistics.
 */
export function exportMasterGradesToExcel(
  students: Student[],
  courses: Course[],
  grades: Record<string, GradeBreakdown>,
  currentYear: string,
  currentSemester: string
) {
  const wb = XLSX.utils.book_new();

  // Helper to build a program or overall sheet
  const buildSheet = (studentList: Student[], title: string) => {
    const rows: any[][] = [
      ['የብርብር ከተማ ቃለ ሕይወት ቤተ ክርስቲያን መጽሐፍ ቅዱስ ትምህርት ቤት'],
      [`የተማሪዎች አጠቃላይ የውጤት መዝገብ — ${title} (Master Grade Sheet)`],
      [
        `የትምህርት ዘመን: ${currentYear} ዓ.ም (እንደ ኢትዮጵያ ዘመን አቆጣጠር)`,
        `ሴሚስተር: ${currentSemester}ኛ ሴሚስተር`,
        `ጠቅላላ ተማሪዎች: ${studentList.length}`,
        `የወጣበት ቀን: ${new Date().toLocaleDateString('en-GB')}`
      ],
      []
    ];

    // Relevant courses for this student group
    const relevantCourses = courses.filter((c) =>
      studentList.some((s) => s.program === c.program)
    );

    const header = [
      'ተ.ቁ',
      'መለያ ቁጥር (ID)',
      'የተማሪ ሙሉ ስም',
      'ጾታ',
      'ፕሮግራም',
      'የትምህርት ደረጃ / ዓመት'
    ];

    relevantCourses.forEach((c) => {
      header.push(`${c.name} (${c.credits}Cr)`);
    });

    header.push('ጠቅላላ ክሬዲት', 'ጠቅላላ ነጥብ (Points)', 'የሴሚስተር GPA', 'ደረጃ / ማዕረግ');
    rows.push(header);

    studentList.forEach((s, idx) => {
      let totalCreds = 0;
      let totalPts = 0;

      const row: any[] = [
        idx + 1,
        s.id,
        s.name,
        s.gender || '—',
        s.program,
        s.currentStudyYear ? `${s.currentStudyYear}ኛ ዓመት` : '1ኛ ዓመት'
      ];

      relevantCourses.forEach((c) => {
        if (c.program === s.program) {
          const g = resolveGradeBreakdown(grades, s.uid, c.id, currentYear, currentSemester, s.id);
          const eff = getEffectiveGradeValues(g, getCourseAssessmentItems(c));
          if (eff.hasAny) {
            totalCreds += c.credits;
            totalPts += eff.points * c.credits;
            row.push(`${eff.total} (${eff.letter})`);
          } else {
            row.push('—');
          }
        } else {
          row.push('N/A');
        }
      });

      const gpa = totalCreds > 0 ? (totalPts / totalCreds).toFixed(2) : '0.00';
      const numGpa = Number(gpa);
      const standing = numGpa >= 3.8 ? 'በጣም ከፍተኛ ማዕረግ' : numGpa >= 3.5 ? 'ከፍተኛ ማዕረግ' : numGpa >= 2.0 ? 'አልፏል' : 'ዝቅተኛ';

      row.push(totalCreds, totalPts.toFixed(2), gpa, standing);
      rows.push(row);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const colWidths = [
      { wch: 6 },
      { wch: 16 },
      { wch: 28 },
      { wch: 8 },
      { wch: 12 },
      { wch: 16 }
    ];
    relevantCourses.forEach(() => colWidths.push({ wch: 20 }));
    colWidths.push({ wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 20 });
    ws['!cols'] = colWidths;
    return ws;
  };

  // Sheet 1: Master All Students
  const wsAll = buildSheet(students, 'ጠቅላላ ተማሪዎች');
  XLSX.utils.book_append_sheet(wb, wsAll, 'አጠቃላይ_ውጤት');

  // Sheet 2: Degree Program
  const degreeStudents = students.filter((s) => s.program === 'Degree');
  if (degreeStudents.length > 0) {
    const wsDegree = buildSheet(degreeStudents, 'የድግሪ ፕሮግራም');
    XLSX.utils.book_append_sheet(wb, wsDegree, 'ድግሪ_ተማሪዎች');
  }

  // Sheet 3: Diploma Program
  const diplomaStudents = students.filter((s) => s.program === 'Diploma');
  if (diplomaStudents.length > 0) {
    const wsDiploma = buildSheet(diplomaStudents, 'የዲፕሎማ ፕሮግራም');
    XLSX.utils.book_append_sheet(wb, wsDiploma, 'ዲፕሎማ_ተማሪዎች');
  }

  const filename = `አጠቃላይ_የተማሪዎች_ውጤት_መዝገብ_${currentYear}_${currentSemester}ኛ_ሴሚስተር.xlsx`;
  XLSX.writeFile(wb, filename);
}

/**
 * Generate a pre-filled Excel template (.xlsx) for this course
 * with student IDs and names pre-populated so teachers/admins just fill in scores!
 */
export function downloadCourseGradeTemplateExcel(
  course: Course,
  students: Student[]
) {
  const enrolled = students.filter((s) => s.program === course.program);
  const criteria = getCourseAssessmentItems(course);

  const rows: any[][] = [
    ['የውጤት ማስገቢያ አብነት (Grade Entry Template)'],
    [`ኮርስ: ${course.name} (${course.program}) | መምህር: ${course.teacher}`],
    ['መመሪያ፡ መለያ ቁጥር (ID) እና የተማሪ ስም እንዳይቀይሩ። በእያንዳንዱ መመዘኛ ስር ብቻ የቁጥር ውጤት ይሙሉ!'],
    []
  ];

  // Header row
  const headerRow = ['መለያ ቁጥር (ID)', 'የተማሪ ስም'];
  criteria.forEach((it) => {
    headerRow.push(`${it.label} (ከ ${it.max}%)`);
  });
  headerRow.push('አስተያየት');
  rows.push(headerRow);

  // Enrolled student rows
  enrolled.forEach((student) => {
    const row: any[] = [student.id, student.name];
    criteria.forEach(() => row.push('')); // blank for teacher to fill
    row.push('');
    rows.push(row);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 18 },
    { wch: 28 },
    ...criteria.map(() => ({ wch: 20 })),
    { wch: 22 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'የውጤት_አብነት');

  const cleanCourseName = course.name.replace(/[\/\\?%*:|"<>]/g, '_');
  const filename = `የውጤት_አብነት_${cleanCourseName}_${course.program}.xlsx`;
  XLSX.writeFile(wb, filename);
}

/**
 * Deep Amharic name normalizer for robust student matching.
 * Normalizes Ge'ez homophones, removes ecclesiastical/civic titles, punctuation, and extra spaces.
 */
export function normalizeAmharicForMatch(str: any): string {
  if (str === null || str === undefined) return '';
  let s = String(str).trim().toLowerCase();

  // 1. Remove ecclesiastical, academic, and civic prefixes/titles
  s = s.replace(/^(ዲ\/[ንቆ]|ዲያቆን|መ\/ር|መምህር|ፓ\/ር|ፓስተር|ቀሲስ|ቀ\/ስ|ተማሪ|አቶ|ወ\/ሮ|ወ\/ሪት|ወ\/ር|ዶ\/ር|dr\.?|pastor|deacon|mr\.?|mrs\.?|ms\.?)\s+/i, '');
  s = s.replace(/\s+(ዲ\/[ንቆ]|ዲያቆን|መ\/ር|መምህር|ፓ\/ር|ፓስተር|ቀሲስ|ቀ\/ስ|ተማሪ|አቶ|ወ\/ሮ|ወ\/ሪት|ወ\/ር|ዶ\/ር)$/i, '');

  // 2. Normalize Ge'ez / Amharic homophones
  s = s
    // ha variants (ሀ, ሐ, ኀ, ኻ)
    .replace(/[ሀሐኀኻ]/g, 'ሀ')
    .replace(/[ሁሑኁኹ]/g, 'ሁ')
    .replace(/[ሂሒኂኺ]/g, 'ሂ')
    .replace(/[ሃሓኃኻ]/g, 'ሃ')
    .replace(/[ሄሔኄኼ]/g, 'ሄ')
    .replace(/[ህሕኅኽ]/g, 'ህ')
    .replace(/[ሆሖኆኾ]/g, 'ሆ')
    // se variants (ሰ, ሠ)
    .replace(/[ሰሠ]/g, 'ሰ')
    .replace(/[ሱሡ]/g, 'ሱ')
    .replace(/[ሲሢ]/g, 'ሲ')
    .replace(/[ሳሣ]/g, 'ሳ')
    .replace(/[ሴሤ]/g, 'ሴ')
    .replace(/[ስሥ]/g, 'ስ')
    .replace(/[ሶሦ]/g, 'ሶ')
    // a variants (አ, ዐ, ዓ, ኣ)
    .replace(/[አዐዓኣ]/g, 'አ')
    .replace(/[ኡዑ]/g, 'ኡ')
    .replace(/[ኢዒ]/g, 'ኢ')
    .replace(/[ኤዔ]/g, 'ኤ')
    .replace(/[እዕ]/g, 'እ')
    .replace(/[ኦዖ]/g, 'ኦ')
    // tse variants (ጸ, ፀ)
    .replace(/[ጸፀ]/g, 'ጸ')
    .replace(/[ጹፁ]/g, 'ጹ')
    .replace(/[ጺፂ]/g, 'ጺ')
    .replace(/[ጻፃ]/g, 'ጻ')
    .replace(/[ጼፄ]/g, 'ጼ')
    .replace(/[ጽፅ]/g, 'ጽ')
    .replace(/[ጾፆ]/g, 'ጾ')
    // we variants (e.g. ከፍያለዉ vs ከፍያለው)
    .replace(/ዉ/g, 'ው')
    .replace(/ዪ/g, 'ይ');

  // 3. Keep only Amharic letters, English letters, and single space
  s = s.replace(/[^\u1200-\u137Fa-zA-Z\s]/g, ' ').replace(/\s+/g, ' ').trim();
  return s;
}

/**
 * Calculates a match confidence score (0 to 100) between a cell string and a registered student name.
 */
export function matchStudentNameScore(cellVal: any, studentName: string): number {
  if (cellVal === null || cellVal === undefined) return 0;
  const rawStr = String(cellVal).trim();
  if (rawStr.length < 2) return 0;

  // Numbers (serial numbers, IDs, scores) are not student names
  if (/^\d+(\.\d+)?$/.test(rawStr)) return 0;

  const normCell = normalizeAmharicForMatch(rawStr);
  const normTarget = normalizeAmharicForMatch(studentName);
  if (!normCell || !normTarget) return 0;

  const compactCell = normCell.replace(/\s+/g, '');
  const compactTarget = normTarget.replace(/\s+/g, '');

  // 1. Exact match (ignoring whitespace)
  if (compactCell === compactTarget) return 100;

  // 2. Tokenized match (First Name + Father's Name)
  const cellWords = normCell.split(/\s+/).filter(Boolean);
  const targetWords = normTarget.split(/\s+/).filter(Boolean);

  if (cellWords.length >= 2 && targetWords.length >= 2) {
    if (cellWords[0] === targetWords[0] && cellWords[1] === targetWords[1]) {
      return 95; // Absolute match on First Name + Father's Name!
    }
  }

  // 3. Substring containment (e.g. system has 3 names, Excel has 2 names, or vice-versa)
  if (compactCell.length >= 5 && compactTarget.length >= 5) {
    if (compactTarget.includes(compactCell) || compactCell.includes(compactTarget)) {
      return 90;
    }
  }

  // 4. First word matches and one other word matches
  if (cellWords.length >= 1 && targetWords.length >= 1 && cellWords[0] === targetWords[0]) {
    const hasOtherMatch =
      cellWords.slice(1).some((w) => targetWords.includes(w)) ||
      targetWords.slice(1).some((w) => cellWords.includes(w));
    if (hasOtherMatch) return 85;
  }

  return 0;
}

/**
 * Checks if a cell string matches a student's official ID (e.g. '201802', 'dip_201802').
 * Avoids false matches on serial numbers like 1, 2, 3.
 */
export function isExactStudentIdMatch(cellVal: any, studentId: string): boolean {
  if (cellVal === null || cellVal === undefined) return false;
  const str = String(cellVal).trim();
  if (!str) return false;

  const cleanCell = str.toLowerCase().replace(/[\s\-_]/g, '');
  const cleanId = studentId.toLowerCase().replace(/[\s\-_]/g, '');

  if (cleanCell === cleanId) return true;

  // Digits match — require at least 4 digits to prevent serial numbers 1-50 from matching!
  const cellDigits = str.replace(/\D/g, '');
  const idDigits = studentId.replace(/\D/g, '');
  if (cellDigits.length >= 4 && idDigits.length >= 4 && cellDigits === idDigits) {
    return true;
  }

  return false;
}

/**
 * Extract first numeric value from a cell string (e.g. "85/100" -> 85, "18.5%" -> 18.5)
 */
function extractScoreNumber(val: any): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  const str = String(val).trim();
  if (str === '' || str === '—' || str === '-') return null;
  const match = str.match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const num = parseFloat(match[0]);
  return isNaN(num) ? null : num;
}

/**
 * Simple text cleaner for header inspection
 */
function cleanText(str: any): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .trim()
    .toLowerCase()
    .replace(/[\s\-_/\\,():.%]/g, '');
}

/**
 * Universal forgiving parser for uploaded Excel/CSV files.
 * Matches students primarily by their name wherever it appears in the spreadsheet,
 * and flexibly extracts assessment scores regardless of column layout or teacher formatting.
 */
export async function parseExcelGradesFile(
  file: File,
  course: Course,
  students: Student[]
): Promise<ParseExcelResult> {
  const enrolled = students.filter((s) => s.program === course.program);
  const targetStudents = enrolled.length > 0 ? enrolled : students;
  const criteria = getCourseAssessmentItems(course);
  const totalWeight = criteria.reduce((sum, it) => sum + (Number(it.max) || 0), 0) || 100;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          resolve({
            success: false,
            courseId: course.id,
            totalRows: 0,
            matchedStudentsCount: 0,
            rows: [],
            warnings: [],
            errors: ['የተመረጠው ኤክሴል ፋይል ምንም ሉህ (Sheet) የለውም!']
          });
          return;
        }

        const worksheet = workbook.Sheets[sheetName];
        const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        if (!rawRows || rawRows.length === 0) {
          resolve({
            success: false,
            courseId: course.id,
            totalRows: 0,
            matchedStudentsCount: 0,
            rows: [],
            warnings: [],
            errors: ['የኤክሴል ሰነዱ ባዶ ነው!']
          });
          return;
        }

        const maxCols = Math.max(...rawRows.map((r) => (r ? r.length : 0)));

        // 1. Detect Header Row dynamically by counting header-like keywords
        let headerRowIndex = -1;
        let maxHeaderScore = 0;

        for (let r = 0; r < Math.min(15, rawRows.length); r++) {
          const row = rawRows[r] || [];
          let score = 0;
          for (let c = 0; c < row.length; c++) {
            const h = cleanText(row[c]);
            if (
              h.includes('ስም') ||
              h.includes('name') ||
              h.includes('ተማሪ') ||
              h.includes('student') ||
              h.includes('መለያ') ||
              h.includes('id') ||
              h.includes('ምዘና') ||
              h.includes('ሚድ') ||
              h.includes('ፋይናል') ||
              h.includes('ፈተና') ||
              h.includes('አሳይመንት') ||
              h.includes('ተሳትፎ') ||
              h.includes('ድምር') ||
              h.includes('ጠቅላላ') ||
              h.includes('total') ||
              h.includes('ውጤት')
            ) {
              score++;
            }
          }
          if (score > maxHeaderScore) {
            maxHeaderScore = score;
            headerRowIndex = r;
          }
        }

        if (headerRowIndex === -1) {
          // If no explicit header row found, assume row 0
          headerRowIndex = 0;
        }

        const headerRow = rawRows[headerRowIndex] || [];

        // 2. Identify Column Roles from Header Row
        let idColIndex = -1;
        let nameColIndex = -1;
        let serialColIndex = -1;
        let totalColIndex = -1;
        const criterionColMap: Record<string, number> = {};
        const warnings: string[] = [];

        for (let c = 0; c < maxCols; c++) {
          const h = cleanText(headerRow[c]);
          if (!h) continue;

          // Serial number (ተ.ቁ / No) - must NOT be confused with Student ID!
          if (
            h === 'ተቁ' ||
            h === 'ተራቁጥር' ||
            h === 'no' ||
            h === 'sn' ||
            h === 'sr' ||
            h === '#'
          ) {
            serialColIndex = c;
            continue;
          }

          // Student ID
          if (
            (h.includes('መለያ') ||
              h.includes('studentid') ||
              h.includes('አይዲ') ||
              h === 'id' ||
              h.includes('code')) &&
            !h.includes('ስም')
          ) {
            if (idColIndex === -1) idColIndex = c;
            continue;
          }

          // Student Name
          if (
            h.includes('ስም') ||
            h.includes('name') ||
            h.includes('ተማሪ') ||
            h.includes('student') ||
            h.includes('fullname')
          ) {
            if (nameColIndex === -1) nameColIndex = c;
            continue;
          }

          // Total score column
          if (
            h.includes('total') ||
            h.includes('ድምር') ||
            h.includes('ጠቅላላ') ||
            h.includes('100')
          ) {
            if (totalColIndex === -1) totalColIndex = c;
            continue;
          }
        }

        // Try mapping specific criteria by header label
        criteria.forEach((crit, critIdx) => {
          const critNorm = cleanText(crit.label);
          for (let c = 0; c < maxCols; c++) {
            if (c === idColIndex || c === nameColIndex || c === serialColIndex || c === totalColIndex) continue;
            const h = cleanText(headerRow[c]);
            if (!h) continue;

            const isDirectMatch = h.includes(critNorm) || critNorm.includes(h);
            const isKeywordMatch =
              (critIdx === 0 && (h.includes('p1') || h.includes('ክፍል1') || h.includes('part1') || h.includes('ፈተና1') || h.includes('ምዘና1'))) ||
              (critIdx === 1 && (h.includes('p2') || h.includes('ክፍል2') || h.includes('part2') || h.includes('ፈተና2') || h.includes('ምዘና2'))) ||
              (crit.label.includes('ሚድ') && (h.includes('mid') || h.includes('ሚድ') || h.includes('መንፈቅ') || h.includes('አጋማሽ'))) ||
              (crit.label.includes('ፋይናል') && (h.includes('final') || h.includes('ፋይናል') || h.includes('ማጠቃለያ') || h.includes('የመጨረሻ') || h.includes('ፈተና'))) ||
              (crit.label.includes('ተሳትፎ') && (h.includes('att') || h.includes('ተሳትፎ') || h.includes('ስነምግባር')));

            if (isDirectMatch || isKeywordMatch) {
              criterionColMap[crit.id] = c;
              break;
            }
          }
        });

        // 3. Parse Data Rows & Flexibly Match Students by Name Wherever It Appears
        const parsedRows: ParsedGradeRow[] = [];
        let matchedCount = 0;
        let dataRowSequence = 0;
        const matchedUids = new Set<string>();

        for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
          const row = rawRows[r] || [];
          if (!row || row.every((c) => String(c).trim() === '')) continue;

          // Check if this row is an accidental duplicate header row
          const isAnotherHeader = row.some((c) => {
            const h = cleanText(c);
            return h.includes('የተማሪስም') || h.includes('መለያቁጥር') || h.includes('studentid');
          });
          if (isAnotherHeader) continue;

          // Step A: Search for Student Name in ANY cell of this row!
          let matchedStudent: Student | null = null;
          let bestNameScore = 0;
          let nameCellIndex = -1;
          let rawExcelName = '';

          // 1. Check all cells for student name in targetStudents (enrolled students)
          for (let c = 0; c < row.length; c++) {
            if (c === serialColIndex) continue;
            const cellVal = row[c];
            if (typeof cellVal !== 'string' || cellVal.trim().length < 2) continue;

            for (const s of targetStudents) {
              const score = matchStudentNameScore(cellVal, s.name);
              if (score > bestNameScore && score >= 80) {
                bestNameScore = score;
                matchedStudent = s;
                nameCellIndex = c;
                rawExcelName = String(cellVal).trim();
              }
            }
          }

          // 2. If not found in targetStudents, check all students
          if (!matchedStudent) {
            for (let c = 0; c < row.length; c++) {
              if (c === serialColIndex) continue;
              const cellVal = row[c];
              if (typeof cellVal !== 'string' || cellVal.trim().length < 2) continue;

              for (const s of students) {
                const score = matchStudentNameScore(cellVal, s.name);
                if (score > bestNameScore && score >= 80) {
                  bestNameScore = score;
                  matchedStudent = s;
                  nameCellIndex = c;
                  rawExcelName = String(cellVal).trim();
                }
              }
            }
          }

          // Step B: If still not matched by name, check if any cell matches official Student ID
          let idCellIndex = -1;
          let rawExcelId = '';

          if (!matchedStudent) {
            for (let c = 0; c < row.length; c++) {
              if (c === serialColIndex) continue;
              const cellVal = row[c];
              if (cellVal === null || cellVal === undefined) continue;

              for (const s of targetStudents) {
                if (isExactStudentIdMatch(cellVal, s.id)) {
                  matchedStudent = s;
                  idCellIndex = c;
                  rawExcelId = String(cellVal).trim();
                  break;
                }
              }
              if (matchedStudent) break;
            }

            if (!matchedStudent) {
              for (let c = 0; c < row.length; c++) {
                if (c === serialColIndex) continue;
                const cellVal = row[c];
                if (cellVal === null || cellVal === undefined) continue;

                for (const s of students) {
                  if (isExactStudentIdMatch(cellVal, s.id)) {
                    matchedStudent = s;
                    idCellIndex = c;
                    rawExcelId = String(cellVal).trim();
                    break;
                  }
                }
                if (matchedStudent) break;
              }
            }
          }

          // Step C: Fallback to nameColIndex or idColIndex if identified earlier
          if (!rawExcelName && nameColIndex !== -1 && row[nameColIndex]) {
            rawExcelName = String(row[nameColIndex]).trim();
          }
          if (!rawExcelId && idColIndex !== -1 && row[idColIndex]) {
            rawExcelId = String(row[idColIndex]).trim();
          }

          // Step D: Extract assessment scores from the row
          const scores: Record<string, number> = {};
          let rowTotal = 0;

          // Check if we have mapped criterion columns
          const hasMappedCriteria = Object.keys(criterionColMap).length > 0;

          if (hasMappedCriteria) {
            criteria.forEach((crit) => {
              const colIdx = criterionColMap[crit.id];
              let val = 0;
              if (colIdx !== undefined && colIdx < row.length) {
                const num = extractScoreNumber(row[colIdx]);
                if (num !== null) {
                  val = Math.max(0, Math.min(crit.max, num));
                }
              }
              scores[crit.id] = val;
              rowTotal += val;
            });

            // If criteria sum is 0, check if total column has a score
            if (rowTotal === 0 && totalColIndex !== -1 && totalColIndex < row.length) {
              const totalVal = extractScoreNumber(row[totalColIndex]);
              if (totalVal !== null && totalVal > 0) {
                const capped = Math.max(0, Math.min(100, totalVal));
                rowTotal = capped;
                criteria.forEach((crit) => {
                  const ratio = (Number(crit.max) || 20) / totalWeight;
                  scores[crit.id] = Math.min(crit.max, Math.round(capped * ratio * 10) / 10);
                });
              }
            }
          } else {
            // Flexible layout: collect all valid numeric score cells in the row
            // (excluding the cell containing student name, id, or serial number)
            const numericCandidates: { col: number; val: number }[] = [];

            for (let c = 0; c < row.length; c++) {
              if (c === nameCellIndex || c === idCellIndex || c === serialColIndex) continue;
              if (c === nameColIndex || c === idColIndex) continue;

              const val = row[c];
              // Skip gender or text fields
              if (typeof val === 'string') {
                const clean = cleanText(val);
                if (clean === 'ወንድ' || clean === 'ሴት' || clean === 'm' || clean === 'f') continue;
              }

              const num = extractScoreNumber(val);
              // Valid score range: 0 to 100
              if (num !== null && num >= 0 && num <= 100) {
                numericCandidates.push({ col: c, val: num });
              }
            }

            if (numericCandidates.length === 1) {
              // Single total grade (e.g. 85, 92)
              const totalVal = numericCandidates[0].val;
              rowTotal = totalVal;
              criteria.forEach((crit) => {
                const ratio = (Number(crit.max) || 20) / totalWeight;
                scores[crit.id] = Math.min(crit.max, Math.round(totalVal * ratio * 10) / 10);
              });
            } else if (numericCandidates.length >= criteria.length) {
              // Matches or exceeds number of criteria: assign in order
              criteria.forEach((crit, idx) => {
                const val = Math.min(crit.max, numericCandidates[idx].val);
                scores[crit.id] = val;
                rowTotal += val;
              });
            } else if (numericCandidates.length === 2 && criteria.length > 2) {
              // Common 2-part input: Assessment/Mid + Final Exam
              const firstScore = numericCandidates[0].val;
              const secondScore = numericCandidates[1].val;
              rowTotal = firstScore + secondScore;

              // Assign second score to Final, first score to Mid/P1
              const finalCrit = criteria.find((c) => c.label.includes('ፋይናል')) || criteria[criteria.length - 1];
              const midCrit = criteria.find((c) => c.label.includes('ሚድ')) || criteria[0];

              criteria.forEach((c) => (scores[c.id] = 0));
              if (finalCrit) scores[finalCrit.id] = Math.min(finalCrit.max, secondScore);
              if (midCrit) scores[midCrit.id] = Math.min(midCrit.max, firstScore);
            } else if (numericCandidates.length > 0) {
              // Map whatever candidates exist in order
              numericCandidates.forEach((cand, idx) => {
                if (idx < criteria.length) {
                  const crit = criteria[idx];
                  const val = Math.min(crit.max, cand.val);
                  scores[crit.id] = val;
                  rowTotal += val;
                }
              });
            }
          }

          // Step E: Construct the parsed row result
          if (matchedStudent) {
            matchedCount++;
            matchedUids.add(matchedStudent.uid);

            parsedRows.push({
              studentUid: matchedStudent.uid,
              studentId: matchedStudent.id,
              studentName: matchedStudent.name,
              scores,
              totalScore: Math.round(rowTotal * 10) / 10,
              isValid: true,
              notes: rawExcelName && rawExcelName !== matchedStudent.name
                ? `ከኤክሴል: "${rawExcelName}" ✓`
                : 'በስም ተዛምዷል ✓'
            });
          } else {
            // Unmatched row: allow teacher to select from dropdown in modal
            parsedRows.push({
              studentUid: '',
              studentId: rawExcelId || `ተማሪ #${dataRowSequence + 1}`,
              studentName: rawExcelName || 'ያልታወቀ ተማሪ',
              scores,
              totalScore: Math.round(rowTotal * 10) / 10,
              isValid: false,
              notes: 'በሲስተሙ አልተገኘም (እባክዎ ተማሪውን ይምረጡ)'
            });
          }

          dataRowSequence++;
        }

        // Summary message
        if (matchedCount > 0) {
          warnings.push(`በኤክሴል ከተገኙት ${parsedRows.length} ረድፎች ውስጥ የ${matchedCount} ተማሪዎች ስም በሲስተሙ በቀጥታ ተዛምዷል።`);
        } else if (parsedRows.length > 0) {
          warnings.push('በኤክሴል ሰነዱ የተገኙትን ውጤቶች ከታች ካለው ዝርዝር በመምረጥ ወይም «በቅደም ተከተል አስማማ» በማለት ማዛመድ ይችላሉ።');
        }

        resolve({
          success: parsedRows.length > 0,
          courseId: course.id,
          totalRows: parsedRows.length,
          matchedStudentsCount: matchedCount,
          rows: parsedRows,
          warnings,
          errors: parsedRows.length === 0 ? ['በኤክሴል ሰነዱ ውስጥ ምንም ሊነበብ የሚችል ውጤት አልተገኘም!'] : []
        });
      } catch (err: any) {
        reject(err);
      }
    };

    reader.onerror = () => {
      reject(new Error('ፋይሉን ማንበብ አልተቻለም'));
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Export comprehensive Master Semester Grade Sheet for all students across all courses
 */
export function exportMasterSemesterGradeSheetToExcel(
  students: Student[],
  courses: Course[],
  grades: Record<string, GradeBreakdown>,
  currentYear: string,
  currentSemester: string,
  programFilter: 'ALL' | 'Diploma' | 'Degree' = 'ALL'
) {
  let effectiveGrades = { ...grades };
  try {
    const stored = localStorage.getItem('bk_grades');
    if (stored) {
      const parsed = JSON.parse(stored);
      effectiveGrades = { ...parsed, ...grades };
    }
  } catch (_) {}

  const wb = XLSX.utils.book_new();

  const programsToExport = programFilter === 'ALL' ? ['Diploma', 'Degree'] : [programFilter];

  programsToExport.forEach((prog) => {
    const progStudents = students.filter((s) => s.program === prog);
    const progCourses = courses.filter((c) => c.program === prog);

    const sheetName = prog === 'Diploma' ? 'የዲፕሎማ ተማሪዎች' : 'የድግሪ ተማሪዎች';

    const rows: any[][] = [
      ['የብርብር ከተማ ቃለ ሕይወት ቤተ ክርስቲያን መጽሐፍ ቅዱስ ትምህርት ቤት'],
      [`ይፋዊ የተማሪዎች አጠቃላይ የሴሚስተር ውጤት ዝርዝር ሰነድ (${sheetName})`],
      [
        `የትምህርት ዘመን: ${currentYear} ዓ.ም`,
        `ሴሚስተር: ${currentSemester}ኛ ሴሚስተር`,
        `የተማሪዎች ብዛት: ${progStudents.length}`,
        `የኮርሶች ብዛት: ${progCourses.length}`,
        `የወጣበት ቀን: ${new Date().toLocaleDateString('en-GB')}`
      ],
      []
    ];

    // Header Row
    const headerRow = [
      'ተ.ቁ',
      'መለያ ቁጥር (ID)',
      'የተማሪ ሙሉ ስም',
      'ጾታ',
      'የትምህርት ዓመት'
    ];

    progCourses.forEach((c) => {
      headerRow.push(`${c.name} (${c.credits}cr)`);
    });

    headerRow.push('ጠቅላላ ክሬዲት', 'የሴሚስተር GPA', 'የትምህርት አቋም', 'የምረቃ ሁኔታ');
    rows.push(headerRow);

    // Student Data Rows
    let totalGpaSum = 0;
    let studentsWithGpa = 0;

    progStudents.forEach((student, idx) => {
      const gpaStr = calculateStudentGPA(student, courses, effectiveGrades, currentYear, currentSemester);
      const gpaNum = parseFloat(gpaStr);
      if (!isNaN(gpaNum) && gpaNum > 0) {
        totalGpaSum += gpaNum;
        studentsWithGpa++;
      }

      const studyYearLabel = `${student.currentStudyYear || 1}ኛ ዓመት`;
      const isCandidate = student.graduationStatus === 'CANDIDATE' || student.admissionYear === '2018' || student.id.startsWith('2018');
      const isGraduated = student.graduationStatus === 'GRADUATED';
      const gradLabel = isGraduated ? 'የተመረቀ' : isCandidate ? 'ተማራቂ (2019)' : 'በመማር ላይ';

      const row: any[] = [
        idx + 1,
        student.id,
        student.name,
        student.gender || '—',
        studyYearLabel
      ];

      let studentTotalCredits = 0;

      progCourses.forEach((c) => {
        const targetYear = c.academicYear || currentYear;
        const targetSem = c.semester || currentSemester;
        const g = resolveGradeBreakdown(effectiveGrades, student.uid, c.id, targetYear, targetSem, student.id);
        const eff = getEffectiveGradeValues(g, getCourseAssessmentItems(c));
        if (eff.hasAny) {
          row.push(`${eff.total} (${eff.letter})`);
          studentTotalCredits += c.credits;
        } else {
          row.push('—');
        }
      });

      const standing = gpaNum >= 3.75 ? 'እጅግ ከፍተኛ ማዕረግ (Very Great Distinction)'
        : gpaNum >= 3.50 ? 'ከፍተኛ ማዕረግ (Great Distinction)'
        : gpaNum >= 3.25 ? 'ማዕረግ (Distinction)'
        : gpaNum >= 2.00 ? 'አልፏል (Pass)'
        : gpaNum > 0 ? 'ማስጠንቀቂያ (Warning)'
        : 'ውጤት አልተሞላም';

      row.push(
        studentTotalCredits,
        gpaStr,
        standing,
        gradLabel
      );

      rows.push(row);
    });

    // Summary row
    rows.push([]);
    const avgGpa = studentsWithGpa > 0 ? (totalGpaSum / studentsWithGpa).toFixed(2) : '0.00';
    rows.push([
      'አማካይ ማጠቃለያ',
      `ጠቅላላ ተማሪዎች: ${progStudents.length}`,
      `ውጤት የተሞላላቸው: ${studentsWithGpa}`,
      `የክፍሉ አማካይ GPA: ${avgGpa}`,
      ...progCourses.map(() => ''),
      '',
      '',
      '',
      ''
    ]);

    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Set column widths
    const colWidths = [
      { wch: 7 },
      { wch: 16 },
      { wch: 28 },
      { wch: 8 },
      { wch: 14 },
      ...progCourses.map(() => ({ wch: 20 })),
      { wch: 14 },
      { wch: 16 },
      { wch: 25 },
      { wch: 16 }
    ];
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  const fileName = `የተማሪዎች_አጠቃላይ_ውጤት_${currentYear}_${currentSemester}ኛ_ሴሚስተር.xlsx`;
  XLSX.writeFile(wb, fileName);
}
