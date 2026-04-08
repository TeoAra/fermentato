import pg from "pg";
import fs from "fs";
import path from "path";

if (!process.env.DATABASE_URL) {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq < 0) continue;
      const k = t.slice(0, eq).trim();
      const v = t.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (k && !process.env[k]) process.env[k] = v;
    }
  }
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌  DATABASE_URL not set");
  process.exit(1);
}

const STATEMENTS: string[] = [
  `CREATE EXTENSION IF NOT EXISTS unaccent`,
  `CREATE EXTENSION IF NOT EXISTS pg_trgm`,
  `CREATE OR REPLACE FUNCTION unaccent_immutable(text)
   RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE
   AS 'SELECT unaccent($1)'`,
  `CREATE INDEX IF NOT EXISTS idx_beers_name_unaccent_trgm
   ON beers USING gin (unaccent_immutable(lower((name)::text)) gin_trgm_ops)`,
  `CREATE INDEX IF NOT EXISTS idx_breweries_name_unaccent_trgm
   ON breweries USING gin (unaccent_immutable(lower((name)::text)) gin_trgm_ops)`,
  `CREATE INDEX IF NOT EXISTS idx_beers_style_lower_trgm
   ON beers USING gin (lower((COALESCE(style, ''))::text) gin_trgm_ops)`,
  `CREATE INDEX IF NOT EXISTS idx_beer_views_beer_id
   ON beer_views (beer_id)`,
  `CREATE INDEX IF NOT EXISTS idx_beer_views_viewed_at
   ON beer_views (viewed_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_beer_views_viewed_at_beer_id
   ON beer_views (viewed_at DESC, beer_id)`,
  `CREATE INDEX IF NOT EXISTS idx_scan_logs_ocr_text_trgm
   ON scan_logs USING gin (lower(unaccent_immutable(COALESCE(ocr_text, ''))) gin_trgm_ops)`,
  `CREATE INDEX IF NOT EXISTS idx_scan_logs_chosen_beer_id
   ON scan_logs (chosen_beer_id) WHERE chosen_beer_id IS NOT NULL`,
  `CREATE INDEX IF NOT EXISTS idx_scan_logs_was_correct
   ON scan_logs (was_correct) WHERE was_correct IS NOT FALSE AND chosen_beer_id IS NOT NULL`,
  `CREATE INDEX IF NOT EXISTS idx_user_cellar_user_id
   ON user_cellar (user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_user_wishlist_user_id
   ON user_wishlist (user_id)`,
];

const pool = new pg.Pool({ connectionString: DATABASE_URL });

async function run() {
  const client = await pool.connect();
  console.log(`⚡ Applying migration 0010 (${STATEMENTS.length} statements)\n`);
  let ok = 0, skipped = 0, failed = 0;

  for (const sql of STATEMENTS) {
    const label = sql.trim().replace(/\s+/g, " ").slice(0, 70);
    try {
      await client.query(sql);
      console.log(`  ✓  ${label}`);
      ok++;
    } catch (err: any) {
      if (err.message?.includes("already exists")) {
        console.log(`  ⚠  already exists — skip`);
        skipped++;
      } else {
        console.error(`  ❌  FAILED: ${label}`);
        console.error(`     ${err.message}`);
        failed++;
      }
    }
  }

  client.release();
  await pool.end();
  console.log(`\n${failed === 0 ? "✅" : "⚠️ "} Done: ${ok} ok, ${skipped} skipped, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run();
