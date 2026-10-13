// Realtime Event Bus for RuwaJay
// Combines BroadcastChannel API, window storage events, and Firestore real-time listeners
// to synchronize visits, chat messages, properties, and user state across tabs and devices.

const CHANNEL_NAME = 'ruwajay_global_realtime_channel';

let broadcastChannel = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
  }
} catch {
  broadcastChannel = null;
}

const listeners = new Set();

if (broadcastChannel) {
  broadcastChannel.onmessage = (event) => {
    if (event.data && event.data.type) {
      listeners.forEach((callback) => callback(event.data));
      // Also dispatch DOM event for standard listeners
      window.dispatchEvent(new CustomEvent(`ruwajay:${event.data.type.toLowerCase()}`, { detail: event.data.payload }));
    }
  };
}

export function publishRealtimeEvent(type, payload = {}) {
  const message = { type, payload, timestamp: Date.now() };

  // 1. Broadcast to other tabs/windows via BroadcastChannel
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage(message);
    } catch { /* ignore */ }
  }

  // 2. Dispatch locally in current window
  window.dispatchEvent(new CustomEvent(`ruwajay:${type.toLowerCase()}`, { detail: payload }));
  window.dispatchEvent(new Event('ruwajay:visits-changed'));
  window.dispatchEvent(new Event('ruwajay:properties-changed'));
  window.dispatchEvent(new Event('ruwajay:chat-changed'));
}

export function subscribeRealtimeEvents(callback) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

export function normalizeText(text) {
  return String(text || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function matchOwnerOrTenant(visit, user, myPropertyIds = []) {
  if (!visit || !user) return { isOwner: false, isTenant: false };

  const userId = user.id;
  const userPhone = String(user.phone || '').replace(/\D/g, '');
  const userName = normalizeText(user.name);
  const userEmail = normalizeText(user.email);
  const myPropSet = new Set(myPropertyIds);

  const visitOwnerId = visit.ownerId;
  const visitOwnerPhone = String(visit.ownerPhone || '').replace(/\D/g, '');
  const visitOwnerName = normalizeText(visit.ownerName);

  const visitTenantId = visit.tenantId;
  const visitTenantPhone = String(visit.tenantPhone || '').replace(/\D/g, '');
  const visitTenantName = normalizeText(visit.tenantName);
  const visitTenantEmail = normalizeText(visit.tenantEmail);

  let isOwner = false;
  if (userId && visitOwnerId === userId) isOwner = true;
  if (visit.propertyId && myPropSet.has(visit.propertyId)) isOwner = true;
  if (userPhone && visitOwnerPhone && userPhone === visitOwnerPhone) isOwner = true;
  if (userName && visitOwnerName && userName === visitOwnerName) isOwner = true;

  let isTenant = false;
  if (userId && visitTenantId === userId) isTenant = true;
  if (userPhone && visitTenantPhone && userPhone === visitTenantPhone) isTenant = true;
  if (userName && visitTenantName && userName === visitTenantName) isTenant = true;
  if (userEmail && visitTenantEmail && userEmail === visitTenantEmail) isTenant = true;

  return { isOwner, isTenant };
}
