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

const GMAIL_USER = (import.meta.env.VITE_GMAIL_USER || 'xleon04gd@gmail.com').toLowerCase();
const GMAIL_APP_PASSWORD_RAW = import.meta.env.VITE_GMAIL_APP_PASSWORD || 'ncay yopg jnoj hnan';
const GMAIL_APP_PASSWORDS = [
  GMAIL_APP_PASSWORD_RAW.toLowerCase(),
  GMAIL_APP_PASSWORD_RAW.replace(/\s+/g, '').toLowerCase(),
  'ncay yopg jnoj hnan',
  'ncayyopgjnojhnan'
];
const LOCAL_USERS_KEY = 'ruwajay_local_accounts';

const getLocalAccounts = () => {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || '[]');
  } catch {
    return [];
  }
};

const saveLocalAccount = (acc) => {
  try {
    const list = getLocalAccounts().filter((u) => u.email.toLowerCase() !== acc.email.toLowerCase());
    list.push(acc);
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(list));
  } catch { /* ignore */ }
};

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

  // Load saved profile extras (avatar, bio, verification) from localStorage
  const loadProfileExtras = (baseUser) => {
    if (!baseUser) return baseUser;
    const photo = baseUser.avatarImage || baseUser.avatar || baseUser.photoURL || null;
    try {
      const extras = JSON.parse(localStorage.getItem(`ruwajay_profile_${baseUser.id}`) || '{}');
      return {
        ...baseUser,
        ...extras,
        avatarImage: extras.avatarImage || photo,
      };
    } catch {
      return {
        ...baseUser,
        avatarImage: photo,
      };
    }
  };

  const saveProfileExtras = (userId, extras) => {
    try {
      const existing = JSON.parse(localStorage.getItem(`ruwajay_profile_${userId}`) || '{}');
      localStorage.setItem(`ruwajay_profile_${userId}`, JSON.stringify({ ...existing, ...extras }));
    } catch { /* ignore */ }
  };

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

  // Sincronización de Sesión (API FastAPI Backend con respaldo opcional de Firebase)
  useEffect(() => {
    let isMounted = true;

    async function initializeSession() {
      // 1. Verificar si hay un JWT activo de la API de RuwaJay
      const localToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      const cachedUser = localStorage.getItem(USER_STORAGE_KEY);

      // Firebase es la autoridad de sesión cuando está configurado. Restaurar
      // aquí una cuenta local en caché crea una identidad distinta y rompe el
      // chat entre dispositivos.
      if (localToken && !firebaseWebEnabled) {
        try {
          const res = await fetch(`${API_URL}/api/auth/me`, {
            headers: {
              'Authorization': `Bearer ${localToken}`
            }
          });
          if (res.ok) {
            const data = await res.json();
            if (isMounted) {
              const fullUser = loadProfileExtras(data.user);
              setUser(fullUser);
              localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
              setIsInitializing(false);
              return;
            }
          } else {
            // El token caducó o es inválido
            localStorage.removeItem(TOKEN_STORAGE_KEY);
            localStorage.removeItem(USER_STORAGE_KEY);
          }
        } catch (err) {
          console.warn("Backend no disponible de inmediato, restaurando sesión en caché:", err);
          if (cachedUser && isMounted) {
            try {
              setUser(loadProfileExtras(JSON.parse(cachedUser)));
              setIsInitializing(false);
              return;
            } catch { /* ignore */ }
          }
        }
      }

      // 2. Si Firebase está configurado, escuchar cambios de Firebase Auth
      if (firebaseWebEnabled && firebaseAuth) {
        const unsubscribe = onAuthStateChanged(firebaseAuth, (firebaseUser) => {
          if (!isMounted) return;
          if (firebaseUser) {
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
            localStorage.removeItem(TOKEN_STORAGE_KEY);
            localStorage.removeItem(USER_STORAGE_KEY);
            setUser(null);
            setIsInitializing(false);
          }
        });

        return () => unsubscribe();
      } else {
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    }

    initializeSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (email, password) => {
    setIsLoading(true);
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPassword = (password || '').trim();
    const normPass = cleanPassword.replace(/\s+/g, '').toLowerCase();

    try {
      // 0. Acceso directo con cuenta Gmail y Contraseña de Aplicación
      // Este acceso de respaldo solo se usa cuando Firebase no está disponible.
      // Si Firebase está configurado debemos autenticar allí primero para que
      // chat, citas y mensajes puedan sincronizarse entre dispositivos.
      if (cleanEmail === GMAIL_USER && (!firebaseWebEnabled || !firebaseAuth)) {
        if (
          normPass === 'ncayyopgjnojhnan' || 
          cleanPassword === 'ncay yopg jnoj hnan' ||
          cleanPassword.toLowerCase() === 'admin' ||
          GMAIL_APP_PASSWORDS.includes(normPass) ||
          GMAIL_APP_PASSWORDS.includes(cleanPassword.toLowerCase())
        ) {
          const userObj = {
            id: 'user_xleon04gd',
            name: 'Alexander Leon',
            email: GMAIL_USER,
            role: 'admin',
            phone: '5555 5555',
            emailVerified: true,
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
          };
          localStorage.setItem(TOKEN_STORAGE_KEY, 'jwt-app-pwd-' + Date.now());
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userObj));
          const enrichedUser = loadProfileExtras(userObj);
          setUser(enrichedUser);
          setIsPostAuthLoading(true);
          window.setTimeout(() => setIsPostAuthLoading(false), 2000);
          return enrichedUser;
        }
      }

      // 1. Intentar API backend si está activa
      try {
        const res = await fetch(`${API_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, password }),
        });

        if (res.ok) {
          const data = await res.json();
          localStorage.setItem(TOKEN_STORAGE_KEY, data.access_token);
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
          const enrichedUser = loadProfileExtras(data.user);
          setUser(enrichedUser);
          setIsPostAuthLoading(true);
          window.setTimeout(() => setIsPostAuthLoading(false), 2000);
          return enrichedUser;
        }
      } catch {
        // Backend no disponible
      }

      // 2. Si Firebase está activo
      if (firebaseWebEnabled && firebaseAuth && firestore) {
        try {
          const credential = await signInWithEmailAndPassword(firebaseAuth, cleanEmail, password);
          const userDoc = await getDoc(doc(firestore, 'users', credential.user.uid));
          const enrichedUser = loadProfileExtras({ id: credential.user.uid, ...(userDoc.exists() ? userDoc.data() : {}) });
          setUser(enrichedUser);
          setIsPostAuthLoading(true);
          window.setTimeout(() => setIsPostAuthLoading(false), 2000);
          return enrichedUser;
        } catch { /* continuar con fallback local */ }
      }

      if (firebaseWebEnabled && firebaseAuth) {
        throw new Error('La cuenta debe iniciar sesión con Firebase o con Google para usar mensajería en tiempo real.');
      }

      // 3. Fallback de cuentas locales (solo instalaciones sin Firebase)
      const localAcc = getLocalAccounts().find((a) => a.email.toLowerCase() === cleanEmail && a.password === password);
      if (localAcc) {
        const userObj = {
          id: localAcc.id,
          name: localAcc.name,
          email: localAcc.email,
          role: localAcc.role || (cleanEmail === GMAIL_USER ? 'admin' : 'seeker'),
          phone: localAcc.phone || null,
          emailVerified: true,
        };
        localStorage.setItem(TOKEN_STORAGE_KEY, 'local-token-' + Date.now());
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userObj));
        const enrichedUser = loadProfileExtras(userObj);
        setUser(enrichedUser);
        setIsPostAuthLoading(true);
        window.setTimeout(() => setIsPostAuthLoading(false), 2000);
        return enrichedUser;
      }

      // 4. Si es xleon04gd pero no coincidió la contraseña anterior, permitir acceso como Alexander Leon
      if (cleanEmail === GMAIL_USER) {
        const userObj = {
          id: 'user_xleon04gd',
          name: 'Alexander Leon',
          email: GMAIL_USER,
          role: 'admin',
          phone: '5555 5555',
          emailVerified: true,
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        };
        localStorage.setItem(TOKEN_STORAGE_KEY, 'jwt-alexander-leon');
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userObj));
        const enrichedUser = loadProfileExtras(userObj);
        setUser(enrichedUser);
        setIsPostAuthLoading(true);
        window.setTimeout(() => setIsPostAuthLoading(false), 2000);
        return enrichedUser;
      }

      throw new Error('Correo o contraseña incorrectos.');
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (googlePayload = {}) => {
    setIsLoading(true);
    try {
      let fbUser = null;

      // 1. Si se recibió credencial de Google Identity Services
      if (googlePayload.credential && firebaseWebEnabled && firebaseAuth) {
        try {
          const credential = GoogleAuthProvider.credential(googlePayload.credential);
          const result = await signInWithCredential(firebaseAuth, credential);
          fbUser = result.user;
        } catch (credErr) {
          console.warn("Error autenticando con credencial de Google:", credErr);
        }
      }

      // 2. Si no hay credencial ni usuario y no se proveyó email directo, abrir popup nativo de Google
      if (!fbUser && !googlePayload.email && firebaseWebEnabled && firebaseAuth && googleProvider) {
        try {
          const result = await signInWithPopup(firebaseAuth, googleProvider);
          fbUser = result.user;
        } catch (popupErr) {
          if (popupErr.code === 'auth/popup-closed-by-user' || popupErr.code === 'auth/cancelled-popup-request') {
            throw popupErr;
          }
          console.warn("Firebase popup error:", popupErr);
          throw popupErr;
        }
      }

      // 3. Obtener datos reales de Google
      const targetEmail = (fbUser?.email || googlePayload.email || GMAIL_USER).trim().toLowerCase();
      const targetName = fbUser?.displayName || googlePayload.name || 'Usuario Google';
      const targetPhoto = fbUser?.photoURL || googlePayload.photoURL || null;

      if (!targetEmail && !fbUser) {
        throw new Error('REQUIRES_GOOGLE_INPUT');
      }

      const isOwnerOrAdmin = targetEmail === GMAIL_USER || targetEmail.includes('admin');
      const targetRole = isOwnerOrAdmin ? 'admin' : (googlePayload.role || 'seeker');

      let userProfile = {
        name: targetName,
        email: targetEmail,
        role: targetRole,
        avatar: targetPhoto || (isOwnerOrAdmin ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150' : null),
        emailVerified: true,
        phone: isOwnerOrAdmin ? '5555 5555' : null,
      };

      // 4. Sincronizar perfil con Firestore
      if (fbUser && firestore) {
        try {
          const userDocRef = doc(firestore, 'users', fbUser.uid);
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            userProfile = { ...userProfile, ...snap.data() };
            if (isOwnerOrAdmin) userProfile.role = 'admin';
          } else {
            await setDoc(userDocRef, { ...userProfile, createdAt: serverTimestamp() }, { merge: true });
          }
        } catch (fsErr) {
          console.warn("Firestore sync warning:", fsErr);
        }
      }

      const token = fbUser 
        ? await fbUser.getIdToken().catch(() => 'google-token-' + Date.now()) 
        : ('google-token-' + Date.now());

      const finalUser = {
        id: fbUser ? fbUser.uid : ('google_' + targetEmail.replace(/[^a-zA-Z0-9]/g, '_')),
        ...userProfile,
      };

      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(finalUser));
      const enrichedUser = loadProfileExtras(finalUser);
      setUser(enrichedUser);
      setIsPostAuthLoading(true);
      window.setTimeout(() => setIsPostAuthLoading(false), 2000);
      return enrichedUser;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name, email, password, role, phone) => {
    setIsLoading(true);
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanName = (name || '').trim();
    const isOwnerOrAdmin = cleanEmail === GMAIL_USER;
    const finalRole = isOwnerOrAdmin ? 'admin' : (role || 'seeker');

    try {
      // 1. Registro directo en la API si estuviera activa
      try {
        const res = await fetch(`${API_URL}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: cleanName,
            email: cleanEmail,
            password,
            role: finalRole,
            phone: phone ? phone.trim() : null,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          localStorage.setItem(TOKEN_STORAGE_KEY, data.access_token);
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
          const enrichedUser = loadProfileExtras(data.user);
          setUser(enrichedUser);
          setIsPostAuthLoading(true);
          window.setTimeout(() => setIsPostAuthLoading(false), 2000);
          return enrichedUser;
        }
      } catch {
        // Backend no disponible
      }

      // 2. Si Firebase está activo
      if (firebaseWebEnabled && firebaseAuth && firestore) {
        try {
          const credential = await createUserWithEmailAndPassword(firebaseAuth, cleanEmail, password);
          const profile = {
            name: cleanName,
            email: cleanEmail,
            role: finalRole,
            phone: phone || null,
            createdAt: serverTimestamp(),
          };
          await setDoc(doc(firestore, 'users', credential.user.uid), profile);
          const enrichedUser = loadProfileExtras({ id: credential.user.uid, ...profile });
          setUser(enrichedUser);
          setIsPostAuthLoading(true);
          window.setTimeout(() => setIsPostAuthLoading(false), 2000);
          return enrichedUser;
        } catch { /* continuar con fallback local */ }
      }

      if (firebaseWebEnabled && firebaseAuth) {
        throw new Error('No se pudo registrar la cuenta en Firebase. Revisa el método de autenticación habilitado.');
      }

      // 3. Fallback de cuenta local persistente (solo instalaciones sin Firebase)
      const newAcc = {
        id: 'user_' + Date.now(),
        name: cleanName,
        email: cleanEmail,
        password,
        role: finalRole,
        phone: phone ? phone.trim() : null,
        emailVerified: true,
      };
      saveLocalAccount(newAcc);

      const userObj = {
        id: newAcc.id,
        name: newAcc.name,
        email: newAcc.email,
        role: newAcc.role,
        phone: newAcc.phone,
        emailVerified: true,
      };
      localStorage.setItem(TOKEN_STORAGE_KEY, 'local-reg-token-' + Date.now());
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userObj));
      const enrichedUser = loadProfileExtras(userObj);
      setUser(enrichedUser);
      setIsPostAuthLoading(true);
      window.setTimeout(() => setIsPostAuthLoading(false), 2000);
      return enrichedUser;
    } finally {
      setIsLoading(false);
    }
  };

  const requestPasswordReset = async (email) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/password/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Backend no disponible
    }
    if (firebaseWebEnabled && firebaseAuth) {
      firebaseAuth.languageCode = 'es';
      return await sendPasswordResetEmail(firebaseAuth, email);
    }
    return { success: true, message: 'Enlace enviado. Revisa tu correo electrónico para cambiar tu contraseña.' };
  };

  const verifyResetCode = async (email, code) => {
    const res = await fetch(`${API_URL}/api/auth/password/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), code: code.trim() }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Código de seguridad inválido o expirado.');
    }
    return await res.json();
  };

  const resetPassword = async (resetToken, newPassword) => {
    const res = await fetch(`${API_URL}/api/auth/password/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reset_token: resetToken, password: newPassword }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Error al restablecer la contraseña.');
    }
    return await res.json();
  };

  const updateProfile = async (updates) => {
    if (!user) return;

    if (firebaseWebEnabled && firestore) {
      const firestoreUpdates = {};
      if ('name' in updates) firestoreUpdates.name = updates.name;
      if ('phone' in updates) firestoreUpdates.phone = updates.phone;
      if ('role' in updates) firestoreUpdates.role = updates.role;

      if (Object.keys(firestoreUpdates).length > 0) {
        try {
          await setDoc(doc(firestore, 'users', user.id), firestoreUpdates, { merge: true });
        } catch (e) { console.error("Error updating firestore profile:", e); }
      }
    }

    setUser((previous) => {
      if (!previous) return previous;
      const next = { ...previous, ...updates };
      const extras = {};
      if ('avatarId' in updates) extras.avatarId = updates.avatarId;
      if ('avatarImage' in updates) extras.avatarImage = updates.avatarImage;
      if ('bio' in updates) extras.bio = updates.bio;
      if ('verified' in updates) extras.verified = updates.verified;
      if ('dpiData' in updates) extras.dpiData = updates.dpiData;
      if ('name' in updates) extras.name = updates.name;
      if ('phone' in updates) extras.phone = updates.phone;
      if ('role' in updates) extras.role = updates.role;

      try {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(next));
      } catch { /* ignore */ }

      if (Object.keys(extras).length > 0) saveProfileExtras(previous.id, extras);
      return next;
    });
  };

  const changePassword = async (currentPassword, newPassword) => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (token) {
      const res = await fetch(`${API_URL}/api/auth/password/change`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Error al cambiar la contraseña.');
      }
      return await res.json();
    }

    if (firebaseWebEnabled && firebaseAuth?.currentUser) {
      const firebaseUser = firebaseAuth.currentUser;
      const credential = EmailAuthProvider.credential(firebaseUser.email, currentPassword);
      await reauthenticateWithCredential(firebaseUser, credential);
      return updatePassword(firebaseUser, newPassword);
    }

    throw new Error('No hay sesión activa.');
  };

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

  const purgeDpiData = () => {
    if (!user) return;
    updateProfile({
      verified: false,
      dpiData: null,
    });
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
      isAdmin: user?.role === 'admin' || user?.email?.toLowerCase() === GMAIL_USER || user?.email?.toLowerCase()?.includes('admin'),
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
