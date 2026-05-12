#!/usr/bin/env bash
# =============================================================================
# build-android.sh — Compila l'APK Android di Fermenta.to con Capacitor
#
# ⚠️  IMPORTANTE — leggi prima:
#
#  1. Questo script NON va eseguito sul VPS dove gira il sito web.
#     Va eseguito sulla tua macchina locale (Mac / Windows WSL / Linux desktop)
#     o su una macchina di build separata.
#
#  2. Il VPS serve solo il sito web (Node.js + PostgreSQL).
#     L'app Android carica i contenuti da https://fermenta.to automaticamente.
#     Non devi modificare nulla sul VPS per aggiornare l'app.
#
#  3. Firebase FCM è GRATUITO e NON sostituisce PostgreSQL.
#     È solo un "tubo" per consegnare notifiche push agli Android.
#     Senza google-services.json l'app funziona comunque — solo le notifiche
#     push native non sono attive (quelle web via browser continuano a funzionare).
#
# Pre-requisiti sulla macchina di build (NON il VPS):
#   - Node.js 18+
#   - Java JDK 17+  →  sudo apt install openjdk-17-jdk  (Linux)
#                       brew install openjdk@17           (Mac)
#   - Android SDK  →  installa Android Studio e configura:
#                       export ANDROID_HOME=$HOME/Android/Sdk
#                       export PATH=$PATH:$ANDROID_HOME/platform-tools
#
# Uso:
#   chmod +x scripts/build-android.sh
#   ./scripts/build-android.sh          # APK debug (per test)
#   ./scripts/build-android.sh --release # APK release (per distribuzione)
#
# Per le notifiche push native (opzionale, sempre gratuito):
#   1. Vai su https://console.firebase.google.com
#   2. Crea progetto → Aggiungi app Android → package: to.fermenta.app
#   3. Scarica google-services.json → mettilo in android/app/google-services.json
# =============================================================================

set -e

RELEASE=${1:-"--debug"}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$ROOT_DIR"

echo ""
echo "╔══════════════════════════════════════╗"
echo "║  Fermenta.to — Android Build         ║"
echo "╚══════════════════════════════════════╝"
echo ""

# ── Verifica pre-requisiti ───────────────────────────────────────────────────
if ! command -v java &>/dev/null; then
  echo "❌ Java non trovato. Installa JDK 17:"
  echo "   Linux:  sudo apt install openjdk-17-jdk"
  echo "   Mac:    brew install openjdk@17"
  exit 1
fi

JAVA_VERSION=$(java -version 2>&1 | head -1 | grep -oP '(?<=version ")[\d.]+' | cut -d. -f1)
if [ "$JAVA_VERSION" -lt 17 ] 2>/dev/null; then
  echo "❌ Java 17+ richiesto. Trovato Java $JAVA_VERSION"
  exit 1
fi

if [ -z "$ANDROID_HOME" ] && [ -z "$ANDROID_SDK_ROOT" ]; then
  echo "⚠️  ANDROID_HOME non impostato. Se Android Studio è installato:"
  echo "   Linux: export ANDROID_HOME=\$HOME/Android/Sdk"
  echo "   Mac:   export ANDROID_HOME=\$HOME/Library/Android/sdk"
  echo "   Continuo comunque (gradlew cercherà l'SDK da solo)..."
fi

echo "✓ Java $(java -version 2>&1 | head -1)"
echo ""

# ── 1. Build web assets ──────────────────────────────────────────────────────
echo "▶ [1/4] Building web assets (npm run build)..."
npm run build
echo "   ✓ Web assets pronti in dist/public"
echo ""

# ── 2. Init progetto Android (solo la prima volta) ──────────────────────────
if [ ! -d "android" ]; then
  echo "▶ [2/4] Inizializzazione progetto Android (prima esecuzione)..."
  npx cap add android
  echo "   ✓ Cartella android/ creata"
else
  echo "▶ [2/4] Cartella android/ già presente — skip init"
fi
echo ""

# ── 3. google-services.json ─────────────────────────────────────────────────
echo "▶ [3/4] Controllo google-services.json..."
if [ -f "android/app/google-services.json" ]; then
  # Controlla se è il placeholder o quello reale
  if grep -q "PLACEHOLDER" "android/app/google-services.json" 2>/dev/null || \
     grep -q "000000000000" "android/app/google-services.json" 2>/dev/null; then
    echo "   ℹ️  Usando placeholder — notifiche push FCM NON attive"
    echo "      Per attivarle: https://console.firebase.google.com (gratuito)"
  else
    echo "   ✓ google-services.json reale trovato — FCM attivo"
  fi
else
  echo "   ℹ️  google-services.json non trovato — uso placeholder automatico"
  echo "      (l'app funzionerà, ma senza notifiche push native)"
  cp "scripts/google-services-placeholder.json" "android/app/google-services.json"
  echo "   ✓ Placeholder copiato in android/app/google-services.json"
  echo ""
  echo "   Per attivare le push native (facoltativo, sempre gratuito):"
  echo "   1. Vai su https://console.firebase.google.com"
  echo "   2. Nuovo progetto → Aggiungi app Android → package: to.fermenta.app"
  echo "   3. Scarica google-services.json → sostituisci android/app/google-services.json"
fi
echo ""

# ── 4. Sync Capacitor ────────────────────────────────────────────────────────
echo "▶ [4/4] Sync Capacitor (plugin nativi + web assets)..."
npx cap sync android
echo "   ✓ Sync completato"
echo ""

# ── 5. Compilazione APK ──────────────────────────────────────────────────────
cd android
echo "▶ Compilazione APK..."
if [ "$RELEASE" = "--release" ]; then
  ./gradlew assembleRelease --quiet
  APK_PATH="app/build/outputs/apk/release/app-release-unsigned.apk"
  echo ""
  echo "══════════════════════════════════════════════════"
  echo "✅ APK Release: android/$APK_PATH"
  echo ""
  echo "Per firmare l'APK con il keystore:"
  echo "  # Crea keystore (solo la prima volta):"
  echo "  keytool -genkey -v -keystore fermenta.keystore -alias fermenta \\"
  echo "          -keyalg RSA -keysize 2048 -validity 10000"
  echo ""
  echo "  # Firma l'APK:"
  echo "  jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 \\"
  echo "    -keystore fermenta.keystore android/$APK_PATH fermenta"
  echo "══════════════════════════════════════════════════"
else
  ./gradlew assembleDebug --quiet
  APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
  echo ""
  echo "══════════════════════════════════════════════════"
  echo "✅ APK Debug pronto: android/$APK_PATH"
  echo ""
  echo "📱 Installa su dispositivo Android collegato via USB:"
  echo "   adb install -r android/$APK_PATH"
  echo ""
  echo "🔍 Non vedi il dispositivo? Abilita:"
  echo "   Impostazioni → Opzioni sviluppatore → Debug USB"
  echo "══════════════════════════════════════════════════"
fi

echo ""
echo "ℹ️  Nota: per aggiornare la UI dell'app basta fare deploy del sito web."
echo "   Non serve ricompilare l'APK — carica sempre da https://fermenta.to"
