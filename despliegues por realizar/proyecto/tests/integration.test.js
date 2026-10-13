import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFunctions, connectFunctionsEmulator, httpsCallable } from 'firebase/functions';
import { getFirestore, connectFirestoreEmulator, doc, setDoc, getDoc, collection, writeBatch, serverTimestamp } from 'firebase/firestore';
let env, owner, tenant, stranger;
const apps=[];
async function client(name) {
  const app=initializeApp({apiKey:'demo-key',projectId:'demo-ruwajay'},name);apps.push(app);
  const auth=getAuth(app);connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});
  const functions=getFunctions(app,'us-central1');connectFunctionsEmulator(functions,'127.0.0.1',5001);
  const db=getFirestore(app);connectFirestoreEmulator(db,'127.0.0.1',8085);
  const {user}=await createUserWithEmailAndPassword(auth,`${name}-${Date.now()}@example.test`,'testing-password');
  await setDoc(doc(db,'users',user.uid),{name,email:user.email,role:name==='owner'?'owner':'seeker'});
  return {uid:user.uid,db,call:async(name,data)=>(await httpsCallable(functions,name)(data)).data};
}
before(async()=>{
  env=await initializeTestEnvironment({projectId:'demo-ruwajay',firestore:{rules:await readFile('firestore.rules','utf8')}});
  await env.clearFirestore();
  owner=await client('owner');tenant=await client('tenant');stranger=await client('stranger');
  await setDoc(doc(owner.db,'properties','house'),{ownerId:owner.uid,title:'House',price:3500,status:'disponible',images:['https://example.test/photo.jpg'],verified:false});
});
after(async()=>{await Promise.all(apps.map(deleteApp));await env?.cleanup();});
test('Concurrent requests reserve a slot once; only owner confirms and opens shared chat',async()=>{
  const date=new Date(Date.now()+3*86400000).toISOString().slice(0,10);
  const data={propertyId:'house',date,time:'10:00',notes:'Integration test'};
  const attempts=await Promise.allSettled([tenant.call('createVisit',data),stranger.call('createVisit',data)]);
  assert.equal(attempts.filter(a=>a.status==='fulfilled').length,1);
  const winning=attempts[0].status==='fulfilled'?tenant:stranger;
  const visitId=attempts.find(a=>a.status==='fulfilled').value.id;
  await assert.rejects(winning.call('changeVisitStatus',{visitId,status:'confirmada'}));
  const confirmed=await owner.call('changeVisitStatus',{visitId,status:'confirmada'});
  const opened=await winning.call('openConversation',{propertyId:'house',ownerId:owner.uid,seekerId:winning.uid});
  assert.equal(opened.id,confirmed.conversationId);
  const room=await getDoc(doc(winning.db,'conversations',opened.id));
  assert.deepEqual(room.data().participants,[winning.uid,owner.uid]);
  const message=doc(collection(winning.db,'conversations',opened.id,'messages'));
  const batch=writeBatch(winning.db);
  batch.set(message,{senderId:winning.uid,senderName:winning===tenant?'tenant':'stranger',text:'Shared message',type:'text',createdAt:serverTimestamp()});
  batch.update(doc(winning.db,'conversations',opened.id),{lastSenderId:winning.uid,lastMessage:'Shared message',lastMessageId:message.id,lastMessageTimestamp:serverTimestamp()});
  await batch.commit();
  assert.equal((await getDoc(doc(owner.db,'conversations',opened.id,'messages',message.id))).data().text,'Shared message');
  let notice;
  for(let attempt=0;attempt<50;attempt++) {
    notice=await getDoc(doc(owner.db,'users',owner.uid,'notifications',`message_${message.id}`));
    if(notice.exists())break;
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  assert.ok(notice.exists(),'Incoming message creates a persistent notification for the other participant');
  await setDoc(doc(owner.db,'lease_drafts',opened.id),{participants:[winning.uid,owner.uid],ownerId:owner.uid,conversationId:opened.id,propertyId:'house',
    terms:{monthlyRent:3500,depositAmount:0,durationMonths:12},updatedAt:serverTimestamp()});
  assert.equal((await getDoc(doc(winning.db,'lease_drafts',opened.id))).data().terms.depositAmount,0);
  await winning.call('changeVisitStatus',{visitId,status:'cancelada'});
  const next=await winning.call('createVisit',data);
  assert.ok(next.id);
});
