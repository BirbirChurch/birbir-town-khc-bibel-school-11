import { doc, getDoc, getDocFromServer, setDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db, firebaseConfig, auth } from '../firebase.ts';
import { Course, GradeBreakdown, OfficialSignaturesConfig, SemesterReleaseConfig, Student } from '../types.ts';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): FirestoreErrorInfo {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  return errInfo;
}

export interface FirebaseConnectionReport {
  status: 'connected' | 'error' | 'testing';
  code?: string;
  message?: string;
  solution?: string;
  lastChecked?: string;
}

export interface FirebaseSystemState {
  students?: Student[];
  teachers?: string[];
  courses?: Course[];
  grades?: Record<string, GradeBreakdown>;
  photos?: Record<string, string>;
  userPasswords?: Record<string, string>;
  availableYears?: string[];
  systemLocked?: boolean;
  gradePublished?: boolean;
  semesterRelease?: SemesterReleaseConfig;
  currentYear?: string;
  currentSemester?: string;
  churchLogo?: string;
  officialConfig?: OfficialSignaturesConfig;
}

/**
 * Deeply sanitizes objects, arrays, numbers, and strings so Firestore NEVER encounters
 * 'undefined', 'NaN', or infinite numbers anywhere in the payload tree.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === undefined || data === null) {
    return (data === undefined ? null : data) as unknown as T;
  }
  try {
    const serialized = JSON.stringify(data, (_key, value) => {
      if (value === undefined) {
        return undefined; // JSON.stringify omits undefined object properties
      }
      if (typeof value === 'number') {
        if (isNaN(value) || !isFinite(value)) {
          return 0; // Prevent NaN or Infinity which Firestore rejects
        }
      }
      return value;
    });

    if (serialized === undefined) {
      return null as unknown as T;
    }

    const parsed = JSON.parse(serialized);

    const cleanDeep = (val: any): any => {
      if (val === null || val === undefined) return null;
      if (Array.isArray(val)) {
        return val.filter((x) => x !== undefined && x !== null).map(cleanDeep);
      }
      if (typeof val === 'object') {
        const out: Record<string, any> = {};
        for (const [k, v] of Object.entries(val)) {
          if (v !== undefined) {
            out[k] = cleanDeep(v);
          }
        }
        return out;
      }
      return val;
    };

    return cleanDeep(parsed) as T;
  } catch (_) {
    if (typeof data !== 'object') return data;
    if (Array.isArray(data)) {
      return (data as any[]).map((item) => (item === undefined ? null : sanitizeForFirestore(item))) as unknown as T;
    }
    const res: Record<string, any> = {};
    for (const [k, v] of Object.entries(data as Record<string, any>)) {
      if (v !== undefined) {
        res[k] = sanitizeForFirestore(v);
      }
    }
    return res as T;
  }
}

/**
 * Actively checks connection and read/write permission to Cloud Firestore with extended timeout
 */
