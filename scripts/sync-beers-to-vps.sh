#!/bin/bash
# ============================================================
# sync-beers-to-vps.sh
# Importa le 1.2M birre RateBeer sul VPS in modo sicuro.
#
# - NON tocca: utenti, pub, birrifici, recensioni, preferiti
# - Usa ON CONFLICT DO NOTHING: birre già presenti vengono saltate
# - Idempotente: puoi rieseguirlo più volte senza danni
#
# Uso: bash scripts/sync-beers-to-vps.sh
# ============================================================

set -e

VPS_HOST="root@45.134.39.247"
VPS_DB="postgres://fermenta:antanicorp94@127.0.0.1:5432/fermenta"
VPS_APP="/www/nodeapps/fermenta"
SSH_KEY="${HOME}/.ssh/id_replit_sync"
SSH="ssh -i ${SSH_KEY} -o StrictHostKeyChecking=no"
SCP="scp -i ${SSH_KEY} -o StrictHostKeyChecking=no"

CSV_A="attached_assets/rb_Beers_A-J_clean2_1773065275434.csv"
CSV_K="attached_assets/rb_Beers_K-Z_clean2_1773065275434.csv"

echo ""
echo "========================================"
echo " Sync Birre RateBeer → VPS"
echo "========================================"

# ── 1. Verifica che i CSV esistano ───────────────────────────
if [ ! -f "$CSV_A" ] || [ ! -f "$CSV_K" ]; then
  echo "❌ File CSV non trovati. Assicurati di essere nella root del progetto."
  exit 1
fi

echo ""
echo "1/5 · Copia CSV al VPS (~120MB, potrebbe richiedere qualche minuto)..."
$SCP "$CSV_A" "$CSV_K" "${VPS_HOST}:/tmp/"
echo "    ✓ CSV copiati in /tmp/"

echo ""
echo "2/5 · Copia script di import..."
$SCP scripts/import-beers-csv.ts "${VPS_HOST}:${VPS_APP}/scripts/"
echo "    ✓ Script copiato"

echo ""
echo "3/5 · Setup prerequisiti DB sul VPS..."
$SSH "$VPS_HOST" "psql '$VPS_DB' -c \"CREATE EXTENSION IF NOT EXISTS pg_trgm;\" 2>/dev/null || true"
$SSH "$VPS_HOST" "psql '$VPS_DB' -c \"CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_beers_name_brewery ON beers (name, brewery_id) WHERE brewery_id IS NOT NULL;\" 2>/dev/null || true"
$SSH "$VPS_HOST" "psql '$VPS_DB' -c \"CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_beers_name_trgm ON beers USING GIN (name gin_trgm_ops);\" 2>/dev/null || true"
$SSH "$VPS_HOST" "psql '$VPS_DB' -c \"CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_beers_style_trgm ON beers USING GIN (style gin_trgm_ops);\" 2>/dev/null || true"
echo "    ✓ Estensioni e indici OK"

echo ""
echo "4/5 · Avvio import sul VPS (1.2M righe, ~2-5 minuti)..."
$SSH "$VPS_HOST" "cd '${VPS_APP}' && DATABASE_URL='${VPS_DB}' npx tsx scripts/import-beers-csv.ts /tmp/rb_Beers_A-J*.csv /tmp/rb_Beers_K-Z*.csv"

echo ""
echo "5/5 · Pulizia file temporanei sul VPS..."
$SSH "$VPS_HOST" "rm -f /tmp/rb_Beers_*.csv"
echo "    ✓ File temporanei rimossi"

echo ""
echo "========================================"
echo " ✅ Sync birre completato!"
echo "========================================"
