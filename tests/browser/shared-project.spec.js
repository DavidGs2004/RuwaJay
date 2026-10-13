import { test, expect } from '@playwright/test';
import { initializeApp } from 'firebase/app';
import { getAuth,connectAuthEmulator,createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore,connectFirestoreEmulator,doc,setDoc } from 'firebase/firestore';
import { getDoc,writeBatch,serverTimestamp,collection } from 'firebase/firestore';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
test('Login uses Firebase identity and property routes never substitute a different home',async({page})=>{
  const app=initializeApp({projectId:'demo-ruwajay',apiKey:'demo-key'},`browser-${Date.now()}`);
  const auth=getAuth(app);connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});
  const db=getFirestore(app);connectFirestoreEmulator(db,'127.0.0.1',8085);
  const email=`browser-${Date.now()}@example.test`,password='testing-password';
  const {user}=await createUserWithEmailAndPassword(auth,email,password);
  await setDoc(doc(db,'users',user.uid),{name:'Browser Test User',email,role:'owner'});
  await setDoc(doc(db,'properties','browser-house'),{ownerId:user.uid,title:'Vivienda compartida de prueba',price:3500.50,
    status:'disponible',images:['https://example.test/photo.jpg'],coordinates:{lat:14.6,lng:-90.5},verified:false});
  const failures=[];page.on('pageerror',error=>failures.push(error.message));
  await page.goto('/login');
  await page.locator('input[type=email]').fill(email);
  await page.locator('input[type=password]').fill(password);
  await page.locator('form').getByRole('button',{name:'Iniciar sesión',exact:true}).click();
  await expect(page).toHaveURL('http://localhost:5175/');
  await page.goto('/perfil');
  await expect(page.locator('main').getByText('Browser Test User',{exact:true}).first()).toBeVisible();
  await page.goto('/propiedad/browser-house');
  await expect(page.getByRole('heading',{name:'Vivienda compartida de prueba'}).first()).toBeVisible();
  await page.goto('/propiedad/no-such-property');
  await expect(page.getByText('Esta vivienda no existe o fue eliminada.')).toBeVisible();
  await expect(page.getByText('Vivienda compartida de prueba')).toHaveCount(0);
  const peerApp=initializeApp({projectId:'demo-ruwajay',apiKey:'demo-key'},`peer-${Date.now()}`);
  const peerAuth=getAuth(peerApp);connectAuthEmulator(peerAuth,'http://127.0.0.1:9099',{disableWarnings:true});
  const peerDb=getFirestore(peerApp);connectFirestoreEmulator(peerDb,'127.0.0.1',8085);
  const {user:peer}=await createUserWithEmailAndPassword(peerAuth,`peer-${Date.now()}@example.test`,password);
  await setDoc(doc(peerDb,'users',peer.uid),{name:'Tenant Browser',email:peer.email,role:'seeker'});
  const env=await initializeTestEnvironment({projectId:'demo-ruwajay'});
  await env.withSecurityRulesDisabled(context=>setDoc(doc(context.firestore(),'conversations','browser-room'),{
    participants:[peer.uid,user.uid],seekerId:peer.uid,ownerId:user.uid,propertyId:'browser-house',ownerName:'Browser Test User',
    seekerName:'Tenant Browser',propertyTitle:'Vivienda compartida de prueba',lastMessage:'',readAt:{},
  }));
  await page.goto('/chat?conversation=browser-room');
  await expect(page.locator('main').getByRole('heading',{name:/Tenant Browser/}).first()).toBeVisible();
  await expect.poll(async()=>Boolean((await getDoc(doc(db,'conversations','browser-room'))).data().readAt?.[user.uid])).toBe(true);
  await page.evaluate(()=>Object.defineProperty(document,'visibilityState',{configurable:true,get:()=> 'hidden'}));
  const message=doc(collection(peerDb,'conversations','browser-room','messages'));
  const batch=writeBatch(peerDb);
  batch.set(message,{senderId:peer.uid,senderName:'Tenant Browser',text:'Shared while hidden',type:'text',createdAt:serverTimestamp()});
  batch.update(doc(peerDb,'conversations','browser-room'),{lastSenderId:peer.uid,lastMessage:'Shared while hidden',lastMessageId:message.id,lastMessageTimestamp:serverTimestamp()});
  await batch.commit();
  await expect(page.getByText('Shared while hidden',{exact:true}).first()).toBeVisible();
  const hiddenRoom=(await getDoc(doc(db,'conversations','browser-room'))).data();
  expect(hiddenRoom.readAt[user.uid].toMillis()).toBeLessThan(hiddenRoom.lastMessageTimestamp.toMillis());
  await page.evaluate(()=>{
    Object.defineProperty(document,'visibilityState',{configurable:true,get:()=> 'visible'});
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(async()=>{
    const room=(await getDoc(doc(db,'conversations','browser-room'))).data();
    return room.readAt[user.uid].toMillis()>=room.lastMessageTimestamp.toMillis();
  }).toBe(true);
  await env.cleanup();
  expect(failures).toEqual([]);
});

