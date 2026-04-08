import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌  DATABASE_URL not set");
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
