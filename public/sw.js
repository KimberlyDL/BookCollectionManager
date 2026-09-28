// BookLook service worker — makes the web/PWA build work offline.
// Page navigations are network-first (so deploys show up right away) with a
// cached app shell as the fallback; same-origin static files are served from
// cache and refreshed in the background. Firebase traffic is cross-origin and
// is never touched here.

const CACHE = 'booklook-v1';
const CORE = ['./', './index.html', './manifest.webmanifest', './favicon.png', './icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(CORE)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

// The page sends the files it already loaded on the very first visit (before
// this worker was controlling it) so they are available offline too.
self.addEventListener('message', (event) => {
  if (event.data?.type !== 'CACHE_URLS') return;
  const urls = (event.data.urls || []).filter((url) => new URL(url).origin === self.location.origin);
  event.waitUntil(
    caches.open(CACHE).then((cache) => Promise.all(urls.map((url) => cache.add(url).catch(() => undefined))))
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put('./index.html', copy));
          return response;
        })
        .catch(() => caches.match('./index.html', { ignoreVary: true }))
    );
    return;
  }

  event.respondWith(
    caches.match(request, { ignoreVary: true }).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
