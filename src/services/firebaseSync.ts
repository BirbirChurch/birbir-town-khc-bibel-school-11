import {
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  orderBy,
  limit,
  writeBatch,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db, firebaseConfig, auth } from '../firebase.ts';
import { BlockedBrowserRecord, Course, FailedLoginAlert, GradeBreakdown, OfficialSignaturesConfig, SemesterReleaseConfig, Student } from '../types.ts';

// Startup Firestore connectivity probe
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
void testConnection();

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
  const errorMsg = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: errorMsg,
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
  
  // Only log if not an expected offline fallback, timeout or quota notification
  if (
    !errorMsg.includes('TIMEOUT_FIRESTORE') &&
    !errorMsg.includes('Backend didn\'t respond') &&
    !errorMsg.includes('client is offline') &&
    !errorMsg.includes('resource-exhausted') &&
    !errorMsg.includes('Quota limit exceeded')
  ) {
    console.warn('Firestore Note:', JSON.stringify(errInfo));
  }
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
  autoBlockThreshold?: number;
}

/**
 * Deeply sanitizes objects, arrays, numbers, and strings so Firestore NEVER encounters
 * 'undefined', 'NaN', or infinite numbers anywhere in the payload tree.
 */
export function sanitizeForFirestore<T>(data: T): T {
  const cleanNode = (val: any, seen: WeakSet<object>): any => {
    if (val === undefined || val === null) return null;
    const t = typeof val;
    if (t === 'number') {
      return Number.isFinite(val) ? val : 0;
    }
    if (t === 'string' || t === 'boolean') {
      return val;
    }
    if (t === 'function' || t === 'symbol') {
      return null;
    }
    if (typeof val === 'object') {
      if (seen.has(val)) return null;
      seen.add(val);
      if (val instanceof Date) {
        return val.toISOString();
      }
      if (Array.isArray(val)) {
        const arr: any[] = [];
        for (let i = 0; i < val.length; i++) {
          const item = val[i];
          if (item !== undefined && item !== null) {
            arr.push(cleanNode(item, seen));
          }
        }
        seen.delete(val);
        return arr;
      }
      const out: Record<string, any> = {};
      for (const k of Object.keys(val)) {
        const v = val[k];
        if (v !== undefined) {
          out[k] = cleanNode(v, seen);
        }
      }
      seen.delete(val);
      return out;
    }
    return null;
  };

  if (data === undefined) return null as unknown as T;
  return cleanNode(data, new WeakSet<object>()) as T;
}

/**
 * Actively checks connection and read/write permission to Cloud Firestore with extended timeout
 */
