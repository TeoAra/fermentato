# Fermenta.to - Export Package

## Descrizione del Progetto
Fermenta.to è una piattaforma web completa per pub che vogliono pubblicare le loro tap list, menu cibo e cantinette birre. Include sistema preferiti universale, dashboard utente con profili completi, tracking birre assaggiate, dashboard pub smart, design mobile-first responsive, integrazione Maps, database completo birrifici/birre internazionali, sistema notifiche, gestione eventi e pannello amministrativo avanzato.

## Tecnologie Utilizzate

### Frontend
- **Framework**: React con TypeScript (Vite)
- **Routing**: Wouter per routing client-side
- **State Management**: TanStack Query (React Query) per server state
- **UI Framework**: shadcn/ui components basati su Radix UI
- **Styling**: Tailwind CSS con supporto dark/light mode
- **Icons**: Lucide React

### Backend
- **Runtime**: Node.js con Express.js
- **Language**: TypeScript con ESM modules
- **Database**: PostgreSQL con Drizzle ORM
- **Authentication**: Replit Auth con OpenID Connect e Passport.js
- **Session Management**: Express sessions in PostgreSQL (connect-pg-simple)

### Database
- **ORM**: Drizzle ORM schema-first
- **Database**: PostgreSQL (configurato per Neon serverless)
- **Migrations**: Drizzle Kit per migrazioni
- **Connection**: Connection pooling @neondatabase/serverless

## Installazione e Setup

### Prerequisiti
- Node.js 20+ 
- PostgreSQL database
- Account Replit per autenticazione (opzionale per sviluppo locale)

### Installazione Dipendenze
```bash
npm install
```

### Configurazione Database
1. Configura DATABASE_URL nel file .env:
```
DATABASE_URL=postgresql://username:password@host:port/database
```

2. Esegui le migrazioni:
```bash
npm run db:push
```

### Avvio Sviluppo
```bash
npm run dev
```
L'applicazione sarà disponibile su http://localhost:5000

## Struttura del Progetto

```
├── client/              # Frontend React
│   ├── src/
│   │   ├── components/  # Componenti UI riutilizzabili
│   │   ├── pages/       # Pagine dell'applicazione
│   │   ├── hooks/       # Custom React hooks
│   │   └── lib/         # Utilities e configurazioni
├── server/              # Backend Express
│   ├── routes.ts        # Route API
│   ├── storage.ts       # Interfaccia database
│   ├── db.ts           # Configurazione database
│   └── replitAuth.ts   # Autenticazione Replit
├── shared/              # Codice condiviso
│   └── schema.ts        # Schema database Drizzle
└── scripts/            # Script di utilità
```

## Caratteristiche Principali

### Sistema Autenticazione
- Integrazione Replit Auth con ruoli (customer, pub_owner, admin)
- Sessioni PostgreSQL-backed
- Gestione profili utente completi

### Gestione Pub
- Dashboard completa per proprietari pub
- Gestione tap list in tempo reale
- Sistema menu con categorie personalizzabili
- Cantina birre con prezzi multipli
- Upload immagini tramite Cloudinary

### Discovery Content
- Ricerca avanzata multi-risorsa
- Pagine dettaglio pub, birrifici, birre
- Sistema preferiti universale
- Integrazione mappe per localizzazione

### Pannello Admin
- Gestione contenuti e moderazione
- Analytics e statistiche
- Backup e gestione dati
- Sistema notifiche

## API Endpoints Principali

### Autenticazione
- `GET /api/auth/user` - Profilo utente corrente
- `GET /api/login` - Login Replit Auth
- `GET /api/logout` - Logout

### Pub Management
- `GET /api/pubs` - Lista pub pubblici
- `GET /api/pubs/:id` - Dettaglio pub
- `GET /api/pubs/:id/taplist` - Tap list pub
- `GET /api/pubs/:id/menu` - Menu pub
- `GET /api/pubs/:id/bottles` - Cantina pub

### Content Discovery
- `GET /api/beers` - Ricerca birre
- `GET /api/breweries` - Ricerca birrifici
- `GET /api/search` - Ricerca globale

## Deploy e Produzione

### Build Produzione
```bash
npm run build
```

### Variabili Ambiente Richieste
```
DATABASE_URL=postgresql://...
SESSION_SECRET=your-session-secret
CLOUDINARY_CLOUD_NAME=your-cloud
CLOUDINARY_API_KEY=your-key
CLOUDINARY_API_SECRET=your-secret
REPL_ID=your-repl-id (per Replit Auth)
```

## Note Sviluppo

### Database Schema
Il database utilizza Drizzle ORM con schema definito in `shared/schema.ts`. Le principali tabelle includono:
- `users` - Utenti e profili
- `pubs` - Pub e locali
- `breweries` - Birrifici
- `beers` - Database birre
- `tapLists` - Tap list pub
- `bottleLists` - Cantina birre
- `menuCategories` - Categorie menu
- `menuItems` - Prodotti menu

### Componenti UI
L'interfaccia utilizza shadcn/ui con componenti altamente personalizzabili e responsive design mobile-first.

### Cache Strategy
React Query gestisce il caching lato client con invalidazione automatica per aggiornamenti in tempo reale.

## Supporto
Per supporto tecnico o domande, consultare la documentazione completa nel progetto.

---
**Esportato da Fermenta.to Development Team**