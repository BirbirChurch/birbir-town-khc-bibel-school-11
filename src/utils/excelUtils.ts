import * as XLSX from 'xlsx';
import { AssessmentCriterionItem, Course, GradeBreakdown, Student } from '../types.ts';
import { OFFICIAL_GRADING_SCALE } from '../data/initialData.ts';
import { sortStudentsByAmharicName } from './amharicSort.ts';
import {
  calculateStudentGPA,
  getCourseAssessmentItems,
  getCriterionScore,
  getEffectiveGradeValues,
  getGradeKey,
  resolveGradeBreakdown
} from './gradeCalculations.ts';

export interface DetectedExcelCriterion {
  id: string;
  label: string;
  max: number;
  sourceCol: number;
  matchedExistingId?: string;
}

export interface ParsedGradeRow {
  studentUid: string;
  studentId: string;
  studentName: string;
  scores: Record<string, number>;
  totalScore?: number;
  customTotal?: number;
  customLetter?: string;
  isValid: boolean;
  notes?: string;
}

export interface ExcelApplyMeta {
  customTotalsByUid?: Record<string, number>;
  customLettersByUid?: Record<string, string>;
  detectedCriteria?: AssessmentCriterionItem[];
  applyDetectedCriteriaToCourse?: boolean;
}

