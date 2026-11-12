const CACHE_NAME = '1999-ai-crt-v3';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

// Chrome on Android requires a fetch event listener in the active Service Worker to trigger beforeinstallprompt / WebAPK installation
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || req.url.includes('/api/')) {
    return;
  }
  event.respondWith(
    fetch(req).catch(() => caches.match(req))
  );
});
