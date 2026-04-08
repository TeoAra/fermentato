/**
 * Batch-generates 768-dim Gemini embeddings for all beers without one.
 *
 * Usage:
 *   npx tsx scripts/generate-beer-embeddings.ts [options]
 *
 * Options:
 *   --country=Italia   Filter by brewery country (STRONGLY recommended — 1.2M total!)
 *   --limit=N          Max beers to process (default: all in country)
 *   --batch=N          Beers per batch (default: 20)
 *   --concurrency=N    Parallel API calls per batch (default: 10)
 *   --delay=N          Ms between batches (default: 500)
 *
 * Rate limits (Gemini free tier): ~1 500 req/min = ~25/s
 * With batch=20 concurrency=10 delay=500: ~1 200 req/min → safe.
 *
 * For Italian beers only (~tens of thousands), run:
 *   npx tsx scripts/generate-beer-embeddings.ts --country=Italia --batch=20
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

// ── CLI args ──────────────────────────────────────────────────────────────────
function arg(name: string) {
  return process.argv.find(a => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=") ?? "";
}
const COUNTRY     = arg("country");
const LIMIT       = parseInt(arg("limit") || "0") || 0;
const BATCH       = parseInt(arg("batch") || "20") || 20;
const CONCURRENCY = parseInt(arg("concurrency") || "10") || 10;
const DELAY_MS    = parseInt(arg("delay") || "500") || 500;

// ── Inline embedding helpers ──────────────────────────────────────────────────
const GEMINI_EMBED_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent";

async function generateEmbedding(text: string): Promise<number[] | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !text?.trim()) return null;
  try {
    const res = await fetch(`${GEMINI_EMBED_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: { parts: [{ text: text.trim() }] }, outputDimensionality: 768 }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      const err: any = await res.json().catch(() => ({}));
      // Surface useful error on first call only (avoid log spam)
      if ((generateEmbedding as any)._errShown < 1) {
        console.error(`\n❌  Gemini API error ${res.status}: ${err?.error?.message ?? "unknown"}`);
        (generateEmbedding as any)._errShown = ((generateEmbedding as any)._errShown ?? 0) + 1;
      }
      return null;
    }
    const data: any = await res.json();
    return data?.embedding?.values ?? null;
  } catch { return null; }
}
(generateEmbedding as any)._errShown = 0;

function pgVector(v: number[]): string { return `[${v.join(",")}]`; }

function beerEmbedText(name: string, breweryName?: string | null, style?: string | null): string {
  return [name, breweryName, style].filter(Boolean).join(" — ");
}

// ── Concurrency limiter ───────────────────────────────────────────────────────
async function runWithConcurrency<T>(
  items: T[],
  fn: (item: T) => Promise<void>,
  maxConcurrent: number
): Promise<void> {
  const queue = [...items];
  const workers = Array.from({ length: Math.min(maxConcurrent, items.length) }, async () => {
    while (queue.length > 0) {
      const item = queue.shift()!;
      await fn(item);
    }
  });
  await Promise.all(workers);
}

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  if (!process.env.GEMINI_API_KEY) {
    console.error("❌  GEMINI_API_KEY not set.");
    process.exit(1);
  }

  // Warn if no country filter (would be 1.2M+)
  if (!COUNTRY) {
    console.warn("⚠️   No --country filter set. This will attempt ALL ~1.2M beers.");
    console.warn("     For Italian beers only, use: --country=Italia");
    console.warn("     Continuing in 5 seconds…");
    await sleep(5000);
  }

  const countQ = COUNTRY
    ? `SELECT COUNT(*)::int AS cnt
       FROM beers b JOIN breweries br ON br.id = b.brewery_id
       WHERE br.country ILIKE $1
         AND NOT EXISTS (SELECT 1 FROM beer_embeddings e WHERE e.beer_id = b.id)`
    : `SELECT COUNT(*)::int AS cnt FROM beers b
       WHERE NOT EXISTS (SELECT 1 FROM beer_embeddings e WHERE e.beer_id = b.id)`;
  const { rows: [{ cnt }] } = await pool.query(countQ, COUNTRY ? [`%${COUNTRY}%`] : []);

  const total = LIMIT ? Math.min(cnt, LIMIT) : cnt;
  console.log(`📦  ${cnt} beers need embeddings${COUNTRY ? ` (country: ${COUNTRY})` : ""}${LIMIT ? ` — limited to ${LIMIT}` : ""}`);
  console.log(`⚙️   batch=${BATCH}  concurrency=${CONCURRENCY}  delay=${DELAY_MS}ms`);

  // Estimate time
  const batchesNeeded = Math.ceil(total / BATCH);
  const estSecs = Math.round(batchesNeeded * (DELAY_MS / 1000 + (BATCH / CONCURRENCY) * 0.3));
  if (total > 0) console.log(`⏱️   Estimated time: ~${estSecs < 60 ? `${estSecs}s` : `${Math.round(estSecs / 60)}min`}`);

  if (total === 0) {
    console.log("✅  All beers already have embeddings.");
    await pool.end();
    return;
  }

  let done = 0;
  let errors = 0;
  let stored = 0;
  let offset = 0;
  const t0 = Date.now();

  while (done < total) {
    const batchSize = Math.min(BATCH, total - done);

    const beerQ = COUNTRY
      ? `SELECT b.id, b.name, br.name AS brewery_name, b.style
         FROM beers b JOIN breweries br ON br.id = b.brewery_id
         WHERE br.country ILIKE $1
           AND NOT EXISTS (SELECT 1 FROM beer_embeddings e WHERE e.beer_id = b.id)
         ORDER BY b.id LIMIT $2`
      : `SELECT b.id, b.name, br.name AS brewery_name, b.style
         FROM beers b LEFT JOIN breweries br ON br.id = b.brewery_id
         WHERE NOT EXISTS (SELECT 1 FROM beer_embeddings e WHERE e.beer_id = b.id)
         ORDER BY b.id LIMIT $1 OFFSET $2`;

    const { rows } = await pool.query(beerQ, COUNTRY ? [`%${COUNTRY}%`, batchSize] : [batchSize, offset]);
    if (rows.length === 0) break;

    await runWithConcurrency(rows, async (row: any) => {
      const text = beerEmbedText(row.name, row.brewery_name, row.style);
      const vec = await generateEmbedding(text);
      if (!vec) { errors++; return; }

      try {
        await pool.query(
          `INSERT INTO beer_embeddings (beer_id, embedding)
           VALUES ($1, $2::vector)
           ON CONFLICT (beer_id) DO UPDATE SET embedding = EXCLUDED.embedding, updated_at = now()`,
          [row.id, pgVector(vec)]
        );
        stored++;
      } catch { errors++; }
    }, CONCURRENCY);

    done += rows.length;
    if (!COUNTRY) offset += rows.length; // offset only needed without country filter

    const elapsed = ((Date.now() - t0) / 1000).toFixed(0);
    const rate = done > 0 ? (done / ((Date.now() - t0) / 1000)).toFixed(1) : "?";
    const pct = Math.round((done / total) * 100);
    process.stdout.write(`\r⚡  ${done}/${total} (${pct}%)  ✓${stored}  ✗${errors}  ${rate}/s  ${elapsed}s elapsed`);

    if (done < total) await sleep(DELAY_MS);

    // Stop early if too many consecutive errors (bad API key)
    if (errors > 0 && stored === 0 && done >= Math.min(BATCH, 5)) {
      console.error("\n\n❌  All embedding calls failing — check GEMINI_API_KEY is valid and has access to gemini-embedding-001.");
      break;
    }
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n\n✅  Done in ${elapsed}s: ${stored} embeddings stored, ${errors} errors.`);
  await pool.end();
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });
