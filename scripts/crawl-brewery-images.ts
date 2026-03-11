#!/usr/bin/env npx tsx
/**
 * Brewery Image Crawler — v2
 * Improved matching: context-based (product cards), URL slugs, JSON-LD, figcaption, headings.
 * Also extracts brewery logo from homepage.
 *
 * Run: npx tsx scripts/crawl-brewery-images.ts [--country Italia] [--limit 200] [--resume] [--logos-only]
 */

import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { v2 as cloudinary } from "cloudinary";
import * as fs from "fs";

neonConfig.webSocketConstructor = ws;

const DB = new Pool({ connectionString: process.env.DATABASE_URL! });

const args = process.argv.slice(2);
const COUNTRY = args.find((_, i) => args[i - 1] === "--country") ?? "all";
const LIMIT = parseInt(args.find((_, i) => args[i - 1] === "--limit") ?? "200");
const RESUME = args.includes("--resume");
const LOGOS_ONLY = args.includes("--logos-only");
const CHECKPOINT_FILE = "/tmp/crawl_brewery_checkpoint_v2.json";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ─── Text utilities ────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[àáâã]/g, "a").replace(/[èéê]/g, "e")
    .replace(/[ìíî]/g, "i").replace(/[òóô]/g, "o")
    .replace(/[ùúû]/g, "u")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ").trim();
}

function tokenSimilarity(a: string, b: string): number {
  const sa = slugify(a), sb = slugify(b);
  if (!sa || !sb) return 0;
  if (sa === sb) return 1;
  // Exact substring match
  if (sa.includes(sb) || sb.includes(sa)) return 0.9;
  // Token overlap (Jaccard-like)
  const ta = new Set(sa.split(" ").filter(w => w.length > 2));
  const tb = sb.split(" ").filter(w => w.length > 2);
  if (!ta.size || !tb.length) return 0;
  const overlap = tb.filter(w => ta.has(w)).length;
  return (overlap * 2) / (ta.size + tb.length);
}

function urlSlug(url: string): string {
  try {
    const p = new URL(url).pathname;
    return p.split("/").pop()?.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ") ?? "";
  } catch { return ""; }
}

// ─── Image filters ─────────────────────────────────────────────────────────

const BAD_PATTERNS = ["logo", "header", "banner", "icon", "favicon", "sprite", "background", "bg-", "placeholder", "flag", "map", "social", "facebook", "instagram", "twitter", "arrow", "cart", "basket", "menu-icon", "hamburger"];
const GOOD_PATTERNS = ["birra", "beer", "bier", "label", "etichett", "bottl", "can", "lager", "ale", "ipa", "stout", "porter", "product", "prodott", "craft"];

function isLikelyBeerImage(url: string, alt = "", title = ""): boolean {
  const u = url.toLowerCase(), a = (alt + " " + title).toLowerCase();
  if (BAD_PATTERNS.some(k => u.includes(k))) return false;
  if (GOOD_PATTERNS.some(k => u.includes(k) || a.includes(k))) return true;
  // Accept any image with dimension hints that suggest product images (not tiny icons)
  const ext = u.match(/\.(jpg|jpeg|png|webp)($|\?)/i);
  if (!ext) return false;
  // Reject tiny images by URL hints
  if (u.match(/\d+x\d+/) && u.match(/[1-9]\d?x[1-9]\d?(?!\d)/)) return false;
  return true;
}

function isBreweryLogo(url: string, alt = ""): boolean {
  const u = url.toLowerCase(), a = alt.toLowerCase();
  return u.includes("logo") || a.includes("logo") || a.includes("birrificio") || u.includes("brand");
}

// ─── HTML parsing utilities ────────────────────────────────────────────────

