import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineString } from 'firebase-functions/params';
import { roomId, slotId, validSchedule, permittedVisitTransition, matchesSearch } from './domain.js';

initializeApp();
const db = getFirestore();
const webOrigin = defineString('WEB_ORIGIN', { default: 'https://ruwa-jay.web.app' });
const options = { region: 'us-central1' };
async function account(request) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesión.');
  const profile = await db.doc(`users/${request.auth.uid}`).get();
  if (profile.data()?.suspended || profile.data()?.status === 'suspended') throw new HttpsError('permission-denied', 'Cuenta suspendida.');
  return { uid: request.auth.uid, ...profile.data(), email: request.auth.token.email || '', authUid: request.auth.uid };
}
function text(value, max = 4000) { return String(value || '').trim().slice(0, max); }
function id(value) {
  if (typeof value !== 'string' || !value || value.length > 500 || value.includes('/')) throw new HttpsError('invalid-argument', 'Identificador inválido.');
  return value;
}
function conversation(visit) {
  return {
    schemaVersion: 2, participants: [visit.tenantId, visit.ownerId], seekerId: visit.tenantId, ownerId: visit.ownerId,
    propertyId: visit.propertyId, propertyTitle: visit.propertyTitle, propertyImage: visit.propertyImage || '',
    seekerName: visit.tenantName || 'Interesado', ownerName: visit.ownerName || 'Propietario',
    seekerEmail: visit.tenantEmail || '', ownerEmail: visit.ownerEmail || '',
    seekerPhoto: visit.tenantPhoto || '', ownerPhoto: visit.ownerPhoto || '',
    seekerPhone: visit.tenantPhone || '', ownerPhone: visit.ownerPhone || '',
    createdAt: FieldValue.serverTimestamp(), readAt: {},
    lastMessage: '', lastMessageTimestamp: FieldValue.serverTimestamp(),
  };
}

export const createVisit = onCall(options, async request => {
  const user = await account(request);
  const propertyId = id(request.data.propertyId);
  const date = text(request.data.date || request.data.visitDate, 10);
  const time = text(request.data.time || request.data.visitTime, 5);
  if (!validSchedule(date, time)) throw new HttpsError('invalid-argument', 'Selecciona una fecha y hora futuras válidas.');
  const propertyRef = db.doc(`properties/${propertyId}`);
  const visitRef = db.collection('visits').doc();
  const slotRef = db.doc(`visit_slots/${slotId(propertyId, date, time)}`);
  await db.runTransaction(async tx => {
    const [propertySnapshot, reserved] = await Promise.all([tx.get(propertyRef), tx.get(slotRef)]);
    if (!propertySnapshot.exists) throw new HttpsError('not-found', 'Vivienda inexistente.');
    const property = propertySnapshot.data();
    if (property.status !== 'disponible' || property.ownerId === user.authUid) throw new HttpsError('failed-precondition', 'La vivienda no admite esta solicitud.');
    const owner = await tx.get(db.doc(`users/${id(property.ownerId)}`));
    if (!owner.exists || owner.data().suspended) throw new HttpsError('failed-precondition', 'El propietario necesita una cuenta activa de Firebase.');
    if (reserved.exists) throw new HttpsError('already-exists', 'Este horario ya está reservado.');
    tx.create(visitRef, {
      schemaVersion: 2, id: visitRef.id, propertyId, propertyTitle: property.title,
      propertyImage: property.thumbnail || (Array.isArray(property.images) ? property.images[0] : '') || '',
      propertyPrice: property.price, propertyZone: property.location?.approximateAddress || property.address?.approximate || '',
      propertyAddress: property.location?.approximateAddress || property.address?.approximate || '',
      ownerId: property.ownerId, ownerName: owner.data().name || 'Propietario', ownerEmail: owner.data().email || '',
      ownerPhone: owner.data().phone || '', ownerPhoto: owner.data().avatarImage || owner.data().avatar || '',
      tenantId: user.authUid, tenantName: user.name || 'Interesado', tenantEmail: user.email,
      tenantPhone: user.phone || '', tenantPhoto: user.avatarImage || user.avatar || '',
      date, time, notes: text(request.data.notes), status: 'pendiente', slotId: slotRef.id,
      createdAt: FieldValue.serverTimestamp(), createdAtIso: new Date().toISOString(),
    });
    tx.create(slotRef, { visitId: visitRef.id, propertyId, date, time });
  });
  return { id: visitRef.id };
});

