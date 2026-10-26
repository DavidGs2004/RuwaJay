import { Timestamp, GeoPoint, DocumentReference, Firestore } from 'firebase-admin/firestore';
export function encode(value) {
  if (value instanceof Timestamp) return { __timestamp: [value.seconds, value.nanoseconds] };
  if (value instanceof GeoPoint) return { __geoPoint: [value.latitude, value.longitude] };
  if (value instanceof DocumentReference) return { __reference: { path: value.path, projectId: value.firestore.projectId, databaseId: value.firestore.databaseId } };
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) return { __bytes: Buffer.from(value).toString('base64') };
  if (typeof value === 'number' && !Number.isFinite(value)) return { __number: String(value) };
  if (value instanceof Date) return encode(Timestamp.fromDate(value));
  if (Array.isArray(value)) return value.map(encode);
  if (value && typeof value === 'object') {
    if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) throw new Error('Unsupported Firestore value in backup');
    if (['__timestamp','__geoPoint','__reference','__bytes','__number','__map'].some(key => Object.hasOwn(value, key))) {
      return { __map: Object.entries(value).map(([key, item]) => [key, encode(item)]) };
    }
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encode(item)]));
  }
  return value;
}
export function decode(value, db) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const keys = Object.keys(value);
    if (keys.length === 1) {
      if (value.__timestamp) return new Timestamp(...value.__timestamp);
      if (value.__geoPoint) return new GeoPoint(...value.__geoPoint);
      if (Object.hasOwn(value, '__reference')) {
        if (!db) throw new Error('A database is required to decode document references');
        const reference = value.__reference;
        if (typeof reference === 'string') return db.doc(reference);
        const target = db.projectId === reference.projectId && db.databaseId === reference.databaseId
          ? db : new Firestore({projectId:reference.projectId, databaseId:reference.databaseId});
        return target.doc(reference.path);
      }
      if (Object.hasOwn(value, '__bytes')) return Buffer.from(value.__bytes, 'base64');
      if (Object.hasOwn(value, '__number')) {
        if (!['NaN','Infinity','-Infinity'].includes(value.__number)) throw new Error('Invalid encoded number');
        return Number(value.__number);
      }
      if (value.__map) return Object.fromEntries(value.__map.map(([key, item]) => [key, decode(item, db)]));
    }
  }
  if (Array.isArray(value)) return value.map(item => decode(item, db));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, decode(item, db)]));
  return value;
}
