import { before, after, beforeEach, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
let env;
before(async()=>{
  env=await initializeTestEnvironment({projectId:'demo-ruwajay',firestore:{rules:await readFile('firestore.rules','utf8')}});
});
after(async()=>{await env?.cleanup();});
beforeEach(async()=>{
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async context=>{
    const db=context.firestore();
    await setDoc(doc(db,'users','tenant'),{role:'seeker',name:'Tenant',suspended:false});
    await setDoc(doc(db,'users','owner'),{role:'owner',name:'Owner'});
    await setDoc(doc(db,'users','admin'),{role:'admin',name:'Admin'});
    await setDoc(doc(db,'conversations','room'),{participants:['tenant','owner'],readAt:{},lastMessage:'',lastSenderId:'owner'});
    await setDoc(doc(db,'visits','visit'),{tenantId:'tenant',ownerId:'owner',propertyId:'house',status:'pendiente'});
  });
});
test('A user cannot grant themselves administrator privileges',async()=>{
  const db=env.authenticatedContext('tenant').firestore();
  await assertFails(updateDoc(doc(db,'users','tenant'),{role:'admin'}));
  await assertFails(updateDoc(doc(db,'users','tenant'),{name:{unexpected:'object'}}));
  await assertSucceeds(updateDoc(doc(db,'users','tenant'),{name:'Updated',role:'owner'}));
});
test('Private profiles cannot be listed or read by strangers',async()=>{
  await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(),'users','tenant')));
  await assertFails(getDoc(doc(env.authenticatedContext('owner').firestore(),'users','tenant')));
  await assertSucceeds(getDoc(doc(env.authenticatedContext('admin').firestore(),'users','tenant')));
});
test('A participant cannot impersonate the other message sender',async()=>{
  const db=env.authenticatedContext('tenant').firestore();
  const message={type:'text',text:'Hello',senderId:'owner',senderName:'Owner',createdAt:serverTimestamp()};
  await assertFails(setDoc(doc(db,'conversations','room','messages','bad'),message));
  await assertSucceeds(setDoc(doc(db,'conversations','room','messages','good'),{...message,senderId:'tenant',senderName:'Tenant'}));
  await assertFails(getDoc(doc(env.authenticatedContext('stranger').firestore(),'conversations','room')));
});
test('Membership and other users read markers are immutable from clients',async()=>{
  const db=env.authenticatedContext('tenant').firestore();
  await assertFails(updateDoc(doc(db,'conversations','room'),{participants:['tenant','stranger']}));
  await assertFails(updateDoc(doc(db,'conversations','room'),{'readAt.owner':serverTimestamp()}));
  await assertSucceeds(updateDoc(doc(db,'conversations','room'),{'readAt.tenant':serverTimestamp()}));
});
test('Visits and open call signaling cannot be written directly',async()=>{
  const db=env.authenticatedContext('tenant').firestore();
  await assertFails(updateDoc(doc(db,'visits','visit'),{status:'confirmada'}));
  await assertFails(setDoc(doc(db,'active_calls','call'),{participants:['tenant','owner']}));
  await assertFails(setDoc(doc(env.unauthenticatedContext().firestore(),'active_calls','call'),{}));
});
test('Suspended accounts cannot send messages',async()=>{
  await env.withSecurityRulesDisabled(c=>updateDoc(doc(c.firestore(),'users','tenant'),{suspended:true}));
  await assertFails(setDoc(doc(env.authenticatedContext('tenant').firestore(),'conversations','room','messages','blocked'),{
    senderId:'tenant',type:'text',text:'Hi',createdAt:serverTimestamp(),senderName:'Tenant',
  }));
});
test('A shared draft is owned by the conversation owner and private to its participants',async()=>{
  const owner=env.authenticatedContext('owner').firestore();
  await env.withSecurityRulesDisabled(c=>updateDoc(doc(c.firestore(),'conversations','room'),{ownerId:'owner',propertyId:'house'}));
  const draft={participants:['tenant','owner'],conversationId:'room',propertyId:'house',ownerId:'owner',
    terms:{monthlyRent:3500,depositAmount:3500,durationMonths:12},updatedAt:serverTimestamp()};
  await assertSucceeds(getDoc(doc(owner,'lease_drafts','room')));
  await assertSucceeds(setDoc(doc(owner,'lease_drafts','room'),draft));
  await assertSucceeds(getDoc(doc(env.authenticatedContext('tenant').firestore(),'lease_drafts','room')));
  await assertFails(getDoc(doc(env.authenticatedContext('stranger').firestore(),'lease_drafts','room')));
  await assertFails(setDoc(doc(env.authenticatedContext('tenant').firestore(),'lease_drafts','room'),draft));
});
