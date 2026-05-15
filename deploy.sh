#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/www/nodeapps/fermenta"
APP_NAME="fermenta"
BRANCH="main"   # cambia in master se usi master
PORT="5000"

cd "$APP_DIR"

echo "==> [0] Backup .env (se esiste)"
if [[ -f ".env" ]]; then
  cp .env ".env.bak.$(date +%F_%H-%M-%S)"
fi

echo "==> [1] Git fetch + reset su origin/$BRANCH"
git fetch origin
git checkout "$BRANCH" >/dev/null 2>&1 || true
git reset --hard "origin/$BRANCH"

echo "==> [2] Install dipendenze (incluse dev: vite/esbuild servono per build)"
# --include=dev forza l'installazione delle devDependencies anche se
# NODE_ENV=production. Senza, vite/esbuild mancano e il build fallisce.
npm install --include=dev

echo "==> [3] Build"
npm run build

echo "==> [4] Drizzle push (schema -> DB)"
# se non vuoi toccare schema in automatico, commenta questa riga
npm run db:push

echo "==> [5] Restart PM2 (con update env)"
if pm2 list | grep -q "$APP_NAME"; then
  pm2 restart "$APP_NAME" --update-env
else
  # avvio “sicuro” in prod caricando .env
  pm2 start "dotenv -e .env -- node dist/index.js" --name "$APP_NAME" --time
fi

echo "==> [6] Salva startup PM2"
pm2 save

echo "==> [7] Sanity check: ascolto su porta $PORT"
sleep 1
ss -lntp | grep -q ":$PORT" && echo "✅ Porta $PORT in ascolto" || echo "⚠️ Porta $PORT NON in ascolto (controlla pm2 logs)"

echo "==> [8] Test API locale"
curl -s -I "http://127.0.0.1:$PORT/" | head -n 1 || true

echo "✅ Deploy completato: $(git log -1 --oneline)"
