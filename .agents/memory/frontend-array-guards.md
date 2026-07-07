---
name: Frontend array-shape crashes
description: Why explore/social pages white-screen when the API returns non-array shapes, and how to prevent it
---

# Frontend crashes on non-array API responses

Several client pages define their **own** `queryFn` as `fetch(url).then(r => r.json())`
**without checking `r.ok`**. On a non-2xx response the JSON error body (e.g.
`{message: "..."}`) becomes the query `data`. A `data = []` default only fires when
data is `undefined`, so an error-object slips through and the next `.map` / `.forEach`
throws (`X.map is not a function`, `(X ?? []).forEach is not a function`).

The default react-query fetcher in `client/src/lib/queryClient.ts` (`throwIfResNotOk`)
already throws on non-OK, so queries that omit a custom `queryFn` are safe. Only the
hand-rolled `queryFn`s are exposed.

**Why:** after a VPS DB restore to an older snapshot, the prod DB was missing columns
the current code needs (soft-archive `is_closed` / `is_discontinued` group). Every
listing/search/explore endpoint that runs `server/visibility.ts` SQL errored and
returned a non-array body → explore-breweries, explore-beers and the social-feed
friends tab all crashed.

**How to apply:**
- Guard every consumption point with `Array.isArray(x) ? x : []` — do not rely on
  `x ?? []` (nullish only catches null/undefined, not an object/string).
- For empty-string traps like avatar initials, `""[0]` is `undefined`; use
  `(name?.[0] ?? "?").toUpperCase()`, not `name[0]`.
- Prefer custom `queryFn`s that check `r.ok` and coerce: `if (!r.ok) return []; return Array.isArray(j) ? j : [];`.
- The real fix for the underlying incident is schema, not the client: keep the prod DB
  columns in sync. The guards only degrade gracefully to empty states.

# Soft-archive columns are not in any migration file

`breweries.is_closed / closed_source / closed_at` and `beers.is_discontinued /
discontinued_source` were added via `drizzle-kit push`, so `server/migrate.ts`
(runs the numbered `migrations/` journal) will NOT create them. Apply them manually
with idempotent `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` — see
`migrations/vps_migration_soft_archive_columns.sql`. Same pattern as the other
`migrations/vps_migration_*.sql` files, which are also manual/idempotent and not
journaled.

# React #185 infinite loop from `data: x = []` used as a useEffect dep

A locally-computed default like `const { data: cats = [] } = useQuery(...)` produces a
**fresh `[]` identity on every render** whenever `data` is `undefined` (loading OR error).
If that defaulted value is then used as a `useEffect` dependency whose body calls
`setState`, the effect re-runs every render → setState → re-render → new `[]` → loop →
React error #185 ("Maximum update depth exceeded"). This fired on the drinks tab
(`drink-manager.tsx`) after the DB restore left `/drink-categories/all` returning no array.

**Why:** the identity churn only happens when the query returns no array, so it hides in
dev (where the DB is complete) and only explodes in prod after schema drift.

**How to apply:**
- Depend on the **raw** query `data` (stable `undefined` across renders), not the defaulted
  alias: `useEffect(() => { if (!Array.isArray(data)) return; setLocal([...data]...); }, [data])`.
- Keep the defaulted alias (`const cats = Array.isArray(data) ? data : []`) for render/handlers.
- Prop-based variants (`taplist-manager`, `menu-category-manager` take `categories`/`tapList`
  as props) do NOT self-loop: the child's setState doesn't re-render the parent, so the prop
  identity stays stable across the child's re-renders. Only the local-default-in-same-component
  case loops.
