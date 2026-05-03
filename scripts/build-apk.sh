#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Fermenta.to — APK build script per VPS Ubuntu/Debian
# Prima volta: bash scripts/build-apk.sh setup
# Ogni build:  bash scripts/build-apk.sh build
# ─────────────────────────────────────────────────────────────────────────────

set -e

APP_DIR="${FERMENTA_APP_DIR:-/www/nodeapps/fermenta}"
ANDROID_SDK_DIR="$HOME/android-sdk"
ANDROID_CMD_VERSION="11076708"
DEEP_LINK_HOST="fermenta.to"

# Verifica preliminare strumenti — fallisci presto se manca qualcosa
check_prereqs() {
  local missing=0
  for cmd in node npm git curl unzip; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
      echo "❌ Manca '$cmd' — installalo prima di procedere"
      missing=1
    fi
  done
  [ $missing -eq 0 ] || exit 1
}

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
  check_prereqs
  setup_java
  setup_android_sdk
  echo ""
  echo "✅ Setup completato! Ora esegui: bash scripts/build-apk.sh build"
}

# Inietta nel <activity android:name=".MainActivity"> dell'AndroidManifest:
#   - intent-filter per deep link https://fermenta.to/* (App Links autoVerify)
#   - intent-filter per fermentato:// custom scheme (fallback)
patch_android_manifest() {
  local MANIFEST="app/src/main/AndroidManifest.xml"
  if [ ! -f "$MANIFEST" ]; then
    echo "    ⚠️  AndroidManifest.xml non trovato — skip patch deep link"
    return
  fi

  # Skip se la patch è già presente (idempotente)
  if grep -q "FERMENTA_DEEP_LINK" "$MANIFEST"; then
    echo "    ℹ️  Deep link già patchato in AndroidManifest"
    return
  fi

  echo "    Inietto intent-filter deep link per $DEEP_LINK_HOST..."
  # Inserisci subito prima della chiusura </activity> della MainActivity SPECIFICA.
  # Stateful awk: traccia se siamo dentro <activity android:name=".MainActivity">
  # e inietta solo nella sua </activity>, non nel primo </activity> trovato.
  awk -v host="$DEEP_LINK_HOST" '
    /<activity[^>]*android:name="\.MainActivity"/ { inMain = 1 }
    inMain && /<\/activity>/ && !injected {
      print "            <!-- FERMENTA_DEEP_LINK: HTTPS App Links -->"
      print "            <intent-filter android:autoVerify=\"true\">"
      print "                <action android:name=\"android.intent.action.VIEW\" />"
      print "                <category android:name=\"android.intent.category.DEFAULT\" />"
      print "                <category android:name=\"android.intent.category.BROWSABLE\" />"
      print "                <data android:scheme=\"https\" android:host=\"" host "\" />"
      print "            </intent-filter>"
      print "            <!-- FERMENTA_DEEP_LINK: custom scheme fallback -->"
      print "            <intent-filter>"
      print "                <action android:name=\"android.intent.action.VIEW\" />"
      print "                <category android:name=\"android.intent.category.DEFAULT\" />"
      print "                <category android:name=\"android.intent.category.BROWSABLE\" />"
      print "                <data android:scheme=\"fermentato\" />"
      print "            </intent-filter>"
      injected = 1
      inMain = 0
    }
    /<\/activity>/ { inMain = 0 }
    { print }
  ' "$MANIFEST" > "$MANIFEST.new" && mv "$MANIFEST.new" "$MANIFEST"

  # Self-check: il marker DEVE comparire ora nel manifest, altrimenti la patch ha fallito
  # (es. MainActivity non trovata col nome atteso).
  if ! grep -q "FERMENTA_DEEP_LINK" "$MANIFEST"; then
    echo "❌ Patch deep link fallita: <activity android:name=\".MainActivity\"> non trovata in $MANIFEST"
    exit 1
  fi
  echo "    ✅ Deep link intent-filter aggiunto a MainActivity"
}

