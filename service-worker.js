const CACHE_NAME = 'imran-square-v1.0.0';
const OFFLINE_URL = '/landing.html';

// Files to cache on install
const urlsToCache = [
  '/',
  '/landing.html',
  '/index.html',
  '/ai-chat.html',
  '/ai-tools.html',
  '/account.html',
  '/scripts.html',
  '/footage.html',
  '/project-hub.html',
  '/brainstorm.html',
  '/main.js',
  '/ai-chat.js',
  '/brainstorm.js',
  '/auth.js',
  '/dashboard-advanced.js',
  '/resources/imran square logo.png',
  '/resources/icon-192.png',
  '/resources/icon-512.png',
  '/resources/hero-film-studio.png',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/animejs/3.2.1/anime.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/Sortable/1.14.0/Sortable.min.js'
];

// Install event - cache critical files
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Caching app shell');
        return cache.addAll(urlsToCache.map(url => new Request(url, {cache: 'reload'})));
      })
      .then(() => {
        console.log('[ServiceWorker] Install complete');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[ServiceWorker] Install failed:', error);
      })
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[ServiceWorker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[ServiceWorker] Claiming clients');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip chrome extensions and dev tools
  if (event.request.url.startsWith('chrome-extension://')) return;
  if (event.request.url.includes('localhost:3000')) return; // Skip API calls

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return cached response
        if (response) {
          console.log('[ServiceWorker] Serving from cache:', event.request.url);
          return response;
        }

        // Clone the request
        const fetchRequest = event.request.clone();

        // Try network
        return fetch(fetchRequest)
          .then((response) => {
            // Check if valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            // Cache the fetched response
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch((error) => {
            console.error('[ServiceWorker] Fetch failed:', error);
            // Return offline page for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match(OFFLINE_URL);
            }
          });
      })
  );
});

// Background sync for offline actions (future enhancement)
self.addEventListener('sync', (event) => {
  console.log('[ServiceWorker] Background sync:', event.tag);
  if (event.tag === 'sync-projects') {
    event.waitUntil(syncProjects());
  }
});

// Placeholder for sync function
function syncProjects() {
  return Promise.resolve();
}

// Push notification support (future enhancement)
self.addEventListener('push', (event) => {
  console.log('[ServiceWorker] Push received');
  const options = {
    body: event.data ? event.data.text() : 'New update available',
    icon: '/resources/icon-192.png',
    badge: '/resources/icon-192.png',
    vibrate: [200, 100, 200],
    tag: 'imran-square-notification'
  };

  event.waitUntil(
    self.registration.showNotification('IMRAN SQUARE', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[ServiceWorker] Notification clicked');
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});

console.log('[ServiceWorker] Service Worker loaded');
