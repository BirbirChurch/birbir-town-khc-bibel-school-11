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
    if (partsSum === 0 && breakdown.scores && Object.keys(breakdown.scores).length > 0) {
      const scoresSum = Object.values(breakdown.scores).reduce((sum, val) => sum + (Number(val) || 0), 0);
      if (scoresSum > 0) {
        partsSum = scoresSum;
      }
    }
  } else if (breakdown.scores && Object.keys(breakdown.scores).length > 0) {
    partsSum = Object.values(breakdown.scores).reduce((sum, val) => sum + (Number(val) || 0), 0);
  } else {
    partsSum = (breakdown.p1 || 0) + (breakdown.p2 || 0) + (breakdown.mid || 0) + (breakdown.final || 0) + (breakdown.att || 0);
  }

  partsSum = Math.round(partsSum * 100) / 100;

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

interface GradeRecordCache {
  resolved: Map<string, GradeBreakdown | null>;
  byLowerKey: Map<string, GradeBreakdown> | null;
}

const gradeLookupCache = new WeakMap<Record<string, GradeBreakdown>, GradeRecordCache>();

function getGradeRecordCache(gradesRecord: Record<string, GradeBreakdown>): GradeRecordCache {
  let cache = gradeLookupCache.get(gradesRecord);
  if (!cache) {
    cache = { resolved: new Map<string, GradeBreakdown | null>(), byLowerKey: null };
    gradeLookupCache.set(gradesRecord, cache);
  }
  return cache;
}

function createEmptyBreakdown(): GradeBreakdown {
  return { p1: 0, p2: 0, mid: 0, final: 0, att: 0 };
}

export function resolveGradeBreakdown(
  gradesRecord: Record<string, GradeBreakdown> | undefined,
  studentUid: string,
  courseId: string,
  year: string = '2019',
  semester: string = '1',
  studentId?: string
): GradeBreakdown {
  if (!gradesRecord || typeof gradesRecord !== 'object') {
    return createEmptyBreakdown();
  }

  const cleanUid = studentUid.trim();
  const cleanId = studentId ? studentId.trim() : '';
  const cleanCourse = courseId.trim();

  const cache = getGradeRecordCache(gradesRecord);
  const cacheKey = `${cleanUid}\0${cleanId}\0${cleanCourse}\0${year}\0${semester}`;
  if (cache.resolved.has(cacheKey)) {
    const cached = cache.resolved.get(cacheKey);
    return cached ? cached : createEmptyBreakdown();
  }

  // Generate course ID aliases to support both dip_2018_sem* and dip_sem* IDs seamlessly
  const courseCandidates = [cleanCourse];
  if (cleanCourse.includes('2018_')) {
    courseCandidates.push(cleanCourse.replace('2018_', ''));
  }
  if (cleanCourse.startsWith('dip_sem')) {
    courseCandidates.push(cleanCourse.replace('dip_sem', 'dip_2018_sem'));
  } else if (cleanCourse.startsWith('dip_2018_sem')) {
    courseCandidates.push(cleanCourse.replace('dip_2018_sem', 'dip_sem'));
  }

  // 1. Prioritize strict UID matches (exact term key first, then direct course key)
  for (let i = 0; i < courseCandidates.length; i++) {
    const cCandidate = courseCandidates[i];
    const keyWithUid = getGradeKey(cleanUid, cCandidate, year, semester);
    const v1 = gradesRecord[keyWithUid];
    if (v1 && getEffectiveGradeValues(v1).hasAny) {
      cache.resolved.set(cacheKey, v1);
      return v1;
    }
  }

  for (let i = 0; i < courseCandidates.length; i++) {
    const cCandidate = courseCandidates[i];
    const directKeyUid = `${cleanUid}_${cCandidate}`;
    const v3 = gradesRecord[directKeyUid];
    if (v3 && getEffectiveGradeValues(v3).hasAny) {
      cache.resolved.set(cacheKey, v3);
      return v3;
    }
  }

  // 2. Next check strict official student ID matches (only if distinct UID key was not found)
  if (cleanId) {
    for (let i = 0; i < courseCandidates.length; i++) {
      const cCandidate = courseCandidates[i];
      const keyWithId = getGradeKey(cleanId, cCandidate, year, semester);
      const v2 = gradesRecord[keyWithId];
      if (v2 && getEffectiveGradeValues(v2).hasAny) {
        cache.resolved.set(cacheKey, v2);
        return v2;
      }
    }

    for (let i = 0; i < courseCandidates.length; i++) {
      const cCandidate = courseCandidates[i];
      const directKeyId = `${cleanId}_${cCandidate}`;
      const v4 = gradesRecord[directKeyId];
      if (v4 && getEffectiveGradeValues(v4).hasAny) {
        cache.resolved.set(cacheKey, v4);
        return v4;
      }
    }
  }

  // 3. Case-insensitive exact key index (NEVER substring matching or cross-semester leakage)
  if (!cache.byLowerKey) {
    const map = new Map<string, GradeBreakdown>();
    const keys = Object.keys(gradesRecord);
    for (let kIdx = 0; kIdx < keys.length; kIdx++) {
      const k = keys[kIdx];
      const val = gradesRecord[k];
      if (val && getEffectiveGradeValues(val).hasAny) {
        map.set(k.toLowerCase(), val);
      }
    }
    cache.byLowerKey = map;
  }

  const lowUid = cleanUid.toLowerCase();
  const lowId = cleanId ? cleanId.toLowerCase() : '';
  const lowYear = year.trim().toLowerCase();
  const lowSem = semester.trim().toLowerCase();

  for (let i = 0; i < courseCandidates.length; i++) {
    const cLow = courseCandidates[i].toLowerCase();
    const candidatesToTry = [
      `${lowUid}_${cLow}_${lowYear}_${lowSem}`,
      `${lowUid}_${cLow}`
    ];
    if (lowId) {
      candidatesToTry.push(`${lowId}_${cLow}_${lowYear}_${lowSem}`);
      candidatesToTry.push(`${lowId}_${cLow}`);
    }
    for (let j = 0; j < candidatesToTry.length; j++) {
      const hit = cache.byLowerKey.get(candidatesToTry[j]);
      if (hit) {
        cache.resolved.set(cacheKey, hit);
        return hit;
      }
    }
  }

  cache.resolved.set(cacheKey, null);
  return createEmptyBreakdown();
}

