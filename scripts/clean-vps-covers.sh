#!/bin/bash
# Pulisce le cover_image_url non-Cloudinary dal DB del VPS
# Uso: bash scripts/clean-vps-covers.sh [--execute]

set -e

bash "$(dirname "$0")/setup-ssh-key.sh" || exit 1

VPS_HOST="root@45.134.39.247"
VPS_DB="postgres://fermenta:antanicorp94@127.0.0.1:5432/fermenta"
VPS_APP="/www/nodeapps/fermenta"
SSH="ssh -i ${HOME}/.ssh/id_replit_sync -o StrictHostKeyChecking=no"
SCP="scp -i ${HOME}/.ssh/id_replit_sync -o StrictHostKeyChecking=no"

MODE="${1:---dry-run}"

echo ""
echo "================================================"
echo " Clean Brewery Covers sul VPS  [$MODE]"
echo "================================================"

# Copia lo script sul VPS
$SCP scripts/clean-brewery-covers.ts "$VPS_HOST":"$VPS_APP"/scripts/
echo "✓ Script copiato"

# Esegui sul VPS
$SSH "$VPS_HOST" "cd '$VPS_APP' && DATABASE_URL='$VPS_DB' npx tsx scripts/clean-brewery-covers.ts $MODE 2>&1"

echo ""
echo "================================================"
echo " ✅ Fatto!"
echo "================================================"
