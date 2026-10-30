import test from 'node:test';
import assert from 'node:assert/strict';
import { firebaseVerifier, googleTokenProvider } from '../../archivos varios/servicios/supabase/functions/_shared/google.js';
import { parseMediaReference, SupabaseFiles } from '../../archivos varios/servicios/supabase/functions/_shared/storage.js';
import { createHandler } from '../../archivos varios/servicios/supabase/functions/_shared/handler.js';
import { active, ApiError } from '../../archivos varios/servicios/supabase/functions/_shared/errors.js';
import { RuwaService } from '../../archivos varios/servicios/supabase/functions/_shared/service.js';
const keys=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const publicKey=await crypto.subtle.exportKey('jwk',keys.publicKey);publicKey.kid='test-signing-key';
const b64=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
test('Canonical account status overrides legacy flags and inactive accounts are blocked',()=>{
  for(const profile of [{accountStatus:'inactive'},{accountStatus:'suspended'},{status:'inactive'},{status:'suspended'},{suspended:true,status:'active'}]) assert.equal(active(profile),false);
  assert.equal(active({accountStatus:'active',suspended:true,status:'suspended'}),true);
  assert.equal(active({name:'Legacy active user'}),true);
});

test('Configuration errors never bypass profile or private media authorization',async()=>{
  const configuration=new ApiError(500,'configuration','Configura una cuenta de servicio.');
  let uploads=0,signatures=0;
  const service=new RuwaService({db:{get:async()=>{throw configuration;}},files:{upload:async()=>{uploads++;},signedUrl:async()=>{signatures++;}}});
  await assert.rejects(service.account({uid:'user',email:'user@example.test',claims:{}}),error=>error===configuration);
  await assert.rejects(service.resolveMedia({uid:'user'},'supabase://chat-media/chat/room/other/file'),error=>error===configuration);
  await assert.rejects(service.authorizeFile({uid:'user'},'property-images',['properties','house','user','file'],true),error=>error===configuration);
  assert.equal(uploads,0);assert.equal(signatures,0);
});

test('Administrator permissions come from stored roles or signed claims, never email',async()=>{
  const service=new RuwaService({db:{get:async()=>({exists:true,data:{role:'seeker'}})},files:{}});
  const user=await service.account({uid:'user',email:'xleon04gd@gmail.com',claims:{}});
  assert.equal(user.isAdmin,false);
  assert.equal((await service.account({uid:'admin',email:'admin@example.test',claims:{role:'admin'}})).isAdmin,true);
});

test('New listings require a verified owner even when called directly',async()=>{
  const service=new RuwaService({db:{},files:{}});
  const tx={get:async()=>({exists:false})};
  await assert.rejects(service.saveProperty(tx,{uid:'user',role:'owner'},{property:{id:'house'}}),error=>error.status===403);
});
async function jwt(patch={},headerPatch={},otherKey=keys.privateKey){const now=Math.floor(Date.now()/1000),header=b64({alg:'RS256',typ:'JWT',kid:publicKey.kid,...headerPatch}),claims=b64({aud:'ruwa-jay',iss:'https://securetoken.google.com/ruwa-jay',sub:'verified-user',iat:now,auth_time:now,exp:now+3600,...patch});const bytes=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',otherKey,new TextEncoder().encode(header+'.'+claims));return header+'.'+claims+'.'+Buffer.from(bytes).toString('base64url');}
test('Production identity verification checks signature, project, expiry and algorithm',async()=>{
  const verifier=firebaseVerifier('ruwa-jay',{fetcher:async()=>Response.json({keys:[publicKey]})});
  assert.equal((await verifier(await jwt())).uid,'verified-user');
  for(const patch of [{aud:'other-project'},{iss:'https://securetoken.google.com/other-project'},{exp:0},{sub:''},{auth_time:undefined},{iat:Date.now()}])await assert.rejects(verifier(await jwt(patch)),error=>error.status===401);
  await assert.rejects(verifier(await jwt({}, {alg:'none'})),error=>error.status===401);
  const token=await jwt();await assert.rejects(verifier(token.slice(0,token.lastIndexOf('.')+1)+Buffer.from('invalid signature').toString('base64url')),error=>error.status===401);
  assert.throws(()=>firebaseVerifier('ruwa-jay',{emulatorHost:'127.0.0.1:9099'}),/emuladores/);
});
test('Server credentials are restricted to ruwa-jay and OAuth tokens stay cached in memory',async()=>{
  assert.throws(()=>googleTokenProvider({project_id:'another-project',client_email:'account@another.iam.gserviceaccount.com',private_key:'not a key'}),/ruwa-jay/);
  const privateBytes=await crypto.subtle.exportKey('pkcs8',keys.privateKey);
  const privateKey='-----BEGIN PRIVATE KEY-----\n'+Buffer.from(privateBytes).toString('base64')+'\n-----END PRIVATE KEY-----';
  let requests=0;const provider=googleTokenProvider({project_id:'ruwa-jay',client_email:'worker@ruwa-jay.iam.gserviceaccount.com',private_key:privateKey},async(url,options)=>{requests++;assert.equal(url,'https://oauth2.googleapis.com/token');assert.match(options.body.get('assertion'),/^[^.]+\.[^.]+\.[^.]+$/);return Response.json({access_token:'test-access-token',expires_in:3600});});
  assert.equal(await provider(),'test-access-token');assert.equal(await provider(),'test-access-token');assert.equal(requests,1);
});
test('Private media references reject traversal and signed URLs have a short lifetime',async()=>{
  assert.equal(parseMediaReference('supabase://chat-media/chat/room/user/file').bucket,'chat-media');
  for(const value of ['https://other.test/a','supabase://chat-media/chat/../user/file','supabase://chat-media/chat/%2e%2e/user/file','supabase://property-images/properties/house/user/file'])assert.throws(()=>parseMediaReference(value));
  const storage=new SupabaseFiles({url:'https://test-project.supabase.co',serviceKey:'server-test-key',fetcher:async(url,options)=>{assert.equal(JSON.parse(options.body).expiresIn,300);assert.equal(options.headers.Authorization,'Bearer server-test-key');return Response.json({signedURL:'/object/sign/chat-media/chat/room/user/file?token=temporary'});}});
  const result=await storage.signedUrl('chat-media','chat/room/user/file');assert.equal(result.expiresIn,300);assert.match(result.url,/^https:\/\/test-project\.supabase\.co\/storage\/v1\/object\/sign\//);
});
test('Gateway rejects unauthorized origins and oversized uploads before performing work',async()=>{
  let uploads=0;const service={db:{projectId:'ruwa-jay'},upload:async()=>{uploads++;},call:async()=>{},drainJobs:async()=>{}};
  const handler=createHandler({service,verifyIdentity:async token=>{if(token!=='valid')throw Object.assign(new Error('invalid'),{status:401});return{uid:'user'};},allowedOrigins:['https://ruwa-jay.web.app']});
  const denied=await handler(new Request('https://api.test/ruwajay-api',{method:'OPTIONS',headers:{Origin:'https://unrelated.test'}}));assert.equal(denied.status,403);
  const accepted=await handler(new Request('https://api.test/ruwajay-api',{method:'OPTIONS',headers:{Origin:'https://ruwa-jay.web.app'}}));assert.equal(accepted.status,204);assert.equal(accepted.headers.get('Access-Control-Allow-Origin'),'https://ruwa-jay.web.app');
  const large=await handler(new Request('https://api.test/ruwajay-api/upload',{method:'POST',headers:{Authorization:'Bearer valid','Content-Length':String(21*1024*1024)},body:'small'}));assert.equal(large.status,413);assert.equal(uploads,0);
});
