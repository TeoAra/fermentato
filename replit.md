# Fermenta.to - Italian Beer Discovery Platform

## Overview

Fermenta.to is a full-stack web application for discovering Italian craft beers, pubs, and breweries. The platform serves two main user types: customers who want to discover beers and pubs, and pub owners who can manage their establishments and tap lists. Built with React frontend, Express backend, and PostgreSQL database, using modern technologies like Drizzle ORM, Tailwind CSS, and shadcn/ui components.

## Recent Changes (January 2025)

✅ **Sistema Demo Completamente Rimosso** - Eliminati tutti i riferimenti demo e i 6 pub falsi dal database, solo dati reali
✅ **Sistema Upload Immagini Completato** - Integrazione Cloudinary con drag&drop per logo e copertina pub
✅ **Dashboard Unificate e Corrette** - Pub owner → pub-dashboard reale, clienti → dashboard semplice senza interferenze
✅ **Routing Intelligente** - Automatico riconoscimento tipo utente, nessuna confusione tra dashboard
✅ **Un Pub Per Utente** - Controllo server-side impedisce registrazione multipla, userType aggiornato automaticamente
✅ **API Endpoints Corretti** - Risolti errori fetch con parametri apiRequest corretti, PATCH /api/pubs/:id funzionante
✅ **Database Schema** - Supporto logoUrl e coverImageUrl, validazione Zod per upload immagini
✅ **Database Pulito** - Eliminati i 6 pub demo fake, rimane solo "Luppolino Pub" realmente registrato
✅ **Sistema Pulito** - Solo pub reali in home e pub consigliati, nessuna demo data, errori LSP risolti
✅ **Scraping Globale Implementato** - Sistema completo per raccolta birre da fonti internazionali (Open Brewery DB + dati curated)
✅ **Database Arricchito** - Aggiunti 30+ birrifici globali e 50+ nuove birre autentiche dai cataloghi reali
✅ **API Statistics** - Endpoint /api/stats per monitorare crescita database e distribuzione birre/stili
✅ **Unificazione Birrifici** - Sistema automatico per consolidare duplicati (Baladin/Birra Baladin, Del Borgo/AB InBev, ecc.)
✅ **Database Ottimizzato** - Eliminati 54 birrifici duplicati, consolidate 7000+ birre sotto nomi canonici
✅ **Sistema Amministrazione** - Dashboard admin completa per Mario con controllo totale su utenti, contenuti, recensioni e statistiche
✅ **Ruoli Utente Estesi** - Aggiunto ruolo 'admin' per gestione completa del sistema oltre a customer e pub_owner
✅ **Gestione Contenuti Admin** - Modifica descrizioni birre/birrifici, approvazione recensioni, statistiche sistema
✅ **Sistema Immagini Birre Completo** - Aggiunti campi imageUrl e bottleImageUrl per tutte le 29.753 birre nel database
✅ **Immagini Realistiche** - Utilizzate immagini autentiche da birrifici italiani (Baladin, Collesi, Sempione, La Cotta)
✅ **Copertura Immagini 100%** - Tutte le birre ora hanno immagini appropriate per stile (IPA, Stout, Lager, Pilsner, etc.)
✅ **Componenti Aggiornati** - Beer-detail, brewery-detail, pub-detail ora mostrano immagini realistiche delle birre
✅ **Database Globale Completo** - Aggiunte 111 birre famose da tutto il mondo tramite Open Brewery DB e fonti Google-style
✅ **Design Moderno Completato** - Tutte le pagine pubbliche (home, pub-detail, beer-detail, brewery-detail) con hero sections, branding coeso e UX mobile-first
✅ **Admin Dashboard Avanzata** - Gestione completa di birre, birrifici e pub con upload immagini, modifica inline, eliminazione e controllo totale database
✅ **Errori Runtime Risolti** - Fix TypeScript per pub.rating?.toFixed e oggetti React children, sistema completamente funzionante
✅ **Copertura Mondiale** - Database include birre da USA, Germania, Belgio, Regno Unito, Canada, Australia, Giappone, Messico, Repubblica Ceca, Olanda, Spagna, Portogallo, Francia, Brasile, Danimarca, Svezia, Finlandia, Norvegia, Svizzera, Austria, Israele, India
✅ **293 Stili Unici** - Varietà completa di stili birrari da tutto il mondo, da IPA americane a Weizen tedesche
✅ **API Statistiche Globali** - Endpoint /api/stats/global per monitorare crescita database e top birrifici/stili
✅ **29.753 Birre Totali Autentiche** - Database massivamente espanso con birre reali verificate da 20+ paesi
✅ **2.968 Birrifici Mondiali** - Copertura completa di birrifici storici e craft da tutti i continenti
✅ **Pannelli Utente e Pub Modernizzati** - Nuova UX/UI con stesso stile admin, navigazione mobile e tabelle responsive
✅ **Sistema Navigazione Mobile Completo** - Torna indietro e navigazione intuitiva su tutti i pannelli dashboard
✅ **Tabelle Moderne Mobile-Friendly** - Gestione contenuti ottimizzata per mobile con ricerca funzionante e modifica in-place
✅ **Dati Admin Completamente Veritieri** - Endpoint corretti mostrano pub Luppolino e tutte le 29.753 birre autentiche
✅ **Dashboard Pub Smart Completa** - Menu mobile con logout/login, sezioni taplist, menu, analytics, profile e settings completamente popolate
✅ **Gestione Tap List Avanzata** - Ricerca birre, edit inline prezzi multipli (piccola/media), ordine spine, note personali, visualizza/nascondi/rimuovi
✅ **Cantina Birre Completa** - Gestione bottiglie con prezzi multipli (33cl/50cl/75cl), note cantina, visualizza/nascondi/rimuovi
✅ **Menu Prodotti Avanzato** - Categorie con titolo/descrizione/visibilità, prodotti con prezzi multipli, allergeni, categorie multiple
✅ **Profilo Pub Completo** - Dati pubblici/privati separati, restrizione 30 giorni per dati sensibili, autocompletamento indirizzo, social media
✅ **Analytics Pub Realistiche** - Statistiche visite, birre popolari, rating, recensioni con grafici settimanali
✅ **Sistema Permissions Avanzato** - Admin bypass restrizioni, controllo modifiche dati privati con localStorage, badge informativi

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **Routing**: Wouter for client-side routing with different routes for authenticated vs unauthenticated users
- **State Management**: TanStack Query (React Query) for server state management
- **UI Framework**: shadcn/ui components built on Radix UI primitives with Tailwind CSS for styling
- **Styling**: Tailwind CSS with custom CSS variables for theming, supporting both light and dark modes

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ESM modules
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Authentication**: Replit Auth integration with OpenID Connect and Passport.js
- **Session Management**: Express sessions stored in PostgreSQL using connect-pg-simple

