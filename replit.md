# Fermenta.to - Italian Beer Discovery Platform

## Overview

Fermenta.to is a full-stack web application designed for discovering Italian craft beers, pubs, and breweries. It caters to two primary user types: customers seeking beer and pub information, and pub owners managing their establishments and tap lists. The platform aims to provide a comprehensive and user-friendly experience for exploring Italy's craft beer scene, facilitating connections between consumers and businesses.

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
- **Database**: PostgreSQL (flexible, configured for Neon serverless).
- **Migrations**: Drizzle Kit with SQL migration files (not db:push).
- **Connection**: Connection pooling with @neondatabase/serverless.
- **Migration Workflow**: Schema changes generate SQL files in `migrations/` folder. These are applied incrementally, preserving existing data.

### Key Components

- **Authentication System**: Replit Auth, PostgreSQL-backed sessions, role-based access (customer, pub_owner, admin).
- **Data Models**: Users, Pubs (with logo/cover images), Breweries, Beers (with style, ABV), Tap Lists, Menu System (categories, allergens), Favorites, Pub Sizes, Image Assets.
- **Component Architecture**: Reusable UI components, page-specific components, shadcn/ui integration, responsive layout components.
- **API Design**: RESTful endpoints, authentication routes, CRUD operations for pub owners, multi-resource search functionality.

### Data Flow
- **Authentication Flow**: Replit Auth integration, user record management, PostgreSQL session storage, client-side state management via React Query.
- **Content Discovery Flow**: Featured content for unauthenticated users, personalized home for authenticated users, comprehensive search, detailed information pages.
- **Pub Management Flow**: Pub registration, dashboard for tap list/menu management, real-time updates reflected on public-facing pages.
- **Data Fetching Strategy**: React Query for caching and optimistic updates, with error boundaries and loading states.

### Recent Features (Feb–Mar 2026)
- **Social Login Onboarding**: After Google OAuth first login, users are redirected to `/onboarding` page. Multi-step wizard: choose role (customer/pub_owner/brewery_owner), fill in pub or brewery details. `needsOnboarding` boolean on users table; auto-redirect in App.tsx. Endpoint: `POST /api/auth/complete-onboarding`.
- **Events System (Pubs)**: pubEvents table, full CRUD for pub owners, public display in pub detail, push notifications to favorites
- **Events System (Breweries)**: breweryEvents table (same structure), full CRUD via BreweryEventsManager component in brewery dashboard, public display in brewery-detail page, push notifications to brewery favorites
- **Beer Reviews (Untappd-style)**: `GET /api/beers/:id/reviews` returns all rated tastings with user info (nickname, avatar, badge level, review count) + avg rating + rating distribution histogram. Community reviews section in beer-detail page: avg rating, histogram bars (5→1 stars), user badge emoji, clickable reviewer names linking to public profiles.
- **Badge System**: 8-level badge progression at `client/src/lib/badges.ts`: Germoglio(0)→Curioso(5)→Assaggiatore(20)→Degustatore(50)→Esperto(100)→Mastro Birraio(200)→Gran Maestro(350)→Leggenda del Luppolo(500). Used in reviews, public profiles.
- **Public User Profiles**: `/user/:nickname` page showing badge, review history, favorite styles, progress bar to next badge. Backend: `GET /api/users/:identifier/profile` (supports nickname or id lookup). Privacy-aware (403 for private profiles).
- **Privacy Toggle**: `PATCH /api/user/privacy` endpoint. Toggle in UserProfile settings tab with link to public profile. `is_public` boolean in users table (default true).
- **Brewery Rating Card**: `GET /api/breweries/:id/rating` returns avg rating + review count across all beers. Shown as third stat card in brewery-detail (3-column grid: beers, rating, location).
- **Admin Dashboard Enhanced**: `/api/admin/stats` now returns totalReviews, totalTastings, totalEvents, lastUpdated. Admin dashboard shows 6 live stats (birre, birrifici, pub, utenti, recensioni, eventi) with "last updated" indicator. Fixed username display (uses nickname/firstName). Back button added to admin users page.
- **QR Codes**: Per-pub QR code generation with download/share (qrcode.react)
- **PDF Menu Download**: Generate downloadable PDF with taplist, bottles, and food menu (jsPDF)
- **TV Taplist Mode**: Full-screen taplist display at `/tv/:id` for TVs/monitors, auto-refreshing
- **Push Notifications Optimization**: Throttling, batching, TTL/urgency settings, notification tags
- **Mobile Dashboard UX**: Sticky bottom nav, thumb-friendly sections
- **Password for social accounts**: `hasPassword` boolean returned in /api/auth/user; PasswordChangeForm is adaptive (shows Google notice, hides current-password field for social users)
- **Dashboard routing fix**: `activeRole === 'customer'` takes priority over legacy userType fallback
- **Cookie Consent Banner**: `CookieBanner.tsx` component with 4 levels (Essential/Preferences/Analytics/Marketing), localStorage persistence, expandable categories, `getCookiePreferences()` export. Rendered in `App.tsx`. `CookieSettingsButton` exported and used in `footer.tsx`. Appears after 0.8s delay on first visit.
- **reCAPTCHA v2**: Integrated `react-google-recaptcha` in `auth.tsx` on both login and register forms. Widget appears only when `VITE_RECAPTCHA_SITE_KEY` env var is set. Token sent as `recaptchaToken` in POST body. Server-side verification in `server/auth.ts` via `verifyRecaptcha()` helper calling Google siteverify API using `RECAPTCHA_SECRET_KEY` secret. Both env vars configured.

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