export function is2018DiplomaEntrant(student: Student): boolean {
  return (
    student.program === 'Diploma' &&
    (student.admissionYear === '2018' ||
      Boolean(student.id && student.id.startsWith('2018')) ||
      student.currentStudyYear === 2 ||
      student.graduationStatus === 'CANDIDATE' ||
      student.graduationStatus === 'GRADUATED')
  );
}

export function is2018CandidateStudent(student: Student): boolean {
  return (
    is2018DiplomaEntrant(student) ||
    student.degreeTrack === '2_YEAR' ||
    student.priorDiploma === true
  );
}

export function normalizeCourseAliasId(courseId: string): string {
  return courseId.replace('dip_2018_sem', 'dip_sem');
}

export function calculateStudentGPA(
  student: Student,
  allCourses: Course[],
  gradesRecord: Record<string, GradeBreakdown>,
  year: string,
  sem: string
): string {
  const isCandidate = is2018CandidateStudent(student);
  const isDip2018 = is2018DiplomaEntrant(student);

  const seenAliasIds = new Set<string>();
  const studentCourses = allCourses.filter((c) => {
    if (c.program !== student.program) return false;
    const cYear = c.academicYear || (c.schedule && c.schedule.includes('2018') ? '2018' : '2019');
    const cSem = c.semester || (c.schedule && c.schedule.includes('2ኛ') ? '2' : '1');

    if (year === '2018') {
      const isSem2 = sem === '2' || cSem === '2' || c.id.includes('sem2');
      if (isSem2 && !isDip2018) {
        return false;
      }
      if (!isCandidate && !isDip2018) return false;
      const is2018Course =
        cYear === '2018' ||
        c.id.includes('2018') ||
        c.id.startsWith('dip_sem1') ||
        c.id.startsWith('dip_sem2') ||
        c.id.startsWith('deg_p');
      if (!is2018Course) return false;
      if (sem !== 'ALL' && cSem !== sem) return false;
    } else {
      if (
        cYear === '2018' ||
        c.id.includes('2018') ||
        c.id.startsWith('dip_sem1') ||
        c.id.startsWith('dip_sem2') ||
        c.id.startsWith('deg_p')
      ) {
        return false;
      }
      if (year && year !== 'ALL' && cYear !== year) return false;
      if (sem && sem !== 'ALL' && cSem !== sem) return false;
    }

    const aliasKey = normalizeCourseAliasId(c.id);
    if (seenAliasIds.has(aliasKey)) return false;
    seenAliasIds.add(aliasKey);
    return true;
  });

  let totalQualityPoints = 0;
  let totalCredits = 0;

  studentCourses.forEach((course) => {
    const targetYear = course.academicYear || (course.schedule && course.schedule.includes('2018') ? '2018' : year);
    const targetSem = course.semester || (course.schedule && course.schedule.includes('2ኛ') ? '2' : (sem === 'ALL' ? '1' : sem));
    const breakdown = resolveGradeBreakdown(gradesRecord, student.uid, course.id, targetYear, targetSem, student.id);
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
