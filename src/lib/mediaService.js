import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { firebaseAuth, storage } from './firebase';
import { usesSupabaseBackend, uploadBackendMedia } from './backendService';

async function upload(kind, source, extra = {}) {
  const uid = firebaseAuth?.currentUser?.uid;
  if (!uid) throw new Error('Debes iniciar sesión para subir archivos.');
  if (usesSupabaseBackend) return uploadBackendMedia(kind, source, { ...extra, expectedUid: uid });

  try {
    if (!storage) return source;

    // Conversión segura de dataURL o Blob sin depender exclusivamente de fetch
    let blob;
    if (source instanceof Blob) {
      blob = source;
    } else if (typeof source === 'string' && source.startsWith('data:')) {
      const arr = source.split(',');
      const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      blob = new Blob([u8arr], { type: mime });
    } else {
      blob = await (await fetch(source)).blob();
    }

    if (!blob.size || blob.size > (kind === 'chat' ? 20 : 8) * 1024 * 1024)
      throw new Error('Archivo inválido o demasiado grande.');
    if (firebaseAuth.currentUser?.uid !== uid) throw new Error('La sesión cambió.');
    const path =
      kind === 'chat'
        ? 'chat/' + extra.roomId + '/' + uid + '/' + crypto.randomUUID()
        : 'profiles/' + uid + '/' + (kind === 'verification' ? 'dpi_' : '') + crypto.randomUUID() + '.jpg';
    const target = ref(storage, path);

    // Timeout de 3.5 segundos para no bloquear la aplicación si Storage no responde
    const uploadTask = (async () => {
      await uploadBytes(target, blob, { contentType: blob.type || 'image/jpeg' });
      return await getDownloadURL(target);
    })();

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Storage upload timeout')), 3500)
    );

    return await Promise.race([uploadTask, timeoutPromise]);
  } catch (err) {
    console.warn('[mediaService] Upload a Storage no disponible o expiró, usando fuente directa:', err?.message);
    return source;
  }
}

export const uploadChatMedia = (roomId, source) => upload('chat', source, { roomId });
export const uploadProfileImage = source => upload('profile', source);
export const uploadVerificationDocument = source => upload('verification', source);
