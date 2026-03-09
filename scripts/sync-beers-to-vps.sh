#!/bin/bash
# ============================================================
# sync-beers-to-vps.sh
# Sincronizza birrifici e birre RateBeer da Replit al VPS.
#
# - NON tocca: utenti, pub, recensioni, preferiti
# - Usa ON CONFLICT DO NOTHING: dati già presenti vengono saltati
# - Idempotente: puoi rieseguirlo più volte senza danni
#
# Uso: bash scripts/sync-beers-to-vps.sh
# ============================================================

set -e

# Ripristina chiave SSH dal segreto
bash "$(dirname "$0")/setup-ssh-key.sh" || exit 1

VPS_HOST="root@45.134.39.247"
VPS_DB="postgres://fermenta:antanicorp94@127.0.0.1:5432/fermenta"
VPS_APP="/www/nodeapps/fermenta"
SSH="ssh -i ${HOME}/.ssh/id_replit_sync -o StrictHostKeyChecking=no"
SCP="scp -i ${HOME}/.ssh/id_replit_sync -o StrictHostKeyChecking=no"

CSV_A="attached_assets/rb_Beers_A-J_clean2_1773065275434.csv"
CSV_K="attached_assets/rb_Beers_K-Z_clean2_1773065275434.csv"

echo ""
echo "================================================"
echo " Sync Birrifici + Birre RateBeer → VPS"
echo "================================================"

# ── Verifica CSV ──────────────────────────────────────────────
if [ ! -f "$CSV_A" ] || [ ! -f "$CSV_K" ]; then
  echo "❌ File CSV non trovati. Assicurati di essere nella root del progetto."
  exit 1
fi

# ── STEP 1: Sync birrifici ────────────────────────────────────
echo ""
echo "STEP 1 · Sync birrifici nuovi..."
VPS_MAX_BREWERY_ID=$($SSH "$VPS_HOST" "psql '$VPS_DB' -t -c 'SELECT COALESCE(MAX(id),0) FROM breweries;' 2>/dev/null" | tr -d ' \n')
echo "   VPS max brewery ID: $VPS_MAX_BREWERY_ID"

cat > /tmp/export_breweries.sql << ENDSQL
COPY (
  SELECT id, name, location, region, description, logo_url, website_url,
         latitude, longitude, rating, created_at, cover_image_url,
         vat_number, phone, country
  FROM breweries
  WHERE id > $VPS_MAX_BREWERY_ID
  ORDER BY id
) TO STDOUT WITH CSV
ENDSQL

psql $DATABASE_URL -f /tmp/export_breweries.sql 2>/dev/null > /tmp/sync_breweries.csv
BREW_COUNT=$(wc -l < /tmp/sync_breweries.csv)
echo "   Birrifici da sincronizzare: $BREW_COUNT"

if [ "$BREW_COUNT" -gt 0 ]; then
  $SCP /tmp/sync_breweries.csv "$VPS_HOST":/tmp/
  $SSH "$VPS_HOST" "psql '$VPS_DB' -v ON_ERROR_STOP=0 <<'EOSQL'
CREATE TEMP TABLE tmp_brew (
  id int, name text, location text, region text, description text,
  logo_url text, website_url text, latitude numeric, longitude numeric,
  rating numeric, created_at timestamp, cover_image_url text,
  vat_number text, phone text, country text
);
\copy tmp_brew FROM '/tmp/sync_breweries.csv' WITH CSV
INSERT INTO breweries (id, name, location, region, description, logo_url, website_url, latitude, longitude, rating, created_at, cover_image_url, vat_number, phone, country)
SELECT id, name, COALESCE(location,''), COALESCE(region,''), description, logo_url, website_url, latitude, longitude, COALESCE(rating,0), COALESCE(created_at, NOW()), cover_image_url, vat_number, phone, COALESCE(country,'')
FROM tmp_brew
ON CONFLICT (id) DO NOTHING;
EOSQL
" 2>/dev/null
  echo "   ✓ Birrifici sincronizzati"
  rm -f /tmp/sync_breweries.csv /tmp/sync_breweries.csv
else
  echo "   ✓ Nessun nuovo birrificio da sincronizzare"
fi

# ── STEP 2: Setup indici DB sul VPS ──────────────────────────
echo ""
echo "STEP 2 · Setup indici DB sul VPS..."
$SSH "$VPS_HOST" "psql '$VPS_DB' -c 'CREATE EXTENSION IF NOT EXISTS pg_trgm;' 2>/dev/null; \
  psql '$VPS_DB' -c 'CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_beers_name_brewery ON beers (name, brewery_id) WHERE brewery_id IS NOT NULL;' 2>/dev/null; \
  psql '$VPS_DB' -c 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_beers_name_trgm ON beers USING GIN (name gin_trgm_ops);' 2>/dev/null; \
  psql '$VPS_DB' -c 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_beers_style_trgm ON beers USING GIN (style gin_trgm_ops);' 2>/dev/null; \
  echo 'Indici OK'" 2>/dev/null

# ── STEP 3: Copia CSV e script al VPS ───────────────────────
echo ""
echo "STEP 3 · Copia CSV al VPS (~120MB)..."
$SCP "$CSV_A" "$CSV_K" "$VPS_HOST":/tmp/
$SCP scripts/import-beers-csv.ts "$VPS_HOST":"$VPS_APP"/scripts/
echo "   ✓ File copiati"

# ── STEP 4: Import birre ──────────────────────────────────────
echo ""
echo "STEP 4 · Import birre sul VPS (1.2M righe, ~5 minuti)..."
$SSH "$VPS_HOST" "cd '$VPS_APP' && DATABASE_URL='$VPS_DB' npx tsx scripts/import-beers-csv.ts /tmp/rb_Beers_A-J*.csv /tmp/rb_Beers_K-Z*.csv 2>&1"

# ── Pulizia ───────────────────────────────────────────────────
echo ""
echo "Pulizia file temporanei sul VPS..."
$SSH "$VPS_HOST" "rm -f /tmp/rb_Beers_*.csv /tmp/sync_breweries.csv" 2>/dev/null
rm -f /tmp/export_breweries.sql

# ── Stats finali ──────────────────────────────────────────────
echo ""
echo "Stats finali VPS:"
$SSH "$VPS_HOST" "psql '$VPS_DB' -c \"
SELECT 
  (SELECT COUNT(*) FROM breweries) as birrifici,
  (SELECT COUNT(*) FROM beers) as birre,
  (SELECT COUNT(*) FROM pubs) as pub,
  (SELECT COUNT(*) FROM users) as utenti;
\" 2>/dev/null"

echo ""
echo "================================================"
echo " ✅ Sync completato!"
echo "================================================"
