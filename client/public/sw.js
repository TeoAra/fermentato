const CACHE_VERSION = 'v10';
const STATIC_CACHE = `fermenta-static-${CACHE_VERSION}`;
const PAGE_CACHE = `fermenta-pages-${CACHE_VERSION}`;
const IMAGE_CACHE = `fermenta-images-${CACHE_VERSION}`;
const TILE_CACHE = `fermenta-tiles-${CACHE_VERSION}`;
const API_SAFE_CACHE = `fermenta-api-safe-${CACHE_VERSION}`;
// Whitelist STRETTA di endpoint API "safe" che possono usare stale-while-revalidate:
// solo dati pubblici raramente modificati (stili, popular styles, mappa birrifici).
// React Query gestisce comunque la cache lato app; il SW serve solo per
// ridurre TTFB su cold-start e migliorare la UX in connessioni lente.
const API_SAFE_WHITELIST = [
  '/api/beers/styles',
  '/api/beers/popular-styles',
  '/api/breweries/map',
];
function isApiSafeRequest(url) {
  // No query param utente / no auth — solo path puliti
  if (url.search) return false;
  return API_SAFE_WHITELIST.includes(url.pathname);
}

// Tile cache limits (map tiles can be numerous)
const TILE_MAX_ENTRIES = 600;
const TILE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// Image cache limits
const IMAGE_MAX_ENTRIES = 200;
const IMAGE_MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000; // 3 days (ridotto da 7)

const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
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
  const CURRENT = [STATIC_CACHE, PAGE_CACHE, IMAGE_CACHE, TILE_CACHE, API_SAFE_CACHE];
  event.waitUntil(
    // Elimina tutte le cache vecchie incluse le eventuali API cache dei SW precedenti
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

  // 1. Map tiles: cache aggressiva (cambiano di rado, pesano molto)
  if (isMapTileRequest(url)) {
    event.respondWith(tileStrategy(event.request));
    return;
  }

  // 2. Chiamate API:
  //    - whitelist sicura → stale-while-revalidate (riduce TTFB)
  //    - tutto il resto → SEMPRE rete (React Query gestisce la cache app)
  if (url.pathname.startsWith('/api/')) {
    if (isApiSafeRequest(url)) {
      event.respondWith(staleWhileRevalidate(event.request, API_SAFE_CACHE));
    }
    return;
  }

  // 3. Font/CDN esterni: stale-while-revalidate
  if (!url.origin.includes(origin)) {
    event.respondWith(staleWhileRevalidate(event.request, STATIC_CACHE));
    return;
  }

  // 4. Immagini: cache con TTL 3 giorni + limite dimensione
  if (/\.(png|jpg|jpeg|webp|gif|svg|ico)$/.test(url.pathname)) {
    event.respondWith(imageStrategy(event.request));
    return;
  }

  // 5. Bundle JS/CSS con hash: cache permanente (l'hash cambia ad ogni deploy)
  if (/\.(js|css|woff2?|ttf|eot)$/.test(url.pathname) || url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(event.request, STATIC_CACHE));
    return;
  }

  // 6. Navigazione HTML: network-first, fallback alla shell cached
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

// ─── Strategies ───────────────────────────────────────────────────────────────

// Verifica che la risposta sia davvero del tipo atteso dall'URL.
// Es: una richiesta /assets/foo.js deve avere content-type JS, non text/html
// (che indica un fallback SPA del server quando il file è stato eliminato/rinominato).
function isValidAssetResponse(request, response) {
  if (!response || !response.ok) return false;
  const url = new URL(request.url);
  const ct = (response.headers.get('content-type') || '').toLowerCase();
  if (/\.js$/.test(url.pathname) && !ct.includes('javascript') && !ct.includes('ecmascript')) return false;
  if (/\.css$/.test(url.pathname) && !ct.includes('css')) return false;
  if (/\.(woff2?|ttf|eot)$/.test(url.pathname) && !ct.includes('font') && !ct.includes('octet-stream')) return false;
  return true;
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  // Se la voce cached è invalida (es: HTML fallback salvato per errore in v9),
  // la ignoriamo e proviamo la rete.
  if (cached && isValidAssetResponse(request, cached)) return cached;
  const response = await fetch(request);
  if (isValidAssetResponse(request, response)) {
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
    // NB: caches.match restituisce una Promise (sempre truthy) — va awaitata,
    // altrimenti il fallback `|| new Response` non scatta mai e un cache miss
    // fa fallire respondWith con undefined.
    const shell = await caches.match('/');
    return shell || new Response('Offline', { status: 503 });
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
// Usato per invalidare le immagini cached dopo un upload.
// Le API non sono mai in cache SW, quindi non servono altri messaggi.
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'INVALIDATE_CACHE' && event.data.clearImages) {
    caches.open(IMAGE_CACHE).then((cache) => cache.keys().then((keys) => {
      keys.forEach((req) => {
        if (new URL(req.url).pathname.startsWith(event.data.clearImages)) {
          cache.delete(req);
        }
      });
    }));
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

// pushsubscriptionchange: il browser rinnova la subscription; dobbiamo
// ri-iscriverci e notificare il backend, gestendo il caso in cui
// oldSubscription sia null (es. Safari iOS) recuperando le opzioni dal
// VAPID key esposto via /api/push/vapid-key.
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil((async () => {
    try {
      let options = event.oldSubscription?.options;
      if (!options) {
        // Recupera la VAPID public key dal server
        const r = await fetch('/api/push/vapid-key', { credentials: 'include' });
        if (!r.ok) return;
        const { publicKey } = await r.json();
        if (!publicKey) return;
        options = { userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) };
      }
      const subscription = await self.registration.pushManager.subscribe(options);
      const sub = subscription.toJSON();
      // Segnala al server di sostituire la vecchia subscription se nota
      await fetch('/api/push/subscribe', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          p256dh: sub.keys?.p256dh,
          auth: sub.keys?.auth,
          oldEndpoint: event.oldSubscription?.endpoint || null,
        }),
      });
    } catch (e) {
      // Non possiamo loggare lato utente; il prossimo refresh proverà di nuovo.
    }
  })());
});

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}
