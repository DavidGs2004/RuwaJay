import { getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'ruwa-jay.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'ruwa-jay',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'ruwa-jay.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '716762704483',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

export const firebaseWebEnabled = Boolean(firebaseConfig.apiKey && firebaseConfig.appId);

const app = firebaseWebEnabled
  ? (getApps()[0] || initializeApp(firebaseConfig))
  : null;

export const firestore = app ? getFirestore(app) : null;
export const storage = app ? getStorage(app) : null;
export const firebaseAuth = app ? getAuth(app) : null;
