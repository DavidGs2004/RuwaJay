import { firebaseAuth, functions } from './firebase';
import { httpsCallable } from 'firebase/functions';
const supabaseUrl=(import.meta.env.VITE_SUPABASE_URL||'').replace(/\/$/,'');
export const backendUrl=(import.meta.env.VITE_RUWA_BACKEND_URL||(supabaseUrl?supabaseUrl+'/functions/v1/ruwajay-api':'')).replace(/\/$/,'');
export const usesSupabaseBackend=Boolean(backendUrl);
const legacyEmulators = import.meta.env.DEV && import.meta.env.VITE_FIREBASE_EMULATORS === 'true' && !backendUrl;
// Solo usar operaciones del servidor si hay un backend configurado O emuladores activos
export const usesServerOperations = Boolean(backendUrl) || legacyEmulators;

function requireSession(expectedUid){const user=firebaseAuth?.currentUser;if(!user||expectedUid&&user.uid!==expectedUid)throw new Error('La sesión cambió. Inténtalo con la cuenta actual.');return user;}
async function authorizedRequest(url,options,expectedUid){
  const account=requireSession(expectedUid),uid=account.uid;let response;
  for(let attempt=0;attempt<2;attempt++){
    const token=await account.getIdToken(attempt===1);requireSession(uid);
    response=await fetch(url,{...options,headers:{...options.headers,Authorization:'Bearer '+token},signal:AbortSignal.timeout(60000)});
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
    throw new Error(result?.error?.message || `Error del servidor (${response.status || '503'}).`);
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
  const contentType = blob.type || (kind === 'chat' ? 'audio/webm' : 'application/octet-stream');
  const result=await authorizedRequest(url,{method:'POST',headers:{'Content-Type':contentType},body:blob},uid);return result.url;
}
const mediaCache = new Map();
export function getCachedMediaUrl(reference) {
  if (!reference) return '';
  if (!reference.startsWith('supabase://')) return reference;
  const entry = mediaCache.get(reference);
  if (!entry || entry.uid !== firebaseAuth?.currentUser?.uid || entry.expiresAt <= Date.now()) {
    mediaCache.delete(reference);
    return null;
  }
  return entry.url;
}
export async function resolveMediaUrl(reference){
  if(!reference?.startsWith('supabase://'))return reference;
  const cached = getCachedMediaUrl(reference);
  if(cached) return cached;
  const uid = requireSession().uid;
  try {
    const res = await callBackend('resolveMedia',{reference},{expectedUid:uid});
    const url = res?.url || null;
    requireSession(uid);
    if (url) mediaCache.set(reference, {url,uid,expiresAt:Date.now()+Math.max(0,(Number(res.expiresIn)||300)-60)*1000});
    return url;
  } catch (err) {
    mediaCache.delete(reference);
    throw err;
  }
}
