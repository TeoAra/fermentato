// ─────────────────────────────────────────────────────────────────────────────
// Fermenta.to — Routing reale via OSRM (Open Source Routing Machine)
//
// Calcola distanze su strada (non in linea d'aria) usando il router pubblico
// router.project-osrm.org. È gratuito e senza API key, ma soggetto a un
// rate-limit non documentato (~1 req/s per IP). Per non saturarlo:
//   - Cache in-memory con TTL 24 h, chiave = (mode, fromLat,fromLng → toLat,toLng)
//     arrotondati a 4 decimali (~11 m di precisione).
//   - Rate limiter per IP con token bucket: 1 req/s, burst 3.
//   - Fallback Haversine se OSRM è down, in timeout, o ha rate-limited il VPS.
//
// Telemetria:
//   - Log con [routing] sul console (OK/FAIL/RATELIMIT/CACHE)
//   - Esposto in /api/route insieme al campo `source` per tracciare
//     in produzione quanto spesso cadiamo nel fallback.
// ─────────────────────────────────────────────────────────────────────────────

type LatLng = { lat: number; lng: number };
type Mode = 'driving' | 'walking' | 'cycling';

export type RouteResult = {
  distanceM: number;
  durationS: number;
  geometry: { type: 'LineString'; coordinates: [number, number][] } | null;
  isStraightLine: boolean;
  source: 'osrm' | 'cache' | 'fallback-haversine';
  reason?: string;
};

const OSRM_BASE = process.env.OSRM_BASE_URL || 'https://router.project-osrm.org';
const OSRM_TIMEOUT_MS = 4500;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 5000;

// ── Cache in-memory con LRU semplice ────────────────────────────────────────
const cache = new Map<string, { value: RouteResult; expiresAt: number }>();

function cacheKey(from: LatLng, to: LatLng, mode: Mode): string {
  const r = (n: number) => n.toFixed(4); // ~11 m
  return `${mode}:${r(from.lat)},${r(from.lng)}->${r(to.lat)},${r(to.lng)}`;
}

function cacheGet(key: string): RouteResult | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (hit.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }
  // LRU bump
  cache.delete(key);
  cache.set(key, hit);
  return { ...hit.value, source: 'cache' };
}

