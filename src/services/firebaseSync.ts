import { doc, getDoc, setDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db, firebaseConfig } from '../firebase.ts';
import { Course, GradeBreakdown, OfficialSignaturesConfig, Student } from '../types.ts';

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
  currentYear?: string;
  currentSemester?: string;
  churchLogo?: string;
  officialConfig?: OfficialSignaturesConfig;
}

/**
 * Actively checks connection and read/write permission to Cloud Firestore with timeout
 */
export async function checkFirebaseConnection(): Promise<FirebaseConnectionReport> {
  const timestamp = new Date().toLocaleTimeString();

  const pingPromise = async () => {
    const testRef = doc(db, 'system_state', 'connection_ping');
    await setDoc(testRef, { lastPing: new Date().toISOString() }, { merge: true });
    const snap = await getDoc(testRef);
    return snap.exists();
  };

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('TIMEOUT_FIRESTORE')), 8000)
  );

  try {
    const success = await Promise.race([pingPromise(), timeoutPromise]);

    if (success) {
      return {
        status: 'connected',
        message: 'ከFirebase Firestore ዳታቤዝ ጋር በስኬት ተገናኝቷል (Connected to Firestore successfully)!',
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
      solution = 'የኢንተርኔት ግንኙነትዎን ያረጋግጡ፤ ወይም በFirebase Console ውስጥ Firestore Database ገና መፈጠር ላይ ሊሆን ይችላል።';
    } else if (errorCode.includes('unavailable') || errorMsg.includes('unavailable')) {
      message = 'የኢንተርኔት ግንኙነት እክል (Service Unavailable)።';
      solution = 'የኮምፒውተርዎን ወይም የሞባይልዎን የኢንተርኔት ግንኙነት ያረጋግጡ።';
    }

    return {
      status: 'error',
      code: errorCode,
      message,
      solution,
      lastChecked: timestamp
    };
  }
}

