import { collection, doc, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { firebaseWebEnabled, firestore, storage } from './firebase';

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
    verified: Boolean(data.verified),
    isNew: true,
  };
}

export function subscribeToProperties(onChange, onError = () => {}) {
  if (!firebaseWebEnabled || !firestore) return () => {};
  return onSnapshot(
    collection(firestore, 'properties'),
    (snapshot) => onChange(snapshot.docs.map(normalizeFirebaseProperty)),
    onError
  );
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
  if (!firebaseWebEnabled || !firestore) {
    throw new Error('Firebase Web no está configurado.');
  }

  await updateDoc(doc(firestore, 'properties', propertyId), { status });
}

export async function uploadPropertyImages(files, propertyId) {
  if (!firebaseWebEnabled || !storage || !files?.length) return [];

  if (files.length > 8) throw new Error('Puedes subir un máximo de 8 imágenes.');
  const validTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
  const invalidFile = files.find((file) => !validTypes.has(file.type) || file.size > 8 * 1024 * 1024);
  if (invalidFile) throw new Error('Cada imagen debe ser JPG, PNG o WebP y pesar máximo 8 MB.');

  return Promise.all(files.map(async (file, index) => {
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const imageRef = ref(storage, `properties/${propertyId}/${index}-${crypto.randomUUID()}.${extension}`);
    const snapshot = await uploadBytes(imageRef, file, { contentType: file.type || 'image/jpeg' });
    return getDownloadURL(snapshot.ref);
  }));
}
