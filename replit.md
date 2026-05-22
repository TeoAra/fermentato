# Fermenta.to - Italian Beer Discovery Platform

## Overview

Fermenta.to is a full-stack web application designed to connect craft beer enthusiasts with Italian pubs and breweries. The platform facilitates beer discovery, pub and brewery management, and community interaction, aiming to be the go-to resource for Italy's craft beer scene. Key capabilities include comprehensive search, event management, user reviews, social features, and administrative tools for businesses. The project envisions a thriving community built around Italian craft beer, offering market potential by bridging consumers and businesses through an engaging and user-friendly platform.

## User Preferences

Preferred communication style: Simple, everyday language.

### iOS App Store — pattern B2B senza IAP (3.1.3(e))
Per la conformità con le linee guida App Store 3.1.1 / 3.1.3(e) (Enterprise Services, come Shopify/Untappd/Slack), su iOS nativo NON mostriamo mai prezzi, pulsanti "Abbonati", checkout Stripe o link a pagine di acquisto per servizi B2B (abbonamento pub €65/anno, attivazione festival €50-99). I titolari devono completare il pagamento dal browser su fermenta.to.

Helper centralizzato: `client/src/lib/platform.ts` esporta `isIosNative`, `isAndroidNative`, `isNativeApp`. Usare `{!isIosNative && (...)}` per nascondere UI di acquisto.

Pagina placeholder: `client/src/pages/ios-web-only.tsx` mostrata al posto di `/prezzi`, `/attiva-pub`, `/festival` (creazione), `/registra-festival` quando si è su iOS (route swap in `client/src/App.tsx`).

Punti già adattati (cercare `isIosNative`): `footer.tsx`, `landing.tsx`, `pub-dashboard.tsx` (3 banner abbonamento), `smart-pub-dashboard.tsx` (2 link riattiva), `festival-dashboard.tsx` (banner pagamento + rinnovo). Su Android resta tutto visibile (Google Play permette pagamenti B2B esterni).

### Force in-app update
Per forzare l'aggiornamento in-app dopo un deploy importante:
1. Imposta `APP_MIN_VERSION=<nuova_versione>` nell'ambiente del server (VPS).
2. Aggiorna `client/src/lib/app-version.ts` nel prossimo build per riflettere la stessa versione.

Questo trigger forza i client (PWA e APK) a ricaricare/aggiornare quando la versione installata è inferiore a `APP_MIN_VERSION`.

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