---
name: Neon idle connection hang
description: Why the app froze after ~1h idle and the driver/timeout rules that prevent it
---

# Neon idle connection hang (users "locked out" after ~1h)

**Rule:** on a long-running server (VPS), never use `@neondatabase/serverless` WebSocket pool — use standard `pg.Pool` over TCP with `keepAlive`, `idleTimeoutMillis: 30s`, `connectionTimeoutMillis: 10s`, `statement_timeout: 30s`, and a `pool.on('error')` handler. Use verified TLS (`rejectUnauthorized: true`) — Neon certs are publicly valid.

**Why:** Neon closes idle WebSockets; the serverless pool hands out dead connections and the first query after idle (passport `deserializeUser`) hangs forever with no error → `/api/auth/user` never responds → client stuck on skeleton, looks like "login broken after 1 hour".

**How to apply:** session store (connect-pg-simple) must reuse the shared pool (`pool:` option), not its own `conString` pool. connect-pg-simple `ttl` is in SECONDS (cookie `maxAge` is ms — don't mix).

**Client-side defense:** default queryFn has 12s timeout; only the `/api/auth/user` probe degrades to null (unauthenticated) on timeout — all other queries must throw so pages show errors instead of fake-empty data. Compose React Query's `signal` with the timeout via `AbortSignal.any` (with addEventListener fallback). Native SocialLogin plugin calls (Google AND Apple) wrapped in 20s Promise.race with timer cleanup.
