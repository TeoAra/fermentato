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
  #
  # NOTA: Capacitor 8 genera <activity\n (newline dopo il tag, senza spazio/tab)
  #       quindi il pattern è solo /<activity/ senza vincoli di whitespace.
  awk -v host="$DEEP_LINK_HOST" '
    # Inizio di un tag <activity (può aprirsi su più righe o tutto su una riga)
    # Esclude </activity> e <activity-alias>
    /<activity/ && !/<\/activity/ && !/<activity-alias/ && !inBlock {
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
# Configura Firebase in base alla presenza di credenziali FCM REALI.
#  • Se app/google-services.json contiene una API key valida (AIza…):
#      → applica il plugin Gradle com.google.gms.google-services
#      → ABILITA Firebase auto-init (rimuove eventuali meta-data di disabilita)
#      → le push native FCM funzionano.
#  • Altrimenti (placeholder o file mancante):
#      → DISABILITA auto-init per evitare il crash all'avvio.
# Detection: l'API key Android di Firebase inizia sempre con "AIza".
# ─────────────────────────────────────────────────────────────────────────────
disable_firebase_autoinit() {
  local MANIFEST="app/src/main/AndroidManifest.xml"
  local GS="app/google-services.json"
  local ROOT_GRADLE="build.gradle"
  local APP_GRADLE="app/build.gradle"

  # Detection robusta: il placeholder (scripts/google-services-placeholder.json)
  # ha anch'esso current_key che inizia con "AIza" (AIzaSyPlaceholder...),
  # project_id "fermentato-placeholder" e project_number "000000000000".
  # Serve quindi: key AIza* + NESSUN marcatore "placeholder" + project_number ≠ tutti zeri.
  local HAS_REAL_FIREBASE=0
  if [ -f "$GS" ] \
     && grep -qE '"current_key"[[:space:]]*:[[:space:]]*"AIza' "$GS" 2>/dev/null \
     && ! grep -qiE 'placeholder|NotActiveFCM' "$GS" 2>/dev/null \
     && ! grep -qE '"project_number"[[:space:]]*:[[:space:]]*"0+"' "$GS" 2>/dev/null; then
    HAS_REAL_FIREBASE=1
  fi

  if [ "$HAS_REAL_FIREBASE" = "1" ]; then
    echo "    ✅ google-services.json REALE rilevato (API key valida)"

    # 1) Applica il plugin Gradle google-services (classpath root + apply app)
    if ! grep -q "com.google.gms:google-services" "$ROOT_GRADLE" 2>/dev/null; then
      sed -i '0,/classpath\s*["'"'"']com\.android\.tools\.build:gradle/{s#\(classpath\s*["'"'"']com\.android\.tools\.build:gradle[^"'"'"']*["'"'"']\)#\1\n        classpath "com.google.gms:google-services:4.4.2"#}' "$ROOT_GRADLE"
      echo "    ✅ classpath com.google.gms:google-services:4.4.2 aggiunto a $ROOT_GRADLE"
    fi
    # Capacitor applica il plugin SOLO dentro `if (servicesJSON.text)` a fine
    # file: questo blocco condizionale a volte NON genera values.xml (chiave
    # mancante a runtime → "invalid API key"). Forziamo un apply INCONDIZIONATO
    # a colonna 0 (idempotente: un secondo apply dello stesso plugin è no-op).
    if ! grep -qE "^apply plugin: ['\"]com\.google\.gms\.google-services" "$APP_GRADLE" 2>/dev/null; then
      printf "\napply plugin: 'com.google.gms.google-services'\n" >> "$APP_GRADLE"
      echo "    ✅ plugin com.google.gms.google-services applicato (INCONDIZIONATO) in $APP_GRADLE"
    else
      echo "    ✅ plugin com.google.gms.google-services già applicato (incondizionato)"
    fi

    # 2) ABILITA auto-init: rimuove i meta-data di disabilitazione iniettati
    #    da build precedenti (quando il file era un placeholder).
    if grep -q "firebase_messaging_auto_init_enabled" "$MANIFEST" 2>/dev/null; then
      sed -i '/firebase_messaging_auto_init_enabled/d; /firebase_analytics_collection_deactivated/d' "$MANIFEST"
      echo "    ✅ Firebase auto-init RI-ABILITATO (push native FCM attive)"
    else
      echo "    ✅ Firebase auto-init già attivo"
    fi

    # 3) Rimuovi google_api_key da strings.xml se presente.
    #    In Android le risorse app-level vincono su quelle generate dal plugin
    #    google-services: un <string name="google_api_key"></string> vuoto in
    #    strings.xml azzererebbe la chiave a runtime anche se l'AAB contiene la
    #    stringa AIza nel binario → "Please set a valid API key" da FirebaseInstallations.
    local STRINGS_XML="app/src/main/res/values/strings.xml"
    if [ -f "$STRINGS_XML" ] && grep -q 'name="google_api_key"' "$STRINGS_XML" 2>/dev/null; then
      sed -i '/<string name="google_api_key"/d' "$STRINGS_XML"
      echo "    ✅ google_api_key rimosso da strings.xml (prevenuto override vuoto della chiave FCM)"
    fi
    return
  fi

  # Nessuna credenziale reale → disabilita auto-init per evitare crash all'avvio
  echo "    ⚠️  google-services.json placeholder/mancante → push FCM NON funzioneranno"
  if grep -q "firebase_messaging_auto_init_enabled" "$MANIFEST" 2>/dev/null; then
    echo "    ℹ️  Firebase auto-init già disabilitato"
    return
  fi
  sed -i 's|</application>|        <meta-data android:name="firebase_messaging_auto_init_enabled" android:value="false" />\n        <meta-data android:name="firebase_analytics_collection_deactivated" android:value="true" />\n    </application>|' "$MANIFEST"
  echo "    ✅ Firebase auto-init disabilitato (placeholder FCM — no crash avvio)"
}

# ─────────────────────────────────────────────────────────────────────────────
# Inietta l'inizializzazione Firebase DIRETTAMENTE in MainActivity.kt.
#
# PERCHÉ: il plugin Gradle com.google.gms.google-services genera
# google-services.xml a compile-time. In alcuni AAB Play Store questa
# generazione fallisce silenziosamente (strings.xml override, condizioni
# Capacitor, merge di risorse) → getApiKey()="" → "Please set a valid API key".
#
# COME: legge i valori da google-services.json con python3, poi inietta un
# metodo privato initFirebaseManual() in MainActivity.kt che chiama
# FirebaseApp.initializeApp() con FirebaseOptions.Builder().
# Il metodo è guardato da FirebaseApp.getApps(this).isEmpty() → no-op se il
# plugin è già riuscito. Se il plugin fallisce, il codice Kotlin ci pensa lui.
#
# PREREQUISITO: com.google.firebase:firebase-messaging è già nella dipendenza
# del progetto tramite @capacitor/push-notifications → FirebaseApp e
# FirebaseOptions sono sempre disponibili.
# ─────────────────────────────────────────────────────────────────────────────
inject_firebase_manual_init() {
  local GS="app/google-services.json"
  local MAIN_FILE
  MAIN_FILE=$(find app/src/main/java \( -name 'MainActivity.kt' -o -name 'MainActivity.java' \) 2>/dev/null | head -1)

  if [ ! -f "$GS" ]; then
    echo "    ⚠️  google-services.json non trovato — skip Firebase manual init"
    return
  fi
  if [ ! -f "$MAIN_FILE" ]; then
    echo "    ⚠️  MainActivity non trovata — skip Firebase manual init"
    return
  fi

  echo "    Inietto Firebase manual init in MainActivity (failsafe AAB Play)..."

  python3 - "$GS" "$MAIN_FILE" <<'PYEOF'
import sys, json, re

gs_path, main_path = sys.argv[1], sys.argv[2]
is_java = main_path.endswith(".java")

# ── Leggi google-services.json ────────────────────────────────────────────────
try:
    d = json.load(open(gs_path))
    client   = d["client"][0]
    api_key  = client["api_key"][0]["current_key"]
    app_id   = client["client_info"]["mobilesdk_app_id"]
    proj_id  = d["project_info"]["project_id"]
    sender   = d["project_info"]["project_number"]
    bucket   = d["project_info"].get("storage_bucket", f"{proj_id}.appspot.com")
except Exception as e:
    print(f"    ⚠️  Errore lettura google-services.json: {e} — skip")
    sys.exit(0)

if "placeholder" in proj_id.lower() or not api_key.startswith("AIza"):
    print("    ⚠️  google-services.json è un placeholder — skip Firebase manual init")
    sys.exit(0)

txt = open(main_path).read()

# ── Idempotente: non iniettare due volte ──────────────────────────────────────
if "initFirebaseManual" in txt:
    lang = "Java" if is_java else "Kotlin"
    print(f"    ✅ Firebase manual init già presente in MainActivity.{('java' if is_java else 'kt')}")
    sys.exit(0)

# ── Genera codice nel linguaggio corretto (Java o Kotlin) ─────────────────────
if is_java:
    # ---- JAVA ----
    init_method = f"""
    // ── Firebase manual init (failsafe per AAB Play Store) ───────────────────
    // Il plugin google-services Gradle a volte non genera correttamente
    // google-services.xml nell'AAB → getApiKey()="" a runtime.
    private void initFirebaseManual() {{
        if (com.google.firebase.FirebaseApp.getApps(this).isEmpty()) {{
            com.google.firebase.FirebaseOptions opts = new com.google.firebase.FirebaseOptions.Builder()
                .setApiKey("{api_key}")
                .setApplicationId("{app_id}")
                .setProjectId("{proj_id}")
                .setGcmSenderId("{sender}")
                .setStorageBucket("{bucket}")
                .build();
            com.google.firebase.FirebaseApp.initializeApp(this, opts);
            android.util.Log.d("FermentaFCM", "Firebase inizializzato manualmente (failsafe)");
        }} else {{
            android.util.Log.d("FermentaFCM", "Firebase gia inizializzato dal plugin google-services");
        }}
    }}
"""
    # Inserisce prima dell'ultima graffa della classe
    last_brace = txt.rstrip().rfind("}")
    new_txt = txt[:last_brace] + init_method + "}\n"

    # Chiama initFirebaseManual() in onCreate — prima di super.onCreate()
    if re.search(r'void\s+onCreate\s*\(', new_txt):
        new_txt = re.sub(
            r'((?:@Override\s*)?(?:public|protected)\s+void\s+onCreate\s*\([^)]*\)\s*\{)',
            r'\1\n        initFirebaseManual();',
            new_txt,
            count=1
        )
    elif "super.onCreate(" in new_txt:
        new_txt = new_txt.replace(
            "super.onCreate(",
            "initFirebaseManual();\n        super.onCreate(",
            1
        )
    else:
        oncreate_block = """
    @Override
    protected void onCreate(android.os.Bundle savedInstanceState) {
        initFirebaseManual();
        super.onCreate(savedInstanceState);
    }
"""
        last_brace2 = new_txt.rstrip().rfind("}")
        new_txt = new_txt[:last_brace2] + oncreate_block + "}\n"

else:
    # ---- KOTLIN ----
    init_method = f"""
    // ── Firebase manual init (failsafe per AAB Play Store) ───────────────────
    // Il plugin google-services Gradle a volte non genera correttamente
    // google-services.xml nell'AAB → getApiKey()="" a runtime.
    private fun initFirebaseManual() {{
        if (com.google.firebase.FirebaseApp.getApps(this).isEmpty()) {{
            val opts = com.google.firebase.FirebaseOptions.Builder()
                .setApiKey("{api_key}")
                .setApplicationId("{app_id}")
                .setProjectId("{proj_id}")
                .setGcmSenderId("{sender}")
                .setStorageBucket("{bucket}")
                .build()
            com.google.firebase.FirebaseApp.initializeApp(this, opts)
            android.util.Log.d("FermentaFCM", "Firebase inizializzato manualmente (failsafe)")
        }} else {{
            android.util.Log.d("FermentaFCM", "Firebase gia inizializzato dal plugin google-services")
        }}
    }}
"""
    last_brace = txt.rstrip().rfind("}")
    new_txt = txt[:last_brace] + init_method + "}\n"

    if "override fun onCreate" in new_txt:
        new_txt = re.sub(
            r'(override fun onCreate\s*\([^)]*\)\s*\{)',
            r'\1\n        initFirebaseManual()',
            new_txt,
            count=1
        )
    elif "super.onCreate(" in new_txt:
        new_txt = new_txt.replace(
            "super.onCreate(",
            "initFirebaseManual()\n        super.onCreate(",
            1
        )
    else:
        oncreate_block = """
    override fun onCreate(savedInstanceState: android.os.Bundle?) {
        initFirebaseManual()
        super.onCreate(savedInstanceState)
    }
"""
        last_brace2 = new_txt.rstrip().rfind("}")
        new_txt = new_txt[:last_brace2] + oncreate_block + "}\n"

open(main_path, "w").write(new_txt)
lang = "Java" if is_java else "Kotlin"
print(f"    ✅ Firebase manual init iniettato in {main_path} [{lang}] (apiKey: {api_key[:14]}...)")
PYEOF
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
      PKG="to.fermenta.app"
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

import android.content.Intent
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    // ── Richiesto da @capgo/capacitor-social-login per Google Sign-In ──
    // Il plugin usa Google Sign-In SDK legacy che dipende da
    // onActivityResult per restituire il token. BridgeActivity lo gestisce
    // internamente, ma il plugin verifica esplicitamente che questa
    // override esista — senza lancia "You CANNOT use scopes without
    // modifying the main activity".
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
    }
}
KTEOF
      MAIN_FILE="$PKG_DIR/MainActivity.kt"
    fi
    # Rimuove qualsiasi import + registerPlugin stale (package vecchio o posizione sbagliata)
    sed -i '/^import .*\.NativeCastPlugin;\?$/d' "$MAIN_FILE"
    sed -i '/registerPlugin(NativeCastPlugin/d' "$MAIN_FILE"
    case "$MAIN_FILE" in
      *.java)
        sed -i "s|import com.getcapacitor.BridgeActivity;|import com.getcapacitor.BridgeActivity;\nimport $PKG.NativeCastPlugin;\nimport android.content.Intent;|" "$MAIN_FILE"
        # IMPORTANTE: registerPlugin DEVE essere PRIMA di super.onCreate (Capacitor docs)
        sed -i 's/super.onCreate(savedInstanceState);/registerPlugin(NativeCastPlugin.class);\n        super.onCreate(savedInstanceState);/' "$MAIN_FILE"
        # onActivityResult richiesto da @capgo/capacitor-social-login
        if ! grep -q "void onActivityResult" "$MAIN_FILE"; then
          sed -i 's/super.onActivityResult(requestCode, resultCode, data);/@Override\n    protected void onActivityResult(int requestCode, int resultCode, Intent data) {\n        super.onActivityResult(requestCode, resultCode, data);\n    }\n    \/\/ ----\n        super.onActivityResult(requestCode, resultCode, data);/' "$MAIN_FILE"
          echo "    ✅ onActivityResult inserito in $MAIN_FILE"
        fi
        echo "    ✅ NativeCastPlugin registrato in $MAIN_FILE (import → $PKG, prima di super.onCreate)"
        ;;
      *.kt)
        sed -i "s|import com.getcapacitor.BridgeActivity|import com.getcapacitor.BridgeActivity\nimport $PKG.NativeCastPlugin|" "$MAIN_FILE"
        # Inserisci import Intent se manca (richiesto da onActivityResult)
        if ! grep -q "import android.content.Intent" "$MAIN_FILE"; then
          sed -i "s|import com.getcapacitor.BridgeActivity|import android.content.Intent\nimport com.getcapacitor.BridgeActivity|" "$MAIN_FILE"
        fi
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
        # Inserisci onActivityResult se manca (richiesto da @capgo/capacitor-social-login)
        if ! grep -q "override fun onActivityResult" "$MAIN_FILE"; then
          python3 - "$MAIN_FILE" <<'PYEOF'
