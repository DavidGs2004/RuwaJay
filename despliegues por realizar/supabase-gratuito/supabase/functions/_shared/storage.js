import { assert } from './errors.js';
export class SupabaseFiles {
  constructor({url,serviceKey,fetcher=fetch}){assert(/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)&&serviceKey,500,'configuration','Supabase Storage no está configurado.');this.url=url;this.key=serviceKey;this.fetcher=fetcher;}
  async request(path,{method='POST',body=null,contentType='application/json'}={}){
    const response=await this.fetcher(this.url+'/storage/v1/'+path,{method,headers:{apikey:this.key,Authorization:'Bearer '+this.key,'Content-Type':contentType,'x-upsert':'false'},body,signal:AbortSignal.timeout(30000)});
    assert(response.ok,503,'unavailable','No se pudo completar la operación de archivos.');return response.json();
  }
  encoded(bucket,path){return encodeURIComponent(bucket)+'/'+path.split('/').map(encodeURIComponent).join('/');}
  async upload(bucket,path,bytes,mime){await this.request('object/'+this.encoded(bucket,path),{body:bytes,contentType:mime});return ['property-images','profile-images'].includes(bucket)?this.url+'/storage/v1/object/public/'+this.encoded(bucket,path):'supabase://'+bucket+'/'+path;}
  async signedUrl(bucket,path){const data=await this.request('object/sign/'+this.encoded(bucket,path),{body:JSON.stringify({expiresIn:300})});assert(typeof data.signedURL==='string' && data.signedURL.startsWith('/object/sign/'),503,'unavailable','Respuesta de archivo inválida.');return{url:this.url+'/storage/v1'+data.signedURL,expiresIn:300};}
}
export function parseMediaReference(reference){
  assert(typeof reference==='string' && reference.startsWith('supabase://'),400,'invalid-argument','Referencia de archivo inválida.');
  const parts=reference.slice('supabase://'.length).split('/');
  assert(parts.every(part=>part&&part!=='.'&&part!=='..'&&!/[\\?#%]/.test(part)),400,'invalid-argument','Ruta de archivo inválida.');
  const bucket=parts.shift();assert(['chat-media','verification'].includes(bucket),400,'invalid-argument','Archivo privado desconocido.');return{bucket,path:parts.join('/'),parts};
}
