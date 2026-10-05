import {
  collection,
  doc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { firestore, firebaseWebEnabled } from './firebase';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');

function getAuthHeaders() {
  const token = localStorage.getItem('ruwajay_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * Subscribe to all users in Firestore and/or SQLite API (admin only).
 */
export function subscribeToUsers(onUpdate, onError = () => {}) {
  let isSubscribed = true;

  // 1. Fetch from FastAPI Backend
  const fetchApiUsers = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/users`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (isSubscribed && Array.isArray(data.users) && data.users.length > 0) {
          onUpdate((prev) => {
            // Merge users avoiding duplicates
            const map = new Map();
            (prev || []).forEach((u) => map.set(String(u.id), u));
            data.users.forEach((u) => map.set(String(u.id), { ...map.get(String(u.id)), ...u }));
            return Array.from(map.values());
          });
        }
      }
    } catch {
      // Backend might be offline or using Firebase only
    }
  };

  fetchApiUsers();

  // 2. Realtime listener from Firestore
  let unsubFirestore = () => {};
  if (firebaseWebEnabled && firestore) {
    try {
      unsubFirestore = onSnapshot(
        query(collection(firestore, 'users'), orderBy('createdAt', 'desc')),
        (snapshot) => {
          if (!isSubscribed) return;
          const fbUsers = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
          onUpdate((prev) => {
            const map = new Map();
            (prev || []).forEach((u) => map.set(String(u.id), u));
            fbUsers.forEach((u) => map.set(String(u.id), { ...map.get(String(u.id)), ...u }));
            return Array.from(map.values());
          });
        },
        (err) => {
          console.warn('Firestore users subscription:', err);
          onError(err);
        }
      );
    } catch (e) {
      console.warn('Firestore onSnapshot error:', e);
    }
  }

  return () => {
    isSubscribed = false;
    unsubFirestore();
  };
}

/**
 * Update a user's role (admin only).
 */
export async function updateUserRole(userId, newRole) {
  if (!['seeker', 'owner', 'admin'].includes(newRole)) throw new Error('Rol inválido.');

  let updatedInApi = false;

  // Try API first
  try {
    const res = await fetch(`${API_URL}/api/admin/users/${userId}/role`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ role: newRole }),
    });
    if (res.ok) updatedInApi = true;
  } catch {
    // API not reachable
  }

  // Try Firestore
  if (firebaseWebEnabled && firestore) {
    try {
      await updateDoc(doc(firestore, 'users', String(userId)), { role: newRole });
      return;
    } catch (err) {
      if (!updatedInApi) throw err;
    }
  }

  if (!updatedInApi && (!firebaseWebEnabled || !firestore)) {
    throw new Error('No se pudo conectar al servidor para cambiar el rol.');
  }
}

/**
 * Suspend or activate a user account (admin only).
 */
export async function updateUserStatus(userId, status) {
  if (!['active', 'suspended'].includes(status)) throw new Error('Estado inválido.');

  let updatedInApi = false;

  try {
    const res = await fetch(`${API_URL}/api/admin/users/${userId}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status }),
    });
    if (res.ok) updatedInApi = true;
  } catch {
    // API not reachable
  }

  if (firebaseWebEnabled && firestore) {
    try {
      await updateDoc(doc(firestore, 'users', String(userId)), { accountStatus: status });
      return;
    } catch (err) {
      if (!updatedInApi) throw err;
    }
  }

  if (!updatedInApi && (!firebaseWebEnabled || !firestore)) {
    throw new Error('No se pudo conectar al servidor para actualizar el estado.');
  }
}

/**
 * Delete a property from Firestore / local API (admin moderation).
 */
export async function deleteProperty(propertyId) {
  if (firebaseWebEnabled && firestore) {
    await deleteDoc(doc(firestore, 'properties', propertyId));
  }
}

/**
 * Subscribe to system updates and announcements (Public and Admin).
 */
