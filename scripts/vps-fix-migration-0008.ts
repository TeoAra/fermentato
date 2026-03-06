/**
 * VPS Migration Fix — run once if "0008" fails with "relation already exists"
 *
 * This script:
 *   1. Applies all SQL from 0008 safely (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS)
 *   2. Marks 0008 as applied in Drizzle's tracking table so future deploys don't retry it
 *
 * Usage (on VPS):
 *   DATABASE_URL=<url> npx tsx scripts/vps-fix-migration-0008.ts
 */

import pg from 'pg';
import * as fs from 'fs';
import * as crypto from 'crypto';
import * as path from 'path';

async function run() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required');

  const pool = new pg.Pool({ connectionString: databaseUrl });

  console.log('Connecting to database...');

  // Apply 0008 contents safely -----------------------------------------------

  // 1. brewery_events (may already exist from 0007)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "brewery_events" (
      "id" serial PRIMARY KEY NOT NULL,
      "brewery_id" integer NOT NULL,
      "title" varchar(255) NOT NULL,
      "description" text,
      "category" varchar(50) DEFAULT 'altro',
      "event_date" timestamp NOT NULL,
      "end_date" timestamp,
      "image_url" text,
      "is_published" boolean DEFAULT true,
      "created_at" timestamp DEFAULT now(),
      "updated_at" timestamp DEFAULT now()
    )
  `);
  console.log('✓ brewery_events table OK');

  // 2. brewery_events foreign key (may already exist)
  await pool.query(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'brewery_events_brewery_id_breweries_id_fk'
      ) THEN
        ALTER TABLE "brewery_events"
          ADD CONSTRAINT "brewery_events_brewery_id_breweries_id_fk"
          FOREIGN KEY ("brewery_id") REFERENCES "public"."breweries"("id")
          ON DELETE cascade ON UPDATE no action;
      END IF;
    END $$;
  `);
  console.log('✓ brewery_events FK OK');

  // 3. review_reports
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "review_reports" (
      "id" serial PRIMARY KEY NOT NULL,
      "review_id" integer NOT NULL,
      "reporter_id" varchar NOT NULL,
      "reason" varchar(50) NOT NULL,
      "description" text,
      "status" varchar(20) DEFAULT 'pending',
      "resolved_at" timestamp,
      "created_at" timestamp DEFAULT now()
    )
  `);
  console.log('✓ review_reports table OK');

  // 4. users new columns
  const userCols = [
    { name: 'email_verification_token', def: 'varchar' },
    { name: 'email_verification_expires', def: 'timestamp' },
    { name: 'needs_onboarding', def: 'boolean DEFAULT false' },
    { name: 'is_public', def: 'boolean DEFAULT true' },
  ];
  for (const col of userCols) {
    await pool.query(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "${col.name}" ${col.def};
    `);
    console.log(`✓ users.${col.name} OK`);
  }

  // Mark 0008 as applied in Drizzle tracking ---------------------------------
  const migrationFile = path.join('migrations', '0008_clever_molecule_man.sql');
  const sql = fs.readFileSync(migrationFile, 'utf-8');
  const hash = crypto.createHash('sha256').update(sql).digest('hex');

  await pool.query('CREATE SCHEMA IF NOT EXISTS drizzle');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS drizzle."__drizzle_migrations" (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `);

  const { rows } = await pool.query(
    `SELECT 1 FROM drizzle."__drizzle_migrations" WHERE hash = $1`, [hash]
  );
  if (rows.length === 0) {
    await pool.query(
      `INSERT INTO drizzle."__drizzle_migrations" (hash, created_at) VALUES ($1, $2)`,
      [hash, Date.now()]
    );
    console.log('✓ Migration 0008 marked as applied in tracking table');
  } else {
    console.log('ℹ Migration 0008 was already tracked — nothing to do');
  }

  await pool.end();
  console.log('\nDone! You can now run the normal deploy script.');
}

run().catch((err) => {
  console.error('Fix failed:', err.message);
  process.exit(1);
});
