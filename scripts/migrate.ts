import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Try to load .env if DATABASE_URL not already set
if (!process.env.DATABASE_URL) {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx < 0) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
      if (key && !process.env[key]) process.env[key] = val;
    }
  }
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌  DATABASE_URL not set (checked environment and .env file)");
  console.error("    Run: DATABASE_URL=<your-url> npx tsx scripts/migrate.ts <file.sql>");
  process.exit(1);
}

const migrationFile = process.argv[2];
if (!migrationFile) {
  console.error("Usage: npx tsx scripts/migrate.ts <migration-file.sql>");
  console.error("Example: npx tsx scripts/migrate.ts migrations/0010_unaccent_perf.sql");
  process.exit(1);
}

const sqlPath = path.resolve(process.cwd(), migrationFile);
if (!fs.existsSync(sqlPath)) {
  console.error(`❌  File not found: ${sqlPath}`);
  process.exit(1);
}

// Split SQL into individual statements (handles CREATE INDEX CONCURRENTLY
// which cannot run inside a transaction block).
function splitStatements(sql: string): string[] {
  return sql
    .split(/;(?:\s*\n|\s*$)/m)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith("--") && s !== "");
}

const pool = new pg.Pool({ connectionString: DATABASE_URL });

async function run() {
  const raw = fs.readFileSync(sqlPath, "utf8");
  const statements = splitStatements(raw);
  const client = await pool.connect();

  console.log(`⚡ Applying: ${migrationFile} (${statements.length} statements)`);
  let ok = 0;
  let skipped = 0;
  let failed = 0;

  for (const stmt of statements) {
    // Skip pure comment blocks
    const stripped = stmt.replace(/--[^\n]*/g, "").trim();
    if (!stripped) { skipped++; continue; }

    try {
      await client.query(stmt);
      const label = stripped.slice(0, 60).replace(/\s+/g, " ");
      console.log(`  ✓  ${label}${stripped.length > 60 ? "…" : ""}`);
      ok++;
    } catch (err: any) {
      // "already exists" errors are safe to ignore (IF NOT EXISTS might not cover all cases)
      if (err.message?.includes("already exists")) {
        const label = stripped.slice(0, 60).replace(/\s+/g, " ");
        console.log(`  ⚠  already exists — skip: ${label}…`);
        skipped++;
      } else {
        console.error(`  ❌  FAILED: ${stripped.slice(0, 80)}`);
        console.error(`     ${err.message}`);
        failed++;
        // Continue applying remaining statements (don't abort)
      }
    }
  }

  client.release();
  await pool.end();

  console.log(`\n${failed === 0 ? "✅" : "⚠️ "} Done: ${ok} applied, ${skipped} skipped, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run();
