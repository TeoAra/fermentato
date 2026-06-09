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

## Package mapping
Android APK = `to.fermenta.app` (matches google-services.json). iOS = `to.fermentato.app`.
`capacitor.config.ts` appId says `to.fermentato.app` (cosmetic for Android — the android project is
already scaffolded with the right applicationId; build-apk.sh force-sets it). Do NOT "fix" it or iOS breaks.

## versionCode
Formula: `MAJOR*10000 + MINOR*100 + PATCH`. After a successful Play upload, COMMIT `version.json` +
`client/src/lib/app-version.ts` or the next `git pull` reverts them → duplicate-versionCode rejection.
