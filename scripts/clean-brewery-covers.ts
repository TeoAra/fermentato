#!/usr/bin/env npx tsx
/**
 * clean-brewery-covers.ts
 * Clears brewery cover_image_url that come from external (non-Cloudinary) sources.
 * These were imported from old data exports and may point to hijacked/trading domains.
 *
 * Modes:
 *   --dry-run       Show what would be cleared without touching the DB (default)
 *   --execute       Actually clear the bad cover URLs
 *   --check-sites   Also verify each URL is still a beer site (slower, more accurate)
 *
 * Run: DATABASE_URL=... npx tsx scripts/clean-brewery-covers.ts [--execute] [--check-sites]
 */

import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const DB = new Pool({ connectionString: process.env.DATABASE_URL! });

const args = process.argv.slice(2);
const DRY_RUN = !args.includes("--execute");
const CHECK_SITES = args.includes("--check-sites");

const BEER_SITE_KEYWORDS = ["birra", "beer", "bier", "brewery", "birrificio", "birreria", "craft", "ale", "ipa", "lager", "stout", "porter", "weizen", "pilsner", "malto", "taproom", "brewpub", "microbirrificio"];
const OFFSITE_KEYWORDS   = ["trading", "forex", "investiment", "broker", "finanz", "crypto", "bitcoin", "casino", "slot", "scommess", "betting", "assicuraz", "mutuo", "prestito", "loan", "immobili", "real estate"];

async function isBeerSite(url: string): Promise<boolean> {
  try {
    const r = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Fermenta crawler)" },
    });
    if (!r.ok) return false;
    const html = (await r.text()).toLowerCase().slice(0, 50000);
    const beerScore = BEER_SITE_KEYWORDS.filter(k => html.includes(k)).length;
    const offScore  = OFFSITE_KEYWORDS.filter(k => html.includes(k)).length;
    if (offScore >= 3 && beerScore < 2) return false;
    return beerScore >= 2;
  } catch {
    return false;
  }
}

async function main() {
  console.log(`\n${"=".repeat(60)}`);
  console.log(` Brewery Cover Cleaner  [${DRY_RUN ? "DRY RUN" : "EXECUTE"}${CHECK_SITES ? " + check-sites" : ""}]`);
  console.log("=".repeat(60));

  const { rows } = await DB.query<{ id: number; name: string; cover_image_url: string; website_url: string }>(
    `SELECT id, name, cover_image_url, website_url
     FROM breweries
     WHERE cover_image_url IS NOT NULL AND cover_image_url != ''
     ORDER BY id`
  );

  console.log(`\nFound ${rows.length} breweries with cover_image_url\n`);

  const stats = { total: rows.length, trusted: 0, cleared: 0, ok: 0, errors: 0 };

  for (const row of rows) {
    const isTrusted = row.cover_image_url.includes("cloudinary.com") || row.cover_image_url.includes("fermenta");

    if (isTrusted) {
      stats.trusted++;
      continue;
    }

    // External URL — suspect (from old import)
    let shouldClear = true;
    let reason = "external (non-Cloudinary) URL from old import";

    if (CHECK_SITES && row.website_url) {
      const ok = await isBeerSite(row.website_url);
      if (ok) {
        shouldClear = false;
        reason = "site still valid beer site";
        stats.ok++;
      } else {
        reason = "site is not a beer site (hijacked/offline)";
      }
    }

    if (shouldClear) {
      console.log(`  ${DRY_RUN ? "[would clear]" : "[clearing]"} #${row.id} ${row.name}`);
      console.log(`    cover: ${row.cover_image_url.slice(0, 80)}...`);
      console.log(`    reason: ${reason}`);

      if (!DRY_RUN) {
        try {
          await DB.query("UPDATE breweries SET cover_image_url = NULL WHERE id = $1", [row.id]);
          stats.cleared++;
        } catch (e) {
          console.log(`    ✗ Error: ${e}`);
          stats.errors++;
        }
      } else {
        stats.cleared++;
      }
    } else {
      console.log(`  [keep] #${row.id} ${row.name} — ${reason}`);
    }
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(` Stats:`);
  console.log(`   Total covers found : ${stats.total}`);
  console.log(`   Trusted (Cloudinary): ${stats.trusted}`);
  console.log(`   ${DRY_RUN ? "Would clear" : "Cleared"}         : ${stats.cleared}`);
  if (CHECK_SITES) console.log(`   Still valid beer   : ${stats.ok}`);
  if (!DRY_RUN) console.log(`   Errors             : ${stats.errors}`);
  if (DRY_RUN) console.log(`\n  ⚠️  DRY RUN — run with --execute to apply changes`);
  console.log("=".repeat(60) + "\n");

  await DB.end();
}

main().catch(e => { console.error(e); process.exit(1); });
