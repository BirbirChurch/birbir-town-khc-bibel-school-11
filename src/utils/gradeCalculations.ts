import { OFFICIAL_GRADING_SCALE } from '../data/initialData.ts';
import { AssessmentCriterionItem, Course, CourseAssessmentConfig, GradeBreakdown, GradeDetail, Student } from '../types.ts';

export const DEFAULT_ASSESSMENT_ITEMS: AssessmentCriterionItem[] = [
  { id: 'p1', label: 'ክፍል 1', max: 20 },
  { id: 'p2', label: 'ክፍል 2', max: 20 },
  { id: 'mid', label: 'ሚድ', max: 30 },
  { id: 'final', label: 'ፋይናል', max: 20 },
  { id: 'att', label: 'ተሳትፎ', max: 10 }
];

export const DEFAULT_ASSESSMENT_CONFIG: CourseAssessmentConfig = {
  items: DEFAULT_ASSESSMENT_ITEMS,
  p1Label: 'ክፍል 1',
  p1Max: 20,
  p2Label: 'ክፍል 2',
  p2Max: 20,
  midLabel: 'ሚድ',
  midMax: 30,
  finalLabel: 'ፋይናል',
  finalMax: 20,
  attLabel: 'ተሳትፎ',
  attMax: 10
};

export function getCourseAssessmentItems(configOrCourse?: Course | CourseAssessmentConfig): AssessmentCriterionItem[] {
  if (!configOrCourse) return [...DEFAULT_ASSESSMENT_ITEMS];
  const config: CourseAssessmentConfig | undefined =
    'assessmentConfig' in (configOrCourse as Course)
      ? (configOrCourse as Course).assessmentConfig
      : (configOrCourse as CourseAssessmentConfig);

  if (config?.items && Array.isArray(config.items) && config.items.length > 0) {
    return config.items.map((item: AssessmentCriterionItem) => ({ ...item }));
  }
  return [
    { id: 'p1', label: config?.p1Label || 'ክፍል 1', max: Number(config?.p1Max) || 20 },
    { id: 'p2', label: config?.p2Label || 'ክፍል 2', max: Number(config?.p2Max) || 20 },
    { id: 'mid', label: config?.midLabel || 'ሚድ', max: Number(config?.midMax) || 30 },
    { id: 'final', label: config?.finalLabel || 'ፋይናል', max: Number(config?.finalMax) || 20 },
    { id: 'att', label: config?.attLabel || 'ተሳትፎ', max: Number(config?.attMax) || 10 }
  ];
}

export function getCriterionScore(breakdown: GradeBreakdown | undefined, itemId: string, index?: number): number {
  if (!breakdown) return 0;
  if (breakdown.scores && typeof breakdown.scores[itemId] === 'number') {
    return breakdown.scores[itemId];
  }
  if (itemId === 'p1') return breakdown.p1 || 0;
  if (itemId === 'p2') return breakdown.p2 || 0;
  if (itemId === 'mid') return breakdown.mid || 0;
  if (itemId === 'final') return breakdown.final || 0;
  if (itemId === 'att') return breakdown.att || 0;
  if (typeof index === 'number') {
    if (index === 0) return breakdown.p1 || 0;
    if (index === 1) return breakdown.p2 || 0;
    if (index === 2) return breakdown.mid || 0;
    if (index === 3) return breakdown.final || 0;
    if (index === 4) return breakdown.att || 0;
  }
  return 0;
}

export function getCourseAssessmentConfig(course?: Course): CourseAssessmentConfig {
  if (course?.assessmentConfig) {
    const items = getCourseAssessmentItems(course);
    return {
      items,
      p1Label: items[0]?.label || DEFAULT_ASSESSMENT_CONFIG.p1Label,
      p1Max: items[0]?.max || DEFAULT_ASSESSMENT_CONFIG.p1Max,
      p2Label: items[1]?.label || DEFAULT_ASSESSMENT_CONFIG.p2Label,
      p2Max: items[1]?.max || DEFAULT_ASSESSMENT_CONFIG.p2Max,
      midLabel: items[2]?.label || DEFAULT_ASSESSMENT_CONFIG.midLabel,
      midMax: items[2]?.max || DEFAULT_ASSESSMENT_CONFIG.midMax,
      finalLabel: items[3]?.label || DEFAULT_ASSESSMENT_CONFIG.finalLabel,
      finalMax: items[3]?.max || DEFAULT_ASSESSMENT_CONFIG.finalMax,
      attLabel: items[4]?.label || DEFAULT_ASSESSMENT_CONFIG.attLabel,
      attMax: items[4]?.max || DEFAULT_ASSESSMENT_CONFIG.attMax
    };
  }
  return DEFAULT_ASSESSMENT_CONFIG;
}

