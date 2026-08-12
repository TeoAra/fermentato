# Fermenta.to - Italian Beer Discovery Platform

## Authentication

**Provider: Clerk** (migrated from custom Passport email/password + Google OAuth — 2026-08).

- Web: `ClerkProvider` in `client/src/App.tsx` wraps the entire app; `useAuth` shim in `client/src/hooks/useAuth.ts` returns `{ user, isLoading, isAuthenticated }` using Clerk + `/api/auth/user`.
- Sign-in: `/sign-in` → `client/src/pages/sign-in.tsx` (Clerk `<SignIn>` component). Legacy `/login` and `/auth` redirect here.
- Sign-up: `/sign-up` → `client/src/pages/sign-up.tsx` (Clerk `<SignUp>` component).
- Server middleware: `@clerk/express`'s `clerkMiddleware()` + `getAuth(req)` in `server/auth.ts`. `isAuthenticated`, `isAdmin`, `isAdminOrBreweryOwner`, `isPubOwner` all use Clerk session with passport session fallback (for Capacitor native app during mobile migration).
- Clerk proxy: `server/middlewares/clerkProxyMiddleware.ts` proxies `/api/__clerk` to Clerk FAPI (production only).
- Bridge column: `users.id` (nanoid). Migrated users have their original ID stored as Clerk's `externalId`; `sessionClaims.userId` returns it.
- Auth config (login providers, branding, email templates): use the **Auth pane** in the Replit workspace toolbar — NOT an external Clerk dashboard.
- Native mobile (Capacitor): still using passport sessions via `server/native-auth.ts` — pending mobile app update to use Clerk mobile SDK.

## Overview

Fermenta.to is a full-stack web application designed to connect craft beer enthusiasts with Italian pubs and breweries. The platform facilitates beer discovery, pub and brewery management, and community interaction, aiming to be the go-to resource for Italy's craft beer scene. Key capabilities include comprehensive search, event management, user reviews, social features, and administrative tools for businesses. The project envisions a thriving community built around Italian craft beer, offering market potential by bridging consumers and businesses through an engaging and user-friendly platform.

## User Preferences

Preferred communication style: Simple, everyday language.

### iOS App Store — pattern B2B senza IAP (3.1.3(e))
Per la conformità con le linee guida App Store 3.1.1 / 3.1.3(e) (Enterprise Services, come Shopify/Untappd/Slack), su iOS nativo NON mostriamo mai prezzi, pulsanti "Abbonati", checkout Stripe o link a pagine di acquisto per servizi B2B (abbonamento pub €65/anno, attivazione festival €50-99). I titolari devono completare il pagamento dal browser su fermenta.to.

Helper centralizzato: `client/src/lib/platform.ts` esporta `isIosNative`, `isAndroidNative`, `isNativeApp`. Usare `{!isIosNative && (...)}` per nascondere UI di acquisto.

Pagina placeholder: `client/src/pages/ios-web-only.tsx` mostrata al posto di `/prezzi`, `/attiva-pub`, `/festival` (creazione), `/registra-festival` quando si è su iOS (route swap in `client/src/App.tsx`).

Punti già adattati (cercare `isIosNative`): `footer.tsx` (link Prezzi nascosto), `landing.tsx` (card "Piano Pub Pro €65" + banner "Festival Mode €50" entrambi nascosti), `pub-dashboard.tsx` (3 banner abbonamento — pulsanti "Abbonati — €65/anno" rimpiazzati da testo informativo su iOS), `smart-pub-dashboard.tsx` (banner trial/active/hibernated: testo "€65/anno IVA inclusa" rimpiazzato da "Account business attivo" / "Scade il …" su iOS; pulsanti "Riattiva" nascosti), `festival-dashboard.tsx` (banner pagamento + rinnovo nascosti), `onboarding.tsx` (testo Stripe nascosto). Pagine `/prezzi`, `/attiva-pub`, `/festival`, `/registra-festival`, `/registra-pub`, `/pub-registration` swappate via route in `App.tsx` con `IosWebOnlyPage`. Su Android resta tutto visibile (Google Play permette pagamenti B2B esterni).

