import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Build a robust config object with fallback to VITE_ env variables for easy deployment on Netlify / Vercel
const finalConfig = {
  apiKey: firebaseConfig?.apiKey || import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: firebaseConfig?.authDomain || import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: firebaseConfig?.projectId || import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: firebaseConfig?.storageBucket || import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: firebaseConfig?.messagingSenderId || import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: firebaseConfig?.appId || import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: firebaseConfig?.measurementId || import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  firestoreDatabaseId: firebaseConfig?.firestoreDatabaseId || import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || '(default)'
};

let app: any;
let db: any;
let auth: any;

try {
  if (!finalConfig.apiKey) {
    console.warn('⚠️ Firebase Config warning: apiKey is not defined. Please check your firebase-applet-config.json or setup VITE_FIREBASE_ env variables.');
  }
  app = initializeApp(finalConfig);
  db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
  }, finalConfig.firestoreDatabaseId);
  auth = getAuth(app);
} catch (error) {
  console.error('❌ Failed to initialize Firebase SDK safely. To prevent a blank white screen, using fallback mock definitions. Real Error:', error);
  // Provide safe fallback objects so module loading does not crash the entire website
  app = {} as any;
  db = {} as any;
  auth = {
    currentUser: null,
    onAuthStateChanged: () => () => {},
    signOut: async () => {}
  } as any;
}

export { db, auth };

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
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
