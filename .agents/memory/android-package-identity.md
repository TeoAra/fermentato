---
name: Android package identity
description: Why Android and shared Capacitor/iOS package identifiers differ and how to avoid breaking Firebase or app updates.
---

The released Android/Play Store identity is `to.fermenta.app`. The shared Capacitor configuration and iOS use `to.fermentato.app`; Android build tooling intentionally rewrites the generated native project.

**Why:** Treating the shared Capacitor ID as the Android release ID can produce an APK that cannot update the installed Play app, and a Firebase configuration for the wrong package prevents FCM registration.

**How to apply:** Keep Android CI, `google-services.json`, App Links `assetlinks.json`, signing checks, and generated Android sources aligned to `to.fermenta.app`. Do not change the release package based only on `capacitor.config.ts`.