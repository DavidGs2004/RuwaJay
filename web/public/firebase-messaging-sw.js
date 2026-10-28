self.addEventListener('push', event => {
  const payload = event.data?.json() || {};
  const notification = payload.notification || {};
  const data = payload.data || {};
  event.waitUntil(self.registration.showNotification(notification.title || data.title || 'RuwaJay', {
    body:notification.body || data.body || '', tag:data.eventId || notification.tag || 'ruwajay',
    icon:new URL('logo/logo.png', self.registration.scope).href, data:{ path:data.path || '/perfil' },
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const path = event.notification.data?.path || '/perfil';
  const safePath = typeof path === 'string' && path.startsWith('/') && !path.startsWith('//') && !path.includes('\\') ? path.slice(1) : 'perfil';
  const base = new URL(self.registration.scope);
  const candidate = new URL(safePath, base);
  const url = candidate.origin === base.origin && candidate.pathname.startsWith(base.pathname)
    ? candidate : new URL('perfil', base);
  event.waitUntil((async () => {
    const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windows.find(client => client.url === url.href);
    if (existing) return existing.focus();
    return clients.openWindow(url.href);
  })());
});
