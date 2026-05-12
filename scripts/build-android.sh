#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# build-android.sh — Compila l'APK Android di Fermenta.to con Capacitor
#
# Pre-requisiti sul VPS / macchina di build:
#   1. Node.js 18+ e npm installati
#   2. Java JDK 17+ (es. openjdk-17)
#   3. Android SDK con:
#      - Build Tools 34
#      - Platform 35 (Android 15)
#      set ANDROID_HOME=/path/to/sdk o ANDROID_SDK_ROOT
#   4. File android/app/google-services.json copiato da Firebase Console
#      (obbligatorio per notifiche push FCM)
#
# Uso:
#   chmod +x scripts/build-android.sh
#   ./scripts/build-android.sh [--release]
# ─────────────────────────────────────────────────────────────────────────────

set -e

RELEASE=${1:-"--debug"}
echo "▶ Fermenta.to — Android Build ($RELEASE)"

# 1. Build web assets
echo "▶ Building web assets..."
npm run build

# 2. Sync con Capacitor (copia dist/public + plugins nativi)
echo "▶ Syncing Capacitor..."
npx cap sync android

# 3. Verifica google-services.json
if [ ! -f "android/app/google-services.json" ]; then
  echo "⚠️  ATTENZIONE: android/app/google-services.json non trovato!"
  echo "   Le notifiche push FCM non funzioneranno."
  echo "   Scaricalo da Firebase Console > Project Settings > Your apps > Android app"
fi

# 4. Build APK
cd android
echo "▶ Compiling APK..."
if [ "$RELEASE" = "--release" ]; then
  ./gradlew assembleRelease
  APK_PATH="app/build/outputs/apk/release/app-release-unsigned.apk"
  echo ""
  echo "✅ APK Release: android/$APK_PATH"
  echo "   Per firmare l'APK con il tuo keystore:"
  echo "   jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 \\"
  echo "     -keystore fermenta.keystore $APK_PATH fermenta"
else
  ./gradlew assembleDebug
  APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
  echo ""
  echo "✅ APK Debug: android/$APK_PATH"
fi

echo ""
echo "📱 Per installare su un dispositivo collegato via USB:"
echo "   adb install -r android/$APK_PATH"
