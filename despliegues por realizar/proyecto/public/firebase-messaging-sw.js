self.addEventListener('push', event => {
  const payload = event.data?.json() || {};
  const notification = payload.notification || {};
  const data = payload.data || {};
  event.waitUntil(self.registration.showNotification(notification.title || 'RuwaJay', {
    body:notification.body || '', tag:data.eventId || 'ruwajay',
    icon:'/logo/logo.png', data:{ path:data.path || '/perfil' },
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const path = event.notification.data?.path || '/perfil';
  const url = new URL(path.startsWith('/') && !path.startsWith('//') ? path : '/perfil', self.location.origin);
  event.waitUntil(clients.openWindow(url.href));
});