## Deployment & Data Sync

### Database Migration Workflow (Safe Deployments)
1. **Schema changes**: Edit `shared/schema.ts` as needed
2. **Generate migration**: Run `npx drizzle-kit generate` — creates SQL file in `migrations/`
3. **Apply locally**: Run `npx tsx server/migrate.ts` — applies only new migrations
4. **Deploy to VPS**: Run `scripts/deploy-vps.sh` — builds, migrates (data-safe), restarts

### VPS First-Time Setup
- Run `npx tsx scripts/vps-init-migrations.ts` to mark existing schema as already applied
- This is done automatically by `scripts/deploy-vps.sh`

### Data Synchronization (VPS ↔ Replit)
- **Export from any DB**: `DATABASE_URL=<url> npx tsx scripts/export-data.ts` — saves JSON to `data-export/`
- **Import to any DB**: `DATABASE_URL=<url> npx tsx scripts/import-data.ts data-export/<file>.json` — upserts data (merge, not overwrite)
- Import uses ON CONFLICT DO UPDATE (upsert) so existing records are updated, new ones inserted
- Import order respects foreign key dependencies
- Sequence IDs are automatically reset after import

### Important Notes
- NEVER use `drizzle-kit push` in production — use migrations instead
- `data-export/` folder is gitignored (data files stay local)
- Migrations folder IS committed to git and deployed with code
- The VPS deployment script handles everything: deps, build, migrations, restart

### Data Synchronization (VPS ↔ Replit via SSH Tunnel)
- **Script**: `scripts/sync-data.ts` — bidirectional sync via SSH tunnel (no exposed DB port)
- **SSH Key**: `~/.ssh/id_replit_sync` (ed25519) — public key must be in VPS `~/.ssh/authorized_keys`
- **VPS Details**: root@45.134.39.247, app at `/www/nodeapps/fermenta/`, DB: fermenta@localhost:5432
- **Usage**:
  - `npx tsx scripts/sync-data.ts pull` — VPS → Replit
  - `npx tsx scripts/sync-data.ts push` — Replit → VPS
  - `npx tsx scripts/sync-data.ts both` — Bidirectional (pull first, then push)
- Sync uses upsert (ON CONFLICT DO UPDATE) so no data is lost
- Handles circular FK deps: users→breweries by importing users without brewery_id first, then updating after breweries are imported
- Batch inserts (100 rows/batch) for performance (~60s for 30K+ records)
- JSON/JSONB columns auto-detected and properly cast