**Regola d'oro per nuovi sviluppi**: prima di ogni release iOS, eseguire `rg -niP "abbonament|stripe|attiva.?pub|registra.?festival|prezzi|€\s*\d|paga|riattiva|rinnov|checkout" client/src` e verificare che ogni risultato sia o (a) gated con `!isIosNative`, o (b) testo neutro senza prezzo/CTA, o (c) in una pagina swappata via route. Apple ha rifiutato per leak di prezzo anche minimi (es. "€65/anno IVA inclusa" in un banner di stato abbonamento) — la review è automatizzata + manuale, qualsiasi occorrenza di "€" + numero + frase tipo "anno/mese/abbon" può triggerare 3.1.1.

### App Review (Apple 5.1.1(iv) + Google Play User Data) — Pre-prompt permessi
Tutti i pre-prompt di sistema (`CapacitorLocationPrompt`, `CapacitorPushPrompt` in `client/src/components/pwa-prompt.tsx`) devono essere conformi:
- UN SOLO pulsante con testo "Continua" (mai "Attiva"/"Abilita"/"Activate").
- NESSUN pulsante di chiusura/dismiss/X né "Non ora" — l'utente deve sempre proseguire alla richiesta di sistema.
- Se `<Plugin>.checkPermissions()` ritorna stato diverso da `prompt`/`prompt-with-rationale`, il pre-prompt NON deve apparire (evita doppi dialog).
Stessa regola va applicata a qualsiasi futuro pre-prompt (camera, foto, contatti).

### Force in-app update
Per forzare l'aggiornamento in-app dopo un deploy importante:
1. Imposta `APP_MIN_VERSION=<nuova_versione>` nell'ambiente del server (VPS).
2. Aggiorna `client/src/lib/app-version.ts` nel prossimo build per riflettere la stessa versione.

Questo trigger forza i client (PWA e APK) a ricaricare/aggiornare quando la versione installata è inferiore a `APP_MIN_VERSION`.

### Ricerca immagini birra/logo — pacchetto gratis (SearXNG + Open Food Facts + Untappd)
Il bottone "Cerca sul web" nella scheda birra/birrificio NON usa più AI né API a pagamento (niente Gemini/Google/SerpAPI). Stack 100% gratuito:
- `server/beer-image-finder.ts` (`findBestBeerImage`): priorità Untappd → sito birrificio (og:image) → Open Food Facts (match nome birra **+** birrificio) → SearXNG → DuckDuckGo (fallback). Le prime tre sono "trusted" (alta confidenza); SearXNG/DDG sono a bassa confidenza e vengono usate solo su ricerca forzata.
- `server/brewery-image-finder.ts` (`findBestBreweryLogo`): Untappd → sito birrificio → SearXNG.
- Client condiviso `server/searxng.ts` (`searxngSearchImages`): legge l'env `SEARXNG_URL`. Se non impostata ritorna `[]` e l'app usa solo le altre fonti (nessun errore, degrada in modo pulito).
- **Open Food Facts**: usare l'endpoint affidabile `https://search.openfoodfacts.org/search?q=...` (il vecchio `world.openfoodfacts.org/cgi/search.pl` restituisce 503 dai datacenter). Il match richiede nome birra **e** nome birrificio per evitare falsi positivi (es. "Nazionale" che matchava un prodotto Bennet). `brands` nella risposta è un array.

**SearXNG self-hosted sul VPS** (opzionale, migliora la qualità):
1. Installare con Docker: `docker run -d --name searxng --restart always -p 8888:8080 -v /root/searxng:/etc/searxng searxng/searxng`.
2. Abilitare l'output JSON in `/root/searxng/settings.yml`: sotto `search:` mettere `formats: [html, json]`, poi `docker restart searxng`.
3. Impostare nell'ambiente del server `SEARXNG_URL=http://127.0.0.1:8888` (o l'URL pubblico dell'istanza).
Senza `SEARXNG_URL` tutto continua a funzionare (Untappd + Open Food Facts + DuckDuckGo).

