-- pgtuner-style performance tuning for Fermenta.to
-- EXPLAIN ANALYZE baseline (measured 2025-04):
--   searchBeers LIKE ANY : ~3162 ms  → seq scan on 395K rows, no usable index
--   exploreBreweries     :  ~716 ms  → seq scan, same cause
--   scan_logs similarity :   ~16 ms  → OK (table is small)
--   beer_views trending  :   seq scan, no index on beer_id/viewed_at
--
-- ROOT CAUSE: unaccent() is STABLE (not IMMUTABLE), so PostgreSQL cannot
--   use functional indexes on unaccent(lower(col)). The existing GIN trgm
--   indexes on name/style are never hit.
--
-- FIX STRATEGY:
--   1. Create an IMMUTABLE wrapper for unaccent (standard community pattern)
--   2. Build GIN trgm indexes on unaccent_immutable(lower(col))
--   3. Queries must use individual LIKE per word (not LIKE ANY) for trgm plan
--   4. Add composite index on beer_views for trending aggregation

-- ─── 1. IMMUTABLE unaccent wrapper ──────────────────────────────────────────
-- unaccent() itself is STABLE because it reads the unaccent_rules table.
-- In practice rules never change at runtime, so wrapping as IMMUTABLE is safe
-- and is the canonical approach (Postgres wiki, CitusData, many OSS projects).

CREATE OR REPLACE FUNCTION unaccent_immutable(text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT unaccent($1)
$$;

-- ─── 2. GIN trigram indexes on unaccented columns ────────────────────────────
-- These replace the query's full-table unaccent+lower pass with an index scan.
-- GIN trgm supports individual LIKE/ILIKE with leading wildcards (%word%).

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_beers_name_unaccent_trgm
  ON beers USING gin (unaccent_immutable(lower((name)::text)) gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_breweries_name_unaccent_trgm
  ON breweries USING gin (unaccent_immutable(lower((name)::text)) gin_trgm_ops);

-- Style is already indexed but let's be consistent
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_beers_style_lower_trgm
  ON beers USING gin (lower((COALESCE(style, ''))::text) gin_trgm_ops);

-- ─── 3. beer_views indexes ───────────────────────────────────────────────────
-- Trending query: WHERE viewed_at >= now()-7d GROUP BY beer_id ORDER BY count
-- Without these, it's a full seq scan + hash aggregate on every trending req.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_beer_views_beer_id
  ON beer_views (beer_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_beer_views_viewed_at
  ON beer_views (viewed_at DESC);

-- Composite for the exact trending query pattern
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_beer_views_viewed_at_beer_id
  ON beer_views (viewed_at DESC, beer_id);

-- ─── 4. scan_logs indexes ─────────────────────────────────────────────────
-- The scan memory lookup uses similarity() on ocr_text.
-- GIN trgm here will speed up future queries as the table grows.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_scan_logs_ocr_text_trgm
  ON scan_logs USING gin (lower(unaccent_immutable(COALESCE(ocr_text, ''))) gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_scan_logs_chosen_beer_id
  ON scan_logs (chosen_beer_id)
  WHERE chosen_beer_id IS NOT NULL;

-- ─── 5. Additional missing indexes ──────────────────────────────────────────

-- user_cellar: queried by user_id on My Cellar page
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_cellar_user_id
  ON user_cellar (user_id);

-- user_wishlist: queried by user_id
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_wishlist_user_id
  ON user_wishlist (user_id);

-- scan_logs: missing index on was_correct (used in memory lookup WHERE)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_scan_logs_was_correct
  ON scan_logs (was_correct)
  WHERE was_correct IS NOT FALSE AND chosen_beer_id IS NOT NULL;
