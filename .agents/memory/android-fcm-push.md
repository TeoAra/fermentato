---
name: Android FCM native push
description: Why Android native push fails ("invalid API key") and the build-time Firebase config rules that fix it.
---

# Android FCM native push

## Send path
Android native push tokens were once saved but never sent — `deliverPush` only filtered for iOS.
Sending now uses the FCM HTTP v1 API via `google-auth-library` + the `FCM_SERVICE_ACCOUNT` secret
(project `fermentato-98f8c`). There is NO non-FCM alternative for native Android background push
(OneSignal/Airship also sit on FCM). Fallbacks if FCM is impossible: in-app WebSocket, Telegram bot, PWA.

## "Please set a valid API key" — the real root causes
The AAB must ship with a real `android/app/google-services.json` AND the `com.google.gms.google-services`
Gradle plugin applied (Capacitor's app/build.gradle applies it conditionally on the file existing) AND
Firebase auto-init NOT disabled in the manifest. If any of these is wrong, native register() throws
"Please set a valid API key".

**Why it kept "not changing":** builds were run with `./gradlew bundleRelease` directly, which BYPASSES
`scripts/build-apk.sh` (where the Firebase/version/signing logic lives). Always build via
`bash scripts/build-apk.sh aab` — never gradlew directly.

## Placeholder vs real google-services.json detection (gotcha)
`scripts/google-services-placeholder.json` ALSO has a `current_key` starting with `AIza`
(`AIzaSyPlaceholder...`), `project_id: fermentato-placeholder`, `project_number: 000000000000`.
**Why:** a naive "key starts with AIza" check misclassifies the placeholder as real, re-enables
auto-init with fake creds, and the original crash recurs.
**How to apply:** in `disable_firebase_autoinit()` require ALL of: key starts with `AIza` AND no
`placeholder`/`NotActiveFCM` marker anywhere AND `project_number` not all-zeros. Real file =
project `fermentato-98f8c`, package `to.fermenta.app`.

## Conditional apply is unreliable → force unconditional apply
**Why:** Capacitor's app/build.gradle applies the plugin only inside `try { if (servicesJSON.text) {
apply plugin ... } }` at the bottom. This block did NOT reliably run `processReleaseGoogleServices`,
so no `values.xml` with `google_api_key` was generated → FirebaseApp inits with empty key → "invalid
API key" at runtime even though the json, classpath, and applicationId were all correct.
**How to apply:** `disable_firebase_autoinit()` now appends an UNCONDITIONAL `apply plugin:
'com.google.gms.google-services'` at column 0 (idempotent; a 2nd apply of the same plugin is a no-op),
guarded by `grep -qE "^apply plugin: ['\"]com\.google\.gms\.google-services"`.

## Where the generated key actually lands (find false-negative)
The plugin output is at `app/build/generated/res/processReleaseGoogleServices/values/values.xml`
(named after the TASK, NOT "google-services"). So `find -path "*google-services*" -name values.xml`
returns NOTHING even when it works → false "plugin not processing" diagnosis. To verify the key is
baked in, grep `name="google_api_key">AIza` in the `processReleaseGoogleServices` dir AND confirm it
propagates into `mergeReleaseResources`/`packageReleaseResources` merged.dir values.xml (= in the APK).

## cap sync sovrascrive google-services.json (causa root definitiva)
`npx cap sync android` (e `cap add android`) sovrascrive/ricrea android/ con template freschi che
cancellano il `google-services.json` reale e/o aggiungono `strings.xml` con `google_api_key=""`.
**Fix definitivo in aab():** backup di `android/app/google-services.json` in `/tmp/` PRIMA di
`cap sync`, ripristino DOPO. Senza questo il build aab perde sempre le credenziali Firebase.

## strings.xml override azzera google_api_key (causa root "Please set a valid API key")
`cap sync android` (eseguito in aab()) può scrivere/sovrascrivere `app/src/main/res/values/strings.xml`
con `<string name="google_api_key"></string>` vuoto. In Android resource merging le risorse app-level
vincono su quelle generate dal plugin google-services → `getApiKey()` ritorna `""` → FirebaseInstallations
lancia "Please set a valid API key" anche se l'AAB contiene la stringa AIza altrove nel binario (falso
positivo di `grep -ao 'AIza...'`).
**Fix:** in `disable_firebase_autoinit` (ramo real) eseguire
`sed -i '/<string name="google_api_key"/d' app/src/main/res/values/strings.xml` prima del return.
**Verifica robusta AAB:** usare `unzip -p AAB base/resources.pb | grep -aoq 'fermentato-98f8c'`
(project_id univoco, non `AIza` che matcha anche il placeholder).

## Testing release without waiting for Play (confounder: stale Play version)
A failing "AAB no, debug APK yes" almost always means the device is running an OLD Play build, NOT a
release-build defect. To prove the release variant works WITHOUT Play propagation: `./gradlew
assembleRelease` with the upload keystore via `-Pandroid.injected.signing.*`, then sideload the signed
`app-release.apk` (uninstall first — debug vs upload signatures differ). Confirmed: release APK push works.
**Gotcha:** the keystore password contains `!` → run `set +H` first or bash history-expansion eats the
`-P...password=` args and you get an UNSIGNED `app-release-unsigned.apk`. Also `unzip ... | grep | head -1`
exit status is always 0 (head), so `&& echo "found"` is a false positive — use `grep -aoq` inside an `if`.

## Package mapping
Android APK = `to.fermenta.app` (matches google-services.json). iOS = `to.fermentato.app`.
`capacitor.config.ts` appId says `to.fermentato.app` (cosmetic for Android — the android project is
already scaffolded with the right applicationId; build-apk.sh force-sets it). Do NOT "fix" it or iOS breaks.

## Firebase manual init in MainActivity.kt (approccio definitivo)
Tutti i fix al plugin Gradle e a google-services.json non hanno risolto il problema nell'AAB Play.
**Soluzione definitiva:** `inject_firebase_manual_init()` in build-apk.sh legge i valori da
`google-services.json` con python3 e inietta `initFirebaseManual()` in MainActivity.kt usando
`FirebaseOptions.Builder()` con le credenziali hardcoded nel bytecode Kotlin.
- Chiamato in `aab()` dopo `inject_cast_plugin`, prima del bundleRelease.
- Guarda con `FirebaseApp.getApps(this).isEmpty()` → no-op se il plugin Gradle funziona.
- `initFirebaseManual()` è chiamato come prima istruzione in `onCreate()`, prima di `super.onCreate()`.
- Idempotente: non inietta se "initFirebaseManual" è già nel file.
- **Immune** a cap sync, strings.xml override, condizioni Capacitor, merge di risorse.

## versionCode
Formula: `MAJOR*10000 + MINOR*100 + PATCH`. After a successful Play upload, COMMIT `version.json` +
`client/src/lib/app-version.ts` or the next `git pull` reverts them → duplicate-versionCode rejection.
