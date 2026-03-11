#!/usr/bin/env npx tsx
/**
 * Brewery Website Finder
 * Populates website_url for breweries using:
 *   - OpenBreweryDB (US breweries - ~8k with website URLs)
 *   - URL pattern guessing for Italian and EU breweries
 *
 * Run: npx tsx scripts/find-brewery-websites.ts [--country Italia] [--limit 500] [--no-validate]
 */

import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const DB = new Pool({ connectionString: process.env.DATABASE_URL! });

const args = process.argv.slice(2);
const COUNTRY = args.find((_, i) => args[i - 1] === "--country") ?? "all";
const LIMIT = parseInt(args.find((_, i) => args[i - 1] === "--limit") ?? "500");
const NO_VALIDATE = args.includes("--no-validate");

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[àáâã]/g, "a").replace(/[èéê]/g, "e")
    .replace(/[ìíî]/g, "i").replace(/[òóô]/g, "o")
    .replace(/[ùúû]/g, "u")
    .replace(/[^a-z0-9]/g, "");
}

function similarity(a: string, b: string): number {
  const sa = slugify(a), sb = slugify(b);
  if (sa === sb) return 1;
  const longer = sa.length > sb.length ? sa : sb;
  const shorter = sa.length > sb.length ? sb : sa;
  const maxLen = longer.length;
  if (maxLen === 0) return 1;
  let matches = 0;
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) matches++;
  }
  return (maxLen - (maxLen - matches)) / maxLen;
}

async function validateUrl(url: string): Promise<boolean> {
  if (!url || !url.startsWith("http")) return false;
  try {
    const r = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(5000), redirect: "follow" });
    return r.status < 400;
  } catch {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(5000), redirect: "follow" });
      return r.status < 400;
    } catch {
      return false;
    }
  }
}

async function fetchOpenBreweryDB(country: string): Promise<any[]> {
  const all: any[] = [];
  let page = 1;
  while (true) {
    const url = `https://api.openbrewerydb.org/v1/breweries?by_country=${encodeURIComponent(country)}&per_page=200&page=${page}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(30000) });
    const data: any[] = await r.json();
    if (!data.length) break;
    all.push(...data);
    console.log(`  OpenBreweryDB [${country}] page ${page}: ${data.length} (total: ${all.length})`);
    if (data.length < 200) break;
    page++;
    await new Promise(r => setTimeout(r, 300));
  }
  return all;
}

function guessItalianUrls(name: string): string[] {
  const full = slugify(name);
  let short = full;
  for (const prefix of ["birrificio", "birreria", "microbirrificio", "brewpub"]) {
    if (full.startsWith(prefix) && full.length > prefix.length + 3) {
      short = full.slice(prefix.length);
      break;
    }
  }
  return [
    `https://www.${full}.it`,
    `https://www.birrificio${short}.it`,
    `https://${full}.it`,
    `https://www.${short}.it`,
    `https://www.${full}.com`,
  ];
}

function guessUrlsByCountry(name: string, country: string): string[] {
  const slug = slugify(name);
  const tldMap: Record<string, string> = {
    "Germany": ".de", "Germania": ".de",
    "France": ".fr", "Francia": ".fr",
    "Belgium": ".be", "Belgio": ".be",
    "Spain": ".es", "Spagna": ".es",
    "Netherlands": ".nl", "Paesi Bassi": ".nl",
    "Austria": ".at", "Switzerland": ".ch",
    "Denmark": ".dk", "Danimarca": ".dk",
    "Sweden": ".se", "Svezia": ".se",
    "Norway": ".no", "Finland": ".fi",
    "Ireland": ".ie", "Irlanda": ".ie",
    "England": ".co.uk", "United Kingdom": ".co.uk",
    "Canada": ".ca", "Australia": ".com.au",
  };
  const tld = tldMap[country] ?? ".com";
  return [`https://www.${slug}${tld}`, `https://${slug}${tld}`, `https://www.${slug}.com`];
}

