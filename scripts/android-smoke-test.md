# Fermenta.to — Checklist smoke test APK Android

Prerequisiti: APK installato (`fermenta.apk`) su un device Android 10+ reale o emulatore.
Esegui questi controlli dopo ogni build prima di promuovere la versione minima richiesta sul server.

## 1. Avvio
- [ ] Splash screen mostrato per ~1–2s, poi nasconde da solo (mai > 3.5s).
- [ ] Status bar in alto color crema `#FFF7ED` con icone scure leggibili.
- [ ] Navigation bar (3 pulsanti / gesture) color crema, no banda nera.
- [ ] Nessun "notch" del WebView sopra i contenuti (header app non sovrapposto al system UI).

## 2. Aggiornamento bloccante
- [ ] Imposta sul server `APP_MIN_VERSION` a una versione **superiore** a quella installata
      e riavvia l'app.
- [ ] Compare lo schermo "Aggiornamento richiesto" su sfondo nero traslucido.
- [ ] Non è possibile chiudere il dialog né interagire con l'app sotto.
- [ ] Tap "Scarica aggiornamento" → si apre il browser su `https://fermenta.to/app/download`.

## 3. Permesso posizione
- [ ] Dopo ~3s dal login compare il prompt "Attiva la posizione".
- [ ] Tap "Attiva" → compare il dialog di sistema Android per la posizione.
- [ ] Concesso il permesso, la home mostra pub/birrerie ordinati per distanza.
- [ ] Negato/Dismiss → l'app continua a funzionare senza geolocalizzazione.

## 4. Permesso notifiche
- [ ] Dopo ~6s dal login compare il prompt "Attiva le notifiche".
- [ ] Tap "Attiva" → compare il dialog Android (solo Android 13+).
- [ ] Concesso → nessun crash. Negato → nessun crash.
- [ ] Nota: senza `google-services.json` la registrazione FCM è **disabilitata** (vedi sotto).

## 5. Pull-to-refresh
- [ ] Home: scroll in cima, tira giù 2cm, rilascia → spinner e ricarica dati.
- [ ] Carousel orizzontali (es. "Birre popolari"): swipe left/right → **NON** triggera refresh.
- [ ] Mappa: pan orizzontale → **NON** triggera refresh.
- [ ] Activity feed: pull-to-refresh funziona uguale alla home.

## 6. Deep link
- [ ] Verifica dal browser che `https://fermenta.to/.well-known/assetlinks.json`
      risponda `200`, con `package_name: to.fermenta.app` e il fingerprint
      SHA-256 del certificato **Play App Signing** (non solo quello upload).
- [ ] Dopo l'installazione Play firmata, `adb shell pm get-app-links
      to.fermenta.app` mostra il dominio `fermenta.to` verificato.
- [ ] Da Chrome/Messaggi tap su ciascun link HTTPS e verifica che l'app apra la
      pagina giusta (non la home):
      - `https://fermenta.to/pub/<slug>` → pub
      - `https://fermenta.to/beer/<id>` → birra
      - `https://fermenta.to/brewery/<id>` → birrificio
      - `https://fermenta.to/notifications` → notifiche
- [ ] Ripeti i quattro casi con una nuova APK/AAB installata (APK debug per il
      controllo della route; AAB firmato dal track interno Play per il controllo
      `assetlinks`).
- [ ] (Fallback) `adb shell am start -W -a android.intent.action.VIEW -d
      "fermentato://pubs/<slug>"` apre il pub direttamente nell'app.
- [ ] Se l'app è già aperta e arriva un secondo link, la route cambia senza
      riaprire la home; lo stesso vale per un tap su una notifica push con
      `data.path` o `data.url`.

## 7. Tastiera e form
- [ ] Apri ricerca: la tastiera non copre l'input attivo.
- [ ] Login con Replit Auth: la WebView gestisce correttamente il redirect OAuth.

## 8. Stabilità
- [ ] Mettere l'app in background per 30s e riportarla in primo piano: nessun crash, sessione attiva.
- [ ] Connessione persa → l'app mostra l'errore di rete invece di splash bianco infinito.

---

### Note FCM / Push native
Le push native Android richiedono `google-services.json` (Firebase). Attualmente:
- Il plugin `@capacitor/push-notifications` è installato.
- Chiamiamo solo `requestPermissions()`, **mai** `register()` → niente crash.
- Per abilitare FCM end-to-end servono:
  1. Progetto Firebase + `google-services.json` in `android/app/`.
  2. Plugin Gradle `com.google.gms.google-services` in `android/build.gradle` e `app/build.gradle`.
  3. Endpoint `/api/fcm/subscribe` lato server per persistere il token.
  4. Chiamata `PushNotifications.register()` in `CapacitorPushPrompt`.

Finché FCM non è configurato, le push si ricevono solo in modalità PWA (Web Push via VAPID).