export async function checkFirebaseConnection(): Promise<FirebaseConnectionReport> {
  const timestamp = new Date().toLocaleTimeString();

  const pingPromise = async () => {
    const metaRef = doc(db, 'system_state', 'meta');
    try {
      const snap = await getDocFromServer(metaRef);
      return snap.exists();
    } catch (err: any) {
      if (
        err?.code === 'resource-exhausted' ||
        String(err?.message || err).includes('Quota limit exceeded') ||
        String(err?.message || err).includes('Free daily write units')
      ) {
        throw err;
      }
      const fallbackSnap = await getDoc(metaRef);
      return fallbackSnap.exists();
    }
  };

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('TIMEOUT_FIRESTORE')), 20000)
  );

  try {
    const success = await Promise.race([pingPromise(), timeoutPromise]);

    if (success) {
      return {
        status: 'connected',
        message: 'ከFirebase Cloud Firestore ዳታቤዝ ጋር በስኬት ተገናኝቷል (Connected to Firestore successfully)!',
        lastChecked: timestamp
      };
    } else {
      return {
        status: 'error',
        code: 'not-found',
        message: 'የFirestore ዳታቤዝ ሰነድ ማግኘት አልተቻለም።',
        solution: 'በFirebase Console ውስጥ Cloud Firestore Database መፈጠሩን ያረጋግጡ።',
        lastChecked: timestamp
      };
    }
  } catch (err: any) {
    const errorCode = err?.code || 'unknown';
    const errorMsg = String(err?.message || err);

    let message = 'ከFirebase Firestore ጋር መገናኘት አልተቻለም።';
    let solution = 'እባክዎ በFirebase Console ውስጥ Cloud Firestore Database መፈጠሩንና ደንቦች (Rules) ክፍት መሆናቸውን ያረጋግጡ።';

    if (
      errorCode.includes('resource-exhausted') ||
      errorMsg.includes('Quota limit exceeded') ||
      errorMsg.includes('Free daily write units')
    ) {
      const dbId = (firebaseConfig as any).firestoreDatabaseId || 'ai-studio-9518b017-d65d-4510-a375-8c1ffab3693a';
      const consoleUrl = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore/databases/${dbId}/data?openUpgradeDialog=true`;
      message = 'የFirebase ነፃ ዕለታዊ የመፃፍ መጠን ገደብ አልቋል (Free Daily Write Quota Exceeded)።';
      solution = `በFirebase Spark plan ነፃ አጠቃቀም ገደብ ምክንያት የዛሬው የክላውድ መፃፍ መጠን አልቋል።\n` +
        `• መረጃዎች በሙሉ በኮምፒውተርዎ (Local Storage) ላይ በጥንቃቄ ተመዝግበው ይቆያሉ።\n` +
        `• ገደቡ ነገ ሲታደስ በራሱ ይገናኛል፤ ወይም በFirebase Console ውስጥ ማሻሻል ይቻላል፦\n` +
        consoleUrl;
    } else if (
      errorMsg.includes('Cloud Firestore API has not been used') ||
      errorMsg.includes('firestore.googleapis.com') ||
      errorMsg.includes('it is disabled') ||
      errorMsg.includes('not been used in project')
    ) {
      message = `በGoogle Cloud/Firebase ፕሮጀክት (${firebaseConfig.projectId}) ውስጥ Cloud Firestore Database ገና አልተከፈተም (Firestore is not enabled yet)።`;
      solution = `1. ወደ Firebase Console ይሂዱ፦ https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore\n` +
        `2. "Create database" የሚለውን አዝራር ይጫኑ።\n` +
        `3. "Start in test mode" የሚለውን ይምረጡና "Enable" ይጫኑ።\n` +
        `4. ከዚያ በኋላ እዚህ መጥተው "ግንኙነት ፈትሽ" ሲጫኑ ወዲያውኑ ይገናኛል!`;
    } else if (
      errorCode.includes('permission-denied') ||
      errorMsg.includes('permission-denied') ||
      errorMsg.includes('insufficient permissions')
    ) {
      message = 'የፍቃድ እክል (Permission Denied): የFirestore Security Rules ዝግ ናቸው ወይም አልተፈቀደም።';
      solution = `1. ወደ Firebase Console > Firestore Database > Rules ክፍል ይሂዱ።\n` +
        `2. "allow read, write: if true;" ብለው በማስተካከል "Publish" የሚለውን ይጫኑ።`;
    } else if (errorCode.includes('not-found') || errorMsg.includes('NOT_FOUND')) {
      message = 'ዳታቤዙ አልተፈጠረም (Database Not Found)።';
      solution = `በFirebase Console ውስጥ ገብተው Cloud Firestore Database መፍጠርዎን ያረጋግጡ።`;
    } else if (errorMsg.includes('TIMEOUT_FIRESTORE')) {
      message = 'የዳታቤዝ ግንኙነት ምላሽ ዘግይቷል (Connection Timeout)።';
      solution = 'የኢንተርኔት ግንኙነትዎን ያረጋግጡ፤ ዳታቤዙ በጀርባ እየተገናኘ ነው፤ እባክዎ እንደገና ይሞክሩ።';
    } else if (errorCode.includes('unavailable') || errorMsg.includes('unavailable') || errorMsg.includes('client is offline')) {
      message = 'የኢንተርኔት ግንኙነት እክል (Service Unavailable / Offline)።';
      solution = 'የኮምፒውተርዎን ወይም የሞባይልዎን የኢንተርኔት ግንኙነት ያረጋግጡ።';
    }

    handleFirestoreError(err, OperationType.GET, 'system_state/meta');

    return {
      status: 'error',
      code: errorCode,
      message,
      solution,
      lastChecked: timestamp
    };
  }
}

/**
 * Loads system state from Firestore with individual document error-resilience
 */
export async function loadInitialFromFirestore(): Promise<FirebaseSystemState | null> {
  try {
    const [metaRes, studentsRes, coursesRes, gradesRes, passwordsRes, photosRes, brandRes, officialRes] = await Promise.allSettled([
      getDoc(doc(db, 'system_state', 'meta')),
      getDoc(doc(db, 'system_state', 'students')),
      getDoc(doc(db, 'system_state', 'courses')),
      getDoc(doc(db, 'system_state', 'grades')),
      getDoc(doc(db, 'system_state', 'passwords')),
      getDoc(doc(db, 'system_state', 'photos')),
      getDoc(doc(db, '_system_settings', 'branding')),
      getDoc(doc(db, 'system_state', 'official_signatures'))
    ]);

    let hasAnyData = false;
    const state: FirebaseSystemState = {};

    const metaDoc = metaRes.status === 'fulfilled' ? metaRes.value : null;
    if (metaDoc && metaDoc.exists()) {
      hasAnyData = true;
      const data = metaDoc.data();
      if (typeof data.systemLocked === 'boolean') state.systemLocked = data.systemLocked;
      if (typeof data.gradePublished === 'boolean') state.gradePublished = data.gradePublished;
      if (data.semesterRelease) state.semesterRelease = data.semesterRelease;
      if (data.currentYear) state.currentYear = data.currentYear;
      if (data.currentSemester) state.currentSemester = data.currentSemester;
      if (Array.isArray(data.availableYears)) state.availableYears = data.availableYears;
      if (Array.isArray(data.teachers)) state.teachers = data.teachers;
    }

    const studentsDoc = studentsRes.status === 'fulfilled' ? studentsRes.value : null;
    if (studentsDoc && studentsDoc.exists()) {
      hasAnyData = true;
      const data = studentsDoc.data();
      if (Array.isArray(data.list) && data.list.length > 0) state.students = data.list;
    }

    const coursesDoc = coursesRes.status === 'fulfilled' ? coursesRes.value : null;
    if (coursesDoc && coursesDoc.exists()) {
      hasAnyData = true;
      const data = coursesDoc.data();
      if (Array.isArray(data.list) && data.list.length > 0) state.courses = data.list;
    }

    const gradesDoc = gradesRes.status === 'fulfilled' ? gradesRes.value : null;
    if (gradesDoc && gradesDoc.exists()) {
      hasAnyData = true;
      const data = gradesDoc.data();
      if (data.data) state.grades = data.data;
    }

    const passwordsDoc = passwordsRes.status === 'fulfilled' ? passwordsRes.value : null;
    if (passwordsDoc && passwordsDoc.exists()) {
      hasAnyData = true;
      const data = passwordsDoc.data();
      if (data.data) state.userPasswords = data.data;
    }

    const photosDoc = photosRes.status === 'fulfilled' ? photosRes.value : null;
    if (photosDoc && photosDoc.exists()) {
      hasAnyData = true;
      const data = photosDoc.data();
      if (data.data) state.photos = data.data;
    }

    const brandDoc = brandRes.status === 'fulfilled' ? brandRes.value : null;
    if (brandDoc && brandDoc.exists()) {
      hasAnyData = true;
      const data = brandDoc.data();
      if (data.churchLogo) state.churchLogo = data.churchLogo;
    }

    const officialDoc = officialRes.status === 'fulfilled' ? officialRes.value : null;
    if (officialDoc && officialDoc.exists()) {
      hasAnyData = true;
      const data = officialDoc.data();
      if (data) state.officialConfig = data as OfficialSignaturesConfig;
    }

    if (!hasAnyData) {
      return null;
    }

    return state;
  } catch (error) {
    console.warn('Firebase initial load note:', error);
    return null;
  }
}

export async function syncMetaToFirestore(meta: {
  systemLocked: boolean;
  gradePublished: boolean;
  semesterRelease?: SemesterReleaseConfig;
  currentYear: string;
  currentSemester: string;
  availableYears: string[];
  teachers: string[];
}): Promise<{ success: boolean; error?: string }> {
  try {
    const clean = sanitizeForFirestore(meta);
    await setDoc(doc(db, 'system_state', 'meta'), clean, { merge: true });
    return { success: true };
  } catch (e: any) {
    console.warn('Error saving meta to Firestore:', e);
    handleFirestoreError(e, OperationType.WRITE, 'system_state/meta');
    return { success: false, error: e?.message || String(e) };
  }
}

export async function syncStudentsToFirestore(students: Student[]): Promise<{ success: boolean; error?: string }> {
  try {
    const clean = sanitizeForFirestore(students);
    await setDoc(doc(db, 'system_state', 'students'), { list: clean }, { merge: true });
    return { success: true };
  } catch (e: any) {
    console.warn('Error saving students to Firestore:', e);
    handleFirestoreError(e, OperationType.WRITE, 'system_state/students');
    return { success: false, error: e?.message || String(e) };
  }
}

export async function syncCoursesToFirestore(courses: Course[]): Promise<{ success: boolean; error?: string }> {
  try {
    const clean = sanitizeForFirestore(courses);
    await setDoc(doc(db, 'system_state', 'courses'), { list: clean }, { merge: true });
    return { success: true };
  } catch (e: any) {
    console.warn('Error saving courses to Firestore:', e);
    handleFirestoreError(e, OperationType.WRITE, 'system_state/courses');
    return { success: false, error: e?.message || String(e) };
  }
}

export async function syncGradesToFirestore(grades: Record<string, GradeBreakdown>): Promise<{ success: boolean; error?: string }> {
  try {
    const clean = sanitizeForFirestore(grades);
    await setDoc(doc(db, 'system_state', 'grades'), { data: clean }, { merge: true });
    return { success: true };
  } catch (e: any) {
    const errorMsg = e?.message || String(e);
    console.error('Error saving grades to Firestore:', errorMsg);
    handleFirestoreError(e, OperationType.WRITE, 'system_state/grades');
    return { success: false, error: errorMsg };
  }
}

export async function syncPasswordsToFirestore(userPasswords: Record<string, string>): Promise<{ success: boolean; error?: string }> {
  try {
    const clean = sanitizeForFirestore(userPasswords);
    await setDoc(doc(db, 'system_state', 'passwords'), { data: clean }, { merge: true });
    return { success: true };
  } catch (e: any) {
    console.warn('Error saving passwords to Firestore:', e);
    handleFirestoreError(e, OperationType.WRITE, 'system_state/passwords');
    return { success: false, error: e?.message || String(e) };
  }
}

export async function syncPhotosToFirestore(photos: Record<string, string>): Promise<{ success: boolean; error?: string }> {
  try {
    const clean = sanitizeForFirestore(photos);
    await setDoc(doc(db, 'system_state', 'photos'), { data: clean }, { merge: true });
    return { success: true };
  } catch (e: any) {
    console.warn('Error saving photos to Firestore:', e);
    handleFirestoreError(e, OperationType.WRITE, 'system_state/photos');
    return { success: false, error: e?.message || String(e) };
  }
}

export async function syncChurchLogoToFirestore(logo: string): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanLogo = logo || '';
    await Promise.allSettled([
      setDoc(doc(db, 'system_state', 'branding'), { churchLogo: cleanLogo, updatedAt: new Date().toISOString() }, { merge: true }),
      setDoc(doc(db, '_system_settings', 'branding'), { churchLogo: cleanLogo, updatedAt: new Date().toISOString() }, { merge: true })
    ]);
    return { success: true };
  } catch (e: any) {
    console.warn('Error saving church logo to Firestore:', e);
    handleFirestoreError(e, OperationType.WRITE, 'system_state/branding');
    return { success: false, error: e?.message || String(e) };
  }
}

export async function loadChurchLogoFromFirestore(): Promise<string | null> {
  try {
    const brandSnap = await getDoc(doc(db, 'system_state', 'branding'));
    if (brandSnap.exists() && brandSnap.data()?.churchLogo) {
      return brandSnap.data()?.churchLogo;
    }
  } catch (_) {}
  try {
    const brandSnapOld = await getDoc(doc(db, '_system_settings', 'branding'));
    if (brandSnapOld.exists() && brandSnapOld.data()?.churchLogo) {
      return brandSnapOld.data()?.churchLogo;
    }
  } catch (e) {
    console.warn('Error loading church logo from Firestore:', e);
  }
  return null;
}

export async function syncOfficialConfigToFirestore(config: OfficialSignaturesConfig): Promise<{ success: boolean; error?: string }> {
  try {
    const clean = sanitizeForFirestore(config);
    await setDoc(doc(db, 'system_state', 'official_signatures'), clean, { merge: true });
    return { success: true };
  } catch (e: any) {
    console.warn('Error saving official config to Firestore:', e);
    handleFirestoreError(e, OperationType.WRITE, 'system_state/official_signatures');
    return { success: false, error: e?.message || String(e) };
  }
}

/**
 * Pushes entire system state to Firebase Firestore at once
 */
export async function pushAllStateToFirestore(payload: {
  meta: {
    systemLocked: boolean;
    gradePublished: boolean;
    semesterRelease?: SemesterReleaseConfig;
    currentYear: string;
    currentSemester: string;
    availableYears: string[];
    teachers: string[];
  };
  students: Student[];
  courses: Course[];
  grades: Record<string, GradeBreakdown>;
  passwords: Record<string, string>;
  photos: Record<string, string>;
  churchLogo?: string;
  officialConfig?: OfficialSignaturesConfig;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const promises: Promise<any>[] = [
      setDoc(doc(db, 'system_state', 'meta'), sanitizeForFirestore(payload.meta), { merge: true }),
      setDoc(doc(db, 'system_state', 'students'), { list: sanitizeForFirestore(payload.students) }, { merge: true }),
      setDoc(doc(db, 'system_state', 'courses'), { list: sanitizeForFirestore(payload.courses) }, { merge: true }),
      setDoc(doc(db, 'system_state', 'grades'), { data: sanitizeForFirestore(payload.grades) }, { merge: true }),
      setDoc(doc(db, 'system_state', 'passwords'), { data: sanitizeForFirestore(payload.passwords) }, { merge: true }),
      setDoc(doc(db, 'system_state', 'photos'), { data: sanitizeForFirestore(payload.photos) }, { merge: true }),
      setDoc(doc(db, 'system_state', 'connection_ping'), { lastPing: new Date().toISOString(), app: 'birbir_bible_school' }, { merge: true })
    ];

    if (payload.churchLogo) {
      promises.push(
        setDoc(doc(db, '_system_settings', 'branding'), { churchLogo: payload.churchLogo, updatedAt: new Date().toISOString() }, { merge: true }),
        setDoc(doc(db, 'system_state', 'branding'), { churchLogo: payload.churchLogo, updatedAt: new Date().toISOString() }, { merge: true })
      );
    }

    if (payload.officialConfig) {
      promises.push(
        setDoc(doc(db, 'system_state', 'official_signatures'), sanitizeForFirestore(payload.officialConfig), { merge: true })
      );
    }

    await Promise.all(promises);
    return { success: true };
  } catch (err: any) {
    handleFirestoreError(err, OperationType.WRITE, 'system_state');
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Subscribes to real-time updates from Firestore so that all changes made by teachers or admin
 * are immediately reflected live across all browsers and devices without needing manual reload.
 */
export function subscribeToSystemState(callbacks: {
  onMetaChange?: (meta: {
    systemLocked?: boolean;
    gradePublished?: boolean;
    semesterRelease?: SemesterReleaseConfig;
    currentYear?: string;
    currentSemester?: string;
    availableYears?: string[];
    teachers?: string[];
  }) => void;
  onStudentsChange?: (students: Student[]) => void;
  onCoursesChange?: (courses: Course[]) => void;
  onGradesChange?: (grades: Record<string, GradeBreakdown>) => void;
  onPasswordsChange?: (passwords: Record<string, string>) => void;
  onPhotosChange?: (photos: Record<string, string>) => void;
  onLogoChange?: (logo: string) => void;
  onOfficialConfigChange?: (config: OfficialSignaturesConfig) => void;
}): () => void {
  const unsubscribes: Unsubscribe[] = [];

  try {
    // 1. Meta
    const unsubMeta = onSnapshot(doc(db, 'system_state', 'meta'), (snap) => {
      if (snap.exists() && callbacks.onMetaChange) {
        const data = snap.data();
        callbacks.onMetaChange({
          systemLocked: data.systemLocked,
          gradePublished: data.gradePublished,
          semesterRelease: data.semesterRelease,
          currentYear: data.currentYear,
          currentSemester: data.currentSemester,
          availableYears: data.availableYears,
          teachers: data.teachers
        });
      }
    }, (err) => {
      console.warn('Meta snapshot notice:', err);
    });
    unsubscribes.push(unsubMeta);

    // 2. Students
    const unsubStudents = onSnapshot(doc(db, 'system_state', 'students'), (snap) => {
      if (snap.exists() && callbacks.onStudentsChange) {
        const data = snap.data();
        if (Array.isArray(data.list) && data.list.length > 0) {
          callbacks.onStudentsChange(data.list);
        }
      }
    }, (err) => {
      console.warn('Students snapshot notice:', err);
    });
    unsubscribes.push(unsubStudents);

    // 3. Courses
    const unsubCourses = onSnapshot(doc(db, 'system_state', 'courses'), (snap) => {
      if (snap.exists() && callbacks.onCoursesChange) {
        const data = snap.data();
        if (Array.isArray(data.list) && data.list.length > 0) {
          callbacks.onCoursesChange(data.list);
        }
      }
    }, (err) => {
      console.warn('Courses snapshot notice:', err);
    });
    unsubscribes.push(unsubCourses);

    // 4. Grades
    const unsubGrades = onSnapshot(doc(db, 'system_state', 'grades'), (snap) => {
      if (snap.exists() && callbacks.onGradesChange) {
        const data = snap.data();
        if (data.data) {
          callbacks.onGradesChange(data.data);
        }
      }
    }, (err) => {
      console.warn('Grades snapshot notice:', err);
    });
    unsubscribes.push(unsubGrades);

    // 5. Passwords
    const unsubPasswords = onSnapshot(doc(db, 'system_state', 'passwords'), (snap) => {
      if (snap.exists() && callbacks.onPasswordsChange) {
        const data = snap.data();
        if (data.data) {
          callbacks.onPasswordsChange(data.data);
        }
      }
    }, (err) => {
      console.warn('Passwords snapshot notice:', err);
    });
    unsubscribes.push(unsubPasswords);

    // 6. Photos
    const unsubPhotos = onSnapshot(doc(db, 'system_state', 'photos'), (snap) => {
      if (snap.exists() && callbacks.onPhotosChange) {
        const data = snap.data();
        if (data.data) {
          callbacks.onPhotosChange(data.data);
        }
      }
    }, (err) => {
      console.warn('Photos snapshot notice:', err);
    });
    unsubscribes.push(unsubPhotos);

    // 7. Church Logo Branding
    const unsubBranding = onSnapshot(doc(db, '_system_settings', 'branding'), (snap) => {
      if (snap.exists() && callbacks.onLogoChange) {
        const data = snap.data();
        if (data.churchLogo) {
          callbacks.onLogoChange(data.churchLogo);
        }
      }
    }, (err) => {
      console.warn('Branding snapshot notice:', err);
    });
    unsubscribes.push(unsubBranding);

    // 8. Official Signatures and Stamp
    const unsubOfficial = onSnapshot(doc(db, 'system_state', 'official_signatures'), (snap) => {
      if (snap.exists() && callbacks.onOfficialConfigChange) {
        const data = snap.data();
        if (data) {
          callbacks.onOfficialConfigChange(data as OfficialSignaturesConfig);
        }
      }
    }, (err) => {
      console.warn('Official config snapshot notice:', err);
    });
    unsubscribes.push(unsubOfficial);

  } catch (err) {
    console.warn('Error setting up snapshot listeners:', err);
  }

  return () => {
    unsubscribes.forEach((unsub) => {
      try {
        unsub();
      } catch (_) {}
    });
  };
}
