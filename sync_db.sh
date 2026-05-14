#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/www/nodeapps/fermenta"
APP_NAME="fermenta"
PG_DUMP="/usr/lib/postgresql/16/bin/pg_dump"
PG_RESTORE="/usr/lib/postgresql/16/bin/pg_restore"
PSQL="/usr/bin/psql"
SOURCE_ENV="$APP_DIR/.env.source"
TARGET_ENV="$APP_DIR/.env"

# carica env sorgente (Neon/Replit)
if [[ ! -f "$SOURCE_ENV" ]]; then
  echo "❌ Manca $SOURCE_ENV (metti SOURCE_DATABASE_URL=...)"
  exit 1
fi
# carica env target (VPS)
if [[ ! -f "$TARGET_ENV" ]]; then
  echo "❌ Manca $TARGET_ENV (metti DATABASE_URL=...)"
  exit 1
fi

# shellcheck disable=SC1090
source "$SOURCE_ENV"
# shellcheck disable=SC1090
source "$TARGET_ENV"

if [[ -z "${SOURCE_DATABASE_URL:-}" ]]; then
  echo "❌ SOURCE_DATABASE_URL non impostata in .env.source"
  exit 1
fi
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "❌ DATABASE_URL non impostata in .env (target VPS)"
  exit 1
fi

cd "$APP_DIR"

TS="$(date +%F_%H-%M-%S)"
DUMP="/tmp/fermenta_dump_${TS}.dump"

echo "==> Dump dal DB sorgente (Neon/Replit) ..."
# custom format = più robusto
"$PG_DUMP" "$SOURCE_DATABASE_URL" -Fc -f "$DUMP"

echo "==> Reset schema pubblico sul DB VPS (target) ..."
"$PSQL" "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"

echo "==> Restore sul DB VPS ..."
"$PG_RESTORE" -d "$DATABASE_URL" --no-owner --no-privileges --clean --if-exists "$DUMP"

echo "==> (Opzionale) fix permessi su schema pubblico ..."
"$PSQL" "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "GRANT ALL ON SCHEMA public TO fermenta;"

echo "==> Restart app ..."
pm2 restart "$APP_NAME" || true

echo "✅ Sync completata. File dump: $DUMP"
