/**
 * Geocodifica tutti i birrifici senza coordinate usando Nominatim (OpenStreetMap, gratuito).
 * Strategia: deduplication per location → una sola API call per città, aggiorna tutti i birrifici.
 *
 * Uso sul VPS:
 *   npx tsx scripts/geocode-breweries.ts
 *
 * Può essere interrotto (Ctrl+C) e ripreso: le location già tentate (OK o fallite)
 * vengono salvate in geocode-skipped.json e saltate al prossimo avvio.
 */

import pg from "pg";
import { readFileSync, writeFileSync } from "fs";

const SKIP_FILE = "./geocode-skipped.json";
const BATCH = 50;
const DELAY_MS = 1200;

if (!process.env.DATABASE_URL && !process.env.PGHOST) {
  console.error("Errore: imposta DATABASE_URL oppure le variabili PGHOST/PGUSER/PGPASSWORD/PGDATABASE");
  process.exit(1);
}

const pool = process.env.DATABASE_URL
  ? new pg.Pool({ connectionString: process.env.DATABASE_URL })
  : new pg.Pool({
      host: process.env.PGHOST,
      port: Number(process.env.PGPORT || 5432),
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      database: process.env.PGDATABASE,
    });

function sleep(ms: number) {
  return new Promise(ok => setTimeout(ok, ms));
}

function loadSkipped(): Set<string> {
  try {
    return new Set(JSON.parse(readFileSync(SKIP_FILE, "utf8")) as string[]);
  } catch {
    return new Set();
  }
}

function saveSkipped(set: Set<string>) {
  try {
    writeFileSync(SKIP_FILE, JSON.stringify([...set]));
  } catch {}
}

