---
name: Duplicate admin routes
description: Several /api/admin/* endpoints are defined twice (routes.ts inline + routes-admin.ts); which one runs depends on Express registration order.
---

Several admin endpoints (e.g. `/api/admin/breweries/search`, `/api/admin/beers/search`, the brewery/beer PATCH and DELETE handlers) exist in BOTH `server/routes.ts` and `server/routes-admin.ts`.

`registerAdminRoutes(app)` is called early in `registerRoutes` (routes.ts), BEFORE the inline routes.ts definitions, so the **routes-admin.ts versions win** (Express uses the first matching handler).

**Why:** When changing admin search/edit/delete behavior, editing only the routes.ts copy has no effect — the routes-admin.ts copy is the live one. This already caused confusion when adding status fields and cache invalidation.

**How to apply:** Before changing any `/api/admin/*` endpoint, grep both files; assume the routes-admin.ts version is active unless registration order changed. Cross-module cache invalidation uses the shared registry in `server/catalog-cache.ts` (`registerCatalogCacheBuster` / `bustCatalogCaches`) to avoid an import cycle.
