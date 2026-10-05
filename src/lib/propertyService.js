import { collection, deleteDoc, doc, getDoc, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { firebaseAuth, firebaseWebEnabled, firestore } from './firebase';
import { uploadPropertyImagesToSupabase } from './supabaseStorage';
import { demoProperties } from '../data/properties';
import { publishRealtimeEvent } from './realtimeService';

function numberOr(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function normalizeFirebaseProperty(snapshot) {
  const data = snapshot.data();
  const features = data.features || {};
  const location = data.location || {};
  const images = Array.isArray(data.images) ? data.images : Object.values(data.images || {}).flat();
  const thumbnail = data.thumbnail || images[0] || '/Casas/cat-familiar.jpg';
  const approximate = data.address?.approximate || location.approximateAddress || data.approximateAddress || location.address || 'Guatemala';

  return {
    ...data,
    id: snapshot.id,
    type: data.type || 'casa',
    title: data.title || 'Propiedad en Guatemala',
    description: data.description || '',
    price: numberOr(data.price, 0),
    deposit: numberOr(data.deposit, numberOr(data.price, 0)),
    currency: data.currency || 'Q',
    bedrooms: numberOr(data.bedrooms ?? features.bedrooms, 0),
    bathrooms: numberOr(data.bathrooms ?? features.bathrooms, 0),
    area: numberOr(data.area ?? features.area, 0),
    parking: numberOr(data.parking, 0),
    address: {
      approximate,
      exact: data.address?.exact || location.exactAddress || location.address || data.exactAddress || approximate,
      department: data.address?.department || location.department || data.department || 'Guatemala',
      municipality: data.address?.municipality || location.municipality || location.city || data.municipality || 'Guatemala',
      zone: data.address?.zone || location.zone || data.zone || 'Centro',
    },
    coordinates: data.coordinates || location.mapCoordinates || null,
    images: data.images || { fachada: [thumbnail] },
    thumbnail,
    thumbnails: images.length ? images : [thumbnail],
    amenities: data.amenities || [],
    rules: data.rules || [],
    requirements: data.requirements || [],
    status: data.status || 'disponible',
    ownerId: data.ownerId || '',
    ownerName: data.ownerName || '',
    ownerEmail: data.ownerEmail || '',
    ownerPhone: data.ownerPhone || '',
    ownerPhoto: data.ownerPhoto || data.ownerAvatar || '',
    verified: Boolean(data.verified),
    isNew: true,
  };
}

export function readLocalCustomProperties() {
  try {
    const parsed = JSON.parse(localStorage.getItem('ruwajay_custom_properties') || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function subscribeToProperties(onChange, onError = () => {}) {
  let fbProperties = [];
  let firebaseSnapshotReady = false;

  const emit = () => {
    const local = (!firebaseWebEnabled || !firestore || !firebaseSnapshotReady)
      ? readLocalCustomProperties()
      : [];
    const map = new Map();
    [...local, ...fbProperties].forEach((p) => {
      map.set(p.id, p);
    });
    onChange(Array.from(map.values()));
  };

  const handleStorageChange = () => emit();
  window.addEventListener('storage', handleStorageChange);
  window.addEventListener('ruwajay:properties-changed', handleStorageChange);
  window.addEventListener('ruwajay:properties_changed', handleStorageChange);
  emit();

  let unsubscribeFb = () => {};
  if (firebaseWebEnabled && firestore) {
    unsubscribeFb = onSnapshot(
      collection(firestore, 'properties'),
      (snapshot) => {
        firebaseSnapshotReady = true;
        fbProperties = snapshot.docs.map(normalizeFirebaseProperty);
        try {
          // Firestore is authoritative. Remove legacy Base64/stale property copies
          // so deleted listings cannot reappear from this browser's old cache.
          localStorage.removeItem('ruwajay_custom_properties');
        } catch { /* ignore unavailable storage */ }
        emit();
      },
      onError
    );
  }

  return () => {
    window.removeEventListener('storage', handleStorageChange);
    window.removeEventListener('ruwajay:properties-changed', handleStorageChange);
    window.removeEventListener('ruwajay:properties_changed', handleStorageChange);
    unsubscribeFb();
  };
}

export async function publishPropertyToFirebase(property) {
  if (!firebaseWebEnabled || !firestore) {
    throw new Error('Firebase Web no está configurado. Completa las variables VITE_FIREBASE_API_KEY y VITE_FIREBASE_APP_ID.');
  }

  const propertyRef = doc(firestore, 'properties', property.id);
  await setDoc(propertyRef, {
    ...property,
    price: Number(property.price) || 0,
    bedrooms: Number(property.bedrooms) || 0,
    bathrooms: Number(property.bathrooms) || 0,
    images: property.images || [],
    amenities: property.amenities || [],
    rules: property.rules || [],
    requirements: property.requirements || [],
    features: {
      bedrooms: Number(property.bedrooms) || 0,
      bathrooms: Number(property.bathrooms) || 0,
      area: Number(property.area) || 0,
    },
    location: {
      department: property.address?.department || property.department || 'Guatemala',
      municipality: property.address?.municipality || property.municipality || 'Guatemala',
      zone: property.address?.zone || property.zone || 'Centro',
      approximateAddress: property.address?.approximate || property.approximateAddress || '',
      exactAddress: property.address?.exact || property.exactAddress || '',
      address: property.address?.exact || property.exactAddress || property.address?.approximate || property.approximateAddress || '',
      mapCoordinates: property.coordinates || null,
    },
    createdAt: serverTimestamp(),
  });

  return true;
}

export async function updatePropertyStatus(propertyId, status) {
  try {
    const local = readLocalCustomProperties();
    const updated = local.map((p) => (p.id === propertyId ? { ...p, status } : p));
    localStorage.setItem('ruwajay_custom_properties', JSON.stringify(updated));
  } catch { /* ignore */ }

  publishRealtimeEvent('PROPERTIES_CHANGED', { propertyId, status });

  if (firebaseWebEnabled && firestore) {
    try {
      await updateDoc(doc(firestore, 'properties', propertyId), { status });
    } catch { /* fallback to local */ }
  }
}

export async function updatePropertyToFirebase(property) {
  // 1. Update local storage
  try {
    const local = readLocalCustomProperties();
    const idx = local.findIndex((p) => p.id === property.id);
    if (idx >= 0) {
      local[idx] = { ...local[idx], ...property, updatedAt: new Date().toISOString() };
    } else {
      local.unshift({ ...property, updatedAt: new Date().toISOString() });
    }
    localStorage.setItem('ruwajay_custom_properties', JSON.stringify(local));
  } catch { /* ignore */ }

  publishRealtimeEvent('PROPERTIES_CHANGED', { propertyId: property.id, action: 'updated' });

  // 2. Sync to Firebase
  if (firebaseWebEnabled && firestore) {
    try {
      const propertyRef = doc(firestore, 'properties', property.id);
      await setDoc(propertyRef, {
        ...property,
        price: Number(property.price) || 0,
        bedrooms: Number(property.bedrooms) || 0,
        bathrooms: Number(property.bathrooms) || 0,
        images: property.images || [],
        amenities: property.amenities || [],
        rules: property.rules || [],
        requirements: property.requirements || [],
        features: {
          bedrooms: Number(property.bedrooms) || 0,
          bathrooms: Number(property.bathrooms) || 0,
          area: Number(property.area) || 0,
        },
        location: {
          department: property.address?.department || property.department || 'Guatemala',
          municipality: property.address?.municipality || property.municipality || 'Guatemala',
          zone: property.address?.zone || property.zone || 'Centro',
          approximateAddress: property.address?.approximate || property.approximateAddress || '',
          exactAddress: property.address?.exact || property.exactAddress || '',
          address: property.address?.exact || property.exactAddress || property.address?.approximate || property.approximateAddress || '',
          mapCoordinates: property.coordinates || null,
        },
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (err) {
      console.warn('Firebase update failed; local copy was saved:', err);
    }
  }

  return true;
}

export function getPropertyById(propertyId) {
  const local = readLocalCustomProperties();
  return local.find((p) => p.id === propertyId) || null;
}

export async function fetchPropertyById(propertyId) {
  if (!propertyId) return null;
  const local = getPropertyById(propertyId);
  if (local) return local;

  if (firebaseWebEnabled && firestore) {
    try {
      const snap = await getDoc(doc(firestore, 'properties', propertyId));
      if (snap.exists()) {
        return normalizeFirebaseProperty(snap);
      }
    } catch (err) {
      console.warn('Error fetching property from firestore:', err);
    }
  }

  const demo = demoProperties.find((p) => p.id === propertyId);
  if (demo) return demo;

  return null;
}

export async function uploadPropertyImages(files, propertyId, ownerId, onProgress = () => {}) {
  return uploadPropertyImagesToSupabase(files, propertyId, ownerId, onProgress);
}

export async function deleteOwnedProperty(propertyId, ownerId) {
  const activeUid = firebaseAuth?.currentUser?.uid;
  const acceptedOwnerIds = new Set([activeUid, ownerId].filter(Boolean));

  if (firebaseWebEnabled && firestore && activeUid) {
    const propertyRef = doc(firestore, 'properties', propertyId);
    const snapshot = await getDoc(propertyRef);
    if (snapshot.exists() && !acceptedOwnerIds.has(snapshot.data().ownerId)) {
      throw new Error('Solo el propietario que publicó esta vivienda puede eliminarla.');
    }
    if (snapshot.exists()) await deleteDoc(propertyRef);
  }

  try {
    const remaining = readLocalCustomProperties().filter((property) => property.id !== propertyId);
    localStorage.setItem('ruwajay_custom_properties', JSON.stringify(remaining));
  } catch { /* Firestore remains authoritative */ }

  publishRealtimeEvent('PROPERTIES_CHANGED', { propertyId, action: 'deleted' });
  window.dispatchEvent(new Event('ruwajay:properties-changed'));
  window.dispatchEvent(new Event('ruwajay:properties_changed'));
}
