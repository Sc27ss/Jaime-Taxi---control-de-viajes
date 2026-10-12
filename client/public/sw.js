const CACHE = 'jaime-taxi-v1';
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['/', '/icon.svg', '/manifest.webmanifest']))); self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((x) => x !== CACHE).map((x) => caches.delete(x))))); self.clients.claim(); });
self.addEventListener('fetch', (e) => {
  const { request } = e; const url = new URL(request.url);
  if (request.method !== 'GET' || url.pathname.startsWith('/api/') || url.origin !== location.origin) return;
  e.respondWith(fetch(request).then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(request, copy)); return r; })
    .catch(() => caches.match(request).then((m) => m || caches.match('/'))));
});
