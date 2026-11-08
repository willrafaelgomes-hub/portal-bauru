
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch (error) {
    data = {};
  }

  const title = data.title || data.titulo || 'Portal Bauru';

  const options = {
    body: data.body || data.corpo || 'Você tem uma nova notificação.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || `portal-bauru-${Date.now()}`,
    renotify: true,
    data: {
      url: data.url || '/crm.html'
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const destination = new URL(
    event.notification.data?.url || '/crm.html',
    self.location.origin
  );

  if (destination.origin !== self.location.origin) {
    return;
  }

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true
      });

      for (const client of windows) {
        if ('focus' in client) {
          await client.navigate(destination.href);
          return client.focus();
        }
      }

      return self.clients.openWindow(destination.href);
    })()
  );
});
