import test from 'node:test';
import assert from 'node:assert/strict';
import { Firestore, Timestamp, GeoPoint } from 'firebase-admin/firestore';
import { encode, decode } from './backup-codec.js';
test('Backup JSON preserves Firestore types, nested bytes and reserved map keys', () => {
  const db = new Firestore({projectId:'demo-ruwajay'});
  const input = { time:new Timestamp(1730000000,123456789), point:new GeoPoint(14.6,-90.5), reference:db.doc('properties/house'), bytes:Buffer.from([0,128,255]), nested:[{__timestamp:'user data',__map:'user map'}], numbers:[NaN,Infinity,-Infinity] };
  const decoded=decode(JSON.parse(JSON.stringify(encode(input))),db);
  assert.ok(decoded.time.isEqual(input.time));
  assert.ok(decoded.point.isEqual(input.point));
  assert.equal(decoded.reference.path,input.reference.path);
  const otherDb = new Firestore({projectId:'demo-other',databaseId:'secondary'});
  const foreign = decode(JSON.parse(JSON.stringify(encode(otherDb.doc('properties/other')))),db);
  assert.equal(foreign.firestore.projectId,'demo-other');
  assert.equal(foreign.firestore.databaseId,'secondary');
  assert.equal(foreign.path,'properties/other');
  assert.deepEqual(decoded.bytes,input.bytes);
  assert.deepEqual(decoded.nested,input.nested);
  assert.deepEqual(decoded.numbers,input.numbers);
});
test('Unsupported backup values fail instead of silently losing data',()=>{
  assert.throws(()=>encode(new Map([['a',1]])),/Unsupported/);
  assert.throws(()=>decode({__reference:'properties/house'}),/database/);
});
