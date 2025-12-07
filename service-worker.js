// 🛑 SERVICE WORKER DISABLED FOR UPGRADE
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());