function resolveUrl(base: string, href: string): string | null {
  if (!href || href.startsWith("data:") || href.startsWith("javascript:")) return null;
  try { return new URL(href, base).toString(); } catch { return null; }
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/** Extract og:image, first header image, or logo as brewery logo candidate */
function extractBreweryLogoCandidates(baseUrl: string, html: string): string[] {
  const candidates: string[] = [];
  // og:image
  const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1]
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1];
  if (og) { const u = resolveUrl(baseUrl, og); if (u) candidates.push(u); }
  // img with "logo" in class/src/alt
  const logoImgs = [...html.matchAll(/<img[^>]+>/gi)];
  for (const m of logoImgs) {
    const tag = m[0];
    if (!/(class|src|alt)=["'][^"']*logo[^"']*["']/i.test(tag)) continue;
    const src = tag.match(/(?:data-src|src)=["']([^"']+)["']/i)?.[1];
    if (src) { const u = resolveUrl(baseUrl, src); if (u && !u.includes("data:")) candidates.push(u); }
  }
  return candidates;
}

/** Parse page into "product blocks" — regions of HTML containing an image + nearby text */
function extractProductBlocks(html: string): Array<{ imgTags: string[]; text: string }> {
  const blocks: Array<{ imgTags: string[]; text: string }> = [];

  // Strategy 1: <article>, <figure>, <li class="product">, <div class="*product*|*beer*|*birra*|*item*">
  const blockRe = /(<(?:article|figure|li)[^>]*>)([\s\S]*?)(<\/(?:article|figure|li)>)/gi;
  let m: RegExpExecArray | null;
  while ((m = blockRe.exec(html)) !== null) {
    const inner = m[2];
    const imgTags = [...inner.matchAll(/<img[^>]+>/gi)].map(x => x[0]);
    if (imgTags.length) blocks.push({ imgTags, text: stripTags(inner) });
  }

  // Strategy 2: divs with product/beer/item class
  const divRe = /<div[^>]+class=["'][^"']*(?:product|beer|birra|item|card|brew)[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi;
  while ((m = divRe.exec(html)) !== null) {
    const inner = m[1];
    const imgTags = [...inner.matchAll(/<img[^>]+>/gi)].map(x => x[0]);
    if (imgTags.length > 0 && inner.length < 3000) {
      blocks.push({ imgTags, text: stripTags(inner) });
    }
  }

  // Strategy 3: <a> wrapping an img (common in WooCommerce/Shopify)
  const aImgRe = /(<a[^>]+>)\s*(<img[^>]+>)\s*(<\/a>)/gi;
  while ((m = aImgRe.exec(html)) !== null) {
    const aTag = m[1], imgTag = m[2];
    const hrefMatch = aTag.match(/href=["']([^"']+)["']/i);
    const altMatch = imgTag.match(/alt=["']([^"']+)["']/i);
    const text = [hrefMatch?.[1] ?? "", altMatch?.[1] ?? ""].join(" ");
    blocks.push({ imgTags: [imgTag], text });
  }

  // Strategy 4: JSON-LD product data
  const jsonldRe = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  while ((m = jsonldRe.exec(html)) !== null) {
    try {
      const data = JSON.parse(m[1]);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        const name = item.name ?? "";
        const imgUrl = item.image?.url ?? item.image ?? "";
        if (name && imgUrl && typeof imgUrl === "string") {
          // Create synthetic block
          blocks.push({ imgTags: [`<img src="${imgUrl}" alt="${name}">`], text: name });
        }
      }
    } catch { /* ignore invalid JSON */ }
  }

  return blocks;
}

/** Find all product/beer page links to crawl */
function findProductLinks(baseUrl: string, html: string): string[] {
  const baseHost = new URL(baseUrl).host;
  const links = new Set<string>();
  const keywords = ["birr", "beer", "bier", "prodott", "product", "catalog", "shop", "menu", "birre", "beers", "store", "negozio", "acquist", "etichett"];

  const hrefMatches = [...html.matchAll(/href=["']([^"'#?][^"']*?)["']/gi)];
  for (const hm of hrefMatches) {
    const href = hm[1];
    const combined = href.toLowerCase();
    if (keywords.some(k => combined.includes(k))) {
      const full = resolveUrl(baseUrl, href);
      if (full) {
        try {
          if (new URL(full).host === baseHost) links.add(full);
        } catch { /* skip */ }
      }
    }
  }
  return [...links].slice(0, 15);
}

// ─── Core matching ─────────────────────────────────────────────────────────

interface BeerMatch {
  beerId: number;
  beerName: string;
  dbName: string;
  imageUrl: string;
  score: number;
  matchSource: string;
}

function matchBlocksToBeers(
  baseUrl: string,
  blocks: Array<{ imgTags: string[]; text: string }>,
  dbBeers: Array<{ id: number; name: string }>
): Map<number, BeerMatch> {
  const results = new Map<number, BeerMatch>();

  for (const block of blocks) {
    for (const imgTag of block.imgTags) {
      const srcMatch = imgTag.match(/(?:data-lazy-src|data-src|src)=["']([^"']+)["']/i);
      const altMatch = imgTag.match(/alt=["']([^"']+)["']/i);
      const titleMatch = imgTag.match(/title=["']([^"']+)["']/i);
      if (!srcMatch) continue;

      const rawSrc = srcMatch[1];
      const imgUrl = resolveUrl(baseUrl, rawSrc);
      if (!imgUrl || imgUrl.startsWith("data:")) continue;

      const alt = altMatch?.[1] ?? "";
      const title = titleMatch?.[1] ?? "";

      if (!isLikelyBeerImage(imgUrl, alt, title)) continue;

      // Gather text candidates to match against beer names
      const textCandidates: Array<{ text: string; source: string; bonus: number }> = [
        { text: alt, source: "alt", bonus: 0.1 },
        { text: title, source: "title", bonus: 0.05 },
        { text: block.text, source: "context", bonus: 0 },
        { text: urlSlug(imgUrl), source: "url-slug", bonus: 0 },
      ].filter(c => c.text.length > 2);

      for (const beer of dbBeers) {
        let bestScore = 0, bestSource = "";
        for (const candidate of textCandidates) {
          const score = tokenSimilarity(candidate.text, beer.name) + candidate.bonus;
          if (score > bestScore) { bestScore = score; bestSource = candidate.source; }
        }

        const threshold = bestSource === "context" ? 0.6 : 0.5;
        if (bestScore >= threshold) {
          const existing = results.get(beer.id);
          if (!existing || bestScore > existing.score) {
            results.set(beer.id, {
              beerId: beer.id,
              beerName: beer.name,
              dbName: beer.name,
              imageUrl: imgUrl,
              score: bestScore,
              matchSource: bestSource,
            });
          }
        }
      }
    }
  }

  return results;
}

// ─── HTTP utilities ────────────────────────────────────────────────────────

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
  "Accept-Encoding": "gzip, deflate, br",
};

async function fetchPage(url: string, timeoutMs = 15000): Promise<string | null> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), redirect: "follow", headers: HEADERS });
    if (!r.ok) return null;
    const ct = r.headers.get("content-type") ?? "";
    if (!ct.includes("html") && !ct.includes("text")) return null;
    return await r.text();
  } catch { return null; }
}

