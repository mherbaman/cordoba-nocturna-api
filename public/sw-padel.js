const CACHE_NAME = 'padel-v1';
self.addEventListener('install', event => { self.skipWaiting(); });
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});
self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'PadelConnect';
  const options = {
    body: data.body || 'Nuevo partido disponible',
    icon: data.icon || '/icons/padel-192.png',
    badge: data.icon || '/icons/padel-192.png',
    data: { url: data.url || '/padel/' }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});