async function nominatimQuery(q: string): Promise<{ lat: string; lon: string } | null> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&accept-language=it`,
        {
          headers: { "User-Agent": "Fermenta.to/1.0 (noreply@fermenta.to)", "Accept": "application/json" },
          signal: AbortSignal.timeout(10000),
        }
      );
      const text = await r.text();
      if (text.trimStart().startsWith("<")) {
        const wait = attempt * 6000;
        console.log(`  ⏳ Rate limit, attendo ${wait / 1000}s...`);
        await sleep(wait);
        continue;
      }
      const data = JSON.parse(text) as any[];
      if (Array.isArray(data) && data[0]?.lat && data[0]?.lon) {
        return { lat: data[0].lat, lon: data[0].lon };
      }
      return null;
    } catch {
      if (attempt < 3) await sleep(3000);
    }
  }
  return null;
}

function buildFallbacks(location: string, country: string): string[] {
  const queries: string[] = [];

  // 1. Query originale completa
  queries.push(`${location}, ${country}`);

  const parts = location.split(",").map(s => s.trim()).filter(Boolean);

  if (parts.length > 1) {
    // 2. Solo l'ultima parte (es. "Abbotsley, Saint Neots" → "Saint Neots, UK")
    queries.push(`${parts[parts.length - 1]}, ${country}`);
    // 3. Solo la prima parte
    queries.push(`${parts[0]}, ${country}`);
  }

  // 4. Rimuovi codice postale iniziale (es. "4987 Stoumont" → "Stoumont")
  const withoutPostal = location.replace(/^\d{3,6}\s+/, "").trim();
  if (withoutPostal !== location) {
    queries.push(`${withoutPostal}, ${country}`);
    // 5. Solo città dopo codice postale + parti successive
    const subParts = withoutPostal.split(",").map(s => s.trim());
    if (subParts.length > 1) queries.push(`${subParts[subParts.length - 1]}, ${country}`);
  }

  // 6. Solo la prima parola significativa (≥4 caratteri)
  const firstWord = location.split(/[\s,]+/).find(w => w.length >= 4 && !/^\d+$/.test(w));
  if (firstWord && firstWord !== location) queries.push(`${firstWord}, ${country}`);

  // Deduplica
  return [...new Set(queries)];
}

async function geocodeLocation(location: string, country: string): Promise<{ lat: string; lon: string } | null> {
  const fallbacks = buildFallbacks(location, country);
  for (const query of fallbacks) {
    const result = await nominatimQuery(query);
    if (result) return result;
    await sleep(DELAY_MS); // rispetta rate limit tra i fallback
  }
  return null;
}

async function main() {
  // 1. Carica tutte le location uniche senza coordinate in memoria
  const { rows: allLocs } = await pool.query(`
    SELECT DISTINCT ON (LOWER(TRIM(location)))
      LOWER(TRIM(location))                                  AS loc_key,
      location,
      COALESCE(NULLIF(TRIM(country), ''), 'Italia')          AS country
    FROM breweries
    WHERE (latitude IS NULL OR latitude::text = '' OR latitude::text = '0')
      AND location IS NOT NULL AND TRIM(location) != ''
    ORDER BY LOWER(TRIM(location))
  `);

  // 2. Carica i già tentati (successi e fallimenti precedenti) e filtrali
  const skipped = loadSkipped();
  const todo = allLocs.filter(r => !skipped.has(r.loc_key));

  const eta = Math.ceil(todo.length * DELAY_MS / 60000);
  console.log(`\n🍺  Fermenta.to — Geocoding Birrifici`);
  console.log(`    Location uniche totali    : ${allLocs.length.toLocaleString()}`);
  console.log(`    Già processate (skip)     : ${skipped.size.toLocaleString()}`);
  console.log(`    Da geocodificare ora      : ${todo.length.toLocaleString()}`);
  console.log(`    Stima tempo               : ~${eta} minuti\n`);

  if (todo.length === 0) {
    console.log("✅ Nessuna location da geocodificare!");
    await pool.end();
    return;
  }

  // Salva skip anche su Ctrl+C
  process.on("SIGINT", () => {
    console.log("\n⚠️  Interrotto. Progresso salvato in geocode-skipped.json");
    saveSkipped(skipped);
    process.exit(0);
  });

  let totalBreweries = 0;
  let okCount = 0;
  let failCount = 0;
  const start = Date.now();

  // 3. Processa in batch da BATCH location alla volta
  for (let i = 0; i < todo.length; i += BATCH) {
    const batch = todo.slice(i, i + BATCH);
    const pct = Math.round((i / todo.length) * 100);
    const elapsed = Math.round((Date.now() - start) / 1000);
    console.log(`\n[${i + 1}–${Math.min(i + BATCH, todo.length)}/${todo.length}]  ${pct}%  —  ${elapsed}s`);

    for (const row of batch) {
      const result = await geocodeLocation(row.location, row.country);

      if (result) {
        const res = await pool.query(
          `UPDATE breweries
           SET latitude = $1, longitude = $2
           WHERE LOWER(TRIM(location)) = $3
             AND (latitude IS NULL OR latitude::text = '' OR latitude::text = '0')`,
          [result.lat, result.lon, row.loc_key]
        );
        const n = res.rowCount ?? 0;
        totalBreweries += n;
        okCount++;
        console.log(`  ✓  ${row.location.padEnd(40)} → ${String(n).padStart(4)} birrifici`);
      } else {
        failCount++;
        console.log(`  ✗  ${row.location.padEnd(40)} → skip`);
      }

      // Segna come tentato (successo o fallimento) → non verrà ripreso
      skipped.add(row.loc_key);
      await sleep(DELAY_MS);
    }

    // Salva progresso dopo ogni batch
    saveSkipped(skipped);
  }

  const elapsed = Math.round((Date.now() - start) / 1000);
  console.log(`\n✅  Completato in ${elapsed}s`);
  console.log(`    Geocodificate con successo : ${okCount}`);
  console.log(`    Non trovate (skippate)     : ${failCount}`);
  console.log(`    Birrifici aggiornati       : ${totalBreweries}\n`);

  await pool.end();
}

main().catch(err => {
  console.error("Errore fatale:", err.message);
  process.exit(1);
});
