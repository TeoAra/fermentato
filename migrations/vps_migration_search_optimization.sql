-- ═══════════════════════════════════════════════════════════════════════════
-- Fermenta.to — VPS Search Optimization Migration
-- Da eseguire sul VPS: psql -U utente -d fermenta -f vps_migration_search_optimization.sql
-- Tempo stimato: 2-5 minuti (costruisce indici GIN su ~50k birre)
-- Eseguibile con il server attivo (indici CONCURRENT non bloccano le letture)
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Estensioni necessarie
CREATE EXTENSION IF NOT EXISTS pg_trgm;    -- trigram similarity + LIKE veloce
CREATE EXTENSION IF NOT EXISTS unaccent;   -- rimuove accenti (à→a, è→e …)

-- 2. Funzione unaccent_immutable richiesta dagli indici su espressione
--    (unaccent() di default è STABLE, non IMMUTABLE — non usabile negli indici)
CREATE OR REPLACE FUNCTION unaccent_immutable(text)
  RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE AS
  $$ SELECT unaccent($1) $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. BIRRE — indici GIN trigram
-- ═══════════════════════════════════════════════════════════════════════════

-- Nome birra normalizzato (unaccent + lower): "ipa belga" trova "IPA Belga"
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_beers_name_unaccent_trgm
  ON beers USING GIN (unaccent_immutable(lower(name)) gin_trgm_ops);

-- Nome birra senza spazi: "chimaycinq" trova "Chimay Cinq Cents"
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_beers_name_compact_trgm
  ON beers USING GIN (regexp_replace(lower(name), '\s+', '', 'g') gin_trgm_ops);

-- Stile birra: "american pale" trova "American Pale Ale"
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_beers_style_trgm
  ON beers USING GIN (lower(COALESCE(style, '')) gin_trgm_ops)
  WHERE style IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. BIRRIFICI — indici GIN trigram
-- ═══════════════════════════════════════════════════════════════════════════

-- Nome birrificio normalizzato
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_breweries_name_unaccent_trgm
  ON breweries USING GIN (unaccent_immutable(lower(name)) gin_trgm_ops);

-- Nome birrificio senza spazi: "lavalledelsole" trova "La Valle del Sole"
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_breweries_name_compact_trgm
  ON breweries USING GIN (regexp_replace(lower(name), '\s+', '', 'g') gin_trgm_ops);

-- Paese birrificio (filtri per nazionalità)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_breweries_country_lower
  ON breweries ((lower(COALESCE(country, ''))))
  WHERE country IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. PUB — indici GIN trigram
-- ═══════════════════════════════════════════════════════════════════════════

-- Nome pub
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pubs_name_trgm
  ON pubs USING GIN (unaccent_immutable(lower(name)) gin_trgm_ops);

-- Città pub
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pubs_city_trgm
  ON pubs USING GIN (unaccent_immutable(lower(COALESCE(city, ''))) gin_trgm_ops)
  WHERE city IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. UTENTI — indice per la ricerca people (nickname/nome/cognome)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_nickname_trgm
  ON users USING GIN (unaccent_immutable(lower(COALESCE(nickname, ''))) gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_name_trgm
  ON users USING GIN (
    unaccent_immutable(lower(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')))
    gin_trgm_ops
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. Keg count (da precedente migrazione — idempotente)
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE next_tap_proposals ADD COLUMN IF NOT EXISTS keg_count INTEGER DEFAULT 1;

-- ═══════════════════════════════════════════════════════════════════════════
-- Verifica finale: lista indici creati
-- ═══════════════════════════════════════════════════════════════════════════
SELECT indexname, tablename
FROM pg_indexes
WHERE indexname LIKE '%trgm%' OR indexname LIKE '%unaccent%' OR indexname LIKE '%compact%'
ORDER BY tablename, indexname;
