import { collection,doc,getDocs,setDoc,addDoc,updateDoc,deleteDoc,onSnapshot,serverTimestamp } from 'firebase/firestore';
import { firestore } from './firebase';
export function subscribeToUsers(onUpdate,onError=console.error) {
  return onSnapshot(collection(firestore,'users'), snap => onUpdate(snap.docs.map(d=>({...d.data(),id:d.id,createdAt:d.data().createdAt?.toDate?.().toISOString() || d.data().createdAt}))),onError);
}
export async function updateUserRole(userId,role) {
  if(!['seeker','owner','admin'].includes(role)) throw new Error('Rol invalido.');
  await updateDoc(doc(firestore,'users',userId),{role});
}
export async function updateUserStatus(userId, status) {
  if (!['active', 'inactive', 'suspended'].includes(status)) throw new Error('Estado inválido.');
  const isSuspended = status === 'suspended';
  const isActive = status === 'active';
  await setDoc(doc(firestore, 'users', userId), {
    accountStatus: status,
    status: status,
    suspended: isSuspended,
    suspensionReason: isSuspended ? 'Incumplimiento de normas' : null,
    suspendedAt: isSuspended ? serverTimestamp() : null,
    reactivatedAt: isActive ? serverTimestamp() : null,
    updatedAt: serverTimestamp(),
  }, { merge: true });
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

// ── Solicitudes de Verificación de Caseros (DPI) ──
export function subscribeVerificationRequests(onUpdate, onError=console.error) {
  return onSnapshot(collection(firestore, 'verification_requests'), snap => {
    const list = snap.docs.map(d => {
      const data = d.data();
      return {
        ...data,
        id: d.id,
        createdAt: data.createdAt?.toDate?.().toISOString() || data.createdAt || null,
        reviewedAt: data.reviewedAt?.toDate?.().toISOString() || data.reviewedAt || null,
      };
    });
    // Ordenar: pendientes primero, luego por fecha más reciente
    list.sort((a, b) => {
      if (a.status === 'pendiente' && b.status !== 'pendiente') return -1;
      if (a.status !== 'pendiente' && b.status === 'pendiente') return 1;
      return (new Date(b.createdAt || 0)).getTime() - (new Date(a.createdAt || 0)).getTime();
    });
    onUpdate(list);
  }, onError);
}

export async function approveVerificationRequest(request, adminUser) {
  const targetDocId = request.id || request.userId;
  const targetUserId = request.userId || request.id;
  const now = new Date();
  const dateFormatted = now.toLocaleDateString('es-GT', { day: '2-digit', month: 'long', year: 'numeric' });

  // 1. Actualizar la solicitud a 'aprobada'
  await setDoc(doc(firestore, 'verification_requests', targetDocId), {
    status: 'aprobada',
    reviewedAt: serverTimestamp(),
    reviewedBy: adminUser?.id || adminUser?.uid || 'admin',
    reviewerName: adminUser?.name || 'Administrador',
    rejectionReason: null,
  }, { merge: true });

  // 2. Otorgar rol de propietario y marcar como verificado con DPI
  await setDoc(doc(firestore, 'users', targetUserId), {
    role: 'owner',
    verified: true,
    verificationStatus: 'aprobada',
    verificationRejectionReason: null,
    dpiData: {
      cui: request.cui || '',
      department: request.department || '',
      municipality: request.municipality || '',
      birthDate: request.birthDate || '',
      expirationDate: request.expirationDate || '',
      legalAddress: request.legalAddress || '',
      emergencyName: request.emergencyName || '',
      emergencyPhone: request.emergencyPhone || '',
      emergencyRelation: request.emergencyRelation || '',
      documentPhoto: request.documentPhoto || '',
      verifiedAt: dateFormatted,
    },
  }, { merge: true });

  // 3. Crear notificación en tiempo real para el usuario
  const notifRef = doc(collection(firestore, 'users', targetUserId, 'notifications'));
  await setDoc(notifRef, {
    title: '🎉 ¡Solicitud de Casero Aprobada!',
    body: 'Tu verificación de identidad con DPI ha sido revisada y aprobada con éxito. Ya tienes el permiso para publicar y anunciar tus viviendas en RuwaJay.',
    path: '/publicar',
    type: 'verification_approved',
    createdAt: serverTimestamp(),
    readAt: null,
  });
}

export async function rejectVerificationRequest(request, reason, adminUser) {
  const targetDocId = request.id || request.userId;
  const targetUserId = request.userId || request.id;
  const cleanReason = (reason || '').trim() || 'Los datos o la fotografía del documento no cumplen con los requisitos de verificación.';

  // 1. Actualizar la solicitud a 'rechazada' en verification_requests
  await setDoc(doc(firestore, 'verification_requests', targetDocId), {
    status: 'rechazada',
    rejectionReason: cleanReason,
    reviewedAt: serverTimestamp(),
    reviewedBy: adminUser?.id || adminUser?.uid || 'admin',
    reviewerName: adminUser?.name || 'Administrador',
  }, { merge: true });

  // 2. Actualizar estado del usuario a rechazado y LIMPIAR dpiData para que empiece desde cero
  await setDoc(doc(firestore, 'users', targetUserId), {
    verified: false,
    verificationStatus: 'rechazada',
    verificationRejectionReason: cleanReason,
    dpiData: null,
  }, { merge: true });

  // 3. Crear notificación en tiempo real para el usuario
  const notifRef = doc(collection(firestore, 'users', targetUserId, 'notifications'));
  await setDoc(notifRef, {
    title: '⚠️ Solicitud de Casero Rechazada',
    body: `Tu solicitud de verificación como casero no fue aprobada: "${cleanReason}". Tus datos anteriores han sido limpiados; por favor completa el formulario nuevamente desde cero.`,
    path: '/perfil?tab=configuracion&openDpi=true',
    type: 'verification_rejected',
    rejectionReason: cleanReason,
    createdAt: serverTimestamp(),
    readAt: null,
  });
}

