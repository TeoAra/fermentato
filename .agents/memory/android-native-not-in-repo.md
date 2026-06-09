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
