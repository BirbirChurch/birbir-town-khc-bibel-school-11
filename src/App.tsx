import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header.tsx';
import { NotificationToast } from './components/NotificationToast.tsx';
import { LoginView } from './components/LoginView.tsx';
import { AdminPortal } from './components/AdminPortal.tsx';
import { DeanPortal } from './components/DeanPortal.tsx';
import { RegistrarPortal } from './components/RegistrarPortal.tsx';
import { TeacherPortal } from './components/TeacherPortal.tsx';
import { StudentPortal } from './components/StudentPortal.tsx';
import { TranscriptModal } from './components/TranscriptModal.tsx';
import { PasswordModal } from './components/PasswordModal.tsx';
import { CourseModal } from './components/CourseModal.tsx';
import { StudentModal } from './components/StudentModal.tsx';
import { PhotoModal } from './components/PhotoModal.tsx';
import { FirebaseStatusModal } from './components/FirebaseStatusModal.tsx';
import { DailyVerseBanner } from './components/DailyVerseBanner.tsx';
import { HistoricalArchiveModal } from './components/HistoricalArchiveModal.tsx';
import { GradeReleaseManagerModal } from './components/GradeReleaseManagerModal.tsx';
import { UniversalJsonReaderModal, JsonImportPayload } from './components/UniversalJsonReaderModal.tsx';
import { firebaseConfig } from './firebase.ts';
import { getStoredChurchLogo, saveChurchLogo, DEFAULT_CHURCH_LOGO, loadPersistentChurchLogo } from './assets/logo.ts';
import { loadPersistentOfficialConfig } from './components/OfficialSignaturesManager.tsx';
import { getInitial2018HistoricalCourses, getDeletedCourseIdsSet, saveHistorical2018Courses } from './data/curriculumCourses.ts';
import { generateFullSystemMasterBackup } from './data/fullSystemMasterJson.ts';

import {
  PRELOADED_COURSES,
  PRELOADED_STUDENTS,
  PRELOADED_TEACHERS,
  DEFAULT_TEACHER_KEYS,
  generateTeacherKey,
  generateInitialUserPasswords,
  DEFAULT_STUDENT_PASSKEYS,
  generateStudentPasskey
} from './data/initialData.ts';
import { sortStudentsByAmharicName } from './utils/amharicSort.ts';
import { Course, CurrentUser, GradeBreakdown, OfficialSignaturesConfig, SemesterReleaseConfig, Student, SystemNotification } from './types.ts';
import { useLanguage, formatRole, formatCourseTitle, formatProgram } from './utils/i18n.tsx';

import { generateInitialSampleGrades } from './utils/gradeCalculations.ts';
import {
  checkFirebaseConnection,
  pushAllStateToFirestore,
  loadInitialFromFirestore,
  subscribeToSystemState,
  syncMetaToFirestore,
  syncStudentsToFirestore,
  syncCoursesToFirestore,
  syncGradesToFirestore,
  syncPasswordsToFirestore,
  syncPhotosToFirestore,
  syncChurchLogoToFirestore,
  loadChurchLogoFromFirestore,
  syncOfficialConfigToFirestore,
  FirebaseConnectionReport
} from './services/firebaseSync.ts';

const DEFAULT_ACADEMIC_YEARS = [
  '2019', '2020', '2021', '2022', '2023', '2024',
  '2025', '2026', '2027', '2028', '2029', '2030'
];

const DEFAULT_SEMESTER_RELEASE: SemesterReleaseConfig = {
  '2018_1': true,
  '2018_2': true,
  '2019_1': true,
  '2019_2': false,
  cumulative: true,
  all: false
};

function mergeCoursesWithPreloaded(incomingCourses: Course[]): Course[] {
  const deletedSet = getDeletedCourseIdsSet();
  const map = new Map<string, Course>();
  
  // 1. Add all preloaded courses with their accurate academic year and semester
  PRELOADED_COURSES.forEach((c) => {
    if (deletedSet.has(c.id)) return;
    const is2018 = c.id.includes('2018') || c.id.startsWith('dip_sem') || c.academicYear === '2018';
    const isSem2 = c.id.includes('sem2') || c.semester === '2';
    map.set(c.id, {
      ...c,
      academicYear: is2018 ? '2018' : (c.academicYear || '2019'),
      semester: isSem2 ? '2' : (c.semester || '1')
    });
  });

  // 2. Add all preloaded 2018 historical curriculum courses explicitly
  const hist2018 = getInitial2018HistoricalCourses();
  hist2018.forEach((c) => {
    if (deletedSet.has(c.id)) return;
    map.set(c.id, {
      ...c,
      academicYear: '2018',
      semester: c.semester || (c.id.includes('sem2') ? '2' : '1')
    });
  });

  // 3. Merge incoming courses (if provided) and purge unwanted duplicates
  if (Array.isArray(incomingCourses)) {
    incomingCourses.forEach((c) => {
      if (!c || !c.id || deletedSet.has(c.id)) return;

      // Core 2019 preloaded courses must remain strictly semester 1
      if (c.id.startsWith('deg_c') || c.id.startsWith('dip_c')) {
        const existing = map.get(c.id);
        map.set(c.id, {
          ...(existing || c),
          ...c,
          academicYear: '2019',
          semester: '1'
        });
        return;
      }

      // 2018 historical courses
      if (c.id.startsWith('dip_sem1') || c.id.startsWith('dip_2018_sem1')) {
        map.set(c.id, { ...c, academicYear: '2018', semester: '1' });
        return;
      }
      if (c.id.startsWith('dip_sem2') || c.id.startsWith('dip_2018_sem2')) {
        map.set(c.id, { ...c, academicYear: '2018', semester: '2' });
        return;
      }

      // Purge any unwanted/duplicate 2019 2nd semester courses unless explicitly created
      const yr = c.academicYear || (c.schedule && c.schedule.includes('2018') ? '2018' : '2019');
      const sem = c.semester || (c.schedule && c.schedule.includes('2ኛ') ? '2' : '1');
      if (yr === '2019' && sem === '2' && !c.id.includes('2018') && !c.id.startsWith('dip_sem') && !c.id.startsWith('c_')) {
        return;
      }

      map.set(c.id, c);
    });
  }

  const result = Array.from(map.values());
  try {
    localStorage.setItem('bk_courses', JSON.stringify(result));
  } catch (_) {}
  return result;
}


function mergeStudentsWithPreloaded(incomingStudents: Student[]): Student[] {
  if (!Array.isArray(incomingStudents)) return sortStudentsByAmharicName(PRELOADED_STUDENTS);
  const merged = [...incomingStudents];
  PRELOADED_STUDENTS.forEach((ps) => {
    if (!merged.some((s) => s.uid === ps.uid || (s.id === ps.id && s.program === ps.program))) {
      merged.push(ps);
    }
  });
  return sortStudentsByAmharicName(merged);
}

function mergeGradesWithPreloaded(incomingGrades: Record<string, GradeBreakdown>): Record<string, GradeBreakdown> {
  const merged = { ...(incomingGrades || {}) };

  const isExplicitlyCleared =
    typeof window !== 'undefined' && localStorage.getItem('bk_grades_cleared') === 'true';

  // Only seed initial sample grades on a completely clean system (no existing grades and not cleared)
  // NEVER inject synthetic 2018 or 2019 grades over real registered records!
  const hasExistingGrades = Object.keys(merged).length > 0;
  if (!hasExistingGrades && !isExplicitlyCleared) {
    const sample = generateInitialSampleGrades(PRELOADED_STUDENTS, PRELOADED_COURSES);
    Object.keys(sample).forEach((k) => {
      if (!merged[k]) {
        merged[k] = sample[k];
      }
    });

    if (!merged['dip_201927_dip_c2_2019_1']) {
      merged['dip_201927_dip_c2_2019_1'] = { p1: 29, p2: 14, mid: 38, final: 15, att: 0 };
    }
    if (!merged['dip_201928_dip_c2_2019_1']) {
      merged['dip_201928_dip_c2_2019_1'] = { p1: 30, p2: 15, mid: 38, final: 15, att: 0 };
    }

    const candidate2018Uids = [
      'dip_201801', 'dip_201802', 'dip_201803', 'dip_201804', 'dip_201805',
      'dip_201806', 'dip_201807', 'dip_201808', 'dip_201810', 'dip_201811'
    ];
    const hist2018Courses = getInitial2018HistoricalCourses();
    candidate2018Uids.forEach((uid, sIdx) => {
      const studentNumId = uid.replace('dip_', '');
      hist2018Courses.forEach((c) => {
        const year = c.academicYear || '2018';
        const sem = c.semester || '1';
        const keyByUid = `${uid}_${c.id}_${year}_${sem}`;
        const aliasCourseId = c.id.includes('2018_') ? c.id.replace('2018_', '') : c.id;
        const keyByUidAlias = `${uid}_${aliasCourseId}_${year}_${sem}`;
        const keyById = `${studentNumId}_${c.id}_${year}_${sem}`;
        const keyByIdAlias = `${studentNumId}_${aliasCourseId}_${year}_${sem}`;

        const existing = merged[keyByUid] || merged[keyByUidAlias] || merged[keyById] || merged[keyByIdAlias];
        if (!existing) {
          const scoreBase = 74 + ((sIdx * 7 + c.name.length * 3) % 23);
          const gradeObj = {
            p1: Math.min(20, Math.round(scoreBase * 0.20)),
            p2: Math.min(20, Math.round(scoreBase * 0.20)),
            mid: Math.min(30, Math.round(scoreBase * 0.30)),
            final: Math.min(20, Math.round(scoreBase * 0.20)),
            att: Math.min(10, Math.round(scoreBase * 0.10))
          };
          merged[keyByUid] = gradeObj;
          merged[keyByUidAlias] = gradeObj;
        }
      });
    });
  }

  return merged;
}

function mergePasswordsWithPreloaded(incomingPasswords: Record<string, string>): Record<string, string> {
  const merged = { ...incomingPasswords };
  PRELOADED_TEACHERS.forEach((t, idx) => {
    if (!t.includes('—') && (!merged[t] || merged[t] === 'teacher123')) {
      merged[t] = DEFAULT_TEACHER_KEYS[t] || generateTeacherKey(t, idx + 1);
    }
  });
  PRELOADED_STUDENTS.forEach((s, idx) => {
    if (!merged[s.uid] || merged[s.uid] === s.id) {
      merged[s.uid] = DEFAULT_STUDENT_PASSKEYS[s.uid] || generateStudentPasskey(s, idx + 1);
    }
  });
  return merged;
}

