# Guida Deploy Fermenta.to

## Opzioni di Deploy

### 1. Deploy su Replit (Raccomandato)
1. Importa il progetto su Replit
2. Configura le variabili ambiente nei Secrets:
   - `DATABASE_URL` - URL PostgreSQL database
   - `SESSION_SECRET` - Chiave segreta per sessioni
   - `CLOUDINARY_*` - Credenziali Cloudinary per immagini
3. Clicca Deploy per pubblicare automaticamente

### 2. Deploy su Vercel + Neon
1. Connetti repository a Vercel
2. Configura database su Neon (neon.tech)
3. Aggiungi variabili ambiente su Vercel:
   ```
   DATABASE_URL=postgresql://...
   SESSION_SECRET=random-secret
   CLOUDINARY_CLOUD_NAME=your-cloud
   CLOUDINARY_API_KEY=your-key  
   CLOUDINARY_API_SECRET=your-secret
   ```
4. Deploy automatico da Git

### 3. Deploy su Railway
1. Connetti repository a Railway
2. Aggiungi PostgreSQL database
3. Configura variabili ambiente
4. Deploy automatico

### 4. Deploy Manuale (VPS/Server)
1. Clona repository:
   ```bash
   git clone [repository-url]
   cd fermenta-to
   ```

2. Installa dipendenze:
   ```bash
   npm install
   ```

3. Configura database PostgreSQL e variabili:
   ```bash
   cp .env.example .env
   # Modifica .env con i tuoi valori
   ```

4. Esegui migrazioni database:
   ```bash
   npm run db:push
   ```

5. Build produzione:
   ```bash
   npm run build
   ```

6. Avvia server:
   ```bash
   npm start
   ```

## Configurazione Database

### Setup PostgreSQL Locale
```sql
CREATE DATABASE fermenta_to;
CREATE USER fermenta_user WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE fermenta_to TO fermenta_user;
```

### Setup con Neon (Cloud)
1. Registrati su neon.tech
2. Crea nuovo progetto
3. Copia DATABASE_URL dai settings
4. Usa URL per configurazione app

## Variabili Ambiente Obbligatorie

```env
# Database (OBBLIGATORIO)
DATABASE_URL=postgresql://user:pass@host:port/db

# Session Security (OBBLIGATORIO)  
SESSION_SECRET=random-string-molto-lunga

# Upload Immagini (OPZIONALE)
CLOUDINARY_CLOUD_NAME=your-cloud
CLOUDINARY_API_KEY=your-key
CLOUDINARY_API_SECRET=your-secret

# Autenticazione Replit (OPZIONALE per sviluppo locale)
REPL_ID=your-repl-id
REPLIT_DOMAINS=your-domain.com
```

## Script NPM Disponibili

```bash
npm run dev          # Sviluppo con hot reload
npm run build        # Build produzione
npm run start        # Avvia server produzione
npm run db:push      # Applica migrazioni database
npm run db:generate  # Genera migrazioni da schema
```

## Troubleshooting

### Errore Database Connection
- Verifica DATABASE_URL sia corretto
- Controlla che PostgreSQL sia accessibile
- Esegui `npm run db:push` per migrazioni

### Errore Autenticazione Replit
- Verifica REPL_ID nelle variabili ambiente
- Controlla REPLIT_DOMAINS includa il tuo dominio
- Per sviluppo locale, usa autenticazione mock

### Upload Immagini Non Funziona
- Verifica credenziali Cloudinary
- Controlla limiti account Cloudinary
- Fallback: immagini salvate localmente

### Performance Lenta
- Abilita connection pooling database
- Configura CDN per assets statici
- Considera upgrade piano hosting

## Monitoring e Maintenance

### Log Applicazione
- Check logs server per errori database
- Monitor utilizzo memoria e CPU
- Track response times API endpoints

### Backup Database
```bash
# Export backup
pg_dump $DATABASE_URL > backup.sql

# Restore backup  
psql $DATABASE_URL < backup.sql
```

### Aggiornamenti
1. Pull ultimi cambiamenti repository
2. `npm install` per nuove dipendenze
3. `npm run db:push` per migrazioni
4. `npm run build && npm restart`

---
Per supporto deploy, consulta documentazione piattaforma scelta o contatta sviluppatori.