build() {
  echo "════════════════════════════════════════════"
  echo "  Build APK Fermenta.to                     "
  echo "════════════════════════════════════════════"

  check_prereqs

  # Carica SDKMAN e Java 21
  # shellcheck disable=SC1090
  source "$HOME/.sdkman/bin/sdkman-init.sh" 2>/dev/null || true
  export JAVA_HOME="$HOME/.sdkman/candidates/java/current"
  export ANDROID_HOME="$ANDROID_SDK_DIR"
  export PATH="$JAVA_HOME/bin:$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/build-tools/34.0.0"

  if ! command -v java >/dev/null 2>&1; then
    echo "❌ Java non trovato nel PATH. Esegui prima: bash scripts/build-apk.sh setup"
    exit 1
  fi
  if [ ! -d "$ANDROID_HOME" ]; then
    echo "❌ Android SDK non trovato in $ANDROID_HOME. Esegui prima: bash scripts/build-apk.sh setup"
    exit 1
  fi

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

  echo "── 5/6 Applico icone e status bar ──"
  cd android

  # --- Icone app (pre-generate dal repo, nessuna dipendenza esterna) ---
  ICONS_SRC="$APP_DIR/capacitor-resources/android"
  if [ -d "$ICONS_SRC" ]; then
    echo "    Copio icone launcher dal repo..."
    for dir in mipmap-mdpi mipmap-hdpi mipmap-xhdpi mipmap-xxhdpi mipmap-xxxhdpi; do
      DEST="app/src/main/res/$dir"
      mkdir -p "$DEST"
      cp "$ICONS_SRC/$dir/ic_launcher.png"            "$DEST/ic_launcher.png"
      cp "$ICONS_SRC/$dir/ic_launcher_round.png"       "$DEST/ic_launcher_round.png"
      cp "$ICONS_SRC/$dir/ic_launcher_foreground.png"  "$DEST/ic_launcher_foreground.png"
    done

    # Adaptive icon XML (Android 8.0+): sovrascrive il default Capacitor (X blu)
    ANYDPI_DEST="app/src/main/res/mipmap-anydpi-v26"
    mkdir -p "$ANYDPI_DEST"
    cp "$ICONS_SRC/mipmap-anydpi-v26/ic_launcher.xml"       "$ANYDPI_DEST/ic_launcher.xml"
    cp "$ICONS_SRC/mipmap-anydpi-v26/ic_launcher_round.xml"  "$ANYDPI_DEST/ic_launcher_round.xml"

    echo "    ✅ Icone copiate (mdpi→xxxhdpi, legacy + adaptive foreground)"
  else
    echo "    ⚠️  capacitor-resources/android non trovata — icone non aggiornate"
  fi

  # --- Status bar color: warm cream (#FFF7ED), icone scure ---
  STYLES_FILE="app/src/main/res/values/styles.xml"
  if [ -f "$STYLES_FILE" ]; then
    echo "    Imposto colore status bar (#FFF7ED, icone scure)..."
    # Rimuovi eventuali impostazioni precedenti sullo statusBar e windowLightStatusBar
    sed -i '/<item name="android:statusBarColor">/d' "$STYLES_FILE"
    sed -i '/<item name="android:windowLightStatusBar">/d' "$STYLES_FILE"
    sed -i '/<item name="android:navigationBarColor">/d' "$STYLES_FILE"
    sed -i '/<item name="android:windowLightNavigationBar">/d' "$STYLES_FILE"
    # Inietta prima del tag </style>
    sed -i 's|</style>|    <item name="android:statusBarColor">#FFF7ED</item>\n    <item name="android:windowLightStatusBar">true</item>\n    <item name="android:navigationBarColor">#FFF7ED</item>\n    <item name="android:windowLightNavigationBar">true</item>\n</style>|' "$STYLES_FILE"
    echo "    ✅ Status bar aggiornata"
  fi

  # --- Deep link: intent-filter su MainActivity per https://fermenta.to/* ---
  patch_android_manifest

  echo "── 6/6 Compilo APK ──"
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

  # ── 6/6 Copia APK nella cartella downloads del server ──
  cd "$APP_DIR"
  echo "── 6/6 Pubblico APK per download in-app ──"
  mkdir -p downloads
  cp "android/$APK_PATH" "downloads/fermenta.apk"
  echo "    ✅ APK disponibile su https://fermenta.to/app/download"

  echo ""
  echo "════════════════════════════════════════════"
  echo "✅ APK pronto!"
  echo "   $APP_DIR/android/$APK_PATH"
  echo ""
  echo "Download diretto (telefono): https://fermenta.to/app/download"
  echo "Per scaricarlo sul PC:       scp root@45.134.39.247:$APP_DIR/android/$APK_PATH ~/fermenta.apk"
  echo ""
  echo "Per forzare aggiornamento in-app:"
  echo "   Imposta APP_MIN_VERSION=<nuova_versione> nell'ambiente del server"
  echo "   e aggiorna client/src/lib/app-version.ts nel prossimo build"
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
