#!/usr/bin/env npx tsx
/**
 * Brewery Image Crawler
 * Crawls brewery websites to find beer product images.
 * Requires website_url to be set (run find-brewery-websites.ts first).
 *
 * Run: npx tsx scripts/crawl-brewery-images.ts [--country Italia] [--limit 200] [--resume]
 */

import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { v2 as cloudinary } from "cloudinary";
import * as fs from "fs";
import * as path from "path";

neonConfig.webSocketConstructor = ws;

const DB = new Pool({ connectionString: process.env.DATABASE_URL! });

const args = process.argv.slice(2);
const COUNTRY = args.find((_, i) => args[i - 1] === "--country") ?? "all";
const LIMIT = parseInt(args.find((_, i) => args[i - 1] === "--limit") ?? "200");
const RESUME = args.includes("--resume");
const CHECKPOINT_FILE = "/tmp/crawl_brewery_checkpoint.json";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[àáâã]/g, "a").replace(/[èéê]/g, "e")
    .replace(/[ìíî]/g, "i").replace(/[òóô]/g, "o")
    .replace(/[ùúû]/g, "u")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ").trim();
}

function similarity(a: string, b: string): number {
  const sa = slugify(a), sb = slugify(b);
  if (sa === sb) return 1;
  if (!sa || !sb) return 0;
  const aWords = new Set(sa.split(" "));
  const bWords = sb.split(" ");
  const overlap = bWords.filter(w => aWords.has(w)).length;
  return (overlap * 2) / (aWords.size + bWords.length);
}

function isBeerImage(url: string, alt = ""): boolean {
  const u = url.toLowerCase(), a = alt.toLowerCase();
  const bad = ["logo", "header", "banner", "icon", "avatar", "background", "sprite", "flag", "map"];
  const good = ["birra", "beer", "bier", "label", "etichett", "bottl", "lager", "ale", "ipa", "stout"];
  if (bad.some(k => u.includes(k) || a.includes(k))) return false;
  if (good.some(k => u.includes(k) || a.includes(k))) return true;
  return !u.includes("logo");
}

function resolveUrl(base: string, href: string): string | null {
  try { return new URL(href, base).toString(); } catch { return null; }
}

function findProductLinks(baseUrl: string, html: string): string[] {
  const baseHost = new URL(baseUrl).host;
  const links = new Set<string>();
  const keywords = ["birr", "beer", "bier", "prodott", "product", "catalog", "shop", "menu", "birre", "beers"];
  const hrefs = [...html.matchAll(/href=["']([^"']+)["']/gi)].map(m => m[1]);
  const texts = html.match(/<a[^>]*>([\s\S]*?)<\/a>/gi) ?? [];

  for (let i = 0; i < hrefs.length; i++) {
    const href = hrefs[i];
    const text = (texts[i] ?? "").replace(/<[^>]+>/g, "").toLowerCase();
    const combined = (href + " " + text).toLowerCase();
    if (keywords.some(k => combined.includes(k))) {
      const full = resolveUrl(baseUrl, href);
      if (full && new URL(full).host === baseHost) links.add(full);
    }
  }
  return [...links].slice(0, 12);
}

function extractBeerImages(baseUrl: string, html: string, dbBeers: Array<{id: number; name: string}>): Array<{beerId: number; beerName: string; dbName: string; imageUrl: string; score: number}> {
  const results: Array<{beerId: number; beerName: string; dbName: string; imageUrl: string; score: number}> = [];
  const seen = new Set<number>();

  function tryMatch(name: string, imgUrl: string): void {
    let best: {id: number; name: string} | null = null, bestScore = 0;
    for (const beer of dbBeers) {
      const score = similarity(name, beer.name);
      if (score > bestScore) { bestScore = score; best = beer; }
    }
    if (best && bestScore >= 0.65 && !seen.has(best.id)) {
      seen.add(best.id);
      results.push({ beerId: best.id, beerName: name, dbName: best.name, imageUrl: imgUrl, score: bestScore });
    }
  }

  // Extract all img tags with src and optional alt/title nearby
  const imgMatches = [...html.matchAll(/<img[^>]+>/gi)];
  for (const m of imgMatches) {
    const tag = m[0];
    const srcMatch = tag.match(/(?:data-src|data-lazy-src|src)=["']([^"']+)["']/i);
    const altMatch = tag.match(/alt=["']([^"']+)["']/i);
    if (!srcMatch) continue;
    const imgUrl = resolveUrl(baseUrl, srcMatch[1]);
    const alt = altMatch?.[1] ?? "";
    if (!imgUrl || !isBeerImage(imgUrl, alt)) continue;

    // Try alt as beer name
    if (alt && alt.length > 2) tryMatch(alt, imgUrl);
  }

  return results;
}

