// Shared catalog cache invalidation registry.
//
// The in-memory search/TTL caches live inside server/routes.ts (module scope),
// but mutations that must invalidate them (admin deletes) live in
// server/routes-admin.ts. To avoid an import cycle and keep a single source of
// truth, routes.ts registers its cache-clearing callbacks here and any module
// can trigger them via bustCatalogCaches().

type Buster = () => void;
const busters = new Set<Buster>();

/** Register a callback that clears a catalog-derived cache. */
export function registerCatalogCacheBuster(fn: Buster) {
  busters.add(fn);
}

/** Run every registered cache buster. Safe to call from any module. */
export function bustCatalogCaches() {
  for (const fn of busters) {
    try { fn(); } catch { /* non-blocking */ }
  }
}

// ── Home feed caches ──────────────────────────────────────────────────────────
// Separate channel so tap-list mutations (e.g. from the Telegram/WhatsApp bot)
// can invalidate the home "taplist-activity" feed without also clearing the
// heavier search/catalog caches, which tap changes do not affect.
const homeBusters = new Set<Buster>();

/** Register a callback that clears a home-feed-derived cache. */
export function registerHomeCacheBuster(fn: Buster) {
  homeBusters.add(fn);
}

/** Run every registered home-feed cache buster. Safe to call from any module. */
export function bustHomeCaches() {
  for (const fn of homeBusters) {
    try { fn(); } catch { /* non-blocking */ }
  }
}

// ── Per-pub stats cache ───────────────────────────────────────────────────────
// The stats-extended TTL cache lives in routes.ts, but the bot and other modules
// need to bust it without an import cycle.  Register the deleter here once and
// call bustPubStats(pubId) from anywhere.
type PubStatsBuster = (pubId: number) => void;
const pubStatsBusters = new Set<PubStatsBuster>();

/** Register the callback that deletes a per-pub stats cache entry. */
export function registerPubStatsBuster(fn: PubStatsBuster) {
  pubStatsBusters.add(fn);
}

/** Invalidate the cached stats for a specific pub. Safe to call from any module. */
export function bustPubStats(pubId: number) {
  for (const fn of pubStatsBusters) {
    try { fn(pubId); } catch { /* non-blocking */ }
  }
}

// ── Per-brewery stats cache ───────────────────────────────────────────────────
// The brewery-stats-extended TTL cache lives in routes.ts. Tasting mutations
// must invalidate it without creating an import cycle — register the deleter
// here once and call bustBreweryStats(breweryId) from anywhere.
type BreweryStatsBuster = (breweryId: number) => void;
const breweryStatsBusters = new Set<BreweryStatsBuster>();

/** Register the callback that deletes a per-brewery stats cache entry. */
export function registerBreweryStatsBuster(fn: BreweryStatsBuster) {
  breweryStatsBusters.add(fn);
}

/** Invalidate the cached stats for a specific brewery. Safe to call from any module. */
export function bustBreweryStats(breweryId: number) {
  for (const fn of breweryStatsBusters) {
    try { fn(breweryId); } catch { /* non-blocking */ }
  }
}