function cachePut(key: string, value: RouteResult): void {
  if (cache.size >= CACHE_MAX_ENTRIES) {
    // evict oldest insertion
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ── Rate limiter per IP (token bucket: 3 burst, 1 token/sec di refill) ──────
type Bucket = { tokens: number; lastRefill: number };
const buckets = new Map<string, Bucket>();
const BUCKET_CAPACITY = 3;
const REFILL_PER_MS = 1 / 1000; // 1 token/sec

export function tryConsumeToken(ip: string): boolean {
  const now = Date.now();
  let b = buckets.get(ip);
  if (!b) {
    b = { tokens: BUCKET_CAPACITY, lastRefill: now };
    buckets.set(ip, b);
  }
  const elapsed = now - b.lastRefill;
  b.tokens = Math.min(BUCKET_CAPACITY, b.tokens + elapsed * REFILL_PER_MS);
  b.lastRefill = now;
  if (b.tokens < 1) return false;
  b.tokens -= 1;
  return true;
}

// Soft global throttle: anche se un singolo IP non ha consumato i token,
// non vogliamo travolgere OSRM globalmente. Counter su finestra mobile 1s.
let globalWindowStart = Date.now();
let globalWindowCount = 0;
const GLOBAL_MAX_PER_SEC = 5;

function tryConsumeGlobal(): boolean {
  const now = Date.now();
  if (now - globalWindowStart > 1000) {
    globalWindowStart = now;
    globalWindowCount = 0;
  }
  if (globalWindowCount >= GLOBAL_MAX_PER_SEC) return false;
  globalWindowCount += 1;
  return true;
}

// ── Haversine fallback ─────────────────────────────────────────────────────
function haversineMeters(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

function haversineFallback(from: LatLng, to: LatLng, mode: Mode, reason: string): RouteResult {
  const distanceM = haversineMeters(from, to);
  // Stima durata grezza in base alla velocità media del modo
  const speedKmh = mode === 'walking' ? 4.5 : mode === 'cycling' ? 15 : 50;
  const durationS = Math.round((distanceM / 1000) / speedKmh * 3600);
  return {
    distanceM,
    durationS,
    geometry: { type: 'LineString', coordinates: [[from.lng, from.lat], [to.lng, to.lat]] },
    isStraightLine: true,
    source: 'fallback-haversine',
    reason,
  };
}

// ── OSRM client ────────────────────────────────────────────────────────────
function osrmProfile(mode: Mode): string {
  // Il server pubblico project-osrm espone solo il profilo "driving".
  // Per "walking"/"cycling" cadiamo già su Haversine con velocità adatta,
  // a meno che l'utente abbia configurato un proprio OSRM_BASE_URL con
  // i profili installati.
  return mode === 'driving' ? 'driving' : process.env.OSRM_BASE_URL ? mode : 'driving';
}

export async function getRouteDistance(
  from: LatLng,
  to: LatLng,
  mode: Mode = 'driving',
  opts: { forceFallback?: boolean } = {},
): Promise<RouteResult> {
  if (!Number.isFinite(from.lat) || !Number.isFinite(from.lng) ||
      !Number.isFinite(to.lat) || !Number.isFinite(to.lng)) {
    return haversineFallback(from, to, mode, 'invalid-coords');
  }

  // Per IP rate-limit (o caller esplicito): cache hit ok, altrimenti fallback
  // diretto senza chiamare OSRM né consumare il throttle globale.
  if (opts.forceFallback) {
    const key0 = cacheKey(from, to, mode);
    const cached0 = cacheGet(key0);
    if (cached0) return cached0;
    return haversineFallback(from, to, mode, 'ip-rate-limit');
  }

  const key = cacheKey(from, to, mode);
  const cached = cacheGet(key);
  if (cached) return cached;

  if (!tryConsumeGlobal()) {
    const fb = haversineFallback(from, to, mode, 'global-throttle');
    console.warn('[routing] OSRM global throttle — fallback Haversine');
    return fb;
  }

  const profile = osrmProfile(mode);
  const url = `${OSRM_BASE}/route/v1/${profile}/${from.lng},${from.lat};${to.lng},${to.lat}` +
    `?overview=simplified&geometries=geojson&alternatives=false&steps=false`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), OSRM_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'fermenta.to/1.0 (+https://fermenta.to)' },
    });
    clearTimeout(timer);
    if (!res.ok) {
      if (res.status === 429) {
        console.warn('[routing] OSRM rate-limit 429 — fallback Haversine');
        return haversineFallback(from, to, mode, `osrm-${res.status}`);
      }
      console.warn(`[routing] OSRM ${res.status} — fallback Haversine`);
      return haversineFallback(from, to, mode, `osrm-${res.status}`);
    }
    const json = (await res.json()) as {
      code?: string;
      routes?: Array<{
        distance: number;
        duration: number;
        geometry: { type: 'LineString'; coordinates: [number, number][] };
      }>;
    };
    if (json.code !== 'Ok' || !json.routes || json.routes.length === 0) {
      return haversineFallback(from, to, mode, `osrm-${json.code || 'no-route'}`);
    }
    const r0 = json.routes[0];
    const result: RouteResult = {
      distanceM: r0.distance,
      durationS: Math.round(r0.duration),
      geometry: r0.geometry,
      isStraightLine: false,
      source: 'osrm',
    };
    cachePut(key, result);
    return result;
  } catch (err) {
    clearTimeout(timer);
    const reason = err instanceof Error && err.name === 'AbortError' ? 'timeout' : 'fetch-error';
    console.warn(`[routing] OSRM ${reason} — fallback Haversine`);
    return haversineFallback(from, to, mode, reason);
  }
}

export function routingCacheStats(): { size: number; capacity: number } {
  return { size: cache.size, capacity: CACHE_MAX_ENTRIES };
}