async function updateBreweryWebsite(id: number, url: string): Promise<void> {
  await DB.query(
    "UPDATE breweries SET website_url = $1 WHERE id = $2 AND (website_url IS NULL OR website_url = '')",
    [url, id]
  );
}

async function processUSBreweries(): Promise<number> {
  console.log("\n=== Processing US breweries via OpenBreweryDB ===");
  const obData = await fetchOpenBreweryDB("united_states");
  const withUrl = obData.filter(b => b.website_url);
  console.log(`Got ${obData.length} US breweries, ${withUrl.length} with website URL`);

  const { rows: ourBreweries } = await DB.query(
    "SELECT id, name FROM breweries WHERE country IN ('United States','USA') AND (website_url IS NULL OR website_url = '') LIMIT $1",
    [LIMIT]
  );
  console.log(`Our DB: ${ourBreweries.length} US breweries without website_url`);

  const obIndex = new Map<string, any>();
  for (const b of withUrl) {
    obIndex.set(slugify(b.name), b);
  }

  let matched = 0;
  for (const brewery of ourBreweries) {
    let best: any = null, bestScore = 0;
    const ourSlug = slugify(brewery.name);
    for (const [key, ob] of obIndex.entries()) {
      const score = similarity(ourSlug, key);
      if (score > bestScore) { bestScore = score; best = ob; }
    }
    if (bestScore >= 0.88 && best?.website_url) {
      if (!NO_VALIDATE && !(await validateUrl(best.website_url))) continue;
      await updateBreweryWebsite(brewery.id, best.website_url);
      matched++;
      console.log(`  ✓ ${brewery.name} → ${best.website_url} (${bestScore.toFixed(2)})`);
    }
  }
  console.log(`US matched: ${matched}`);
  return matched;
}

async function processCountry(country: string, guesser: (name: string) => string[]): Promise<number> {
  const { rows } = await DB.query(
    "SELECT id, name FROM breweries WHERE country = $1 AND (website_url IS NULL OR website_url = '') LIMIT $2",
    [country, LIMIT]
  );
  if (!rows.length) return 0;
  console.log(`\n=== [${country}] Processing ${rows.length} breweries ===`);

  let found = 0;
  for (const brewery of rows) {
    const candidates = guesser(brewery.name);
    let foundUrl: string | null = null;
    for (const url of candidates) {
      if (NO_VALIDATE || await validateUrl(url)) {
        foundUrl = url;
        break;
      }
      await new Promise(r => setTimeout(r, 100));
    }
    if (foundUrl) {
      await updateBreweryWebsite(brewery.id, foundUrl);
      found++;
      console.log(`  ✓ [${country}] ${brewery.name} → ${foundUrl}`);
    }
  }
  console.log(`[${country}] Found: ${found}/${rows.length}`);
  return found;
}

async function main() {
  console.log(`Brewery Website Finder — country=${COUNTRY}, limit=${LIMIT}, validate=${!NO_VALIDATE}`);
  let total = 0;

  const OTHER = ["Germany","France","Belgium","England","Spain","Netherlands",
                 "Denmark","Sweden","Canada","Australia","Austria","Ireland"];

  if (COUNTRY === "all" || COUNTRY === "United States") {
    total += await processUSBreweries();
  }
  if (COUNTRY === "all" || COUNTRY === "Italia" || COUNTRY === "Italy") {
    total += await processCountry("Italia", guessItalianUrls);
  }
  if (COUNTRY === "all") {
    for (const c of OTHER) {
      total += await processCountry(c, name => guessUrlsByCountry(name, c));
    }
  } else if (!["United States","Italia","Italy"].includes(COUNTRY)) {
    total += await processCountry(COUNTRY, name => guessUrlsByCountry(name, COUNTRY));
  }

  await DB.end();
  console.log(`\nDONE. Total website URLs found: ${total}`);
}

main().catch(e => { console.error(e); process.exit(1); });
