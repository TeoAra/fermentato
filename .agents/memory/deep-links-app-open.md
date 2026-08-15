---
name: Deep links (apri app da link fermenta.to)
description: Stato Android App Links / iOS Universal Links e cosa manca per completarli
---
Il server espone `/.well-known/assetlinks.json` e `/apple-app-site-association` (in server/routes.ts, vicino al blocco OG-bot), ma rispondono 404 finché sul VPS non sono settate le env:
- `ANDROID_CERT_SHA256` — fingerprint SHA-256 del certificato di firma dell'APK (comma-separated se più d'uno; `keytool -list -printcert`).
- `APPLE_TEAM_ID` — Team ID Apple (stesso di APNS_TEAM_ID su Codemagic).
Bundle id: `to.fermentato.app`.

**Perché:** l'utente vuole che i link fermenta.to aprano l'app se installata.
**Cosa manca lato nativo (rebuild richiesto):** Android: intent-filter `autoVerify` per https://fermenta.to nel AndroidManifest (android/ non è nel repo → rebuild locale via build-apk.sh). iOS: entitlement Associated Domains `applinks:fermenta.to` (build Codemagic).
Il client gestisce già `appUrlOpen` (capacitor-native.ts) → una volta verificati i domini funziona senza altre modifiche JS.

Correlato: i link evento condivisi ora sono canonici `/eventi/:type/:id`; i vecchi `?event=N` su pub/brewery redirectano client-side; l'OG bot route per eventi usa `escHtml` (ogHtml ora escapa tutto + JSON-LD `\u003c`).