### Nginx VPS — non riscrivere mai Cache-Control degli assets
File: `/www/server/panel/vhost/nginx/proxy/fermenta.to/d6f6cb5cbb19f6acb9f6745957a7b2f2_fermenta.to.conf` (aaPanel/BT Panel).
NON usare `expires Xm` né `add_header Cache-Control` né `add_header X-Cache` nel proxy verso `127.0.0.1:5000`. Express invia già gli header corretti (`immutable` per `/assets/*`, `no-store` per `/index.html` e API). Se Nginx li sovrascrive, Cloudflare può cachare HTML al posto di JS per ore causando "Expected JavaScript but got text/html" → "Failed to fetch dynamically imported module".
Backup config corretto: `/root/proxy-fermenta-backup.conf` sul VPS.

## System Architecture

### Frontend
- **Framework**: React with TypeScript (Vite).
- **Routing**: Wouter for authenticated and unauthenticated routes.
- **State Management**: TanStack Query (React Query).
- **UI Framework**: shadcn/ui components built on Radix UI.
- **Styling**: Tailwind CSS with custom CSS variables, supporting light/dark modes.
- **Design System**: 8pt grid, premium dark theme, with specific color palettes for light and dark modes.
- **Performance**: Code-splitting via `React.lazy` + `Suspense`, lazy loading images.
- **Mobile UX**: Responsive design with sticky bottom navigation and compacting mobile header.

### Backend
- **Runtime**: Node.js with Express.js.
- **Language**: TypeScript with ESM modules.
- **Database**: PostgreSQL with Drizzle ORM.
- **Authentication**: Replit Auth with OpenID Connect and Passport.js, role-based access.
- **Session Management**: Express sessions stored in PostgreSQL.

### Database
- **ORM**: Drizzle ORM with schema-first approach.
- **Database**: PostgreSQL (configured for Neon serverless).
- **Migrations**: Drizzle Kit with SQL migration files.
- **Connection**: Connection pooling with `@neondatabase/serverless`.

