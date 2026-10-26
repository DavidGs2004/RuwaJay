self.addEventListener('push', event => {
  const payload = event.data?.json() || {};
  const notification = payload.notification || {};
  const data = payload.data || {};
  event.waitUntil(self.registration.showNotification(notification.title || 'RuwaJay', {
    body:notification.body || '', tag:data.eventId || 'ruwajay',
    icon:new URL('logo/logo.png', self.registration.scope).href, data:{ path:data.path || '/perfil' },
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const path = event.notification.data?.path || '/perfil';
  const safePath = path.startsWith('/') && !path.startsWith('//') ? path.slice(1) : 'perfil';
  const base = new URL(self.registration.scope);
  const candidate = new URL(safePath, base);
  const url = candidate.origin === base.origin && candidate.pathname.startsWith(base.pathname)
    ? candidate : new URL('perfil', base);
  event.waitUntil(clients.openWindow(url.href));
});
