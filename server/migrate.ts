import { drizzle } from 'drizzle-orm/neon-serverless';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import { Pool as NeonPool } from '@neondatabase/serverless';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { migrate as migratePg } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';
import * as schema from '@shared/schema';

neonConfig.webSocketConstructor = ws;

function isNeonUrl(url: string): boolean {
  return url.includes('neon.tech') || url.includes('neon.');
}

async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  console.log('Connecting to database...');

  if (isNeonUrl(databaseUrl)) {
    const pool = new NeonPool({ connectionString: databaseUrl });
    const db = drizzle({ client: pool, schema });
    console.log('Running migrations (Neon)...');
    await migrate(db, { migrationsFolder: './migrations' });
    await pool.end();
  } else {
    const pool = new pg.Pool({ connectionString: databaseUrl });
    const db = drizzlePg({ client: pool, schema });
    console.log('Running migrations (PostgreSQL)...');
    await migratePg(db, { migrationsFolder: './migrations' });
    await pool.end();
  }

  console.log('Migrations completed successfully!');
}

runMigrations().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
