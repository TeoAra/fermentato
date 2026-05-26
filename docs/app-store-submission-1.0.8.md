# Fermenta.to — App Store submission 1.0.8

## Cosa è cambiato rispetto alla 1.0.3 (10002) respinta il 22 maggio

### Guideline 5.1.1(iv) — Permessi
- Il pre-prompt di **posizione** (`CapacitorLocationPrompt`) e quello di
  **notifiche push** (`CapacitorPushPrompt`) hanno un solo pulsante,
  etichettato **"Continua"**, che porta sempre alla richiesta di sistema.
- Rimossa qualunque X, "Non ora" o pulsante di chiusura.
- Se il sistema ha già risposto al permesso (granted/denied), il pre-prompt
  non viene più mostrato — niente doppi dialog.
- File: `client/src/components/pwa-prompt.tsx`.

### Guideline 3.1.1 / 3.1.3(e) — Pagamenti B2B
L'app è uno strumento aziendale B2B per titolari di pub e festival
(Enterprise Service, come Slack/Shopify/Untappd). Su iOS nativo non
mostriamo MAI prezzi, pulsanti "Abbonati", checkout Stripe o link a pagine
di acquisto:
- Le route `/prezzi`, `/attiva-pub`, `/festival`, `/registra-festival`,
  `/registra-pub`, `/pub-registration` su iOS vengono sostituite con
  `IosWebOnlyPage` (pagina che spiega di completare l'operazione dal
  browser su fermenta.to).
- I banner di attivazione/rinnovo in `pub-dashboard.tsx` e
  `festival-dashboard.tsx` su iOS mostrano solo testo informativo, niente
  prezzi, niente CTA di pagamento.
- Footer, header, sidebar, mobile-header, landing e onboarding nascondono
  i CTA di acquisto su iOS (`isIosNative` da `client/src/lib/platform.ts`).

## Account di test per il reviewer

Fornire l'account **customer demo** (`demoapple` / password fornita
separatamente). Il customer non ha mai accesso ai dashboard pub/festival,
quindi non vede alcun contenuto a pagamento né da consultazione né da
acquisto.

## App Review Information — testo suggerito

> The app is a B2B/enterprise service for Italian craft beer professionals
> (pub owners, festival organizers) and a discovery tool for consumers.
>
> **Permissions (5.1.1(iv))**: location and push pre-prompts have a single
> "Continua" button that always proceeds to the system dialog. There is no
> dismiss / X / "Not now" button. If the OS permission state is anything
> other than `prompt`/`prompt-with-rationale`, the educational pre-prompt
> is not shown.
>
> **Payments (3.1.3(e) Enterprise Services)**: the app does not sell any
> digital content or subscription to consumers via iOS. The customer demo
> account provided shows the end-user experience: no prices, no checkout,
> no subscription pages are reachable. The B2B pub/festival subscriptions
> (€65/year and €50–99 one-time) are tools used by business owners to
> manage their listings; activation can only be completed on the
> fermenta.to website from a desktop browser, as is standard for
> enterprise B2B services like Shopify, Slack and Untappd.

## Checklist pre-upload

- [x] `version.json` aggiornato a `1.0.8`
- [x] `client/src/lib/app-version.ts` aggiornato a `1.0.8`
- [ ] Imposta `APP_MIN_VERSION=1.0.8` sull'ambiente del VPS (forza il
      refresh dei client PWA/APK già installati)
- [ ] Esegui `bash scripts/build-ios-prep.sh` per generare il bundle iOS
- [ ] Su Mac/Xcode: archive + upload ad App Store Connect
- [ ] In App Store Connect → version 1.0.8: incolla l'App Review
      Information sopra e allega le credenziali `demoapple`
