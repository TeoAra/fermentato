-- pgtuner-style performance tuning for Fermenta.to

-- ─── 0. Required extensions ─────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ─── 1. IMMUTABLE unaccent wrapper ──────────────────────────────────────────
-- unaccent() is STABLE (reads unaccent_rules table), so Postgres refuses to
-- build functional indexes on it. This IMMUTABLE wrapper is the canonical fix
-- (Postgres wiki, CitusData, Supabase docs). Rules never change at runtime.
-- Using single-quoted body (not $$) to avoid semicolon-splitting issues.

CREATE OR REPLACE FUNCTION unaccent_immutable(text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS 'SELECT unaccent($1)';

-- ─── 2. GIN trigram indexes on unaccented columns ────────────────────────────

CREATE INDEX IF NOT EXISTS idx_beers_name_unaccent_trgm
  ON beers USING gin (unaccent_immutable(lower((name)::text)) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_breweries_name_unaccent_trgm
  ON breweries USING gin (unaccent_immutable(lower((name)::text)) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_beers_style_lower_trgm
  ON beers USING gin (lower((COALESCE(style, ''))::text) gin_trgm_ops);

-- ─── 3. beer_views indexes ───────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_beer_views_beer_id
  ON beer_views (beer_id);

CREATE INDEX IF NOT EXISTS idx_beer_views_viewed_at
  ON beer_views (viewed_at DESC);

CREATE INDEX IF NOT EXISTS idx_beer_views_viewed_at_beer_id
  ON beer_views (viewed_at DESC, beer_id);

-- ─── 4. scan_logs indexes ────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_scan_logs_ocr_text_trgm
  ON scan_logs USING gin (lower(unaccent_immutable(COALESCE(ocr_text, ''))) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_scan_logs_chosen_beer_id
  ON scan_logs (chosen_beer_id)
  WHERE chosen_beer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_scan_logs_was_correct
  ON scan_logs (was_correct)
  WHERE was_correct IS NOT FALSE AND chosen_beer_id IS NOT NULL;

-- ─── 5. Additional missing indexes ──────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_user_cellar_user_id
  ON user_cellar (user_id);

CREATE INDEX IF NOT EXISTS idx_user_wishlist_user_id
  ON user_wishlist (user_id);