export interface ParseExcelResult {
  success: boolean;
  courseId: string;
  totalRows: number;
  matchedStudentsCount: number;
  rows: ParsedGradeRow[];
  detectedCriteria: DetectedExcelCriterion[];
  importMode: 'existing_criteria' | 'custom_criteria' | 'total_only';
  hasCustomSchemeDiff: boolean;
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
 * Helper to write a formula cell safely into a SheetJS worksheet.
 * Uses proper OOXML types ('n' for numeric cached values, 's' for string/empty cached values).
 */
function setFormulaCell(
  ws: XLSX.WorkSheet,
  rowIdx0: number,
  colIdx0: number,
  formula: string,
  cachedValue: number | string,
  numFmt?: string
) {
  const addr = XLSX.utils.encode_cell({ r: rowIdx0, c: colIdx0 });
  const isNum = typeof cachedValue === 'number' && !isNaN(cachedValue);
  const cell: XLSX.CellObject = isNum
    ? { t: 'n', f: formula, v: cachedValue }
    : { t: 's', f: formula, v: String(cachedValue ?? '') };
  if (numFmt) {
    cell.z = numFmt;
  }
  ws[addr] = cell;
}

/**
 * Build live auto-calculating Excel workbook for a course.
 * Includes live formulas for Total (=SUM), 13-Tier Letter Grade, Grade Points,
 * Amharic Meaning, Pass/Fail Status, Class Average, Pass/Fail Counts, Max/Min,
 * plus an Official 13-Tier Grading Scale reference sheet.
 */
function buildAutoCalculatingCourseWorkbook(
  course: Course,
  students: Student[],
  grades: Record<string, GradeBreakdown>,
  currentYear: string,
  currentSemester: string,
  includeExistingGrades: boolean
): XLSX.WorkBook {
  let effectiveGrades = { ...grades };
  if (includeExistingGrades) {
    try {
      const stored = localStorage.getItem('bk_grades');
      if (stored) {
        const parsed = JSON.parse(stored);
        effectiveGrades = { ...parsed, ...grades };
      }
    } catch (_) {}
  }

  const enrolled = sortStudentsByAmharicName(students.filter((s) => s.program === course.program));
  const criteria = getCourseAssessmentItems(course);
  const totalWeight = criteria.reduce((sum, it) => sum + (Number(it.max) || 0), 0);
  const targetYear = course.academicYear || currentYear;
  const targetSem = course.semester || currentSemester;

  // Column indices (0-based)
  const firstCritColIdx = 4; // Col E
  const critCount = Math.max(1, criteria.length);
  const lastCritColIdx = firstCritColIdx + critCount - 1;
  const totalColIdx = lastCritColIdx + 1;
  const letterColIdx = lastCritColIdx + 2;
  const pointsColIdx = lastCritColIdx + 3;
  const descColIdx = lastCritColIdx + 4;
  const statusColIdx = lastCritColIdx + 5;
  const noteColIdx = lastCritColIdx + 6;

  const firstCritCol = XLSX.utils.encode_col(firstCritColIdx);
  const lastCritCol = XLSX.utils.encode_col(lastCritColIdx);
  const totalCol = XLSX.utils.encode_col(totalColIdx);
  const letterCol = XLSX.utils.encode_col(letterColIdx);
  const pointsCol = XLSX.utils.encode_col(pointsColIdx);

  // Metadata rows (Rows 0..4 in 0-based; Row 1..5 in 1-based Excel)
  const rows: any[][] = [
    ['የብርብር ከተማ ቃለ ሕይወት ቤተ ክርስቲያን መጽሐፍ ቅዱስ ትምህርት ቤት'],
    [
      includeExistingGrades
        ? 'ይፋዊ የኮርስ ውጤት መሙያና ማጠቃለያ ሰነድ (Auto-Calculating Course Grade Sheet)'
        : 'የመምህራን የውጤት ማስገቢያ ኤክሴል አብነት (Auto-Calculating Grade Entry Template)'
    ],
    [
      `የትምህርት ዓይነት: ${course.code ? `[${course.code}] ` : ''}${course.name}`,
      `ፕሮግራም: ${course.program}`,
      `መምህር: ${course.teacher}`,
      `ክሬዲት: ${course.credits} ክሬዲት ሰዓት`
    ],
    [
      `የትምህርት ዘመን: ${targetYear} ዓ.ም`,
      `ሴሚስተር: ${targetSem}ኛ ሴሚስተር`,
      `የተማሪዎች ብዛት: ${enrolled.length}`,
      'መመሪያ: በመመዘኛ ሳጥኖች ውስጥ ውጤት ሲሞሉ ድምር፣ ፊደል፣ ነጥብ እና አማካይ ራሱ ይሰላል!'
    ],
    []
  ];

  // Header row (Row 5 in 0-based, Row 6 in 1-based Excel)
  const headerRow = ['ተ.ቁ', 'መለያ ቁጥር (ID)', 'የተማሪ ሙሉ ስም', 'ጾታ'];
  criteria.forEach((it) => {
    headerRow.push(`${it.label} (${it.max}%)`);
  });
  headerRow.push(
    `ጠቅላላ ድምር (${totalWeight}%)`,
    'የውጤት ፊደል',
    'ነጥብ (Points)',
    'ትርጉም',
    'ውሳኔ / ሁኔታ',
    'ማስታወሻ'
  );
  rows.push(headerRow);

  const firstDataRowIdx0 = rows.length; // 6 (Excel Row 7)

  // Track cached values for accurate OOXML preview
  const cachedRowMeta: Array<{
    totalCached: number | string;
    letterCached: string;
    pointsCached: number | string;
    descCached: string;
    statusCached: string;
    customTotalOnly?: number;
  }> = [];

  let totalScoreSum = 0;
  let totalPointsSum = 0;
  let gradedCount = 0;
  let passCount = 0;
  let failCount = 0;
  let maxObserved = 0;
  let minObserved = 100;
  const critSums = criteria.map(() => 0);
  const critCounts = criteria.map(() => 0);

  enrolled.forEach((student, idx) => {
    const row: any[] = [idx + 1, student.id, student.name, student.gender || '—'];

    if (includeExistingGrades) {
      const g = resolveGradeBreakdown(effectiveGrades, student.uid, course.id, targetYear, targetSem, student.id);
      const eff = getEffectiveGradeValues(g, criteria);
      const partsSum = criteria.reduce((sum, it, i) => sum + getCriterionScore(g, it.id, i), 0);
      const hasCustomTotalOnly =
        eff.hasAny && typeof g?.customTotal === 'number' && !isNaN(g.customTotal) && partsSum === 0;

      criteria.forEach((it, itemIdx) => {
        const score = getCriterionScore(g, it.id, itemIdx);
        if (eff.hasAny && !hasCustomTotalOnly) {
          row.push(score);
          critSums[itemIdx] += score;
          critCounts[itemIdx]++;
        } else {
          row.push('');
        }
      });

      if (eff.hasAny) {
        totalScoreSum += eff.total;
        totalPointsSum += eff.points;
        gradedCount++;
        if (eff.points >= 2.0) passCount++;
        if (eff.letter === 'F') failCount++;
        if (eff.total > maxObserved) maxObserved = eff.total;
        if (eff.total < minObserved) minObserved = eff.total;

        const statusStr = eff.points >= 2 ? 'አልፏል' : eff.points >= 1 ? 'ዝቅተኛ ማለፊያ' : 'ወድቋል';
        cachedRowMeta.push({
          totalCached: eff.total,
          letterCached: eff.letter,
          pointsCached: eff.points,
          descCached: eff.desc,
          statusCached: statusStr,
          customTotalOnly: hasCustomTotalOnly ? g!.customTotal : undefined
        });
      } else {
        cachedRowMeta.push({
          totalCached: '',
          letterCached: '',
          pointsCached: '',
          descCached: '',
          statusCached: 'ውጤት አልገባም'
        });
      }
    } else {
      criteria.forEach(() => row.push(''));
      cachedRowMeta.push({
        totalCached: '',
        letterCached: '',
        pointsCached: '',
        descCached: '',
        statusCached: 'ውጤት አልገባም'
      });
    }

    // Placeholders overwritten by live Excel formulas below
    row.push('', '', '', '', '', '');
    rows.push(row);
  });

  const lastDataRowIdx0 = firstDataRowIdx0 + enrolled.length - 1;
  const firstRow1 = firstDataRowIdx0 + 1;
  const lastRow1 = lastDataRowIdx0 + 1;

  // Spacer + Summary rows
  rows.push([]);
  const avgRowIdx0 = rows.length;
  const avgRow: any[] = ['', 'ማጠቃለያ', 'የክፍሉ አማካይ (Class Average)', ''];
  criteria.forEach(() => avgRow.push(''));
  avgRow.push('', '', '', '', '', '');
  rows.push(avgRow);

  const statsRowIdx0 = rows.length;
  const statsRow: any[] = ['', 'ስታቲስቲክስ', '', '', '', '', '', '', '', ''];
  rows.push(statsRow);

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Attach LIVE Excel formulas for every student row
  enrolled.forEach((_, idx) => {
    const r0 = firstDataRowIdx0 + idx;
    const r1 = r0 + 1;
    const meta = cachedRowMeta[idx];

    const critRange = `${firstCritCol}${r1}:${lastCritCol}${r1}`;
    const totRef = `${totalCol}${r1}`;
    const ptsRef = `${pointsCol}${r1}`;
    const roundedTot = `ROUND(${totRef},0)`;

    const totalFormula =
      meta.customTotalOnly !== undefined
        ? `IF(COUNT(${critRange})=0,${meta.customTotalOnly},MIN(100,ROUND(SUM(${critRange}),1)))`
        : `IF(COUNT(${critRange})=0,"",MIN(100,ROUND(SUM(${critRange}),1)))`;

    const letterFormula =
      `IF(${totRef}="","",IF(${roundedTot}>=97,"A+",IF(${roundedTot}>=93,"A",IF(${roundedTot}>=90,"A-",IF(${roundedTot}>=87,"B+",IF(${roundedTot}>=83,"B",IF(${roundedTot}>=80,"B-",IF(${roundedTot}>=77,"C+",IF(${roundedTot}>=73,"C",IF(${roundedTot}>=70,"C-",IF(${roundedTot}>=67,"D+",IF(${roundedTot}>=63,"D",IF(${roundedTot}>=60,"D-","F")))))))))))))`;

    const pointsFormula =
      `IF(${totRef}="","",IF(${roundedTot}>=97,4,IF(${roundedTot}>=93,4,IF(${roundedTot}>=90,3.7,IF(${roundedTot}>=87,3.66,IF(${roundedTot}>=83,3.33,IF(${roundedTot}>=80,3,IF(${roundedTot}>=77,2.66,IF(${roundedTot}>=73,2.33,IF(${roundedTot}>=70,2,IF(${roundedTot}>=67,1.66,IF(${roundedTot}>=63,1.33,IF(${roundedTot}>=60,1,0)))))))))))))`;

    const descFormula =
      `IF(${totRef}="","",IF(${roundedTot}>=97,"እጅግ በጣም ጥሩ",IF(${roundedTot}>=90,"በጣም ጥሩ",IF(${roundedTot}>=83,"ጥሩ",IF(${roundedTot}>=80,"ደህና",IF(${roundedTot}>=77,"አጥጋቢ",IF(${roundedTot}>=73,"አልፏል",IF(${roundedTot}>=70,"ዝቅተኛ ማለፊያ",IF(${roundedTot}>=63,"ዝቅተኛ / ማለፊያ",IF(${roundedTot}>=60,"ዝቅተኛ","ወድቋል"))))))))))`;

    const statusFormula =
      `IF(${totRef}="","ውጤት አልገባም",IF(${ptsRef}>=2,"አልፏል",IF(${ptsRef}>=1,"ዝቅተኛ ማለፊያ","ወድቋል")))`;

    setFormulaCell(ws, r0, totalColIdx, totalFormula, meta.totalCached, '0.0');
    setFormulaCell(ws, r0, letterColIdx, letterFormula, meta.letterCached);
    setFormulaCell(ws, r0, pointsColIdx, pointsFormula, meta.pointsCached, '0.00');
    setFormulaCell(ws, r0, descColIdx, descFormula, meta.descCached);
    setFormulaCell(ws, r0, statusColIdx, statusFormula, meta.statusCached);
  });

  // Attach LIVE Class Average & Statistics formulas
  if (enrolled.length > 0) {
    criteria.forEach((_, i) => {
      const cIdx = firstCritColIdx + i;
      const cCol = XLSX.utils.encode_col(cIdx);
      const range = `${cCol}${firstRow1}:${cCol}${lastRow1}`;
      const cached = critCounts[i] > 0 ? Math.round((critSums[i] / critCounts[i]) * 10) / 10 : '';
      setFormulaCell(ws, avgRowIdx0, cIdx, `IF(COUNT(${range})=0,"",ROUND(AVERAGE(${range}),1))`, cached, '0.0');
    });

    const totRange = `${totalCol}${firstRow1}:${totalCol}${lastRow1}`;
    const letRange = `${letterCol}${firstRow1}:${letterCol}${lastRow1}`;
    const ptsRange = `${pointsCol}${firstRow1}:${pointsCol}${lastRow1}`;
    const nameRange = `C${firstRow1}:C${lastRow1}`;

    const avgTotCached = gradedCount > 0 ? Math.round((totalScoreSum / gradedCount) * 10) / 10 : '';
    const avgPtsCached = gradedCount > 0 ? Math.round((totalPointsSum / gradedCount) * 100) / 100 : '';

    setFormulaCell(ws, avgRowIdx0, totalColIdx, `IF(COUNT(${totRange})=0,"",ROUND(AVERAGE(${totRange}),1))`, avgTotCached, '0.0');
    setFormulaCell(ws, avgRowIdx0, pointsColIdx, `IF(COUNT(${ptsRange})=0,"",ROUND(AVERAGE(${ptsRange}),2))`, avgPtsCached, '0.00');

    setFormulaCell(
      ws,
      statsRowIdx0,
      2,
      `"ተፈታኝ: "&COUNT(${totRange})&" / "&COUNTA(${nameRange})`,
      `ተፈታኝ: ${gradedCount} / ${enrolled.length}`
    );
    setFormulaCell(
      ws,
      statsRowIdx0,
      firstCritColIdx,
      `"ያለፉ: "&COUNTIF(${ptsRange},">=2")`,
      `ያለፉ: ${passCount}`
    );
    if (critCount >= 2) {
      setFormulaCell(
        ws,
        statsRowIdx0,
        firstCritColIdx + 1,
        `"የወደቁ (F): "&COUNTIF(${letRange},"F")`,
        `የወደቁ (F): ${failCount}`
      );
    }
    setFormulaCell(
      ws,
      statsRowIdx0,
      totalColIdx,
      `IF(COUNT(${totRange})=0,"","ከፍተኛ: "&MAX(${totRange}))`,
      gradedCount > 0 ? `ከፍተኛ: ${maxObserved}` : ''
    );
    setFormulaCell(
      ws,
      statsRowIdx0,
      letterColIdx,
      `IF(COUNT(${totRange})=0,"","ዝቅተኛ: "&MIN(${totRange}))`,
      gradedCount > 0 ? `ዝቅተኛ: ${minObserved}` : ''
    );
  }

  // Column widths
  const colWidths = [
    { wch: 7 },  // ተ.ቁ
    { wch: 16 }, // መለያ ቁጥር
    { wch: 28 }, // ስም
    { wch: 9 }   // ጾታ
  ];
  criteria.forEach(() => colWidths.push({ wch: 18 }));
  colWidths.push(
    { wch: 18 }, // ጠቅላላ ድምር
    { wch: 14 }, // የውጤት ፊደል
    { wch: 14 }, // ነጥብ
    { wch: 20 }, // ትርጉም
    { wch: 18 }, // ሁኔታ
    { wch: 20 }  // ማስታወሻ
  );
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  (wb as any).Workbook = {
    CalcPr: { calcId: 191029, fullCalcOnLoad: true }
  };
  XLSX.utils.book_append_sheet(wb, ws, 'ውጤት_መሙያ');

  // Reference Sheet 2: Official 13-Tier Grading Scale
  const scaleRows: any[][] = [
    ['ይፋዊ የ13-ደረጃ ውጤት መስፈርት (Official 13-Tier Grading Scale)'],
    ['ማሳሰቢያ፡ በመጀመሪያው ሉህ («ውጤት_መሙያ») ላይ ውጤት ሲሞሉ ድምር፣ ፊደል እና ነጥብ በዚህ መስፈርት መሰረት ራሱ ይሰላል።'],
    [],
    ['ዝቅተኛ (%)', 'ከፍተኛ (%)', 'የውጤት ፊደል', 'ነጥብ (Points)', 'ትርጉም']
  ];
  OFFICIAL_GRADING_SCALE.forEach((tier) => {
    scaleRows.push([tier.min, tier.max, tier.letter, tier.points, tier.desc]);
  });
  const wsScale = XLSX.utils.aoa_to_sheet(scaleRows);
  wsScale['!cols'] = [{ wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 24 }];
  XLSX.utils.book_append_sheet(wb, wsScale, 'የ13_ደረጃ_መስፈርት');

  return wb;
}

/**
 * Export course grades to a formatted Microsoft Excel (.xlsx) file with live Excel formulas
 */
export function exportCourseGradesToExcel(
  course: Course,
  students: Student[],
  grades: Record<string, GradeBreakdown>,
  currentYear: string,
  currentSemester: string
) {
  const wb = buildAutoCalculatingCourseWorkbook(course, students, grades, currentYear, currentSemester, true);
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
          const targetYear = c.academicYear || currentYear;
          const targetSem = c.semester || (c.schedule && c.schedule.includes('2ኛ') ? '2' : '1') || currentSemester;
          const g = resolveGradeBreakdown(grades, s.uid, c.id, targetYear, targetSem, s.id);
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
 * Generate a pre-filled auto-calculating Excel template (.xlsx) for this course
 * with student IDs, names, and live Excel formulas for Sum, Letter Grade, Points, Status & Averages!
 */
export function downloadCourseGradeTemplateExcel(
  course: Course,
  students: Student[]
) {
  const wb = buildAutoCalculatingCourseWorkbook(
    course,
    students,
    {},
    course.academicYear || '2019',
    course.semester || '1',
    false
  );
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
 * Extract max score from a header like "Quiz 1 (15%)", "Mid /30", "Final [40]", "ፈተና ከ 25"
 */
function extractHeaderMaxWeight(headerText: string): number | null {
  if (!headerText) return null;
  const s = String(headerText).trim();
  const parenMatch = s.match(/[\[(](?:ከ\s*)?(\d+(?:\.\d+)?)\s*%?[\])]/);
  if (parenMatch) {
    const n = parseFloat(parenMatch[1]);
    if (n > 0 && n <= 100) return n;
  }
  const slashMatch = s.match(/(?:\/|ከ\s*)(\d+(?:\.\d+)?)\s*%?/);
  if (slashMatch) {
    const n = parseFloat(slashMatch[1]);
    if (n > 0 && n <= 100) return n;
  }
  const trailingPct = s.match(/(\d+(?:\.\d+)?)\s*%$/);
  if (trailingPct) {
    const n = parseFloat(trailingPct[1]);
    if (n > 0 && n <= 100) return n;
  }
  return null;
}

/**
 * Clean criterion display label from Excel header (strips trailing weight markers)
 */
function cleanCriterionHeaderLabel(headerText: string, fallbackIndex: number): string {
  const cleaned = String(headerText || '')
    .replace(/[\[(](?:ከ\s*)?\d+(?:\.\d+)?\s*%?[\])]/g, '')
    .replace(/\/\s*\d+(?:\.\d+)?\s*%?/g, '')
    .replace(/\d+(?:\.\d+)?\s*%$/g, '')
    .trim();
  return cleaned || `መመዘኛ ${fallbackIndex + 1}`;
}

/**
 * Check if a string looks like a grading letter (A+, A, A-, B+, ..., F)
 */
function extractGradeLetterValue(val: any): string | undefined {
  if (val === null || val === undefined) return undefined;
  const str = String(val).trim().toUpperCase();
  if (/^(A\+|A-|A|B\+|B-|B|C\+|C-|C|D\+|D-|D|F)$/.test(str)) {
    return str;
  }
  return undefined;
}

/**
 * Universal lossless parser for uploaded Excel/CSV files.
 * - Scans all sheets to find the actual grade roster sheet
 * - Handles both our system Excel templates AND custom teacher-made Excel sheets
 * - Preserves teachers' exact marks without truncating/clamping to mismatched defaults
 * - Detects custom assessment columns, single total-only sheets, and headerless sheets cleanly
 */
export async function parseExcelGradesFile(
  file: File,
  course: Course,
  students: Student[]
): Promise<ParseExcelResult> {
  const enrolled = students.filter((s) => s.program === course.program);
  const targetStudents = enrolled.length > 0 ? enrolled : students;
  const existingCriteria = getCourseAssessmentItems(course);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          resolve({
            success: false,
            courseId: course.id,
            totalRows: 0,
            matchedStudentsCount: 0,
            rows: [],
            detectedCriteria: [],
            importMode: 'existing_criteria',
            hasCustomSchemeDiff: false,
            warnings: [],
            errors: ['የተመረጠው ኤክሴል ፋይል ምንም ሉህ (Sheet) የለውም!']
          });
          return;
        }

        // Select the best sheet (ignore grading-scale reference sheet, prefer sheet with student matches/numbers)
        let bestRawRows: any[][] = [];
        let bestSheetScore = -1;

        for (const sName of workbook.SheetNames) {
          const lowerSheet = sName.toLowerCase();
          if (lowerSheet.includes('መስፈርት') || lowerSheet.includes('grading_scale') || lowerSheet.includes('scale')) {
            continue;
          }
          const ws = workbook.Sheets[sName];
          const sheetRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true });
          if (!sheetRows || sheetRows.length === 0) continue;

          let score = 0;
          const sampleLimit = Math.min(sheetRows.length, 40);
          for (let r = 0; r < sampleLimit; r++) {
            const row = sheetRows[r] || [];
            let hasNameMatch = false;
            let numCount = 0;
            for (let c = 0; c < row.length; c++) {
              const val = row[c];
              if (typeof val === 'string' && val.trim().length >= 2) {
                for (const s of targetStudents) {
                  if (matchStudentNameScore(val, s.name) >= 85) {
                    hasNameMatch = true;
                    break;
                  }
                }
              }
              if (extractScoreNumber(val) !== null) numCount++;
            }
            if (hasNameMatch) score += 10;
            if (numCount > 0) score += 1;
          }

          if (score > bestSheetScore) {
            bestSheetScore = score;
            bestRawRows = sheetRows;
          }
        }

        if (bestRawRows.length === 0) {
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          bestRawRows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '', raw: true });
        }

        const rawRows = bestRawRows;
        if (!rawRows || rawRows.length === 0) {
          resolve({
            success: false,
            courseId: course.id,
            totalRows: 0,
            matchedStudentsCount: 0,
            rows: [],
            detectedCriteria: [],
            importMode: 'existing_criteria',
            hasCustomSchemeDiff: false,
            warnings: [],
            errors: ['የኤክሴል ሰነዱ ባዶ ነው!']
          });
          return;
        }

        const maxCols = Math.max(...rawRows.map((r) => (r ? r.length : 0)));

        // 1. Detect Header Row dynamically (never mistake a student row for header!)
        let headerRowIndex = -1;
        let maxHeaderScore = 0;

        for (let r = 0; r < Math.min(25, rawRows.length); r++) {
          const row = rawRows[r] || [];

          // Never treat an actual student record row as a header row
          const rowMatchesStudent = row.some((cellVal) => {
            if (typeof cellVal !== 'string' || cellVal.trim().length < 3) return false;
            return targetStudents.some((s) => matchStudentNameScore(cellVal, s.name) >= 90);
          });
          if (rowMatchesStudent) continue;

          let score = 0;
          for (let c = 0; c < row.length; c++) {
            const h = cleanText(row[c]);
            if (!h) continue;
            if (
              h.includes('ስም') ||
              h.includes('name') ||
              h.includes('ተማሪ') ||
              h.includes('student') ||
              h.includes('መለያ') ||
              h === 'id' ||
              h.includes('studentid') ||
              h.includes('ተቁ') ||
              h.includes('ምዘና') ||
              h.includes('መመዘኛ') ||
              h.includes('ሚድ') ||
              h.includes('ፋይናል') ||
              h.includes('ፈተና') ||
              h.includes('አሳይመንት') ||
              h.includes('ተሳትፎ') ||
              h.includes('ክፍል') ||
              h.includes('quiz') ||
              h.includes('test') ||
              h.includes('exam') ||
              h.includes('mid') ||
              h.includes('final') ||
              h.includes('assign') ||
              h.includes('project') ||
              h.includes('att') ||
              h.includes('ድምር') ||
              h.includes('ጠቅላላ') ||
              h.includes('total') ||
              h.includes('score') ||
              h.includes('mark') ||
              h.includes('ውጤት') ||
              h.includes('ፊደል') ||
              h.includes('letter') ||
              h.includes('ነጥብ') ||
              h.includes('point')
            ) {
              score++;
            }
          }
          if (score > maxHeaderScore) {
            maxHeaderScore = score;
            headerRowIndex = r;
          }
        }

        const headerRow = headerRowIndex >= 0 ? (rawRows[headerRowIndex] || []) : [];
        const startDataRow = headerRowIndex >= 0 ? headerRowIndex + 1 : 0;

        // Helper: inspect data values of column c
        const columnProfile = (c: number) => {
          let numericCount = 0;
          let letterCount = 0;
          let idLikeCount = 0;
          let seqSerialCount = 0;
          let maxVal = 0;
          let nonEmptyCount = 0;
          let genderCount = 0;

          for (let r = startDataRow; r < rawRows.length; r++) {
            const row = rawRows[r] || [];
            const val = row[c];
            if (val === null || val === undefined || String(val).trim() === '') continue;
            nonEmptyCount++;

            const str = String(val).trim();
            const clean = cleanText(str);
            if (clean === 'ወንድ' || clean === 'ሴት' || clean === 'm' || clean === 'f' || clean === 'male' || clean === 'female') {
              genderCount++;
              continue;
            }
            if (extractGradeLetterValue(str)) {
              letterCount++;
              continue;
            }
            if (targetStudents.some((s) => isExactStudentIdMatch(str, s.id))) {
              idLikeCount++;
              continue;
            }
            const num = extractScoreNumber(val);
            if (num !== null) {
              numericCount++;
              if (num > maxVal) maxVal = num;
              if (Number.isInteger(num) && num === (r - startDataRow + 1)) {
                seqSerialCount++;
              }
            }
          }

          return { numericCount, letterCount, idLikeCount, seqSerialCount, maxVal, nonEmptyCount, genderCount };
        };

        // 2. Classify Column Roles cleanly
        let idColIndex = -1;
        let nameColIndex = -1;
        let serialColIndex = -1;
        let genderColIndex = -1;
        let totalColIndex = -1;
        let letterColIndex = -1;
        let pointsColIndex = -1;
        const remarkColIndices = new Set<number>();
        const candidateScoreCols: Array<{ col: number; rawHeader: string; maxFromHeader: number | null }> = [];
        const warnings: string[] = [];

        if (headerRowIndex >= 0) {
          for (let c = 0; c < maxCols; c++) {
            const rawH = String(headerRow[c] ?? '').trim();
            const h = cleanText(rawH);
            const prof = columnProfile(c);

            if (!h) {
              // Empty header: still include if column contains numeric exam marks (not serial/ID/letters)
              if (
                prof.numericCount >= 2 &&
                prof.idLikeCount === 0 &&
                prof.seqSerialCount < Math.max(2, prof.numericCount * 0.7) &&
                prof.letterCount === 0
              ) {
                candidateScoreCols.push({ col: c, rawHeader: `መመዘኛ ${candidateScoreCols.length + 1}`, maxFromHeader: null });
              }
              continue;
            }

            if (h === 'ተቁ' || h === 'ተራቁጥር' || h === 'no' || h === 'sn' || h === 'sr' || h === 'srno' || h === '#' || h === 'num') {
              serialColIndex = c;
              continue;
            }

            if (
              (h.includes('መለያ') || h.includes('studentid') || h.includes('አይዲ') || h === 'id' || h === 'uid' || h.includes('code') || h.includes('idno')) &&
              !h.includes('ስም')
            ) {
              if (idColIndex === -1) idColIndex = c;
              continue;
            }

            if (h.includes('ስም') || h.includes('name') || h.includes('fullname') || h === 'ተማሪ' || h === 'student') {
              if (nameColIndex === -1) nameColIndex = c;
              continue;
            }

            if (h === 'ጾታ' || h === 'gender' || h === 'sex' || (prof.genderCount >= 2 && prof.numericCount === 0)) {
              genderColIndex = c;
              continue;
            }

            if (
              h.includes('ፊደል') ||
              h.includes('letter') ||
              h === 'gradeletter' ||
              ((h === 'grade' || h === 'ደረጃ') && prof.letterCount >= Math.max(1, prof.numericCount))
            ) {
              if (letterColIndex === -1) letterColIndex = c;
              continue;
            }

            if (h.includes('ነጥብ') || h.includes('point') || h === 'gpa' || h === 'cgpa' || h === 'gp' || h === 'gradepoint') {
              if (pointsColIndex === -1) pointsColIndex = c;
              continue;
            }

            if (
              h.includes('አስተያየት') ||
              h.includes('ትርጉም') ||
              h.includes('ውሳኔ') ||
              h.includes('ሁኔታ') ||
              h.includes('ማስታወሻ') ||
              h.includes('remark') ||
              h.includes('status') ||
              h.includes('comment') ||
              h.includes('desc') ||
              h.includes('note')
            ) {
              remarkColIndices.add(c);
              continue;
            }

            if (h.includes('ጠቅላላ') || h.includes('ድምር') || h.includes('total') || h.includes('sum') || h.includes('overall') || h === '100') {
              if (totalColIndex === -1) totalColIndex = c;
              continue;
            }

            // Generic single-score header names ("ውጤት", "score", "mark", "grade") — treat as candidate score col (may resolve to total_only if alone!)
            candidateScoreCols.push({
              col: c,
              rawHeader: rawH,
              maxFromHeader: extractHeaderMaxWeight(rawH)
            });
          }
        } else {
          // Headerless Excel sheet: infer columns directly from row content
          for (let c = 0; c < maxCols; c++) {
            const prof = columnProfile(c);
            if (prof.nonEmptyCount === 0) continue;
            if (prof.seqSerialCount >= Math.max(2, prof.numericCount * 0.7)) {
              serialColIndex = c;
              continue;
            }
            if (prof.idLikeCount >= 1) {
              idColIndex = c;
              continue;
            }
            if (prof.genderCount >= 2 && prof.numericCount === 0) {
              genderColIndex = c;
              continue;
            }
            if (prof.letterCount >= Math.max(1, prof.numericCount)) {
              letterColIndex = c;
              continue;
            }
            if (prof.numericCount >= 1) {
              candidateScoreCols.push({
                col: c,
                rawHeader: `መመዘኛ ${candidateScoreCols.length + 1}`,
                maxFromHeader: null
              });
            }
          }
        }

        // Remove any candidate score column that actually contains only student names/strings/letters and 0 numeric cells
        const validScoreCols = candidateScoreCols.filter((cand) => {
          const prof = columnProfile(cand.col);
          return prof.numericCount > 0;
        });

        // 3. Determine Import Mode ('total_only' | 'existing_criteria' | 'custom_criteria')
        let importMode: 'existing_criteria' | 'custom_criteria' | 'total_only' = 'existing_criteria';
        let detectedCriteria: DetectedExcelCriterion[] = [];
        let hasCustomSchemeDiff = false;
        const singleGenericScoreCol =
          validScoreCols.length === 1 &&
          totalColIndex === -1 &&
          (() => {
            const h = cleanText(validScoreCols[0].rawHeader);
            const prof = columnProfile(validScoreCols[0].col);
            return (
              h.includes('ውጤት') ||
              h.includes('score') ||
              h.includes('mark') ||
              h.includes('grade') ||
              h === '100' ||
              validScoreCols[0].maxFromHeader === 100 ||
              prof.maxVal > 45
            );
          })();

        if ((validScoreCols.length === 0 && totalColIndex !== -1) || singleGenericScoreCol) {
          // Teacher's Excel provides a direct Total/Final Score out of 100!
          importMode = 'total_only';
          if (singleGenericScoreCol && totalColIndex === -1) {
            totalColIndex = validScoreCols[0].col;
          }
          detectedCriteria = existingCriteria.map((c, idx) => ({
            id: c.id,
            label: c.label,
            max: c.max,
            sourceCol: idx,
            matchedExistingId: c.id
          }));
        } else {
          // Match each Excel assessment column against existing course criteria
          const matchedExistingUsed = new Set<string>();
          const matchesPerCol = validScoreCols.map((cand, candIdx) => {
            const hNorm = cleanText(cleanCriterionHeaderLabel(cand.rawHeader, candIdx));
            let matchedCrit: (typeof existingCriteria)[number] | undefined;

            for (const crit of existingCriteria) {
              if (matchedExistingUsed.has(crit.id)) continue;
              const critNorm = cleanText(crit.label);
              const isDirect = hNorm === critNorm || (hNorm.length >= 2 && (hNorm.includes(critNorm) || critNorm.includes(hNorm)));
              const isKeyword =
                (crit.id === 'p1' && (hNorm.includes('p1') || hNorm.includes('ክፍል1') || hNorm.includes('part1'))) ||
                (crit.id === 'p2' && (hNorm.includes('p2') || hNorm.includes('ክፍል2') || hNorm.includes('part2'))) ||
                (crit.label.includes('ሚድ') && (hNorm.includes('mid') || hNorm.includes('ሚድ') || hNorm.includes('መንፈቅ'))) ||
                (crit.label.includes('ፋይናል') && (hNorm.includes('final') || hNorm.includes('ፋይናል') || hNorm.includes('ማጠቃለያ'))) ||
                (crit.label.includes('ተሳትፎ') && (hNorm.includes('att') || hNorm.includes('ተሳትፎ') || hNorm.includes('ስነምግባር')));

              if (isDirect || isKeyword) {
                matchedCrit = crit;
                matchedExistingUsed.add(crit.id);
                break;
              }
            }

            const prof = columnProfile(cand.col);
            const observedMax = prof.maxVal;
            const headerMax = cand.maxFromHeader;

            return {
              cand,
              candIdx,
              matchedCrit,
              observedMax,
              headerMax,
              cleanLabel: cleanCriterionHeaderLabel(cand.rawHeader, candIdx)
            };
          });

          // Check if the Excel strictly aligns with the course's existing criteria (no exceeding max, same layout)
          const allMatchedExisting =
            matchesPerCol.length === existingCriteria.length &&
            matchesPerCol.every(
              (m) =>
                m.matchedCrit &&
                m.observedMax <= m.matchedCrit.max &&
                (m.headerMax === null || m.headerMax === m.matchedCrit.max)
            );

          if (allMatchedExisting && matchesPerCol.length > 0) {
            importMode = 'existing_criteria';
            detectedCriteria = matchesPerCol.map((m) => ({
              id: m.matchedCrit!.id,
              label: m.matchedCrit!.label,
              max: m.matchedCrit!.max,
              sourceCol: m.cand.col,
              matchedExistingId: m.matchedCrit!.id
            }));
          } else if (matchesPerCol.length > 0) {
            // Custom teacher layout OR headerless columns OR different weights -> preserve teacher's marks 100%!
            const sameColumnCountNoHeaders =
              headerRowIndex === -1 &&
              matchesPerCol.length === existingCriteria.length &&
              matchesPerCol.every((m, i) => m.observedMax <= existingCriteria[i].max);

            if (sameColumnCountNoHeaders) {
              importMode = 'existing_criteria';
              detectedCriteria = matchesPerCol.map((m, i) => ({
                id: existingCriteria[i].id,
                label: existingCriteria[i].label,
                max: existingCriteria[i].max,
                sourceCol: m.cand.col,
                matchedExistingId: existingCriteria[i].id
              }));
            } else {
              importMode = 'custom_criteria';
              hasCustomSchemeDiff = true;
              detectedCriteria = matchesPerCol.map((m, i) => {
                const effectiveMax = m.headerMax
                  ? Math.max(m.headerMax, Math.ceil(m.observedMax))
                  : m.matchedCrit && m.observedMax <= m.matchedCrit.max && headerRowIndex === -1
                  ? m.matchedCrit.max
                  : Math.max(Math.ceil(m.observedMax), m.matchedCrit?.max || 10);

                return {
                  id: m.matchedCrit?.id || `crit_${i + 1}`,
                  label: headerRowIndex >= 0 ? m.cleanLabel : existingCriteria[i]?.label || m.cleanLabel,
                  max: effectiveMax,
                  sourceCol: m.cand.col,
                  matchedExistingId: m.matchedCrit?.id
                };
              });
            }
          }
        }

        // 4. Parse Data Rows & Flexibly Match Students by Name / ID
        const parsedRows: ParsedGradeRow[] = [];
        let matchedCount = 0;
        let dataRowSequence = 0;

        for (let r = startDataRow; r < rawRows.length; r++) {
          const row = rawRows[r] || [];
          if (!row || row.every((c) => String(c).trim() === '')) continue;

          // Skip duplicate header rows
          const isAnotherHeader = row.some((c) => {
            const h = cleanText(c);
            return h.includes('የተማሪስም') || h.includes('መለያቁጥር') || h === 'studentid';
          });
          if (isAnotherHeader) continue;

          // Step A: Match Student by Name across row cells
          let matchedStudent: Student | null = null;
          let bestNameScore = 0;
          let rawExcelName = '';

          for (let c = 0; c < row.length; c++) {
            if (c === serialColIndex || c === genderColIndex || c === letterColIndex || remarkColIndices.has(c)) continue;
            const cellVal = row[c];
            if (typeof cellVal !== 'string' || cellVal.trim().length < 2) continue;

            for (const s of targetStudents) {
              const score = matchStudentNameScore(cellVal, s.name);
              if (score > bestNameScore && score >= 80) {
                bestNameScore = score;
                matchedStudent = s;
                rawExcelName = String(cellVal).trim();
              }
            }
          }

          if (!matchedStudent) {
            for (let c = 0; c < row.length; c++) {
              if (c === serialColIndex || c === genderColIndex || c === letterColIndex || remarkColIndices.has(c)) continue;
              const cellVal = row[c];
              if (typeof cellVal !== 'string' || cellVal.trim().length < 2) continue;

              for (const s of students) {
                const score = matchStudentNameScore(cellVal, s.name);
                if (score > bestNameScore && score >= 80) {
                  bestNameScore = score;
                  matchedStudent = s;
                  rawExcelName = String(cellVal).trim();
                }
              }
            }
          }

          // Step B: Match by Student ID if not matched by name
          let rawExcelId = '';
          if (!matchedStudent) {
            for (let c = 0; c < row.length; c++) {
              if (c === serialColIndex) continue;
              const cellVal = row[c];
              if (cellVal === null || cellVal === undefined || String(cellVal).trim() === '') continue;

              for (const s of targetStudents) {
                if (isExactStudentIdMatch(cellVal, s.id)) {
                  matchedStudent = s;
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
                if (cellVal === null || cellVal === undefined || String(cellVal).trim() === '') continue;

                for (const s of students) {
                  if (isExactStudentIdMatch(cellVal, s.id)) {
                    matchedStudent = s;
                    rawExcelId = String(cellVal).trim();
                    break;
                  }
                }
                if (matchedStudent) break;
              }
            }
          }

          if (!rawExcelName && nameColIndex !== -1 && row[nameColIndex]) {
            rawExcelName = String(row[nameColIndex]).trim();
          }
          if (!rawExcelId && idColIndex !== -1 && row[idColIndex]) {
            rawExcelId = String(row[idColIndex]).trim();
          }

          // Skip footer summary/average/stat rows cleanly
          if (!matchedStudent) {
            const combinedRowText = row.map((cell) => cleanText(cell)).join(' ');
            const isFooterSummary =
              combinedRowText.includes('ማጠቃለያ') ||
              combinedRowText.includes('የክፍሉአማካይ') ||
              combinedRowText.includes('ስታቲስቲክስ') ||
              combinedRowText.includes('ተፈታኝ') ||
              combinedRowText.includes('ያለፉ') ||
              combinedRowText.includes('classaverage') ||
              combinedRowText.includes('summary');
            if (isFooterSummary) continue;
          }

          // Step C: Extract Exact Teacher Marks (ZERO lossless clamping!)
          const scores: Record<string, number> = {};
          let rowTotal = 0;
          let customTotal: number | undefined = undefined;
          const customLetter = letterColIndex !== -1 ? extractGradeLetterValue(row[letterColIndex]) : undefined;
          let rowHasAnyScore = false;

          if (importMode === 'total_only') {
            const totNum = totalColIndex !== -1 ? extractScoreNumber(row[totalColIndex]) : null;
            if (totNum !== null) {
              const cappedTotal = Math.max(0, Math.min(100, Math.round(totNum * 10) / 10));
              rowTotal = cappedTotal;
              customTotal = cappedTotal;
              rowHasAnyScore = true;
            }
            // Also keep existing criteria keys initialized to 0 so GradeBreakdown remains valid
            existingCriteria.forEach((crit) => {
              scores[crit.id] = 0;
            });
          } else {
            detectedCriteria.forEach((det) => {
              const rawCell = det.sourceCol < row.length ? row[det.sourceCol] : '';
              const num = extractScoreNumber(rawCell);
              if (num !== null) {
                const safeVal = Math.max(0, Math.min(det.max, Math.round(num * 10) / 10));
                scores[det.id] = safeVal;
                rowTotal += safeVal;
                rowHasAnyScore = true;
              } else {
                scores[det.id] = 0;
              }
            });

            // If component columns were blank on this row, check explicit Total column as direct fallback
            if (!rowHasAnyScore && totalColIndex !== -1 && totalColIndex < row.length) {
              const totNum = extractScoreNumber(row[totalColIndex]);
              if (totNum !== null) {
                const cappedTotal = Math.max(0, Math.min(100, Math.round(totNum * 10) / 10));
                rowTotal = cappedTotal;
                customTotal = cappedTotal;
                rowHasAnyScore = true;
              }
            } else if (rowHasAnyScore && totalColIndex !== -1 && totalColIndex < row.length) {
              const explicitTot = extractScoreNumber(row[totalColIndex]);
              if (explicitTot !== null && Math.abs(explicitTot - rowTotal) > 0.25 && rowTotal === 0) {
                rowTotal = Math.max(0, Math.min(100, Math.round(explicitTot * 10) / 10));
                customTotal = rowTotal;
              }
            }
          }

          // Skip trailing blank/notes rows that have neither a student match nor a score
          if (!matchedStudent && !rowHasAnyScore && !rawExcelName && !customLetter) {
            continue;
          }

          const finalRoundedTotal = Math.round(rowTotal * 10) / 10;

          if (matchedStudent) {
            matchedCount++;
            parsedRows.push({
              studentUid: matchedStudent.uid,
              studentId: matchedStudent.id,
              studentName: matchedStudent.name,
              scores,
              totalScore: finalRoundedTotal,
              ...(customTotal !== undefined ? { customTotal } : {}),
              ...(customLetter ? { customLetter } : {}),
              isValid: true,
              notes:
                rawExcelName && rawExcelName !== matchedStudent.name
                  ? `ከኤክሴል: "${rawExcelName}" ✓`
                  : 'በስም ተዛምዷል ✓'
            });
          } else {
            parsedRows.push({
              studentUid: '',
              studentId: rawExcelId || `ተማሪ #${dataRowSequence + 1}`,
              studentName: rawExcelName || 'ያልታወቀ ተማሪ',
              scores,
              totalScore: finalRoundedTotal,
              ...(customTotal !== undefined ? { customTotal } : {}),
              ...(customLetter ? { customLetter } : {}),
              isValid: false,
              notes: 'በሲስተሙ አልተገኘም (እባክዎ ተማሪውን ይምረጡ)'
            });
          }

          dataRowSequence++;
        }

        // Build helpful guidance messages
        if (importMode === 'custom_criteria') {
          warnings.push(
            `መምህሩ ያዘጋጁት ${detectedCriteria.length} የውጤት መመዘኛ አምዶች (${detectedCriteria.map((d) => `${d.label} ${d.max}%`).join('፣ ')}) በቀጥታ ተለይተው ያለ ምንም የማርክ መቀነስ ተነበዋል!`
          );
        } else if (importMode === 'total_only') {
          warnings.push(
            'ከኤክሴሉ ቀጥታ የጠቅላላ ውጤት (ከ 100%) ተገኝቷል፤ የሰጡት ማርክ በቀጥታ ተመዝግቦ ፊደል ደረጃና ነጥብ ራሱ ይሰላል።'
          );
        }

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
          detectedCriteria,
          importMode,
          hasCustomSchemeDiff,
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
