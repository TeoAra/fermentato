# Build iOS di Fermenta.to da un VPS Linux

> Apple richiede **macOS + Xcode** per firmare e archiviare un'app iOS. Non si
> può eludere questo vincolo legale/tecnico. Quello che possiamo fare dal VPS
> Linux è preparare **tutto** il sorgente, gli asset e i bundle, e usare un
> Mac (fisico, in cloud, o GitHub Actions) **solo** per i 5 minuti finali di
> archive + firma.

## Cosa fa il VPS Linux ✅

Lo script `scripts/build-ios-prep.sh` esegue automaticamente tutto questo:

1. `npm run build` — bundle web Vite (output in `dist/public`).
2. `npx cap add ios` (solo la prima volta) e `npx cap sync ios` — genera la
   cartella `ios/` Xcode-ready, copia il bundle web e sincronizza i plugin
   nativi (camera, geolocation, push, splash, status bar).
3. `npx @capacitor/assets generate --ios` — produce icone e splash per tutte
   le risoluzioni iOS partendo da un singolo PNG 1024×1024 in
   `capacitor-resources/icon-source.png`.
4. Sostituisce `ios/App/App/Info.plist` con il template
   `ios-template/App/App/Info.plist`, che contiene **tutti i permessi
   tradotti in italiano** (camera, foto, geolocalizzazione, push) come
   richiesto da App Store Review.
5. Crea un tarball `ios-source-YYYYMMDD-HHMMSS.tgz` pronto da spedire al Mac.

```bash
bash scripts/build-ios-prep.sh
```

## Cosa NON può fare il VPS ❌

Le seguenti operazioni richiedono **macOS** con Xcode 15+ installato:

- `pod install` (CocoaPods funziona anche su Linux ma usa SDK iOS che non
  esistono su Linux)
- `xcodebuild archive` — compila il binario `.xcarchive`
- Firma del codice con un certificato Apple Distribution
- `xcodebuild -exportArchive` → produce il `.ipa`
- Upload ad App Store Connect / TestFlight (`altool` o `xcrun notarytool`)

## Le tre opzioni operative

### Opzione A — Mac fisico (la più economica se ne hai uno)

Costo: 0 € se hai già un Mac (anche Intel del 2018+ va bene per Xcode 15).
Tempo per build: ~3-5 minuti.

```bash
# Sul VPS
bash scripts/build-ios-prep.sh

# Sul tuo Mac
scp root@<vps>:/www/nodeapps/fermenta/ios-source-*.tgz ~/Downloads/
cd ~/Downloads && tar xzf ios-source-*.tgz
cd ios/App
pod install
open App.xcworkspace
# In Xcode: Product → Archive → Distribute App → App Store Connect
```

Prima volta richiede:

