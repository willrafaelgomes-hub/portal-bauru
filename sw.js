
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', event => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch (error) {
    data = {};
  }

  const title = data.title || 'Portal Bauru';

  const options = {
    body: data.body || 'Você tem uma nova notificação.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || 'portal-bauru-alerta',
    renotify: true,
    data: {
      url: data.url || '/crm.html'
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();

  const url = new URL(
    event.notification.data?.url || '/crm.html',
    self.location.origin
  );

  if (url.origin !== self.location.origin) {
    return;
  }

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true
      });

      for (const client of windows) {
        if (client.url === url.href && 'focus' in client) {
          return client.focus();
        }
      }

      return self.clients.openWindow(url.href);
    })()
  );
});
