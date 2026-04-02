/**
 * Geocodifica tutti i birrifici senza coordinate usando Nominatim (OpenStreetMap, gratuito).
 * Strategia: deduplication per location → una sola API call per città, aggiorna tutti i birrifici con quella città.
 *
 * Uso sul VPS:
 *   npx tsx scripts/geocode-breweries.ts
 *
 * Può essere interrotto (Ctrl+C) e ripreso in qualsiasi momento.
 */

import pg from "pg";

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
const BATCH = 50;       // location uniche per batch
const DELAY_MS = 1100;  // Nominatim: max 1 req/sec

async function sleep(ms: number) {
  return new Promise(ok => setTimeout(ok, ms));
}

async function getStats() {
  const { rows: [r1] } = await pool.query(`
    SELECT COUNT(*) AS total FROM breweries
    WHERE (latitude IS NULL OR latitude::text = '' OR latitude::text = '0')
      AND location IS NOT NULL AND TRIM(location) != ''
  `);
  const { rows: [r2] } = await pool.query(`
    SELECT COUNT(DISTINCT LOWER(TRIM(location))) AS uniq FROM breweries
    WHERE (latitude IS NULL OR latitude::text = '' OR latitude::text = '0')
      AND location IS NOT NULL AND TRIM(location) != ''
  `);
  return { total: Number(r1.total), unique: Number(r2.uniq) };
}

async function processBatch(): Promise<{ locations: number; breweries: number }> {
  const { rows } = await pool.query(`
    SELECT DISTINCT ON (LOWER(TRIM(location)))
      LOWER(TRIM(location)) AS loc_key,
      location,
      COALESCE(NULLIF(TRIM(country), ''), 'Italia') AS country
    FROM breweries
    WHERE (latitude IS NULL OR latitude::text = '' OR latitude::text = '0')
      AND location IS NOT NULL AND TRIM(location) != ''
    LIMIT $1
  `, [BATCH]);

  if (rows.length === 0) return { locations: 0, breweries: 0 };

  let updated = 0;

  for (const row of rows) {
    const q = encodeURIComponent(`${row.location}, ${row.country}`);
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&accept-language=it`,
        {
          headers: { "User-Agent": "Fermenta.to/1.0 (noreply@fermenta.to)" },
          signal: AbortSignal.timeout(8000),
        }
      );
      const data = await r.json() as any[];
      if (Array.isArray(data) && data[0]?.lat && data[0]?.lon) {
        const res = await pool.query(
          `UPDATE breweries
           SET latitude = $1, longitude = $2
           WHERE LOWER(TRIM(location)) = $3
             AND (latitude IS NULL OR latitude::text = '' OR latitude::text = '0')`,
          [data[0].lat, data[0].lon, row.loc_key]
        );
        const n = res.rowCount ?? 0;
        updated += n;
        console.log(`  ✓  ${row.location.padEnd(35)} → ${String(n).padStart(4)} birrifici`);
      } else {
        console.log(`  ✗  ${row.location.padEnd(35)} → nessun risultato`);
      }
    } catch (err: any) {
      console.log(`  !  ${row.location.padEnd(35)} → errore: ${err.message}`);
    }
    await sleep(DELAY_MS);
  }

  return { locations: rows.length, breweries: updated };
}

async function main() {
  const stats = await getStats();
  const eta = Math.ceil(stats.unique * DELAY_MS / 60000);

  console.log(`\n🍺  Fermenta.to — Geocoding Birrifici`);
  console.log(`    Birrifici senza coordinate : ${stats.total.toLocaleString()}`);
  console.log(`    Location uniche da geocod. : ${stats.unique.toLocaleString()}`);
  console.log(`    Stima tempo               : ~${eta} minuti\n`);

  if (stats.unique === 0) {
    console.log("✅ Tutti i birrifici hanno già le coordinate!");
    await pool.end();
    return;
  }

  let totalLocations = 0;
  let totalBreweries = 0;
  let batch = 0;
  const start = Date.now();

  while (true) {
    batch++;
    const done = totalLocations;
    const pct = stats.unique > 0 ? Math.round((done / stats.unique) * 100) : 0;
    const elapsed = Math.round((Date.now() - start) / 1000);
    console.log(`[Batch ${batch}]  Progresso: ${done}/${stats.unique} location (${pct}%)  —  elapsed: ${elapsed}s`);

    const result = await processBatch();
    if (result.locations === 0) break;

    totalLocations += result.locations;
    totalBreweries += result.breweries;
    console.log(`           → +${result.breweries} birrifici aggiornati (totale: ${totalBreweries})\n`);
  }

  const elapsed = Math.round((Date.now() - start) / 1000);
  console.log(`\n✅  Completato in ${elapsed}s`);
  console.log(`    Location geocodificate : ${totalLocations}`);
  console.log(`    Birrifici aggiornati   : ${totalBreweries}\n`);
  await pool.end();
}

main().catch(err => {
  console.error("Errore fatale:", err.message);
  process.exit(1);
});
