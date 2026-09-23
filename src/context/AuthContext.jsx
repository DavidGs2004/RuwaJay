import { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  verifyPasswordResetCode,
  confirmPasswordReset
} from 'firebase/auth';
import { doc, getDoc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { firebaseAuth, firestore, firebaseWebEnabled } from '../lib/firebase';

const AuthContext = createContext(null);

export { AVATAR_OPTIONS } from '../data/avatars';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isPostAuthLoading, setIsPostAuthLoading] = useState(false);

  // Load saved profile extras (avatar, bio, verification) from localStorage
  const loadProfileExtras = (baseUser) => {
    if (!baseUser) return baseUser;
    try {
      const extras = JSON.parse(localStorage.getItem(`ruwajay_profile_${baseUser.id}`) || '{}');
      return { ...baseUser, ...extras };
    } catch { return baseUser; }
  };

  const saveProfileExtras = (userId, extras) => {
    try {
      const existing = JSON.parse(localStorage.getItem(`ruwajay_profile_${userId}`) || '{}');
      localStorage.setItem(`ruwajay_profile_${userId}`, JSON.stringify({ ...existing, ...extras }));
    } catch { /* ignore */ }
  };

  useEffect(() => {
    if (!firebaseWebEnabled || !firebaseAuth) {
      setIsInitializing(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(firebaseAuth, (firebaseUser) => {
      if (firebaseUser) {
        // Real-time listener for the user document
        const userDocRef = doc(firestore, 'users', firebaseUser.uid);
        const unsubDoc = onSnapshot(userDocRef, (snapshot) => {
          if (snapshot.exists()) {
            setUser(loadProfileExtras({ id: firebaseUser.uid, ...snapshot.data() }));
          } else {
            setUser(loadProfileExtras({ id: firebaseUser.uid, email: firebaseUser.email, name: firebaseUser.displayName || 'Usuario' }));
          }
          setIsInitializing(false);
        }, (error) => {
          console.error("Error listening to profile updates:", error);
          setIsInitializing(false);
        });

        return () => unsubDoc();
      } else {
        setUser(null);
        setIsInitializing(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    if (!firebaseWebEnabled || !firebaseAuth || !firestore) {
      throw new Error('Firebase Web no está configurado. Revisa las variables VITE_FIREBASE_API_KEY y VITE_FIREBASE_APP_ID.');
    }

    setIsLoading(true);
    try {
      const credential = await signInWithEmailAndPassword(firebaseAuth, email, password);
      const userDoc = await getDoc(doc(firestore, 'users', credential.user.uid));
      const enrichedUser = loadProfileExtras({ id: credential.user.uid, ...(userDoc.exists() ? userDoc.data() : {}) });
      setUser(enrichedUser);
      setIsPostAuthLoading(true);
      window.setTimeout(() => setIsPostAuthLoading(false), 3000);
      return enrichedUser;
    } finally { setIsLoading(false); }
  };

  const register = async (name, email, password, role, phone) => {
    setIsLoading(true);
    try {
      const credential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
      const profile = {
        name: name.trim(),
        email: email.trim(),
        role: role || 'seeker',
        phone: phone || null,
        createdAt: serverTimestamp(),
      };

      await setDoc(doc(firestore, 'users', credential.user.uid), profile);

      const enrichedUser = loadProfileExtras({ id: credential.user.uid, ...profile });
      setUser(enrichedUser);
      setIsPostAuthLoading(true);
      window.setTimeout(() => setIsPostAuthLoading(false), 3000);
      return enrichedUser;
    } finally { setIsLoading(false); }
  };

  const logout = () => signOut(firebaseAuth);

  const requestPasswordReset = (email) => {
    if (!firebaseWebEnabled || !firebaseAuth) {
      throw new Error('Firebase Web no está configurado.');
    }
    return sendPasswordResetEmail(firebaseAuth, email);
  };

  /** Update profile fields (name, phone, bio, avatarId, avatarImage, dpiData, verified) and persist extras locally */
  const updateProfile = async (updates) => {
    if (!user) return;

    // Update Firestore if needed (e.g., name, phone)
    const firestoreUpdates = {};
    if ('name' in updates) firestoreUpdates.name = updates.name;
    if ('phone' in updates) firestoreUpdates.phone = updates.phone;

    if (Object.keys(firestoreUpdates).length > 0) {
      try {
        await setDoc(doc(firestore, 'users', user.id), firestoreUpdates, { merge: true });
      } catch (e) { console.error("Error updating firestore profile:", e); }
    }

    setUser((previous) => {
      if (!previous) return previous;
      const next = { ...previous, ...updates };
      // Persist profile-specific extras to localStorage keyed by user ID
      const extras = {};
      if ('avatarId' in updates) extras.avatarId = updates.avatarId;
      if ('avatarImage' in updates) extras.avatarImage = updates.avatarImage;
      if ('bio' in updates) extras.bio = updates.bio;
      if ('verified' in updates) extras.verified = updates.verified;
      if ('dpiData' in updates) extras.dpiData = updates.dpiData;
      if ('name' in updates) extras.name = updates.name;
      if ('phone' in updates) extras.phone = updates.phone;
      if (Object.keys(extras).length > 0) saveProfileExtras(previous.id, extras);
      return next;
    });
  };

  /** Change password (validates current password → sets new password via Firebase) */
  const changePassword = async (currentPassword, newPassword) => {
    const firebaseUser = firebaseAuth.currentUser;
    if (!firebaseUser) throw new Error('No hay sesión activa.');

    const credential = EmailAuthProvider.credential(firebaseUser.email, currentPassword);
    await reauthenticateWithCredential(firebaseUser, credential);
    return updatePassword(firebaseUser, newPassword);
  };

  /** Request identity verification (DPI badge + verification data) */
  const requestVerification = (dpiData = {}) => {
    const verifiedData = {
      ...dpiData,
      verifiedAt: new Date().toLocaleDateString('es-GT', { year: 'numeric', month: 'long', day: 'numeric' }),
    };
    updateProfile({
      verified: true,
      dpiData: verifiedData,
    });
    return Promise.resolve({ success: true, dpiData: verifiedData });
  };

  /** Safely revoke and purge sensitive DPI identification data */
  const purgeDpiData = () => {
    if (!user) return;
    updateProfile({
      verified: false,
      dpiData: null,
    });
  };

  return <AuthContext.Provider value={{ user, isLoading, isInitializing, isPostAuthLoading, login, register, logout, updateProfile, changePassword, requestVerification, purgeDpiData, requestPasswordReset }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
}

