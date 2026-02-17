import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const databaseUrl = process.env.DATABASE_URL;
const isNeon = databaseUrl.includes('neon.tech') || databaseUrl.includes('neon.');

let pool: any;
let db: any;

if (isNeon) {
  const { Pool, neonConfig } = require('@neondatabase/serverless');
  const { drizzle } = require('drizzle-orm/neon-serverless');
  const ws = require('ws');
  neonConfig.webSocketConstructor = ws;
  pool = new Pool({ connectionString: databaseUrl });
  db = drizzle({ client: pool, schema });
} else {
  const pg = require('pg');
  const { drizzle } = require('drizzle-orm/node-postgres');
  pool = new pg.Pool({ connectionString: databaseUrl });
  db = drizzle({ client: pool, schema });
}

export { pool, db };
