# Fermenta.to - Italian Beer Discovery Platform

## Overview

Fermenta.to is a full-stack web application for discovering Italian craft beers, pubs, and breweries. It connects customers seeking beer and pub information with pub owners managing their establishments. The platform aims to provide a comprehensive and user-friendly experience for exploring Italy's craft beer scene, facilitating connections between consumers and businesses.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript (Vite).
- **Routing**: Wouter, supporting authenticated and unauthenticated routes.
- **State Management**: TanStack Query (React Query) for server state.
- **UI Framework**: shadcn/ui components built on Radix UI primitives.
- **Styling**: Tailwind CSS with custom CSS variables, supporting light/dark modes.

### Backend Architecture
- **Runtime**: Node.js with Express.js.
- **Language**: TypeScript with ESM modules.
- **Database**: PostgreSQL with Drizzle ORM.
- **Authentication**: Replit Auth with OpenID Connect and Passport.js.
- **Session Management**: Express sessions stored in PostgreSQL (connect-pg-simple).

### Database Architecture
- **ORM**: Drizzle ORM with schema-first approach.
- **Database**: PostgreSQL (configured for Neon serverless).
- **Migrations**: Drizzle Kit with SQL migration files, applied incrementally.
- **Connection**: Connection pooling with @neondatabase/serverless.

### Key Components

- **Authentication System**: Replit Auth, PostgreSQL-backed sessions, role-based access (customer, pub_owner, admin).
- **Data Models**: Users, Pubs, Breweries, Beers, Tap Lists, Menu System, Favorites, Pub Sizes, Image Assets.
- **Component Architecture**: Reusable UI components, page-specific components, shadcn/ui integration, responsive layout.
- **API Design**: RESTful endpoints for authentication, CRUD operations, and multi-resource search.

### Core Features

