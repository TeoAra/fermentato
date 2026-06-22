---
name: Taplist feed ordering & cache
description: Why the home "taplist-activity" feed must order by updated_at (not id) and how every tap mutation must keep it fresh.
---

# Home taplist feed: order by recency, not id

**Rule:** The shared home feed `/api/home/taplist-activity` (powers "Ora vicino a te",
"In spina vicino a te", "Attività dalla community") must order by
`COALESCE(updated_at, added_at) DESC`, never by `id DESC`.

**Why:** "cambia birra" / replace does an **in-place** `UPDATE tap_list SET beer_id=...`
on an existing row — the serial `id` never changes, so `ORDER BY id DESC` silently
buries the replaced beer and it never resurfaces. New beers (INSERT) get a fresh id so
they looked fine, masking the bug for replaces only.

**How to apply:**
- Every tap mutation that should count as feed activity must bump `updated_at`.
  - Web path goes through `storage.updateTapListItem`, which already sets `updatedAt`.
  - Bot path (`server/bot-commands.ts`) uses **raw `db.update`/`db.insert`**, NOT storage,
    so it must set `updatedAt: new Date()` on swaps explicitly (inserts get the DB default).
- The feed is memory-cached ~2 min inside `server/routes.ts` (`_memCache`). Any mutation
  must invalidate it. Web routes call `_memCache.delete("home:taplist-activity")` directly;
  other modules can't reach `_memCache` (import cycle), so use the **home-feed channel** in
  `server/catalog-cache.ts` (`registerHomeCacheBuster` / `bustHomeCaches`) — kept separate
  from `bustCatalogCaches` so tap edits don't needlessly flush the heavier search caches.
- The feed does NOT filter `is_visible`; bot hide/show therefore don't affect it (intentional
  for the new/replaced-beer scope).
