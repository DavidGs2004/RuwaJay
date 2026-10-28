import { FirestoreRest } from '../_shared/firestore.js';
import { googleTokenProvider, firebaseVerifier } from '../_shared/google.js';
import { SupabaseFiles } from '../_shared/storage.js';
import { RuwaService } from '../_shared/service.js';
import { createHandler } from '../_shared/handler.js';

declare const EdgeRuntime: {waitUntil(promise:Promise<unknown>):void};
type Notice={uid:string;title:string;body:string;path:string;eventId:string;type?:string;callId?:string;callerId?:string;callerName?:string;senderName?:string;roomId?:string};
const projectId='ruwa-jay';
let serviceAccount: any = {};
try {
  const raw = Deno.env.get('RUWA_FIREBASE_SERVICE_ACCOUNT') || '{}';
  serviceAccount = typeof raw === 'string' ? JSON.parse(raw) : raw;
} catch (err) {
  console.error('Error al parsear RUWA_FIREBASE_SERVICE_ACCOUNT:', err);
}

let tokenProvider: () => Promise<string>;
try {
  tokenProvider = googleTokenProvider(serviceAccount);
} catch (err) {
  console.warn('Advertencia: RUWA_FIREBASE_SERVICE_ACCOUNT no está configurada correctamente:', err);
  tokenProvider = () => { throw err; };
}

const db=new FirestoreRest({projectId,tokenProvider});
const files=new SupabaseFiles({url:Deno.env.get('SUPABASE_URL'),serviceKey:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')});
const push=async(token:string,notice:Notice)=>{
  const isCall = notice.type === 'call' || (notice as any).type === 'call';
  const response=await fetch('https://fcm.googleapis.com/v1/projects/'+projectId+'/messages:send',{
    method:'POST',
    headers:{Authorization:'Bearer '+await tokenProvider(),'Content-Type':'application/json'},
    body:JSON.stringify({
      message:{
        token,
        data:{
            recipientId:notice.uid,
          path:notice.path,
          eventId:notice.eventId,
          title:notice.title,
          body:notice.body,
          senderName:notice.senderName || notice.title,
          type: isCall ? 'call' : 'message',
          callId: notice.callId || '',
          callerId: notice.callerId || '',
          callerName: notice.callerName || '',
          roomId: notice.roomId || ''
        },
        android:{
          priority:'HIGH',
          ...(isCall ? {ttl:'45s'} : {})
        },
        webpush:{notification:{title:notice.title,body:notice.body,tag:notice.eventId},fcm_options:{link:'https://ruwa-jay.web.app'+notice.path}}
      }
    }),
    signal:AbortSignal.timeout(15000)
  });
  if(response.ok)return 'sent';
  const error=await response.json();
  if(error.error?.details?.some((detail:any)=>detail.errorCode==='UNREGISTERED'))return 'invalid';
  throw new Error('FCM delivery failed: ' + JSON.stringify(error));
};
const service=new RuwaService({db,files,push});
const handler=createHandler({
  service,
  verifyIdentity:firebaseVerifier(projectId),
  cronSecret:Deno.env.get('RUWA_CRON_SECRET'),
  onError:(err:any)=>console.error('[RUWAJAY_API_ERROR]',err),
  allowedOrigins:[
    'https://ruwa-jay.web.app',
    'https://ruwa-jay.firebaseapp.com',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:4173',
    ...(Deno.env.get('RUWA_EXTRA_ORIGINS')||'').split(',').filter(Boolean)
  ],
  waitUntil:promise=>EdgeRuntime.waitUntil(promise)
});
Deno.serve(handler);
