import pg from 'pg';
import * as crypto from 'crypto';
import * as fs from 'fs';

async function initMigrations() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const pool = new pg.Pool({ connectionString: databaseUrl });

  console.log('Initializing migration tracking for existing database...');

  await pool.query('CREATE SCHEMA IF NOT EXISTS drizzle');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS drizzle."__drizzle_migrations" (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `);

  const existing = await pool.query('SELECT COUNT(*) as count FROM drizzle."__drizzle_migrations"');
  if (parseInt(existing.rows[0].count) > 0) {
    console.log('Migration tracking already initialized. Skipping.');
    await pool.end();
    return;
  }

  const journalPath = './migrations/meta/_journal.json';
  if (!fs.existsSync(journalPath)) {
    console.error('No migrations found. Run "npx drizzle-kit generate" first.');
    process.exit(1);
  }

  const journal = JSON.parse(fs.readFileSync(journalPath, 'utf-8'));
  const initialEntry = journal.entries[0];

  if (!initialEntry) {
    console.error('No entries in migration journal.');
    process.exit(1);
  }

  const migrationPath = `./migrations/${initialEntry.tag}.sql`;
  const query = fs.readFileSync(migrationPath, 'utf-8');
  const hash = crypto.createHash('sha256').update(query).digest('hex');

  await pool.query(
    'INSERT INTO drizzle."__drizzle_migrations" (hash, created_at) VALUES ($1, $2)',
    [hash, initialEntry.when]
  );

  console.log(`Marked initial migration "${initialEntry.tag}" as already applied.`);
  console.log('Future migrations will be applied incrementally.');

  await pool.end();
}

initMigrations().catch((err) => {
  console.error('Init failed:', err);
  process.exit(1);
});
