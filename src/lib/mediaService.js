import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { firebaseAuth, storage } from './firebase';
import { usesSupabaseBackend, uploadBackendMedia } from './backendService';
async function upload(kind,source,extra={}){
  const uid=firebaseAuth?.currentUser?.uid;if(!uid)throw new Error('Debes iniciar sesión para subir archivos.');
  if(usesSupabaseBackend)return uploadBackendMedia(kind,source,{...extra,expectedUid:uid});
  if(!(import.meta.env.DEV&&import.meta.env.VITE_FIREBASE_EMULATORS==='true'))throw new Error('Las subidas de archivos todavía no están disponibles.');
  const blob=source instanceof Blob?source:await(await fetch(source)).blob();
  if(!blob.size||blob.size>(kind==='chat'?20:8)*1024*1024)throw new Error('Archivo inválido o demasiado grande.');
  if(firebaseAuth.currentUser?.uid!==uid)throw new Error('La sesión cambió.');
  const path=kind==='chat'?'chat/'+extra.roomId+'/'+uid+'/'+crypto.randomUUID():(kind==='profile'?'profiles':'verification')+'/'+uid+'/'+crypto.randomUUID();
  const target=ref(storage,path);await uploadBytes(target,blob,{contentType:blob.type});return getDownloadURL(target);
}
export const uploadChatMedia=(roomId,source)=>upload('chat',source,{roomId});
export const uploadProfileImage=source=>upload('profile',source);
export const uploadVerificationDocument=source=>upload('verification',source);
