import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseAppletConfig from '../firebase-applet-config.json';

export const firebaseConfig = firebaseAppletConfig;

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId || undefined);
export const auth = getAuth(app);
export default app;
