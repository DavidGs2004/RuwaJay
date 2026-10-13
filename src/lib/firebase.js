import { getApps, initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

const useEmulators = import.meta.env.DEV && import.meta.env.VITE_FIREBASE_EMULATORS === 'true';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBVUvJOT-bosxZWFOK-EDonUiegZRRCgB8',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'ruwa-jay.firebaseapp.com',
  projectId: useEmulators ? 'demo-ruwajay' : import.meta.env.VITE_FIREBASE_PROJECT_ID || 'ruwa-jay',
  storageBucket: useEmulators ? 'demo-ruwajay.appspot.com' : import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'ruwa-jay.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '716762704483',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:716762704483:web:9b4007d8a37a700d8ca656',
};

export const firebaseWebEnabled = Boolean(firebaseConfig.apiKey);

let app = null;
try {
  app = firebaseWebEnabled
    ? (getApps()[0] || initializeApp(firebaseConfig))
    : null;
} catch (err) {
  console.warn('Firebase init warning:', err);
}

export const firestore = app ? getFirestore(app) : null;
export const storage = app ? getStorage(app) : null;
export const firebaseAuth = app ? getAuth(app) : null;
export const googleProvider = app ? new GoogleAuthProvider() : null;
export const firebaseApp = app;
export const functions = app ? getFunctions(app, 'us-central1') : null;
if (useEmulators && app && !globalThis.__ruwaEmulatorsConnected) {
  connectAuthEmulator(firebaseAuth, 'http://127.0.0.1:9099', { disableWarnings:true });
  connectFirestoreEmulator(firestore, '127.0.0.1', 8085);
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
  connectStorageEmulator(storage, '127.0.0.1', 9199);
  globalThis.__ruwaEmulatorsConnected = true;
}

if (googleProvider) {
  googleProvider.setCustomParameters({
    prompt: 'select_account',
  });
}