export async function checkFirebaseConnection(): Promise<FirebaseConnectionReport> {
  const timestamp = new Date().toLocaleTimeString();

  const pingPromise = async () => {
    const metaRef = doc(db, 'system_state', 'meta');
    try {
      const snap = await getDoc(metaRef);
      return snap.exists();
    } catch (err: any) {
      if (
        err?.code === 'resource-exhausted' ||
        String(err?.message || err).includes('Quota limit exceeded') ||
        String(err?.message || err).includes('Free daily write units')
      ) {
        throw err;
      }
      return false;
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
      if (typeof data.autoBlockThreshold === 'number') state.autoBlockThreshold = data.autoBlockThreshold;
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
  autoBlockThreshold?: number;
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
    const writePromise = setDoc(doc(db, 'system_state', 'grades'), { data: clean }, { merge: true });
    const timeoutPromise = new Promise<{ timeout: true }>((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT_FIRESTORE_WRITE')), 5000)
    );
    await Promise.race([writePromise, timeoutPromise]);
    return { success: true };
  } catch (e: any) {
    const errorMsg = e?.message || String(e);
    console.warn('Firestore grades sync note:', errorMsg);
    if (
      !errorMsg.includes('Quota limit exceeded') &&
      !errorMsg.includes('resource-exhausted') &&
      !errorMsg.includes('Free daily write units') &&
      !errorMsg.includes('TIMEOUT_FIRESTORE_WRITE')
    ) {
      handleFirestoreError(e, OperationType.WRITE, 'system_state/grades');
    }
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
    autoBlockThreshold?: number;
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
    autoBlockThreshold?: number;
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
      if (snap.metadata.hasPendingWrites) return;
      if (snap.exists() && callbacks.onMetaChange) {
        const data = snap.data();
        callbacks.onMetaChange({
          systemLocked: data.systemLocked,
          gradePublished: data.gradePublished,
          semesterRelease: data.semesterRelease,
          currentYear: data.currentYear,
          currentSemester: data.currentSemester,
          availableYears: data.availableYears,
          teachers: data.teachers,
          autoBlockThreshold: typeof data.autoBlockThreshold === 'number' ? data.autoBlockThreshold : undefined
        });
      }
    }, (err) => {
      console.warn('Meta snapshot notice:', err);
    });
    unsubscribes.push(unsubMeta);

    // 2. Students
    const unsubStudents = onSnapshot(doc(db, 'system_state', 'students'), (snap) => {
      if (snap.metadata.hasPendingWrites) return;
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
      if (snap.metadata.hasPendingWrites) return;
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
      if (snap.metadata.hasPendingWrites) return;
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
      if (snap.metadata.hasPendingWrites) return;
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
      if (snap.metadata.hasPendingWrites) return;
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

/**
 * Normalizes a security alert payload strictly within firebase-blueprint.json boundaries
 */
function sanitizeSecurityAlertPayload(alert: FailedLoginAlert): FailedLoginAlert {
  const safeId = String(alert.id || `sec_${Date.now()}`).replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 128);
  const out: FailedLoginAlert = {
    id: safeId,
    role: alert.role,
    attemptedTarget: String(alert.attemptedTarget || 'UNKNOWN').slice(0, 160),
    reason: alert.reason,
    maskedKey: String(alert.maskedKey || '').slice(0, 64),
    timestampIso: String(alert.timestampIso || new Date().toISOString()).slice(0, 64),
    timestampMs: Number.isFinite(alert.timestampMs) && alert.timestampMs > 0 ? alert.timestampMs : Date.now(),
    read: Boolean(alert.read)
  };
  if (alert.deviceInfo) {
    out.deviceInfo = String(alert.deviceInfo).slice(0, 120);
  }
  if (alert.browserId) {
    out.browserId = String(alert.browserId).replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 128);
  }
  return out;
}

export async function recordSecurityAlertToFirestore(alert: FailedLoginAlert): Promise<{ success: boolean; error?: string }> {
  const payload = sanitizeSecurityAlertPayload({ ...alert, read: false });
  const path = `security_alerts/${payload.id}`;
  try {
    await setDoc(doc(db, 'security_alerts', payload.id), payload);
    return { success: true };
  } catch (e: any) {
    handleFirestoreError(e, OperationType.CREATE, path);
    return { success: false, error: e?.message || String(e) };
  }
}

export async function markSecurityAlertReadInFirestore(alertId: string): Promise<{ success: boolean; error?: string }> {
  const path = `security_alerts/${alertId}`;
  try {
    await updateDoc(doc(db, 'security_alerts', alertId), { read: true });
    return { success: true };
  } catch (e: any) {
    handleFirestoreError(e, OperationType.UPDATE, path);
    return { success: false, error: e?.message || String(e) };
  }
}

export async function markAllSecurityAlertsReadInFirestore(alertIds: string[]): Promise<{ success: boolean; error?: string }> {
  if (alertIds.length === 0) return { success: true };
  try {
    const batch = writeBatch(db);
    alertIds.slice(0, 200).forEach((id) => {
      batch.update(doc(db, 'security_alerts', id), { read: true });
    });
    await batch.commit();
    return { success: true };
  } catch (e: any) {
    handleFirestoreError(e, OperationType.UPDATE, 'security_alerts');
    return { success: false, error: e?.message || String(e) };
  }
}

export async function deleteSecurityAlertInFirestore(alertId: string): Promise<{ success: boolean; error?: string }> {
  const path = `security_alerts/${alertId}`;
  try {
    await deleteDoc(doc(db, 'security_alerts', alertId));
    return { success: true };
  } catch (e: any) {
    handleFirestoreError(e, OperationType.DELETE, path);
    return { success: false, error: e?.message || String(e) };
  }
}

export async function clearAllSecurityAlertsInFirestore(alertIds: string[]): Promise<{ success: boolean; error?: string }> {
  if (alertIds.length === 0) return { success: true };
  try {
    const batch = writeBatch(db);
    alertIds.slice(0, 200).forEach((id) => {
      batch.delete(doc(db, 'security_alerts', id));
    });
    await batch.commit();
    return { success: true };
  } catch (e: any) {
    handleFirestoreError(e, OperationType.DELETE, 'security_alerts');
    return { success: false, error: e?.message || String(e) };
  }
}

export function subscribeToSecurityAlerts(
  onAlertsChange: (alerts: FailedLoginAlert[]) => void
): () => void {
  const path = 'security_alerts';
  try {
    const q = query(collection(db, path), orderBy('timestampMs', 'desc'), limit(100));
    return onSnapshot(
      q,
      (snapshot) => {
        const list: FailedLoginAlert[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as FailedLoginAlert;
          if (data && data.id) {
            list.push(data);
          }
        });
        onAlertsChange(list);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, path);
      }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    return () => {};
  }
}

function sanitizeBlockedBrowserPayload(record: BlockedBrowserRecord): BlockedBrowserRecord {
  const safeId = String(record.browserId || `brw_${Date.now()}`).replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 128);
  const out: BlockedBrowserRecord = {
    browserId: safeId,
    blocked: Boolean(record.blocked),
    reason: String(record.reason || 'Unauthorized login attempts').slice(0, 200),
    blockedAtIso: String(record.blockedAtIso || new Date().toISOString()).slice(0, 64),
    blockedAtMs: Number.isFinite(record.blockedAtMs) && record.blockedAtMs > 0 ? record.blockedAtMs : Date.now(),
    blockedBy: String(record.blockedBy || 'ADMIN').slice(0, 64)
  };
  if (record.attemptedRole) out.attemptedRole = record.attemptedRole;
  if (record.attemptedTarget) out.attemptedTarget = String(record.attemptedTarget).slice(0, 160);
  if (record.deviceInfo) out.deviceInfo = String(record.deviceInfo).slice(0, 120);
  return out;
}

