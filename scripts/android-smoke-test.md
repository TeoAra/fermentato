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
- [ ] Da Chrome/Messaggi tap su `https://fermenta.to/pubs/<slug>` → si apre dialog
      "Apri con Fermenta.to / Chrome". Scegli Fermenta.to.
- [ ] L'app apre direttamente la pagina del pub (non la home).
- [ ] (Opzionale) `fermentato://pubs/<slug>` apre l'app dal custom scheme.
- [ ] Per autoVerify completo serve pubblicare `assetlinks.json` su
      `https://fermenta.to/.well-known/assetlinks.json` (non bloccante per smoke test).

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
