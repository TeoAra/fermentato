const CACHE_VERSION = 'v5';
const STATIC_CACHE = `fermenta-static-${CACHE_VERSION}`;
const PAGE_CACHE = `fermenta-pages-${CACHE_VERSION}`;
const IMAGE_CACHE = `fermenta-images-${CACHE_VERSION}`;
const TILE_CACHE = `fermenta-tiles-${CACHE_VERSION}`;
const API_CACHE = `fermenta-api-${CACHE_VERSION}`;

// Tile cache limits (map tiles can be numerous)
const TILE_MAX_ENTRIES = 600;
const TILE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// Image cache limits
const IMAGE_MAX_ENTRIES = 200;
const IMAGE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// API cache TTL for read-heavy endpoints
const API_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
];

// API endpoints worth short-lived caching
const CACHEABLE_API_PREFIXES = [
  '/api/pubs',
  '/api/breweries',
  '/api/beers',
  '/api/festivals/public',
];

// ─── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
  self.skipWaiting();
});

// ─── Activate: purge old caches ───────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  const CURRENT = [STATIC_CACHE, PAGE_CACHE, IMAGE_CACHE, TILE_CACHE, API_CACHE];
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !CURRENT.includes(k)).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ─── Fetch strategy ───────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const origin = self.location.hostname;

  // 1. Map tiles (OpenFreeMap, OSM, MapTiler, etc.)
  if (isMapTileRequest(url)) {
    event.respondWith(tileStrategy(event.request));
    return;
  }

  // 2. API calls
  if (url.pathname.startsWith('/api/')) {
    if (isCacheableApi(url.pathname)) {
      event.respondWith(apiStaleWhileRevalidate(event.request));
    }
    // Non-cacheable API = pass through (no caching)
    return;
  }

  // 3. External fonts/CDN: stale-while-revalidate
  if (!url.origin.includes(origin)) {
    event.respondWith(staleWhileRevalidate(event.request, STATIC_CACHE));
    return;
  }

  // 4. Images: cache-first with TTL + size limit
  if (/\.(png|jpg|jpeg|webp|gif|svg|ico)$/.test(url.pathname)) {
    event.respondWith(imageStrategy(event.request));
    return;
  }

  // 5. Static JS/CSS bundles (hashed): cache-first forever
  if (/\.(js|css|woff2?|ttf|eot)$/.test(url.pathname) || url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(event.request, STATIC_CACHE));
    return;
  }

  // 6. HTML navigation: network-first, fallback to cached shell
  event.respondWith(networkFirstWithFallback(event.request));
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isMapTileRequest(url) {
  const tileHosts = [
    'openfreemap.org', 'tile.openstreetmap.org', 'maptiler',
    'mapbox.com', 'tiles.stadiamaps.com', 'api.maptiler.com',
  ];
  return tileHosts.some((h) => url.hostname.includes(h)) ||
    /\/tiles\/|\.pbf$|\.mvt$/.test(url.pathname);
}

function isCacheableApi(pathname) {
  return CACHEABLE_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

// ─── Strategies ───────────────────────────────────────────────────────────────

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => cached);
  return cached || fetchPromise;
}

// Map tiles: stale-while-revalidate with TTL + entry limit
async function tileStrategy(request) {
  const cache = await caches.open(TILE_CACHE);
  const cached = await cache.match(request);

  if (cached) {
    const cachedDate = cached.headers.get('sw-cached-at');
    if (cachedDate && Date.now() - parseInt(cachedDate) > TILE_MAX_AGE_MS) {
      // Expired — revalidate in background, return stale
      fetch(request).then((res) => {
        if (res.ok) putWithMeta(cache, request, res.clone());
      }).catch(() => {});
    }
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      await putWithMeta(cache, request, response.clone());
      await evictOldEntries(cache, TILE_MAX_ENTRIES);
    }
    return response;
  } catch {
    return new Response('Tile not available offline', { status: 503 });
  }
}

