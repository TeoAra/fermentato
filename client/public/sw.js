const CACHE_VERSION = 'v3';
const STATIC_CACHE = `fermenta-static-${CACHE_VERSION}`;
const PAGE_CACHE = `fermenta-pages-${CACHE_VERSION}`;
const IMAGE_CACHE = `fermenta-images-${CACHE_VERSION}`;

const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
];

// ─── Install: pre-cache critical assets ───────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
  self.skipWaiting();
});

// ─── Activate: purge old caches ───────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  const CURRENT = [STATIC_CACHE, PAGE_CACHE, IMAGE_CACHE];
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

  // 1. API calls: always network, no cache
  if (url.pathname.startsWith('/api/')) return;

  // 2. External resources (fonts, CDN): stale-while-revalidate
  if (!url.origin.includes(self.location.hostname)) {
    event.respondWith(staleWhileRevalidate(event.request, STATIC_CACHE));
    return;
  }

  // 3. Images: cache-first (long-lived)
  if (/\.(png|jpg|jpeg|webp|gif|svg|ico)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(event.request, IMAGE_CACHE));
    return;
  }

  // 4. Static assets (JS/CSS bundles from Vite): cache-first (hashed filenames)
  if (/\.(js|css|woff2?|ttf|eot)$/.test(url.pathname) || url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(event.request, STATIC_CACHE));
    return;
  }

  // 5. HTML navigation: network-first, fall back to cached shell
  event.respondWith(networkFirstWithFallback(event.request));
});

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
    // Fallback to cached homepage
    return caches.match('/') || new Response('Offline', { status: 503 });
  }
}

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
          body: JSON.stringify({
            endpoint: sub.endpoint,
            p256dh: sub.keys?.p256dh,
            auth: sub.keys?.auth,
          }),
        });
      })
  );
});