export async function loadInitialFromFirestore(): Promise<FirebaseSystemState | null> {
  try {
    const [metaDoc, studentsDoc, coursesDoc, gradesDoc, passwordsDoc, photosDoc, brandDoc, officialDoc] = await Promise.all([
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

    if (metaDoc.exists()) {
      hasAnyData = true;
      const data = metaDoc.data();
      if (typeof data.systemLocked === 'boolean') state.systemLocked = data.systemLocked;
      if (typeof data.gradePublished === 'boolean') state.gradePublished = data.gradePublished;
      if (data.currentYear) state.currentYear = data.currentYear;
      if (data.currentSemester) state.currentSemester = data.currentSemester;
      if (Array.isArray(data.availableYears)) state.availableYears = data.availableYears;
      if (Array.isArray(data.teachers)) state.teachers = data.teachers;
    }

    if (studentsDoc.exists()) {
      hasAnyData = true;
      const data = studentsDoc.data();
      if (Array.isArray(data.list) && data.list.length > 0) state.students = data.list;
    }

    if (coursesDoc.exists()) {
      hasAnyData = true;
      const data = coursesDoc.data();
      if (Array.isArray(data.list) && data.list.length > 0) state.courses = data.list;
    }

    if (gradesDoc.exists()) {
      hasAnyData = true;
      const data = gradesDoc.data();
      if (data.data) state.grades = data.data;
    }

    if (passwordsDoc.exists()) {
      hasAnyData = true;
      const data = passwordsDoc.data();
      if (data.data) state.userPasswords = data.data;
    }

    if (photosDoc.exists()) {
      hasAnyData = true;
      const data = photosDoc.data();
      if (data.data) state.photos = data.data;
    }

    if (brandDoc.exists()) {
      hasAnyData = true;
      const data = brandDoc.data();
      if (data.churchLogo) state.churchLogo = data.churchLogo;
    }

    if (officialDoc.exists()) {
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
  currentYear: string;
  currentSemester: string;
  availableYears: string[];
  teachers: string[];
}) {
  try {
    await setDoc(doc(db, 'system_state', 'meta'), meta, { merge: true });
  } catch (e) {
    console.warn('Error saving meta to Firestore:', e);
  }
}

export async function syncStudentsToFirestore(students: Student[]) {
  try {
    await setDoc(doc(db, 'system_state', 'students'), { list: students }, { merge: true });
  } catch (e) {
    console.warn('Error saving students to Firestore:', e);
  }
}

export async function syncCoursesToFirestore(courses: Course[]) {
  try {
    await setDoc(doc(db, 'system_state', 'courses'), { list: courses }, { merge: true });
  } catch (e) {
    console.warn('Error saving courses to Firestore:', e);
  }
}

export async function syncGradesToFirestore(grades: Record<string, GradeBreakdown>) {
  try {
    await setDoc(doc(db, 'system_state', 'grades'), { data: grades }, { merge: true });
  } catch (e) {
    console.warn('Error saving grades to Firestore:', e);
  }
}

export async function syncPasswordsToFirestore(userPasswords: Record<string, string>) {
  try {
    await setDoc(doc(db, 'system_state', 'passwords'), { data: userPasswords }, { merge: true });
  } catch (e) {
    console.warn('Error saving passwords to Firestore:', e);
  }
}

export async function syncPhotosToFirestore(photos: Record<string, string>) {
  try {
    await setDoc(doc(db, 'system_state', 'photos'), { data: photos }, { merge: true });
  } catch (e) {
    console.warn('Error saving photos to Firestore:', e);
  }
}

export async function syncChurchLogoToFirestore(logo: string) {
  try {
    await Promise.allSettled([
      setDoc(doc(db, 'system_state', 'branding'), { churchLogo: logo, updatedAt: new Date().toISOString() }, { merge: true }),
      setDoc(doc(db, '_system_settings', 'branding'), { churchLogo: logo, updatedAt: new Date().toISOString() }, { merge: true })
    ]);
  } catch (e) {
    console.warn('Error saving church logo to Firestore:', e);
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

export async function syncOfficialConfigToFirestore(config: OfficialSignaturesConfig) {
  try {
    await setDoc(doc(db, 'system_state', 'official_signatures'), config, { merge: true });
  } catch (e) {
    console.warn('Error saving official config to Firestore:', e);
  }
}

/**
 * Pushes entire system state to Firebase Firestore at once
 */
export async function pushAllStateToFirestore(payload: {
  meta: {
    systemLocked: boolean;
    gradePublished: boolean;
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
      setDoc(doc(db, 'system_state', 'meta'), payload.meta, { merge: true }),
      setDoc(doc(db, 'system_state', 'students'), { list: payload.students }, { merge: true }),
      setDoc(doc(db, 'system_state', 'courses'), { list: payload.courses }, { merge: true }),
      setDoc(doc(db, 'system_state', 'grades'), { data: payload.grades }, { merge: true }),
      setDoc(doc(db, 'system_state', 'passwords'), { data: payload.passwords }, { merge: true }),
      setDoc(doc(db, 'system_state', 'photos'), { data: payload.photos }, { merge: true })
    ];

    if (payload.churchLogo) {
      promises.push(
        setDoc(doc(db, '_system_settings', 'branding'), { churchLogo: payload.churchLogo, updatedAt: new Date().toISOString() }, { merge: true })
      );
    }

    if (payload.officialConfig) {
      promises.push(
        setDoc(doc(db, 'system_state', 'official_signatures'), payload.officialConfig, { merge: true })
      );
    }

    await Promise.all(promises);
    return { success: true };
  } catch (err: any) {
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
          currentYear: data.currentYear,
          currentSemester: data.currentSemester,
          availableYears: data.availableYears,
          teachers: data.teachers
        });
      }
    }, (err) => console.warn('Meta snapshot warning:', err));
    unsubscribes.push(unsubMeta);

    // 2. Students
    const unsubStudents = onSnapshot(doc(db, 'system_state', 'students'), (snap) => {
      if (snap.exists() && callbacks.onStudentsChange) {
        const data = snap.data();
        if (Array.isArray(data.list) && data.list.length > 0) {
          callbacks.onStudentsChange(data.list);
        }
      }
    }, (err) => console.warn('Students snapshot warning:', err));
    unsubscribes.push(unsubStudents);

    // 3. Courses
    const unsubCourses = onSnapshot(doc(db, 'system_state', 'courses'), (snap) => {
      if (snap.exists() && callbacks.onCoursesChange) {
        const data = snap.data();
        if (Array.isArray(data.list) && data.list.length > 0) {
          callbacks.onCoursesChange(data.list);
        }
      }
    }, (err) => console.warn('Courses snapshot warning:', err));
    unsubscribes.push(unsubCourses);

    // 4. Grades
    const unsubGrades = onSnapshot(doc(db, 'system_state', 'grades'), (snap) => {
      if (snap.exists() && callbacks.onGradesChange) {
        const data = snap.data();
        if (data.data) {
          callbacks.onGradesChange(data.data);
        }
      }
    }, (err) => console.warn('Grades snapshot warning:', err));
    unsubscribes.push(unsubGrades);

    // 5. Passwords
    const unsubPasswords = onSnapshot(doc(db, 'system_state', 'passwords'), (snap) => {
      if (snap.exists() && callbacks.onPasswordsChange) {
        const data = snap.data();
        if (data.data) {
          callbacks.onPasswordsChange(data.data);
        }
      }
    }, (err) => console.warn('Passwords snapshot warning:', err));
    unsubscribes.push(unsubPasswords);

    // 6. Photos
    const unsubPhotos = onSnapshot(doc(db, 'system_state', 'photos'), (snap) => {
      if (snap.exists() && callbacks.onPhotosChange) {
        const data = snap.data();
        if (data.data) {
          callbacks.onPhotosChange(data.data);
        }
      }
    }, (err) => console.warn('Photos snapshot warning:', err));
    unsubscribes.push(unsubPhotos);

    // 7. Church Logo Branding
    const unsubBranding = onSnapshot(doc(db, '_system_settings', 'branding'), (snap) => {
      if (snap.exists() && callbacks.onLogoChange) {
        const data = snap.data();
        if (data.churchLogo) {
          callbacks.onLogoChange(data.churchLogo);
        }
      }
    }, (err) => console.warn('Branding snapshot warning:', err));
    unsubscribes.push(unsubBranding);

    // 8. Official Signatures and Stamp
    const unsubOfficial = onSnapshot(doc(db, 'system_state', 'official_signatures'), (snap) => {
      if (snap.exists() && callbacks.onOfficialConfigChange) {
        const data = snap.data();
        if (data) {
          callbacks.onOfficialConfigChange(data as OfficialSignaturesConfig);
        }
      }
    }, (err) => console.warn('Official config snapshot warning:', err));
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

