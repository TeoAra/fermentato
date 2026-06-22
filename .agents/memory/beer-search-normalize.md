---
name: beer search normalization
description: how beer search must handle accents and avoid truncating valid matches at scale
---

# Beer search: unaccent both sides, never per-term LIMIT+INTERSECT

All beer search matching must go through `server/search-normalize.ts`
(`normalizeBeerSearch` + `buildBeerSearchFragments`). There are TWO call sites
that historically drifted and shared the same bugs — keep them unified via the
helper: `DatabaseStorage.searchBeers` (global `/api/search`) and
`/api/beers/search` (owner beer-proposal dialog).

Two rules the matching must always obey:

1. **Unaccent BOTH sides of every comparison.** The indexed name/style/brewery
   columns are `unaccent_immutable(lower(...))`. If the search term keeps its
   accent (e.g. `è`), it can only match the non-unaccented *compact* subqueries
   and silently misses on the main path. `searchBreweries`/`searchPubs` already
   unaccent both sides — beer search did not.
2. **Never build the result set with per-term `LIMIT N` + `INTERSECT`.** Common
   short words ("la", "è") match thousands of rows, get arbitrarily truncated
   (the old code used `LIMIT 300`, no ORDER BY), and the INTERSECT then drops the
   real target → zero results for specific multi-word queries.

**Fix pattern:** `candidate_ids = UNION(exact phrase on name/brewery unaccent +
compact, plus the few most-selective/longest tokens, each generously capped
~4000)`, then apply the FULL uncapped AND over *every* meaningful token on that
small candidate set. Because drivers are the most selective tokens, the target
survives their cap, so truncation cannot drop it.

**Why:** global search could not find the beer "Quella è la porta!" (a real
collab) at prod scale: the accented `è` missed the main path, and common words
truncated in the INTERSECT removed the row.

**How to apply:**
- Candidate subqueries must use the EXACT indexed expressions (no `COALESCE` on
  brewery name) so the GIN trigram indexes are actually used.
- Final match filter and score may use `COALESCE(br.name,'')` for LEFT JOIN
  null-safety (they run on the tiny candidate set, index use irrelevant there).
- The helper pushes its params onto a shared array first; callers append
  extra-filter params (gluten/alcohol/style/abv/ibu) AFTER calling it.
- Prod DB is self-hosted on a VPS (not Neon, not reachable via executeSql
  production) — verify on dev by inserting a temp row, querying, then deleting.
