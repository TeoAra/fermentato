#!/bin/bash
set -e

echo "=== Fermenta.to VPS Deployment ==="
echo ""

cd "$(dirname "$0")/.."

if [ -z "$DATABASE_URL" ]; then
  if [ -f .env ]; then
    export $(grep -v '^#' .env | grep DATABASE_URL | xargs)
  fi
fi

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL not found."
  echo "Create a .env file with: DATABASE_URL=postgresql://user:password@localhost:5432/dbname"
  echo "Or run: DATABASE_URL=your_url bash scripts/deploy-vps.sh"
  exit 1
fi

echo "Database configured."
echo ""

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
echo "6. Applying any missing schema patches (safe — idempotent)..."

# Crea tabella native_push_tokens se non esiste (aggiunta nella sessione Capacitor)
node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query(\`
  CREATE TABLE IF NOT EXISTS native_push_tokens (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    token TEXT NOT NULL UNIQUE,
    platform VARCHAR(10) NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS native_push_tokens_user_idx ON native_push_tokens(user_id);
\`).then(() => { console.log('   native_push_tokens: ok'); pool.end(); })
  .catch(e => { console.log('   native_push_tokens: ' + e.message); pool.end(); });
" 2>/dev/null || echo "   (patch script skipped — node pg not available inline, migration handled above)"

echo ""
echo "=== Deployment complete! ==="
echo "Note: Only schema changes were applied. Your existing data is safe."
echo ""
echo "To sync data between Replit and VPS, run from Replit:"
echo "  npx tsx scripts/sync-data.ts pull   # VPS → Replit"
echo "  npx tsx scripts/sync-data.ts push   # Replit → VPS"
echo "  npx tsx scripts/sync-data.ts both   # Bidirezionale"
