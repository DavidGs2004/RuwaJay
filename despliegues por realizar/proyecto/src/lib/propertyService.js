import { collection, deleteDoc, doc, getDoc, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { firebaseAuth, firebaseWebEnabled, firestore } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';
import { imageUrls, coordinatesOrNull } from './contracts';
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
  const images = imageUrls(data.images);
  const thumbnail = imageUrls([data.thumbnail])[0] || images[0] || '';
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
    coordinates: coordinatesOrNull(data.coordinates || location.mapCoordinates),
    images: imageUrls(data.images),
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
    isNew: data.isNew === true,
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

export function subscribeToProperties(onChange, onError = () => {}, { includeCachedEmpty = true } = {}) {
  if (!firestore) { onError(new Error('Firebase no est? configurado.')); return () => {}; }
  return onSnapshot(collection(firestore,'properties'), snapshot => {
    if(!includeCachedEmpty && snapshot.metadata.fromCache && snapshot.empty) return;
    onChange(snapshot.docs.map(normalizeFirebaseProperty));
  },onError);
}

function persistedProperty(property) {
  const images = imageUrls(property.images);
  if (!images.length) throw new Error('Sube al menos una fotograf?a persistente.');
  const coordinates = coordinatesOrNull(property.coordinates || property.location?.mapCoordinates);
  if (!coordinates) throw new Error('Selecciona la ubicaci?n real de la vivienda.');
  if (!firebaseAuth?.currentUser) throw new Error('Debes iniciar sesi?n.');
  return { ...property, images, thumbnail: images.includes(property.thumbnail) ? property.thumbnail : images[0],
    coordinates, location: { ...property.location, mapCoordinates:coordinates }, schemaVersion:2 };
}

export async function publishPropertyToFirebase(property) {
  if (!firebaseWebEnabled || !firestore) {
    throw new Error('Firebase Web no está configurado. Completa las variables VITE_FIREBASE_API_KEY y VITE_FIREBASE_APP_ID.');
  }

  property = persistedProperty(property);
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

export async function updatePropertyStatus(propertyId,status) {
  await updateDoc(doc(firestore,'properties',propertyId),{status});
}
export async function updatePropertyToFirebase(property) {
  const data = persistedProperty(property);
  await setDoc(doc(firestore,'properties',property.id),{
    ...data, features:{bedrooms:Number(property.bedrooms)||0,bathrooms:Number(property.bathrooms)||0,area:Number(property.area)||0,parking:Number(property.parking)||0},
    updatedAt:serverTimestamp(),
  },{merge:true});
  return true;
}

export function getPropertyById(propertyId) {
  const local = readLocalCustomProperties();
  return local.find((p) => p.id === propertyId) || null;
}

export async function fetchPropertyById(propertyId) {
  if (!propertyId) return null;


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



  return null;
}

export async function uploadPropertyImages(files, propertyId, ownerId, onProgress = () => {}) {
  if (!firebaseAuth?.currentUser || firebaseAuth.currentUser.uid !== ownerId || !storage) throw new Error('Debes iniciar sesi?n.');
  if (!files?.length || files.length > 8) throw new Error('Sube entre 1 y 8 fotograf?as.');
  let finished = 0;
  return Promise.all(files.map(async file => {
    if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 8*1024*1024) throw new Error('Fotograf?a inv?lida o mayor de 8 MB.');
    const target=ref(storage,`properties/${propertyId}/${ownerId}/${crypto.randomUUID()}`);
    await uploadBytes(target,file,{contentType:file.type});
    const url=await getDownloadURL(target);onProgress(Math.round(++finished/files.length*100));return url;
  }));
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
