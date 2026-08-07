#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# scripts/deploy.sh — Deploy Fermenta.to da VPS
#
# Uso:
#   ./scripts/deploy.sh              → aggiorna PWA + triggera build iOS/Android
#   ./scripts/deploy.sh --release    → come sopra + crea tag v* per App Store
#   ./scripts/deploy.sh --pwa-only   → solo riavvio PWA (nessun push su git)
#
# Cosa fa:
#   1. npm install + build web
#   2. pm2 restart → PWA live immediatamente
#   3. git push origin main → Codemagic compila iOS TestFlight + Android APK
#   4. (--release) git tag vX.Y.Z + push → Codemagic compila iOS App Store
#
# CocoaPods NON serve sul VPS: è pre-installato sulle macchine Mac di Codemagic.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

MODE="full"
if [[ "${1:-}" == "--release" ]]; then MODE="release"; fi
if [[ "${1:-}" == "--pwa-only" ]]; then MODE="pwa"; fi

YELLOW='\033[1;33m'; GREEN='\033[0;32m'; RED='\033[0;31m'; NC='\033[0m'
step()  { echo -e "${YELLOW}▶ $*${NC}"; }
ok()    { echo -e "${GREEN}✓ $*${NC}"; }
fail()  { echo -e "${RED}✗ $*${NC}"; exit 1; }

# ── 1. Installa dipendenze e compila il frontend ───────────────────────────
# Sanity-check: package-lock.json must not contain Replit-internal registry URLs.
# If it does, swap them back to the public npm registry before installing.
if grep -q "package-firewall.replit.local" package-lock.json 2>/dev/null; then
  step "Pulizia URL interni Replit da package-lock.json"
  sed -i 's|http://package-firewall\.replit\.local/npm/|https://registry.npmjs.org/|g' package-lock.json
  ok "package-lock.json pulito"
fi

step "npm install + build web"
npm install --legacy-peer-deps --silent
npm run build
ok "Build web completato → dist/public"

# ── 2. Riavvia PWA su PM2 ─────────────────────────────────────────────────
step "Riavvio PWA con PM2"
if pm2 list | grep -q "fermenta\|app\|server"; then
  # --update-env è ESSENZIALE: senza, pm2 mantiene le env vars del processo
  # originale e ignora le modifiche al file .env (es. nuove APNS_KEY_ID).
  pm2 restart all --update-env
  ok "PM2 riavviato (env ricaricato) — PWA live su https://fermenta.to"
else
  fail "PM2 non trovato o nessun processo attivo. Avvia l'app con: ./deploy.sh"
fi

if [[ "$MODE" == "pwa" ]]; then
  ok "Modalità --pwa-only: nessun push su git."
  exit 0
fi

# ── 3. Bump versione app + push su main (triggera Codemagic: iOS TF + Android APK) ─
step "Bump versione e push su main → build iOS TestFlight + Android APK"
NEW_VERSION=$(bash "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/bump-version.sh")
ok "Versione aggiornata: $NEW_VERSION"

if [[ -n "$(git --no-optional-locks status --porcelain 2>/dev/null)" ]]; then
  git add -A -- ':!.env' ':!.env.*'
  git commit -m "deploy: v$NEW_VERSION $(date '+%Y-%m-%d %H:%M')"
fi
git push origin main
ok "Push su main — Codemagic avvierà ios-development + android-apk"

if [[ "$MODE" != "release" ]]; then
  echo ""
  echo -e "${GREEN}──────────────────────────────────────────────────────────${NC}"
  echo -e "${GREEN} Deploy completato!${NC}"
  echo -e " • PWA:     https://fermenta.to  (live ora)"
  echo -e " • iOS TF:  controlla Codemagic → workflow ios-development"
  echo -e " • Android: controlla Codemagic → workflow android-apk"
  echo -e "${GREEN}──────────────────────────────────────────────────────────${NC}"
  exit 0
fi

# ── 4. Tag per App Store (--release) ──────────────────────────────────────
step "Creazione tag release per App Store"
VERSION=$(node -p "require('./version.json').version")
TAG="v${VERSION}"

if git tag | grep -q "^${TAG}$"; then
  fail "Tag ${TAG} esiste già. È già stato fatto un deploy con questa versione."
fi

git tag "$TAG"
git push origin "$TAG"
ok "Tag $TAG pushato → Codemagic avvierà ios-appstore"

echo ""
echo -e "${GREEN}──────────────────────────────────────────────────────────${NC}"
echo -e "${GREEN} Release ${TAG} avviata!${NC}"
echo -e " • PWA:          https://fermenta.to  (live ora)"
echo -e " • iOS TF:       Codemagic → ios-development"
echo -e " • Android APK:  Codemagic → android-apk"
echo -e " • iOS App Store: Codemagic → ios-appstore  (tag ${TAG})"
echo -e "${GREEN}──────────────────────────────────────────────────────────${NC}"
