import { getMessaging, getToken, deleteToken, isSupported } from 'firebase/messaging';
import { collection, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { firebaseAuth, firebaseApp, firestore } from './firebase';
let activeDevice = null;
export async function enableNotifications() {
  const uid = firebaseAuth?.currentUser?.uid;
  if (!uid) throw new Error('Debes iniciar sesión.');
  if (!await isSupported()) throw new Error('Este navegador no admite notificaciones.');
  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
  if (!vapidKey) throw new Error('Las notificaciones todavía no están configuradas.');
  if (await Notification.requestPermission() !== 'granted') throw new Error('Permiso de notificaciones denegado.');
  const registration = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}firebase-messaging-sw.js`);
  await navigator.serviceWorker.ready;
  const token = await getToken(getMessaging(firebaseApp), { vapidKey, serviceWorkerRegistration:registration });
  if (!token) throw new Error('No se pudo registrar este dispositivo.');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  const id = Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2,'0')).join('');
  if (firebaseAuth.currentUser?.uid !== uid) throw new Error('Tu sesión cambió. Vuelve a activar las notificaciones.');
  const device = doc(firestore,'users',uid,'devices',id);
  await setDoc(device, { token, platform:'web', updatedAt:serverTimestamp() });
  if (firebaseAuth.currentUser?.uid !== uid) throw new Error('Tu sesión cambió. Vuelve a activar las notificaciones.');
  activeDevice = device;
  localStorage.setItem('ruwajay_push_device', JSON.stringify({uid,id}));
}
export async function disableNotifications() {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem('ruwajay_push_device') || 'null'); } catch { /* discard invalid local device metadata */ }
  try {
    if (saved?.uid === firebaseAuth?.currentUser?.uid) {
      await deleteDoc(activeDevice || doc(firestore,'users',saved.uid,'devices',saved.id));
    }
  } finally {
    try {
      if (await isSupported()) await deleteToken(getMessaging(firebaseApp));
    } finally {
      activeDevice = null;
      localStorage.removeItem('ruwajay_push_device');
    }
  }
}
export function subscribeNotifications(uid,onChange,onError) {
  return onSnapshot(collection(firestore,'users',uid,'notifications'),snapshot=>
    onChange(snapshot.docs.map(d=>({...d.data(),id:d.id})).sort((a,b)=>(b.createdAt?.toMillis?.()||0)-(a.createdAt?.toMillis?.()||0))),onError);
}
