import { before,after,beforeEach,test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment,assertSucceeds,assertFails } from '@firebase/rules-unit-testing';
import { doc,setDoc } from 'firebase/firestore';
import { ref,uploadBytes,getBytes } from 'firebase/storage';
let env;
before(async()=>{env=await initializeTestEnvironment({projectId:'demo-ruwajay',
  firestore:{rules:await readFile(new URL('../../archivos varios/servicios/firestore.rules', import.meta.url),'utf8')},storage:{rules:await readFile(new URL('../../archivos varios/servicios/storage.rules', import.meta.url),'utf8')}});});
after(async()=>{await env?.cleanup();});
beforeEach(async()=>{
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async c=>{
    await setDoc(doc(c.firestore(),'users','tenant'),{name:'Tenant',role:'seeker'});
    await setDoc(doc(c.firestore(),'users','owner'),{name:'Owner',role:'owner'});
    await setDoc(doc(c.firestore(),'conversations','room'),{participants:['tenant','owner']});
  });
});
test('Recipient can download chat media while outsiders cannot read or upload',async()=>{
  const path=`chat/room/tenant/${Date.now()}.jpg`;
  await assertSucceeds(uploadBytes(ref(env.authenticatedContext('tenant').storage(),path),new Uint8Array([1,2,3]),{contentType:'image/jpeg'}));
  await assertSucceeds(getBytes(ref(env.authenticatedContext('owner').storage(),path)));
  await assertFails(getBytes(ref(env.authenticatedContext('stranger').storage(),path)));
  await assertFails(uploadBytes(ref(env.authenticatedContext('owner').storage(),'chat/room/tenant/spoof.jpg'),new Uint8Array([1]),{contentType:'image/jpeg'}));
});
test('Property uploads require identity and an image content type',async()=>{
  await assertFails(uploadBytes(ref(env.unauthenticatedContext().storage(),'properties/house/tenant/a.jpg'),new Uint8Array([1]),{contentType:'image/jpeg'}));
  await assertFails(uploadBytes(ref(env.authenticatedContext('tenant').storage(),'properties/house/tenant/a.txt'),new Uint8Array([1]),{contentType:'text/plain'}));
});

test('Suspension blocks private downloads and every authenticated upload path',async()=>{
  const path='chat/room/tenant/suspension.jpg';
  await assertSucceeds(uploadBytes(ref(env.authenticatedContext('tenant').storage(),path),new Uint8Array([1]),{contentType:'image/jpeg'}));
  for(const suspension of [{suspended:true},{status:'suspended'},{status:'inactive'},{accountStatus:'inactive'},{accountStatus:'suspended'}]) {
    await env.withSecurityRulesDisabled(async c=>{await setDoc(doc(c.firestore(),'users','tenant'),{name:'Tenant',role:'seeker',...suspension});});
    const storage=env.authenticatedContext('tenant').storage();
    await assertFails(getBytes(ref(storage,path)));
    for(const prefix of ['chat/room/tenant','profiles/tenant','verification/tenant','properties/house/tenant']) {
      await assertFails(uploadBytes(ref(storage,prefix+'/blocked.jpg'),new Uint8Array([1]),{contentType:'image/jpeg'}));
    }
  }
});
