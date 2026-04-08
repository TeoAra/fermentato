/**
 * Batch-indexes beer images into the local CLIP service (127.0.0.1:5002).
 * Processes beers with image_url in batches — CLIP service handles parallel
 * downloads + GPU/CPU batch inference internally.
 *
 * Usage (run ON THE VPS):
 *   npx tsx scripts/clip-index-beers.ts [--batch=50] [--limit=5000] [--country=Italia]
 *
 * Options:
 *   --batch=N     Items per /index-batch call (default: 50)
 *   --limit=N     Max beers to process (default: all)
 *   --country=X   Filter by brewery country (optional, e.g. "Italia")
 *   --delay=N     Ms between batches (default: 500)
 */

import pg from "pg";
import fs from "fs";
import path from "path";

// ── Load .env manually (dotenv not required) ──────────────────────────────────
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
  console.error("❌  DATABASE_URL not set. Check .env file or environment.");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: DATABASE_URL });

const CLIP_URL = process.env.CLIP_SERVICE_URL ?? "http://127.0.0.1:5002";
const BATCH    = parseInt(process.argv.find(a => a.startsWith("--batch="))?.split("=")[1] ?? "50") || 50;
const LIMIT    = parseInt(process.argv.find(a => a.startsWith("--limit="))?.split("=")[1] ?? "0") || 0;
const COUNTRY  = process.argv.find(a => a.startsWith("--country="))?.split("=").slice(1).join("=") || "";
const DELAY_MS = parseInt(process.argv.find(a => a.startsWith("--delay="))?.split("=")[1] ?? "500") || 500;

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function getStats(): Promise<number> {
  try {
    const r = await fetch(`${CLIP_URL}/stats`);
    const d: any = await r.json();
    return d.indexed ?? 0;
  } catch { return -1; }
}

async function main() {
  // Health check
  try {
    const h = await fetch(`${CLIP_URL}/health`);
    const hd: any = await h.json();
    if (!hd.clip_ready) { console.error("❌  CLIP service not ready"); process.exit(1); }
    console.log(`✅  CLIP service ready — currently indexed: ${hd.index_size} beers`);
  } catch {
    console.error(`❌  Cannot reach CLIP service at ${CLIP_URL}`);
    process.exit(1);
  }

  // Count beers to process
  const countQ = COUNTRY
    ? `SELECT COUNT(*)::int AS cnt FROM beers b JOIN breweries br ON br.id = b.brewery_id WHERE b.image_url IS NOT NULL AND br.country ILIKE $1`
    : `SELECT COUNT(*)::int AS cnt FROM beers WHERE image_url IS NOT NULL`;
  const { rows: [{ cnt }] } = await pool.query(countQ, COUNTRY ? [`%${COUNTRY}%`] : []);
  const total = LIMIT ? Math.min(cnt, LIMIT) : cnt;

  console.log(`📦  ${total} beers to index${COUNTRY ? ` (country: ${COUNTRY})` : ""}  |  batch=${BATCH}  delay=${DELAY_MS}ms`);
  if (total === 0) { await pool.end(); return; }

  let processed = 0;
  let totalOk = 0;
  let totalFail = 0;
  let offset = 0;

  while (processed < total) {
    const batchSize = Math.min(BATCH, total - processed);
    const q = COUNTRY
      ? `SELECT b.id, b.image_url AS url FROM beers b JOIN breweries br ON br.id = b.brewery_id WHERE b.image_url IS NOT NULL AND br.country ILIKE $1 ORDER BY b.id LIMIT $2 OFFSET $3`
      : `SELECT id, image_url AS url FROM beers WHERE image_url IS NOT NULL ORDER BY id LIMIT $1 OFFSET $2`;
    const { rows } = await pool.query(q, COUNTRY ? [`%${COUNTRY}%`, batchSize, offset] : [batchSize, offset]);

    if (rows.length === 0) break;

    const items = rows.map((r: any) => ({ id: r.id, url: r.url }));

    try {
      const r = await fetch(`${CLIP_URL}/index-batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
        signal: AbortSignal.timeout(120_000),
      });
      const d: any = await r.json();
      totalOk += d.ok ?? 0;
      totalFail += d.fail ?? 0;
      const pct = Math.round(((processed + rows.length) / total) * 100);
      process.stdout.write(`\r⚡  ${processed + rows.length}/${total} (${pct}%)  ✓${totalOk} ✗${totalFail}  ${d.imgs_per_sec ?? "?"}img/s`);
    } catch (e: any) {
      console.error(`\n❌  Batch error: ${e?.message}`);
      totalFail += items.length;
    }

    processed += rows.length;
    offset += rows.length;
    if (processed < total) await sleep(DELAY_MS);
  }

  const finalCount = await getStats();
  console.log(`\n\n✅  Done: ${totalOk} indexed, ${totalFail} failed.`);
  console.log(`📊  CLIP index size: ${finalCount} beers`);
  await pool.end();
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });
