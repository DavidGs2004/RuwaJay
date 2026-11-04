import test from 'node:test';
import assert from 'node:assert/strict';
import { createMediaResolver } from '../src/lib/mediaResolver.js';
const ref = id => 'supabase://chat-media/chat/room/user/' + id;

test('Duplicate requests share one lookup and cache signed URLs', async () => {
  let calls = 0;
  const resolver = createMediaResolver({getUid:()=> 'user',resolve:async()=>{calls++;return {url:'https://signed.test/media',expiresIn:300};}});
  const results = await Promise.all(Array.from({length:20},()=>resolver.resolveUrl(ref('same'))));
  assert.equal(calls,1);
  assert.equal(new Set(results).size,1);
  assert.equal(resolver.cachedUrl(ref('same')),'https://signed.test/media');
  await resolver.resolveUrl(ref('same'));
  assert.equal(calls,1);
});

test('A full chat stops requesting media after a quota or service failure', async () => {
  for (const error of [Object.assign(new Error('Quota'),{status:503,code:'RESOURCE_EXHAUSTED'}),Object.assign(new Error('Quota'),{status:429,code:'RESOURCE_EXHAUSTED'}),Object.assign(new Error('Unavailable'),{status:503})]) {
    let calls=0,clock=1000;
    const resolver=createMediaResolver({getUid:()=> 'user',now:()=>clock,resolve:async()=>{calls++;await new Promise(done=>setTimeout(done,1));throw error;}});
    const results=await Promise.allSettled(Array.from({length:40},(_,i)=>resolver.resolveUrl(ref(i))));
    assert.equal(results.filter(r=>r.status==='rejected').length,40);
    assert.equal(calls,2);
    await assert.rejects(resolver.resolveUrl(ref('later')));
    assert.equal(calls,2);
    clock+=60001;
    await assert.rejects(resolver.resolveUrl(ref('retry')));
    assert.equal(calls,3);
  }
});

test('Account changes never share private URLs or service failure state', async () => {
  let uid='one',calls=0;
  const resolver=createMediaResolver({getUid:()=>uid,resolve:async(_ref,account)=>{calls++;return {url:'https://signed.test/'+account,expiresIn:300};}});
  await resolver.resolveUrl(ref('same'));
  uid='two';
  assert.equal(resolver.cachedUrl(ref('same')),null);
  assert.equal(await resolver.resolveUrl(ref('same')),'https://signed.test/two');
  assert.equal(calls,2);
});

test('An account change during a lookup discards the returned private URL', async () => {
  let uid='one';
  const resolver=createMediaResolver({getUid:()=>uid,resolve:async()=>{uid='two';return {url:'https://signed.test/one'};}});
  await assert.rejects(resolver.resolveUrl(ref('same')));
  assert.equal(resolver.cachedUrl(ref('same')),null);
});

test('A parallel successful lookup does not cancel the pause triggered by another lookup', async()=>{
  let calls=0;
  const resolver=createMediaResolver({getUid:()=> 'user',resolve:async reference=>{
    calls++;
    if(reference===ref('quota'))throw Object.assign(new Error('Quota'),{status:429,code:'RESOURCE_EXHAUSTED'});
    await new Promise(done=>setTimeout(done,5));
    return {url:'https://signed.test/media',expiresIn:300};
  }});
  await Promise.allSettled([resolver.resolveUrl(ref('quota')),resolver.resolveUrl(ref('works'))]);
  await assert.rejects(resolver.resolveUrl(ref('next')));
  assert.equal(calls,2);
});
