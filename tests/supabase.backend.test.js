import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword } from 'firebase/auth';
import { FirestoreRest } from '../supabase/functions/_shared/firestore.js';
import { firebaseVerifier } from '../supabase/functions/_shared/google.js';
import { RuwaService } from '../supabase/functions/_shared/service.js';
import { createHandler } from '../supabase/functions/_shared/handler.js';
let db, service, handler, owner, tenant, outsider, verification;
const apps=[],pending=[],uploads=new Map(),pushes=[];
const identityHeaders=token=>({Authorization:'Bearer '+token,'Content-Type':'application/json'});
async function client(name){const app=initializeApp({apiKey:'demo-key',projectId:'demo-ruwajay'},'supabase-'+name+Date.now());apps.push(app);const auth=getAuth(app);connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});const {user}=await createUserWithEmailAndPassword(auth,name+'-'+crypto.randomUUID()+'@example.test','testing-password');await db.set('users/'+user.uid,{name,role:name==='owner'?'owner':'seeker',email:user.email});return{uid:user.uid,token:await user.getIdToken(),email:user.email};}
async function call(user,action,data,requestId=crypto.randomUUID()){
 const response=await handler(new Request('https://edge.example.test/functions/v1/ruwajay-api',{method:'POST',headers:identityHeaders(user.token),body:JSON.stringify({action,data:{...data,requestId}})}));
 const body=await response.json();if(!response.ok)throw Object.assign(new Error(body.error.message),{status:response.status,code:body.error.code});return body.data;
}
before(async()=>{
  db=new FirestoreRest({projectId:'demo-ruwajay',emulatorHost:'127.0.0.1:8085',tokenProvider:async()=> 'owner'});
  verification=firebaseVerifier('demo-ruwajay',{emulatorHost:'127.0.0.1:9099'});
  const files={upload:async(bucket,path,bytes,mime)=>{uploads.set(bucket+'/'+path,{bytes,mime});return ['property-images','profile-images'].includes(bucket)?'https://media.example.test/'+bucket+'/'+path:'supabase://'+bucket+'/'+path;},signedUrl:async(bucket,path)=>({url:'https://signed.example.test/'+bucket+'/'+path,expiresIn:300})};
  service=new RuwaService({db,files,push:async(token,notice)=>{pushes.push({token,notice});return 'sent';}});
  handler=createHandler({service,verifyIdentity:verification,cronSecret:'test-secret-'+ 'x'.repeat(32),allowedOrigins:['https://ruwa-jay.web.app'],onError:error=>console.error('API test error',error.name,error.code||'',error.message),waitUntil:promise=>pending.push(promise)});
  owner=await client('owner');tenant=await client('tenant');outsider=await client('outsider');
  await db.set('users/'+owner.uid+'/devices/test-device',{token:'owner-test-token',platform:'android'});
  await db.set('properties/edge-house',{ownerId:owner.uid,title:'Casa compartida',price:3500,status:'disponible',images:['https://example.test/photo.jpg'],coordinates:{lat:14.6,lng:-90.5},verified:false});
});
after(async()=>{await Promise.allSettled(pending);await Promise.all(apps.map(deleteApp));});
let visitId,room;
test('Supabase gateway reserves atomically, prevents forged identity and retries idempotently',async()=>{
  const date=new Date(Date.now()+3*86400000).toISOString().slice(0,10),data={propertyId:'edge-house',date,time:'10:00'};
  const requestId=crypto.randomUUID();const attempts=await Promise.allSettled([call(tenant,'createVisit',data,requestId),call(outsider,'createVisit',data)]);
  assert.equal(attempts.filter(r=>r.status==='fulfilled').length,1,attempts.map(r=>r.status==='rejected'?r.reason.message:'ok').join('; '));
  const winner=attempts[0].status==='fulfilled'?tenant:outsider;
  visitId=attempts.find(r=>r.status==='fulfilled').value.id;
  if(winner===tenant)assert.deepEqual(await call(tenant,'createVisit',data,requestId),{id:visitId});
  await assert.rejects(call(winner,'changeVisitStatus',{visitId,status:'confirmada'}),error=>error.status===403);
  const accepted=await call(owner,'changeVisitStatus',{visitId,status:'confirmada'});
  room=accepted.conversationId;
  assert.equal((await call(winner,'openConversation',{propertyId:'edge-house',ownerId:owner.uid,seekerId:winner.uid})).id,room);
  // Keep tenant as the winning participant for later tests, whichever request won the race.
  if(winner===outsider)[tenant,outsider]=[outsider,tenant];
  await Promise.allSettled(pending);
});
test('Server owns sender identity and message summary; private files reject outsiders and suspension',async()=>{
  const auth=await verification(tenant.token);
  const media=await service.upload(auth,{kind:'chat',roomId:room,mime:'audio/webm;codecs=opus',bytes:new Uint8Array([1,2,3])});
  assert.match(media.url,/^supabase:\/\/chat-media\/chat\//);
  await assert.rejects(call(outsider,'resolveMedia',{reference:media.url}),error=>error.status===403);
  const resolved=await call(owner,'resolveMedia',{reference:media.url});assert.equal(resolved.expiresIn,300);
  const idempotency=crypto.randomUUID();const sent=await call(tenant,'sendMessage',{roomId:room,text:'Audio',type:'audio',mediaUrl:media.url,senderId:owner.uid,senderName:'Forged'},idempotency);
  assert.deepEqual(await call(tenant,'sendMessage',{roomId:room,text:'Audio',type:'audio',mediaUrl:media.url,senderId:owner.uid,senderName:'Forged'},idempotency),sent);
  const message=await db.get('conversations/'+room+'/messages/'+sent.id),summary=await db.get('conversations/'+room);
  assert.equal(message.data.senderId,tenant.uid);assert.notEqual(message.data.senderName,'Forged');assert.equal(summary.data.lastMessageId,sent.id);
  await Promise.allSettled(pending);await service.drainJobs();
  assert.equal((await db.get('users/'+owner.uid+'/notifications/message_'+sent.id)).exists,true);
  const alerts=pushes.filter(push=>push.notice.eventId==='message_'+sent.id);
  assert.equal(alerts.length,1,'Retrying the send must not duplicate the notification');
  assert.equal(alerts[0].token,'owner-test-token');
  assert.equal(alerts[0].notice.path,'/chat?conversation='+encodeURIComponent(room));
  assert.equal(alerts[0].notice.body,'Audio');
  await db.set('users/'+outsider.uid,{suspended:true},{merge:true});
  await assert.rejects(call(outsider,'createVisit',{propertyId:'edge-house',date:'2099-01-01',time:'11:00'}),error=>error.status===403);
  await assert.rejects(service.upload(await verification(outsider.token),{kind:'profile',mime:'image/jpeg',bytes:new Uint8Array([1])}),error=>error.status===403);
  await db.set('users/'+outsider.uid,{suspended:false},{merge:true});
});

test('Video and quoted replies keep their notification job and validated content',async()=>{
  const auth=await verification(tenant.token);
  const video=await service.upload(auth,{kind:'chat',roomId:room,mime:'video/mp4',bytes:new Uint8Array([1,2,3])});
  const first=await call(tenant,'sendMessage',{roomId:room,type:'video',mediaUrl:video.url});
  const reply=await call(owner,'sendMessage',{roomId:room,type:'text',text:'Respuesta',replyTo:{id:first.id,text:'Forged quote',senderName:'Forged author'}});
  const stored=await db.get('conversations/'+room+'/messages/'+reply.id);
  assert.equal(stored.data.replyTo.id,first.id);
  assert.equal(stored.data.replyTo.text,'Video');
  assert.notEqual(stored.data.replyTo.senderName,'Forged author');
  await assert.rejects(call(owner,'sendMessage',{roomId:room,text:'Invalid quote',replyTo:{id:'missing-message'}}),error=>error.status===400);
  await Promise.allSettled(pending);await service.drainJobs();
  assert.equal(pushes.filter(push=>push.notice.eventId==='message_'+first.id).length,1);
});
test('Owner edits preserve ownership, zero deposit and server metadata; roles cannot escalate',async()=>{
  await call(owner,'saveProperty',{property:{id:'edge-house',title:'Casa editada',price:3000,deposit:0,ownerId:owner.uid,images:['https://example.test/photo.jpg'],coordinates:{lat:0,lng:0},verified:true}});
  const property=await db.get('properties/edge-house');assert.equal(property.data.verified,false);assert.equal(property.data.deposit,0);assert.equal(property.data.ownerId,owner.uid);
  await assert.rejects(call(tenant,'saveProperty',{property:{id:'edge-house',title:'Stolen',price:1,images:['https://example.test/a'],coordinates:{lat:1,lng:1}}}),error=>error.status===403);
  await assert.rejects(call(tenant,'updateProfile',{profile:{role:'admin'}}),error=>error.status===403);
  await call(owner,'updateProfile',{profile:{name:'Owner actualizado',phone:'5555',bio:'Perfil compartido'}});
  await Promise.allSettled(pending);await service.drainJobs();
  assert.equal((await db.get('properties/edge-house')).data.ownerName,'Owner actualizado');
  assert.equal((await db.get('conversations/'+room)).data.ownerName,'Owner actualizado');
});
test('Cancellation releases only the matching slot; cron rejects public calls',async()=>{
  await call(tenant,'changeVisitStatus',{visitId,status:'cancelada'});
  const visit=await db.get('visits/'+visitId);assert.equal(visit.data.status,'cancelada');assert.equal((await db.get('visit_slots/'+visit.data.slotId)).exists,false);
  const rejected=await handler(new Request('https://edge.example.test/ruwajay-api/scheduled',{method:'POST',body:'{}'}));assert.equal(rejected.status,401);
  const unauthorized=await handler(new Request('https://edge.example.test/ruwajay-api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'sendMessage',data:{}})}));assert.equal(unauthorized.status,401);
  const wrongOrigin=await handler(new Request('https://edge.example.test/ruwajay-api',{method:'POST',headers:{...identityHeaders(owner.token),Origin:'https://other.example.test'},body:'{}'}));assert.equal(wrongOrigin.status,403);
});

test('Pagination preserves all rows; maintenance expires verified visits and scans only hourly',async()=>{
  await Promise.allSettled(pending);
  await db.commit(Array.from({length:201},(_,i)=>db.write('pagination_samples/'+String(i).padStart(4,'0'),{n:i},{create:true})));
  const rows=await db.queryAll('pagination_samples');assert.equal(rows.length,201);assert.equal(new Set(rows.map(row=>row.id)).size,201);
  const old=new Date(Date.now()-8*86400000),visit={schemaVersion:2,propertyId:'edge-house',ownerId:owner.uid,tenantId:tenant.uid,date:'2026-01-01',time:'09:00',status:'pendiente',createdAt:old};
  const {slotId}=await import('../functions/domain.js');const slot=slotId(visit.propertyId,visit.date,visit.time);
  await db.set('visits/old-verified',visit);await db.set('visit_slots/'+slot,{visitId:'old-verified'});
  await db.set('visits/old-unverified',{...visit,schemaVersion:1});
  await service.scheduled();assert.equal((await db.get('visits/old-verified')).data.status,'vencida');assert.equal((await db.get('visit_slots/'+slot)).exists,false);assert.equal((await db.get('visits/old-unverified')).data.status,'pendiente');
  const state=await db.get('server_state/maintenance');assert.ok(state.data.nextScan.toMillis()>Date.now());
  await db.set('visits/not-scanned-yet',visit);await service.scheduled();assert.equal((await db.get('visits/not-scanned-yet')).data.status,'pendiente');
});