export function subscribeToSystemUpdates(onUpdate, isAdmin = false, onError = () => {}) {
  let isSubscribed = true;

  const fetchApiUpdates = async () => {
    try {
      const endpoint = isAdmin ? `${API_URL}/api/admin/updates` : `${API_URL}/api/system/updates`;
      const res = await fetch(endpoint, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (isSubscribed && Array.isArray(data.updates)) {
          onUpdate(data.updates);
        }
      }
    } catch {
      // Backend not available
    }
  };

  fetchApiUpdates();

  // Firestore listener
  let unsubFirestore = () => {};
  if (firebaseWebEnabled && firestore) {
    try {
      unsubFirestore = onSnapshot(
        collection(firestore, 'system_updates'),
        (snapshot) => {
          if (!isSubscribed) return;
          const fbUpdates = snapshot.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              ...data,
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt || new Date().toISOString(),
              updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt,
            };
          }).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

          const filtered = isAdmin ? fbUpdates : fbUpdates.filter((u) => u.active !== false);
          onUpdate(filtered);
        },
        (err) => {
          console.warn('Firestore system_updates subscription:', err);
          onError(err);
          onUpdate([]);
        }
      );
    } catch (e) {
      console.warn('Firestore onSnapshot system_updates error:', e);
      onError(e);
      onUpdate([]);
    }
  } else {
    onUpdate([]);
  }

  return () => {
    isSubscribed = false;
    unsubFirestore();
  };
}

/**
 * Create a new system update / announcement (admin only).
 */
export async function createSystemUpdate(updateData) {
  const payload = {
    title: updateData.title.trim(),
    content: updateData.content.trim(),
    category: updateData.category || 'novedad',
    priority: updateData.priority || 'normal',
    active: updateData.active !== false,
  };

  let createdInApi = null;

  try {
    const res = await fetch(`${API_URL}/api/admin/updates`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const json = await res.json();
      createdInApi = json.update;
    }
  } catch {
    // API not reachable
  }

  if (firebaseWebEnabled && firestore) {
    try {
      const docRef = await addDoc(collection(firestore, 'system_updates'), {
        ...payload,
        createdBy: updateData.createdBy || 'Administrador RuwaJay',
        createdAt: serverTimestamp(),
      });
      return { id: docRef.id, ...payload };
    } catch (err) {
      if (createdInApi) return createdInApi;
      throw err;
    }
  }

  if (createdInApi) return createdInApi;
  throw new Error('No se pudo publicar la actualización. Verifica tu conexión.');
}

/**
 * Update / toggle active status of a system update (admin only).
 */
export async function updateSystemUpdate(updateId, patchData) {
  let updatedInApi = false;

  try {
    const res = await fetch(`${API_URL}/api/admin/updates/${updateId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(patchData),
    });
    if (res.ok) updatedInApi = true;
  } catch {
    // API not reachable
  }

  if (firebaseWebEnabled && firestore) {
    try {
      await updateDoc(doc(firestore, 'system_updates', String(updateId)), {
        ...patchData,
        updatedAt: serverTimestamp(),
      });
      return;
    } catch (err) {
      if (!updatedInApi) throw err;
    }
  }

  if (!updatedInApi && (!firebaseWebEnabled || !firestore)) {
    throw new Error('No se pudo actualizar el comunicado.');
  }
}

/**
 * Delete a system update (admin only).
 */
export async function deleteSystemUpdate(updateId) {
  let deletedInApi = false;

  try {
    const res = await fetch(`${API_URL}/api/admin/updates/${updateId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (res.ok) deletedInApi = true;
  } catch {
    // API not reachable
  }

  if (firebaseWebEnabled && firestore) {
    try {
      await deleteDoc(doc(firestore, 'system_updates', String(updateId)));
      return;
    } catch (err) {
      if (!deletedInApi) throw err;
    }
  }

  if (!deletedInApi && (!firebaseWebEnabled || !firestore)) {
    throw new Error('No se pudo eliminar el comunicado.');
  }
}

/**
 * Fetch platform overview statistics.
 */
export async function fetchAdminStats() {
  try {
    const res = await fetch(`${API_URL}/api/admin/stats`, {
      headers: getAuthHeaders(),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback
  }
  return null;
}
