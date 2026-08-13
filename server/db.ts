import pg from 'pg';
import { drizzle as drizzlePg, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const databaseUrl = process.env.DATABASE_URL;
const isNeon = databaseUrl.includes('neon.tech') || databaseUrl.includes('neon.');

// Driver TCP standard (node-postgres) anche per Neon.
// PRIMA usavamo @neondatabase/serverless su WebSocket: su un server
// long-running (VPS) Neon chiude i WebSocket idle dopo un periodo di
// inattività e il pool restava con connessioni morte — la prima query dopo
// una pausa (es. deserializeUser al ritorno dell'utente dopo ~1h) si
// bloccava indefinitamente. Il driver TCP con keepalive + riciclo idle +
// timeout non ha questo problema.
const pool = new pg.Pool({
  connectionString: databaseUrl,
  // TLS verificato: Neon usa certificati pubblici validi, nessun motivo di
  // disabilitare la verifica (rejectUnauthorized=false esporrebbe a MITM).
  ssl: isNeon ? { rejectUnauthorized: true } : undefined,
  max: 10,
  // Ricicla le connessioni rimaste idle prima che il server/proxy le chiuda
  // dal suo lato lasciandole "mezze morte" nel pool.
  idleTimeoutMillis: 30_000,
  // Se ottenere una connessione richiede più di 10s, errore esplicito
  // invece di richiesta appesa.
  connectionTimeoutMillis: 10_000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10_000,
  // Nessuna query può restare appesa oltre 30s lato Postgres.
  statement_timeout: 30_000,
});

// Una connessione idle che muore emette 'error' sul pool: senza handler
// l'intero processo Node crasha. Loggare e proseguire — il pool la scarta.
pool.on('error', (err) => {
  console.error('[db pool] idle client error (connection recycled):', err.message);
});

const db: NodePgDatabase<typeof schema> = drizzlePg({ client: pool, schema });

export { pool, db };
