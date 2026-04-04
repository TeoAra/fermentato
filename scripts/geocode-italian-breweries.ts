/**
 * Geocode Italian breweries without GPS coordinates using OpenStreetMap Nominatim.
 * Rate limited to 1 request/second (Nominatim policy).
 *
 * Usage:
 *   npx tsx scripts/geocode-italian-breweries.ts
 *   npx tsx scripts/geocode-italian-breweries.ts --limit 200
 *   npx tsx scripts/geocode-italian-breweries.ts --dry-run
 */

import { db } from "../server/db";
import { breweries } from "../shared/schema";
import { or, eq, ilike, and, sql } from "drizzle-orm";

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const LIMIT = (() => {
  const i = args.indexOf("--limit");
  return i !== -1 ? parseInt(args[i + 1]) || 500 : 500;
})();

const SLEEP_MS = 1200; // 1.2s between requests (Nominatim: max 1 req/s)
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// Extract the most useful part of the location string for geocoding
function parseLocation(location: string | null): string | null {
  if (!location) return null;
  // Remove special markers
  if (location.includes("Non abbiamo") || location.toLowerCase().includes("online")) return null;
  // Clean up: remove ZIP codes, PO boxes etc.
  const cleaned = location
    .replace(/\b\d{5}\b/g, "") // ZIP codes
    .replace(/via\s+[^,]+,/gi, "") // street address (too specific, use city)
    .replace(/piazza\s+[^,]+,/gi, "")
    .replace(/\([A-Z]{2}\)/g, "$1") // (PD) → keep the province
    .replace(/\s+/g, " ")
    .trim();

  // Extract city/province: prefer the last meaningful segment
  const parts = cleaned.split(/,\s*/).map(p => p.trim()).filter(p => p.length > 1);
  if (parts.length === 0) return null;

  // Use city + province if available, else full string
  const city = parts[parts.length - 1] || parts[0];
  return city || cleaned;
}

async function geocode(location: string, name: string): Promise<{ lat: number; lng: number } | null> {
  const queries = [
    `${location}, Italia`,
    `${name}, Italia`,
    `${location}`,
  ];

  for (const q of queries) {
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=it`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Fermenta.to brewery geocoder (contact: admin@fermenta.to)",
          "Accept-Language": "it",
        },
      });
      if (!res.ok) continue;
      const results = await res.json() as any[];
      if (results.length > 0) {
        const { lat, lon } = results[0];
        return { lat: parseFloat(lat), lng: parseFloat(lon) };
      }
      await sleep(SLEEP_MS);
    } catch (e) {
      console.error(`  Nominatim error for "${q}":`, (e as Error).message);
      await sleep(SLEEP_MS * 2);
    }
  }
  return null;
}

async function main() {
  console.log(`🗺️  Geocoding Italian breweries without GPS`);
  console.log(`   Mode: ${DRY_RUN ? "DRY RUN (no DB writes)" : "LIVE"}`);
  console.log(`   Limit: ${LIMIT}\n`);

  // Fetch Italian breweries without valid GPS
  const rows = await db
    .select({ id: breweries.id, name: breweries.name, location: breweries.location })
    .from(breweries)
    .where(
      and(
        or(ilike(breweries.country, "Italy"), ilike(breweries.country, "Italia")),
        sql`(${breweries.latitude} IS NULL OR ${breweries.latitude}::text IN ('', '0'))`
      )
    )
    .limit(LIMIT);

  console.log(`Found ${rows.length} Italian breweries without GPS\n`);

  let found = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const locationStr = parseLocation(row.location);

    if (!locationStr) {
      console.log(`[${i + 1}/${rows.length}] ⚠️  ${row.name} — no parseable location ("${row.location}") — skip`);
      skipped++;
      continue;
    }

    process.stdout.write(`[${i + 1}/${rows.length}] ${row.name} (${locationStr}) → `);

    const coords = await geocode(locationStr, row.name);

    if (coords) {
      console.log(`✓ ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`);
      if (!DRY_RUN) {
        await db.update(breweries)
          .set({
            latitude: String(coords.lat),
            longitude: String(coords.lng),
          })
          .where(eq(breweries.id, row.id));
      }
      found++;
    } else {
      console.log(`✗ not found`);
      failed++;
    }

    await sleep(SLEEP_MS);
  }

  console.log(`\n✅ Done: ${found} geocoded, ${skipped} skipped (no location), ${failed} not found`);
  console.log(`   Total GPS breweries will increase by ~${found}`);
  process.exit(0);
}

main().catch(e => {
  console.error("Fatal:", e);
  process.exit(1);
});