export function calculateGradeDetails(score: number): GradeDetail {
  const num = Math.min(100, Math.max(0, Math.round((Number(score) || 0) * 10) / 10));
  const rounded = Math.round(num);
  const grade = OFFICIAL_GRADING_SCALE.find(g => rounded >= g.min && rounded <= g.max) 
    || OFFICIAL_GRADING_SCALE[OFFICIAL_GRADING_SCALE.length - 1];
  
  return {
    score: num,
    letter: grade.letter,
    points: grade.points,
    desc: grade.desc
  };
}

export function getEffectiveGradeValues(breakdown?: GradeBreakdown, criteria?: AssessmentCriterionItem[]): {
  hasAny: boolean;
  total: number;
  letter: string;
  points: number;
  desc: string;
} {
  if (!breakdown) {
    return { hasAny: false, total: 0, letter: '—', points: 0, desc: 'አልተሞላም' };
  }

  let partsSum = 0;
  if (criteria && criteria.length > 0) {
    partsSum = criteria.reduce((sum, item, idx) => sum + getCriterionScore(breakdown, item.id, idx), 0);
  } else if (breakdown.scores && Object.keys(breakdown.scores).length > 0) {
    partsSum = Object.values(breakdown.scores).reduce((sum, val) => sum + (Number(val) || 0), 0);
  } else {
    partsSum = (breakdown.p1 || 0) + (breakdown.p2 || 0) + (breakdown.mid || 0) + (breakdown.final || 0) + (breakdown.att || 0);
  }

  const hasCustomTotal = typeof breakdown.customTotal === 'number' && !isNaN(breakdown.customTotal);
  const total = hasCustomTotal ? breakdown.customTotal! : partsSum;
  
  const hasAny = total > 0 || Boolean(breakdown.customLetter) || Boolean(breakdown.customDesc) || hasCustomTotal;

  if (!hasAny) {
    return { hasAny: false, total: 0, letter: '—', points: 0, desc: 'አልተሞላም' };
  }

  const standard = calculateGradeDetails(total);

  let letter = breakdown.customLetter || standard.letter;
  let points = standard.points;
  if (breakdown.customLetter) {
    const matched = OFFICIAL_GRADING_SCALE.find(g => g.letter.toLowerCase() === breakdown.customLetter?.toLowerCase());
    if (matched) {
      points = matched.points;
    }
  }

  const desc = breakdown.customDesc || standard.desc;

  return {
    hasAny: true,
    total,
    letter,
    points,
    desc
  };
}

export function getGradeKey(studentUid: string, courseId: string, year: string, sem: string): string {
  return `${studentUid}_${courseId}_${year}_${sem}`;
}

export function resolveGradeBreakdown(
  gradesRecord: Record<string, GradeBreakdown> | undefined,
  studentUid: string,
  courseId: string,
  year: string,
  semester: string,
  studentId?: string
): GradeBreakdown {
  const empty: GradeBreakdown = { p1: 0, p2: 0, mid: 0, final: 0, att: 0 };
  if (!gradesRecord || typeof gradesRecord !== 'object') {
    return empty;
  }

  // If semester is 'ALL' or empty, check semester 1, semester 2, or direct keys
  if (semester === 'ALL' || !semester) {
    const sem1Key = getGradeKey(studentUid, courseId, year, '1');
    if (gradesRecord[sem1Key]) return gradesRecord[sem1Key];
    const sem2Key = getGradeKey(studentUid, courseId, year, '2');
    if (gradesRecord[sem2Key]) return gradesRecord[sem2Key];
  }

  // 1. Composite key by UID: studentUid_courseId_year_sem
  const keyWithUid = getGradeKey(studentUid, courseId, year, semester);
  if (gradesRecord[keyWithUid]) {
    return gradesRecord[keyWithUid];
  }

  // 2. Direct student UID (local portal state key)
  if (gradesRecord[studentUid]) {
    return gradesRecord[studentUid];
  }

  // 3. Official Student ID
  if (studentId) {
    if (gradesRecord[studentId]) {
      return gradesRecord[studentId];
    }
    const keyWithId = getGradeKey(studentId, courseId, year, semester);
    if (gradesRecord[keyWithId]) {
      return gradesRecord[keyWithId];
    }
  }

  // 4. Case-insensitive / prefix matching
  const cleanUid = studentUid.trim().toLowerCase();
  const cleanId = studentId ? studentId.trim().toLowerCase() : '';
  const cleanKey = keyWithUid.toLowerCase();

  for (const k of Object.keys(gradesRecord)) {
    const kLow = k.toLowerCase();
    if (kLow === cleanKey || kLow === cleanUid || (cleanId && kLow === cleanId)) {
      return gradesRecord[k];
    }
  }

  // 5. Fallback: match by studentUid/studentId AND courseId anywhere in key so teacher-submitted grades are never lost
  if (courseId) {
    const cleanCourse = courseId.trim().toLowerCase();
    for (const [k, val] of Object.entries(gradesRecord)) {
      const kLow = k.toLowerCase();
      const hasStudent = kLow.includes(cleanUid) || (cleanId && kLow.includes(cleanId));
      const hasCourse = kLow.includes(cleanCourse);
      if (hasStudent && hasCourse && val) {
        return val;
      }
    }
  }

  return empty;
}

