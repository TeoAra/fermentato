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

const pool = new pg.Pool({ connectionString: DATABASE_URL });

async function run() {
  const sql = fs.readFileSync(sqlPath, "utf8");
  const client = await pool.connect();
  try {
    console.log(`⚡ Applying: ${migrationFile}`);
    await client.query(sql);
    console.log("✅  Migration applied successfully");
  } catch (err: any) {
    console.error("❌  Migration failed:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
