---
name: Cache key serialization
description: In-memory TTL cache keys built from user input must be collision-free and canonicalized.
---

Rule: when building cache keys from multiple user-controlled request params, use `JSON.stringify` of an array (versioned, e.g. `prefix:v2:[...]`) — never `:`-join raw values. Also trim/canonicalize inputs BEFORE both key construction and the DB call so whitespace/case variants share one entry and cannot poison it.

**Why:** code review rejected a `:`-joined key twice: `q="x:y",country="z"` collided with `q="x",country="y:z"`, allowing public cache poisoning; and trimming only in the key (not the query) let `" foo "` poison the `"foo"` entry.

**How to apply:** any `memCached`/searchCache key in server/routes.ts that includes query strings. `memCached` now has single-flight dedupe + size sweep (cap ~500). Regression tests: `tests/brewery-cache.test.mjs` (run against a live dev server).
