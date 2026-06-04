---
name: Search cache key consistency
description: The /api/search request path and the popular-search warmer must produce identical cache keys, or warming is wasted.
---

`/api/search` caches results under a key derived from the query + filters. A background warmer re-warms popular terms on an interval.

**Rule:** Both must build the key via the SAME helper (`buildSearchCacheKey` in `server/routes.ts`) and normalize the query the same way (`trim().toLowerCase()`).

**Why:** Originally the warmer normalized terms to lowercase but the request path used the raw `q`, so a search for `IPA` read key `search:IPA:...` while the warmer wrote `search:ipa:...` — the warmed entry was never read. Code review flagged this as a FAIL.

**How to apply:** Never hand-build a `search:...` cache key string inline. Add/extend `buildSearchCacheKey(query, filters)` and call it from every place that reads or writes the search cache.
