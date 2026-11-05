import { collection, onSnapshot, query, where, doc, deleteDoc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { callBackend, usesSupabaseBackend } from './backendService';
import { firestore, firebaseAuth } from './firebase';
import { normalizeVisit, timestampMillis } from './contracts';

const DELETED_VISITS_KEY = 'ruwajay_deleted_visits_v1';

export function getLocalDeletedVisitIds() {
  try {
    return JSON.parse(localStorage.getItem(DELETED_VISITS_KEY) || '[]');
  } catch {
    return [];
  }
}

export function hideVisitLocally(visitId) {
  try {
    const list = getLocalDeletedVisitIds();
    if (!list.includes(visitId)) {
      list.push(visitId);
      localStorage.setItem(DELETED_VISITS_KEY, JSON.stringify(list));
    }
  } catch (e) {
    console.warn('Error guardando cita eliminada localmente:', e);
  }
}

// Legacy cache is not authoritative and is never used to grant access or reserve a slot.
export function readLocalVisits() { return []; }

export async function createVisit(visit) {
  if (usesSupabaseBackend) {
    try {
      return await callBackend('createVisit', {
        propertyId: visit.propertyId,
        date: visit.date || visit.visitDate,
        time: visit.time || visit.visitTime,
        notes: visit.notes || ''
      });
    } catch (backendError) {
      console.warn('Backend createVisit falló, creando visita directa en Firestore:', backendError);
    }
  }
  if (firestore && firebaseAuth?.currentUser) {
    const user = firebaseAuth.currentUser;
    const visitRef = doc(collection(firestore, 'visits'));
    const visitData = {
      id: visitRef.id,
      propertyId: visit.propertyId,
      propertyTitle: visit.propertyTitle || 'Vivienda',
      propertyImage: visit.propertyImage || '',
      propertyPrice: visit.propertyPrice || 0,
      propertyAddress: visit.propertyAddress || '',
      propertyZone: visit.propertyZone || '',
      ownerId: visit.ownerId || '',
      ownerName: visit.ownerName || 'Propietario',
      tenantId: user.uid,
      tenantName: user.displayName || 'Interesado',
      tenantEmail: user.email || '',
      tenantPhone: user.phoneNumber || '',
      date: visit.date || visit.visitDate,
      time: visit.time || visit.visitTime,
      notes: visit.notes || '',
      status: 'pendiente',
      createdAt: serverTimestamp(),
      createdAtIso: new Date().toISOString()
    };
    await setDoc(visitRef, visitData);
    return { id: visitRef.id };
  }
  throw new Error('No se pudo agendar la cita.');
}

export async function changeVisitStatus(visitId, status) {
  if (usesSupabaseBackend) {
    try {
      return await callBackend('changeVisitStatus', { visitId, status });
    } catch (backendError) {
      console.warn('Backend changeVisitStatus falló, actualizando directamente en Firestore:', backendError);
    }
  }
  if (firestore) {
    await updateDoc(doc(firestore, 'visits', visitId), {
      status,
      updatedAt: serverTimestamp()
    });
    return { status };
  }
  throw new Error('No se pudo actualizar el estado de la cita.');
}

export async function deleteVisit(visitId) {
  hideVisitLocally(visitId);
  if (firestore) {
    try {
      await deleteDoc(doc(firestore, 'visits', visitId));
    } catch (err) {
      console.warn('No se pudo borrar directo de Firestore, aplicando borrado local:', err);
    }
  }
  return true;
}

export async function setVisitConversationId() {} // Set by server when the visit is confirmed.

export function subscribeToUserVisits(userId, onChange, onError = console.error) {
  if (!userId) { onChange([]); return () => {}; }
  let owner = [], tenant = [];
  const emit = () => {
    const deleted = new Set(getLocalDeletedVisitIds());
    const merged = [...owner, ...tenant].filter(v => !deleted.has(v.id));
    const unique = Array.from(new Map(merged.map(v => [v.id, v])).values());
    unique.sort((a, b) => timestampMillis(b.createdAt) - timestampMillis(a.createdAt));
    onChange(unique);
  };
  const unsubOwner = onSnapshot(query(collection(firestore, 'visits'), where('ownerId', '==', userId)), snap => {
    owner = snap.docs.map(d => normalizeVisit({ ...d.data({ serverTimestamps: 'estimate' }), id: d.id }));
    emit();
  }, onError);
  const unsubTenant = onSnapshot(query(collection(firestore, 'visits'), where('tenantId', '==', userId)), snap => {
    tenant = snap.docs.map(d => normalizeVisit({ ...d.data({ serverTimestamps: 'estimate' }), id: d.id }));
    emit();
  }, onError);
  return () => { unsubOwner(); unsubTenant(); };
}
