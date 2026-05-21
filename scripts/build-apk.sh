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

# ─────────────────────────────────────────────────────────────────────────────
# Patcha AndroidManifest.xml per:
#   1. Deep link HTTPS App Links (https://fermenta.to/*)
#   2. Custom scheme fallback (fermentato://)
#
# Gestisce il tag <activity> su PIÙ RIGHE (formato Capacitor 8):
#   <activity
#       android:name="MainActivity"   ← riga separata
#       android:exported="true"
#       ...>
# ─────────────────────────────────────────────────────────────────────────────
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

  # Awk stateful che gestisce <activity> su più righe:
  # - inBlock=1 quando stiamo dentro un'apertura <activity che non è ancora chiusa
  # - inMain=1 se quella activity contiene "MainActivity" in qualsiasi forma
  # - quando inMain e troviamo </activity>, inietta i filtri e resetta
  awk -v host="$DEEP_LINK_HOST" '
    # Inizio di un tag <activity (può aprirsi su più righe)
    /<activity[ \t]/ && !inBlock {
      inBlock = 1
      blockHasMain = 0
    }

    # Mentre siamo nel blocco di apertura del tag <activity...>
    inBlock {
      # Controlla se questa riga contiene "MainActivity" (qualsiasi forma)
      if (/MainActivity/) { blockHasMain = 1 }

      # Se il tag di apertura si chiude su questa riga (contiene ">")
      if (/>/) {
        inBlock = 0
        if (blockHasMain) { inMain = 1 }
      }
    }

    # Quando siamo dentro la MainActivity e troviamo la sua chiusura
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

    # Chiusura </activity> fuori da MainActivity: resetta stato
    !inMain && /<\/activity>/ { inBlock = 0 }

    { print }
  ' "$MANIFEST" > "$MANIFEST.new" && mv "$MANIFEST.new" "$MANIFEST"

  # Self-check: non fatale — avvisa ma non blocca la build
  if ! grep -q "FERMENTA_DEEP_LINK" "$MANIFEST"; then
    echo "    ⚠️  Patch deep link non applicata (MainActivity non trovata con pattern noto)"
    echo "    ℹ️  Deep link non attivi nell'APK, ma la build continua"
  else
    echo "    ✅ Deep link intent-filter aggiunto a MainActivity"
  fi
}

# ─────────────────────────────────────────────────────────────────────────────
# Disabilita Firebase auto-init per evitare crash all'avvio con google-services
# placeholder (senza credenziali FCM reali). Aggiunge meta-data in </application>.
# ─────────────────────────────────────────────────────────────────────────────
disable_firebase_autoinit() {
  local MANIFEST="app/src/main/AndroidManifest.xml"
  if grep -q "firebase_messaging_auto_init_enabled" "$MANIFEST" 2>/dev/null; then
    echo "    ℹ️  Firebase auto-init già disabilitato"
    return
  fi
  sed -i 's|</application>|        <meta-data android:name="firebase_messaging_auto_init_enabled" android:value="false" />\n        <meta-data android:name="firebase_analytics_collection_deactivated" android:value="true" />\n    </application>|' "$MANIFEST"
  echo "    ✅ Firebase auto-init disabilitato (placeholder FCM — no crash avvio)"
}