export default function App() {
  const { lang, t } = useLanguage();
  // Current user state
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  // Admin universal view switcher ('ADMIN' | 'DEAN' | 'REGISTRAR' | 'TEACHER' | 'STUDENT')
  const [adminActiveView, setAdminActiveView] = useState<'ADMIN' | 'DEAN' | 'REGISTRAR' | 'TEACHER' | 'STUDENT'>('ADMIN');
  const [adminSelectedStudentUid, setAdminSelectedStudentUid] = useState<string>('');

  // Academic calendar state
  const [currentYear, setCurrentYear] = useState<string>('2019');
  const [currentSemester, setCurrentSemester] = useState<string>('1');
  const [systemLocked, setSystemLocked] = useState<boolean>(false);
  const [gradePublished, setGradePublished] = useState<boolean>(true);

  // Granular semester-by-semester grade release control for Dean & Admin
  const [semesterRelease, setSemesterRelease] = useState<SemesterReleaseConfig>(() => {
    try {
      const stored = localStorage.getItem('bk_semester_release');
      if (stored) return { ...DEFAULT_SEMESTER_RELEASE, ...JSON.parse(stored) };
    } catch (_) {}
    return DEFAULT_SEMESTER_RELEASE;
  });

  const handleToggleSemesterRelease = (key: string, value?: boolean) => {
    setSemesterRelease((prev) => {
      const current = prev[key] ?? false;
      const nextVal = value !== undefined ? value : !current;
      const next: SemesterReleaseConfig = { ...prev, [key]: nextVal };
      try {
        localStorage.setItem('bk_semester_release', JSON.stringify(next));
      } catch (_) {}
      showNotification(
        key === 'cumulative'
          ? t(
              `የጥምር የምረቃ ውጤት እይታ ፈቃድ ${nextVal ? 'ተፈቅዷል (Released)' : 'ታግዷል (Held)'}!`,
              `Cumulative graduation grade visibility ${nextVal ? 'released' : 'held'}!`
            )
          : t(
              `የ${key} እይታ ፈቃድ ${nextVal ? 'ተፈቅዷል (Released)' : 'ታግዷል (Held)'}!`,
              `${key} release status ${nextVal ? 'released' : 'held'}!`
            ),
        nextVal ? 'success' : 'warning'
      );
      return next;
    });
  };

  const handleToggleAllSemestersRelease = (value: boolean) => {
    setSemesterRelease(() => {
      const next: SemesterReleaseConfig = {
        '2018_1': value,
        '2018_2': value,
        '2019_1': value,
        '2019_2': value,
        cumulative: value,
        all: value
      };
      try {
        localStorage.setItem('bk_semester_release', JSON.stringify(next));
      } catch (_) {}
      showNotification(
        value
          ? t('ሁሉም ሰሚስተሮች ለተማሪዎች ይፋ ሆነዋል (All Released)!', 'All semesters released to students!')
          : t('ሁሉም ሰሚስተሮች ለተማሪዎች እንዳይታዩ ታግደዋል (All Held)!', 'All semesters held from students!'),
        value ? 'success' : 'warning'
      );
      return next;
    });
  };

  const [availableYears, setAvailableYears] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('bk_academic_years');
      if (stored) {
        const parsed: string[] = JSON.parse(stored);
        const combined = Array.from(new Set([...DEFAULT_ACADEMIC_YEARS, ...parsed]));
        combined.sort((a, b) => parseInt(a) - parseInt(b));
        return combined;
      }
      return DEFAULT_ACADEMIC_YEARS;
    } catch {
      return DEFAULT_ACADEMIC_YEARS;
    }
  });

  // Teachers roster state
  const [teachers, setTeachers] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('bk_teachers');
      return stored ? JSON.parse(stored) : PRELOADED_TEACHERS;
    } catch {
      return PRELOADED_TEACHERS;
    }
  });

  // Students roster state - ordered in traditional Amharic Fidel sequence (ሀ እስከ ፐ)
  const [students, setStudents] = useState<Student[]>(() => {
    try {
      const stored = localStorage.getItem('bk_students');
      const list = stored ? JSON.parse(stored) : PRELOADED_STUDENTS;
      return mergeStudentsWithPreloaded(list);
    } catch {
      return mergeStudentsWithPreloaded(PRELOADED_STUDENTS);
    }
  });


  // Courses state
  const [courses, setCourses] = useState<Course[]>(() => {
    try {
      const stored = localStorage.getItem('bk_courses');
      const list = stored ? JSON.parse(stored) : PRELOADED_COURSES;
      return mergeCoursesWithPreloaded(list);
    } catch {
      return mergeCoursesWithPreloaded(PRELOADED_COURSES);
    }
  });

  // Grades state - initialized with preloaded grades so downloads are never blank
  const [grades, setGrades] = useState<Record<string, GradeBreakdown>>(() => {
    try {
      const stored = localStorage.getItem('bk_grades');
      const parsed = stored ? JSON.parse(stored) : {};
      const merged = mergeGradesWithPreloaded(parsed);
      try {
        localStorage.setItem('bk_grades', JSON.stringify(merged));
      } catch (_) {}
      return merged;
    } catch {
      return mergeGradesWithPreloaded({});
    }
  });

  // Official Stamp and Signatures state (for Dean & Super Admin control)
  const [officialConfig, setOfficialConfig] = useState<OfficialSignaturesConfig>(() => {
    try {
      const stored = localStorage.getItem('bk_official_config');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Error loading official config from localStorage:', e);
    }
    return {
      showStamp: false,
      stampImage: '',
      useChurchLogoAsStamp: true,
      showDeanSignature: false,
      deanSignatureImage: '',
      deanName: 'መ/ር ገላቲያ ድስታ',
      deanTitle: 'የዋና ዲን ስምና ፊርማ (Academic Dean Signature)',
      showRegistrarSignature: false,
      registrarSignatureImage: '',
      registrarName: 'መ/ር አስራት አማኑኤል',
      registrarTitle: 'የሪጅስተራል ስምና ፊርማ (Registrar Signature)'
    };
  });

  // Photos state
  const [photos, setPhotos] = useState<Record<string, string>>(() => {
    try {
      const stored = localStorage.getItem('bk_photos');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Individual user passwords state
  const [userPasswords, setUserPasswords] = useState<Record<string, string>>(() => {
    try {
      const stored = localStorage.getItem('bk_user_passwords');
      const base: Record<string, string> = stored ? JSON.parse(stored) : generateInitialUserPasswords();
      // Ensure all teachers have their dedicated key rather than generic placeholder
      PRELOADED_TEACHERS.forEach((t, idx) => {
        if (!t.includes('—') && (!base[t] || base[t] === 'teacher123')) {
          base[t] = DEFAULT_TEACHER_KEYS[t] || generateTeacherKey(t, idx + 1);
        }
      });
      // Ensure all students have their dedicated passkey that is NEVER their Student ID code!
      PRELOADED_STUDENTS.forEach((s, idx) => {
        if (!base[s.uid] || base[s.uid] === s.id) {
          base[s.uid] = DEFAULT_STUDENT_PASSKEYS[s.uid] || generateStudentPasskey(s, idx + 1);
        }
      });
      return base;
    } catch {
      return generateInitialUserPasswords();
    }
  });


  // Toast notifications
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);

  // Modals state
  const [passwordModalData, setPasswordModalData] = useState<{
    isOpen: boolean;
    targetKey: string;
    displayName: string;
  }>({
    isOpen: false,
    targetKey: '',
    displayName: ''
  });

  const [courseModalData, setCourseModalData] = useState<{ isOpen: boolean; course: Course | null }>({
    isOpen: false,
    course: null
  });
  const [studentModalData, setStudentModalData] = useState<{ isOpen: boolean; student: Student | null }>({
    isOpen: false,
    student: null
  });
  const [photoModalStudentUid, setPhotoModalStudentUid] = useState<string | null>(null);
  const [transcriptStudent, setTranscriptStudent] = useState<Student | null>(null);
  const [transcriptYear, setTranscriptYear] = useState<string>('2019');
  const [transcriptSemester, setTranscriptSemester] = useState<string>('1');
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [isReleaseManagerOpen, setIsReleaseManagerOpen] = useState(false);
  const [isJsonReaderOpen, setIsJsonReaderOpen] = useState(false);

  // Individual student grade & transcript release permissions state
  const [individualGradeRelease, setIndividualGradeRelease] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem('bk_individual_grade_release');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('bk_individual_grade_release', JSON.stringify(individualGradeRelease));
    } catch (_) {}
  }, [individualGradeRelease]);

  const handleSetIndividualRelease = (studentUid: string, released: boolean) => {
    setIndividualGradeRelease((prev) => ({
      ...prev,
      [studentUid]: released
    }));
  };

  const handleBatchSetRelease = (uids: string[], released: boolean) => {
    setIndividualGradeRelease((prev) => {
      const updated = { ...prev };
      uids.forEach((uid) => {
        updated[uid] = released;
      });
      return updated;
    });
  };

  // Student PDF printing & export permission state
  // Default is false: unless authorized, students cannot print or download PDF!
  const [studentPdfPrintAllowed, setStudentPdfPrintAllowed] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('bk_student_pdf_print_allowed');
      return stored ? JSON.parse(stored) : false;
    } catch {
      return false;
    }
  });

  const [individualPdfPrintAllowed, setIndividualPdfPrintAllowed] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem('bk_individual_pdf_print_allowed');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('bk_student_pdf_print_allowed', JSON.stringify(studentPdfPrintAllowed));
    } catch (_) {}
  }, [studentPdfPrintAllowed]);

  useEffect(() => {
    try {
      localStorage.setItem('bk_individual_pdf_print_allowed', JSON.stringify(individualPdfPrintAllowed));
    } catch (_) {}
  }, [individualPdfPrintAllowed]);

  const handleToggleGlobalPdfPrint = (value: boolean) => {
    setStudentPdfPrintAllowed(value);
  };

  const handleSetIndividualPdfPrint = (studentUid: string, allowed: boolean) => {
    setIndividualPdfPrintAllowed((prev) => ({
      ...prev,
      [studentUid]: allowed
    }));
  };

  const handleBatchSetPdfPrint = (uids: string[], allowed: boolean) => {
    setIndividualPdfPrintAllowed((prev) => {
      const updated = { ...prev };
      uids.forEach((uid) => {
        updated[uid] = allowed;
      });
      return updated;
    });
  };

  // Full Graduation Transcript permission state
  // Default is false: unless explicitly authorized for a student or globally, "ሙሉ የምረቃ ትራንስክሪፕት" will NOT appear on the student page!
  const [fullTranscriptPublished, setFullTranscriptPublished] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('bk_full_transcript_published');
      return stored ? JSON.parse(stored) : false;
    } catch {
      return false;
    }
  });

  const [individualFullTranscriptRelease, setIndividualFullTranscriptRelease] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem('bk_individual_full_transcript_release');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('bk_full_transcript_published', JSON.stringify(fullTranscriptPublished));
    } catch (_) {}
  }, [fullTranscriptPublished]);

  useEffect(() => {
    try {
      localStorage.setItem('bk_individual_full_transcript_release', JSON.stringify(individualFullTranscriptRelease));
    } catch (_) {}
  }, [individualFullTranscriptRelease]);

  const handleToggleGlobalFullTranscript = (value: boolean) => {
    setFullTranscriptPublished(value);
  };

  const handleSetIndividualFullTranscript = (studentUid: string, allowed: boolean) => {
    setIndividualFullTranscriptRelease((prev) => ({
      ...prev,
      [studentUid]: allowed
    }));
  };

  const handleBatchSetFullTranscript = (uids: string[], allowed: boolean) => {
    setIndividualFullTranscriptRelease((prev) => {
      const updated = { ...prev };
      uids.forEach((uid) => {
        updated[uid] = allowed;
      });
      return updated;
    });
  };

  // Church official emblem / logo state (supports default and custom uploaded logo)
  const [churchLogo, setChurchLogo] = useState<string>(getStoredChurchLogo);

  // Firebase connection and diagnostic states
  const [firebaseReport, setFirebaseReport] = useState<FirebaseConnectionReport | null>(null);
  const [isTestingFirebase, setIsTestingFirebase] = useState<boolean>(false);
  const [isFirebaseModalOpen, setIsFirebaseModalOpen] = useState<boolean>(false);

  // Synchronization guard refs to avoid overwriting cloud on mount and prevent echo loops
  const isInitialSyncDoneRef = useRef(false);
  const isRemoteUpdateRef = useRef(false);
  const lastLocalGradesPushAtRef = useRef(0);

  // Restore logo and official stamp/signatures from IndexedDB on startup
  useEffect(() => {
    loadPersistentChurchLogo().then((logo) => {
      if (logo && logo.trim().length > 20) {
        setChurchLogo(logo);
      }
    });
    loadPersistentOfficialConfig().then((cfg) => {
      if (cfg) {
        setOfficialConfig((prev) => ({
          ...prev,
          ...cfg,
          stampImage: cfg.stampImage || prev.stampImage || '',
          deanSignatureImage: cfg.deanSignatureImage || prev.deanSignatureImage || '',
          registrarSignatureImage: cfg.registrarSignatureImage || prev.registrarSignatureImage || ''
        }));
      }
    });
  }, []);

  // Initialize and Live Real-time Sync from Firebase Firestore for ALL logged-in roles
  useEffect(() => {
    if (!currentUser) {
      isInitialSyncDoneRef.current = false;
      return;
    }

    const canAutoBootstrapRemote = currentUser.role === 'ADMIN' || currentUser.role === 'DEAN';
    let unsubscribe: (() => void) | undefined;

    async function initFirestore() {
      setIsTestingFirebase(true);
      try {
        // 1. Immediately subscribe to live updates so background real-time sync is active across all roles
        unsubscribe = subscribeToSystemState({
          onMetaChange: (m) => {
            isRemoteUpdateRef.current = true;
            if (typeof m.systemLocked === 'boolean') setSystemLocked(m.systemLocked);
            if (typeof m.gradePublished === 'boolean') setGradePublished(m.gradePublished);
            if (m.semesterRelease) {
              setSemesterRelease((prev) => ({ ...prev, ...m.semesterRelease }));
            }
            if (m.currentYear) setCurrentYear(m.currentYear);
            if (m.currentSemester) setCurrentSemester(m.currentSemester);
            if (m.availableYears) setAvailableYears(m.availableYears);
            if (m.teachers) setTeachers(m.teachers);
            setTimeout(() => { isRemoteUpdateRef.current = false; }, 300);
          },
          onStudentsChange: (newStudents) => {
            isRemoteUpdateRef.current = true;
            const merged = mergeStudentsWithPreloaded(newStudents);
            setStudents(merged);
            if (canAutoBootstrapRemote && merged.length > newStudents.length) {
              syncStudentsToFirestore(merged);
            }
            setTimeout(() => { isRemoteUpdateRef.current = false; }, 300);
          },
          onCoursesChange: (newCourses) => {
            isRemoteUpdateRef.current = true;
            const merged = mergeCoursesWithPreloaded(newCourses);
            setCourses(merged);
            if (canAutoBootstrapRemote && merged.length > newCourses.length) {
              syncCoursesToFirestore(merged);
            }
            setTimeout(() => { isRemoteUpdateRef.current = false; }, 300);
          },
          onGradesChange: (newGrades) => {
            if (Date.now() - lastLocalGradesPushAtRef.current < 3500) {
              return;
            }
            isRemoteUpdateRef.current = true;
            const merged = mergeGradesWithPreloaded(newGrades);
            setGrades(merged);
            setTimeout(() => { isRemoteUpdateRef.current = false; }, 300);
          },
          onPasswordsChange: (newPasswords) => {
            isRemoteUpdateRef.current = true;
            const merged = mergePasswordsWithPreloaded(newPasswords);
            setUserPasswords(merged);
            setTimeout(() => { isRemoteUpdateRef.current = false; }, 300);
          },
          onPhotosChange: (newPhotos) => {
            isRemoteUpdateRef.current = true;
            setPhotos(newPhotos);
            setTimeout(() => { isRemoteUpdateRef.current = false; }, 300);
          },
          onLogoChange: (newLogo) => {
            if (newLogo) {
              setChurchLogo(newLogo);
              saveChurchLogo(newLogo);
            }
          },
          onOfficialConfigChange: (config) => {
            isRemoteUpdateRef.current = true;
            setOfficialConfig((prev) => {
              const merged: OfficialSignaturesConfig = {
                ...prev,
                ...config,
                stampImage: config.stampImage || prev.stampImage || '',
                deanSignatureImage: config.deanSignatureImage || prev.deanSignatureImage || '',
                registrarSignatureImage: config.registrarSignatureImage || prev.registrarSignatureImage || ''
              };
              try {
                localStorage.setItem('bk_official_config', JSON.stringify(merged));
              } catch (_) {}
              return merged;
            });
            setTimeout(() => { isRemoteUpdateRef.current = false; }, 300);
          }
        });

        // 2. Load existing remote documents
        const remoteState = await loadInitialFromFirestore();
        if (remoteState) {
          isRemoteUpdateRef.current = true;
          if (remoteState.students) {
            const merged = mergeStudentsWithPreloaded(remoteState.students);
            setStudents(merged);
            if (canAutoBootstrapRemote && merged.length > remoteState.students.length) {
              syncStudentsToFirestore(merged);
            }
          }
          if (remoteState.teachers) setTeachers(remoteState.teachers);
          if (remoteState.courses) {
            const merged = mergeCoursesWithPreloaded(remoteState.courses);
            setCourses(merged);
          }
          if (remoteState.grades) {
            const merged = mergeGradesWithPreloaded(remoteState.grades);
            setGrades(merged);
          }
          if (remoteState.photos) setPhotos(remoteState.photos);
          if (remoteState.userPasswords) {
            const merged = mergePasswordsWithPreloaded(remoteState.userPasswords);
            setUserPasswords(merged);
          }
          if (remoteState.availableYears) setAvailableYears(remoteState.availableYears);
          if (typeof remoteState.systemLocked === 'boolean') setSystemLocked(remoteState.systemLocked);
          if (typeof remoteState.gradePublished === 'boolean') setGradePublished(remoteState.gradePublished);
          if (remoteState.semesterRelease) {
            setSemesterRelease((prev) => ({ ...prev, ...remoteState.semesterRelease }));
            try {
              localStorage.setItem('bk_semester_release', JSON.stringify(remoteState.semesterRelease));
            } catch (_) {}
          }
          if (remoteState.currentYear) setCurrentYear(remoteState.currentYear);
          if (remoteState.currentSemester) setCurrentSemester(remoteState.currentSemester);
          if (remoteState.churchLogo) {
            setChurchLogo(remoteState.churchLogo);
            saveChurchLogo(remoteState.churchLogo);
          }
          if (remoteState.officialConfig) {
            const remoteCfg = remoteState.officialConfig;
            setOfficialConfig((prev) => {
              const merged: OfficialSignaturesConfig = {
                ...prev,
                ...remoteCfg,
                stampImage: remoteCfg.stampImage || prev.stampImage || '',
                deanSignatureImage: remoteCfg.deanSignatureImage || prev.deanSignatureImage || '',
                registrarSignatureImage: remoteCfg.registrarSignatureImage || prev.registrarSignatureImage || ''
              };
              try {
                localStorage.setItem('bk_official_config', JSON.stringify(merged));
              } catch (_) {}
              return merged;
            });
          }

          setTimeout(() => {
            isRemoteUpdateRef.current = false;
          }, 400);
        } else if (canAutoBootstrapRemote) {
          // Push initial defaults only from Admin/Dean if Firestore is empty
          await pushAllStateToFirestore({
            meta: {
              systemLocked,
              gradePublished,
              semesterRelease,
              currentYear,
              currentSemester,
              availableYears,
              teachers
            },
            students,
            courses,
            grades,
            passwords: userPasswords,
            photos,
            churchLogo,
            officialConfig
          });
        }

        // 3. Mark initial sync complete so future authorized updates are persisted
        isInitialSyncDoneRef.current = true;

        // 4. Run ping check for diagnostics and UI status badge
        const report = await checkFirebaseConnection();
        setFirebaseReport(report);
      } catch (err) {
        console.warn('Firebase sync note:', err);
        isInitialSyncDoneRef.current = true;
      } finally {
        setIsTestingFirebase(false);
      }
    }
    initFirestore();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [currentUser?.role, currentUser?.uid, currentUser?.name]);

  const handleTestFirebaseConnection = async () => {
    setIsTestingFirebase(true);
    try {
      const rep = await checkFirebaseConnection();
      setFirebaseReport(rep);
      if (rep.status === 'connected') {
        showNotification(rep.message || t('Firebase ተገናኝቷል!', 'Firebase connected!'), 'success');
      } else {
        showNotification(rep.message || t('Firebase አልተገናኘም', 'Firebase not connected'), 'error');
      }
    } catch (e: any) {
      showNotification(t('ግንኙነቱን መፈተሽ አልተቻለም', 'Failed to test connection'), 'error');
    } finally {
      setIsTestingFirebase(false);
    }
  };

  const handlePushAllToFirebase = async () => {
    showNotification(t('መረጃዎችን ወደ Firebase በመጫን ላይ...', 'Uploading data to Firebase...'), 'info');
    const result = await pushAllStateToFirestore({
      meta: {
        systemLocked,
        gradePublished,
        semesterRelease,
        currentYear,
        currentSemester,
        availableYears,
        teachers
      },
      students,
      courses,
      grades,
      passwords: userPasswords,
      photos,
      churchLogo,
      officialConfig
    });

    if (result.success) {
      showNotification(
        t('ሁሉም መረጃዎችና የቤተክርስቲያኑ አርማ በስኬት ወደ Firebase ተጭነዋል!', 'All data and church emblem uploaded to Firebase successfully!'),
        'success'
      );
    } else {
      showNotification(t(`ወደ Firebase መጫን አልተቻለም፦ ${result.error}`, `Failed to upload to Firebase: ${result.error}`), 'error');
    }
  };

  const handlePullFromFirebase = async () => {
    showNotification(t('መረጃዎችን ከFirebase በማውረድ ላይ...', 'Downloading data from Firebase...'), 'info');
    try {
      const remoteState = await loadInitialFromFirestore();
      if (remoteState) {
        isRemoteUpdateRef.current = true;
        if (remoteState.students) {
          const merged = mergeStudentsWithPreloaded(remoteState.students);
          setStudents(merged);
          syncStudentsToFirestore(merged);
        }
        if (remoteState.teachers) setTeachers(remoteState.teachers);
        if (remoteState.courses) {
          const merged = mergeCoursesWithPreloaded(remoteState.courses);
          setCourses(merged);
          syncCoursesToFirestore(merged);
        }
        if (remoteState.grades) {
          const merged = mergeGradesWithPreloaded(remoteState.grades);
          setGrades(merged);
          syncGradesToFirestore(merged);
        }
        if (remoteState.photos) setPhotos(remoteState.photos);
        if (remoteState.userPasswords) {
          const merged = mergePasswordsWithPreloaded(remoteState.userPasswords);
          setUserPasswords(merged);
          syncPasswordsToFirestore(merged);
        }
        if (remoteState.availableYears) setAvailableYears(remoteState.availableYears);
        if (typeof remoteState.systemLocked === 'boolean') setSystemLocked(remoteState.systemLocked);
        if (typeof remoteState.gradePublished === 'boolean') setGradePublished(remoteState.gradePublished);
        if (remoteState.currentYear) setCurrentYear(remoteState.currentYear);
        if (remoteState.currentSemester) setCurrentSemester(remoteState.currentSemester);
        if (remoteState.churchLogo) {
          setChurchLogo(remoteState.churchLogo);
          saveChurchLogo(remoteState.churchLogo);
        }
        if (remoteState.officialConfig) {
          const remoteCfg = remoteState.officialConfig;
          setOfficialConfig((prev) => {
            const merged: OfficialSignaturesConfig = {
              ...prev,
              ...remoteCfg,
              stampImage: remoteCfg.stampImage || prev.stampImage || '',
              deanSignatureImage: remoteCfg.deanSignatureImage || prev.deanSignatureImage || '',
              registrarSignatureImage: remoteCfg.registrarSignatureImage || prev.registrarSignatureImage || ''
            };
            try {
              localStorage.setItem('bk_official_config', JSON.stringify(merged));
            } catch (_) {}
            return merged;
          });
        }

        setTimeout(() => {
          isRemoteUpdateRef.current = false;
        }, 300);
        showNotification(t('የቅርብ ጊዜ መረጃዎች ከFirebase ተወስደዋል!', 'Latest data synced from Firebase!'), 'success');
      } else {
        showNotification(t('በFirebase ውስጥ የተቀመጠ መረጃ አልተገኘም', 'No saved data found in Firebase'), 'warning');
      }
    } catch (err: any) {
      showNotification(t('ከFirebase ማውረድ አልተቻለም', 'Failed to download from Firebase'), 'error');
    }
  };

  const handleUpdateChurchLogo = async (newLogo: string) => {
    setChurchLogo(newLogo);
    saveChurchLogo(newLogo);
    showNotification(t('የቤተ ክርስቲያኑ አርማና ሎጎ በተሳካ ሁኔታ ተቀይሯል!', 'Church emblem updated successfully!'), 'success');
    await syncChurchLogoToFirestore(newLogo);
  };

  const isAdminOrDean = currentUser?.role === 'ADMIN' || currentUser?.role === 'DEAN';
  const isAdminDeanOrRegistrar = isAdminOrDean || currentUser?.role === 'REGISTRAR';

  // Save changes to localStorage and Firestore with guard against wiping remote database
  useEffect(() => {
    localStorage.setItem('bk_students', JSON.stringify(students));
    if (!isAdminDeanOrRegistrar || !isInitialSyncDoneRef.current || isRemoteUpdateRef.current) return;
    syncStudentsToFirestore(students);
  }, [students, isAdminDeanOrRegistrar]);

  useEffect(() => {
    localStorage.setItem('bk_teachers', JSON.stringify(teachers));
    if (!isAdminOrDean || !isInitialSyncDoneRef.current || isRemoteUpdateRef.current) return;
    syncMetaToFirestore({
      systemLocked,
      gradePublished,
      currentYear,
      currentSemester,
      availableYears,
      teachers
    });
  }, [teachers, isAdminOrDean, systemLocked, gradePublished, currentYear, currentSemester, availableYears]);

  useEffect(() => {
    localStorage.setItem('bk_courses', JSON.stringify(courses));
    if (!isAdminOrDean || !isInitialSyncDoneRef.current || isRemoteUpdateRef.current) return;
    syncCoursesToFirestore(courses);
  }, [courses, isAdminOrDean]);

  const gradesPersistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestGradesRef = useRef(grades);
  latestGradesRef.current = grades;

  const canSyncGradesToCloud = Boolean(currentUser && currentUser.role !== 'STUDENT');

  useEffect(() => {
    if (!isInitialSyncDoneRef.current || isRemoteUpdateRef.current) return;

    if (gradesPersistTimerRef.current) {
      clearTimeout(gradesPersistTimerRef.current);
    }

    gradesPersistTimerRef.current = setTimeout(() => {
      gradesPersistTimerRef.current = null;
      const runPersist = () => {
        const snapshot = latestGradesRef.current;
        try {
          localStorage.setItem('bk_grades', JSON.stringify(snapshot));
        } catch (_) {}
        if (canSyncGradesToCloud) {
          lastLocalGradesPushAtRef.current = Date.now();
          syncGradesToFirestore(snapshot);
        }
      };

      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        (window as any).requestIdleCallback(runPersist, { timeout: 800 });
      } else {
        runPersist();
      }
    }, 1500);

    return () => {
      if (gradesPersistTimerRef.current) {
        clearTimeout(gradesPersistTimerRef.current);
      }
    };
  }, [grades, canSyncGradesToCloud]);

  useEffect(() => {
    const flushPendingGrades = () => {
      if (gradesPersistTimerRef.current) {
        clearTimeout(gradesPersistTimerRef.current);
        gradesPersistTimerRef.current = null;
        try {
          localStorage.setItem('bk_grades', JSON.stringify(latestGradesRef.current));
        } catch (_) {}
      }
    };
    window.addEventListener('beforeunload', flushPendingGrades);
    return () => window.removeEventListener('beforeunload', flushPendingGrades);
  }, []);

  useEffect(() => {
    localStorage.setItem('bk_photos', JSON.stringify(photos));
    if (!isAdminDeanOrRegistrar || !isInitialSyncDoneRef.current || isRemoteUpdateRef.current) return;
    syncPhotosToFirestore(photos);
  }, [photos, isAdminDeanOrRegistrar]);

  useEffect(() => {
    localStorage.setItem('bk_user_passwords', JSON.stringify(userPasswords));
    if (!isAdminOrDean || !isInitialSyncDoneRef.current || isRemoteUpdateRef.current) return;
    syncPasswordsToFirestore(userPasswords);
  }, [userPasswords, isAdminOrDean]);

  useEffect(() => {
    try {
      localStorage.setItem('bk_official_config', JSON.stringify(officialConfig));
    } catch (_) {}
    if (!isAdminOrDean || !isInitialSyncDoneRef.current || isRemoteUpdateRef.current) return;
    syncOfficialConfigToFirestore(officialConfig);
  }, [officialConfig, isAdminOrDean]);

  const handleSaveOfficialConfig = async (updated: OfficialSignaturesConfig) => {
    setOfficialConfig(updated);
    try {
      localStorage.setItem('bk_official_config', JSON.stringify(updated));
    } catch (_) {}
    if (typeof window !== 'undefined' && window.indexedDB) {
      try {
        const req = indexedDB.open('BirbirKHC_Storage', 1);
        req.onupgradeneeded = (ev: any) => {
          const db = ev.target.result;
          if (!db.objectStoreNames.contains('branding_assets')) {
            db.createObjectStore('branding_assets');
          }
        };
        req.onsuccess = () => {
          try {
            const db = req.result;
            const tx = db.transaction('branding_assets', 'readwrite');
            const store = tx.objectStore('branding_assets');
            store.put(JSON.stringify(updated), 'bk_official_config');
          } catch (_) {}
        };
      } catch (_) {}
    }
    await syncOfficialConfigToFirestore(updated);
  };

  const handleSaveGrades = React.useCallback((updated: Record<string, GradeBreakdown>) => {
    if (Object.keys(updated).length > 0) {
      try {
        localStorage.removeItem('bk_grades_cleared');
      } catch (_) {}
    }
    setGrades(updated);
  }, []);

  const handleClearAllGradesToBlank = async () => {
    setGrades({});
    try {
      localStorage.setItem('bk_grades', JSON.stringify({}));
      localStorage.setItem('bk_grades_cleared', 'true');
    } catch (_) {}
    await syncGradesToFirestore({});
    showNotification(
      t('ሁሉም የውጤት ማስገቢያ ቦታዎች ባዶ ሆነዋል! መምህራን አዲስ ውጤት መሙላት ይችላሉ።', 'All grade entries cleared! Instructors can enter new grades.'),
      'success'
    );
  };

  useEffect(() => {
    localStorage.setItem('bk_academic_years', JSON.stringify(availableYears));
    if (!isInitialSyncDoneRef.current || isRemoteUpdateRef.current) return;
    syncMetaToFirestore({
      systemLocked,
      gradePublished,
      currentYear,
      currentSemester,
      availableYears,
      teachers
    });
  }, [availableYears]);

  useEffect(() => {
    localStorage.setItem('bk_systemLocked', String(systemLocked));
    if (!isInitialSyncDoneRef.current || isRemoteUpdateRef.current) return;
    syncMetaToFirestore({
      systemLocked,
      gradePublished,
      currentYear,
      currentSemester,
      availableYears,
      teachers
    });
  }, [systemLocked]);

  useEffect(() => {
    localStorage.setItem('bk_gradePublished', String(gradePublished));
    if (!isInitialSyncDoneRef.current || isRemoteUpdateRef.current) return;
    syncMetaToFirestore({
      systemLocked,
      gradePublished,
      semesterRelease,
      currentYear,
      currentSemester,
      availableYears,
      teachers
    });
  }, [gradePublished]);

  useEffect(() => {
    try {
      localStorage.setItem('bk_semester_release', JSON.stringify(semesterRelease));
    } catch (_) {}
    if (!isInitialSyncDoneRef.current || isRemoteUpdateRef.current) return;
    syncMetaToFirestore({
      systemLocked,
      gradePublished,
      semesterRelease,
      currentYear,
      currentSemester,
      availableYears,
      teachers
    });
  }, [semesterRelease]);

  useEffect(() => {
    localStorage.setItem('bk_currentYear', currentYear);
    if (!isInitialSyncDoneRef.current || isRemoteUpdateRef.current) return;
    syncMetaToFirestore({
      systemLocked,
      gradePublished,
      currentYear,
      currentSemester,
      availableYears,
      teachers
    });
  }, [currentYear]);

  useEffect(() => {
    localStorage.setItem('bk_currentSemester', currentSemester);
    if (!isInitialSyncDoneRef.current || isRemoteUpdateRef.current) return;
    syncMetaToFirestore({
      systemLocked,
      gradePublished,
      currentYear,
      currentSemester,
      availableYears,
      teachers
    });
  }, [currentSemester]);

  const showNotification = (
    text: string,
    type: 'success' | 'error' | 'warning' | 'info' = 'info'
  ) => {
    const id = Date.now().toString() + Math.random().toString();
    setNotifications((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 4000);
  };

  const handleDismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // Lock toggle
  const handleToggleSystemLock = () => {
    setSystemLocked((prev) => {
      const next = !prev;
      showNotification(
        next ? t('ሲስተሙ ተቆልፏል (Maintenance Lock ON)', 'System locked (Maintenance Lock ON)') : t('ሲስተሙ ክፍት ሆኗል (Maintenance Lock OFF)', 'System unlocked (Maintenance Lock OFF)'),
        next ? 'warning' : 'success'
      );
      return next;
    });
  };

  // Grade publication toggle
  const handleToggleGradePublication = () => {
    setGradePublished((prev) => {
      const next = !prev;
      showNotification(
        next ? t('ውጤት ለተማሪዎች ይፋ ሆኗል!', 'Grades published to students!') : t('ውጤት ለተማሪዎች እንዳይታይ ተሰውሯል።', 'Grades hidden from students.'),
        next ? 'success' : 'info'
      );
      return next;
    });
  };

  // Add custom academic year
  const handleAddAcademicYear = (newYear: string) => {
    const clean = newYear.trim();
    if (!clean) return;
    setAvailableYears((prev) => {
      const updated = Array.from(new Set([...prev, clean]));
      updated.sort((a, b) => parseInt(a) - parseInt(b));
      return updated;
    });
  };

  // Add new teacher with key
  const handleAddTeacher = (newTeacherName: string, customKey?: string) => {
    setTeachers((prev) => [newTeacherName, ...prev]);
    const generated = customKey || generateTeacherKey(newTeacherName);
    setUserPasswords((prev) => ({
      ...prev,
      [newTeacherName]: generated
    }));
    showNotification(
      t(`መምህር '${newTeacherName}' ከመግቢያ ቁልፍ (${generated}) ጋር ተመዝግቧል!`, `Instructor '${newTeacherName}' registered with passkey (${generated})!`),
      'success'
    );
  };

  // Delete teacher
  const handleDeleteTeacher = (teacherName: string) => {
    const isAssigned = courses.some((c) => c.teacher === teacherName);
    if (isAssigned) {
      showNotification(
        t(`መምህር '${teacherName}' ለኮርሶች ስለተመደበ/ች አስቀድመው ከኮርሱ ያስነሱ!`, `Instructor '${teacherName}' is assigned to courses. Unassign them first!`),
        'warning'
      );
      return;
    }
    if (window.confirm(t(`እርግጠኛ ነዎት መምህር '${teacherName}'ን ከሲስተሙ ማሰረዝ ይፈልጋሉ?`, `Are you sure you want to remove instructor '${teacherName}'?`))) {
      setTeachers((prev) => prev.filter((t) => t !== teacherName));
      setUserPasswords((prev) => {
        const copy = { ...prev };
        delete copy[teacherName];
        delete copy['_locked_' + teacherName];
        return copy;
      });
      showNotification(t(`መምህር '${teacherName}' ተሰርዟል!`, `Instructor '${teacherName}' removed!`), 'info');
    }
  };

  // Toggle teacher lock (Admin authority)
  const handleToggleTeacherLock = (teacherName: string) => {
    const lockKey = '_locked_' + teacherName;
    const isCurrentlyLocked = userPasswords[lockKey] === 'true';
    setUserPasswords((prev) => ({
      ...prev,
      [lockKey]: isCurrentlyLocked ? 'false' : 'true'
    }));
    showNotification(
      isCurrentlyLocked
        ? t(`ለመምህር '${teacherName}' መግባት ተፈቅዷል (Unlocked)!`, `Instructor '${teacherName}' unlocked!`)
        : t(`የመምህር '${teacherName}' መግቢያ በዋና አድሚን ታግዷል (Locked)!`, `Instructor '${teacherName}' locked by Admin!`),
      isCurrentlyLocked ? 'success' : 'warning'
    );
  };

  // Batch generate distinct keys for all teachers
  const handleBatchGenerateTeacherKeys = () => {
    const updated = { ...userPasswords };
    let count = 0;
    teachers.filter((trName) => !trName.includes('—')).forEach((trName, idx) => {
      const newKey = generateTeacherKey(trName, idx + 1);
      updated[trName] = newKey;
      count++;
    });
    setUserPasswords(updated);
    showNotification(
      t(`ለ${count} መምህራን በሙሉ አዲስ ደህንነቱ የተጠበቀ የመግቢያ ቁልፍ በዋና አድሚን ተዘጋጅቷል!`, `New secure passkeys generated for all ${count} instructors!`),
      'success'
    );
  };

  // Password save for any user key
  const handleSavePassword = (userKey: string, newPass: string) => {
    setUserPasswords((prev) => ({
      ...prev,
      [userKey]: newPass
    }));
    setPasswordModalData({ isOpen: false, targetKey: '', displayName: '' });
    showNotification(t('የይለፍ ቃሉ በስኬት ተቀይሯል!', 'Password updated successfully!'), 'success');
  };

  // Trigger password change for currently logged-in user
  const handleTriggerSelfPasswordChange = () => {
    if (!currentUser) return;
    if (currentUser.role === 'ADMIN') {
      setPasswordModalData({ isOpen: true, targetKey: 'admin', displayName: t('የአድሚን', 'Admin') });
    } else if (currentUser.role === 'DEAN') {
      setPasswordModalData({ isOpen: true, targetKey: 'dean', displayName: t('የዋና ዲን', 'Academic Dean') });
    } else if (currentUser.role === 'REGISTRAR') {
      setPasswordModalData({ isOpen: true, targetKey: 'registrar', displayName: t('የሪጅስተራል', 'Registrar') });
    } else if (currentUser.role === 'TEACHER') {
      setPasswordModalData({ isOpen: true, targetKey: currentUser.name, displayName: currentUser.name });
    } else if (currentUser.role === 'STUDENT') {
      const activeUid = currentUser.uid || `dip_${currentUser.id}`;
      setPasswordModalData({ isOpen: true, targetKey: activeUid, displayName: currentUser.name });
    }
  };

  const syncHistorical2018StorageFromCourses = (courseList: Course[]) => {
    const histOnly = courseList.filter(
      (c) =>
        c.academicYear === '2018' ||
        c.id.includes('2018') ||
        c.id.startsWith('dip_sem1') ||
        c.id.startsWith('dip_sem2') ||
        c.id.startsWith('hist_')
    );
    if (histOnly.length > 0) {
      saveHistorical2018Courses(histOnly);
    }
  };

  // Batch Course save (used by GraduationManager, etc.)
  const handleSaveCoursesBatch = (incomingUpdatedCourses: Course[]) => {
    setCourses(incomingUpdatedCourses);
    syncHistorical2018StorageFromCourses(incomingUpdatedCourses);
    try {
      localStorage.setItem('bk_courses', JSON.stringify(incomingUpdatedCourses));
    } catch (_) {}
    syncCoursesToFirestore(incomingUpdatedCourses);
  };

  // Quick 1-click teacher assignment to a course
  const handleQuickAssignTeacher = (courseId: string, newTeacher: string) => {
    const course = courses.find((c) => c.id === courseId);
    const updated = courses.map((c) => (c.id === courseId ? { ...c, teacher: newTeacher } : c));
    setCourses(updated);
    syncHistorical2018StorageFromCourses(updated);
    try {
      localStorage.setItem('bk_courses', JSON.stringify(updated));
    } catch (_) {}
    syncCoursesToFirestore(updated);

    const courseLabel = formatCourseTitle(course?.name, lang) || t('ኮርስ', 'Course');
    if (newTeacher === 'አልተመደበም (—)') {
      showNotification(t(`የ"${courseLabel}" መምህር ምደባ ተነስቷል (ክፍት ሆኗል)!`, `Instructor unassigned from "${courseLabel}".`), 'info');
    } else {
      showNotification(t(`ለ"${courseLabel}" መምህር ${newTeacher} በስኬት ተመድቧል!`, `Assigned ${newTeacher} to "${courseLabel}"!`), 'success');
    }
  };

  // Course save (add or edit)
  const handleSaveCourse = (courseData: Omit<Course, 'id'> & { id?: string }) => {
    let updated: Course[];
    if (courseData.id) {
      updated = courses.map((c) => (c.id === courseData.id ? { ...c, ...courseData, id: c.id } : c));
      setCourses(updated);
      showNotification(t('የኮርሱ መረጃ በስኬት ተስተካክሏል!', 'Course updated successfully!'), 'success');
    } else {
      const newCourse: Course = {
        ...courseData,
        id: `c_${Date.now()}`
      };
      updated = [...courses, newCourse];
      setCourses(updated);
      showNotification(t('አዲስ የትምህርት ዓይነት በስኬት ተጨምሯል!', 'New course added successfully!'), 'success');
    }
    syncHistorical2018StorageFromCourses(updated);
    try {
      localStorage.setItem('bk_courses', JSON.stringify(updated));
    } catch (_) {}
    syncCoursesToFirestore(updated);
    setCourseModalData({ isOpen: false, course: null });
  };

  const handleDeleteCourse = (courseId: string) => {
    const toDelete = courses.find((c) => c.id === courseId);
    const courseLabel = formatCourseTitle(toDelete?.name, lang) || t('ይህን ኮርስ', 'this course');
    if (window.confirm(t(`እርግጠኛ ነዎት "${courseLabel}" ማሰረዝ ይፈልጋሉ?`, `Are you sure you want to delete "${courseLabel}"?`))) {
      try {
        const storedDel = localStorage.getItem('bk_deleted_course_ids');
        const currentDel = storedDel ? JSON.parse(storedDel) : [];
        localStorage.setItem('bk_deleted_course_ids', JSON.stringify(Array.from(new Set([...currentDel, courseId]))));
      } catch (_) {}
      const updated = courses.filter((c) => c.id !== courseId);
      setCourses(updated);
      syncHistorical2018StorageFromCourses(updated);
      try {
        localStorage.setItem('bk_courses', JSON.stringify(updated));
      } catch (_) {}
      syncCoursesToFirestore(updated);
      showNotification(t('ኮርሱ ተሰርዟል!', 'Course deleted!'), 'info');
    }
  };

  const handleBatchDeleteCourses = (courseIds: string[]) => {
    if (!courseIds || courseIds.length === 0) return;
    try {
      const storedDel = localStorage.getItem('bk_deleted_course_ids');
      const currentDel = storedDel ? JSON.parse(storedDel) : [];
      localStorage.setItem('bk_deleted_course_ids', JSON.stringify(Array.from(new Set([...currentDel, ...courseIds]))));
    } catch (_) {}
    const updated = courses.filter((c) => !courseIds.includes(c.id));
    setCourses(updated);
    syncHistorical2018StorageFromCourses(updated);
    try {
      localStorage.setItem('bk_courses', JSON.stringify(updated));
    } catch (_) {}
    syncCoursesToFirestore(updated);
    showNotification(t(`${courseIds.length} ኮርሶች በጥቅል ከሲስተሙ ተሰርዘዋል!`, `${courseIds.length} courses deleted!`), 'info');
  };



  // Student save (Add or Edit)
  const handleSaveStudent = (savedStudent: Student) => {
    const isEditing = students.some((s) => s.uid === savedStudent.uid);
    if (isEditing) {
      const updated = students.map((s) => (s.uid === savedStudent.uid ? savedStudent : s));
      setStudents(sortStudentsByAmharicName(updated));
      showNotification(
        t(`የተማሪ "${savedStudent.name}" መረጃ/ስም በስኬት ተስተካክሏል!`, `Student "${savedStudent.name}" updated successfully!`),
        'success'
      );
    } else {
      setStudents((prev) => sortStudentsByAmharicName([...prev, savedStudent]));
      const passkey = generateStudentPasskey(savedStudent, students.length + 1);
      setUserPasswords((prev) => ({
        ...prev,
        [savedStudent.uid]: passkey
      }));
      showNotifyUser(
        t(
          `ተማሪ "${savedStudent.name}" (${formatProgram(savedStudent.program, 'am')}) ከመግቢያ ቁልፍ (${passkey}) ጋር በስኬት ተመዝግቧል!`,
          `Student "${savedStudent.name}" (${formatProgram(savedStudent.program, 'en')}) registered with passkey (${passkey})!`
        )
      );
    }
    setStudentModalData({ isOpen: false, student: null });
  };


  const showNotifyUser = (msg: string) => {
    showNotification(msg, 'success');
  };

  const handleDeleteStudent = (studentUid: string) => {
    const s = students.find((item) => item.uid === studentUid);
    if (window.confirm(t(`ተማሪ "${s?.name || studentUid}"ን ከሲስተሙ ማሰረዝ ይፈልጋሉ?`, `Delete student "${s?.name || studentUid}" from the system?`))) {
      setStudents((prev) => prev.filter((item) => item.uid !== studentUid));
      showNotification(t('ተማሪው ከሲስተሙ ተሰርዟል!', 'Student deleted!'), 'info');
    }
  };

  // Photo save
  const handleSavePhoto = (studentUid: string, photoUrl: string) => {
    setPhotos((prev) => ({ ...prev, [studentUid]: photoUrl }));
    setPhotoModalStudentUid(null);
    showNotification(t('የተማሪው ፎቶ በስኬት ተቀምጧል!', 'Student photo saved successfully!'), 'success');
  };

  // Export / Import / Reset Complete System Data
  const handleDownloadMasterJson = () => {
    const master = generateFullSystemMasterBackup();
    const backupData = {
      ...master,
      students: students.length > 0 ? students : master.students,
      teachers: teachers.length > 0 ? teachers : master.teachers,
      courses: courses.length > 0 ? courses : master.courses,
      grades: { ...master.grades, ...grades },
      photos,
      userPasswords: { ...master.userPasswords, ...userPasswords },
      availableYears,
      systemLocked,
      gradePublished,
      currentYear,
      currentSemester,
      officialConfig: { ...master.officialConfig, ...officialConfig }
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `birbir_full_system_master_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification(
      t('ሙሉ የሲስተም JSON ፋይል (Master Backup) ወደ ኮምፒውተርዎ በስኬት ወርዷል!', 'Complete Master JSON backup downloaded!'),
      'success'
    );
  };

  const handleExportData = () => {
    handleDownloadMasterJson();
  };

  const handleUniversalJsonImport = async (payload: JsonImportPayload) => {
    let nextStudents = [...students];
    let nextCourses = [...courses];
    let nextGrades = { ...grades };
    let nextTeachers = [...teachers];
    let nextYears = [...availableYears];
    let nextPasswords = { ...userPasswords };
    let nextPhotos = { ...photos };
    let nextOfficialConfig = { ...officialConfig };

    if (payload.mode === 'REPLACE_ALL') {
      if (payload.students) nextStudents = mergeStudentsWithPreloaded(payload.students);
      if (payload.courses) nextCourses = mergeCoursesWithPreloaded(payload.courses);
      if (payload.grades) nextGrades = mergeGradesWithPreloaded(payload.grades);
      if (payload.teachers) nextTeachers = payload.teachers;
      if (payload.photos) nextPhotos = payload.photos;
      if (payload.userPasswords) nextPasswords = mergePasswordsWithPreloaded(payload.userPasswords);
      if (payload.availableYears) nextYears = payload.availableYears;
      if (typeof payload.systemLocked === 'boolean') setSystemLocked(payload.systemLocked);
      if (typeof payload.gradePublished === 'boolean') setGradePublished(payload.gradePublished);
      if (payload.currentYear) setCurrentYear(payload.currentYear);
      if (payload.currentSemester) setCurrentSemester(payload.currentSemester);
      if (payload.officialConfig) nextOfficialConfig = payload.officialConfig;
    } else if (payload.mode === 'MERGE_GRADES') {
      if (payload.grades) {
        nextGrades = { ...nextGrades, ...payload.grades };
      }
      if (payload.students && payload.students.length > 0) {
        nextStudents = mergeStudentsWithPreloaded([...nextStudents, ...payload.students]);
      }
      if (payload.courses && payload.courses.length > 0) {
        nextCourses = mergeCoursesWithPreloaded([...nextCourses, ...payload.courses]);
      }
    } else if (payload.mode === 'APPEND_MISSING') {
      if (payload.grades) {
        Object.entries(payload.grades).forEach(([k, v]) => {
          if (!nextGrades[k]) nextGrades[k] = v;
        });
      }
      if (payload.students) {
        payload.students.forEach((s) => {
          if (!nextStudents.some((ex) => ex.uid === s.uid || ex.id === s.id)) {
            nextStudents.push(s);
          }
        });
        nextStudents = sortStudentsByAmharicName(nextStudents);
      }
      if (payload.courses) {
        payload.courses.forEach((c) => {
          if (!nextCourses.some((ex) => ex.id === c.id)) {
            nextCourses.push(c);
          }
        });
      }
    }

    setStudents(nextStudents);
    setCourses(nextCourses);
    setGrades(nextGrades);
    setTeachers(nextTeachers);
    setAvailableYears(nextYears);
    setUserPasswords(nextPasswords);
    setPhotos(nextPhotos);
    setOfficialConfig(nextOfficialConfig);

    try {
      if (Object.keys(nextGrades).length > 0) {
        localStorage.removeItem('bk_grades_cleared');
      }
      localStorage.setItem('bk_students', JSON.stringify(nextStudents));
      localStorage.setItem('bk_courses', JSON.stringify(nextCourses));
      localStorage.setItem('bk_grades', JSON.stringify(nextGrades));
      localStorage.setItem('bk_teachers', JSON.stringify(nextTeachers));
      localStorage.setItem('bk_academic_years', JSON.stringify(nextYears));
      localStorage.setItem('bk_user_passwords', JSON.stringify(nextPasswords));
      localStorage.setItem('bk_photos', JSON.stringify(nextPhotos));
      localStorage.setItem('bk_official_config', JSON.stringify(nextOfficialConfig));
    } catch (_) {}

    if (payload.syncToFirebase) {
      await pushAllStateToFirestore({
        meta: {
          systemLocked,
          gradePublished,
          semesterRelease,
          currentYear,
          currentSemester,
          availableYears: nextYears,
          teachers: nextTeachers
        },
        students: nextStudents,
        courses: nextCourses,
        grades: nextGrades,
        passwords: nextPasswords,
        photos: nextPhotos,
        churchLogo,
        officialConfig: nextOfficialConfig
      });
      showNotification(t('የተጫነው መረጃ በስኬት ወደ Firebase Cloud ተልኳል!', 'Imported data synced to Firebase Cloud!'), 'success');
    }
  };

  const handleImportData = (jsonStr: string) => {
    try {
      let clean = jsonStr.trim();
      if (clean.charCodeAt(0) === 0xFEFF) clean = clean.slice(1);
      clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      clean = clean.replace(/,\s*([\]}])/g, '$1');
      const data = JSON.parse(clean);

      // Check if it's direct grades map
      if (data && typeof data === 'object' && !Array.isArray(data) && !data.students && !data.version) {
        const keys = Object.keys(data);
        if (keys.length > 0 && typeof data[keys[0]] === 'object' && ('p1' in data[keys[0]] || 'mid' in data[keys[0]] || 'customTotal' in data[keys[0]])) {
          setGrades(prev => {
            const merged = { ...prev, ...data };
            try {
              localStorage.removeItem('bk_grades_cleared');
              localStorage.setItem('bk_grades', JSON.stringify(merged));
            } catch (_) {}
            return merged;
          });
          showNotification(t(`የ${keys.length} የትምህርት ውጤቶች መዝገብ በስኬት ተጭኗል!`, `${keys.length} grade records imported successfully!`), 'success');
          return;
        }
      }

      if (Array.isArray(data.students)) setStudents(mergeStudentsWithPreloaded(data.students));
      if (Array.isArray(data.teachers)) setTeachers(data.teachers);
      if (Array.isArray(data.courses)) setCourses(mergeCoursesWithPreloaded(data.courses));
      if (data.grades) {
        setGrades(prev => {
          const merged = { ...prev, ...data.grades };
          try {
            if (Object.keys(merged).length > 0) {
              localStorage.removeItem('bk_grades_cleared');
            }
            localStorage.setItem('bk_grades', JSON.stringify(merged));
          } catch (_) {}
          return merged;
        });
      }
      if (data.photos) setPhotos(data.photos);
      if (data.userPasswords) setUserPasswords(mergePasswordsWithPreloaded(data.userPasswords));
      if (Array.isArray(data.availableYears)) setAvailableYears(data.availableYears);
      if (typeof data.systemLocked === 'boolean') setSystemLocked(data.systemLocked);
      if (typeof data.gradePublished === 'boolean') setGradePublished(data.gradePublished);
      if (data.currentYear) setCurrentYear(data.currentYear);
      if (data.currentSemester) setCurrentSemester(data.currentSemester);
      if (data.officialConfig) {
        setOfficialConfig(data.officialConfig);
        try {
          localStorage.setItem('bk_official_config', JSON.stringify(data.officialConfig));
        } catch (_) {}
      }
      showNotification(t('የመረጃ መጠባበቂያ ፋይሉ በስኬት ተጭኗል!', 'Backup file imported successfully!'), 'success');
    } catch {
      showNotification(t('ትክክለኛ ያልሆነ የመረጃ ፋይል!', 'Invalid backup JSON file!'), 'error');
    }
  };

  const handleResetDefaults = () => {
    if (
      window.confirm(
        t(
          'እርግጠኛ ነዎት ሁሉንም መረጃዎች ወደ መጀመሪያው ነባሪ ሁኔታ መመለስ ይፈልጋሉ? የተቀየሩ ውጤቶችና አዳዲስ ተማሪዎች ይሰረዛሉ።',
          'Are you sure you want to reset all data to factory defaults? Custom grades and added students will be erased.'
        )
      )
    ) {
      const defStudents = PRELOADED_STUDENTS;
      const defTeachers = PRELOADED_TEACHERS;
      const defCourses = PRELOADED_COURSES;
      const defGrades = generateInitialSampleGrades(PRELOADED_STUDENTS, PRELOADED_COURSES);
      const defPasswords = generateInitialUserPasswords();

      setStudents(defStudents);
      setTeachers(defTeachers);
      setCourses(defCourses);
      setGrades(defGrades);
      setPhotos({});
      setUserPasswords(defPasswords);
      setAvailableYears(DEFAULT_ACADEMIC_YEARS);
      setSystemLocked(false);
      setGradePublished(true);
      setCurrentYear('2019');
      setCurrentSemester('1');
      localStorage.clear();
      showNotification(t('ሲስተሙ ወደ ነባሪ ሁኔታ ተመልሷል!', 'System reset to factory defaults!'), 'info');
    }
  };

  // Find active student if logged in as student or previewed by admin
  const activeStudent =
    currentUser?.role === 'STUDENT'
      ? students.find(
          (s) => (currentUser.uid ? s.uid === currentUser.uid : s.id === currentUser.id && (!currentUser.program || s.program === currentUser.program))
        ) || students[0]
      : students.find((s) => s.uid === adminSelectedStudentUid) || students[0];

  // Determine active view when Admin is logged in
  const effectiveView = currentUser?.role === 'ADMIN' ? adminActiveView : currentUser?.role;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 antialiased">
      {/* Toast notifications */}
      <NotificationToast
        notifications={notifications}
        onDismiss={handleDismissNotification}
      />

      {/* Main Header */}
      <Header
        currentUser={currentUser}
        systemLocked={systemLocked}
        adminActiveView={adminActiveView}
        onAdminChangeView={(view) => {
          setAdminActiveView(view);
          showNotification(t(`ወደ ${formatRole(view, lang)} ገጽ ተቀይሯል!`, `Switched to ${formatRole(view, lang)} view!`), 'info');
        }}
        onOpenPasswordModal={handleTriggerSelfPasswordChange}
        onLogout={() => {
          setCurrentUser(null);
          setAdminActiveView('ADMIN');
          setAdminSelectedStudentUid('');
          showNotification(t('በስኬት ወጥተዋል!', 'Logged out successfully!'), 'info');
        }}
        firebaseReport={firebaseReport}
        isTestingFirebase={isTestingFirebase}
        onOpenFirebaseModal={() => setIsFirebaseModalOpen(true)}
        churchLogo={churchLogo}
        currentYear={currentYear}
        currentSemester={currentSemester}
        onOpenArchiveModal={() => setIsArchiveModalOpen(true)}
        onOpenJsonReaderModal={() => setIsJsonReaderOpen(true)}
        onDownloadFullBackup={handleDownloadMasterJson}
      />

      {/* Main Body */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-2.5 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {!currentUser ? (
          <LoginView
            students={students}
            teachers={teachers}
            userPasswords={userPasswords}
            systemLocked={systemLocked}
            onLogin={(user) => {
              setCurrentUser(user);
              if (user.role === 'ADMIN') setAdminActiveView('ADMIN');
            }}
            showNotify={showNotification}
            firebaseReport={firebaseReport}
            isTestingFirebase={isTestingFirebase}
            onOpenFirebaseModal={() => setIsFirebaseModalOpen(true)}
            churchLogo={churchLogo}
          />
        ) : (
          <>
            {/* Daily Verse of the Day - Only shown after user logs in, one verse per day (እያንዳንዱ ወደ ገጹ ከገባ በሃላ) */}
            <DailyVerseBanner showNotify={showNotification} />

            {effectiveView === 'ADMIN' && (
              <AdminPortal
                systemLocked={systemLocked}
                onToggleLock={handleToggleSystemLock}
                userPasswords={userPasswords}
                onOpenPasswordModal={(userKey, displayName) => {
                  setPasswordModalData({ isOpen: true, targetKey: userKey, displayName });
                }}
                students={students}
                courses={courses}
                teachers={teachers}
                grades={grades}
                currentYear={currentYear}
                currentSemester={currentSemester}
                gradePublished={gradePublished}
                onToggleGradePublication={handleToggleGradePublication}
                semesterRelease={semesterRelease}
                onToggleSemesterRelease={handleToggleSemesterRelease}
                onToggleAllSemestersRelease={handleToggleAllSemestersRelease}
                onExportData={handleExportData}
                onImportData={handleImportData}
                onOpenJsonReaderModal={() => setIsJsonReaderOpen(true)}
                onResetDefaults={handleResetDefaults}
                onSelectPrintTranscript={(s) => {
                  setTranscriptYear('');
                  setTranscriptSemester('');
                  setTranscriptStudent(s);
                }}
                onSwitchView={(v) => setAdminActiveView(v)}
                firebaseReport={firebaseReport}
                isTestingFirebase={isTestingFirebase}
                onTestFirebaseConnection={handleTestFirebaseConnection}
                onOpenFirebaseModal={() => setIsFirebaseModalOpen(true)}
                onPushAllToFirebase={handlePushAllToFirebase}
                churchLogo={churchLogo}
                onUpdateChurchLogo={handleUpdateChurchLogo}
                onAddTeacher={handleAddTeacher}
                onDeleteTeacher={handleDeleteTeacher}
                onToggleTeacherLock={handleToggleTeacherLock}
                onBatchGenerateTeacherKeys={handleBatchGenerateTeacherKeys}
                onSaveQuickPassword={(k, p) => {
                  setUserPasswords((prev) => ({ ...prev, [k]: p }));
                  showNotification(t('ቁልፉ በስኬት ተቀምጧል!', 'Passkey saved successfully!'), 'success');
                }}
                showNotify={showNotification}
                officialConfig={officialConfig}
                onSaveOfficialConfig={handleSaveOfficialConfig}
                onClearAllGrades={handleClearAllGradesToBlank}
                onSaveGrades={handleSaveGrades}
                onYearChange={(y) => setCurrentYear(y)}
                onSemesterChange={(s) => setCurrentSemester(s)}
                onAddAcademicYear={handleAddAcademicYear}
                availableYears={availableYears}
                onUpdateStudents={(updated) => setStudents(updated)}
                studentPdfPrintAllowed={studentPdfPrintAllowed}
                onToggleStudentPdfPrint={() => {
                  const newVal = !studentPdfPrintAllowed;
                  handleToggleGlobalPdfPrint(newVal);
                  showNotification(
                    newVal
                      ? t('የተማሪዎች ፒዲኤፍ ማተም ሁነታ ተፈቅዷል!', 'Student PDF printing enabled!')
                      : t('የተማሪዎች ፒዲኤፍ ማተም ሁነታ ታግዷል!', 'Student PDF printing disabled!'),
                    newVal ? 'success' : 'warning'
                  );
                }}
                onOpenReleaseManager={() => setIsReleaseManagerOpen(true)}
                onOpenArchiveModal={() => setIsArchiveModalOpen(true)}
                onSaveCourses={handleSaveCoursesBatch}
                onQuickAssignTeacher={handleQuickAssignTeacher}
                onOpenAddCourse={() => setCourseModalData({ isOpen: true, course: null })}
                onOpenEditCourse={(c) => setCourseModalData({ isOpen: true, course: c })}
                onDeleteCourse={handleDeleteCourse}
                onBatchDeleteCourses={handleBatchDeleteCourses}
                onOpenAddStudent={() => setStudentModalData({ isOpen: true, student: null })}
                onOpenEditStudent={(s) => setStudentModalData({ isOpen: true, student: s })}
                onDeleteStudent={handleDeleteStudent}
              />
            )}

            {effectiveView === 'DEAN' && (
              <DeanPortal
                currentYear={currentYear}
                currentSemester={currentSemester}
                onYearChange={(y) => setCurrentYear(y)}
                onSemesterChange={(s) => setCurrentSemester(s)}
                availableYears={availableYears}
                onAddAcademicYear={handleAddAcademicYear}
                gradePublished={gradePublished}
                onToggleGradePublication={handleToggleGradePublication}
                semesterRelease={semesterRelease}
                onToggleSemesterRelease={handleToggleSemesterRelease}
                onToggleAllSemestersRelease={handleToggleAllSemestersRelease}
                studentPdfPrintAllowed={studentPdfPrintAllowed}
                onToggleStudentPdfPrint={() => {
                  const newVal = !studentPdfPrintAllowed;
                  handleToggleGlobalPdfPrint(newVal);
                  showNotification(
                    newVal
                      ? t('የተማሪዎች ፒዲኤፍ ማተም ሁነታ ተፈቅዷል!', 'Student PDF printing enabled!')
                      : t('የተማሪዎች ፒዲኤፍ ማተም ሁነታ ታግዷል!', 'Student PDF printing disabled!'),
                    newVal ? 'success' : 'warning'
                  );
                }}
                onOpenReleaseManager={() => setIsReleaseManagerOpen(true)}
                onOpenArchiveModal={() => setIsArchiveModalOpen(true)}
                onOpenJsonReaderModal={() => setIsJsonReaderOpen(true)}
                onDownloadFullBackup={handleDownloadMasterJson}
                courses={courses}
                students={students}
                teachers={teachers}
                grades={grades}
                onAddTeacher={handleAddTeacher}
                onOpenAddCourse={() => setCourseModalData({ isOpen: true, course: null })}
                onOpenEditCourse={(c) => setCourseModalData({ isOpen: true, course: c })}
                onDeleteCourse={handleDeleteCourse}
                onBatchDeleteCourses={handleBatchDeleteCourses}
                onOpenAddStudent={() => setStudentModalData({ isOpen: true, student: null })}
                onOpenEditStudent={(s) => setStudentModalData({ isOpen: true, student: s })}
                onDeleteStudent={handleDeleteStudent}
                onSaveGrades={handleSaveGrades}
                onSelectPrintTranscript={(s) => {
                  setTranscriptYear('');
                  setTranscriptSemester('');
                  setTranscriptStudent(s);
                }}
                showNotify={showNotification}
                officialConfig={officialConfig}
                onSaveOfficialConfig={handleSaveOfficialConfig}
                onClearAllGrades={handleClearAllGradesToBlank}
                churchLogo={churchLogo}
                onUpdateStudents={(updated) => setStudents(updated)}
                onSaveCourses={handleSaveCoursesBatch}
                onQuickAssignTeacher={handleQuickAssignTeacher}
              />
            )}

            {effectiveView === 'REGISTRAR' && (
              <RegistrarPortal
                students={students}
                courses={courses}
                grades={grades}
                photos={photos}
                currentYear={currentYear}
                currentSemester={currentSemester}
                availableYears={availableYears}
                onOpenJsonReaderModal={() => setIsJsonReaderOpen(true)}
                gradePublished={gradePublished}
                onToggleGradePublication={handleToggleGradePublication}
                studentPdfPrintAllowed={studentPdfPrintAllowed}
                onToggleStudentPdfPrint={() => {
                  const newVal = !studentPdfPrintAllowed;
                  handleToggleGlobalPdfPrint(newVal);
                  showNotification(
                    newVal
                      ? t('የተማሪዎች ፒዲኤፍ ማተም ሁነታ ተፈቅዷል!', 'Student PDF printing enabled!')
                      : t('የተማሪዎች ፒዲኤፍ ማተም ሁነታ ታግዷል!', 'Student PDF printing disabled!'),
                    newVal ? 'success' : 'warning'
                  );
                }}
                onOpenReleaseManager={() => setIsReleaseManagerOpen(true)}
                onOpenAddStudent={() => setStudentModalData({ isOpen: true, student: null })}
                onOpenEditStudent={(s) => setStudentModalData({ isOpen: true, student: s })}
                onOpenPhotoModal={(sid) => setPhotoModalStudentUid(sid)}
                onSelectPrintTranscript={(s) => {
                  setTranscriptYear('');
                  setTranscriptSemester('');
                  setTranscriptStudent(s);
                }}
                onDeleteStudent={handleDeleteStudent}
                showNotify={showNotification}
                onSaveGrades={handleSaveGrades}
                officialConfig={officialConfig}
                churchLogo={churchLogo}
                onUpdateStudents={(updated) => setStudents(updated)}
                teachers={teachers}
                userPasswords={userPasswords}
                onOpenPasswordModal={(uid, name) => setPasswordModalData({ isOpen: true, targetKey: uid, displayName: name })}
                onSaveCourses={handleSaveCoursesBatch}
              />
            )}

            {effectiveView === 'TEACHER' && (
              <TeacherPortal
                teacherName={currentUser.role === 'TEACHER' ? currentUser.name : (teachers[0] || 'መ/ር ሰሎሞን ሶርሳ')}
                courses={courses}
                students={students}
                grades={grades}
                currentYear={currentYear}
                currentSemester={currentSemester}
                onSaveGrades={handleSaveGrades}
                showNotify={showNotification}
                onUpdateCourse={handleSaveCourse}
                userRole={currentUser.role}
                teachers={teachers}
                churchLogo={churchLogo}
                officialConfig={officialConfig}
              />
            )}

            {effectiveView === 'STUDENT' && activeStudent && (
              <StudentPortal
                student={activeStudent}
                allStudents={currentUser.role === 'ADMIN' ? students : undefined}
                photos={currentUser.role === 'ADMIN' ? photos : undefined}
                isAdminViewer={currentUser.role === 'ADMIN'}
                onSelectStudent={
                  currentUser.role === 'ADMIN'
                    ? (uid: string) => setAdminSelectedStudentUid(uid)
                    : undefined
                }
                courses={courses}
                grades={grades}
                photoUrl={photos[activeStudent.uid]}
                currentYear={currentYear}
                currentSemester={currentSemester}
                gradePublished={gradePublished}
                semesterRelease={semesterRelease}
                individualGradeRelease={individualGradeRelease}
                fullTranscriptPublished={fullTranscriptPublished}
                individualFullTranscriptRelease={individualFullTranscriptRelease}
                studentPdfPrintAllowed={studentPdfPrintAllowed}
                individualPdfPrintAllowed={individualPdfPrintAllowed}
                officialConfig={officialConfig}
                churchLogo={churchLogo}
                onOpenTranscript={(year, sem) => {
                  setTranscriptYear(year || '');
                  setTranscriptSemester(sem || '');
                  setTranscriptStudent(activeStudent);
                }}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-6 mt-12 no-print border-t border-slate-800 text-center text-xs">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p className="text-slate-200 font-semibold">
            {t(
              'የብርብር ከተማ ቃለ ሕይወት ቤተ ክርስቲያን መጽሐፍ ቅዱስ ትምህርት ቤት',
              'Birbir City Kale Heywet Church Bible Training School'
            )}
          </p>
          <div className="flex items-center justify-center text-[11px] text-slate-400 pt-0.5">
            <span>
              {t(
                'Birbir City Kale Heywet Church Bible Training School © 2019 – 2030 ዓ.ም',
                'Academic & Student Management System © 2019 – 2030 E.C.'
              )}
            </span>
          </div>
        </div>
      </footer>

      {/* Generic Password Modal for all users */}
      {passwordModalData.isOpen && (
        <PasswordModal
          targetKey={passwordModalData.targetKey}
          targetDisplayName={passwordModalData.displayName}
          onClose={() => setPasswordModalData({ isOpen: false, targetKey: '', displayName: '' })}
          onSave={handleSavePassword}
        />
      )}

      {courseModalData.isOpen && (
        <CourseModal
          course={courseModalData.course}
          teachers={teachers}
          onClose={() => setCourseModalData({ isOpen: false, course: null })}
          onSave={handleSaveCourse}
        />
      )}

      {studentModalData.isOpen && (
        <StudentModal
          existingUids={students.map((s) => s.uid)}
          studentToEdit={studentModalData.student}
          onClose={() => setStudentModalData({ isOpen: false, student: null })}
          onSave={handleSaveStudent}
          showNotify={showNotification}
        />
      )}

      {photoModalStudentUid && (
        <PhotoModal
          student={students.find((s) => s.uid === photoModalStudentUid) || students[0]}
          currentPhoto={photos[photoModalStudentUid]}
          onClose={() => setPhotoModalStudentUid(null)}
          onSavePhoto={handleSavePhoto}
        />
      )}

      {transcriptStudent && (
        <TranscriptModal
          student={transcriptStudent}
          courses={courses}
          grades={grades}
          currentYear={currentYear}
          currentSemester={currentSemester}
          initialYear={transcriptYear || undefined}
          initialSemester={transcriptSemester || undefined}
          onClose={() => setTranscriptStudent(null)}
          churchLogo={churchLogo}
          officialConfig={officialConfig}
          allowPdfPrint={
            currentUser?.role !== 'STUDENT'
              ? true
              : (individualPdfPrintAllowed[transcriptStudent.uid] !== undefined
                  ? individualPdfPrintAllowed[transcriptStudent.uid]
                  : studentPdfPrintAllowed) === true
          }
          isStudentViewer={currentUser?.role === 'STUDENT'}
        />
      )}

      {/* Firebase Diagnostics & Cloud Sync Modal */}
      {isFirebaseModalOpen && (
        <FirebaseStatusModal
          report={firebaseReport}
          isTesting={isTestingFirebase}
          onTestConnection={handleTestFirebaseConnection}
          onPushAllToFirebase={handlePushAllToFirebase}
          onPullFromFirebase={handlePullFromFirebase}
          onClose={() => setIsFirebaseModalOpen(false)}
        />
      )}

      {/* Historical Search & Academic Archive Modal */}
      {isArchiveModalOpen && (
        <HistoricalArchiveModal
          students={students}
          courses={courses}
          grades={grades}
          teachers={teachers}
          availableYears={availableYears}
          currentYear={currentYear}
          currentSemester={currentSemester}
          churchLogo={churchLogo}
          officialConfig={officialConfig}
          onClose={() => setIsArchiveModalOpen(false)}
          onOpenStudentTranscript={(student) => {
            setTranscriptYear('');
            setTranscriptSemester('');
            setTranscriptStudent(student);
          }}
        />
      )}

      {/* Grade & Transcript Release Manager Modal (Bulk and Selective per Student) */}
      {isReleaseManagerOpen && (
        <GradeReleaseManagerModal
          students={students}
          gradePublished={gradePublished}
          individualGradeRelease={individualGradeRelease}
          fullTranscriptPublished={fullTranscriptPublished}
          individualFullTranscriptRelease={individualFullTranscriptRelease}
          studentPdfPrintAllowed={studentPdfPrintAllowed}
          individualPdfPrintAllowed={individualPdfPrintAllowed}
          onToggleGlobalRelease={(val) => setGradePublished(val)}
          onSetIndividualRelease={handleSetIndividualRelease}
          onBatchSetRelease={handleBatchSetRelease}
          onToggleGlobalFullTranscript={handleToggleGlobalFullTranscript}
          onSetIndividualFullTranscript={handleSetIndividualFullTranscript}
          onBatchSetFullTranscript={handleBatchSetFullTranscript}
          onToggleGlobalPdfPrint={handleToggleGlobalPdfPrint}
          onSetIndividualPdfPrint={handleSetIndividualPdfPrint}
          onBatchSetPdfPrint={handleBatchSetPdfPrint}
          onClose={() => setIsReleaseManagerOpen(false)}
          showNotify={showNotification}
        />
      )}

      {/* Universal JSON Reader & Importer Modal */}
      {isJsonReaderOpen && (
        <UniversalJsonReaderModal
          isOpen={isJsonReaderOpen}
          onClose={() => setIsJsonReaderOpen(false)}
          currentStudents={students}
          currentCourses={courses}
          currentGrades={grades}
          onApplyImport={handleUniversalJsonImport}
          showNotify={showNotification}
        />
      )}
    </div>
  );
}
