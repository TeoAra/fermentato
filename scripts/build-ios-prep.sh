#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Fermenta.to — Preparazione build iOS dal VPS Linux
#
# Cosa fa QUESTO script (su Linux):
#   1. Build web (Vite)
#   2. Aggiunge/sincronizza la piattaforma iOS Capacitor
#   3. Genera asset iOS (icone + splash) via @capacitor/assets
#   4. Inietta Info.plist con permessi tradotti in italiano
#   5. Impacchetta tutto in `ios-source.tgz` pronto per il Mac
#
# Cosa NON fa (richiede macOS + Xcode):
#   - xcodebuild archive
#   - firma con certificati Apple
#   - upload ad App Store Connect
#
# Vedi docs/ios-build.md per le 3 opzioni operative (Mac fisico, Mac in cloud,
# GitHub Actions con runner macos-latest).
#
# Uso:
#   bash scripts/build-ios-prep.sh           # esegue tutto
#   bash scripts/build-ios-prep.sh --no-tar  # salta il tarball finale
# ─────────────────────────────────────────────────────────────────────────────

set -e

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$APP_DIR"

NO_TAR=0
[ "${1:-}" = "--no-tar" ] && NO_TAR=1

echo "════════════════════════════════════════════"
echo "  Fermenta.to — preparazione sorgente iOS   "
echo "════════════════════════════════════════════"
echo "App dir: $APP_DIR"
echo ""

echo "── 1/5 Build web (Vite) ──"
npm run build

echo "── 2/5 Aggiungo/sincronizzo piattaforma iOS ──"
if [ ! -d "ios" ]; then
  echo "    Prima build — eseguo: npx cap add ios"
  npx cap add ios
fi
npx cap sync ios

echo "    Bump versione app..."
NEW_VERSION=$(bash "$APP_DIR/scripts/bump-version.sh")
echo "    ✅ Versione: $NEW_VERSION"

echo "    Genero splash screen native iOS (sovrascrivo il default Capacitor)..."
node "$APP_DIR/scripts/generate-native-splash.js" || echo "    ⚠️  generate-native-splash.js fallito — splash di default resta in uso"

echo "── 3/5 Genero asset iOS (icone + splash) ──"
SOURCE_LOGO="capacitor-resources/icon-source.png"
if [ ! -f "$SOURCE_LOGO" ]; then
  # Fallback: usa il logo stencil se l'utente non ha ancora preparato icon-source.png 1024x1024
  CAND=$(ls attached_assets/icona_fermentato_*.png 2>/dev/null | head -1)
  if [ -n "$CAND" ]; then
    echo "    Uso $CAND come logo sorgente (preparare capacitor-resources/icon-source.png 1024x1024 per migliore qualità)"
    mkdir -p capacitor-resources
    cp "$CAND" "$SOURCE_LOGO"
  else
    echo "    ⚠️  Nessun logo sorgente trovato. Crea capacitor-resources/icon-source.png (1024x1024) e rilancia."
    exit 1
  fi
fi

# @capacitor/assets richiede una struttura standard: assets/icon-only.png, assets/splash.png
mkdir -p assets
cp "$SOURCE_LOGO" assets/icon-only.png
cp "$SOURCE_LOGO" assets/icon-foreground.png
# Splash: usa lo stesso logo centrato su sfondo cream (#FFF7ED)
cp "$SOURCE_LOGO" assets/splash.png 2>/dev/null || true
cp "$SOURCE_LOGO" assets/splash-dark.png 2>/dev/null || true

npx --yes @capacitor/assets generate --ios --iconBackgroundColor '#FFF7ED' --splashBackgroundColor '#FFF7ED' || {
  echo "    ⚠️  Generazione asset fallita — gli asset di default Capacitor restano in uso."
}

echo "── 4/5 Inietto Info.plist con permessi italiani ──"
PLIST_DST="ios/App/App/Info.plist"
PLIST_TPL="ios-template/App/App/Info.plist"
if [ -f "$PLIST_TPL" ] && [ -d "ios/App/App" ]; then
  cp "$PLIST_TPL" "$PLIST_DST"
  # Aggiorna versione nel plist (CFBundleShortVersionString + CFBundleVersion)
  IFS='.' read -r VM_MAJOR VM_MINOR VM_PATCH <<< "$NEW_VERSION"
  BUILD_NUM=$(( VM_MAJOR * 10000 + VM_MINOR * 100 + VM_PATCH ))
  sed -i "s|<string>1.0.0</string>|<string>$NEW_VERSION</string>|" "$PLIST_DST" || true
  sed -i "s|<string>1</string>|<string>$BUILD_NUM</string>|" "$PLIST_DST" || true
  echo "    ✅ Info.plist aggiornato da template (versione=$NEW_VERSION build=$BUILD_NUM)"
  python3 ios-native/add_url_scheme.py \
    "$PLIST_DST" \
    fermentato \
    "to.fermentato.app"
  python3 ios-native/add_push_entitlement.py ios/App/App.xcodeproj/project.pbxproj
  python3 ios-native/add_apple_signin_entitlement.py ios/App/App/App.entitlements
  python3 ios-native/verify_ios_entitlements.py \
    ios/App/App.xcodeproj/project.pbxproj \
    ios/App/App/App.entitlements \
    "$PLIST_DST" \
    "to.fermentato.app"
else
  echo "    ⚠️  Template Info.plist o cartella ios/App/App non trovata — salto"
fi

if [ "$NO_TAR" = "1" ]; then
  echo ""
  echo "✅ Sorgente iOS pronto in ./ios/"
  echo "   Trasferiscilo su un Mac e segui docs/ios-build.md"
  exit 0
fi

echo "── 5/5 Creo tarball ios-source.tgz ──"
TAR_NAME="ios-source-$(date +%Y%m%d-%H%M%S).tgz"
tar --exclude='ios/App/Pods' \
    --exclude='ios/App/build' \
    --exclude='ios/DerivedData' \
    -czf "$TAR_NAME" ios/ capacitor.config.ts package.json package-lock.json 2>/dev/null

echo ""
echo "════════════════════════════════════════════"
echo "✅ Pronto: $APP_DIR/$TAR_NAME"
echo ""
echo "Prossimi passi (su Mac):"
echo "  scp root@<vps>:$APP_DIR/$TAR_NAME ~/Downloads/"
echo "  cd ~/Downloads && tar xzf $TAR_NAME"
echo "  cd ios/App && pod install"
echo "  open App.xcworkspace"
echo ""
echo "Vedi docs/ios-build.md per le opzioni di build (Mac, cloud, GitHub Actions)."
echo "════════════════════════════════════════════"
