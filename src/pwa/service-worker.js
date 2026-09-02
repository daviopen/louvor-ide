const CACHE_VERSION = 'ide-music-pwa-v2';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames
      .filter(cacheName => cacheName.startsWith('ide-music-pwa-') && cacheName !== CACHE_VERSION)
      .map(cacheName => caches.delete(cacheName)));
    await self.clients.claim();
  })());
});

self.addEventListener('push', event => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (_) {
    payload = { body: event.data ? event.data.text() : '' };
  }
  const data = payload && typeof payload.data === 'object' ? payload.data : payload;
  const title = String(data.title || 'IDE Music');
  const body = String(data.body || 'Você tem uma nova atualização.');
  const url = String(data.url || '/');
  const tag = String(data.tag || data.outboxId || 'ide-music-notification');
  event.waitUntil(self.registration.showNotification(title, {
    body,
    tag,
    icon: '/icons/icon-192.png',
    badge: '/icons/favicon-48.png',
    data: { url },
    renotify: false
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const targetUrl = String(event.notification?.data?.url || '/');
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      try {
        const current = new URL(client.url);
        const target = new URL(targetUrl, self.location.origin);
        if (current.origin === target.origin) {
          if (typeof client.navigate === 'function') await client.navigate(target.href);
          if (typeof client.focus === 'function') return client.focus();
        }
      } catch (_) {}
    }
    if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    return null;
  })());
});

// Não interceptamos fetch: a aplicação continua sempre usando os dados mais
// recentes do Firebase e não corre o risco de exibir HTML/JS antigo offline.
