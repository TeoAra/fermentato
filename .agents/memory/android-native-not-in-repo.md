---
name: Android/iOS native project not in repo
description: Capacitor native shells (android/, ios/) are NOT tracked in this repo; loaded from server URL
---

The Capacitor app uses `server.url = 'https://fermenta.to'` (capacitor.config.ts), so
JS/frontend changes reach the installed APK/IPA the moment the VPS is redeployed — no
store update needed.

BUT the native shells are NOT in this repo: `ls android/` → does not exist; no
`google-services.json` anywhere. The APK is built on the user's local machine. So any
native-layer fix (Firebase SDK, google-services.json, Gradle plugins, AndroidManifest
permissions) CANNOT be done from this repo — it requires the user to edit their local
Android project and rebuild/release a new APK.

**Why:** Android push (FCM) produced zero tokens ever. Web push (VAPID/PWA) works,
proving server-side delivery is fine. Root cause is in the native APK layer, invisible
from here and from the user without logcat.

**How to apply:** When debugging native push, don't hunt for android/ files here — they
aren't tracked. Surface diagnostics INTO the web UI (see pushDiagnostic in
client/src/services/capacitor-native.ts + diagnostic panel in notifications.tsx
Preferenze tab) so the user can read the failure point on-device without logcat.
Likely culprit: missing/invalid google-services.json or unapplied
com.google.gms.google-services Gradle plugin in the local Android project.

## Build script deliberately disabled Firebase (root cause of zero Android tokens)
`scripts/build-apk.sh` historically called `disable_firebase_autoinit()` which injected
`firebase_messaging_auto_init_enabled=false` into AndroidManifest, because the android/
project on the VPS had only a PLACEHOLDER `google-services.json` (no real FCM api_key).
Result: native register() → "Please set a valid API key" → no FCM token ever.

The function is now smart: if `app/google-services.json` has a real key (`current_key`
starts with `AIza`) it applies the `com.google.gms.google-services` Gradle plugin AND
enables auto-init; otherwise it keeps disabling auto-init to avoid a startup crash.

**Two things must both be true for Android push to work:**
1. A REAL google-services.json (Firebase project fermentato-98f8c, package to.fermentato.app) at `android/app/google-services.json` on the VPS.
2. Build via `bash scripts/build-apk.sh` (NOT `./gradlew bundleRelease` directly) — only the script applies the plugin, enables auto-init, bumps versionCode, and signs.

**Why:** running gradlew directly skips version bump (→ "versionCode already used") and the Firebase fixes.

## versionCode collisions
versionCode is computed by build-apk.sh from `version.json` as MAJOR*10000+MINOR*100+PATCH.
After each successful Play Store upload, COMMIT the bumped `version.json` (+ app-version.ts),
or `git pull` reverts it and the next build regenerates a duplicate versionCode.