async function downloadImage(url: string): Promise<Buffer | null> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(12000), redirect: "follow" });
    if (!r.ok) return null;
    const ct = r.headers.get("content-type") ?? "";
    if (!ct.includes("image") && !url.match(/\.(jpg|jpeg|png|webp|gif)($|\?)/i)) return null;
    const buf = await r.arrayBuffer();
    return buf.byteLength > 2000 ? Buffer.from(buf) : null;
  } catch {
    return null;
  }
}

async function uploadToCloudinary(imageBuffer: Buffer, beerId: number): Promise<string | null> {
  return new Promise((resolve) => {
    cloudinary.uploader.upload_stream(
      { folder: "fermenta/beers", public_id: `beer_${beerId}`, overwrite: false, quality: "auto:good", fetch_format: "auto" },
      (err, result) => resolve(err ? null : (result?.secure_url ?? null))
    ).end(imageBuffer);
  });
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const r = await fetch(url, {
      signal: AbortSignal.timeout(12000),
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0",
        "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "it-IT,it;q=0.9,en;q=0.7",
      },
    });
    if (!r.ok) return null;
    return await r.text();
  } catch {
    return null;
  }
}

function loadDone(): Set<number> {
  try {
    if (fs.existsSync(CHECKPOINT_FILE)) {
      const data = JSON.parse(fs.readFileSync(CHECKPOINT_FILE, "utf8"));
      return new Set(data.done ?? []);
    }
  } catch {}
  return new Set();
}

function saveDone(done: Set<number>): void {
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify({ done: [...done] }));
}

async function main() {
  const done = RESUME ? loadDone() : new Set<number>();

  let query = "SELECT id, name, country, website_url FROM breweries WHERE website_url IS NOT NULL AND website_url != ''";
  const params: any[] = [];
  if (COUNTRY !== "all") {
    query += " AND country = $1";
    params.push(COUNTRY);
  }
  query += ` LIMIT ${LIMIT}`;

  const { rows: breweries } = await DB.query(query, params);
  console.log(`Crawling ${breweries.length} breweries (country=${COUNTRY})`);

  const stats = { breweries: 0, pages: 0, images: 0, errors: 0 };

  for (const brewery of breweries) {
    if (done.has(brewery.id)) continue;
    stats.breweries++;
    console.log(`\n[${stats.breweries}/${breweries.length}] ${brewery.name} (${brewery.country}) → ${brewery.website_url}`);

    const { rows: dbBeers } = await DB.query(
      "SELECT id, name FROM beers WHERE brewery_id = $1 AND (logo_url IS NULL OR logo_url = '')",
      [brewery.id]
    );
    if (!dbBeers.length) { done.add(brewery.id); continue; }
    console.log(`  ${dbBeers.length} beers need images`);

    const homeHtml = await fetchPage(brewery.website_url);
    if (!homeHtml) { stats.errors++; done.add(brewery.id); continue; }
    stats.pages++;

    const productPages = [brewery.website_url, ...findProductLinks(brewery.website_url, homeHtml)];
    console.log(`  Found ${productPages.length} pages to check`);

    const bestMatches = new Map<number, {beerId: number; beerName: string; dbName: string; imageUrl: string; score: number}>();

    for (const pageUrl of productPages.slice(0, 8)) {
      await new Promise(r => setTimeout(r, 400));
      const html = pageUrl === brewery.website_url ? homeHtml : await fetchPage(pageUrl);
      if (!html) continue;
      if (pageUrl !== brewery.website_url) stats.pages++;

      const matches = extractBeerImages(brewery.website_url, html, dbBeers);
      for (const m of matches) {
        const existing = bestMatches.get(m.beerId);
        if (!existing || m.score > existing.score) bestMatches.set(m.beerId, m);
      }
    }

    console.log(`  Matched ${bestMatches.size} beers with potential images`);

    for (const [beerId, m] of bestMatches.entries()) {
      const imgBuf = await downloadImage(m.imageUrl);
      if (!imgBuf) { console.log(`    ✗ Download failed: ${m.imageUrl.slice(0, 60)}`); continue; }

      const cloudUrl = await uploadToCloudinary(imgBuf, beerId);
      if (cloudUrl) {
        await DB.query(
          "UPDATE beers SET logo_url = $1 WHERE id = $2 AND (logo_url IS NULL OR logo_url = '')",
          [cloudUrl, beerId]
        );
        stats.images++;
        console.log(`    ✓ ${m.dbName} → ${cloudUrl}`);
      } else {
        stats.errors++;
      }
    }

    done.add(brewery.id);
    if (stats.breweries % 20 === 0) { saveDone(done); console.log(`Stats: ${JSON.stringify(stats)}`); }
    await new Promise(r => setTimeout(r, 1000));
  }

  saveDone(done);
  await DB.end();
  console.log(`\nDONE. Stats: ${JSON.stringify(stats)}`);
}

main().catch(e => { console.error(e); process.exit(1); });