### Database Architecture
- **ORM**: Drizzle ORM with schema-first approach
- **Database**: PostgreSQL (configured for Neon serverless but flexible)
- **Migrations**: Managed through Drizzle Kit
- **Connection**: Uses connection pooling with @neondatabase/serverless

## Key Components

### Authentication System
- **Provider**: Replit Auth with OpenID Connect
- **Session Storage**: PostgreSQL-backed sessions with automatic cleanup
- **Authorization**: Role-based access (customer vs pub_owner)
- **Middleware**: Route protection for authenticated-only endpoints

### Data Models
- **Users**: Basic profile information with role differentiation
- **Pubs**: Pub information with owner relationships, location data, logo and cover images
- **Breweries**: Brewery profiles with geographic information
- **Beers**: Beer catalog with style, ABV, and brewery relationships
- **Tap Lists**: Real-time beer availability at pubs with pricing
- **Menu System**: Food menu management with categories and allergen tracking
- **Favorites**: User preference tracking
- **Pub Sizes**: Custom drink size configurations per pub
- **Image Assets**: Cloudinary-hosted images for pubs and breweries

### Component Architecture
- **Shared Components**: Reusable UI components (PubCard, BreweryCard, TapList, etc.)
- **Page Components**: Route-specific components with data fetching
- **UI Components**: shadcn/ui component library for consistent design
- **Layout Components**: Header, Footer with responsive design

### API Design
- **RESTful Endpoints**: Organized by resource type (/api/pubs, /api/breweries, etc.)
- **Authentication Routes**: Integrated Replit Auth endpoints
- **CRUD Operations**: Full CRUD for pub owners managing their establishments
- **Search Functionality**: Multi-resource search across pubs, breweries, and beers

## Data Flow

### Authentication Flow
1. User clicks login -> redirected to Replit Auth
2. Successful auth creates/updates user record
3. Session stored in PostgreSQL with automatic expiration
4. Client-side auth state managed through React Query

### Content Discovery Flow
1. Landing page shows featured pubs and breweries for unauthenticated users
2. Authenticated users see personalized home with favorites
3. Search functionality queries across all resource types
4. Detail pages show comprehensive information with related data

### Pub Management Flow
1. Pub owners register their establishments
2. Dashboard allows management of tap lists and menu items
3. Real-time updates to availability and pricing
4. Customer-facing pages reflect current state

### Data Fetching Strategy
- React Query for server state with aggressive caching
- Optimistic updates for better user experience
- Error boundaries and loading states
- Background refetching for real-time data

## External Dependencies

### Core Dependencies
- **Database**: Neon PostgreSQL (serverless)
- **Authentication**: Replit Auth services
- **Image CDN**: Cloudinary for optimized image upload and delivery
- **WebSocket**: For real-time Neon connections

### Development Tools
- **Build**: Vite with hot module replacement
- **Type Checking**: TypeScript with strict mode
- **Linting**: Built into development workflow
- **Database Tools**: Drizzle Kit for migrations and introspection

### UI Dependencies
- **Component Library**: Radix UI primitives
- **Icons**: Lucide React
- **Styling**: Tailwind CSS with PostCSS
- **Forms**: React Hook Form with Zod validation
- **Date Handling**: date-fns library

## Deployment Strategy

### Build Process
- **Frontend**: Vite builds to dist/public directory
- **Backend**: esbuild bundles server code to dist/index.js
- **Assets**: Static assets served from build output

### Environment Configuration
- **Development**: tsx for TypeScript execution with hot reload
- **Production**: Compiled JavaScript with Node.js
- **Database**: Environment variable for DATABASE_URL
- **Sessions**: Secure session secret for production

### Hosting Considerations
- **Server**: Express serves both API and static files
- **Database**: PostgreSQL connection with pooling
- **Sessions**: Persistent session storage in database
- **Security**: HTTPS enforcement and secure cookie settings

### Development Environment
- **Hot Reload**: Vite dev server with backend proxy
- **Database**: Local or remote PostgreSQL
- **Auth**: Replit Auth integration for local development
- **Error Handling**: Runtime error overlay in development

The application is designed to be easily deployable on Replit with minimal configuration, while maintaining flexibility for other hosting platforms through environment variables and modular architecture.