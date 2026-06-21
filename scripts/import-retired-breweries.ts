/**
 * Import RateBeer "retired" breweries → soft-archive matches in our DB.
 *
 * Source CSV: attached_assets/rb_Brewers_*.csv (RateBeer brewers dump).
 * Columns used: "Brewer Name", "Country Code", "Country Name", "Is Retired".
 *
 * Matching (two stages):
 *   1. EXACT — normalized name (lowercase, accents/punctuation stripped,
 *      "Birrificio/Birra/Le/La/Il/The/Brewery/…" prefixes + parenthetical
 *      owner removed). Country guard (on by default): when the CSV row has a
 *      known country, a DB candidate MUST have a matching country; DB rows with a
 *      missing/different country are sent to review, never auto-archived. Only a
 *      SINGLE confident exact candidate is archived on --apply — when several
 *      same-name candidates remain, they are flagged AMBIGUOUS for manual review.
 *   2. FUZZY (trigram) — for retired names with NO exact match, a Dice
 *      coefficient over character trigrams (blocked by name prefix to stay
 *      fast) finds near-matches. These are reported as AMBIGUOUS for manual
 *      review and are NEVER archived automatically (avoids false positives).
 *
 * Report: writes JSON (summary + all matched/ambiguous/unmatched) and a CSV of
 * the ambiguous candidates for admin review. Default: retired-import-report.json
 * and retired-import-ambiguous.csv in the working directory.
 *
 * Effect (only with --apply): for each EXACT-matched, currently-active brewery
 *   - breweries.is_closed = true, closed_source = 'ratebeer_import', closed_at = NOW()
 *   - cascade beers.is_discontinued = true, discontinued_source = 'ratebeer_import'
 *     (only on beers that were still active)
 * Reversible — nothing is deleted. Restore by setting the flags back to false.
 *
 * Usage:
 *   npx tsx scripts/import-retired-breweries.ts                  # dry-run (default)
 *   npx tsx scripts/import-retired-breweries.ts --apply          # write changes
 *   npx tsx scripts/import-retired-breweries.ts --file <path>    # custom CSV
 *   npx tsx scripts/import-retired-breweries.ts --no-country     # ignore country guard
 *   npx tsx scripts/import-retired-breweries.ts --threshold 0.7  # fuzzy cutoff (default 0.62)
 *   npx tsx scripts/import-retired-breweries.ts --report <path>  # custom report path
 */
import { readFileSync, readdirSync, writeFileSync } from "fs";
import { join } from "path";
import { parse } from "csv-parse/sync";
import { db, pool } from "../server/db";
import { breweries } from "../shared/schema";

// Articles / business prefixes stripped from the front of a name (repeatedly).
const PREFIXES = [
  "birrificio", "birra", "brewery", "brewing", "brauerei", "brasserie",
  "cerveceria", "cerveza", "browar", "bryggeri", "the", "le", "la", "il",
  "lo", "gli", "los", "las", "el",
];

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeName(name: string): string {
  let s = stripAccents((name || "").toLowerCase());
  s = s.replace(/\([^)]*\)/g, " ");      // parenthetical owner, e.g. "Foo (closed)"
  s = s.replace(/[^a-z0-9\s]/g, " ");    // punctuation -> space
  s = s.replace(/\s+/g, " ").trim();
  const beforePrefix = s;
  let changed = true;
  while (changed) {
    changed = false;
    for (const p of PREFIXES) {
      const re = new RegExp(`^${p}\\s+`);
      if (re.test(s)) { s = s.replace(re, "").trim(); changed = true; }
    }
  }
  // Never collapse a name down to nothing (e.g. "La Birra" -> ""): in that case
  // keep the punctuation-normalized form so we still have a usable key.
  return s.length >= 2 ? s : beforePrefix;
}

