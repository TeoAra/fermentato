/**
 * Import RateBeer "retired" breweries → soft-archive matches in our DB.
 *
 * Source CSV: attached_assets/rb_Brewers_*.csv (RateBeer brewers dump).
 * Columns used: "Brewer Name", "Country Code", "Country Name", "Is Retired".
 *
 * Matching: normalized brewery name (lowercased, common prefixes/parens
 * stripped) — same normalization used by server/unify-breweries.ts. To reduce
 * false positives, an optional country match is required when both sides expose
 * a usable country value.
 *
 * Effect (only with --apply): for each matched, currently-active brewery
 *   - breweries.is_closed = true, closed_source = 'ratebeer_import', closed_at = NOW()
 *   - cascade beers.is_discontinued = true, discontinued_source = 'ratebeer_import'
 *     (only on beers that were still active)
 * Reversible — nothing is deleted. Restore by setting the flags back to false.
 *
 * Usage:
 *   npx tsx scripts/import-retired-breweries.ts                 # dry-run (default)
 *   npx tsx scripts/import-retired-breweries.ts --apply         # write changes
 *   npx tsx scripts/import-retired-breweries.ts --file <path>   # custom CSV
 *   npx tsx scripts/import-retired-breweries.ts --no-country    # ignore country guard
 */
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { parse } from "csv-parse/sync";
import { db, pool } from "../server/db";
import { breweries, beers } from "../shared/schema";
import { eq, sql } from "drizzle-orm";

function normalizeName(name: string): string {
  return (name || "")
    .toLowerCase()
    .replace(/birra\s+/i, "")
    .replace(/birrificio\s+/i, "")
    .replace(/brewery\s+/i, "")
    .replace(/brewing\s+/i, "")
    .replace(/\s*\(.*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Map free-text country to a coarse key shared by both data sets.
function normalizeCountry(c: string | null | undefined): string | null {
  if (!c) return null;
  const v = c.toLowerCase().trim();
  if (!v) return null;
  if (["it", "ita", "italy", "italia"].includes(v)) return "it";
  if (["gb", "uk", "united kingdom", "england", "scotland", "wales"].includes(v)) return "gb";
  if (["us", "usa", "united states", "united states of america"].includes(v)) return "us";
  if (["de", "germany", "deutschland", "germania"].includes(v)) return "de";
  if (["fr", "france", "francia"].includes(v)) return "fr";
  if (["es", "spain", "españa", "spagna"].includes(v)) return "es";
  if (["be", "belgium", "belgio", "belgique"].includes(v)) return "be";
  return v.slice(0, 2);
}

function resolveCsvPath(): string {
  const fileArgIdx = process.argv.indexOf("--file");
  if (fileArgIdx >= 0 && process.argv[fileArgIdx + 1]) return process.argv[fileArgIdx + 1];
  const dir = "attached_assets";
  const candidates = readdirSync(dir).filter((f) => /rb_Brewers.*\.csv$/i.test(f));
  if (candidates.length === 0) throw new Error("No rb_Brewers*.csv found in attached_assets/");
  candidates.sort();
  return join(dir, candidates[candidates.length - 1]);
}

async function main() {
  const apply = process.argv.includes("--apply");
  const useCountry = !process.argv.includes("--no-country");
  const csvPath = resolveCsvPath();

  console.log(`📄 CSV: ${csvPath}`);
  console.log(`Mode: ${apply ? "APPLY (writing)" : "DRY-RUN (no writes)"} | country guard: ${useCountry ? "on" : "off"}`);

  const raw = readFileSync(csvPath, "utf8");
  const records: any[] = parse(raw, { columns: true, skip_empty_lines: true, relax_quotes: true, relax_column_count: true });

  // Build retired set from CSV: Map<normName, Set<countryKey|"*">>
  const retired = new Map<string, Set<string>>();
  let retiredRows = 0;
  for (const r of records) {
    const isRetired = String(r["Is Retired"] ?? "").trim().toLowerCase() === "true";
    if (!isRetired) continue;
    retiredRows++;
    const key = normalizeName(r["Brewer Name"]);
    if (!key) continue;
    const ck = normalizeCountry(r["Country Code"] || r["Country Name"]) || "*";
    if (!retired.has(key)) retired.set(key, new Set());
    retired.get(key)!.add(ck);
  }
  console.log(`🗂  Retired rows in CSV: ${retiredRows} (unique normalized names: ${retired.size})`);

  const all = await db.select().from(breweries);
  console.log(`🏭 Breweries in DB: ${all.length}`);

  const matched: { id: number; name: string }[] = [];
  let skippedAlreadyClosed = 0;
  let skippedCountryMismatch = 0;

  for (const b of all) {
    if (b.isClosed) { skippedAlreadyClosed++; continue; }
    const key = normalizeName(b.name);
    const countrySet = retired.get(key);
    if (!countrySet) continue;
    if (useCountry) {
      const bc = normalizeCountry(b.country);
      // Only enforce when BOTH sides have a usable country; CSV "*" means unknown.
      if (bc && !countrySet.has("*") && !countrySet.has(bc)) {
        skippedCountryMismatch++;
        continue;
      }
    }
    matched.push({ id: b.id, name: b.name });
  }

  console.log(`\n✅ Matches to archive: ${matched.length}`);
  console.log(`   skipped (already closed): ${skippedAlreadyClosed}`);
  if (useCountry) console.log(`   skipped (country mismatch): ${skippedCountryMismatch}`);
  console.log(`\nSample (first 20):`);
  matched.slice(0, 20).forEach((m) => console.log(`   • ${m.name} (#${m.id})`));

  if (!apply) {
    console.log(`\nDRY-RUN complete. Re-run with --apply to write changes.`);
    await pool.end();
    return;
  }

  const ids = matched.map((m) => m.id);
  // Bulk updates: 2 round-trips total (id = ANY($1)) — fast for thousands of rows.
  const bRes = await pool.query(
    `UPDATE breweries SET is_closed = true, closed_source = 'ratebeer_import', closed_at = NOW()
     WHERE id = ANY($1) AND COALESCE(is_closed, false) = false`,
    [ids]
  );
  const beerRes = await pool.query(
    `UPDATE beers SET is_discontinued = true, discontinued_source = 'ratebeer_import'
     WHERE brewery_id = ANY($1) AND COALESCE(is_discontinued, false) = false`,
    [ids]
  );

  console.log(`\n🎉 Applied: ${bRes.rowCount} breweries archived, ${beerRes.rowCount} beers discontinued.`);
  await pool.end();
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