### Key Features
- **Comprehensive Authentication & Authorization**: Replit Auth integration with role-based access (customer, pub_owner, admin).
- **Dynamic Content Management**: Admin dashboards for managing users, pubs, breweries, beers, and static pages with rich text editing.
- **Advanced Search & Discovery**: Multi-resource search, "Surprise Me" random beer selection, and location-based recommendations.
- **Community & Social Features**: Untappd-style beer reviews, user profiles, check-ins with photo uploads, microblogging, and activity feeds.
- **Event Management**: Public event hub, pub/brewery owner event creation, and push notifications for event starts.
- **Festival Mode**: Dedicated digital taplist system for beer festivals with Stripe integration for payment, user ratings, and owner replies.
- **Image & Data Enrichment**: Automated scripts for finding brewery websites and crawling images, CLIP visual fingerprinting for image search, and barcode scanning with Open Food Facts integration.
- **AI-Powered Scan & Recognition**: Camera-based beer label/barcode scanner leveraging BarcodeDetector API, Gemini 2.0 Flash, PaddleOCR, Tesseract, and OCR.space for text recognition, combined with CLIP for visual similarity and pgvector for semantic search.
- **Admin Tools**: Duplicate brewery finder with fuzzy matching, mass content editing, and real-time activity monitoring.
- **Push Notifications**: Throttled and batched push notifications for various events (suggestions, event starts, broadcasts).
- **Internationalization**: Support for multiple countries in data processing and content.
- **Bot Manager (Telegram + WhatsApp)**: Titolari collegano il bot dal dashboard (token monouso 15 min). Comandi in italiano parsati da Gemini: cambia/nascondi/mostra/rimuovi/aggiungi birra, aggiorna prezzi, lista menu. Schema: `bot_connections`, `bot_link_tokens`. Route: `server/bot-routes.ts`. Handler: `server/telegram-bot.ts`, `server/whatsapp-bot.ts`. Env: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`.
- **Pulizia dati ricerca (soft-archive birrifici/birre)**: archiviazione reversibile (mai delete) di birrifici chiusi e birre fuori produzione, escluse da ricerca, liste, suggerimenti **e contatori/statistiche**. Nessun LLM/GPU.
  - Schema: `breweries.isClosed` / `closedSource` / `closedAt`, `beers.isDiscontinued` / `discontinuedSource`. Default attivo (additivo, non distruttivo).
  - Helper SQL riutilizzabile: `server/visibility.ts` (`breweryActiveSql`, `beerVisibleSql` + varianti raw `rawBreweryActive`, `rawBeerVisibleJoined`, `rawBeerVisibleExists`). Usati in `server/storage.ts` (getBreweries, search*, getBeers, trending, ecc.) e in `server/routes.ts` (popular-styles, by-style, suggestions, beers/search, random, popular-nearby, breweries/nearby, /api/stats, /api/stats/global, /api/search).
  - Cascata: archiviare un birrificio marca le sue birre `isDiscontinued` con `discontinuedSource='cascade'` (l'import RateBeer usa `discontinuedSource='ratebeer_import'`); il ripristino del birrificio riattiva le birre auto-archiviate insieme ad esso (`discontinuedSource IN ('cascade','ratebeer_import')`), senza toccare quelle archiviate manualmente (`source='admin'`).
  - Endpoint admin: `PATCH /api/admin/breweries/:id/archive`, `PATCH /api/admin/beers/:id/archive` (body `{archived}`), `GET /api/admin/breweries/suspicious` (rileva candidati sospetti da segnali DB — solo proposta, mai auto-archiviazione). UI: badge "Archiviato" + bottone archivia/ripristina in `client/src/components/AdminContentManager.tsx`. Il delete definitivo resta separato (`Trash2`, conferma, un record alla volta).
  - Import RateBeer retired: `scripts/import-retired-breweries.ts` (match per nome normalizzato + Country Code, dry-run default, `--apply` usa update bulk `id = ANY($1)`). Guard anti-falsi-positivi: se il country del CSV è noto serve un match positivo del country in DB; se il country DB manca **oppure** ci sono più candidati esatti con lo stesso nome, il match diventa *ambiguo* (review manuale, mai auto-archiviato — solo un singolo candidato confident viene archiviato). NB: l'apply per-riga va in timeout su decine di migliaia di record — usare sempre la modalità bulk; verificare l'esito via `psql` (il tool può mostrare exit -1 anche se la query è andata a buon fine).
  - Cache: `clearCatalogCaches()` (search + TTL in-memory) registrato in `server/catalog-cache.ts` come registry condiviso (`registerCatalogCacheBuster`/`bustCatalogCaches`) per invalidare da `routes-admin.ts` senza import cycle; chiamato su archive/restore, edit (PATCH) e delete admin di birrifici/birre. Pre-warming: `/api/search` logga i termini; un job ogni 5 min ri-scalda in cache le ricerche più popolari (`performGlobalSearch` condivisa fra endpoint e warmer per evitare drift del payload).
  - **Deploy su VPS (manuale, non automatico)**: il DB di prod è self-hosted. Ordine: 1) backup DB prod; 2) applicare le colonne di stato (additive, default attivo) — `db:push` ha drift interattivo, preferire `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` idempotente via psql; 3) riavviare l'app col nuovo codice; 4) eseguire una volta `scripts/import-retired-breweries.ts --apply` contro il DB di prod. Le colonne sono additive → non distruttive.

## External Dependencies

- **Database**: Neon PostgreSQL (serverless).
- **Authentication**: Replit Auth services.
- **Image CDN**: Cloudinary.
- **WebSocket**: For real-time functionality.
- **Component Library**: Radix UI primitives.
- **Icons**: Lucide React.
- **Styling**: Tailwind CSS.
- **Forms**: React Hook Form with Zod validation.
- **Date Handling**: date-fns.
- **Mapping**: OpenStreetMap via `react-leaflet`.
- **PDF Generation**: jsPDF.
- **QR Code Generation**: qrcode.react.
- **CAPTCHA**: Google reCAPTCHA.
- **RSS Parsing**: `rss-parser`.
- **OCR**: Google Gemini 2.0 Flash, PaddleOCR, Tesseract, OCR.space.
- **Image Embedding**: CLIP ViT-B/32.
- **Payment Processing**: Stripe.