// Character trigrams (space-padded) for Dice-coefficient fuzzy matching.
function trigrams(s: string): Set<string> {
  const padded = ` ${s.replace(/\s+/g, " ")} `;
  const grams = new Set<string>();
  for (let i = 0; i < padded.length - 2; i++) grams.add(padded.slice(i, i + 3));
  return grams;
}
function dice(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const g of a) if (b.has(g)) inter++;
  return (2 * inter) / (a.size + b.size);
}
function block(norm: string): string {
  return norm.slice(0, 3);
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

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function resolveCsvPath(): string {
  const fileArg = argValue("--file");
  if (fileArg) return fileArg;
  const dir = "attached_assets";
  const candidates = readdirSync(dir).filter((f) => /rb_Brewers.*\.csv$/i.test(f));
  if (candidates.length === 0) throw new Error("No rb_Brewers*.csv found in attached_assets/");
  candidates.sort();
  return join(dir, candidates[candidates.length - 1]);
}

function csvEscape(v: unknown): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const useCountry = !process.argv.includes("--no-country");
  const threshold = parseFloat(argValue("--threshold") || "0.62");
  const reportPath = argValue("--report") || "retired-import-report.json";
  const ambiguousCsvPath = reportPath.replace(/\.json$/i, "") + "-ambiguous.csv";
  const csvPath = resolveCsvPath();

  console.log(`📄 CSV: ${csvPath}`);
  console.log(`Mode: ${apply ? "APPLY (writing)" : "DRY-RUN (no writes)"} | country guard: ${useCountry ? "on" : "off"} | fuzzy threshold: ${threshold}`);

  const raw = readFileSync(csvPath, "utf8");
  const records: any[] = parse(raw, { columns: true, skip_empty_lines: true, relax_quotes: true, relax_column_count: true });

  // Retired CSV rows: normalized name -> { countries, raw display name }.
  type RetiredEntry = { norm: string; countries: Set<string>; raw: string };
  const retired = new Map<string, RetiredEntry>();
  let retiredRows = 0;
  for (const r of records) {
    const isRetired = String(r["Is Retired"] ?? "").trim().toLowerCase() === "true";
    if (!isRetired) continue;
    retiredRows++;
    const norm = normalizeName(r["Brewer Name"]);
    if (!norm) continue;
    const ck = normalizeCountry(r["Country Code"] || r["Country Name"]) || "*";
    const existing = retired.get(norm);
    if (existing) { existing.countries.add(ck); }
    else { retired.set(norm, { norm, countries: new Set([ck]), raw: String(r["Brewer Name"] ?? "").trim() }); }
  }
  console.log(`🗂  Retired rows in CSV: ${retiredRows} (unique normalized names: ${retired.size})`);

  const all = await db.select().from(breweries);
  console.log(`🏭 Breweries in DB: ${all.length}`);

  type DbRow = { id: number; name: string; norm: string; country: string | null; isClosed: boolean | null };
  const dbRows: DbRow[] = all.map((b) => ({
    id: b.id, name: b.name, norm: normalizeName(b.name), country: b.country, isClosed: b.isClosed,
  }));

  // Index active DB breweries by normalized name (exact) and by block (fuzzy).
  const byNorm = new Map<string, DbRow[]>();
  const byBlock = new Map<string, DbRow[]>();
  for (const row of dbRows) {
    if (row.isClosed) continue;
    if (!row.norm) continue;
    (byNorm.get(row.norm) || byNorm.set(row.norm, []).get(row.norm)!).push(row);
    const bk = block(row.norm);
    (byBlock.get(bk) || byBlock.set(bk, []).get(bk)!).push(row);
  }

  const matched: { id: number; name: string; csvName: string; country: string | null }[] = [];
  const matchedIdSet = new Set<number>();
  const ambiguous: { csvName: string; csvCountry: string; dbId: number; dbName: string; dbCountry: string | null; score: number }[] = [];
  const unmatched: { csvName: string; csvCountry: string }[] = [];
  let skippedCountryMismatch = 0;

  // Precompute trigram sets lazily per DB row (cache on the object).
  const gramsCache = new Map<number, Set<string>>();
  const gramsOf = (row: DbRow): Set<string> => {
    let g = gramsCache.get(row.id);
    if (!g) { g = trigrams(row.norm); gramsCache.set(row.id, g); }
    return g;
  };

  for (const entry of retired.values()) {
    const exact = byNorm.get(entry.norm);
    let resolved = false;
    if (exact && exact.length) {
      // Known CSV countries for this retired name (drop the "*" unknown marker).
      const csvCountries = [...entry.countries].filter((c) => c !== "*");
      const csvHasCountry = csvCountries.length > 0;

      // Confident candidates. With the country guard ON, a KNOWN CSV country REQUIRES a
      // positive DB country match: DB rows with a missing/different country are NOT
      // auto-archived (they go to manual review). This stops same-name collisions across
      // countries (and rows with no country) from cascade-hiding legitimate beers.
      let confident: DbRow[];
      if (!useCountry) {
        confident = exact;
      } else if (csvHasCountry) {
        confident = exact.filter((row) => {
          const bc = normalizeCountry(row.country);
          return bc != null && csvCountries.includes(bc);
        });
      } else {
        confident = exact; // CSV country unknown → rely on the uniqueness check below
      }

      const fresh = confident.filter((row) => !matchedIdSet.has(row.id));
      if (fresh.length === 1) {
        const row = fresh[0];
        matched.push({ id: row.id, name: row.name, csvName: entry.raw, country: row.country });
        matchedIdSet.add(row.id);
        resolved = true;
      } else if (fresh.length > 1) {
        // Multiple exact same-(country) candidates → AMBIGUOUS: never auto-archive,
        // surface them in the review CSV instead.
        for (const row of fresh) {
          ambiguous.push({
            csvName: entry.raw,
            csvCountry: [...entry.countries].join("|"),
            dbId: row.id,
            dbName: row.name,
            dbCountry: row.country,
            score: 1,
          });
        }
        resolved = true;
      } else if (exact.length) {
        // Exact name existed but no confident country match → manual review only.
        skippedCountryMismatch++;
      }
    }
    if (resolved) continue;

    // Fuzzy fallback (review-only): best trigram match within the same block.
    const candidates = byBlock.get(block(entry.norm)) || [];
    const entryGrams = trigrams(entry.norm);
    let best: { row: DbRow; score: number } | null = null;
    for (const row of candidates) {
      if (matchedIdSet.has(row.id)) continue;
      const score = dice(entryGrams, gramsOf(row));
      if (score >= threshold && (!best || score > best.score)) best = { row, score };
    }
    if (best) {
      ambiguous.push({
        csvName: entry.raw,
        csvCountry: [...entry.countries].join("|"),
        dbId: best.row.id,
        dbName: best.row.name,
        dbCountry: best.row.country,
        score: Number(best.score.toFixed(3)),
      });
    } else {
      unmatched.push({ csvName: entry.raw, csvCountry: [...entry.countries].join("|") });
    }
  }

  const skippedAlreadyClosed = dbRows.filter((r) => r.isClosed).length;

  console.log(`\n✅ EXACT matches to archive: ${matched.length}`);
  console.log(`❓ AMBIGUOUS (fuzzy, review only, NOT archived): ${ambiguous.length}`);
  console.log(`🚫 UNMATCHED retired names: ${unmatched.length}`);
  console.log(`   already closed in DB: ${skippedAlreadyClosed}`);
  if (useCountry) console.log(`   exact-name hits dropped on country mismatch: ${skippedCountryMismatch}`);
  console.log(`\nSample exact matches (first 15):`);
  matched.slice(0, 15).forEach((m) => console.log(`   • ${m.name} (#${m.id})  ⇐ "${m.csvName}"`));
  console.log(`\nSample ambiguous (first 15):`);
  ambiguous.slice(0, 15).forEach((a) => console.log(`   ? "${a.csvName}" ~ ${a.dbName} (#${a.dbId})  score=${a.score}`));

  // Write review report (always — both dry-run and apply).
  const report = {
    generatedAt: new Date().toISOString(),
    csv: csvPath,
    applied: apply,
    countryGuard: useCountry,
    fuzzyThreshold: threshold,
    summary: {
      retiredRows,
      retiredUniqueNames: retired.size,
      dbBreweries: dbRows.length,
      exactMatched: matched.length,
      ambiguous: ambiguous.length,
      unmatched: unmatched.length,
      alreadyClosed: skippedAlreadyClosed,
      countryMismatchDropped: skippedCountryMismatch,
    },
    matched,
    ambiguous,
    unmatched,
  };
  writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
  const ambHeader = "csvName,csvCountry,dbId,dbName,dbCountry,score\n";
  const ambBody = ambiguous
    .map((a) => [a.csvName, a.csvCountry, a.dbId, a.dbName, a.dbCountry, a.score].map(csvEscape).join(","))
    .join("\n");
  writeFileSync(ambiguousCsvPath, ambHeader + ambBody + "\n", "utf8");
  console.log(`\n📝 Report written: ${reportPath}`);
  console.log(`📝 Ambiguous CSV (for manual review): ${ambiguousCsvPath}`);

  if (!apply) {
    console.log(`\nDRY-RUN complete. Re-run with --apply to archive the ${matched.length} EXACT matches.`);
    console.log(`(Ambiguous matches are never archived automatically — review the CSV and use the admin panel.)`);
    await pool.end();
    return;
  }

  const ids = matched.map((m) => m.id);
  if (ids.length === 0) {
    console.log(`\nNothing to apply (0 exact matches).`);
    await pool.end();
    return;
  }
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