export function is2018CandidateStudent(student: Student): boolean {
  return (
    student.graduationStatus === 'CANDIDATE' ||
    student.graduationStatus === 'GRADUATED' ||
    student.admissionYear === '2018' ||
    student.degreeTrack === '2_YEAR' ||
    student.priorDiploma === true ||
    Boolean(student.id && student.id.startsWith('2018'))
  );
}

export function calculateStudentGPA(
  student: Student,
  allCourses: Course[],
  gradesRecord: Record<string, GradeBreakdown>,
  year: string,
  sem: string
): string {
  const isCandidate = is2018CandidateStudent(student);

  const studentCourses = allCourses.filter((c) => {
    if (c.program !== student.program) return false;
    if (year === '2018') {
      if (!isCandidate) return false;
      return (
        (c.academicYear === '2018' || c.id.startsWith('dip_sem1') || c.id.startsWith('dip_sem2')) &&
        (c.semester === sem || !c.semester || sem === 'ALL')
      );
    }
    if (!isCandidate) {
      if (
        c.academicYear === '2018' ||
        c.id.startsWith('dip_sem1') ||
        c.id.startsWith('dip_sem2') ||
        c.id.startsWith('deg_p')
      ) {
        return false;
      }
    }
    if (c.semester && sem && c.semester !== sem && sem !== 'ALL') {
      return false;
    }
    return true;
  });

  let totalQualityPoints = 0;
  let totalCredits = 0;

  studentCourses.forEach((course) => {
    const breakdown = resolveGradeBreakdown(gradesRecord, student.uid, course.id, year, sem, student.id);
    const eff = getEffectiveGradeValues(breakdown, getCourseAssessmentItems(course));
    if (eff.hasAny) {
      totalQualityPoints += eff.points * course.credits;
      totalCredits += course.credits;
    }
  });

  if (totalCredits === 0) return '0.00';
  return (totalQualityPoints / totalCredits).toFixed(2);
}

export function generateInitialSampleGrades(
  students: Student[],
  courses: Course[]
): Record<string, GradeBreakdown> {
  const sample: Record<string, GradeBreakdown> = {};

  students.forEach((s, idx) => {
    const progCourses = courses.filter(c => c.program === s.program);
    progCourses.forEach(c => {
      const key = getGradeKey(s.uid, c.id, '2019', '1');
      // Produce realistic distribution (70 - 98)
      const baseScore = 70 + ((idx * 11 + c.name.length * 5) % 28);
      
      const p1 = Math.min(20, Math.round(baseScore * 0.20));
      const p2 = Math.min(20, Math.round(baseScore * 0.20));
      const mid = Math.min(30, Math.round(baseScore * 0.30));
      const final = Math.min(20, Math.round(baseScore * 0.20));
      const att = Math.min(10, Math.round(baseScore * 0.10));

      sample[key] = { p1, p2, mid, final, att };
    });
  });

  // Explicit grades for newly added Diploma students for 'አጠናን ዘዴ' (dip_c2)
  sample['dip_201927_dip_c2_2019_1'] = { p1: 29, p2: 14, mid: 38, final: 15, att: 0 };
  sample['dip_201928_dip_c2_2019_1'] = { p1: 30, p2: 15, mid: 38, final: 15, att: 0 };

  return sample;
}
