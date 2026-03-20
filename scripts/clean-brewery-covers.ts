#!/usr/bin/env npx tsx
/**
 * clean-brewery-covers.ts
 * Clears brewery cover_image_url AND logo_url that come from external (non-Cloudinary/non-fermenta) sources.
 * These were imported from old data exports and may point to hijacked/trading domains.
 *
 * Modes:
 *   (default)       Dry run — show what would be cleared without touching the DB
 *   --execute       Actually clear the bad URLs
 *   --check-sites   Also verify each brewery website is still a beer site (slower)
 *
 * Run: DATABASE_URL=... npx tsx scripts/clean-brewery-covers.ts [--execute] [--check-sites]
 */

import pg from 'pg';

const args = process.argv.slice(2);
const DRY_RUN = !args.includes("--execute");
const CHECK_SITES = args.includes("--check-sites");

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL! });

const BEER_KEYWORDS    = ["birra", "beer", "bier", "brewery", "birrificio", "birreria", "craft", "ale", "ipa", "lager", "stout", "porter", "weizen", "pilsner", "malto", "taproom", "brewpub"];
const OFFSITE_KEYWORDS = ["trading", "forex", "investiment", "broker", "finanz", "crypto", "bitcoin", "casino", "slot", "scommess", "betting", "assicuraz", "mutuo", "prestito", "loan"];

/** Always-clear: generic stock photo placeholders (not real brewery images) */
function isPlaceholderUrl(url: string): boolean {
  return url.includes("unsplash.com") || url.includes("placeholder.com") || url.includes("placehold");
}

/** Trusted: stored on our own CDN — never clear */
function isTrustedUrl(url: string | null): boolean {
  if (!url) return true; // null/empty = nothing to clean
  return url.includes("cloudinary.com") || url.includes("fermenta");
}

/** External URL that is neither trusted nor a placeholder — check site before clearing */
function isExternalUrl(url: string | null): boolean {
  if (!url) return false;
  return !isTrustedUrl(url) && !isPlaceholderUrl(url);
}

async function checkSite(url: string): Promise<boolean> {
  try {
    const r = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Fermenta crawler)" },
    });
    if (!r.ok) return false;
    const html = (await r.text()).toLowerCase().slice(0, 50000);
    const beerScore = BEER_KEYWORDS.filter(k => html.includes(k)).length;
    const offScore  = OFFSITE_KEYWORDS.filter(k => html.includes(k)).length;
    if (offScore >= 3 && beerScore < 2) return false;
    return beerScore >= 2;
  } catch {
    return false;
  }
}

async function main() {
  console.log(`\n${"=".repeat(60)}`);
  console.log(` Brewery Image Cleaner  [${DRY_RUN ? "DRY RUN" : "EXECUTE"}${CHECK_SITES ? " + check-sites" : ""}]`);
  console.log("=".repeat(60));

  const { rows } = await pool.query<{
    id: number; name: string;
    logo_url: string | null;
    cover_image_url: string | null;
    website_url: string | null;
  }>(
    `SELECT id, name, logo_url, cover_image_url, website_url
     FROM breweries
     WHERE (logo_url IS NOT NULL AND logo_url != '')
        OR (cover_image_url IS NOT NULL AND cover_image_url != '')
     ORDER BY id`
  );

  console.log(`\nFound ${rows.length} breweries with at least one image field\n`);

  const stats = { checked: 0, clearLogo: 0, clearCover: 0, trusted: 0, errors: 0 };

  for (const row of rows) {
    let logoShouldClear  = false;
    let coverShouldClear = false;
    let logoReason  = "";
    let coverReason = "";

    // ── Logo URL ──────────────────────────────────────────────────────────
    if (row.logo_url) {
      if (isTrustedUrl(row.logo_url)) {
        stats.trusted++;
      } else if (isPlaceholderUrl(row.logo_url)) {
        // Generic stock photo — always remove
        logoShouldClear = true;
        logoReason = "generic stock photo (Unsplash placeholder)";
      } else if (isExternalUrl(row.logo_url)) {
        // Real external URL — only remove if we can confirm the site is bad
        if (CHECK_SITES && row.website_url) {
          const ok = await checkSite(row.website_url);
          if (!ok) {
            logoShouldClear = true;
            logoReason = "site is not a beer site (hijacked/trading/offline)";
          }
        }
        // Without --check-sites, leave external logos alone
      }
    }

    // ── Cover URL ─────────────────────────────────────────────────────────
    if (row.cover_image_url) {
      if (isPlaceholderUrl(row.cover_image_url)) {
        coverShouldClear = true;
        coverReason = "generic stock photo (Unsplash placeholder)";
      } else if (CHECK_SITES && row.website_url) {
        // Check the brewery website regardless of whether the image is on Cloudinary —
        // the old crawler may have scraped a trading site image and uploaded it to Cloudinary.
        const ok = await checkSite(row.website_url);
        if (!ok) {
          coverShouldClear = true;
          coverReason = "brewery website is not a beer site (hijacked/trading/offline) — image likely scraped from wrong site";
        }
      } else if (isExternalUrl(row.cover_image_url)) {
        // External non-Cloudinary without --check-sites: flag for review but don't clear
      }
    }

    if (!logoShouldClear && !coverShouldClear) continue;

    stats.checked++;
    console.log(`\n  #${row.id} ${row.name}`);
    if (logoShouldClear && row.logo_url) {
      console.log(`    logo_url    : ${row.logo_url.slice(0, 100)}`);
      console.log(`    → ${DRY_RUN ? "would clear" : "clearing"} — ${logoReason}`);
    }
    if (coverShouldClear && row.cover_image_url) {
      console.log(`    cover_image : ${row.cover_image_url.slice(0, 100)}`);
      console.log(`    → ${DRY_RUN ? "would clear" : "clearing"} — ${coverReason}`);
    }

    if (!DRY_RUN) {
      try {
        const updates: string[] = [];
        if (logoShouldClear)  updates.push("logo_url = NULL");
        if (coverShouldClear) updates.push("cover_image_url = NULL");
        if (updates.length) {
          await pool.query(`UPDATE breweries SET ${updates.join(", ")} WHERE id = $1`, [row.id]);
          if (logoShouldClear)  stats.clearLogo++;
          if (coverShouldClear) stats.clearCover++;
        }
      } catch (e) {
        console.log(`    ✗ Error: ${e}`);
        stats.errors++;
      }
    } else {
      if (logoShouldClear)  stats.clearLogo++;
      if (coverShouldClear) stats.clearCover++;
    }
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(` Stats:`);
  console.log(`   Trusted (Cloudinary/fermenta) : ${stats.trusted}`);
  console.log(`   External logos ${DRY_RUN ? "to clear" : "cleared"}      : ${stats.clearLogo}`);
  console.log(`   External covers ${DRY_RUN ? "to clear" : "cleared"}     : ${stats.clearCover}`);
  if (!DRY_RUN) console.log(`   Errors                        : ${stats.errors}`);
  if (DRY_RUN)  console.log(`\n  ⚠️  DRY RUN — run with --execute to apply changes`);
  console.log("=".repeat(60) + "\n");

  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