test('Favorites switch accounts without stale cache and missing locations stay unknown',async({page})=>{
  const id=Date.now();
  const setup=async suffix=>{
    const app=initializeApp({projectId:'demo-ruwajay',apiKey:'demo-key'},'favorites-'+id+suffix);
    const auth=getAuth(app);connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});
    const db=getFirestore(app);connectFirestoreEmulator(db,'127.0.0.1',8085);
    const email='favorites-'+id+suffix+'@example.test';
    const {user}=await createUserWithEmailAndPassword(auth,email,'testing-password');
    await setDoc(doc(db,'users',user.uid),{name:'Favorites '+suffix,email,role:'seeker'});
    return{user,db,email};
  };
  const a=await setup('a'),b=await setup('b');
  const env=await initializeTestEnvironment({projectId:'demo-ruwajay',firestore:{host:'127.0.0.1',port:8085}});
  const house='favorite-house-'+id;
  await env.withSecurityRulesDisabled(c=>setDoc(doc(c.firestore(),'properties',house),{ownerId:a.user.uid,title:'Vivienda sin ubicación de prueba',price:2500,status:'disponible',images:['https://example.test/photo.jpg']}));
  await setDoc(doc(a.db,'users',a.user.uid,'favorites',house),{propertyId:house});
  const failures=[];page.on('pageerror',error=>failures.push(error.message));
  await page.goto('/login');
  await page.evaluate(()=>{localStorage.setItem('ruwajay_favorites','not valid JSON');localStorage.setItem('ruwajay_recent_searches','not valid JSON');});
  await page.reload();
  await page.locator('input[type=email]').fill(a.email);
  await page.locator('input[type=password]').fill('testing-password');
  await page.locator('form').getByRole('button',{name:'Iniciar sesión',exact:true}).click();
  await expect(page).toHaveURL('http://localhost:5175/');
  await page.goto('/propiedad/'+house);
  await expect(page.getByTitle('Quitar de favoritos',{exact:true})).toBeVisible();
  await expect(page.getByText('Ubicación no indicada',{exact:true}).first()).toBeVisible();
  await page.evaluate(async email=>{
    const {firebaseAuth}=await import('/src/lib/firebase.js');
    const {signInWithEmailAndPassword}=await import('/node_modules/.vite/deps/firebase_auth.js');
    await signInWithEmailAndPassword(firebaseAuth,email,'testing-password');
  },b.email);
  await expect(page.getByTitle('Guardar',{exact:true})).toBeVisible();
  await page.getByTitle('Guardar',{exact:true}).click();
  await expect.poll(async()=>(await getDoc(doc(b.db,'users',b.user.uid,'favorites',house))).exists()).toBe(true);
  await expect(page.getByTitle('Quitar de favoritos',{exact:true})).toBeVisible();
  expect((await getDoc(doc(a.db,'users',a.user.uid,'favorites',house))).exists()).toBe(true);
  expect(failures).toEqual([]);
  await env.cleanup();
});
