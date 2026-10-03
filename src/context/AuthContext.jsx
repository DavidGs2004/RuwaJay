import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
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
      // 1. Verificar si hay un JWT activo de la API de RuwaJay o sesión local
      const localToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      const cachedUser = localStorage.getItem(USER_STORAGE_KEY);

      if (localToken) {
        if (localToken.startsWith('local_')) {
          if (cachedUser && isMounted) {
            try {
              setUser(loadProfileExtras(JSON.parse(cachedUser)));
              setIsInitializing(false);
              return;
            } catch { /* ignore */ }
          }
        }

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
          } else if (res.status === 401) {
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
            if (firestore) {
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
              setUser(loadProfileExtras({ id: firebaseUser.uid, email: firebaseUser.email, name: firebaseUser.displayName || 'Usuario' }));
              setIsInitializing(false);
            }
          } else {
            if (!localStorage.getItem(TOKEN_STORAGE_KEY)) {
              setUser(null);
            }
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
    try {
      let apiFailed = false;
      let errDetail = 'Correo o contraseña incorrectos.';

      // 1. Conexión directa a la API de RuwaJay (SQLite local, si está activa)
      try {
        const res = await fetch(`${API_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), password }),
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

        const errData = await res.json().catch(() => ({}));
        if (errData.detail) errDetail = errData.detail;
        if (res.status === 400 || res.status === 401) {
          // Si el backend respondió que las credenciales no son válidas
          throw new Error(errDetail);
        }
      } catch (netErr) {
        if (netErr.message === errDetail) {
          throw netErr;
        }
        apiFailed = true;
        console.warn("Backend API no disponible en", API_URL, "- probando Firebase/respaldo local:", netErr.message);
      }

      // 2. Si Firebase está activo, intentar Firebase como respaldo
      if (firebaseWebEnabled && firebaseAuth) {
        try {
          const credential = await signInWithEmailAndPassword(firebaseAuth, email, password);
          let profileData = { id: credential.user.uid, email: credential.user.email, name: credential.user.displayName || email.split('@')[0] };
          if (firestore) {
            try {
              const userDoc = await getDoc(doc(firestore, 'users', credential.user.uid));
              if (userDoc.exists()) {
                profileData = { ...profileData, ...userDoc.data() };
              }
            } catch { /* continuar con profileData */ }
          }
          const enrichedUser = loadProfileExtras(profileData);
          localStorage.setItem(TOKEN_STORAGE_KEY, `local_fb_${credential.user.uid}`);
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(profileData));
          setUser(enrichedUser);
          setIsPostAuthLoading(true);
          window.setTimeout(() => setIsPostAuthLoading(false), 2000);
          return enrichedUser;
        } catch { /* continuar con el flujo */ }
      }

      // 3. Fallback: Si el backend estaba offline y hay sesión previa en caché local
      if (apiFailed) {
        const cached = localStorage.getItem(USER_STORAGE_KEY);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed.email && parsed.email.toLowerCase() === email.trim().toLowerCase()) {
              const enrichedUser = loadProfileExtras(parsed);
              setUser(enrichedUser);
              setIsPostAuthLoading(true);
              window.setTimeout(() => setIsPostAuthLoading(false), 2000);
              return enrichedUser;
            }
          } catch { /* ignore */ }
        }
      }

      throw new Error(errDetail);
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (googlePayload = {}) => {
    setIsLoading(true);
    try {
      let payload = {
        credential: googlePayload.credential || null,
        email: googlePayload.email || null,
        name: googlePayload.name || null,
        photoURL: googlePayload.photoURL || null,
        role: googlePayload.role || 'seeker',
      };

      // Si Firebase está disponible y no se proveyó credencial ni email directo, intentar popup de Firebase
      if (!payload.credential && !payload.email && firebaseWebEnabled && firebaseAuth && googleProvider) {
        try {
          const result = await signInWithPopup(firebaseAuth, googleProvider);
          const fbUser = result.user;
          payload = {
            email: fbUser.email,
            name: fbUser.displayName || 'Usuario Google',
            photoURL: fbUser.photoURL || null,
            role: googlePayload.role || 'seeker',
          };
        } catch (popupErr) {
          if (popupErr.code === 'auth/popup-closed-by-user') {
            throw popupErr;
          }
          console.warn("Firebase popup no disponible, procediendo con selector/API:", popupErr);
        }
      }

      // Si no hay datos de usuario de Google aún, señalar que se requiere entrada
      if (!payload.credential && !payload.email) {
        throw new Error('REQUIRES_GOOGLE_INPUT');
      }

      // Sincronización con el endpoint /api/auth/google de la API de RuwaJay (si está disponible)
      let syncedData = null;
      try {
        const res = await fetch(`${API_URL}/api/auth/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          syncedData = await res.json();
        }
      } catch (networkErr) {
        console.warn("Backend API offline en", API_URL, "- continuando con autenticación Firebase/local:", networkErr.message);
      }

      const token = syncedData?.access_token || `local_google_${Date.now()}`;
      const baseUserData = syncedData?.user || {
        id: payload.email.replace(/[^a-zA-Z0-9]/g, '_'),
        name: payload.name || payload.email.split('@')[0],
        email: payload.email,
        role: payload.role || 'seeker',
        avatar: payload.photoURL || null,
      };

      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(baseUserData));

      const photoUrl = baseUserData?.avatar || payload.photoURL || null;

      const enrichedUser = loadProfileExtras({
        ...baseUserData,
        avatarImage: photoUrl,
      });

      if (photoUrl && enrichedUser?.id) {
        saveProfileExtras(enrichedUser.id, { avatarImage: photoUrl });
      }

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
    try {
      let apiFailed = false;
      let errDetail = 'Error al crear la cuenta.';

      // 1. Registro directo en la API de RuwaJay (SQLite, si está disponible)
      try {
        const res = await fetch(`${API_URL}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            password,
            role: role || 'seeker',
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

        const errData = await res.json().catch(() => ({}));
        if (errData.detail) errDetail = errData.detail;
        if (res.status === 400) {
          throw new Error(errDetail);
        }
      } catch (netErr) {
        if (netErr.message === errDetail) {
          throw netErr;
        }
        apiFailed = true;
        console.warn("Backend API offline para registro:", netErr.message);
      }

      // 2. Si Firebase está activo, registrar también en Firebase
      if (firebaseWebEnabled && firebaseAuth) {
        try {
          const credential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
          const profile = {
            id: credential.user.uid,
            name: name.trim(),
            email: email.trim(),
            role: role || 'seeker',
            phone: phone || null,
          };
          if (firestore) {
            try {
              await setDoc(doc(firestore, 'users', credential.user.uid), {
                ...profile,
                createdAt: serverTimestamp(),
              });
            } catch { /* ignore */ }
          }
          localStorage.setItem(TOKEN_STORAGE_KEY, `local_fb_${credential.user.uid}`);
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(profile));
          const enrichedUser = loadProfileExtras(profile);
          setUser(enrichedUser);
          setIsPostAuthLoading(true);
          window.setTimeout(() => setIsPostAuthLoading(false), 2000);
          return enrichedUser;
        } catch (fbErr) {
          console.warn("Error en registro Firebase:", fbErr.message);
        }
      }

      // 3. Fallback de cuenta local si el backend está apagado
      if (apiFailed) {
        const localUser = {
          id: email.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, '_'),
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role: role || 'seeker',
          phone: phone ? phone.trim() : null,
          createdAt: new Date().toISOString(),
        };
        const token = `local_${Date.now()}`;
        localStorage.setItem(TOKEN_STORAGE_KEY, token);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(localUser));
        const enrichedUser = loadProfileExtras(localUser);
        setUser(enrichedUser);
        setIsPostAuthLoading(true);
        window.setTimeout(() => setIsPostAuthLoading(false), 2000);
        return enrichedUser;
      }

      throw new Error(errDetail);
    } finally {
      setIsLoading(false);
    }
  };

  const requestPasswordReset = async (email) => {
    // Llamar a la API de RuwaJay para generar y enviar el código de recuperación
    try {
      const res = await fetch(`${API_URL}/api/auth/password/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (res.ok) {
        return await res.json();
      }
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Error al solicitar el código de recuperación.');
    } catch (e) {
      if (firebaseWebEnabled && firebaseAuth) {
        firebaseAuth.languageCode = 'es';
        return await sendPasswordResetEmail(firebaseAuth, email);
      }
      throw e;
    }
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