#!/usr/bin/env npx tsx
/**
 * Wikidata Beer Image Ingestion
 *
 * Queries Wikidata SPARQL for beers that have images (P18),
 * fuzzy-matches them against our DB (brewery name + beer name),
 * and uploads matched images to Cloudinary — updating imageUrl only when
 * the beer currently has no image.
 *
 * Coverage: Wikidata ha ~739 birre globali con immagine legate a un birrificio.
 * Le birre italiane craft sono quasi assenti (1 risultato). Utile per brand
 * internazionali (Heineken, Duvel, Paulaner…) presenti nel DB.
 *
 * Run:
 *   npx tsx scripts/ingest-beer-images-wikidata.ts
 *   npx tsx scripts/ingest-beer-images-wikidata.ts --country Italia
 *   npx tsx scripts/ingest-beer-images-wikidata.ts --overwrite
 *   npx tsx scripts/ingest-beer-images-wikidata.ts --dry-run
 */

import { Pool, neonConfig } from "@neondatabase/serverless";
import { v2 as cloudinary } from "cloudinary";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

// ─── CLI args ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
function arg(flag: string) { return args.find((_, i) => args[i - 1] === flag); }

const COUNTRY_FILTER = arg("--country") ?? null;          // e.g. "Italia"
const LIMIT          = parseInt(arg("--limit") ?? "3000");
const MIN_SCORE      = parseFloat(arg("--min-score") ?? "0.7");
const DRY_RUN        = args.includes("--dry-run");
const OVERWRITE      = args.includes("--overwrite");

// ─── DB + Cloudinary ────────────────────────────────────────────────────────
const DB = new Pool({ connectionString: process.env.DATABASE_URL! });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ─── Wikidata country codes ──────────────────────────────────────────────────
const COUNTRY_QIDS: Record<string, string> = {
  "Italia":      "Q38",
  "Belgium":     "Q31",
  "Germany":     "Q183",
  "France":      "Q142",
  "UK":          "Q145",
  "USA":         "Q30",
  "Netherlands": "Q55",
  "Czech":       "Q213",
  "Austria":     "Q40",
  "Ireland":     "Q27",
};

// ─── Text similarity ─────────────────────────────────────────────────────────
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ").trim();
}

