#!/bin/bash
set -e

echo "=== Fermenta.to VPS Deployment ==="
echo ""

cd "$(dirname "$0")/.."

echo "1. Installing dependencies..."
npm ci --production=false

echo ""
echo "2. Building application..."
npm run build

echo ""
echo "3. Initializing migration tracking (safe - skips if already done)..."
npx tsx scripts/vps-init-migrations.ts

echo ""
echo "4. Running database migrations (safe - only applies new schema changes)..."
npx tsx server/migrate.ts

echo ""
echo "5. Restarting application..."
if command -v pm2 &> /dev/null; then
  pm2 restart fermenta || pm2 start dist/index.js --name fermenta
else
  echo "PM2 not found. Start manually with: NODE_ENV=production node dist/index.js"
fi

echo ""
echo "=== Deployment complete! ==="
echo "Note: Only schema changes were applied. Your existing data is safe."
