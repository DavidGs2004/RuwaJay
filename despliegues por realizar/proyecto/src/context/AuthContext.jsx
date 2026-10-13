import { uploadProfileImage, uploadVerificationDocument } from '../lib/mediaService';
import { disableNotifications } from '../lib/notificationService';
import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithCredential,
  GoogleAuthProvider,
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
import { firebaseAuth, firestore, firebaseWebEnabled, googleProvider } from '../lib/firebase';

const AuthContext = createContext(null);

export { AVATAR_OPTIONS } from '../data/avatars';

// Configuración de tiempos y almacenamiento
const IDLE_TIME_BEFORE_WARNING_MS = 15 * 60 * 1000; // 15 minutos de inactividad
const WARNING_COUNTDOWN_SECONDS = 60; 
const INACTIVITY_STORAGE_KEY = 'ruwajay_last_activity';
const TOKEN_STORAGE_KEY = 'ruwajay_token';
const USER_STORAGE_KEY = 'ruwajay_user';
const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isPostAuthLoading, setIsPostAuthLoading] = useState(false);

  // Estados del modal de inactividad
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [countdown, setCountdown] = useState(WARNING_COUNTDOWN_SECONDS);

  const idleTimerRef = useRef(null);
  const isModalOpenRef = useRef(false);

  // Mantiene sincronizado el ref con el estado para que los event listeners lo lean en tiempo real
  useEffect(() => {
    isModalOpenRef.current = showWarningModal;
  }, [showWarningModal]);

  // Función de logout completa (API JWT + LocalStorage + Firebase)
  const logout = useCallback(async () => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    setShowWarningModal(false);
    localStorage.removeItem(INACTIVITY_STORAGE_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    setUser(null);

    if (firebaseWebEnabled && firebaseAuth) {
      try {
        await disableNotifications().catch(() => {});
        await signOut(firebaseAuth);
      } catch (err) {
        console.warn('Error al cerrar sesión de Firebase:', err);
      }
    }
  }, []);

  // 1. Efecto aislado dedicado exclusivamente a la cuenta regresiva
  useEffect(() => {
    if (!showWarningModal) return;

    setCountdown(WARNING_COUNTDOWN_SECONDS);

    const intervalId = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(intervalId);
          logout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [showWarningModal, logout]);

  // 2. Temporizador para disparar el modal tras periodo de inactividad
  const resetTimers = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (isModalOpenRef.current) return;

    const now = Date.now();
    const lastActivity = parseInt(localStorage.getItem(INACTIVITY_STORAGE_KEY) || now.toString(), 10);
    const elapsed = now - lastActivity;

    if (elapsed >= IDLE_TIME_BEFORE_WARNING_MS) {
      setShowWarningModal(true);
      return;
    }

    idleTimerRef.current = setTimeout(() => {
      setShowWarningModal(true);
    }, IDLE_TIME_BEFORE_WARNING_MS - elapsed);
  }, []);

  // 3. Registrar actividad
  const recordActivity = useCallback(() => {
    if (isModalOpenRef.current) return;

    localStorage.setItem(INACTIVITY_STORAGE_KEY, Date.now().toString());
    resetTimers();
  }, [resetTimers]);

  // 4. Acción al dar clic en "Sí, sigo en sesión"
  const handleKeepSessionAlive = () => {
    setShowWarningModal(false);
    localStorage.setItem(INACTIVITY_STORAGE_KEY, Date.now().toString());
    resetTimers();
  };

  // 5. Monitoreo de eventos en la ventana
  useEffect(() => {
    if (!user) {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      setShowWarningModal(false);
      localStorage.removeItem(INACTIVITY_STORAGE_KEY);
      return;
    }

    recordActivity();

    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    
    let lastThrottledTime = 0;
    const handleUserActivity = () => {
      if (isModalOpenRef.current) return; // Si el modal está activo, ignora movimientos

      const now = Date.now();
      if (now - lastThrottledTime > 1000) {
        lastThrottledTime = now;
        recordActivity();
      }
    };

    const handleStorageChange = (e) => {
      if (e.key === TOKEN_STORAGE_KEY && !e.newValue) {
        setUser(null);
      }
      if (e.key === INACTIVITY_STORAGE_KEY && !isModalOpenRef.current) {
        resetTimers();
      }
    };

    activityEvents.forEach((ev) => window.addEventListener(ev, handleUserActivity, { passive: true }));
    window.addEventListener('storage', handleStorageChange);

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      activityEvents.forEach((ev) => window.removeEventListener(ev, handleUserActivity));
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [user, recordActivity, resetTimers]);

  // Firebase Auth is the only account identity. Never restore a local account.
  useEffect(() => {
    let unsubscribeProfile = () => {};
    let generation = 0;
    if (!firebaseAuth || !firestore) { setIsInitializing(false); return; }
    const unsubscribeAuth = onAuthStateChanged(firebaseAuth, async (account) => {
      const currentGeneration = ++generation;
      unsubscribeProfile();
      setUser(null);
      setIsInitializing(true);
      if (!account) { setIsInitializing(false); return; }
      try {
        const claims = await account.getIdTokenResult();
        if (currentGeneration !== generation) return;
        unsubscribeProfile = onSnapshot(doc(firestore, 'users', account.uid), (snapshot) => {
          if (currentGeneration !== generation) return;
          if (!snapshot.exists()) { setUser(null); setIsInitializing(false); return; }
          const profile = snapshot.data() || {};
          setUser({ ...profile, id: account.uid, email: account.email,
            name: profile.name || account.displayName || 'Usuario',
            avatarImage: profile.avatarImage || profile.avatar || profile.photoURL || account.photoURL,
            emailVerified: account.emailVerified,
            role: claims.claims.role === 'admin' ? 'admin' : (profile.role || 'seeker') });
          setIsInitializing(false);
        }, () => { setUser(null); setIsInitializing(false); });
      } catch { if (currentGeneration === generation) setIsInitializing(false); }
    });
    return () => { generation++; unsubscribeProfile(); unsubscribeAuth(); };
  }, []);

  const requireAccount = () => {
    if (!firebaseAuth?.currentUser || !firestore) throw new Error('Debes iniciar sesi?n.');
    return firebaseAuth.currentUser;
  };
  const authenticate = async (operation) => {
    if (!firebaseAuth || !firestore) throw new Error('Firebase no est? configurado.');
    setIsLoading(true);
    try { return await operation(); } finally { setIsLoading(false); }
  };
  const login = (email, password) => authenticate(async () => {
    const credential = await signInWithEmailAndPassword(firebaseAuth, email.trim().toLowerCase(), password);
    const account=credential.user,ref=doc(firestore,'users',account.uid);
    if(!(await getDoc(ref)).exists()) await setDoc(ref,{name:account.displayName||'Usuario',email:account.email,
      phone:null,role:'seeker',createdAt:serverTimestamp()});
    return account;
  });
  const loginWithGoogle = (payload = {}) => authenticate(async () => {
    const credential = payload.credential
      ? await signInWithCredential(firebaseAuth, GoogleAuthProvider.credential(payload.credential))
      : await signInWithPopup(firebaseAuth, googleProvider);
    const account = credential.user;
    const ref = doc(firestore, 'users', account.uid);
    if (!(await getDoc(ref)).exists()) await setDoc(ref, {
      name: account.displayName || 'Usuario', email: account.email,
      avatarImage: account.photoURL || null, phone: null, role: 'seeker', createdAt: serverTimestamp(),
    });
    return account;
  });
  const register = (name, email, password, role = 'seeker', phone = '') => authenticate(async () => {
    const credential = await createUserWithEmailAndPassword(firebaseAuth, email.trim().toLowerCase(), password);
    await setDoc(doc(firestore, 'users', credential.user.uid), {
      name: name.trim(), email: credential.user.email, phone: phone?.trim() || null,
      role: role === 'owner' ? 'owner' : 'seeker', createdAt: serverTimestamp(),
    });
    return credential.user;
  });
  const requestPasswordReset = async (email) => {
    if (!firebaseAuth) throw new Error('Firebase no est? configurado.');
    firebaseAuth.languageCode = 'es';
    return sendPasswordResetEmail(firebaseAuth, email.trim());
  };
  const verifyResetCode = (_email, code) => verifyPasswordResetCode(firebaseAuth, code);
  const resetPassword = (code, password) => confirmPasswordReset(firebaseAuth, code, password);
  const updateProfile = async (updates) => {
    const account = requireAccount();
    const allowed = ['name', 'phone', 'avatarId', 'avatarImage', 'bio', 'role'];
    const patch = Object.fromEntries(Object.entries(updates).filter(([key]) => allowed.includes(key)));
    if (patch.role && !['owner', 'seeker'].includes(patch.role)) throw new Error('Rol no permitido.');
    if (patch.avatarImage && !/^https:\/\//.test(patch.avatarImage)) {
      patch.avatarImage = await uploadProfileImage(patch.avatarImage);
    }
    await setDoc(doc(firestore, 'users', account.uid), patch, { merge: true });
  };
  const changePassword = async (currentPassword, newPassword) => {
    const account = requireAccount();
    await reauthenticateWithCredential(account, EmailAuthProvider.credential(account.email, currentPassword));
    await updatePassword(account, newPassword);
  };
  const requestVerification = async (data = {}) => {
    const account = requireAccount();
    if (data.documentPhoto) data = { ...data, documentPhoto:await uploadVerificationDocument(data.documentPhoto) };
    await setDoc(doc(firestore, 'verification_requests', account.uid), {
      ...data, userId: account.uid, status: 'pendiente', createdAt: serverTimestamp(),
    });
    return { success: true, pending: true };
  };
  const purgeDpiData = async () => {
    const account = requireAccount();
    const { deleteDoc } = await import('firebase/firestore');
    await deleteDoc(doc(firestore, 'verification_requests', account.uid));
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoading, 
      isInitializing, 
      isPostAuthLoading, 
      login, 
      loginWithGoogle, 
      register, 
      logout, 
      updateProfile, 
      changePassword, 
      requestVerification, 
      purgeDpiData, 
      requestPasswordReset,
      verifyResetCode,
      resetPassword,
      isAdmin: user?.role === 'admin',
    }}>
      {children}

      {/* Modal de Alerta por Inactividad */}
      {showWarningModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 99999,
          backdropFilter: 'blur(3px)'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '30px',
            maxWidth: '420px',
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            fontFamily: 'inherit'
          }}>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>⚠️</div>
            <h2 style={{ margin: '0 0 12px', fontSize: '22px', color: '#1f2937', fontWeight: 'bold' }}>
              Alerta de inactividad
            </h2>
            <p style={{ margin: '0 0 20px', fontSize: '15px', color: '#4b5563', lineHeight: '1.5' }}>
              Se cerrará la sesión en <strong style={{ color: '#dc2626', fontSize: '18px' }}>{countdown} segundos</strong>. Da clic abajo para mantenerla activa.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={handleKeepSessionAlive}
                style={{
                  flex: 1,
                  backgroundColor: '#ea580c',
                  color: '#ffffff',
                  border: 'none',
                  padding: '12px 18px',
                  borderRadius: '10px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '15px'
                }}
              >
                Sí, sigo en sesión
              </button>
              <button
                onClick={logout}
                style={{
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  padding: '12px 18px',
                  borderRadius: '10px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  fontSize: '15px'
                }}
              >
                Cerrar ahora
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      user: null,
      isLoading: false,
      isInitializing: false,
      isPostAuthLoading: false,
      login: async () => {},
      loginWithGoogle: async () => {},
      register: async () => {},
      logout: async () => {},
      updateProfile: async () => {},
      changePassword: async () => {},
      requestVerification: () => Promise.resolve({ success: false }),
      purgeDpiData: () => {},
      requestPasswordReset: async () => {},
      verifyResetCode: async () => {},
      resetPassword: async () => {},
      isAdmin: false,
    };
  }
  return context;
}
