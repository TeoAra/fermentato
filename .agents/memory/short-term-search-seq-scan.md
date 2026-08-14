---
name: Short search terms bypass trgm indexes
description: 1-2 char LIKE '%xx%' can't use pg_trgm → 30s seq scans on VPS; search warmer of keystroke prefixes can saturate the pg pool and 500 auth
---

# Short search terms bypass trgm indexes → pool saturation

**Rule:** `LIKE '%xx%'` with fewer than 3 chars cannot use GIN pg_trgm indexes (trigrams need 3 chars). On the VPS (1.19M beers) each such candidate sub-query becomes a ~30s seq scan; the beer-search candidate-UNION fires several in parallel.

**Why:** The search cache warmer (routes.ts) warms EVERY keystroke prefix including 1–2 char ones on boot and every 15 min. Each warm holds ~4+ connections for ~30s → with pool max 10, real traffic (including `/api/auth/user` session lookups) gets "timeout exceeded when trying to connect" 500s for a minute+. Observed in production Aug 2026 while verifying the idle-hang fix — looked like a login/session bug but wasn't.

**How to apply:** Don't warm prefixes shorter than 2–3 chars (UI only fires at length > 1 anyway); consider a length guard or a cheap fallback plan for 1–2 char queries; when diagnosing auth 500s check `pg_stat_activity` for candidate-UNION queries before blaming the session store. Note: prod VPS DB is LOCAL Postgres (127.0.0.1/fermenta), not Neon.
