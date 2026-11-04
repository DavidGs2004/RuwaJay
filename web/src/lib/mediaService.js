import { chatMediaInfo } from './chatMedia';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { firebaseAuth, storage } from './firebase';
import { usesSupabaseBackend, uploadBackendMedia } from './backendService';
async function upload(kind, source, extra = {}) {
  const uid = firebaseAuth?.currentUser?.uid;
  if (!uid) throw new Error('Debes iniciar sesión para subir archivos.');
  if (kind === 'chat') {
    const blob = source instanceof Blob ? source : await (await fetch(source)).blob();
    const { mime } = chatMediaInfo(blob.type ? blob : source, extra.isVoice);
    chatMediaInfo({ type: mime, size: blob.size });
    source = blob.type === mime ? blob : blob.slice(0, blob.size, mime);
  }
  if (usesSupabaseBackend) {
    try {
      return await uploadBackendMedia(kind, source, { ...extra, expectedUid: uid });
    } catch (err) {
      // Chat uses private Supabase storage; a Firebase bucket may not exist.
      if (kind === 'chat') throw err;
      console.warn('Backend upload falló, usando Firebase Storage:', err);
    }
  }
  if (storage) {
    const blob = source instanceof Blob ? source : await (await fetch(source)).blob();
    if (!blob.size || blob.size > (kind === 'chat' ? 20 : 8) * 1024 * 1024) throw new Error('Archivo inválido o demasiado grande.');
    if (firebaseAuth.currentUser?.uid !== uid) throw new Error('La sesión cambió.');
    const contentType = blob.type || (kind === 'chat' ? (extra.isVoice ? 'audio/webm' : 'application/octet-stream') : 'image/jpeg');
    const path = kind === 'chat' ? 'chat/' + extra.roomId + '/' + uid + '/' + crypto.randomUUID() : (kind === 'profile' ? 'profiles' : 'verification') + '/' + uid + '/' + crypto.randomUUID();
    const target = ref(storage, path);
    await uploadBytes(target, blob, { contentType });
    return await getDownloadURL(target);
  }
  throw new Error('Las subidas de archivos todavía no están disponibles.');
}
export const uploadChatMedia=(roomId,source,isVoice=false)=>upload('chat',source,{roomId,isVoice});
export const uploadProfileImage=source=>upload('profile',source);
export const uploadVerificationDocument=source=>upload('verification',source);
