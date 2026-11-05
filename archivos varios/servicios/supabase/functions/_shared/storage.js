import { ApiError, assert } from './errors.js';
export class SupabaseFiles {
  constructor({url,serviceKey,fetcher=fetch}){assert(/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)&&serviceKey,500,'configuration','Supabase Storage no está configurado.');this.url=url;this.key=serviceKey;this.fetcher=fetcher;}
  async request(path,{method='POST',body=null,contentType='application/json'}={}){
    const response=await this.fetcher(this.url+'/storage/v1/'+path,{method,headers:{apikey:this.key,Authorization:'Bearer '+this.key,'Content-Type':contentType,'x-upsert':'false'},body,signal:AbortSignal.timeout(30000)});
    if (!response.ok) {
      const detail = await response.json().catch(() => ({}));
      const reason = String(detail.message || detail.error || '').toLowerCase();
      if (/bucket.*not found|bucket.*does not exist/.test(reason)) {
        throw new ApiError(503,'storage-not-configured','Falta configurar el bucket de archivos en Supabase Storage.');
      }
      if (/mime|content.?type/.test(reason)) {
        throw new ApiError(400,'storage-format-not-allowed','Supabase Storage no permite este formato. Actualiza los formatos del bucket de chat.');
      }
      if (response.status === 413 || /size|too large|maximum/.test(reason)) {
        throw new ApiError(413,'resource-exhausted','El archivo supera el tamaño permitido por el almacenamiento.');
      }
      if ([401,403].includes(response.status)) {
        throw new ApiError(503,'storage-configuration','El servidor no tiene acceso a Supabase Storage. Revisa su configuración.');
      }
      throw new ApiError(503,'unavailable','No se pudo completar la operación de archivos.');
    }
    return response.json();
  }
  encoded(bucket,path){return encodeURIComponent(bucket)+'/'+path.split('/').map(encodeURIComponent).join('/');}
  async upload(bucket,path,bytes,mime){await this.request('object/'+this.encoded(bucket,path),{body:bytes,contentType:mime});return ['property-images','profile-images'].includes(bucket)?this.url+'/storage/v1/object/public/'+this.encoded(bucket,path):'supabase://'+bucket+'/'+path;}
  async signedUrl(bucket,path){
    const data=await this.request('object/sign/'+this.encoded(bucket,path),{body:JSON.stringify({expiresIn:86400})});
    const rawUrl = data?.signedURL || data?.signedUrl;
    assert(typeof rawUrl === 'string' && rawUrl.length > 0, 503, 'unavailable', 'Respuesta de archivo inválida.');
    const url = rawUrl.startsWith('http://') || rawUrl.startsWith('https://')
      ? rawUrl
      : this.url + (rawUrl.startsWith('/storage/v1') ? '' : '/storage/v1') + (rawUrl.startsWith('/') ? '' : '/') + rawUrl;
    return {url, expiresIn: 86400};
  }
}
export function parseMediaReference(reference){
  assert(typeof reference==='string' && reference.startsWith('supabase://'),400,'invalid-argument','Referencia de archivo inválida.');
  const parts=reference.slice('supabase://'.length).split('/');
  assert(parts.every(part=>part&&part!=='.'&&part!=='..'&&!/[\\?#%]/.test(part)),400,'invalid-argument','Ruta de archivo inválida.');
  const bucket=parts.shift();assert(['chat-media','verification'].includes(bucket),400,'invalid-argument','Archivo privado desconocido.');return{bucket,path:parts.join('/'),parts};
}
