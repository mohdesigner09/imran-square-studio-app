const CACHE_NAME = 'imran-square-v3'; // Version badha diya taaki naya update le le
const urlsToCache = [
  '/',
  '/index.html',
  '/landing.html',
  '/manifest.json',
  '/resources/icon-32.png',
  '/resources/icon-192.png',
  '/main.js',
  '/dashboard-advanced.js'
  // Note: Humne Tailwind/Google links hata diye hain taaki errors na aayein
];

// 1. Install (Sirf apni files save karo)
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Turant active ho jao
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('✅ Service Worker: Caching App Shell');
      return cache.addAll(urlsToCache);
    })
  );
});

// 2. Fetch (Agar External link hai to ignore karo, errors mat do)
self.addEventListener('fetch', (event) => {
  // Agar request doosri website (Tailwind/Google) ki hai, to Service Worker beech mein nahi aayega
  if (!event.request.url.startsWith(self.location.origin)) {
    return; 
  }

  // Apni files ke liye Cache check karo
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// 3. Activate (Purana kachra saaf karo)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🧹 Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});