inject_cast_plugin() {
    if [ ! -d "$APP_DIR/android-native" ]; then
      echo "    ⚠️  android-native/ non trovata — skip Cast plugin"
      return
    fi

    # ── 1. Rileva il package reale dell'app ────────────────────────────────────
    # Il package può differire da to.fermentato.app (es. la cartella android/
    # sulla VPS è stata scaffoldata con un appId vecchio). Lo deduciamo dalla
    # posizione di MainActivity, oppure dall'applicationId in build.gradle.
    local MAIN_FILE
    MAIN_FILE=$(find app/src/main/java \( -name 'MainActivity.kt' -o -name 'MainActivity.java' \) 2>/dev/null | head -1)
    local PKG=""
    if [ -n "$MAIN_FILE" ]; then
      PKG=$(grep -oP '^package\s+\K[a-zA-Z0-9_.]+' "$MAIN_FILE" | head -1)
    fi
    if [ -z "$PKG" ]; then
      PKG=$(grep -oP "applicationId\s+[\"']\K[^\"']+" app/build.gradle 2>/dev/null | head -1)
    fi
    if [ -z "$PKG" ]; then
      PKG="to.fermentato.app"
    fi
    local PKG_PATH=${PKG//./\/}
    local PKG_DIR="app/src/main/java/$PKG_PATH"
    mkdir -p "$PKG_DIR"
    echo "    ℹ️  Package Android rilevato: $PKG → $PKG_DIR"
    export CAST_PKG="$PKG"

    # ── 2. Copia + riscrivi package nei sorgenti Kotlin del plugin ─────────────
    # Prima rimuovi eventuali copie stale in package vecchi (es. to/fermentato/app
    # da un build precedente, prima che rilevassimo dinamicamente il package).
    find app/src/main/java \( -name 'NativeCastPlugin.kt' -o -name 'CastOptionsProvider.kt' \) \
      -not -path "$PKG_DIR/*" -print -delete 2>/dev/null || true
    cp "$APP_DIR/android-native/NativeCastPlugin.kt"    "$PKG_DIR/"
    cp "$APP_DIR/android-native/CastOptionsProvider.kt" "$PKG_DIR/"
    sed -i "s/^package .*/package $PKG/" "$PKG_DIR/NativeCastPlugin.kt"
    sed -i "s/^package .*/package $PKG/" "$PKG_DIR/CastOptionsProvider.kt"
    echo "    ✅ Sorgenti plugin copiati (package=$PKG)"

    # ── 3. Assicura supporto Kotlin (classpath root + plugin app) ──────────────
    # Senza kotlin-android i .kt del plugin Cast non vengono compilati →
    # "package X does not exist". Ma per APPLICARE kotlin-android serve prima
    # il classpath kotlin-gradle-plugin nel build.gradle di progetto (root).
    local ROOT_GRADLE="build.gradle"
    local APP_GRADLE="app/build.gradle"
    # Upsert: rimuove eventuale vecchia versione e reinserisce sempre 2.1.0
    # (necessario per allinearsi al kotlin-stdlib 2.1.0 tirato da @capacitor/geolocation 8.x)
    sed -i '/kotlin-gradle-plugin/d' "$ROOT_GRADLE"
    sed -i '0,/classpath\s*["'"'"']com\.android\.tools\.build:gradle/{s#\(classpath\s*["'"'"']com\.android\.tools\.build:gradle[^"'"'"']*["'"'"']\)#\1\n        classpath "org.jetbrains.kotlin:kotlin-gradle-plugin:2.1.0"#}' "$ROOT_GRADLE"
    echo "    ✅ kotlin-gradle-plugin:2.1.0 forzato nel classpath di $ROOT_GRADLE"
    if ! grep -qE "(kotlin-android|org.jetbrains.kotlin.android)" "$APP_GRADLE"; then
      sed -i '0,/apply plugin: .com.android.application./{s//apply plugin: "com.android.application"\napply plugin: "kotlin-android"/}' "$APP_GRADLE"
      echo "    ✅ Plugin kotlin-android applicato in $APP_GRADLE"
    fi

    # ── 4. Registra il plugin in MainActivity (Java o Kotlin) ──────────────────
    if [ -z "$MAIN_FILE" ]; then
      echo "    ⚠️  MainActivity non trovata: la genero in $PKG_DIR/MainActivity.kt"
      cat > "$PKG_DIR/MainActivity.kt" <<KTEOF
package $PKG

import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity()
KTEOF
      MAIN_FILE="$PKG_DIR/MainActivity.kt"
    fi
    # Rimuove qualsiasi import + registerPlugin stale (package vecchio o posizione sbagliata)
    sed -i '/^import .*\.NativeCastPlugin;\?$/d' "$MAIN_FILE"
    sed -i '/registerPlugin(NativeCastPlugin/d' "$MAIN_FILE"
    case "$MAIN_FILE" in
      *.java)
        sed -i "s|import com.getcapacitor.BridgeActivity;|import com.getcapacitor.BridgeActivity;\nimport $PKG.NativeCastPlugin;|" "$MAIN_FILE"
        # IMPORTANTE: registerPlugin DEVE essere PRIMA di super.onCreate (Capacitor docs)
        sed -i 's/super.onCreate(savedInstanceState);/registerPlugin(NativeCastPlugin.class);\n        super.onCreate(savedInstanceState);/' "$MAIN_FILE"
        echo "    ✅ NativeCastPlugin registrato in $MAIN_FILE (import → $PKG, prima di super.onCreate)"
        ;;
      *.kt)
        sed -i "s|import com.getcapacitor.BridgeActivity|import com.getcapacitor.BridgeActivity\nimport $PKG.NativeCastPlugin|" "$MAIN_FILE"
        if ! grep -q "registerPlugin(NativeCastPlugin" "$MAIN_FILE"; then
          if grep -q "override fun onCreate" "$MAIN_FILE"; then
            sed -i 's/super.onCreate(savedInstanceState)/registerPlugin(NativeCastPlugin::class.java)\n        super.onCreate(savedInstanceState)/' "$MAIN_FILE"
          else
            python3 - "$MAIN_FILE" <<'PYEOF'
