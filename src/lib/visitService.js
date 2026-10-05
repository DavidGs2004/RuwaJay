import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { firebaseAuth, firebaseWebEnabled, firestore } from './firebase';
import { publishRealtimeEvent } from './realtimeService';

const VISITS_KEY = 'ruwajay_visits';
const VISITS_EVENT = 'ruwajay:visits-changed';

export function readLocalVisits() {
  try {
    const parsed = JSON.parse(localStorage.getItem(VISITS_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((visit) => visit?.id !== 'visit-seed-1') : [];
  } catch {
    return [];
  }
}

function writeLocalVisits(visits) {
  localStorage.setItem(VISITS_KEY, JSON.stringify(visits));
  window.dispatchEvent(new Event(VISITS_EVENT));
  publishRealtimeEvent('VISITS_CHANGED', { count: visits.length });
}

export async function createVisit(visit) {
  const localVisits = readLocalVisits();
  writeLocalVisits([visit, ...localVisits.filter((item) => item.id !== visit.id)]);

  if (!firebaseWebEnabled || !firestore || !firebaseAuth?.currentUser) return false;
  try {
    await setDoc(doc(firestore, 'visits', visit.id), {
      ...visit,
      createdAt: serverTimestamp(),
      createdAtIso: visit.createdAt,
    });
    return true;
  } catch (error) {
    console.warn('La cita quedó guardada localmente, pero no pudo sincronizarse con Firebase:', error);
    return false;
  }
}

export async function changeVisitStatus(visitId, status) {
  const updatedAt = new Date().toISOString();
  const localVisits = readLocalVisits().map((visit) =>
    visit.id === visitId ? { ...visit, status, updatedAt } : visit
  );
  writeLocalVisits(localVisits);

  if (!firebaseWebEnabled || !firestore || !firebaseAuth?.currentUser) return false;
  try {
    await updateDoc(doc(firestore, 'visits', visitId), {
      status,
      updatedAt: serverTimestamp(),
      updatedAtIso: updatedAt,
    });
    return true;
  } catch (error) {
    console.warn('El estado se actualizó localmente, pero no pudo sincronizarse con Firebase:', error);
    return false;
  }
}

export async function deleteVisit(visitId) {
  writeLocalVisits(readLocalVisits().filter((visit) => visit.id !== visitId));

  if (!firebaseWebEnabled || !firestore || !firebaseAuth?.currentUser) return false;
  await deleteDoc(doc(firestore, 'visits', visitId));
  return true;
}

export async function setVisitConversationId(visitId, conversationId) {
  const updatedAt = new Date().toISOString();
  writeLocalVisits(readLocalVisits().map((visit) => (
    visit.id === visitId ? { ...visit, conversationId, updatedAt } : visit
  )));

  if (!firebaseWebEnabled || !firestore || !firebaseAuth?.currentUser) return false;
  await updateDoc(doc(firestore, 'visits', visitId), {
    conversationId,
    updatedAt: serverTimestamp(),
    updatedAtIso: updatedAt,
  });
  return true;
}

export function subscribeToUserVisits(userId, onChange, onError = () => {}, extraCtx = {}) {
  if (!userId) {
    onChange([]);
    return () => {};
  }

  let ownerVisits = [];
  let tenantVisits = [];
  let extraVisits = [];

  const emit = () => {
    const merged = new Map();
    const cleanUserPhone = String(extraCtx.userPhone || '').replace(/\D/g, '');
    const cleanUserName = String(extraCtx.userName || '').trim().toLowerCase();
    const myPropIds = new Set(extraCtx.myPropertyIds || []);
    const fbUid = firebaseAuth?.currentUser?.uid;

    const localRelevant = readLocalVisits().filter((visit) => {
      if (visit.ownerId === userId || visit.tenantId === userId) return true;
      if (fbUid && (visit.ownerId === fbUid || visit.tenantId === fbUid)) return true;
      if (cleanUserPhone) {
        const cleanOwnerPhone = String(visit.ownerPhone || '').replace(/\D/g, '');
        const cleanTenantPhone = String(visit.tenantPhone || '').replace(/\D/g, '');
        if ((cleanOwnerPhone && cleanOwnerPhone === cleanUserPhone) || (cleanTenantPhone && cleanTenantPhone === cleanUserPhone)) {
          return true;
        }
      }
      if (cleanUserName) {
        const cleanOwnerName = String(visit.ownerName || '').trim().toLowerCase();
        const cleanTenantName = String(visit.tenantName || '').trim().toLowerCase();
        if ((cleanOwnerName && cleanOwnerName === cleanUserName) || (cleanTenantName && cleanTenantName === cleanUserName)) {
          return true;
        }
      }
      if (visit.propertyId && myPropIds.has(visit.propertyId)) return true;
      return false;
    });

    [...localRelevant, ...ownerVisits, ...tenantVisits, ...extraVisits].forEach((visit) => {
      const previous = merged.get(visit.id);
      merged.set(visit.id, previous ? { ...previous, ...visit } : visit);
    });

    onChange([...merged.values()].sort((a, b) =>
      String(b.createdAtIso || b.createdAt || '').localeCompare(String(a.createdAtIso || a.createdAt || ''))
    ));
  };

  const handleLocalChange = () => emit();
  window.addEventListener('storage', handleLocalChange);
  window.addEventListener(VISITS_EVENT, handleLocalChange);
  window.addEventListener('ruwajay:visits_changed', handleLocalChange);
  emit();

  const unsubscribers = [];
  if (firebaseWebEnabled && firestore && firebaseAuth?.currentUser) {
    const activeUid = firebaseAuth.currentUser.uid;
    unsubscribers.push(onSnapshot(
      query(collection(firestore, 'visits'), where('ownerId', '==', activeUid)),
      (snapshot) => {
        ownerVisits = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
        emit();
      },
      onError
    ));
    unsubscribers.push(onSnapshot(
      query(collection(firestore, 'visits'), where('tenantId', '==', activeUid)),
      (snapshot) => {
        tenantVisits = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
        emit();
      },
      onError
    ));
    if (userId !== activeUid) {
      unsubscribers.push(onSnapshot(
        query(collection(firestore, 'visits'), where('ownerId', '==', userId)),
        (snapshot) => {
          extraVisits = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
          emit();
        },
        () => {}
      ));
    }
  }

  return () => {
    window.removeEventListener('storage', handleLocalChange);
    window.removeEventListener(VISITS_EVENT, handleLocalChange);
    window.removeEventListener('ruwajay:visits_changed', handleLocalChange);
    unsubscribers.forEach((unsubscribe) => unsubscribe());
  };
}
