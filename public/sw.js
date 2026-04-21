self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'CórdobaLux';
  const options = {
    body: data.body || 'Nuevo partido disponible',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: data.url || '/public/padel-connect.html' }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});
