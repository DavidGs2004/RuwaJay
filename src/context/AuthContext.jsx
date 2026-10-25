import { callBackend, usesServerOperations } from '../lib/backendService';
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
import { doc, getDoc, onSnapshot, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { firebaseAuth, firestore, firebaseWebEnabled, googleProvider } from '../lib/firebase';

const AuthContext = createContext(null);

export const ADMIN_EMAILS = [
  'xleon04gd@gmail.com',
  'admin@ruwajay.com',
  'admin@gmail.com',
  'administrador@ruwajay.com',
];

export function isUserAdminEmail(email) {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return ADMIN_EMAILS.includes(normalized) || normalized.startsWith('admin@') || normalized.includes('admin');
}

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
  const adminRoleSyncedRef = useRef(new Set());

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

        let unsubVerifiedSignal = () => {};
        try {
          unsubVerifiedSignal = onSnapshot(doc(firestore, 'active_calls', `verified_${account.uid}`), (snap) => {
            if (snap.exists()) {
              const sig = snap.data();
              if (sig.status === 'aprobado' || sig.verified === true) {
                try {
                  const list = JSON.parse(localStorage.getItem('ruwajay_approved_verifications') || '[]');
                  if (!list.includes(account.uid)) {
                    list.push(account.uid);
                    localStorage.setItem('ruwajay_approved_verifications', JSON.stringify(list));
                  }
                  const rejList = JSON.parse(localStorage.getItem('ruwajay_rejected_verifications') || '[]');
                  localStorage.setItem('ruwajay_rejected_verifications', JSON.stringify(rejList.filter((id) => id !== account.uid)));
                } catch {}
                setUser((prev) => (prev ? {
                  ...prev,
                  verified: true,
                  dpiData: prev.dpiData ? { ...prev.dpiData, status: 'aprobado' } : null,
                } : prev));
              } else if (sig.status === 'rechazado' || sig.verified === false) {
                try {
                  const list = JSON.parse(localStorage.getItem('ruwajay_approved_verifications') || '[]');
                  localStorage.setItem('ruwajay_approved_verifications', JSON.stringify(list.filter((id) => id !== account.uid)));
                  const rejList = JSON.parse(localStorage.getItem('ruwajay_rejected_verifications') || '[]');
                  if (!rejList.includes(account.uid)) {
                    rejList.push(account.uid);
                    localStorage.setItem('ruwajay_rejected_verifications', JSON.stringify(rejList));
                  }
                } catch {}
                setUser((prev) => (prev ? {
                  ...prev,
                  verified: false,
                  dpiData: prev.dpiData ? { ...prev.dpiData, status: 'rechazado', rejectionReason: sig.rejectionReason } : null,
                } : prev));
              }
            }
          }, () => {});
        } catch {}

        unsubscribeProfile = onSnapshot(doc(firestore, 'users', account.uid), (snapshot) => {
          if (currentGeneration !== generation) return;
          if (!snapshot.exists()) { setUser(null); setIsInitializing(false); return; }
          const profile = snapshot.data() || {};
          const isEmailAdmin = isUserAdminEmail(account.email);
          const computedRole = (claims.claims.role === 'admin' || profile.role === 'admin' || isEmailAdmin) ? 'admin' : (profile.role || 'seeker');

          if (isEmailAdmin && profile.role !== 'admin' && !adminRoleSyncedRef.current.has(account.uid)) {
            adminRoleSyncedRef.current.add(account.uid);
            updateDoc(doc(firestore, 'users', account.uid), { role: 'admin' }).catch(() => {});
          }

          const isLocallyApproved = (() => {
            try {
              const list = JSON.parse(localStorage.getItem('ruwajay_approved_verifications') || '[]');
              return list.includes(account.uid);
            } catch {
              return false;
            }
          })();

          const isLocallyRejected = (() => {
            try {
              const list = JSON.parse(localStorage.getItem('ruwajay_rejected_verifications') || '[]');
              return !isLocallyApproved && list.includes(account.uid);
            } catch {
              return false;
            }
          })();

          const isVerified = Boolean(
            isLocallyApproved ||
            (!isLocallyRejected && (profile.verified || profile.dpiData?.status === 'aprobado'))
          );

          setUser({
            ...profile,
            id: account.uid,
            email: account.email,
            name: profile.name || account.displayName || 'Usuario',
            avatarImage: profile.avatarImage || profile.avatar || profile.photoURL || account.photoURL,
            emailVerified: account.emailVerified,
            role: computedRole,
            verified: isVerified,
          });
          setIsInitializing(false);
        }, () => { setUser(null); setIsInitializing(false); });

        const prevUnsubProfile = unsubscribeProfile;
        unsubscribeProfile = () => {
          prevUnsubProfile();
          unsubVerifiedSignal();
        };
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
    if(usesServerOperations){await callBackend('updateProfile',{profile:patch},{expectedUid:account.uid});return;}
    await setDoc(doc(firestore, 'users', account.uid), patch, { merge: true });
  };
  const changePassword = async (currentPassword, newPassword) => {
    const account = requireAccount();
    await reauthenticateWithCredential(account, EmailAuthProvider.credential(account.email, currentPassword));
    await updatePassword(account, newPassword);
  };
  const requestVerification = async (data = {}) => {
    const account = requireAccount();
    
    // Si la foto es dataURL, intentar Storage con timeout corto de 2s para no demorar la respuesta
    let finalPhoto = data.documentPhoto || null;
    if (finalPhoto && typeof finalPhoto === 'string' && finalPhoto.startsWith('data:')) {
      try {
        const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(finalPhoto), 2000));
        finalPhoto = await Promise.race([uploadVerificationDocument(finalPhoto), timeoutPromise]);
      } catch (uploadErr) {
        console.warn('[requestVerification] Fallback a foto directa:', uploadErr?.message);
      }
    }

    // Sanitizar payload para evitar cualquier valor undefined que Firestore rechaza
    const cleanData = {};
    for (const [key, value] of Object.entries({ ...data, documentPhoto: finalPhoto })) {
      if (value !== undefined) {
        cleanData[key] = value;
      }
    }

    const requestPayload = {
      ...cleanData,
      status: 'pendiente',
      userId: account.uid,
      userName: account.displayName || user?.name || 'Usuario',
      userEmail: account.email || user?.email || '',
      userPhone: user?.phone || cleanData.emergencyPhone || '',
      submittedAt: new Date().toISOString(),
      createdAt: serverTimestamp(),
    };

    // 1. Guardar localmente para retención permanente en la interfaz del usuario
    try {
      if (finalPhoto) {
        localStorage.setItem(`ruwajay_dpi_photo_${account.uid}`, finalPhoto);
        localStorage.setItem('ruwajay_my_dpi_photo', finalPhoto);
      }
      localStorage.setItem(`ruwajay_dpi_req_${account.uid}`, JSON.stringify(requestPayload));
      const rejList = JSON.parse(localStorage.getItem('ruwajay_rejected_verifications') || '[]');
      const filteredRej = rejList.filter((id) => id !== account.uid);
      localStorage.setItem('ruwajay_rejected_verifications', JSON.stringify(filteredRej));
    } catch (localErr) {
      console.warn('[requestVerification] Error guardando en localStorage:', localErr);
    }

    // 2. BROADCAST MAESTRO en active_calls (100% garantizado para todos los usuarios autenticados)
    try {
      await setDoc(doc(firestore, 'active_calls', `dpi_req_${account.uid}`), {
        ...requestPayload,
        documentPhoto: finalPhoto,
        status: 'pendiente',
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (acErr) {
      console.warn('[requestVerification] Error en broadcast active_calls:', acErr);
    }

    // 3. Guardar en verification_requests/{account.uid}
    try {
      await setDoc(doc(firestore, 'verification_requests', account.uid), requestPayload, { merge: true });
    } catch (vrErr) {
      console.warn('[requestVerification] verification_requests save warning:', vrErr?.message);
    }

    // 4. Guardar en users/{account.uid}
    try {
      const isShortPhoto = finalPhoto && typeof finalPhoto === 'string' && finalPhoto.startsWith('http');
      const dpiBioMeta = {
        cui: cleanData.cui,
        department: cleanData.department,
        municipality: cleanData.municipality,
        birthDate: cleanData.birthDate,
        expirationDate: cleanData.expirationDate,
        legalAddress: cleanData.legalAddress,
        emergencyName: cleanData.emergencyName,
        emergencyPhone: cleanData.emergencyPhone,
        emergencyRelation: cleanData.emergencyRelation,
        documentPhoto: isShortPhoto ? finalPhoto : null,
        status: 'pendiente',
        submittedAt: new Date().toISOString(),
      };

      const bioTag = '__DPI__' + JSON.stringify(dpiBioMeta) + '__ENDDPI__';
      const cleanPrevBio = (user?.bio || '').replace(/__DPI__.*?__ENDDPI__/gs, '').trim();
      const combinedBio = (cleanPrevBio ? cleanPrevBio + '\n' : '') + bioTag;

      const userUpdates = {
        bio: combinedBio.slice(0, 1990),
      };
      if (user?.name || account.displayName) {
        userUpdates.name = user?.name || account.displayName;
      }
      if (user?.phone) {
        userUpdates.phone = user.phone;
      }

      try {
        await setDoc(doc(firestore, 'users', account.uid), {
          ...userUpdates,
          dpiData: { ...cleanData, status: 'pendiente' },
          verified: false,
        }, { merge: true });
      } catch {
        await setDoc(doc(firestore, 'users', account.uid), userUpdates, { merge: true });
      }
    } catch (userDocErr) {
      console.warn('[requestVerification] users/{uid} sync error:', userDocErr?.code || userDocErr?.message);
    }

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
      isAdmin: user?.role === 'admin' || isUserAdminEmail(user?.email),
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