- **Onboarding**: Multi-step wizard for new users (customer/pub_owner/brewery_owner).
- **Events System**: CRUD operations for pub and brewery owners, public display, and push notifications.
- **Beer Reviews**: Untappd-style rating system with user profiles and badge progression.
- **User Profiles**: Public profiles displaying badge, review history, and favorite styles, with privacy controls.
- **Brewery Rating**: Aggregate rating card for breweries based on beer reviews.
- **Admin Dashboard**: Enhanced with live statistics, recent activity, and user management.
- **QR Codes**: Per-pub QR code generation.
- **PDF Menu Download**: Generate downloadable PDF menus.
- **TV Taplist Mode**: Full-screen, auto-refreshing taplist display.
- **Push Notifications**: Optimized with throttling, batching, and TTL settings.
- **Cookie Consent**: Configurable cookie banner with granular preferences.
- **reCAPTCHA**: Integrated reCAPTCHA v2 for authentication forms.
- **Theme System**: Light/dark mode toggle with localStorage persistence.
- **Design System v4 (8pt grid, premium dark)**: Complete design token upgrade. `index.css`: background `#F8F8F8` (neutral), card `#FFFFFF`, primary `#FF7A00`, text `#111111`, muted `#666666`. Dark mode: bg `#0F0F10`, card `#1A1A1C`, text `#FFFFFF`, muted `#A0A0A0` (Spotify/Apple Music style). Shadow tokens `--shadow-card`, `--shadow-card-hover`, `--shadow-card-sm`. Motion utility `.tap-scale` (120ms scale 0.97 on active, spring easing). CTA orange glow `.btn-orange-glow` in dark mode. Glass card `.glass-card-dark`. **Home page v4 redesign**: Hero map card (rounded-3xl, 210px, interactive map on web / dark gradient on native, location chip, title, CTA buttons, filter chips row). User stats row (3 cards: bevute via `/api/user/stats`, salvate via favorites, XP). "Ora vicino a te" horizontal scroll (taplist). "Birrificio del giorno" full-width hero card. "In spina vicino a te" pub list with tap beer. "Trend del momento" + "Il tuo profilo" 2-col grid. "Attività dalla community" feed. Guest CTA orange gradient. Bottom nav dark bg updated to `#0F0F10/96`.
- **Performance Optimization**: Eliminated N+1 queries for pub menus and optimized admin search. Frontend code-splitting via `React.lazy` + `Suspense` for heavy components: `HomepageMap` (landing), `PubMap` (explore-pubs/breweries/beers), `LuppolinoMenu` (pub-detail). All `<img>` tags use `loading="lazy" decoding="async"` for off-screen image deferral.
- **Map Clustering**: Homepage map (`client/src/components/homepage-map.tsx`) uses `supercluster` (radius=60, maxZoom=16, minPoints=3) to group nearby pubs+breweries into a single circular marker showing the count. Click on cluster zooms to expansion zoom. Bounds tracked from `onBoundsChanged`; clusters recomputed on zoom/bounds change.
- **Mobile UX**: Sticky bottom navigation. Mobile header (`mobile-header.tsx`) compacts on scroll (`useScrolled` hook, threshold=12px): height shrinks 56→44px, logo 28→24px, with subtle shadow + brighter background.
- **Shared EmptyState**: `client/src/components/empty-state.tsx` — reusable empty-state component with icon, title, subtitle, optional CTA (button/link), and `sm`/`md`/`lg` size variants. Used in explore-pubs, explore-breweries, explore-beers.
- **Large-scale Data Import**: Efficient import of over 1 million beer records with optimized search capabilities.
- **Content Suggestions**: Users can suggest changes to beer/brewery data (including images). Admins and brewery owners are notified via push. Admin review panel at `/admin/suggestions` with diff view, approve (applies changes) and reject (notifies user) actions.
- **Label Scanner**: Camera-based beer label/barcode scanner at `/scan`. Uses native BarcodeDetector API for EAN barcodes (lookup via Open Food Facts), falls back to OCR cascade: Gemini 2.0 Flash (primary, `GEMINI_API_KEY`, returns structured JSON `{beerName, breweryName, allText}`) → PaddleOCR (Python, VPS) → Tesseract 5 → OCR.space. PaddleOCR v3.4.0 + PaddlePaddle 3.0.0 on VPS with `FLAGS_use_mkldnn=0`. Script at `/www/nodeapps/fermenta/server/paddle_ocr.py`. Viewfinder covers 90% × 70% of camera area.
- **CLIP Visual Fingerprinting**: CLIP ViT-B/32 service running on VPS at `127.0.0.1:5002` (Python, `server/clip_service_v3.py`). In-memory numpy index (`data/clip_index.npz`). Endpoints: `/search` (visual similarity search), `/index` (add single beer), `/index-batch` (bulk parallel). Integrated into scan flow as `POST /api/scan/image-search`. Auto-redirect on CLIP match ≥82% with 7pp gap over #2. On confirm ✓, scan label photo is indexed in CLIP for future visual matches (organic index growth). Batch populate: `npx tsx scripts/clip-index-beers.ts --batch 50 --country Italia` (run on VPS).
- **Scan Memory (3 layers)**: 1) pg_trgm character-similarity on ocr_text (>0.65, fast, in-DB). 2) pgvector Gemini embedding cosine similarity on confirmed scan_logs (>0.88, semantic). 3) pgvector beer_embeddings catalog search (>0.91). Migration: `migrations/0011_pgvector.sql`. Requires: `postgresql-18-pgvector` OS package + `CREATE EXTENSION vector`. Batch generate beer embeddings: `npx tsx scripts/generate-beer-embeddings.ts` (uses Gemini text-embedding-004, 768-dim, free quota).
- **Duplicate Brewery Finder**: Admin tool at `/admin/duplicates` — finds pairs of similar breweries using pg_trgm fuzzy matching (`similarity()` function). Configurable threshold (0.70–0.95), country filter, max results. Each pair shows brewery cards with name, country, beer count, logo, similarity score. Actions: **Merge** (uses existing `/api/admin/breweries/merge` endpoint with keepId/mergeId dialog) and **Elimina il minore** (deletes the brewery with fewer beers via DELETE endpoint). Button "Trova Duplicati" added to breweries tab in AdminContentManager. Backend route: `GET /api/admin/breweries/find-duplicates?threshold&country&limit`, falls back to exact name match if pg_trgm unavailable.
- **Static Editable Pages**: Admin-managed pages (Contatti, Chi Siamo, Prezzi e Piani, Supporto) stored in `static_pages` DB table. Admin edits at `/admin/pages` using Tiptap v3 rich text editor (bold/italic/headings/lists/links/images/color/font). Public views at `/contatti`, `/chi-siamo`, `/prezzi`, `/supporto`. HTML sanitized server-side (strips script/iframe/event handlers) before storage.
- **Admin Content Manager**: `/admin/content` 3-tab layout (Birre/Birrifici/Pub). Beer search shows brewery logo, name, ABV, IBU, style badges. Delete with AlertDialog confirmation. No edit button — use Apri to navigate to entity page. **Mass edit**: checkboxes on each row → amber action bar → `PATCH /api/admin/{type}/mass-update` (fields: breweries: country/region/location; beers: style/color; pubs: city/region/country). **Sync brewery names**: blue refresh button per brewery row → `POST /api/admin/breweries/:id/sync-beer-names` propagates `brewery_name` to all beers with that `brewery_id`. **Merge breweries**: select exactly 2 breweries → purple "Merge" button in action bar → dialog to choose which to keep → `POST /api/admin/breweries/merge` migrates all beers/events/tastings/addition_requests/users to keepId then deletes mergeId in a transaction.
- **Festival Mode**: Digital taplist for beer festivals. Tables: `festivals` (slug, owner, dates, payment status), `festival_taps` (per-tap config with ratings), `festival_food_items` (menu), `festival_ratings` (1-10 stars, unique per user+tap). Public page at `/festival/:slug` (requires `isActive=true`). Manager dashboard at `/festival-dashboard` (admin/owner). **Stripe one-time payment €50**: `POST /api/stripe/festival-checkout` creates checkout session; `POST /api/stripe/activate-festival` activates after payment. Festival states: `unpaid` (paidAt=null, isActive=false), `active`, `expired` (endDate in past). Expired festivals: stats-only view + Rinnova button. Admin manual activation via `POST /api/admin/festivals/:id/activate`. Landing/directory page at `/crea-festival` (no auth required; shows all active+past festivals, feature list, FAQ, creation form via dialog). `GET /api/festivals/public` returns all isActive festivals (ordered by startDate); registered BEFORE `GET /api/festivals/:slug` to avoid route conflict. `POST /api/festivals/register` allows any authenticated user to create. **VPS SQL needed**: `ALTER TABLE festivals ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP, ADD COLUMN IF NOT EXISTS stripe_session_id VARCHAR(255), ADD COLUMN IF NOT EXISTS price_eur INTEGER DEFAULT 50, ADD COLUMN IF NOT EXISTS cover_image_url VARCHAR(500);`
- **Beer Collaborations**: Beers can be marked as collaborations between multiple breweries. `isCollaboration` boolean on `beers` table; `beer_collaborations` junction table (beer_id, brewery_id). Collab beers auto-appear on all partner brewery pages. UI: checkbox + multi-brewery search in BeerForm (AdminContentManager) and beer-detail edit dialog. Display: purple "Collab" badge + "con: Birrificio X × Birrificio Y" on beer cards in brewery-detail; partner brewery links in beer-detail header. Backend: `GET /api/beers/:id/collaborations`, `GET /api/breweries/:id/beers` includes collab beers with `collaboratingBreweries` and `isCollabBeer` fields.
- **Addition Requests**: Users can request new beers or breweries via `AdditionRequestModal` (accessible from `/scan` notfound state). Requests stored in `addition_requests` table. Admin reviews at `/admin/addition-requests` (approve creates the record, reject notifies user). Brewery owners see only beer requests for their brewery. Push notifications sent to admins and brewery owners on submission.
- **Admin Delete APIs**: DELETE `/api/admin/beers/:id`, `/api/admin/breweries/:id`, `/api/admin/pubs/:id` all implemented with cascade cleanup.
- **Admin Recent Activity**: GET `/api/admin/recent-activity` returns latest user registrations, reviews, pub/brewery creations, events with type filtering. Dashboard polls every 60s.
- **Scan History**: Users see their scan history at `/scan/history`. Each entry shows thumbnail, matched beer/brewery (with link), OCR engine badge, latency, and OCR text. Clicking a result on `/scan` saves feedback (chosenBeerId/chosenBreweryId) to the log. Admin can view all scan logs via GET `/api/admin/scan-logs` (paginated, joined with users/beers/breweries).
- **Barcode + Open Food Facts Integration**: `beers` table has a `barcode` (VARCHAR) column. When LabelScanner detects an EAN barcode via BarcodeDetector API, it calls Open Food Facts, captures both the EAN code and `image_front_url`. `onBarcodeFound` callback passes data to `scan.tsx` which stores in refs. When user selects a beer result, `POST /api/beers/:id/enrich-barcode` saves the barcode (if not set) and OFF image as `logo_url` (if no image). Fire-and-forget.
- **Brewery Image Enrichment Scripts**: Two TypeScript scripts in `scripts/` folder to bulk-enrich beer images:
  - `scripts/find-brewery-websites.ts` — populates `website_url` for breweries using OpenBreweryDB (US, ~8k) and URL pattern guessing (Italy: `{name}.it`, Germany: `{name}.de`, etc.). Run with `npx tsx scripts/find-brewery-websites.ts --country Italia --limit 500`.
  - `scripts/crawl-brewery-images.ts` — crawls brewery websites with set `website_url`, extracts beer product images, uploads to Cloudinary, saves `logo_url`. Run with `npx tsx scripts/crawl-brewery-images.ts --country Italia --limit 200 --resume`.

## External Dependencies

- **Database**: Neon PostgreSQL (serverless).
- **Authentication**: Replit Auth services.
- **Image CDN**: Cloudinary for image upload and delivery.
- **WebSocket**: For real-time Neon connections.
- **Component Library**: Radix UI primitives.
- **Icons**: Lucide React.
- **Styling**: Tailwind CSS.
- **Forms**: React Hook Form with Zod validation.
- **Date Handling**: date-fns library.
- **Mapping**: OpenStreetMap via `react-leaflet`.
- **PDF Generation**: jsPDF.
- **QR Code Generation**: qrcode.react.
- **CAPTCHA**: Google reCAPTCHA.