function tokenOverlap(a: string, b: string): number {
  const na = normalize(a), nb = normalize(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.9;
  const ta = new Set(na.split(" ").filter(w => w.length > 2));
  const tb = nb.split(" ").filter(w => w.length > 2);
  if (!ta.size || !tb.length) return 0;
  const overlap = tb.filter(w => ta.has(w)).length;
  return (overlap * 2) / (ta.size + tb.length);
}

// Combined brewery + beer name score
function matchScore(wikiBeer: string, wikiBrewery: string, dbBeer: string, dbBrewery: string): number {
  const beerSim    = tokenOverlap(wikiBeer, dbBeer);
  const brewSim    = tokenOverlap(wikiBrewery, dbBrewery);
  // Beer name is the stronger signal
  return beerSim * 0.65 + brewSim * 0.35;
}

// ─── Wikidata SPARQL ─────────────────────────────────────────────────────────
interface WikiBeer {
  beer:          string;  // QID URL
  beerLabel:     string;
  breweryLabel:  string;
  imageUrl:      string;  // Wikimedia Commons Special:FilePath URL
}

async function queryWikidata(countryQid: string | null, limit: number): Promise<WikiBeer[]> {
  // Query confirmed to work: items with P18 (image) manufactured (P176) by a brewery (Q131734 subclass)
  // Optional country filter: brewery's country (P17)
  const countryFilter = countryQid
    ? `?brewery wdt:P17 wd:${countryQid}.`
    : "";

  const sparql = `
    SELECT DISTINCT ?beer ?beerLabel ?breweryLabel ?image WHERE {
      ?beer wdt:P18 ?image;
            wdt:P176 ?brewery.
      ?brewery wdt:P31/wdt:P279* wd:Q131734.
      ${countryFilter}
      SERVICE wikibase:label {
        bd:serviceParam wikibase:language "it,en".
      }
    }
    LIMIT ${limit}
  `.trim();

  const url = "https://query.wikidata.org/sparql?" + new URLSearchParams({
    query:  sparql,
    format: "json",
  });

  console.log(`\n→ Querying Wikidata${countryQid ? ` (${countryQid})` : ""} — limit ${limit}…`);

  const res = await fetch(url, {
    headers: { "User-Agent": "FermentaTo-BeerImageBot/1.0 (https://fermenta.to)" },
  });

  if (!res.ok) throw new Error(`SPARQL ${res.status}: ${await res.text()}`);

  const json = await res.json() as any;
  const bindings = json.results.bindings as any[];

  return bindings
    .filter(b => b.beerLabel?.value && b.image?.value)
    .map(b => ({
      beer:         b.beer.value,
      beerLabel:    b.beerLabel.value,
      breweryLabel: b.breweryLabel?.value ?? "",
      imageUrl:     b.image.value,
    }));
}

// ─── DB helpers ──────────────────────────────────────────────────────────────
interface DbBeer {
  id:            number;
  name:          string;
  brewery_name:  string;
  image_url:     string | null;
}

async function loadDbBeers(): Promise<DbBeer[]> {
  const { rows } = await DB.query<DbBeer>(`
    SELECT b.id, b.name, br.name AS brewery_name, b.image_url
    FROM beers b
    LEFT JOIN breweries br ON br.id = b.brewery_id
    ORDER BY b.id
  `);
  return rows;
}

// ─── Cloudinary upload ───────────────────────────────────────────────────────
async function uploadToCloudinary(sourceUrl: string, beerId: number): Promise<string | null> {
  try {
    // Wikimedia Commons returns files directly from Special:FilePath redirects
    const result = await cloudinary.uploader.upload(sourceUrl, {
      folder:        "fermenta/beers",
      public_id:     `beer_${beerId}_wikidata`,
      overwrite:     true,
      resource_type: "image",
      transformation: [{ width: 600, height: 600, crop: "limit", quality: "auto:good" }],
    });
    return result.secure_url;
  } catch (err: any) {
    console.error(`    ✗ Cloudinary upload failed: ${err.message}`);
    return null;
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("╔══════════════════════════════════════════╗");
  console.log("║  Wikidata Beer Image Ingestion           ║");
  console.log("╚══════════════════════════════════════════╝");
  console.log(`Mode: ${DRY_RUN ? "DRY-RUN" : "WRITE"} | Overwrite: ${OVERWRITE} | Min score: ${MIN_SCORE}`);

  // 1. Load DB beers + build brewery index for fast lookup
  console.log("\n→ Loading beers from DB…");
  const dbBeers = await loadDbBeers();
  console.log(`  ${dbBeers.length} beers loaded`);

  // Build index: normalized brewery token → beers (avoids O(n×m) brute force)
  const brewIndex = new Map<string, DbBeer[]>();
  for (const b of dbBeers) {
    const tokens = normalize(b.brewery_name ?? "").split(" ").filter(t => t.length > 2);
    const key = tokens.slice(0, 2).join(" ");  // first 2 meaningful tokens
    if (!key) continue;
    if (!brewIndex.has(key)) brewIndex.set(key, []);
    brewIndex.get(key)!.push(b);
  }
  console.log(`  Index built: ${brewIndex.size} brewery buckets`);

  // 2. Query Wikidata
  const countryQid = COUNTRY_FILTER ? (COUNTRY_QIDS[COUNTRY_FILTER] ?? null) : null;
  if (COUNTRY_FILTER && !countryQid) {
    const available = Object.keys(COUNTRY_QIDS).join(", ");
    console.warn(`⚠ Unknown country "${COUNTRY_FILTER}". Available: ${available}`);
  }

  let wikiBeerList: WikiBeer[];
  try {
    wikiBeerList = await queryWikidata(countryQid, LIMIT);
  } catch (err: any) {
    console.error("✗ Wikidata query failed:", err.message);
    process.exit(1);
  }
  console.log(`  ${wikiBeerList.length} Wikidata beers with images found`);

  // 3. Match + upload
  const stats = { matched: 0, uploaded: 0, skipped: 0, failed: 0, noMatch: 0 };

  for (const wiki of wikiBeerList) {
    // Find candidates via brewery index (fast), then score
    const wikiBrewTokens = normalize(wiki.breweryLabel).split(" ").filter(t => t.length > 2);
    const candidates = new Set<DbBeer>();

    // Try all 1-2 token prefixes of the brewery name to find bucket
    for (let len = 1; len <= Math.min(2, wikiBrewTokens.length); len++) {
      const key = wikiBrewTokens.slice(0, len).join(" ");
      (brewIndex.get(key) ?? []).forEach(b => candidates.add(b));
    }

    // Also try 1-token match for short brewery names
    if (wikiBrewTokens[0]) {
      (brewIndex.get(wikiBrewTokens[0]) ?? []).forEach(b => candidates.add(b));
    }

    // Fallback: if no candidates via index, skip (avoids full scan)
    if (!candidates.size) { stats.noMatch++; continue; }

    let bestScore = 0;
    let bestBeer: DbBeer | null = null;

    for (const db of candidates) {
      const score = matchScore(wiki.beerLabel, wiki.breweryLabel, db.name, db.brewery_name ?? "");
      if (score > bestScore) {
        bestScore = score;
        bestBeer = db;
      }
    }

    if (bestScore < MIN_SCORE || !bestBeer) {
      stats.noMatch++;
      continue;
    }

    if (!OVERWRITE && bestBeer.image_url) {
      stats.skipped++;
      continue;
    }

    stats.matched++;
    const tag = `[${bestScore.toFixed(2)}] "${wiki.beerLabel}" (${wiki.breweryLabel}) → DB #${bestBeer.id} "${bestBeer.name}"`;
    console.log(`  ✓ ${tag}`);

    if (DRY_RUN) continue;

    // Upload to Cloudinary
    const imageUrl = await uploadToCloudinary(wiki.imageUrl, bestBeer.id);
    if (!imageUrl) { stats.failed++; continue; }

    // Update DB
    await DB.query(
      `UPDATE beers SET image_url = $1 WHERE id = $2`,
      [imageUrl, bestBeer.id]
    );

    stats.uploaded++;
    console.log(`    ↑ Uploaded: ${imageUrl}`);
  }

  // 4. Summary
  console.log("\n══════════════════════════════════════════════");
  console.log(`Wikidata beers found:  ${wikiBeerList.length}`);
  console.log(`DB matches (≥${MIN_SCORE}):    ${stats.matched}`);
  console.log(`Uploaded to Cloudinary:${stats.uploaded}`);
  console.log(`Skipped (had image):   ${stats.skipped}`);
  console.log(`No DB match:           ${stats.noMatch}`);
  console.log(`Upload failed:         ${stats.failed}`);
  console.log("══════════════════════════════════════════════");

  await DB.end();
}

main().catch(err => { console.error(err); process.exit(1); });
