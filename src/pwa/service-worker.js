const CACHE_VERSION = 'ide-music-pwa-v1';

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

// Não interceptamos fetch: a aplicação continua sempre usando os dados mais
// recentes do Firebase e não corre o risco de exibir HTML/JS antigo offline.
