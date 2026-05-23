/**
 * AWC Service Worker
 * Cache version is auto-updated by the build/deploy script whenever any file changes.
 * To manually bust the cache, change CACHE_VERSION below.
 */

const CACHE_VERSION = 'awc-f3329c80';
const CACHE_NAME = CACHE_VERSION;

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/admin.html',
  '/styles.css',
  '/js/app.js',
  '/js/db.js',
  '/js/lang.js',
  '/js/icons.js',
  '/js/sql.js',
  '/js/sql-wasm.js',
  '/js/sql-wasm.wasm',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon-maskable-192x192.png',
  '/icons/icon-maskable-512x512.png',
  '/icons/apple-touch-icon.png',
  '/icons/favicon-32x32.png',
  '/icons/favicon-16x16.png',
];

// ── Install: cache all core assets ──────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())   // activate immediately, don't wait for old SW to die
  );
});

// ── Activate: delete every old cache version ────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())  // take control of all open pages immediately
  );
});

// ── Fetch: cache-first for assets, network-first for HTML ───────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== location.origin) return;

  // Skip non-GET requests (POST form submissions, etc.)
  if (request.method !== 'GET') return;

  const isHTML = request.headers.get('accept')?.includes('text/html');

  if (isHTML) {
    // Network-first for HTML: always try to get fresh page, fall back to cache
    event.respondWith(networkFirst(request));
  } else {
    // Cache-first for all assets (JS, CSS, WASM, fonts, images)
    event.respondWith(cacheFirst(request));
  }
});

// ── Strategies ───────────────────────────────────────────────────────────────

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Truly offline and not cached — return a minimal offline response
    return offlineFallback(request);
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || offlineFallback(request);
  }
}

function offlineFallback(request) {
  const url = new URL(request.url);
  const isHTML = request.headers.get('accept')?.includes('text/html');

  if (isHTML) {
    // Return index.html as offline shell for any HTML page
    return caches.match('/index.html');
  }

  // For other assets, return a minimal empty response so the page doesn't break
  return new Response('', { status: 408, statusText: 'Offline' });
}

// ── Message: force-update from the page ─────────────────────────────────────
// Page can call: navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' })
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
