const CACHE_NAME = 'captapro-shell-v2-safe';
const SHELL = ['./', './manifest.webmanifest', './icons/icon-192.svg', './icons/icon-512.svg'];
const SENSITIVE_PATHS = ['/api/', '/auth', '/login', '/logout', '/admin', '/session', '/token', '/me'];
const SENSITIVE_QUERY_KEYS = new Set([
  'token', 'access_token', 'refresh_token', 'password', 'passwd', 'secret',
  'session', 'session_id', 'authorization', 'api_key', 'apikey', 'code',
  'credential', 'credentials'
]);

function hasSensitiveQuery(url) {
  for (const key of url.searchParams.keys()) {
    if (SENSITIVE_QUERY_KEYS.has(key.toLowerCase())) return true;
  }
  return false;
}

function isSensitiveRequest(req, url) {
  if (req.headers.has('authorization') || req.headers.has('cookie')) return true;
  if (hasSensitiveQuery(url)) return true;
  const path = url.pathname.toLowerCase();
  return SENSITIVE_PATHS.some(part => path.includes(part));
}

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
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (isSensitiveRequest(req, url)) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req, { cache: 'no-store' }).catch(() => caches.match('./'))
    );
    return;
  }

  // Only the explicit app shell is cacheable. API/private/dynamic responses never enter Cache Storage.
  if (url.search || !SHELL.includes(`.${url.pathname}`)) return;

  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req, { cache: 'no-store' }).then(response => {
      if (!response || !response.ok || response.type !== 'basic') return response;
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
      return response;
    }))
  );
});
