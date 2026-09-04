const CACHE_PREFIX = 'captapro-';
const CACHE_NAME = `${CACHE_PREFIX}shell-v4-safe`;
const SHELL = ['./', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-512-maskable.png'];
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
  if (req.headers.has('range') || req.headers.has('if-range')) return true;
  if (hasSensitiveQuery(url)) return true;
  const path = url.pathname.toLowerCase();
  return SENSITIVE_PATHS.some(part => path.includes(part));
}

function isSafeResponse(response) {
  if (!response || !response.ok || response.status === 206 || response.type !== 'basic') return false;
  if (response.redirected || response.headers.has('content-range')) return false;
  const cacheControl = (response.headers.get('cache-control') || '').toLowerCase();
  if (cacheControl.includes('private') || cacheControl.includes('no-store')) return false;
  if (response.headers.has('set-cookie')) return false;
  return true;
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.allSettled(SHELL.map(async asset => {
      const response = await fetch(asset, { credentials: 'omit', cache: 'no-store', redirect: 'error' });
      if (isSafeResponse(response)) await cache.put(asset, response);
    }));
  })());
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (isSensitiveRequest(req, url)) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req, { cache: 'no-store', redirect: 'error' }).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match('./')) || Response.error();
      })
    );
    return;
  }

  const relativePath = `.${url.pathname}`;
  if (url.search || !SHELL.includes(relativePath)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(req);
    if (cached) return cached;

    const response = await fetch(req, { credentials: 'omit', cache: 'no-store', redirect: 'error' });
    if (isSafeResponse(response)) await cache.put(req, response.clone());
    return response;
  })());
});
