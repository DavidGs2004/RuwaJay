import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { firebaseAuth, storage } from './firebase';

async function upload(path, source) {
  if (!firebaseAuth?.currentUser || !storage) throw new Error('Debes iniciar sesión para subir archivos.');
  const blob = source instanceof Blob ? source : await (await fetch(source)).blob();
  if (!blob.size || blob.size > 20 * 1024 * 1024) throw new Error('El archivo debe pesar menos de 20 MB.');
  const target = ref(storage, path);
  await uploadBytes(target, blob, { contentType: blob.type });
  return getDownloadURL(target);
}
export function uploadChatMedia(roomId, source) {
  return upload(`chat/${roomId}/${firebaseAuth.currentUser.uid}/${crypto.randomUUID()}`, source);
}
export function uploadProfileImage(source) {
  return upload(`profiles/${firebaseAuth.currentUser.uid}/${crypto.randomUUID()}`, source);
}
export function uploadVerificationDocument(source) {
  return upload(`verification/${firebaseAuth.currentUser.uid}/${crypto.randomUUID()}`, source);
}