async function downloadImage(url: string, referer?: string): Promise<Buffer | null> {
  const headers: Record<string, string> = {
    ...HEADERS,
    "Accept": "image/webp,image/avif,image/*,*/*;q=0.8",
  };
  if (referer) headers["Referer"] = referer;

  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(15000), redirect: "follow", headers });
    if (!r.ok) return null;
    const ct = r.headers.get("content-type") ?? "";
    if (!ct.includes("image") && !url.match(/\.(jpg|jpeg|png|webp|gif|avif)($|\?)/i)) return null;
    const buf = await r.arrayBuffer();
    if (buf.byteLength < 3000) return null; // Skip tiny images (< 3KB)
    return Buffer.from(buf);
  } catch { return null; }
}

async function uploadToCloudinary(buf: Buffer, id: number, folder: string, publicId: string): Promise<string | null> {
  return new Promise((resolve) => {
    cloudinary.uploader.upload_stream(
      { folder, public_id: publicId, overwrite: false, quality: "auto:good", fetch_format: "auto" },
      (err, result) => resolve(err ? null : (result?.secure_url ?? null))
    ).end(buf);
  });
}

/** Upload image by URL — Cloudinary fetches it server-side, bypassing many CDN hotlink restrictions */
async function uploadUrlToCloudinary(url: string, id: number, folder: string, publicId: string): Promise<string | null> {
  try {
    const result = await cloudinary.uploader.upload(url, {
      folder,
      public_id: publicId,
      overwrite: false,
      quality: "auto:good",
      fetch_format: "auto",
      timeout: 20000,
    });
    return result?.secure_url ?? null;
  } catch { return null; }
}

// ─── Checkpoint ────────────────────────────────────────────────────────────

function loadDone(): Set<number> {
  try {
    if (fs.existsSync(CHECKPOINT_FILE)) {
      return new Set(JSON.parse(fs.readFileSync(CHECKPOINT_FILE, "utf8")).done ?? []);
    }
  } catch {}
  return new Set();
}

