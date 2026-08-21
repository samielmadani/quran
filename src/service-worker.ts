/// <reference lib="webworker" />

const CACHE_NAME = 'quran-automotive-v1';
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icons.svg'];

self.addEventListener('install', (event) => {
  const extendableEvent = event as ExtendableEvent;
  extendableEvent.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  );
  (self as unknown as ServiceWorkerGlobalScope).skipWaiting();
});

self.addEventListener('activate', (event) => {
  const extendableEvent = event as ExtendableEvent;
  extendableEvent.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  (self as any).clients.claim();
});

self.addEventListener('fetch', (event) => {
  const fetchEvent = event as FetchEvent;
  if (fetchEvent.request.method !== 'GET') {
    return;
  }

  fetchEvent.respondWith(
    caches.match(fetchEvent.request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(fetchEvent.request)
        .then((response) => {
          const cloned = response.clone();
          const url = new URL(fetchEvent.request.url);

          if (url.origin === self.location.origin && url.pathname.startsWith('/assets/')) {
            caches.open(CACHE_NAME).then((cache) => cache.put(fetchEvent.request, cloned));
          }

          return response;
        })
        .catch(() => cached ?? Response.error());
    }),
  );
});
