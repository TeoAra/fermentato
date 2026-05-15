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
step "npm install + build web"
npm install --legacy-peer-deps --silent
npm run build
ok "Build web completato → dist/public"

# ── 2. Riavvia PWA su PM2 ─────────────────────────────────────────────────
step "Riavvio PWA con PM2"
if pm2 list | grep -q "fermenta\|app\|server"; then
  pm2 restart all
  ok "PM2 riavviato — PWA live su https://fermenta.to"
else
  fail "PM2 non trovato o nessun processo attivo. Avvia l'app con: pm2 start"
fi

if [[ "$MODE" == "pwa" ]]; then
  ok "Modalità --pwa-only: nessun push su git."
  exit 0
fi

# ── 3. Git commit + push su main (triggera Codemagic: iOS TF + Android APK) ─
step "git push origin main → build iOS TestFlight + Android APK"
if [[ -n "$(git --no-optional-locks status --porcelain 2>/dev/null)" ]]; then
  git add -A -- ':!.env' ':!.env.*'
  git commit -m "deploy: $(date '+%Y-%m-%d %H:%M')"
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
VERSION=$(node -p "require('./package.json').version")
TAG="v${VERSION}"

if git tag | grep -q "^${TAG}$"; then
  fail "Tag ${TAG} esiste già. Aggiorna la versione in package.json prima."
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
