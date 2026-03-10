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
- **Mobile UX**: Sticky bottom navigation and thumb-friendly sections.
- **Cookie Consent**: Configurable cookie banner with granular preferences.
- **reCAPTCHA**: Integrated reCAPTCHA v2 for authentication forms.
- **Theme System**: Light/dark mode toggle with localStorage persistence.
- **Global Redesign**: Updated landing page, homepage, and CTA sections.
- **Performance Optimization**: Eliminated N+1 queries for pub menus and optimized admin search.
- **Large-scale Data Import**: Efficient import of over 1 million beer records with optimized search capabilities.
- **Content Suggestions**: Users can suggest changes to beer/brewery data (including images). Admins and brewery owners are notified via push. Admin review panel at `/admin/suggestions` with diff view, approve (applies changes) and reject (notifies user) actions.
- **Label Scanner**: Camera-based beer label/barcode scanner at `/scan`. Uses native BarcodeDetector API for EAN barcodes (lookup via Open Food Facts), falls back to OCR cascade: Gemini 2.0 Flash (primary, `GEMINI_API_KEY`) → PaddleOCR (Python, VPS) → Tesseract 5 → OCR.space. PaddleOCR v3.4.0 + PaddlePaddle 3.0.0 on VPS with `FLAGS_use_mkldnn=0`. Script at `/www/nodeapps/fermenta/server/paddle_ocr.py`. Viewfinder covers 90% × 70% of camera area (VF constant), image is cropped to viewfinder before OCR.
- **Static Editable Pages**: Admin-managed pages (Contatti, Chi Siamo, Prezzi e Piani, Supporto) stored in `static_pages` DB table. Admin edits at `/admin/pages` using Tiptap v3 rich text editor (bold/italic/headings/lists/links/images/color/font). Public views at `/contatti`, `/chi-siamo`, `/prezzi`, `/supporto`. HTML sanitized server-side (strips script/iframe/event handlers) before storage.
- **Admin Content Manager**: `/admin/content` 3-tab layout (Birre/Birrifici/Pub). Beer search shows brewery logo, name, ABV, IBU, style badges. Delete with AlertDialog confirmation. No edit button — use Apri to navigate to entity page.
- **Addition Requests**: Users can request new beers or breweries via `AdditionRequestModal` (accessible from `/scan` notfound state). Requests stored in `addition_requests` table. Admin reviews at `/admin/addition-requests` (approve creates the record, reject notifies user). Brewery owners see only beer requests for their brewery. Push notifications sent to admins and brewery owners on submission.
- **Admin Delete APIs**: DELETE `/api/admin/beers/:id`, `/api/admin/breweries/:id`, `/api/admin/pubs/:id` all implemented with cascade cleanup.
- **Admin Recent Activity**: GET `/api/admin/recent-activity` returns latest user registrations, reviews, pub/brewery creations, events with type filtering. Dashboard polls every 60s.

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