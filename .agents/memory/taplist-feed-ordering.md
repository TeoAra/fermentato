---
name: Taplist feed ordering & cache
description: Attachment recency, removal semantics and notification wording for taplist activity.
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
- Only an actual attachment (new beer, different beer, or inactive-to-active serving)
  counts as new activity. Removal, deactivation, reordering, prices, visibility and
  same-beer edits must preserve attachment recency.
  - Apply this distinction to raw bot writes as well as web updates.
- The feed is memory-cached ~2 min inside `server/routes.ts` (`_memCache`). Any mutation
  must invalidate it. Web routes call `_memCache.delete("home:taplist-activity")` directly;
  other modules can't reach `_memCache` (import cycle), so use the **home-feed channel** in
  `server/catalog-cache.ts` (`registerHomeCacheBuster` / `bustHomeCaches`) — kept separate
  from `bustCatalogCaches` so tap edits don't needlessly flush the heavier search caches.
- The feed does NOT filter `is_visible`; bot hide/show therefore don't affect it (intentional
  for the new/replaced-beer scope).

## Removal and notification wording

**Rule:** Removing a beer must not appear as adding one. Attachment notifications
should say: `Pub X ha attaccato "Nome birra" di "Nome birrificio"`.
Omit the brewery clause only when the brewery is genuinely unknown.

**Why:** The user explicitly requested this distinction and wording. Reordering
remaining taps after a removal must not resurface those beers as new attachments.

**How to apply:** Keep the meaning consistent in the activity feed, in-app alerts
and push notifications, including tap-specific wishlist alerts. An explicit
replacement may announce the newly attached beer, never the removed beer.