import sys
p = sys.argv[1]
txt = open(p).read()
inject = """
    override fun onCreate(savedInstanceState: android.os.Bundle?) {
        registerPlugin(NativeCastPlugin::class.java)
        super.onCreate(savedInstanceState)
    }
"""
idx = txt.rstrip().rfind("}")
open(p, "w").write(txt[:idx] + inject + txt[idx:])
PYEOF
          fi
        fi
        echo "    ✅ NativeCastPlugin registrato in $MAIN_FILE"
        ;;
    esac

    # ── 2b. Registra NativeCast in capacitor.plugins.json (registry runtime) ──
    # In Capacitor 5+ la bridge Android al boot legge i plugin da
    # android/app/src/main/assets/capacitor.plugins.json. I plugin di
    # node_modules vengono inseriti automaticamente da `cap sync`, ma quelli
    # LOCALI (come il nostro NativeCast) vanno aggiunti a mano qui — altrimenti
    # JS riceve "plugin is not implemented on android" anche se MainActivity
    # chiama registerPlugin().
    local PLUGINS_JSON="app/src/main/assets/capacitor.plugins.json"
    mkdir -p "$(dirname "$PLUGINS_JSON")"
    [ ! -f "$PLUGINS_JSON" ] && echo "[]" > "$PLUGINS_JSON"
    PKG_FOR_PY="$PKG" python3 - "$PLUGINS_JSON" <<'PYEOF'
import json, os, sys
path = sys.argv[1]
pkg  = os.environ["PKG_FOR_PY"]
classpath = f"{pkg}.NativeCastPlugin"
try:
    data = json.load(open(path))
    if not isinstance(data, list):
        data = []
except Exception:
    data = []
