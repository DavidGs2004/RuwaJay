import { ApiError, assert } from './errors.js';
async function boundedBody(request,limit){
  assert(Number(request.headers.get('Content-Length')||0)<=limit,413,'resource-exhausted','Solicitud demasiado grande.');
  const reader=request.body?.getReader();assert(reader,400,'invalid-argument','Solicitud vacía.');const chunks=[];let size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();throw new ApiError(413,'resource-exhausted','Solicitud demasiado grande.');}chunks.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}return bytes;
}
/** @param {{service: any, verifyIdentity: any, cronSecret: string|undefined, allowedOrigins?: string[], onError?: (error:any)=>void, waitUntil?: (promise:Promise<any>)=>void}} options */
export function createHandler({service,verifyIdentity,cronSecret,allowedOrigins=[],onError=()=>{},waitUntil=promise=>promise.catch(()=>{})}) {
  const origins=new Set(allowedOrigins);
  return async request=>{
    const origin=request.headers.get('Origin');
    const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin',...(origin&&origins.has(origin)?{'Access-Control-Allow-Origin':origin}:{})};
    const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
    try {
      if(origin&&!origins.has(origin))throw new ApiError(403,'permission-denied','Origen no autorizado.');
      if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'POST, GET, OPTIONS','Access-Control-Allow-Headers':'authorization, content-type, apikey, x-client-info, x-ruwa-cron-secret'}});
      const url=new URL(request.url),route=url.pathname.split('/').filter(Boolean).at(-1);
      if(request.method==='GET'&&route==='health')return json({project:service.db.projectId,backend:'supabase',version:1});
      assert(request.method==='POST',405,'invalid-argument','Método no permitido.');
      if(route==='scheduled'){
        assert(typeof cronSecret==='string'&&cronSecret.length>=32&&request.headers.get('x-ruwa-cron-secret')===cronSecret,401,'unauthenticated','Tarea programada no autorizada.');
        return json({data:await service.scheduled()});
      }
      const bearer=request.headers.get('Authorization')?.match(/^Bearer (.+)$/i)?.[1];
      const identity=await verifyIdentity(bearer);
      if(route==='upload') {
        const bytes=await boundedBody(request,20*1024*1024);
        return json({data:await service.upload(identity,{kind:url.searchParams.get('kind'),roomId:url.searchParams.get('roomId'),propertyId:url.searchParams.get('propertyId'),mime:request.headers.get('Content-Type'),bytes})});
      }
      assert(route==='ruwajay-api'||route==='api',404,'not-found','Ruta desconocida.');
      const raw=new TextDecoder().decode(await boundedBody(request,2*1024*1024));
      let input;try{input=JSON.parse(raw);}catch{throw new ApiError(400,'invalid-argument','Solicitud JSON inválida.');}
      assert(input&&typeof input.action==='string'&&input.data&&typeof input.data==='object'&&!Array.isArray(input.data),400,'invalid-argument','Solicitud inválida.');
      const result=await service.call(identity,input.action,input.data);
      if(input.action!=='resolveMedia')waitUntil(service.drainJobs().catch(()=>{}));
      return json({data:result});
    } catch(error){onError(error);if(error instanceof ApiError)return json({error:{code:error.code,message:error.message}},error.status);return json({error:{code:'internal',message:'No se pudo completar la operación. Inténtalo de nuevo.'}},500);}
  };
}
