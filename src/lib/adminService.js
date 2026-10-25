import { collection,doc,getDocs,getDoc,setDoc,addDoc,updateDoc,deleteDoc,onSnapshot,serverTimestamp } from 'firebase/firestore';
import { firestore } from './firebase';
import { isUserAdminEmail } from '../context/AuthContext';
export function subscribeToUsers(onUpdate,onError=console.error) {
  return onSnapshot(collection(firestore,'users'), snap => onUpdate(snap.docs.map(d=>{
    const data = d.data();
    const isAdmin = isUserAdminEmail(data.email) || data.role === 'admin';
    return {
      ...data,
      id: d.id,
      role: isAdmin ? 'admin' : (data.role || 'seeker'),
      createdAt: data.createdAt?.toDate?.().toISOString() || data.createdAt,
    };
  })), onError);
}
export async function updateUserRole(userId,role) {
  if(!['seeker','owner','admin'].includes(role)) throw new Error('Rol invalido.');
  await updateDoc(doc(firestore,'users',userId),{role});
}
export async function updateUserStatus(userId,status) {
  if(!['active','suspended'].includes(status)) throw new Error('Estado invalido.');
  await updateDoc(doc(firestore,'users',userId),{status,suspended:status==='suspended'});
}
export async function deleteProperty(id) { await deleteDoc(doc(firestore,'properties',id)); }
export function subscribeToSystemUpdates(onUpdate,isAdmin=false,onError=console.error) {
  return onSnapshot(collection(firestore,'system_updates'),snap=>onUpdate(snap.docs.map(d=>({...d.data(),id:d.id,
    createdAt:d.data().createdAt?.toDate?.().toISOString() || d.data().createdAt,
  })).filter(v=>isAdmin||v.active!==false)),onError);
}
export async function createSystemUpdate(data) {
  const ref=await addDoc(collection(firestore,'system_updates'),{...data,createdAt:serverTimestamp()});return {...data,id:ref.id};
}
export async function updateSystemUpdate(id,data) { await updateDoc(doc(firestore,'system_updates',id),{...data,updatedAt:serverTimestamp()}); }
export async function deleteSystemUpdate(id) { await deleteDoc(doc(firestore,'system_updates',id)); }
export async function fetchAdminStats() {
  const [properties,users]=await Promise.all([getDocs(collection(firestore,'properties')),getDocs(collection(firestore,'users'))]);
  return {totalProperties:properties.size,totalUsers:users.size};
}

/* ── Verification Requests Management ── */

/**
 * Subscribe to all verification_requests in real-time (admin only).
 * Each document is keyed by userId.
 */
export function subscribeToVerificationRequests(onUpdate, onError = console.error) {
  return onSnapshot(
    collection(firestore, 'verification_requests'),
    (snap) => {
      const requests = snap.docs.map((d) => ({
        ...d.data(),
        id: d.id, // same as userId
        createdAt: d.data().createdAt?.toDate?.().toISOString() || d.data().createdAt,
        reviewedAt: d.data().reviewedAt?.toDate?.().toISOString() || d.data().reviewedAt,
      }));
      onUpdate(requests);
    },
    onError
  );
}

/* ── Local persistent storage helpers for verification decisions ── */
export const APPROVED_VERIFICATIONS_KEY = 'ruwajay_approved_verifications';
export const REJECTED_VERIFICATIONS_KEY = 'ruwajay_rejected_verifications';

