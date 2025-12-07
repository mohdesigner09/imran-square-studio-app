const CACHE_NAME = 'imran-square-safe-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/landing.html',
  '/manifest.json',
  '/resources/icon-32.png',
  '/resources/icon-192.png',
  '/main.js',
  '/dashboard-advanced.js'
];

// 1. Install (Sirf apni files save karo)
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

// 2. Fetch (EXTERNAL FILES KO IGNORE KARO - Ye Red Errors band karega)
self.addEventListener('fetch', (event) => {
  // Agar link apni website ka nahi hai (jaise tailwind, google), to cache mat karo
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// 3. Activate (Purana cache saaf karo)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});