function saveDone(done: Set<number>): void {
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify({ done: [...done] }));
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  const done = RESUME ? loadDone() : new Set<number>();

  let query = `SELECT id, name, country, website_url, logo_url FROM breweries WHERE website_url IS NOT NULL AND website_url != ''`;
  const params: any[] = [];
  if (COUNTRY !== "all") { query += " AND country = $1"; params.push(COUNTRY); }
  query += ` ORDER BY id LIMIT ${LIMIT}`;

  const { rows: breweries } = await DB.query(query, params);
  console.log(`\nCrawling ${breweries.length} breweries (country=${COUNTRY}, logos-only=${LOGOS_ONLY})\n`);

  const stats = { breweries: 0, pages: 0, beerImages: 0, breweryLogos: 0, errors: 0, skipped: 0 };

  for (const brewery of breweries) {
    if (done.has(brewery.id)) { stats.skipped++; continue; }
    stats.breweries++;

    console.log(`[${stats.breweries}/${breweries.length}] ${brewery.name} → ${brewery.website_url}`);

    // Fetch homepage
    const homeHtml = await fetchPage(brewery.website_url);
    if (!homeHtml) {
      console.log(`  ✗ Site unreachable`);
      stats.errors++;
      done.add(brewery.id);
      continue;
    }
    stats.pages++;

    // ── Brewery logo ──────────────────────────────────────────────────────
    if (!brewery.logo_url) {
      const logoCandidates = extractBreweryLogoCandidates(brewery.website_url, homeHtml);
      for (const logoUrl of logoCandidates.slice(0, 3)) {
        const buf = await downloadImage(logoUrl);
        if (!buf) continue;
        const cloudUrl = await uploadToCloudinary(buf, brewery.id, "fermenta/brewery-logos", `brewery_${brewery.id}`);
        if (cloudUrl) {
          await DB.query(
            "UPDATE breweries SET logo_url = $1 WHERE id = $2 AND (logo_url IS NULL OR logo_url = '')",
            [cloudUrl, brewery.id]
          );
          stats.breweryLogos++;
          console.log(`  🏭 Logo: ${cloudUrl}`);
          break;
        }
      }
    }

    if (LOGOS_ONLY) { done.add(brewery.id); continue; }

    // ── Beer images ───────────────────────────────────────────────────────
    const { rows: dbBeers } = await DB.query(
      "SELECT id, name FROM beers WHERE brewery_id = $1 AND (logo_url IS NULL OR logo_url = '') AND (image_url IS NULL OR image_url = '')",
      [brewery.id]
    );
    if (!dbBeers.length) {
      console.log(`  ✓ All beers already have images`);
      done.add(brewery.id);
      continue;
    }
    console.log(`  ${dbBeers.length} beers need images`);

    // Discover product pages
    const productPages = [brewery.website_url, ...findProductLinks(brewery.website_url, homeHtml)];
    console.log(`  Checking ${productPages.length} pages`);

    const bestMatches = new Map<number, BeerMatch>();

    for (const pageUrl of productPages.slice(0, 12)) {
      await new Promise(r => setTimeout(r, 300));
      const html = pageUrl === brewery.website_url ? homeHtml : await fetchPage(pageUrl);
      if (!html) continue;
      if (pageUrl !== brewery.website_url) stats.pages++;

      const blocks = extractProductBlocks(html);
      const matches = matchBlocksToBeers(brewery.website_url, blocks, dbBeers);

      for (const [beerId, match] of matches) {
        const existing = bestMatches.get(beerId);
        if (!existing || match.score > existing.score) bestMatches.set(beerId, match);
      }

      if (bestMatches.size >= dbBeers.length) break; // Found all beers
    }

    console.log(`  Matched ${bestMatches.size}/${dbBeers.length} beers`);

    // Download and upload matched images
    for (const [beerId, m] of bestMatches.entries()) {
      console.log(`    ${m.dbName} (score=${m.score.toFixed(2)}, via=${m.matchSource})`);

      let cloudUrl: string | null = null;

      // Strategy 1: download buffer locally then upload
      const buf = await downloadImage(m.imageUrl, brewery.website_url);
      if (buf) {
        cloudUrl = await uploadToCloudinary(buf, beerId, "fermenta/beers", `beer_${beerId}`);
      }

      // Strategy 2: let Cloudinary fetch the URL directly (bypasses CDN hotlink protection)
      if (!cloudUrl) {
        cloudUrl = await uploadUrlToCloudinary(m.imageUrl, beerId, "fermenta/beers", `beer_${beerId}`);
        if (cloudUrl) console.log(`    (via Cloudinary fetch)`);
      }

      if (cloudUrl) {
        await DB.query(
          "UPDATE beers SET logo_url = $1 WHERE id = $2 AND (logo_url IS NULL OR logo_url = '')",
          [cloudUrl, beerId]
        );
        stats.beerImages++;
        console.log(`    ✓ → ${cloudUrl}`);
      } else {
        stats.errors++;
        console.log(`    ✗ Both download methods failed`);
      }
    }

    done.add(brewery.id);
    if (stats.breweries % 10 === 0) {
      saveDone(done);
      console.log(`\n📊 Stats: ${JSON.stringify(stats)}\n`);
    }
    await new Promise(r => setTimeout(r, 800));
  }

  saveDone(done);
  await DB.end();
  console.log(`\n✅ DONE. Stats: ${JSON.stringify(stats)}`);
}

main().catch(e => { console.error(e); process.exit(1); });