export function getLocalApprovedVerifications() {
  try {
    return JSON.parse(localStorage.getItem(APPROVED_VERIFICATIONS_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveLocalApprovedVerification(userId) {
  try {
    const approved = getLocalApprovedVerifications();
    if (!approved.includes(userId)) {
      approved.push(userId);
      localStorage.setItem(APPROVED_VERIFICATIONS_KEY, JSON.stringify(approved));
    }
    const rejected = getLocalRejectedVerifications().filter((id) => id !== userId);
    localStorage.setItem(REJECTED_VERIFICATIONS_KEY, JSON.stringify(rejected));
  } catch (err) {
    console.warn('Error saving local approved verification:', err);
  }
}

export function getLocalRejectedVerifications() {
  try {
    return JSON.parse(localStorage.getItem(REJECTED_VERIFICATIONS_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveLocalRejectedVerification(userId) {
  try {
    const rejected = getLocalRejectedVerifications();
    if (!rejected.includes(userId)) {
      rejected.push(userId);
      localStorage.setItem(REJECTED_VERIFICATIONS_KEY, JSON.stringify(rejected));
    }
    const approved = getLocalApprovedVerifications().filter((id) => id !== userId);
    localStorage.setItem(APPROVED_VERIFICATIONS_KEY, JSON.stringify(approved));
  } catch (err) {
    console.warn('Error saving local rejected verification:', err);
  }
}

/**
 * Approve a verification request: writes the DPI data to the user's profile
 * (setting user.dpiData and user.verified = true), marks the request as 'aprobado',
 * updates local storage and broadcasts via active_calls.
 */
export async function approveVerificationRequest(userId, adminName = 'Administrador') {
  // 1. Guardar permanentemente en almacenamiento local inmediato
  saveLocalApprovedVerification(userId);

  const reqRef = doc(firestore, 'verification_requests', userId);
  const userRef = doc(firestore, 'users', userId);
  const [reqSnap, userSnap] = await Promise.all([getDoc(reqRef).catch(() => null), getDoc(userRef).catch(() => null)]);

  let reqData = {};
  if (reqSnap?.exists?.()) {
    reqData = reqSnap.data();
  } else if (userSnap?.exists?.()) {
    const uData = userSnap.data();
    if (uData.dpiData) {
      reqData = uData.dpiData;
    } else if (uData.bio && uData.bio.includes('__DPI__')) {
      try {
        const m = uData.bio.match(/__DPI__(.*?)__ENDDPI__/s);
        if (m && m[1]) reqData = JSON.parse(m[1]);
      } catch (e) {
        console.warn('Error parsing bio DPI:', e);
      }
    }
  }

  // 2. Build the dpiData to save on the user profile
  const dpiData = {
    cui: reqData.cui || '',
    department: reqData.department || '',
    municipality: reqData.municipality || '',
    birthDate: reqData.birthDate || '',
    expirationDate: reqData.expirationDate || '',
    legalAddress: reqData.legalAddress || '',
    emergencyName: reqData.emergencyName || '',
    emergencyPhone: reqData.emergencyPhone || '',
    emergencyRelation: reqData.emergencyRelation || '',
    documentPhoto: reqData.documentPhoto || null,
    status: 'aprobado',
    verifiedAt: new Date().toLocaleDateString('es-GT', { year: 'numeric', month: 'long', day: 'numeric' }),
    approvedBy: adminName,
  };

  // 3. Update the user profile with dpiData and verified flag
  if (userSnap?.exists?.()) {
    const rawBio = userSnap.data().bio || '';
    const cleanBio = rawBio.replace(/__DPI__.*?__ENDDPI__/gs, '').trim();
    try {
      await updateDoc(userRef, {
        dpiData,
        verified: true,
        bio: cleanBio,
      });
    } catch {
      await updateDoc(userRef, {
        bio: cleanBio,
      }).catch(() => {});
    }
  }

  // 4. Mark the verification request as approved
  try {
    await setDoc(reqRef, {
      ...reqData,
      userId,
      status: 'aprobado',
      reviewedBy: adminName,
      reviewedAt: serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    console.warn('Could not update verification_requests:', err);
  }

  // 5. Broadcast en active_calls (accesible para todos los usuarios autenticados sin restricción de reglas)
  try {
    await setDoc(doc(firestore, 'active_calls', `verified_${userId}`), {
      userId,
      verified: true,
      status: 'aprobado',
      approvedBy: adminName,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    console.warn('Could not broadcast approval via active_calls:', err);
  }

  try {
    await setDoc(doc(firestore, 'active_calls', `dpi_req_${userId}`), {
      status: 'aprobado',
      reviewedBy: adminName,
      reviewedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch {}
}

export async function deleteUser(userId) {
  await deleteDoc(doc(firestore, 'users', userId));
}

export async function createUserByAdmin({ name, email, phone = '', role = 'seeker' }) {
  if (!name || !email) throw new Error('Nombre y correo son requeridos.');
  const newUserRef = doc(collection(firestore, 'users'));
  const userData = {
    name: name.trim(),
    email: email.trim().toLowerCase(),
    phone: phone.trim(),
    role: ['seeker', 'owner', 'admin'].includes(role) ? role : 'seeker',
    accountStatus: 'active',
    status: 'active',
    suspended: false,
    verified: false,
    createdAt: serverTimestamp(),
  };
  await setDoc(newUserRef, userData);
  return { id: newUserRef.id, ...userData };
}

/**
 * Reject a verification request and optionally provide a reason.
 * Completely deletes the request so it does not linger in the requests queue,
 * resets the user's DPI status, and notifies them to restart the process.
 */
export async function rejectVerificationRequest(userId, reason = '', adminName = 'Administrador') {
  // 1. Guardar permanentemente en almacenamiento local inmediato
  saveLocalRejectedVerification(userId);

  // Limpiar cachés locales de fotos/solicitud
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`ruwajay_dpi_photo_${userId}`);
      sessionStorage.removeItem(`ruwajay_dpi_photo_${userId}`);
      if (window.__RUWAJAY_DPI_CACHE) {
        delete window.__RUWAJAY_DPI_CACHE[userId];
      }
    }
  } catch {}

  const reqRef = doc(firestore, 'verification_requests', userId);
  const userRef = doc(firestore, 'users', userId);

  // 2. Eliminar completamente el documento de la colección verification_requests
  try {
    await deleteDoc(reqRef);
  } catch (err) {
    console.warn('Could not delete verification_requests doc:', err);
  }

  // 3. Eliminar la señal de dpi_req en active_calls
  try {
    await deleteDoc(doc(firestore, 'active_calls', `dpi_req_${userId}`));
  } catch {}

  // 4. Remover datos de DPI y estado verificado del perfil del usuario
  try {
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const rawBio = userSnap.data().bio || '';
      const cleanBio = rawBio.replace(/__DPI__.*?__ENDDPI__/gs, '').trim();
      await updateDoc(userRef, {
        verified: false,
        dpiData: null,
        bio: cleanBio,
      });
    }
  } catch (err) {
    console.warn('Could not reset userDoc on reject:', err);
  }

  // 5. Broadcast rechazo en active_calls para feedback en tiempo real
  try {
    await setDoc(doc(firestore, 'active_calls', `verified_${userId}`), {
      userId,
      verified: false,
      status: 'rechazado',
      rejectionReason: reason || 'Documentación no legible o datos no válidos',
      reviewedBy: adminName,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    console.warn('Could not broadcast rejection via active_calls:', err);
  }
}
