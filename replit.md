# Fermenta.to - Italian Beer Discovery Platform

## Overview

Fermenta.to is a full-stack web application designed to connect craft beer enthusiasts with Italian pubs and breweries. The platform facilitates beer discovery, pub and brewery management, and community interaction, aiming to be the go-to resource for Italy's craft beer scene. Key capabilities include comprehensive search, event management, user reviews, social features, and administrative tools for businesses. The project envisions a thriving community built around Italian craft beer, offering market potential by bridging consumers and businesses through an engaging and user-friendly platform.

## User Preferences

Preferred communication style: Simple, everyday language.

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