const CACHE_NAME = 'captapro-shell-v1';
const SHELL = ['./'];
const SENSITIVE = ['/api/', '/auth', '/login', '/logout', '/admin', '/session', '/token'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || req.headers.has('authorization')) return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (SENSITIVE.some(part => url.pathname.toLowerCase().includes(part))) return;

  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match('./')));
    return;
  }

  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(response => {
      if (!response || !response.ok || response.type !== 'basic') return response;
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
      return response;
    }))
  );
});
