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
  const enrolled = students.filter((s) => s.program === course.program);
  const criteria = getCourseAssessmentItems(course);
  const totalWeight = criteria.reduce((sum, it) => sum + (Number(it.max) || 0), 0);

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
      `የትምህርት ዘመን: ${currentYear} ዓ.ም`,
      `ሴሚስተር: ${currentSemester}ኛ ሴሚስተር`,
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
    const g = resolveGradeBreakdown(grades, student.uid, course.id, currentYear, currentSemester, student.id);
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
 * Helper to normalize strings for fuzzy matching
 */
function cleanText(str: any): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .trim()
    .toLowerCase()
    .replace(/[\s\-_/\\,():.%]/g, '');
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
 * Universal forgiving parser for uploaded Excel/CSV files.
 * Reads ANY Excel format even if column headers, IDs, or structures don't match the template.
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

        // 1. Find Header Row dynamically
        let headerRowIndex = -1;
        let idColIndex = -1;
        let nameColIndex = -1;

        for (let r = 0; r < Math.min(12, rawRows.length); r++) {
          const row = rawRows[r] || [];
          for (let c = 0; c < row.length; c++) {
            const h = cleanText(row[c]);
            if (
              h.includes('id') ||
              h.includes('መለያ') ||
              h.includes('studentid') ||
              h.includes('ቁጥር') ||
              h.includes('code') ||
              h.includes('roll') ||
              h.includes('reg')
            ) {
              if (idColIndex === -1 && !h.includes('ስም')) idColIndex = c;
            }
            if (
              h.includes('ስም') ||
              h.includes('name') ||
              h.includes('ተማሪ') ||
              h.includes('student') ||
              h.includes('fullname')
            ) {
              if (nameColIndex === -1) nameColIndex = c;
            }
          }
          if (idColIndex !== -1 || nameColIndex !== -1) {
            headerRowIndex = r;
            break;
          }
        }

        // If no explicit header row found, inspect row 0 to 4 to detect columns
        if (headerRowIndex === -1) {
          // Look for first row with text
          for (let r = 0; r < Math.min(5, rawRows.length); r++) {
            const row = rawRows[r] || [];
            const hasText = row.some((c) => typeof c === 'string' && c.trim().length > 1);
            if (hasText) {
              headerRowIndex = r;
              break;
            }
          }
          if (headerRowIndex === -1) headerRowIndex = 0;
        }

        const headerRow = rawRows[headerRowIndex] || [];
        const maxCols = Math.max(...rawRows.map((r) => (r ? r.length : 0)));

        // If ID column or Name column still not found, infer from data content
        if (idColIndex === -1 || nameColIndex === -1) {
          const sampleRows = rawRows.slice(headerRowIndex + 1, headerRowIndex + 6);
          for (let c = 0; c < maxCols; c++) {
            const colVals = sampleRows.map((r) => String(r[c] || '').trim()).filter(Boolean);
            if (colVals.length === 0) continue;

            // Check if column values look like Ethiopian full names (has space, mostly letters)
            const looksLikeName = colVals.some((v) => v.includes(' ') && !/\d/.test(v));
            if (looksLikeName && nameColIndex === -1) {
              nameColIndex = c;
              continue;
            }

            // Check if column values look like Student IDs (alphanumeric code, or integers)
            const looksLikeId = colVals.some((v) => /\d/.test(v) && v.length <= 15);
            if (looksLikeId && idColIndex === -1 && c !== nameColIndex) {
              idColIndex = c;
            }
          }
        }

        // Defaults if still not determined
        if (idColIndex === -1 && nameColIndex === -1) {
          idColIndex = 0;
          nameColIndex = 1;
        } else if (idColIndex === -1 && nameColIndex !== -1) {
          idColIndex = nameColIndex === 0 ? 1 : 0;
        } else if (nameColIndex === -1 && idColIndex !== -1) {
          nameColIndex = idColIndex === 0 ? 1 : 0;
        }

        // 2. Locate all Score Columns and Map to Criteria
        const warnings: string[] = [];
        const criterionColMap: Record<string, number> = {};
        const scoreColCandidates: { colIndex: number; headerName: string; isTotal: boolean }[] = [];

        for (let c = 0; c < maxCols; c++) {
          if (c === idColIndex || c === nameColIndex) continue;
          const h = cleanText(headerRow[c]);

          // Check if column has numeric values in data rows
          let numericCount = 0;
          const sampleRows = rawRows.slice(headerRowIndex + 1, headerRowIndex + 15);
          sampleRows.forEach((r) => {
            const num = extractScoreNumber(r[c]);
            if (num !== null && num >= 0 && num <= 100) numericCount++;
          });

          const isTotalHeader =
            h.includes('total') ||
            h.includes('ድምር') ||
            h.includes('ጠቅላላ') ||
            h.includes('100') ||
            h.includes('score') ||
            h.includes('ውጤት');

          if (numericCount > 0 || isTotalHeader) {
            scoreColCandidates.push({
              colIndex: c,
              headerName: String(headerRow[c] || `ኮለምን ${c + 1}`),
              isTotal: isTotalHeader
            });
          }
        }

        // Try mapping criteria by label similarity
        criteria.forEach((crit, critIdx) => {
          const critNorm = cleanText(crit.label);
          let matched = scoreColCandidates.find(
            (sc) =>
              cleanText(sc.headerName).includes(critNorm) ||
              critNorm.includes(cleanText(sc.headerName))
          );

          if (!matched) {
            // Check common keywords
            matched = scoreColCandidates.find((sc) => {
              const h = cleanText(sc.headerName);
              if (critIdx === 0 && (h.includes('p1') || h.includes('ክፍል1') || h.includes('part1') || h.includes('ፈተና1'))) return true;
              if (critIdx === 1 && (h.includes('p2') || h.includes('ክፍል2') || h.includes('part2') || h.includes('ፈተና2'))) return true;
              if (crit.label.includes('ሚድ') && (h.includes('mid') || h.includes('ሚድ'))) return true;
              if (crit.label.includes('ፋይናል') && (h.includes('final') || h.includes('ፋይናል') || h.includes('ፈተና'))) return true;
              if (crit.label.includes('ተሳትፎ') && (h.includes('att') || h.includes('ተሳትፎ'))) return true;
              return false;
            });
          }

          if (matched) {
            criterionColMap[crit.id] = matched.colIndex;
          }
        });

        // Fallback for criteria not matched: map remaining numeric columns in sequence
        const unmappedCriteria = criteria.filter((crit) => criterionColMap[crit.id] === undefined);
        const mappedColIndices = new Set(Object.values(criterionColMap));
        const unusedScoreCols = scoreColCandidates.filter((sc) => !mappedColIndices.has(sc.colIndex) && !sc.isTotal);

        unmappedCriteria.forEach((crit, idx) => {
          if (idx < unusedScoreCols.length) {
            criterionColMap[crit.id] = unusedScoreCols[idx].colIndex;
            warnings.push(`መመዘኛ '${crit.label}' ከኤክሴል '${unusedScoreCols[idx].headerName}' አምድ ጋር ተገናኝቷል።`);
          }
        });

        // Check if there is only 1 numeric column or a dedicated Total column
        const singleTotalCol =
          scoreColCandidates.find((sc) => sc.isTotal) ||
          (scoreColCandidates.length === 1 ? scoreColCandidates[0] : null);

        if (Object.keys(criterionColMap).length === 0 && singleTotalCol) {
          warnings.push(`የተጫነው ኤክሴል አጠቃላይ ውጤት አምድ (${singleTotalCol.headerName}) ይዟል፤ ውጤቱ በቀጥታ ተነቧል።`);
        }

        // 3. Parse Data Rows & Fuzzy Match Students
        const parsedRows: ParsedGradeRow[] = [];
        let matchedCount = 0;
        let dataRowSequence = 0;

        for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
          const row = rawRows[r] || [];
          if (!row || row.every((c) => String(c).trim() === '')) continue;

          const rawId = idColIndex !== -1 ? String(row[idColIndex] || '').trim() : '';
          const rawName = nameColIndex !== -1 ? String(row[nameColIndex] || '').trim() : '';

          // If row has no ID and no Name, but has numbers, it could be a student row
          const hasAnyScoreNumber = scoreColCandidates.some((sc) => extractScoreNumber(row[sc.colIndex]) !== null);
          if (!rawId && !rawName && !hasAnyScoreNumber) continue;

          const cleanIdVal = cleanText(rawId);
          const cleanNameVal = cleanText(rawName);
          const rawIdDigits = rawId.replace(/\D/g, '');

          // Multi-tier student matching:
          // A. In enrolled students (exact ID, normalized ID, or digits)
          let matchedStudent = targetStudents.find((s) => {
            const sIdClean = cleanText(s.id);
            const sIdDigits = s.id.replace(/\D/g, '');
            if (cleanIdVal && (sIdClean === cleanIdVal || sIdClean.includes(cleanIdVal) || cleanIdVal.includes(sIdClean))) return true;
            if (rawIdDigits && sIdDigits && (sIdDigits === rawIdDigits || sIdDigits.endsWith(rawIdDigits) || rawIdDigits.endsWith(sIdDigits))) return true;
            return false;
          });

          // B. By Name in enrolled students
          if (!matchedStudent && cleanNameVal) {
            matchedStudent = targetStudents.find((s) => {
              const sNameClean = cleanText(s.name);
              if (sNameClean === cleanNameVal || sNameClean.includes(cleanNameVal) || cleanNameVal.includes(sNameClean)) return true;
              // Check first 2 words
              const excelWords = rawName.trim().split(/\s+/).filter(Boolean);
              const studentWords = s.name.trim().split(/\s+/).filter(Boolean);
              if (excelWords.length >= 2 && studentWords.length >= 2) {
                if (cleanText(excelWords[0]) === cleanText(studentWords[0]) && cleanText(excelWords[1]) === cleanText(studentWords[1])) {
                  return true;
                }
              }
              return false;
            });
          }

          // C. Search across ALL students in database
          if (!matchedStudent) {
            matchedStudent = students.find((s) => {
              const sIdClean = cleanText(s.id);
              if (cleanIdVal && (sIdClean === cleanIdVal || sIdClean.includes(cleanIdVal))) return true;
              const sNameClean = cleanText(s.name);
              if (cleanNameVal && (sNameClean === cleanNameVal || sNameClean.includes(cleanNameVal))) return true;
              return false;
            });
          }

          // D. Fallback: match by list order if within bounds!
          if (!matchedStudent && dataRowSequence < targetStudents.length) {
            matchedStudent = targetStudents[dataRowSequence];
          }

          // Extract scores for this row
          const scores: Record<string, number> = {};
          let rowTotal = 0;

          // If we have a single total column or criteria were unmapped
          if (singleTotalCol && Object.keys(criterionColMap).length === 0) {
            const rawScore = extractScoreNumber(row[singleTotalCol.colIndex]) || 0;
            const cappedScore = Math.max(0, Math.min(100, rawScore));
            rowTotal = cappedScore;

            // Distribute proportionally across course criteria so details and GPA work perfectly
            criteria.forEach((crit, critIdx) => {
              const critRatio = (Number(crit.max) || 20) / totalWeight;
              const critVal = Math.round(cappedScore * critRatio * 10) / 10;
              scores[crit.id] = Math.min(crit.max, critVal);
            });
          } else {
            // Read mapped criterion columns
            criteria.forEach((crit) => {
              const colIdx = criterionColMap[crit.id];
              let val = 0;
              if (colIdx !== undefined && colIdx < row.length) {
                const extracted = extractScoreNumber(row[colIdx]);
                if (extracted !== null) {
                  val = Math.max(0, Math.min(crit.max, extracted));
                }
              }
              scores[crit.id] = val;
              rowTotal += val;
            });

            // If sum is 0, check if there is any other column with a valid score
            if (rowTotal === 0 && scoreColCandidates.length > 0) {
              const firstNum = extractScoreNumber(row[scoreColCandidates[0].colIndex]) || 0;
              if (firstNum > 0) {
                rowTotal = firstNum;
                criteria.forEach((crit) => {
                  const critRatio = (Number(crit.max) || 20) / totalWeight;
                  scores[crit.id] = Math.min(crit.max, Math.round(firstNum * critRatio * 10) / 10);
                });
              }
            }
          }

          if (matchedStudent) {
            matchedCount++;
            parsedRows.push({
              studentUid: matchedStudent.uid,
              studentId: matchedStudent.id,
              studentName: matchedStudent.name,
              scores,
              totalScore: rowTotal,
              isValid: true,
              notes: rawName && rawName !== matchedStudent.name ? `ከኤክሴል: ${rawName}` : undefined
            });
          } else {
            parsedRows.push({
              studentUid: '',
              studentId: rawId || `ተማሪ #${dataRowSequence + 1}`,
              studentName: rawName || 'ያልታወቀ ተማሪ',
              scores,
              totalScore: rowTotal,
              isValid: false,
              notes: 'በሲስተሙ አልተገኘም (እባክዎ ተማሪውን ይምረጡ)'
            });
          }

          dataRowSequence++;
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
      const gpaStr = calculateStudentGPA(student, courses, grades, currentYear, currentSemester);
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
        const g = resolveGradeBreakdown(grades, student.uid, c.id, currentYear, currentSemester, student.id);
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