export async function setBrowserBlockStatusInFirestore(record: BlockedBrowserRecord): Promise<{ success: boolean; error?: string }> {
  const payload = sanitizeBlockedBrowserPayload(record);
  const path = `blocked_browsers/${payload.browserId}`;
  try {
    await setDoc(doc(db, 'blocked_browsers', payload.browserId), payload);
    return { success: true };
  } catch (e: any) {
    handleFirestoreError(e, OperationType.WRITE, path);
    return { success: false, error: e?.message || String(e) };
  }
}

export async function deleteBlockedBrowserInFirestore(browserId: string): Promise<{ success: boolean; error?: string }> {
  const path = `blocked_browsers/${browserId}`;
  try {
    await deleteDoc(doc(db, 'blocked_browsers', browserId));
    return { success: true };
  } catch (e: any) {
    handleFirestoreError(e, OperationType.DELETE, path);
    return { success: false, error: e?.message || String(e) };
  }
}

export function subscribeToMyBrowserBlockStatus(
  browserId: string,
  onStatusChange: (record: BlockedBrowserRecord | null) => void
): () => void {
  const safeId = browserId.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 128);
  const path = `blocked_browsers/${safeId}`;
  try {
    return onSnapshot(
      doc(db, 'blocked_browsers', safeId),
      (snap) => {
        if (!snap.exists()) {
          onStatusChange(null);
          return;
        }
        onStatusChange(snap.data() as BlockedBrowserRecord);
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, path);
      }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
    return () => {};
  }
}

export function subscribeToAllBlockedBrowsers(
  onListChange: (list: BlockedBrowserRecord[]) => void
): () => void {
  const path = 'blocked_browsers';
  try {
    const q = query(collection(db, path), orderBy('blockedAtMs', 'desc'), limit(100));
    return onSnapshot(
      q,
      (snapshot) => {
        const list: BlockedBrowserRecord[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as BlockedBrowserRecord;
          if (data && data.browserId) {
            list.push(data);
          }
        });
        onListChange(list);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, path);
      }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    return () => {};
  }
}

export async function syncAutoBlockThresholdToFirestore(threshold: number): Promise<{ success: boolean; error?: string }> {
  try {
    await setDoc(doc(db, 'system_state', 'meta'), { autoBlockThreshold: threshold }, { merge: true });
    return { success: true };
  } catch (e: any) {
    handleFirestoreError(e, OperationType.WRITE, 'system_state/meta');
    return { success: false, error: e?.message || String(e) };
  }
}

export async function fetchAutoBlockThresholdFromFirestore(): Promise<number | null> {
  try {
    const snap = await getDoc(doc(db, 'system_state', 'meta'));
    if (snap.exists()) {
      const val = snap.data()?.autoBlockThreshold;
      if (typeof val === 'number') return val;
    }
    return null;
  } catch (_) {
    return null;
  }
}