- Apple ID + iscrizione **Apple Developer Program** (99 $/anno).
- Creare in [developer.apple.com](https://developer.apple.com):
  - Un certificato **iOS Distribution**.
  - Un **App ID** `to.fermenta.app` con capability "Push Notifications".
  - Un **Provisioning Profile** App Store legato ai due sopra.
- In Xcode → Settings → Accounts → aggiungi l'Apple ID e scarica i profili.

### Opzione B — Mac in cloud (se non hai un Mac)

Servizi disponibili (prezzi indicativi 2025):

| Provider | Prezzo | Note |
|---|---|---|
| [MacStadium](https://www.macstadium.com/) | da ~80 €/mese | M1/M2 dedicati |
| [MacinCloud](https://www.macincloud.com/) | da ~30 €/mese | shared, 2-3 ore al giorno |
| [Scaleway Apple Silicon](https://www.scaleway.com/en/apple-silicon/) | ~0,11 €/h | M1, fatturazione oraria |
| [AWS EC2 Mac (mac1/mac2)](https://aws.amazon.com/ec2/instance-types/mac/) | ~24 h minimi, ~25 €/giorno | overkill per noi |

Procedura: identica all'Opzione A — connetti via SSH/VNC, scarica il
tarball, esegui `pod install` + `xcodebuild archive`.

**Consiglio**: Scaleway con fatturazione oraria è perfetto per build
sporadiche. ~3 € a build (1 ora pagata anche se la build dura 5 min).

> **Nota sulla cartella `ios/`**: non è committata nel repo. Viene generata
> on-demand sia dallo script VPS sia dalla pipeline GitHub Actions, in modo
> che ogni build parta da uno stato pulito e i file Xcode binari non
> sporchino la cronologia git. Tutta la configurazione personalizzata
> (bundle id, permessi, icone) è preservata da `capacitor.config.ts`,
> `ios-template/App/App/Info.plist` e `capacitor-resources/`.

### Opzione C — GitHub Actions (la più automatica)

GitHub fornisce runner `macos-latest` (M1) **gratuiti** sui repo pubblici e
2.000 minuti/mese gratuiti sui privati (10x consumption rate per macOS = 200
min/mese di macOS gratuiti).

Il file `.github/workflows/ios-build.yml.example` è già pronto. Per
attivarlo:

1. Rinomina in `.github/workflows/ios-build.yml`.
2. Aggiungi i seguenti **GitHub Secrets** (Settings → Secrets → Actions):

| Secret | Cosa è | Come ottenerlo |
|---|---|---|
| `APPLE_CERT_P12` | Certificato Distribution in base64 | Keychain Access → esporta il certificato in `.p12`, poi `base64 -i cert.p12 \| pbcopy` |
| `APPLE_CERT_PASSWORD` | Password del `.p12` | La scegli durante l'export |
| `APPLE_PROVISIONING_PROFILE` | Profilo App Store in base64 | Scarica `.mobileprovision` da developer.apple.com, `base64 -i profile.mobileprovision \| pbcopy` |
| `APP_STORE_CONNECT_API_KEY` | Chiave API `.p8` in base64 | App Store Connect → Users → Keys → genera, ruolo "App Manager" |
| `APP_STORE_CONNECT_KEY_ID` | Key ID (10 caratteri) | Visibile accanto alla chiave appena creata |
| `APP_STORE_CONNECT_ISSUER_ID` | Issuer UUID dell'account | In testa alla pagina Keys |
| `APPLE_TEAM_ID` | Team ID Apple Developer (10 caratteri) | [developer.apple.com/account](https://developer.apple.com/account) → Membership Details → Team ID |
| `KEYCHAIN_PASSWORD` | Password random per keychain CI | Genera con `openssl rand -hex 16` |

3. Esegui il workflow manualmente da Actions → "iOS Build" → Run workflow,
   oppure crea un tag `ios-v1.0.0` per build + upload TestFlight automatico.

L'artifact `fermenta-ios-ipa` conterrà il `.ipa` scaricabile.

## Prerequisiti Apple (validi per tutte e tre le opzioni)

Senza questi nessuno può pubblicare un'app iOS, neanche con il Mac più
potente del mondo:

1. **Apple ID** personale (gratis).
2. **Apple Developer Program** — 99 €/anno, registrazione su
   [developer.apple.com/programs](https://developer.apple.com/programs/).
   Verifica documenti d'identità: 1-3 giorni lavorativi.
3. **Bundle ID registrato** (`to.fermenta.app`) con capability "Push
   Notifications" e "Sign in with Apple" se serve.
4. **Certificato di distribuzione iOS** — generato in
   Certificates, IDs & Profiles.
5. **Provisioning Profile App Store** — uno per build di distribuzione.
6. **App in App Store Connect** — crea l'app con lo stesso bundle ID,
   compila metadata (descrizione, screenshot, privacy URL).

## Aggiornamenti UI senza ribuild

Come per Android, `capacitor.config.ts` ha `server.url = 'https://fermenta.to'`,
quindi **ogni modifica alla UI è live** senza dover rifare l'IPA. Si rifà
l'IPA solo quando:

- cambiano i plugin nativi (camera, push, geolocation, ...);
- cambia un permesso in `Info.plist`;
- cambia l'icona o lo splash;
- esce una nuova major version di iOS / Capacitor.

## Cose che ho già preparato nel repo

- `ios-template/App/App/Info.plist` — bundle ID, permessi italiani, push.
- `scripts/build-ios-prep.sh` — preparazione sorgente lato Linux.
- `.github/workflows/ios-build.yml.example` — pipeline GHA pronta all'uso.
- `capacitor.config.ts` — già configurato con `appId: to.fermenta.app` e
  splash/status bar in stile Fermenta cream.
- `capacitor-resources/icon-source.png` — verrà generato la prima volta che
  lanci `build-ios-prep.sh` partendo da `attached_assets/icona_fermentato_*`.
  Per qualità ottimale, sostituiscilo con un PNG quadrato 1024×1024 dedicato.

## Out of scope

- Iscrizione effettiva all'Apple Developer Program (richiede carta di
  credito + documenti, è un'azione umana).
- Pubblicazione vera su App Store (richiede screenshot, descrizione,
  privacy policy URL, review Apple di 24-48 h).
- Wrapper Android (vedi `scripts/build-apk.sh` e task separato).