export const changeVisitStatus = onCall(options, async request => {
  const user = await account(request);
  const visitRef = db.doc(`visits/${id(request.data.visitId)}`);
  const status = request.data.status;
  let conversationId = null;
  await db.runTransaction(async tx => {
    const snapshot = await tx.get(visitRef);
    if (!snapshot.exists) throw new HttpsError('not-found', 'Visita inexistente.');
    const visit = snapshot.data();
    if (!permittedVisitTransition(visit, user.authUid, status)) throw new HttpsError('permission-denied', 'Cambio de estado no permitido.');
    if (status === 'confirmada') {
      const property=await tx.get(db.doc(`properties/${id(visit.propertyId)}`));
      if (!property.exists || property.data().ownerId !== user.authUid || visit.schemaVersion !== 2 || visit.tenantId === visit.ownerId) {
        throw new HttpsError('failed-precondition','La visita necesita una propiedad e identidades verificadas; revisa la migración.');
      }
      conversationId = roomId(visit.tenantId, visit.ownerId, visit.propertyId);
      const ref = db.doc(`conversations/${conversationId}`);
      if (!(await tx.get(ref)).exists) tx.create(ref, conversation(visit));
    }
    tx.update(visitRef, { status, updatedAt: FieldValue.serverTimestamp(), ...(conversationId ? { conversationId,confirmedBy:user.authUid } : {}) });
    if (['cancelada', 'rechazada'].includes(status) && visit.slotId) tx.delete(db.doc(`visit_slots/${visit.slotId}`));
  });
  return { conversationId };
});

export const openConversation = onCall(options, async request => {
  const user = await account(request);
  const propertyId = id(request.data.propertyId);
  const seekerId = id(request.data.seekerId || user.authUid);
  const ownerId = id(request.data.ownerId);
  if (seekerId === ownerId || ![seekerId, ownerId].includes(user.authUid)) throw new HttpsError('permission-denied', 'Participantes inválidos.');
  const property=await db.doc(`properties/${propertyId}`).get();
  if(!property.exists || property.data().ownerId !== ownerId) throw new HttpsError('failed-precondition','El propietario no coincide con la vivienda.');
  const visits = await db.collection('visits').where('propertyId', '==', propertyId)
    .where('tenantId', '==', seekerId).where('ownerId', '==', ownerId).get();
  const visit = visits.docs.find(v => ['confirmada', 'aceptada'].includes(v.data().status) && v.data().schemaVersion===2 && v.data().confirmedBy===ownerId);
  if (!visit) throw new HttpsError('failed-precondition', 'Primero debes tener una visita confirmada.');
  // Keep an existing room/history until the audited migration consolidates duplicates.
  const oldRooms = await db.collection('conversations').where('propertyId', '==', propertyId)
    .where('participants', 'array-contains', seekerId).get();
  const existing = oldRooms.docs.find(d => !d.data().migratedTo && !d.data().archived && d.data().participants?.includes(ownerId));
  if (existing) return { id: existing.id };
  const ref = db.doc(`conversations/${roomId(seekerId, ownerId, propertyId)}`);
  await db.runTransaction(async tx => { if (!(await tx.get(ref)).exists) tx.create(ref, conversation(visit.data())); });
  return { id: ref.id };
});

