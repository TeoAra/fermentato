---
name: iOS Codemagic build — App Store Connect agreement 403
description: Codemagic signing step fails with Apple 403 "required agreement missing" — an Apple account fix, not a code/CI bug.
---
The Codemagic step "Scarica certificati e profili (credenziali da integrazione UI)" runs `app-store-connect fetch-signing-files "$BUNDLE_ID"` (codemagic.yaml). If Apple's API returns `403: A required agreement is missing or has an in-effect agreement that has not been signed`, the step exits with status 1 and the whole build fails — this is NOT a code or codemagic-config problem.

**Cause:** a pending legal agreement in App Store Connect. Apple periodically updates the Apple Developer Program License Agreement / Paid Apps (Free Apps) agreement; until the **Account Holder** signs the new one, ALL App Store Connect API calls (certificate/profile fetch included) return 403.

**Fix (no repo change):** the Account Holder signs in at https://appstoreconnect.apple.com → "Contratti, imposte e operazioni bancarie" (Agreements, Tax, and Banking) → accept the pending agreement, then re-run the Codemagic build.

**Telling it apart from a real signing bug:** the 403 message literally says "agreement" and the failing URL is `.../v1/bundleIds`. A genuine credential/profile problem looks different (401/404, or "no matching provisioning profile").
