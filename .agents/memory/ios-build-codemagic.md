---
name: iOS Codemagic build — App Store Connect agreement 403
description: Codemagic signing step fails with Apple 403 "required agreement missing" — an Apple account fix, not a code/CI bug.
---
The Codemagic step "Scarica certificati e profili (credenziali da integrazione UI)" runs `app-store-connect fetch-signing-files "$BUNDLE_ID"` (codemagic.yaml). If Apple's API returns `403: A required agreement is missing or has an in-effect agreement that has not been signed`, the step exits with status 1 and the whole build fails — this is NOT a code or codemagic-config problem.

**Cause:** a pending legal agreement in App Store Connect. Apple periodically updates the Apple Developer Program License Agreement / Paid Apps (Free Apps) agreement; until the **Account Holder** signs the new one, ALL App Store Connect API calls (certificate/profile fetch included) return 403.

**Fix (no repo change):** the Account Holder signs in at https://appstoreconnect.apple.com → "Contratti, imposte e operazioni bancarie" (Agreements, Tax, and Banking) → accept the pending agreement, then re-run the Codemagic build.

**Telling it apart from a real signing bug:** the 403 message literally says "agreement" and the failing URL is `.../v1/bundleIds`. A genuine credential/profile problem looks different (401/404, or "no matching provisioning profile").

## Upload 409 — CFBundleVersion already used (the failure AFTER the agreement 403)

Once the agreement 403 is cleared, the next failure is at PUBLISH (upload to App Store Connect): `409 ENTITY_ERROR.ATTRIBUTE.INVALID.DUPLICATE — The bundle version must be higher than the previously uploaded version` (e.g. previousBundleVersion 10109).

**Cause:** the codemagic build-number step derived CFBundleVersion PURELY from the marketing version in version.json (`major*10000 + minor*100 + patch`; 1.1.9 → 10109). Re-running a build without bumping version.json reproduces the SAME number → Apple rejects it. App Store Connect requires CFBundleVersion to be STRICTLY higher than any previously uploaded build.

**Fix (applied):** add Codemagic's auto-incrementing `$BUILD_NUMBER` to the derived value (`... + BUILD_NUMBER`) in ALL build-number steps (both iOS workflows + the Android `versionCode` steps). Build number is then always unique and monotonic even when the version string is unchanged; in bash arithmetic an unset BUILD_NUMBER is 0, but in Codemagic CI it is always a positive incrementing integer so the result always exceeds the prior same-version upload.

**Durable rule:** CFBundleVersion (build number) must be unique+monotonic per upload; CFBundleShortVersionString (marketing version) MAY repeat across builds. Never tie the build number solely to the marketing version.
