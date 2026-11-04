import { createMediaResolver } from './mediaResolver';
import { firebaseAuth, functions } from './firebase';
import { httpsCallable } from 'firebase/functions';
const defaultSupabaseUrl = 'https://yrwrvmcmxqmvkwmsuegc.supabase.co';
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || defaultSupabaseUrl).replace(/\/$/, '');
export const backendUrl = (import.meta.env.VITE_RUWA_BACKEND_URL || (supabaseUrl ? supabaseUrl + '/functions/v1/ruwajay-api' : '')).replace(/\/$/, '');
export const usesSupabaseBackend = Boolean(backendUrl);
const legacyEmulators = import.meta.env.DEV && import.meta.env.VITE_FIREBASE_EMULATORS === 'true' && !backendUrl;
// Solo usar operaciones del servidor si hay un backend configurado O emuladores activos
export const usesServerOperations = Boolean(backendUrl) || legacyEmulators;

function requireSession(expectedUid){const user=firebaseAuth?.currentUser;if(!user||expectedUid&&user.uid!==expectedUid)throw new Error('La sesión cambió. Inténtalo con la cuenta actual.');return user;}
async function authorizedRequest(url,options,expectedUid){
  const account=requireSession(expectedUid),uid=account.uid;let response;
  for(let attempt=0;attempt<2;attempt++){
    const token=await account.getIdToken(attempt===1);requireSession(uid);
    try {
      response=await fetch(url,{...options,headers:{...options.headers,Authorization:'Bearer '+token},signal:AbortSignal.timeout(60000)});
    } catch (networkErr) {
      if (attempt === 1) {
        const error = new Error('No se pudo conectar con el servidor. Revisa tu conexión a internet o intenta de nuevo.');
        error.code = 'network-error';
        error.status = 0;
        throw error;
      }
      continue;
    }
    if(response.status!==401)break;
  }
  requireSession(uid);
  let result = null;
  try {
    result = await response.json();
  } catch {
    result = null;
  }
  if (!response.ok || result?.error) {
    let message = result?.error?.message;
    if (response.status === 429 || result?.error?.code === 'RESOURCE_EXHAUSTED' || result?.code === 'RESOURCE_EXHAUSTED') {
      message = 'El servidor alcanzó el límite temporal de solicitudes. Por favor espera un momento o intenta más tarde.';
    }
    const error = new Error(message || `Error del servidor (${response.status || '503'}).`);
    error.status = response.status;
    error.code = result?.error?.code || result?.code || (response.status === 429 ? 'resource-exhausted' : 'unavailable');
    throw error;
  }
  return result.data;
}
export async function callBackend(action,data={}, {expectedUid=null,requestId=crypto.randomUUID()}={}){
  if(legacyEmulators)return(await httpsCallable(functions,action)(data)).data;
  if(!backendUrl)throw new Error('Este servicio todavía no está disponible. Contacta al administrador.');
  return authorizedRequest(backendUrl,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,data:{...data,requestId}})},expectedUid);
}
export async function uploadBackendMedia(kind,source,{roomId,propertyId,expectedUid=null}={}){
  if(!backendUrl)throw new Error('Las subidas de archivos todavía no están disponibles.');
  const account=requireSession(expectedUid),uid=account.uid;
  const blob=source instanceof Blob?source:await(await fetch(source)).blob();
  if(!blob.size||blob.size>(kind==='chat'?20:8)*1024*1024)throw new Error('El archivo está vacío o supera el tamaño permitido.');
  const url=new URL(backendUrl+'/upload');url.searchParams.set('kind',kind);if(roomId)url.searchParams.set('roomId',roomId);if(propertyId)url.searchParams.set('propertyId',propertyId);
  let contentType = blob.type;
  if (!contentType || contentType === 'application/octet-stream') {
    if (kind === 'chat') contentType = 'audio/webm';
    else contentType = 'image/jpeg';
  }
  const result=await authorizedRequest(url,{method:'POST',headers:{'Content-Type':contentType},body:blob},uid);return result.url;
}
const privateMedia = createMediaResolver({
  getUid: () => firebaseAuth?.currentUser?.uid || null,
  resolve: (reference, uid) => callBackend('resolveMedia', { reference }, { expectedUid: uid }),
});
export const getCachedMediaUrl = privateMedia.cachedUrl;
export const resolveMediaUrl = privateMedia.resolveUrl;