data = [p for p in data if p.get("classpath") != classpath]
data.append({"pkg": pkg, "classpath": classpath})
json.dump(data, open(path, "w"), indent=2)
print(f"    ✅ NativeCast registrato in {path} → {classpath}")
PYEOF

    # ── 3. Dipendenze Cast in build.gradle ───────────────────────────────────
  local BUILD="app/build.gradle"
  grep -q "play-services-cast-framework" "$BUILD" || \
    sed -i '/dependencies {/a\    implementation "com.google.android.gms:play-services-cast-framework:21.5.0"\n    implementation "androidx.mediarouter:mediarouter:1.7.0"' "$BUILD"
  echo "    ✅ Dipendenze Cast aggiunte a build.gradle"

  # ── 4. CastOptionsProvider in AndroidManifest ────────────────────────────
  # CRITICO: passare $PKG come secondo arg. Senza, lo script usa il default
  # to.fermentato.app, e il meta-data nel manifest punta a una classe
  # inesistente (la classe compilata è in $PKG, riscritta da sed sopra).
  # Risultato: ClassNotFoundException → CastContext.getSharedInstance()
  # rigetta → la nostra app vede "NO_CAST_CONTEXT" (-3) senza causa apparente.
  python3 "$APP_DIR/android-native/inject_cast_manifest.py" \
    "app/src/main/AndroidManifest.xml" "$PKG"

  # ── 5. Permessi mDNS/WiFi per discovery Chromecast ───────────────────────
  # CHANGE_WIFI_MULTICAST_STATE: obbligatorio per ricevere i pacchetti mDNS
  # con cui il Cast SDK scopre i Chromecast sulla rete locale.
  # Inseriamo prima di </manifest> (più robusto del match sulla riga INTERNET
  # che varia per spazi/formato nei diversi template Capacitor).
  local MANIFEST="app/src/main/AndroidManifest.xml"
  if ! grep -q "CHANGE_WIFI_MULTICAST_STATE" "$MANIFEST"; then
    sed -i 's|</manifest>|    <uses-permission android:name="android.permission.CHANGE_WIFI_MULTICAST_STATE" />\n    <uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />\n    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />\n</manifest>|' "$MANIFEST"
    echo "    ✅ Permessi mDNS/WiFi aggiunti al manifest"
  else
    echo "    ℹ️  Permessi mDNS/WiFi già presenti"
  fi

  # NEARBY_WIFI_DEVICES: obbligatorio su Android 13+ (API 33+) per il
  # discovery Chromecast via mDNS. Senza, il dialog Cast è vuoto.
  if ! grep -q "NEARBY_WIFI_DEVICES" "$MANIFEST"; then
    # Aggiungi xmlns:tools al <manifest> se manca (richiesto per tools:targetApi)
    if ! grep -q 'xmlns:tools=' "$MANIFEST"; then
      sed -i 's|<manifest |<manifest xmlns:tools="http://schemas.android.com/tools" |' "$MANIFEST"
    fi
    sed -i 's|</manifest>|    <uses-permission android:name="android.permission.NEARBY_WIFI_DEVICES" android:usesPermissionFlags="neverForLocation" tools:targetApi="33" />\n    <uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />\n</manifest>|' "$MANIFEST"
    echo "    ✅ Permesso NEARBY_WIFI_DEVICES aggiunto (Android 13+ Cast discovery)"
  else
    echo "    ℹ️  NEARBY_WIFI_DEVICES già presente"
  fi

  # ── 6. Permessi Geolocalizzazione (per @capacitor/geolocation) ──────────
  # FINE = GPS preciso, COARSE = wifi/cell-tower fallback. Senza questi
  # il plugin non mostra il dialog di sistema "Consenti accesso posizione".
  if ! grep -q "ACCESS_FINE_LOCATION" "$MANIFEST"; then
    sed -i 's|</manifest>|    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />\n    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />\n</manifest>|' "$MANIFEST"
    echo "    ✅ Permessi Geolocalizzazione aggiunti al manifest"
  else
    echo "    ℹ️  Permessi Geolocalizzazione già presenti"
  fi
  echo "    ✅ Cast plugin iniettato con successo"
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

  echo "── 1/6 Pull ultimo codice ──"
  git pull

  echo "── 2/6 Installo dipendenze npm ──"
  npm install

  echo "── 3/6 Build Vite (serve per sincronizzare i plugin nativi) ──"
  # Con server.url impostato, la UI viene caricata da fermenta.to —
  # non dai file in bundle. Il build serve solo per sincronizzare
  # le dipendenze native (plugin Capacitor).
  set -a; source .env.capacitor 2>/dev/null || true; set +a
  npx vite build

  echo "── 4/6 Aggiungo/sincronizzo piattaforma Android ──"
  if [ ! -d "android" ]; then
    echo "    Prima build — aggiungo piattaforma Android..."
    npx cap add android
  fi
  npx cap sync android

  echo "    Bump versione app..."
  NEW_VERSION=$(bash "$APP_DIR/scripts/bump-version.sh")
  echo "    ✅ Versione: $NEW_VERSION"

  echo "    Genero splash screen native (sovrascrivo il default Capacitor)..."
  node "$APP_DIR/scripts/generate-native-splash.js" || echo "    ⚠️  generate-native-splash.js fallito — splash di default resta in uso"

  echo "── 5/6 Applico icone, versione, status bar e manifest patches ──"
  cd android

  # --- Versione Android (versionName + versionCode incrementale) ---
  # versionCode = numero intero monotonico per Play Store. Lo ricaviamo da
  # version.json: MAJOR*10000 + MINOR*100 + PATCH (es. 1.0.2 → 10002).
  IFS='.' read -r VM_MAJOR VM_MINOR VM_PATCH <<< "$NEW_VERSION"
  VERSION_CODE=$(( VM_MAJOR * 10000 + VM_MINOR * 100 + VM_PATCH ))
  if [ -f "app/build.gradle" ]; then
    sed -i "s/versionName \"[^\"]*\"/versionName \"$NEW_VERSION\"/" app/build.gradle
    sed -i "s/versionCode [0-9]*/versionCode $VERSION_CODE/" app/build.gradle
    echo "    ✅ Android versionName=$NEW_VERSION versionCode=$VERSION_CODE"
  fi

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
    sed -i '/<item name="android:statusBarColor">/d' "$STYLES_FILE"
    sed -i '/<item name="android:windowLightStatusBar">/d' "$STYLES_FILE"
    sed -i '/<item name="android:navigationBarColor">/d' "$STYLES_FILE"
    sed -i '/<item name="android:windowLightNavigationBar">/d' "$STYLES_FILE"
    sed -i 's|</style>|    <item name="android:statusBarColor">#FFF7ED</item>\n    <item name="android:windowLightStatusBar">true</item>\n    <item name="android:navigationBarColor">#FFF7ED</item>\n    <item name="android:windowLightNavigationBar">true</item>\n</style>|' "$STYLES_FILE"
    echo "    ✅ Status bar aggiornata"
  fi

  # --- Deep link: intent-filter su MainActivity per https://fermenta.to/* ---
  patch_android_manifest

  # --- Firebase: disabilita auto-init (placeholder FCM → evita crash avvio) ---
  disable_firebase_autoinit

  # --- Plugin NativeCast (Chromecast nativo) --------------------------------
  inject_cast_plugin

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

  # ── Copia APK nella cartella downloads del server ──
  cd "$APP_DIR"
  echo "── Pubblico APK per download in-app ──"
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
