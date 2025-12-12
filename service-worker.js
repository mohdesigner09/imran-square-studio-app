const CACHE_NAME = 'imran-square-v109';

const urlsToCache = [
  '/',
  '/index.html',
  '/landing.html',
  '/login.html',
  '/manifest.json',
  '/resources/icon-192.png',
  '/resources/icon-512.png',
  '/main.js',
  '/dashboard-advanced.js'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  // Sirf apne domain ke requests cache karo → Tailwind, Google fonts errors band
  if (!event.request.url.startsWith(self.location.origin)) {
    return fetch(event.request);
  }

  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    })
  );
});