import sys
p = sys.argv[1]
txt = open(p).read()
inject = """
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: android.content.Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
    }
"""
# Inserisce prima dell'ultima graffa chiusa della classe
idx = txt.rstrip().rfind("}")
open(p, "w").write(txt[:idx] + inject + txt[idx:])
PYEOF
          echo "    ✅ onActivityResult inserito in $MAIN_FILE"
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
  git fetch origin
  git reset --hard origin/main

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

  echo "    Forzo applicationId Android a to.fermenta.app (diverso da iOS)..."
  sed -i 's/applicationId "[^"]*"/applicationId "to.fermenta.app"/' android/app/build.gradle
  echo "    ✅ applicationId Android = to.fermenta.app"

  echo "    Correggo package Java/Kotlin a to.fermenta.app..."
  # Se la cartella android/ è già stata scaffoldata con to.fermentato.app (da
  # capacitor.config.ts), il MainActivity.kt risiede nel package sbagliato.
  # Spostiamolo/ricreiamolo nel package corretto.
  OLD_PKG_DIR="android/app/src/main/java/to/fermentato/app"
  NEW_PKG_DIR="android/app/src/main/java/to/fermenta/app"
  if [ -d "$OLD_PKG_DIR" ] && [ ! -d "$NEW_PKG_DIR" ]; then
    mkdir -p "$NEW_PKG_DIR"
    if [ -f "$OLD_PKG_DIR/MainActivity.kt" ]; then
      sed 's/package to\.fermentato\.app/package to.fermenta.app/' "$OLD_PKG_DIR/MainActivity.kt" > "$NEW_PKG_DIR/MainActivity.kt"
      echo "    ✅ MainActivity.kt spostato e riscritto in to.fermenta.app"
    else
      # Genera MainActivity.kt pulita se manca
      cat > "$NEW_PKG_DIR/MainActivity.kt" <<KTEOF
