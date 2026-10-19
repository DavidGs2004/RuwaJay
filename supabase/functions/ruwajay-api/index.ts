import { FirestoreRest } from '../_shared/firestore.js';
import { googleTokenProvider, firebaseVerifier } from '../_shared/google.js';
import { SupabaseFiles } from '../_shared/storage.js';
import { RuwaService } from '../_shared/service.js';
import { createHandler } from '../_shared/handler.js';

declare const EdgeRuntime: {waitUntil(promise:Promise<unknown>):void};
type Notice={title:string;body:string;path:string;eventId:string};
const projectId='ruwa-jay';
// Base p?blica de la web, incluida su subcarpeta cuando se aloja en el VPS.
const webBase=new URL((Deno.env.get('RUWA_WEB_URL')||'https://ruwa-jay.web.app').replace(/\/$/,'')+'/');
if(webBase.protocol!=='https:')throw new Error('RUWA_WEB_URL debe usar HTTPS.');
const tokenProvider=googleTokenProvider(JSON.parse(Deno.env.get('RUWA_FIREBASE_SERVICE_ACCOUNT') || '{}'));
const db=new FirestoreRest({projectId,tokenProvider});
const files=new SupabaseFiles({url:Deno.env.get('SUPABASE_URL'),serviceKey:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')});
const push=async(token:string,notice:Notice)=>{
  const response=await fetch('https://fcm.googleapis.com/v1/projects/'+projectId+'/messages:send',{method:'POST',headers:{Authorization:'Bearer '+await tokenProvider(),'Content-Type':'application/json'},body:JSON.stringify({message:{token,notification:{title:notice.title,body:notice.body},data:{path:notice.path,eventId:notice.eventId,title:notice.title,body:notice.body},android:{priority:'HIGH',notification:{channel_id:'ruwajay_messages',tag:notice.eventId,sound:'default',default_sound:true,default_vibrate_timings:true,notification_priority:'PRIORITY_MAX',visibility:'PUBLIC'}},webpush:{notification:{tag:notice.eventId},fcm_options:{link:new URL(notice.path.replace(/^\//,''),webBase).href}}}}),signal:AbortSignal.timeout(15000)});
  if(response.ok)return 'sent';const error=await response.json();if(error.error?.details?.some((detail:any)=>detail.errorCode==='UNREGISTERED'))return 'invalid';throw new Error('FCM delivery failed');
};
const service=new RuwaService({db,files,push});
const handler=createHandler({service,verifyIdentity:firebaseVerifier(projectId),cronSecret:Deno.env.get('RUWA_CRON_SECRET'),allowedOrigins:['https://ruwa-jay.web.app','https://ruwa-jay.firebaseapp.com',...(Deno.env.get('RUWA_EXTRA_ORIGINS')||'').split(',').filter(Boolean)],waitUntil:promise=>EdgeRuntime.waitUntil(promise)});
Deno.serve(handler);
