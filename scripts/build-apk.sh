#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Fermenta.to — APK build script per VPS Ubuntu/Debian
# Prima volta: bash scripts/build-apk.sh setup
# Ogni build:  bash scripts/build-apk.sh build
# ─────────────────────────────────────────────────────────────────────────────

set -e

APP_DIR="/www/nodeapps/fermenta"
ANDROID_SDK_DIR="$HOME/android-sdk"
ANDROID_CMD_VERSION="11076708"

setup_java() {
  echo "── Installo Java 21 via SDKMAN ──"
  if [ ! -d "$HOME/.sdkman" ]; then
    curl -s "https://get.sdkman.io" | bash
  fi
  # shellcheck disable=SC1090
  source "$HOME/.sdkman/bin/sdkman-init.sh"
  sdk install java 21.0.5-tem || sdk use java 21.0.5-tem
  export JAVA_HOME="$HOME/.sdkman/candidates/java/current"
  export PATH="$JAVA_HOME/bin:$PATH"
  java -version
}

setup_android_sdk() {
  echo "── Scarico Android SDK command-line tools ──"
  apt-get update -q && apt-get install -y unzip wget curl 2>/dev/null || true
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

  # Salvo le variabili nel profilo per le sessioni future
  {
    echo ""
    echo "# SDKMAN Java 21"
    echo "source \"\$HOME/.sdkman/bin/sdkman-init.sh\" 2>/dev/null || true"
    echo "export JAVA_HOME=\"\$HOME/.sdkman/candidates/java/current\""
    echo "# Android SDK"
    echo "export ANDROID_HOME=$ANDROID_SDK_DIR"
    echo "export PATH=\$JAVA_HOME/bin:\$PATH:\$ANDROID_HOME/cmdline-tools/latest/bin:\$ANDROID_HOME/platform-tools:\$ANDROID_HOME/build-tools/34.0.0"
  } >> "$HOME/.bashrc"

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

  # Carica SDKMAN e Java 21
  # shellcheck disable=SC1090
  source "$HOME/.sdkman/bin/sdkman-init.sh" 2>/dev/null || true
  export JAVA_HOME="$HOME/.sdkman/candidates/java/current"
  export ANDROID_HOME="$ANDROID_SDK_DIR"
  export PATH="$JAVA_HOME/bin:$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/build-tools/34.0.0"

  echo "Java: $(java -version 2>&1 | head -1)"

  cd "$APP_DIR"

  echo "── 1/5 Pull ultimo codice ──"
  git pull

  echo "── 2/5 Installo dipendenze npm ──"
  npm install

  echo "── 3/5 Build Vite (serve per sincronizzare i plugin nativi) ──"
  # Con server.url impostato, la UI viene caricata da fermenta.to —
  # non dai file in bundle. Il build serve solo per sincronizzare
  # le dipendenze native (plugin Capacitor).
  set -a; source .env.capacitor; set +a
  npx vite build

  echo "── 4/5 Aggiungo/sincronizzo piattaforma Android ──"
  if [ ! -d "android" ]; then
    echo "    Prima build — aggiungo piattaforma Android..."
    npx cap add android
  fi
  npx cap sync android

  echo "── 5/5 Compilo APK ──"
  cd android
  chmod +x gradlew

  # Scrivi local.properties con il percorso SDK (necessario per Gradle)
  echo "sdk.dir=$ANDROID_HOME" > local.properties

  # Patch versioni per compatibilità con i plugin Capacitor più recenti
  # AGP 8.9.1+ e compileSdk 36 richiesti da androidx.core 1.17+
  # Capacitor usa variables.gradle per le versioni SDK (NON app/build.gradle)
  sed -i "s/minSdkVersion = [0-9]*/minSdkVersion = 24/" variables.gradle
  sed -i "s/compileSdkVersion = [0-9]*/compileSdkVersion = 36/" variables.gradle
  sed -i "s/targetSdkVersion = [0-9]*/targetSdkVersion = 36/" variables.gradle
  sed -i "s/com.android.tools.build:gradle:[0-9.]*/com.android.tools.build:gradle:8.9.1/" build.gradle
  sed -i "s/gradle-[0-9.]*-bin.zip/gradle-8.12-bin.zip/" gradle/wrapper/gradle-wrapper.properties

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
    echo "  setup  — installa Java 21 (SDKMAN) + Android SDK (solo prima volta)"
    echo "  build  — compila l'APK"
    ;;
esac
