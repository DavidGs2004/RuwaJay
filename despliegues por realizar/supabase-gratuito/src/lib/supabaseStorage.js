// Compatibility export: authenticated uploads now pass through the Supabase API.
import { firebaseAuth } from './firebase';
import { uploadBackendMedia } from './backendService';
export async function uploadPropertyImagesToSupabase(files,propertyId,ownerId,onProgress=()=>{}){
  if(!firebaseAuth?.currentUser||firebaseAuth.currentUser.uid!==ownerId)throw new Error('La sesión cambió.');
  if(!files?.length||files.length>8)throw new Error('Sube entre una y ocho fotografías.');
  let complete=0;
  return Promise.all(files.map(async file=>{if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>8*1024*1024)throw new Error('Fotografía inválida.');const url=await uploadBackendMedia('property',file,{propertyId,expectedUid:ownerId});onProgress(Math.round(++complete/files.length*100));return url;}));
}
