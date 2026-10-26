// The persisted contract is shared with Android and Cloud Functions.
export function imageUrls(value) {
  const values = Array.isArray(value) ? value : Object.values(value || {}).flat();
  return [...new Set(values.filter(url => typeof url === 'string' && /^https:\/\//.test(url)))];
}

export function coordinatesOrNull(value) {
  if (!value) return null;
  const rawLat = value.lat ?? value.latitude;
  const rawLng = value.lng ?? value.longitude ?? value.lon;
  if ([rawLat, rawLng].some(coordinate => coordinate == null || typeof coordinate === 'boolean' || (typeof coordinate === 'string' && !coordinate.trim()))) return null;
  const lat = Number(rawLat);
  const lng = Number(rawLng);
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
    ? { lat, lng } : null;
}

export function conversationId(seekerId, ownerId, propertyId) {
  if (![seekerId, ownerId, propertyId].every(v => typeof v === 'string' && v && !v.includes('/'))) {
    throw new Error('La conversación requiere participantes y una propiedad válidos.');
  }
  if (seekerId === ownerId) throw new Error('No puedes iniciar una conversación contigo mismo.');
  return `v2_${[seekerId, ownerId, propertyId].join('_')}`;
}

export function normalizeVisit(value) {
  return { ...value, date: value.date || value.visitDate || '', time: value.time || value.visitTime || '' };
}

export function timestampMillis(value) {
  if (!value) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (typeof value?.toDate === 'function') return value.toDate().getTime();
  if (value instanceof Date) return value.getTime();
  if (typeof value?.seconds === 'number') return value.seconds * 1000 + Math.floor((value.nanoseconds || 0) / 1000000);
  if (typeof value?._seconds === 'number') return value._seconds * 1000 + Math.floor((value._nanoseconds || 0) / 1000000);
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function unreadConversation(conversation, uid) {
  return Boolean(conversation.lastSenderId && conversation.lastSenderId !== uid
    && timestampMillis(conversation.lastMessageTimestamp) > timestampMillis(conversation.readAt?.[uid]));
}