// Images: cache-first with TTL + entry limit
async function imageStrategy(request) {
  const cache = await caches.open(IMAGE_CACHE);
  const cached = await cache.match(request);

  if (cached) {
    const cachedDate = cached.headers.get('sw-cached-at');
    if (!cachedDate || Date.now() - parseInt(cachedDate) < IMAGE_MAX_AGE_MS) {
      return cached;
    }
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      await putWithMeta(cache, request, response.clone());
      await evictOldEntries(cache, IMAGE_MAX_ENTRIES);
    }
    return response;
  } catch {
    return cached || new Response('Image not available offline', { status: 503 });
  }
}

// API short-lived stale-while-revalidate (5 min TTL)
async function apiStaleWhileRevalidate(request) {
  const cache = await caches.open(API_CACHE);
  const cached = await cache.match(request);

  const isStale = !cached || (() => {
    const date = cached.headers.get('sw-cached-at');
    return !date || Date.now() - parseInt(date) > API_CACHE_TTL_MS;
  })();

  if (cached && !isStale) {
    // Fresh enough — return immediately
    return cached;
  }

  const fetchPromise = fetch(request).then((res) => {
    if (res.ok) putWithMeta(cache, request, res.clone());
    return res;
  }).catch(() => cached);

  // Stale-while-revalidate: return stale if available, else await
  return cached || fetchPromise;
}

async function networkFirstWithFallback(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(PAGE_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return caches.match('/') || new Response('Offline', { status: 503 });
  }
}

// Clone response and inject sw-cached-at timestamp header
async function putWithMeta(cache, request, response) {
  const headers = new Headers(response.headers);
  headers.set('sw-cached-at', String(Date.now()));
  const blob = await response.blob();
  const metaResponse = new Response(blob, { status: response.status, statusText: response.statusText, headers });
  await cache.put(request, metaResponse);
}

// Simple LRU-ish eviction: delete oldest entries beyond max
async function evictOldEntries(cache, maxEntries) {
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  const toDelete = keys.slice(0, keys.length - maxEntries);
  await Promise.all(toDelete.map((k) => cache.delete(k)));
}

// ─── Cache invalidation via postMessage ───────────────────────────────────────
// L'app manda { type: 'INVALIDATE_CACHE', prefix: '/api/beers/123' }
// Il SW cancella tutte le voci in API_CACHE che iniziano per quel prefisso.
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'INVALIDATE_CACHE') {
    const prefix = event.data.prefix;
    if (!prefix) return;
    caches.open(API_CACHE).then((cache) => {
      cache.keys().then((keys) => {
        keys.forEach((req) => {
          if (new URL(req.url).pathname.startsWith(prefix)) {
            cache.delete(req);
          }
        });
      });
    });
    // Svuota anche IMAGE_CACHE per le immagini del birrificio/birra
    if (event.data.clearImages) {
      caches.open(IMAGE_CACHE).then((cache) => cache.keys().then((keys) => {
        keys.forEach((req) => {
          if (new URL(req.url).pathname.startsWith(event.data.clearImages)) {
            cache.delete(req);
          }
        });
      }));
    }
    return;
  }

  if (event.data.type === 'CLEAR_API_CACHE') {
    caches.delete(API_CACHE);
    return;
  }
});

// ─── Push notifications ───────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = { title: 'Fermenta.to', body: 'Nuova notifica', url: '/' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (e) {}

  const tag = data.tag || `fermenta-${data.type || 'general'}`;

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body || data.message || 'Nuova notifica',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      image: data.image || undefined,
      tag,
      renotify: false,
      requireInteraction: false,
      silent: !!data.silent,
      data: { url: data.url || '/' },
    }).then(() => {
      return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => client.postMessage({ type: 'PUSH_RECEIVED' }));
      });
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});

self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.registration.pushManager
      .subscribe(event.oldSubscription.options)
      .then((subscription) => {
        const sub = subscription.toJSON();
        return fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint, p256dh: sub.keys?.p256dh, auth: sub.keys?.auth }),
        });
      })
  );
});
