import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import pg from 'pg';
import { drizzle as drizzlePg, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const databaseUrl = process.env.DATABASE_URL;
const isNeon = databaseUrl.includes('neon.tech') || databaseUrl.includes('neon.');

let pool: pg.Pool;
let db: NodePgDatabase<typeof schema>;

if (isNeon) {
  const neonPool = new NeonPool({ connectionString: databaseUrl });
  pool = neonPool as unknown as pg.Pool;
  db = drizzleNeon({ client: neonPool, schema }) as unknown as NodePgDatabase<typeof schema>;
} else {
  const pgPool = new pg.Pool({ connectionString: databaseUrl });
  pool = pgPool;
  db = drizzlePg({ client: pgPool, schema });
}

export { pool, db };