package to.fermenta.app

import android.content.Intent
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
    }
}
KTEOF
      echo "    ✅ MainActivity.kt generata in to.fermenta.app"
    fi
    # Rimuovi la cartella del vecchio package (e qualsiasi file residuo)
    rm -rf "$OLD_PKG_DIR"
  elif [ -d "$NEW_PKG_DIR" ]; then
    echo "    ℅  Package to.fermenta.app già presente"
  fi

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

aab() {
  echo "════════════════════════════════════════════"
  echo "  Build AAB Fermenta.to (Google Play)        "
  echo "════════════════════════════════════════════"

  check_prereqs

  # Carica SDKMAN e Java 21
  # shellcheck disable=SC1090
  source "$HOME/.sdkman/bin/sdkman-init.sh" 2>/dev/null || true
  export JAVA_HOME="$HOME/.sdkman/candidates/java/current"
  export ANDROID_HOME="$ANDROID_SDK_DIR"
  export PATH="$JAVA_HOME/bin:$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/build-tools/34.0.0"

  if ! command -v java >/dev/null 2>&1; then
    echo "❌ Java non trovato. Esegui prima: bash scripts/build-apk.sh setup"
    exit 1
  fi
  if [ ! -d "$ANDROID_HOME" ]; then
    echo "❌ Android SDK non trovato. Esegui prima: bash scripts/build-apk.sh setup"
    exit 1
  fi

  echo "Java: $(java -version 2>&1 | head -1)"

  # ── Keystore per firma release ──────────────────────────────────────────────
  # Le credenziali si leggono da env; se assenti usano i default sicuri.
  # Metti queste variabili nel .env del server VPS oppure esportale prima di
  # lanciare lo script:
  #   export FERMENTA_KEY_PASS="una-password-sicura"
  #   export FERMENTA_KEY_ALIAS="fermenta"
  KEYSTORE_DIR="$APP_DIR/keystore"
  KEYSTORE_PATH="$KEYSTORE_DIR/fermenta-upload.jks"
  KEY_ALIAS="${FERMENTA_KEY_ALIAS:-fermenta}"
  KEY_PASS="${FERMENTA_KEY_PASS:-FermentaUpload2024!}"
  STORE_PASS="$KEY_PASS"

  mkdir -p "$KEYSTORE_DIR"
  if [ ! -f "$KEYSTORE_PATH" ]; then
    echo "── Genero keystore upload (prima volta) ──"
    keytool -genkeypair \
      -v \
      -keystore "$KEYSTORE_PATH" \
      -alias "$KEY_ALIAS" \
      -keyalg RSA \
      -keysize 2048 \
      -validity 10000 \
      -storepass "$STORE_PASS" \
      -keypass "$KEY_PASS" \
      -dname "CN=Fermenta.to, OU=Mobile, O=Fermenta, L=Italy, S=Italy, C=IT"
    echo "✅ Keystore generato: $KEYSTORE_PATH"
    echo ""
    echo "⚠️  IMPORTANTE — esegui questi passi UNA SOLA VOLTA su Google Play Console:"
    echo "   1. App → Release → Setup → App signing"
    echo "   2. Carica il certificato upload (export dal keystore):"
    echo "      keytool -export -rfc -keystore $KEYSTORE_PATH -alias $KEY_ALIAS -storepass $STORE_PASS -file upload-cert.pem"
    echo "   3. Poi carica il file upload-cert.pem su Play Console."
    echo ""
  else
    echo "    ✅ Keystore esistente: $KEYSTORE_PATH"
  fi

  cd "$APP_DIR"

  echo "── 1/6 Pull ultimo codice ──"
  git fetch origin
  git reset --hard origin/main

  echo "── 2/6 Installo dipendenze npm ──"
  npm install

  echo "── 3/6 Build Vite ──"
  set -a; source .env.capacitor 2>/dev/null || true; set +a
  npx vite build

  echo "── 4/6 Sincronizzo piattaforma Android ──"
  if [ ! -d "android" ]; then
    npx cap add android
  fi

  # Backup google-services.json REALE prima di cap sync.
  # cap sync (e cap add) sovrascrive android/ con template freschi che possono:
  #   • cancellare/sostituire android/app/google-services.json
  #   • aggiungere strings.xml con google_api_key="" vuoto
  # Salviamo il file reale in /tmp e lo ripristiniamo subito dopo.
  GS_BACKUP="/tmp/google-services-fermenta-backup.json"
  if [ -f "android/app/google-services.json" ] \
     && grep -q '"project_id"' "android/app/google-services.json" 2>/dev/null \
     && ! grep -qiE 'placeholder' "android/app/google-services.json" 2>/dev/null; then
    cp android/app/google-services.json "$GS_BACKUP"
    echo "    ✅ Backup google-services.json reale salvato in $GS_BACKUP"
  fi

  npx cap sync android

  # Ripristina google-services.json reale dopo cap sync
  if [ -f "$GS_BACKUP" ]; then
    cp "$GS_BACKUP" android/app/google-services.json
    echo "    ✅ google-services.json reale ripristinato dopo cap sync"
  else
    echo "    ⚠️  Nessun backup google-services.json trovato — push FCM potrebbero non funzionare"
    echo "       Assicurati che android/app/google-services.json sia quello reale prima di lanciare il build"
  fi

  echo "    Forzo applicationId a to.fermenta.app..."
  sed -i 's/applicationId "[^"]*"/applicationId "to.fermenta.app"/' android/app/build.gradle

  echo "    Correggo package Kotlin..."
  OLD_PKG_DIR="android/app/src/main/java/to/fermentato/app"
  NEW_PKG_DIR="android/app/src/main/java/to/fermenta/app"
  if [ -d "$OLD_PKG_DIR" ] && [ ! -d "$NEW_PKG_DIR" ]; then
    mkdir -p "$NEW_PKG_DIR"
    if [ -f "$OLD_PKG_DIR/MainActivity.kt" ]; then
      sed 's/package to\.fermentato\.app/package to.fermenta.app/' "$OLD_PKG_DIR/MainActivity.kt" > "$NEW_PKG_DIR/MainActivity.kt"
    else
      cat > "$NEW_PKG_DIR/MainActivity.kt" <<KTEOF
package to.fermenta.app

import android.content.Intent
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
    }
}
KTEOF
    fi
    rm -rf "$OLD_PKG_DIR"
  fi

  echo "    Bump versione app..."
  NEW_VERSION=$(bash "$APP_DIR/scripts/bump-version.sh")
  echo "    ✅ Versione: $NEW_VERSION"

  node "$APP_DIR/scripts/generate-native-splash.js" || true

  echo "── 5/6 Applico icone, versione, status bar e manifest patches ──"
  cd android

  IFS='.' read -r VM_MAJOR VM_MINOR VM_PATCH <<< "$NEW_VERSION"
  VERSION_CODE=$(( VM_MAJOR * 10000 + VM_MINOR * 100 + VM_PATCH ))
  if [ -f "app/build.gradle" ]; then
    sed -i "s/versionName \"[^\"]*\"/versionName \"$NEW_VERSION\"/" app/build.gradle
    sed -i "s/versionCode [0-9]*/versionCode $VERSION_CODE/" app/build.gradle
    echo "    ✅ versionName=$NEW_VERSION versionCode=$VERSION_CODE"
  fi

  ICONS_SRC="$APP_DIR/capacitor-resources/android"
  if [ -d "$ICONS_SRC" ]; then
    for dir in mipmap-mdpi mipmap-hdpi mipmap-xhdpi mipmap-xxhdpi mipmap-xxxhdpi; do
      DEST="app/src/main/res/$dir"
      mkdir -p "$DEST"
      cp "$ICONS_SRC/$dir/ic_launcher.png"            "$DEST/ic_launcher.png"
      cp "$ICONS_SRC/$dir/ic_launcher_round.png"       "$DEST/ic_launcher_round.png"
      cp "$ICONS_SRC/$dir/ic_launcher_foreground.png"  "$DEST/ic_launcher_foreground.png"
    done
    ANYDPI_DEST="app/src/main/res/mipmap-anydpi-v26"
    mkdir -p "$ANYDPI_DEST"
    cp "$ICONS_SRC/mipmap-anydpi-v26/ic_launcher.xml"       "$ANYDPI_DEST/ic_launcher.xml"
    cp "$ICONS_SRC/mipmap-anydpi-v26/ic_launcher_round.xml"  "$ANYDPI_DEST/ic_launcher_round.xml"
    echo "    ✅ Icone copiate"
  fi

  STYLES_FILE="app/src/main/res/values/styles.xml"
  if [ -f "$STYLES_FILE" ]; then
    sed -i '/<item name="android:statusBarColor">/d' "$STYLES_FILE"
    sed -i '/<item name="android:windowLightStatusBar">/d' "$STYLES_FILE"
    sed -i '/<item name="android:navigationBarColor">/d' "$STYLES_FILE"
    sed -i '/<item name="android:windowLightNavigationBar">/d' "$STYLES_FILE"
    sed -i 's|</style>|    <item name="android:statusBarColor">#FFF7ED</item>\n    <item name="android:windowLightStatusBar">true</item>\n    <item name="android:navigationBarColor">#FFF7ED</item>\n    <item name="android:windowLightNavigationBar">true</item>\n</style>|' "$STYLES_FILE"
    echo "    ✅ Status bar aggiornata"
  fi

  patch_android_manifest
  disable_firebase_autoinit
  inject_cast_plugin
  inject_firebase_manual_init

  echo "── 6/6 Compilo AAB release (firmato) ──"
  chmod +x gradlew
  echo "sdk.dir=$ANDROID_HOME" > local.properties

  sed -i "s/minSdkVersion = [0-9]*/minSdkVersion = 24/" variables.gradle
  sed -i "s/compileSdkVersion = [0-9]*/compileSdkVersion = 36/" variables.gradle
  sed -i "s/targetSdkVersion = [0-9]*/targetSdkVersion = 36/" variables.gradle
  sed -i "s/com.android.tools.build:gradle:[0-9.]*/com.android.tools.build:gradle:8.9.1/" build.gradle
  sed -i "s/gradle-[0-9.]*-bin.zip/gradle-8.12-bin.zip/" gradle/wrapper/gradle-wrapper.properties

  ./gradlew bundleRelease \
    -Pandroid.injected.signing.store.file="$KEYSTORE_PATH" \
    -Pandroid.injected.signing.store.password="$STORE_PASS" \
    -Pandroid.injected.signing.key.alias="$KEY_ALIAS" \
    -Pandroid.injected.signing.key.password="$KEY_PASS"

  AAB_PATH="app/build/outputs/bundle/release/app-release.aab"

  # Verifica che l'AAB contenga il project-id Firebase REALE.
  # grep -ao su resources.pb trova stringhe ovunque nel binario, quindi "AIza" è falso-positivo
  # (il placeholder ha anch'esso una stringa AIza). Usiamo invece il project_id univoco "fermentato-98f8c".
  echo "    Verifico project_id Firebase nell'AAB..."
  if ! unzip -p "$AAB_PATH" base/resources.pb 2>/dev/null | grep -aoq 'fermentato-98f8c'; then
    echo ""
    echo "❌ ERRORE: project_id Firebase reale NON trovato nell'AAB!"
    echo "   La build ha usato il placeholder google-services.json."
    echo "   Verifica android/app/google-services.json e rilancia."
    exit 1
  fi
  echo "    ✅ AAB verificato: project_id Firebase reale presente (push FCM attive)"

  cd "$APP_DIR"
  mkdir -p downloads
  cp "android/$AAB_PATH" "downloads/fermenta.aab"

  echo ""
  echo "════════════════════════════════════════════"
  echo "✅ AAB pronto per Google Play!"
  echo "   $APP_DIR/android/$AAB_PATH"
  echo ""
  echo "Per scaricarlo sul PC:"
  echo "   scp root@45.134.39.247:$APP_DIR/android/$AAB_PATH ~/fermenta.aab"
  echo ""
  echo "Poi caricalo su Google Play Console → Release → Production → Create release"
  echo ""
  echo "Se è la prima volta che usi Play App Signing, esporta anche il"
  echo "certificato upload e caricalo su Play Console:"
  echo "   keytool -export -rfc -keystore $KEYSTORE_PATH -alias $KEY_ALIAS \\"
  echo "     -storepass $STORE_PASS -file upload-cert.pem"
  echo "   scp root@45.134.39.247:$APP_DIR/upload-cert.pem ~/upload-cert.pem"
  echo "════════════════════════════════════════════"
}

case "${1:-}" in
  setup) setup ;;
  build) build ;;
  aab)   aab   ;;
  *)
    echo "Uso: bash scripts/build-apk.sh [setup|build|aab]"
    echo "  setup  — installa Java 21 (SDKMAN) + Android SDK (solo prima volta)"
    echo "  build  — compila APK debug (per sideload / test)"
    echo "  aab    — compila AAB release firmato (per Google Play Store)"
    ;;
esac