async function notify(uid, eventId, title, body, path) {
  if (!uid) return;
  const user = await db.doc(`users/${uid}`).get();
  if (!user.exists || user.data().suspended || user.data().status === 'suspended') return;
  const ref = db.doc(`users/${uid}/notifications/${eventId}`);
  try { await ref.create({ title, body, path, createdAt: FieldValue.serverTimestamp(), readAt: null }); }
  catch (error) { if (error.code !== 6) throw error; }
  const devices = await db.collection(`users/${uid}/devices`).get();
  const valid = devices.docs.filter(d => typeof d.data().token === 'string');
  for (let offset = 0; offset < valid.length; offset += 500) {
    const slice = valid.slice(offset, offset + 500);
    const response = await getMessaging().sendEachForMulticast({
      tokens: slice.map(d => d.data().token), data: { path, eventId, title, body, recipientId: uid },
      android: { priority: 'high' },
      webpush: { notification: { title, body, tag: eventId }, fcmOptions: { link: `${webOrigin.value()}${path}` } },
    });
    await Promise.all(response.responses.map((result, i) =>
      ['messaging/registration-token-not-registered','messaging/invalid-registration-token'].includes(result.error?.code)
        ? slice[i].ref.delete() : Promise.resolve()));
  }
}
export const messageNotification = onDocumentCreated({ ...options, document: 'conversations/{roomId}/messages/{messageId}' }, async event => {
  const message = event.data.data();
  if (message.migrated) return;
  const room = await db.doc(`conversations/${event.params.roomId}`).get();
  if (!room.exists) return;
  const data = room.data();
  const senderTitle = (message.senderName && message.senderName !== 'Usuario') ? message.senderName : 'Nuevo mensaje';
  const bodyText = text(message.text || (message.type === 'audio' ? '🎤 Nota de voz' : message.type === 'video' ? '🎥 Video' : message.type === 'image' ? '📷 Foto' : 'Archivo recibido'), 160);
  await Promise.all(data.participants.filter(uid => uid !== message.senderId).map(uid =>
    notify(uid, `message_${event.params.messageId}`, senderTitle, bodyText, `/chat?conversation=${encodeURIComponent(event.params.roomId)}`)));
});
export const visitCreatedNotification = onDocumentCreated({ ...options, document: 'visits/{visitId}' }, event => {
  const visit = event.data.data();
  return notify(visit.ownerId, `visit_${event.params.visitId}`, 'Nueva solicitud de visita', visit.propertyTitle, '/perfil?tab=visitas');
});
export const visitStatusNotification = onDocumentUpdated({ ...options, document: 'visits/{visitId}' }, event => {
  const before = event.data.before.data(), visit = event.data.after.data();
  if (before.status === visit.status) return;
  return Promise.all([visit.ownerId, visit.tenantId].map(uid => notify(uid,
    `visit_${event.params.visitId}_${visit.status}`, `Visita ${visit.status}`, visit.propertyTitle, '/perfil?tab=visitas')));
});
export const expireVisits = onSchedule({ ...options, schedule: 'every 60 minutes' }, async () => {
  const cutoff = new Date(Date.now() - 7 * 86400000);
  const visits = await db.collection('visits').where('status', '==', 'pendiente').where('createdAt', '<', cutoff).get();
  for (const snapshot of visits.docs) await db.runTransaction(async tx => {
    const fresh = await tx.get(snapshot.ref), visit = fresh.data();
    if (visit?.status !== 'pendiente') return;
    tx.update(snapshot.ref, { status: 'vencida', updatedAt: FieldValue.serverTimestamp() });
    if (visit.slotId) tx.delete(db.doc(`visit_slots/${visit.slotId}`));
  });
});

export const propertySearchNotification = onDocumentCreated({ ...options, document:'properties/{propertyId}' }, async event => {
  const property = event.data.data();
  if (property.status !== 'disponible') return;
  const searches = await db.collectionGroup('saved_searches').where('notifyPush','==',true).get();
  const recipients = new Set(searches.docs.filter(d => matchesSearch(property,d.data())).map(d => d.ref.parent.parent.id));
  await Promise.all([...recipients].map(uid => notify(uid,`property_${event.params.propertyId}`,
    'Nueva vivienda para tu búsqueda',property.title,`/propiedad/${encodeURIComponent(event.params.propertyId)}`)));
});
export const favoritePriceNotification = onDocumentUpdated({ ...options, document:'properties/{propertyId}' }, async event => {
  const before=event.data.before.data(),property=event.data.after.data();
  if (!(property.price < before.price)) return;
  const favorites=await db.collectionGroup('favorites').where('propertyId','==',event.params.propertyId).get();
  await Promise.all(favorites.docs.map(d => notify(d.ref.parent.parent.id,`price_${event.id}`,
    'Bajó el precio de una vivienda favorita',property.title,`/propiedad/${encodeURIComponent(event.params.propertyId)}`)));
});

export const profileMetadataUpdated = onDocumentUpdated({ ...options, document:'users/{uid}' }, async event => {
  const before=event.data.before.data(),profile=event.data.after.data();
  const photo=profile.avatarImage||profile.avatar||profile.photoURL||'';
  if (before.name===profile.name && before.phone===profile.phone && (before.avatarImage||before.avatar||before.photoURL||'')===photo) return;
  const uid=event.params.uid;
  const [properties,rooms,ownedVisits,tenantVisits]=await Promise.all([
    db.collection('properties').where('ownerId','==',uid).get(),
    db.collection('conversations').where('participants','array-contains',uid).get(),
    db.collection('visits').where('ownerId','==',uid).get(),
    db.collection('visits').where('tenantId','==',uid).get(),
  ]);
  const writer=db.bulkWriter();
  properties.docs.forEach(d=>writer.update(d.ref,{ownerName:profile.name||'Propietario',ownerPhone:profile.phone||'',ownerPhoto:photo}));
  rooms.docs.forEach(d=>{
    const prefix=d.data().ownerId===uid?'owner':'seeker';
    writer.update(d.ref,{[`${prefix}Name`]:profile.name||'Usuario',[`${prefix}Phone`]:profile.phone||'',[`${prefix}Photo`]:photo});
  });
  ownedVisits.docs.forEach(d=>writer.update(d.ref,{ownerName:profile.name||'Propietario',ownerPhone:profile.phone||'',ownerPhoto:photo}));
  tenantVisits.docs.forEach(d=>writer.update(d.ref,{tenantName:profile.name||'Interesado',tenantPhone:profile.phone||'',tenantPhoto:photo}));
  await writer.close();
});
