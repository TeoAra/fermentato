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
