/**
 * Batch-generates 768-dim Gemini embeddings for all beers without one.
 * Usage:
 *   npx tsx scripts/generate-beer-embeddings.ts [--limit=1000] [--batch=10]
 *
 * Requires:
 *  - GEMINI_API_KEY in env (or .env file)
 *  - pgvector extension enabled + 0011_pgvector.sql migration applied
 *
 * Rate limit: Gemini free tier ~1 500 req/min; paid tier ~6 000 req/min.
 * With batch=10, ~150 batches/min → 1 500 beers/min at free tier.
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

const LIMIT    = parseInt(process.argv.find(a => a.startsWith("--limit="))?.split("=")[1] ?? "0") || 0;
const BATCH    = parseInt(process.argv.find(a => a.startsWith("--batch="))?.split("=")[1] ?? "10") || 10;
const SLEEP_MS = 1000; // 1 s between batches ≈ safe within free quota

// ── Inline embedding helpers (from server/embeddings.ts) ─────────────────────
const GEMINI_EMBED_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent";

async function generateEmbedding(text: string): Promise<number[] | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !text?.trim()) return null;
  try {
    const res = await fetch(`${GEMINI_EMBED_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: { parts: [{ text: text.trim() }] } }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data: any = await res.json();
    return data?.embedding?.values ?? null;
  } catch { return null; }
}

function pgVector(v: number[]): string { return `[${v.join(",")}]`; }

function beerEmbedText(name: string, breweryName?: string | null, style?: string | null): string {
  return [name, breweryName, style].filter(Boolean).join(" — ");
}
// ─────────────────────────────────────────────────────────────────────────────

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  if (!process.env.GEMINI_API_KEY) {
    console.error("❌  GEMINI_API_KEY not set.");
    process.exit(1);
  }

  console.log("🔍  Counting beers without embeddings…");
  const { rows: [{ cnt }] } = await pool.query(`
    SELECT COUNT(*)::int AS cnt FROM beers b
    WHERE NOT EXISTS (SELECT 1 FROM beer_embeddings e WHERE e.beer_id = b.id)
  `);
  console.log(`📦  ${cnt} beers need embeddings${LIMIT ? ` (limit: ${LIMIT})` : ""}`);

  if (cnt === 0) {
    console.log("✅  All beers already have embeddings.");
    await pool.end();
    return;
  }

  const total = LIMIT ? Math.min(cnt, LIMIT) : cnt;
  let done = 0;
  let errors = 0;

  while (done < total) {
    const { rows } = await pool.query(`
      SELECT b.id, b.name, br.name AS brewery_name, b.style
      FROM beers b
      LEFT JOIN breweries br ON br.id = b.brewery_id
      WHERE NOT EXISTS (SELECT 1 FROM beer_embeddings e WHERE e.beer_id = b.id)
      ORDER BY b.id
      LIMIT $1
    `, [BATCH]);

    if (rows.length === 0) break;

    await Promise.all(rows.map(async (row: any) => {
      const text = beerEmbedText(row.name, row.brewery_name, row.style);
      const vec = await generateEmbedding(text);
      if (!vec) { errors++; return; }

      await pool.query(`
        INSERT INTO beer_embeddings (beer_id, embedding)
        VALUES ($1, $2::vector)
        ON CONFLICT (beer_id) DO UPDATE SET embedding = EXCLUDED.embedding, updated_at = now()
      `, [row.id, pgVector(vec)]);
    }));

    done += rows.length;
    const pct = Math.round((done / total) * 100);
    process.stdout.write(`\r⚡  ${done}/${total} (${pct}%)  errors: ${errors}`);

    if (done < total) await sleep(SLEEP_MS);
  }

  console.log(`\n✅  Done: ${done} embeddings stored, ${errors} errors.`);
  await pool.end();
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });
