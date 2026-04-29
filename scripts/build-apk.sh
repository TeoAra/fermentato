#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Fermenta.to — APK build script per VPS Ubuntu/Debian
# Esegui una volta sola: bash scripts/build-apk.sh setup
# Poi per ogni build: bash scripts/build-apk.sh build
# ─────────────────────────────────────────────────────────────────────────────

set -e

APP_DIR="/www/nodeapps/fermenta"
ANDROID_SDK_DIR="$HOME/android-sdk"
ANDROID_CMD_VERSION="11076708"
JAVA_PACKAGE="openjdk-17-jdk"

setup_java() {
  echo "── Installo Java 17 ──"
  apt-get update -q
  apt-get install -y $JAVA_PACKAGE unzip wget curl
  java -version
}

setup_android_sdk() {
  echo "── Scarico Android SDK command-line tools ──"
  mkdir -p "$ANDROID_SDK_DIR/cmdline-tools"
  wget -q "https://dl.google.com/android/repository/commandlinetools-linux-${ANDROID_CMD_VERSION}_latest.zip" \
    -O /tmp/cmdline-tools.zip
  unzip -q /tmp/cmdline-tools.zip -d /tmp/cmdtools
  mv /tmp/cmdtools/cmdline-tools "$ANDROID_SDK_DIR/cmdline-tools/latest"
  rm -rf /tmp/cmdline-tools.zip /tmp/cmdtools

  export ANDROID_HOME="$ANDROID_SDK_DIR"
  export PATH="$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools"

  echo "── Accetto le licenze e installo i componenti SDK ──"
  yes | sdkmanager --licenses > /dev/null 2>&1 || true
  sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"

  # Aggiungo al profilo per le build future
  echo "" >> "$HOME/.bashrc"
  echo "export ANDROID_HOME=$ANDROID_SDK_DIR" >> "$HOME/.bashrc"
  echo "export PATH=\$PATH:\$ANDROID_HOME/cmdline-tools/latest/bin:\$ANDROID_HOME/platform-tools:\$ANDROID_HOME/build-tools/34.0.0" >> "$HOME/.bashrc"

  echo "✅ Android SDK installato in $ANDROID_SDK_DIR"
}

setup() {
  echo "════════════════════════════════════════════"
  echo "  Setup ambiente Android SDK - una tantum   "
  echo "════════════════════════════════════════════"
  setup_java
  setup_android_sdk
  echo ""
  echo "✅ Setup completato! Ora esegui: bash scripts/build-apk.sh build"
}

build() {
  echo "════════════════════════════════════════════"
  echo "  Build APK Fermenta.to                     "
  echo "════════════════════════════════════════════"

  # Assicura variabili ambiente
  export ANDROID_HOME="$ANDROID_SDK_DIR"
  export PATH="$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/build-tools/34.0.0"
  export JAVA_HOME="$(dirname $(dirname $(readlink -f $(which java))))"

  cd "$APP_DIR"

  echo "── 1/5 Pull ultimo codice ──"
  git pull

  echo "── 2/5 Installo dipendenze npm ──"
  npm install

  echo "── 3/5 Build Vite per Capacitor ──"
  # Usa le variabili env per il build mobile (API punta a fermenta.to)
  set -a; source .env.capacitor; set +a
  npx vite build

  echo "── 4/5 Aggiungo/sincronizzo piattaforma Android ──"
  # Prima volta: npx cap add android
  if [ ! -d "android" ]; then
    echo "    Prima build — aggiungo piattaforma Android..."
    npx cap add android
  fi
  npx cap sync android

  echo "── 5/5 Compilo APK ──"
  cd android
  chmod +x gradlew

  # Build debug APK (installabile senza firma)
  ./gradlew assembleDebug

  APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
  echo ""
  echo "════════════════════════════════════════════"
  echo "✅ APK pronto!"
  echo "   $APP_DIR/android/$APK_PATH"
  echo ""
  echo "Per scaricarlo sul tuo PC:"
  echo "   scp root@45.134.39.247:$APP_DIR/android/$APK_PATH ~/fermenta.apk"
  echo ""
  echo "Per una build release firmata:"
  echo "   cd $APP_DIR/android && ./gradlew assembleRelease"
  echo "════════════════════════════════════════════"
}

case "${1:-}" in
  setup) setup ;;
  build) build ;;
  *)
    echo "Uso: bash scripts/build-apk.sh [setup|build]"
    echo "  setup  — installa Java + Android SDK (solo prima volta, ~10 min)"
    echo "  build  — compila l'APK (ogni volta che vuoi aggiornare)"
    ;;
esac
