import test from 'node:test';
import assert from 'node:assert/strict';
import { imageUrls, coordinatesOrNull, normalizeVisit, unreadConversation, conversationId } from '../src/lib/contracts.js';
import { validSchedule, permittedVisitTransition } from '../../archivos varios/servicios/functions/domain.js';
import { appPathname, mobileDeepLink } from '../src/lib/navigation.js';

test('Chat reads use the same route at the root and under the VPS base path', () => {
  assert.equal(appPathname('/chat', '/'), '/chat');
  assert.equal(appPathname('/ruwajay/chat', '/ruwajay/'), '/chat');
  assert.equal(appPathname('/ruwajay/chat/', '/ruwajay/'), '/chat');
  assert.equal(appPathname('/ruwajay/perfil', '/ruwajay/'), '/perfil');
  assert.equal(appPathname('/ruwajay-other/chat', '/ruwajay/'), '/ruwajay-other/chat');
});

test('Mobile links preserve the conversation, property and profile tab', () => {
  assert.equal(mobileDeepLink('/chat?conversation=room%201'), 'ruwajay://chat/room%201');
  assert.equal(mobileDeepLink('/ruta?property=house'), 'ruwajay://ruta/house');
  assert.equal(mobileDeepLink('/perfil?tab=visitas'), 'ruwajay://perfil?tab=visitas');
  assert.equal(mobileDeepLink('/propiedad/house'), 'ruwajay://propiedad/house');
  assert.equal(mobileDeepLink('/'), 'ruwajay://home');
});
test('Legacy web photos never persist temporary URLs or duplicate photos', () => {
  assert.deepEqual(imageUrls({ fachada:['blob:http://localhost/x','https://example.test/a'], general:['https://example.test/a','data:image/png;base64,abc'] }),['https://example.test/a']);
});
test('Missing, invalid and zero coordinates are distinguished', () => {
  assert.equal(coordinatesOrNull(null),null);
  for (const value of [{lat:'',lng:''},{lat:null,lng:null},{latitude:null,longitude:null},{lat:false,lng:false}]) assert.equal(coordinatesOrNull(value),null);
  assert.equal(coordinatesOrNull({lat:95,lng:0}),null);
  assert.deepEqual(coordinatesOrNull({latitude:0,longitude:0}),{lat:0,lng:0});
});
test('Both legacy Android and web visits retain the same schedule', () => {
  assert.equal(normalizeVisit({visitDate:'2026-10-20',visitTime:'10:00'}).date,'2026-10-20');
  assert.equal(normalizeVisit({date:'2026-10-20',time:'10:00',visitTime:'09:00'}).time,'10:00');
});
test('Reading on another device clears unread while a new message restores it', () => {
  const room={lastSenderId:'owner',lastMessageTimestamp:200,readAt:{tenant:100}};
  assert.equal(unreadConversation(room,'tenant'),true);
  assert.equal(unreadConversation({...room,readAt:{tenant:200}},'tenant'),false);
  assert.equal(unreadConversation({...room,readAt:{tenant:{seconds:200,nanoseconds:0}},lastMessageTimestamp:{seconds:100,nanoseconds:0}},'tenant'),false);
  assert.equal(unreadConversation({...room,readAt:{tenant:new Date(200)}},'tenant'),false);
  assert.equal(unreadConversation(room,'owner'),false);
  assert.equal(unreadConversation({},'tenant'),false);
});
test('Canonical room does not depend on a random ID and rejects self chats', () => {
  assert.equal(conversationId('tenant','owner','property'),'v2_tenant_owner_property');
  assert.throws(()=>conversationId('owner','owner','property'));
});
test('Visits cannot use invalid dates, invalid hours or past schedules', () => {
  const now=new Date('2026-10-12T12:00:00Z');
  assert.equal(validSchedule('2026-10-20','10:00',now),true);
  for(const [date,time] of [['2026-02-30','10:00'],['2026-13-01','10:00'],['2026-10-11','10:00'],['2026-10-20','24:00']]) assert.equal(validSchedule(date,time,now),false);
});
test('Only the owner confirms; tenant can cancel; closed visits cannot reopen', () => {
  const visit={ownerId:'owner',tenantId:'tenant',status:'pendiente'};
  assert.equal(permittedVisitTransition(visit,'owner','confirmada'),true);
  assert.equal(permittedVisitTransition(visit,'tenant','confirmada'),false);
  assert.equal(permittedVisitTransition(visit,'stranger','cancelada'),false);
  assert.equal(permittedVisitTransition(visit,'tenant','cancelada'),true);
  assert.equal(permittedVisitTransition({...visit,status:'cancelada'},'owner','confirmada'),false);
});
