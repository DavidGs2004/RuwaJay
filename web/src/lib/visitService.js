import { collection, onSnapshot, query, where, doc, deleteDoc } from 'firebase/firestore';
import { callBackend } from './backendService';
import { firestore } from './firebase';
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
  return callBackend('createVisit', {
    propertyId: visit.propertyId,
    date: visit.date || visit.visitDate,
    time: visit.time || visit.visitTime,
    notes: visit.notes || ''
  });
}

export async function changeVisitStatus(visitId, status) {
  return callBackend('changeVisitStatus', { visitId, status });
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
    const deletedIds = new Set(getLocalDeletedVisitIds());
    onChange(
      [...new Map([...owner, ...tenant].map(v => [v.id, v])).values()]
        .filter(v => !deletedIds.has(v.id))
        .sort((a, b) => timestampMillis(b.createdAt) - timestampMillis(a.createdAt))
    );
  };
  const listen = (field, set) => onSnapshot(query(collection(firestore, 'visits'), where(field, '==', userId)), snap => {
    set(snap.docs.map(d => normalizeVisit({ ...d.data(), id: d.id })));
    emit();
  }, onError);
  const a = listen('ownerId', v => owner = v);
  const b = listen('tenantId', v => tenant = v);
  return () => { a(); b(); };
}
