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

// ─── Site relevance check ──────────────────────────────────────────────────

/** Keywords that indicate a brewery/beer site */
const BEER_SITE_KEYWORDS = ["birra", "beer", "bier", "brewery", "birrificio", "birreria", "craft", "ale", "ipa", "lager", "stout", "porter", "weizen", "pilsner", "luppolо", "malto", "taproom", "brewpub", "microbirrificio"];
/** Keywords that indicate the domain has been taken over by an unrelated business */
const OFFSITE_KEYWORDS = ["trading", "forex", "investiment", "broker", "finanz", "crypto", "bitcoin", "casino", "slot", "scommess", "betting", "assicuraz", "mutuo", "prestito", "loan", "immobili", "real estate", "seo agency", "marketing agency", "купить", "продать"];

function isBeerSite(html: string): boolean {
  const lower = html.toLowerCase().slice(0, 50000); // Check first 50KB
  const beerScore = BEER_SITE_KEYWORDS.filter(k => lower.includes(k)).length;
  const offScore = OFFSITE_KEYWORDS.filter(k => lower.includes(k)).length;
  // Must have at least 2 beer signals; reject if offsite signals dominate
  if (offScore >= 3 && beerScore < 2) return false;
  return beerScore >= 2;
}

// ─── Image filters ─────────────────────────────────────────────────────────

// Only reject images with these patterns when no positive signal compensates
const HARD_BAD = ["favicon", "sprite", "flag", "map", "facebook", "instagram", "twitter", "arrow", "cart", "basket", "hamburger", "menu-icon", "checkout", "paypal", "visa", "mastercard", "trading", "forex", "broker", "crypto", "casino", "slot", "bitcoin", "invest"];
// Soft bad — only reject if no good signal present
const SOFT_BAD = ["header", "banner", "background", "bg-", "placeholder", "placeholder"];
const GOOD_PATTERNS = ["birra", "beer", "bier", "label", "etichett", "bottl", "lager", "ale", "ipa", "stout", "porter", "product", "prodott", "craft", "can", "lattina", "fusto"];

function isLikelyBeerImage(url: string, alt = "", title = ""): boolean {
  const u = url.toLowerCase(), a = (alt + " " + title).toLowerCase();
  // Hard rejects (always)
  if (HARD_BAD.some(k => u.includes(k))) return false;
  // Must have an image extension or Cloudinary-style URL
  const hasExt = /\.(jpg|jpeg|png|webp|avif)($|\?)/i.test(u) || u.includes("cloudinary.com") || u.includes("cdn");
  if (!hasExt) return false;
  // Positive signals override soft-bad
  const hasGood = GOOD_PATTERNS.some(k => u.includes(k) || a.includes(k));
  if (hasGood) return true;
  // Soft bad without good signal → reject
  if (SOFT_BAD.some(k => u.includes(k))) return false;
  // Standalone "logo" in URL without beer context: allow it — many Italian sites name product images logo-birraXYZ.jpg
  // but reject clearly non-product logos (e.g. site logo in header)
  if ((u.includes("logo") || u.includes("brand")) && !a && !alt) return false;
  // Reject tiny images by URL dimension hints like 32x32, 16x16
  if (/[_\-](\d{1,2})x(\d{1,2})[_\-.]/.test(u)) return false;
  return true;
}

function isBreweryLogo(url: string, alt = ""): boolean {
  const u = url.toLowerCase(), a = alt.toLowerCase();
  return (u.includes("logo") || a.includes("logo") || a.includes("birrificio") || u.includes("brand")) &&
    !GOOD_PATTERNS.some(k => u.includes(k));
}

// ─── HTML parsing utilities ────────────────────────────────────────────────

function resolveUrl(base: string, href: string): string | null {
  if (!href || href.startsWith("data:") || href.startsWith("javascript:")) return null;
  try { return new URL(href, base).toString(); } catch { return null; }
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/** Extract real cover/hero photos from brewery homepage (landscape, large-format) */
function extractBreweryCoverCandidates(baseUrl: string, html: string): string[] {
  const candidates: string[] = [];
  const seen = new Set<string>();
  const add = (raw: string) => {
    const u = resolveUrl(baseUrl, raw);
    if (!u || seen.has(u) || u.includes("data:")) return;
    // Skip obvious non-photos
    const ul = u.toLowerCase();
    if (HARD_BAD.some(k => ul.includes(k))) return;
    if (/favicon|sprite|icon|logo|\.svg($|\?)/i.test(ul)) return;
    if (!/\.(jpg|jpeg|png|webp|avif)($|\?)/i.test(ul) && !ul.includes("cdn") && !ul.includes("cloudinary") && !ul.includes("wp-content")) return;
    seen.add(u);
    candidates.push(u);
  };

  // 1. og:image / twitter:image — often the best hero photo
  const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1]
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1];
  if (og) add(og);
  const tw = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)?.[1]
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i)?.[1];
  if (tw) add(tw);

  // 2. CSS background-image in style attributes (hero/banner sections)
  const bgRe = /style=["'][^"']*background(?:-image)?\s*:\s*url\(['"]?([^'")\s]+)['"]?\)/gi;
  let m: RegExpExecArray | null;
  while ((m = bgRe.exec(html)) !== null) add(m[1]);

  // 3. data-bg / data-background attributes (lazy-loaded hero images)
  const dataBgRe = /data-(?:bg|background|hero|slide-bg)=["']([^"']+)["']/gi;
  while ((m = dataBgRe.exec(html)) !== null) add(m[1]);

  // 4. Large imgs inside hero/banner/slider sections
  const sectionRe = /<(?:section|div|header)[^>]+class=["'][^"']*(?:hero|banner|slider|carousel|cover|jumbotron|showcase|intro|splash|masthead)[^"']*["'][^>]*>([\s\S]{0,8000}?)<\/(?:section|div|header)>/gi;
  while ((m = sectionRe.exec(html)) !== null) {
    const inner = m[1];
    for (const imgM of inner.matchAll(/<img[^>]+>/gi)) {
      const tag = normalizeImgTag(imgM[0]);
      const src = tag.match(/\bsrc=["']([^"']+)["']/i)?.[1];
      if (src) add(src);
      // Also check srcset for largest image
      const srcset = tag.match(/\bsrcset=["']([^"']+)["']/i)?.[1];
      if (srcset) {
        const best = srcset.split(",").map(s => s.trim().split(/\s+/)).reduce((a, b) => parseInt(b[1]??'0') > parseInt(a[1]??'0') ? b : a);
        if (best[0]) add(best[0]);
      }
    }
  }

  // 5. Images with large explicit dimensions (width >= 600)
  const imgRe = /<img[^>]+>/gi;
  while ((m = imgRe.exec(html)) !== null) {
    const tag = normalizeImgTag(m[0]);
    const wMatch = tag.match(/\bwidth=["']?(\d+)["']?/i);
    if (wMatch && parseInt(wMatch[1]) >= 600) {
      const src = tag.match(/\bsrc=["']([^"']+)["']/i)?.[1];
      if (src) add(src);
    }
  }

  return candidates.slice(0, 6);
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

/** Normalize a lazy-loaded img tag so all src variants are captured */
function normalizeImgTag(tag: string): string {
  // Promote data-src / data-lazy-src / data-original / data-image / data-lazy into src="" if src is empty/placeholder
  const srcVal = tag.match(/\bsrc=["']([^"']+)["']/i)?.[1] ?? "";
  const isPlaceholder = !srcVal || srcVal.startsWith("data:") || srcVal.includes("placeholder") || srcVal.includes("blank.gif") || srcVal.includes("transparent");
  if (isPlaceholder) {
    // Try in priority order
    const lazySrc =
      tag.match(/\bdata-lazy-src=["']([^"']+)["']/i)?.[1] ??
      tag.match(/\bdata-src=["']([^"']+)["']/i)?.[1] ??
      tag.match(/\bdata-original=["']([^"']+)["']/i)?.[1] ??
      tag.match(/\bdata-image=["']([^"']+)["']/i)?.[1] ??
      tag.match(/\bdata-lazy=["']([^"']+)["']/i)?.[1] ??
      tag.match(/\bdata-lazy-load=["']([^"']+)["']/i)?.[1] ??
      tag.match(/\bdata-bg=["']([^"']+)["']/i)?.[1];
    if (lazySrc) tag = tag.replace(/\bsrc=["'][^"']*["']/i, `src="${lazySrc}"`);
  }
  // Also promote best srcset candidate (highest width)
  if (!tag.match(/\bsrc=["'][^"']{4,}["']/i)) {
    const srcset = tag.match(/\bsrcset=["']([^"']+)["']/i)?.[1];
    if (srcset) {
      const best = srcset.split(",").map(s => s.trim().split(/\s+/)).reduce((a, b) => {
        const aw = parseInt(a[1] ?? "0"), bw = parseInt(b[1] ?? "0");
        return bw > aw ? b : a;
      });
      if (best[0]) tag = tag.replace(/\bsrc=["'][^"']*["']/i, `src="${best[0]}"`);
    }
  }
  return tag;
}

/** Parse page into "product blocks" — regions of HTML containing an image + nearby text */
function extractProductBlocks(html: string): Array<{ imgTags: string[]; text: string }> {
  const blocks: Array<{ imgTags: string[]; text: string }> = [];
  const seen = new Set<string>(); // avoid duplicate img URLs

  const addBlock = (imgTags: string[], text: string) => {
    const normalized = imgTags.map(normalizeImgTag);
    const fresh = normalized.filter(t => {
      const u = t.match(/\bsrc=["']([^"']+)["']/i)?.[1] ?? "";
      if (!u || seen.has(u)) return false;
      seen.add(u);
      return true;
    });
    if (fresh.length) blocks.push({ imgTags: fresh, text });
  };

  let m: RegExpExecArray | null;

  // Strategy 1: <article>, <figure>, <li> blocks
  const blockRe = /(<(?:article|figure|li)[^>]*>)([\s\S]*?)(<\/(?:article|figure|li)>)/gi;
  while ((m = blockRe.exec(html)) !== null) {
    const inner = m[2];
    const imgTags = [...inner.matchAll(/<img[^>]+>/gi)].map(x => x[0]);
    if (imgTags.length) addBlock(imgTags, stripTags(inner));
  }

  // Strategy 2: divs with product/beer/item class (limit inner size to avoid whole-page capture)
  const divRe = /<div[^>]+class=["'][^"']*(?:product|beer|birra|item|card|brew|bottle|lattina)[^"']*["'][^>]*>([\s\S]{0,4000}?)<\/div>/gi;
  while ((m = divRe.exec(html)) !== null) {
    const inner = m[1];
    const imgTags = [...inner.matchAll(/<img[^>]+>/gi)].map(x => x[0]);
    if (imgTags.length) addBlock(imgTags, stripTags(inner));
  }

  // Strategy 3: <a> wrapping an img (common in WooCommerce/Shopify)
  const aImgRe = /(<a[^>]+>)\s*(<img[^>]+>)\s*(<\/a>)/gi;
  while ((m = aImgRe.exec(html)) !== null) {
    const aTag = m[1], imgTag = m[2];
    const hrefMatch = aTag.match(/href=["']([^"']+)["']/i);
    const altMatch = imgTag.match(/alt=["']([^"']+)["']/i);
    const titleMatch = aTag.match(/title=["']([^"']+)["']/i);
    const text = [hrefMatch?.[1] ?? "", altMatch?.[1] ?? "", titleMatch?.[1] ?? ""].join(" ");
    addBlock([imgTag], text);
  }

  // Strategy 4: JSON-LD product data
  const jsonldRe = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  while ((m = jsonldRe.exec(html)) !== null) {
    try {
      const data = JSON.parse(m[1]);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        const name = item.name ?? "";
        const rawImg = item.image?.url ?? (Array.isArray(item.image) ? item.image[0] : item.image) ?? "";
        const imgUrl = typeof rawImg === "string" ? rawImg : "";
        if (name && imgUrl) {
          addBlock([`<img src="${imgUrl}" alt="${name}">`], name);
        }
      }
    } catch { /* ignore invalid JSON */ }
  }

  // Strategy 5: standalone <img> tags NOT already in a block (last resort)
  const allImgs = [...html.matchAll(/<img[^>]+>/gi)].map(x => x[0]);
  for (const imgTag of allImgs) {
    const norm = normalizeImgTag(imgTag);
    const u = norm.match(/\bsrc=["']([^"']+)["']/i)?.[1] ?? "";
    if (u && !seen.has(u)) {
      const alt = imgTag.match(/alt=["']([^"']+)["']/i)?.[1] ?? "";
      seen.add(u);
      blocks.push({ imgTags: [norm], text: alt });
    }
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
  dbBeers: Array<{ id: number; name: string }>,
  verbose = false
): Map<number, BeerMatch> {
  const results = new Map<number, BeerMatch>();
  let consideredImgs = 0, rejectedFilter = 0;

  for (const block of blocks) {
    for (const imgTag of block.imgTags) {
      const srcMatch = imgTag.match(/\bsrc=["']([^"']+)["']/i);
      const altMatch = imgTag.match(/\balt=["']([^"']+)["']/i);
      const titleMatch = imgTag.match(/\btitle=["']([^"']+)["']/i);
      if (!srcMatch) continue;

      const rawSrc = srcMatch[1];
      if (rawSrc.startsWith("data:")) continue;
      const imgUrl = resolveUrl(baseUrl, rawSrc);
      if (!imgUrl) continue;

      const alt = altMatch?.[1] ?? "";
      const title = titleMatch?.[1] ?? "";

      consideredImgs++;
      if (!isLikelyBeerImage(imgUrl, alt, title)) {
        rejectedFilter++;
        continue;
      }

      // Gather text candidates to match against beer names
      const slug = urlSlug(imgUrl);
      const textCandidates: Array<{ text: string; source: string; bonus: number }> = [
        { text: alt, source: "alt", bonus: 0.15 },
        { text: title, source: "title", bonus: 0.1 },
        { text: slug, source: "url-slug", bonus: 0.05 },
        { text: block.text, source: "context", bonus: 0 },
      ].filter(c => c.text.length > 1);

      for (const beer of dbBeers) {
        let bestScore = 0, bestSource = "";
        for (const candidate of textCandidates) {
          const score = tokenSimilarity(candidate.text, beer.name) + candidate.bonus;
          if (score > bestScore) { bestScore = score; bestSource = candidate.source; }
        }

        // Lower threshold — 0.35 for named sources (alt/title/url), 0.45 for context
        const threshold = bestSource === "context" ? 0.45 : 0.35;
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

  if (verbose) {
    console.log(`    [debug] blocks=${blocks.length} imgs_considered=${consideredImgs} rejected_by_filter=${rejectedFilter} matched=${results.size}`);
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

  let query = `SELECT id, name, country, website_url, logo_url, cover_image_url FROM breweries WHERE website_url IS NOT NULL AND website_url != ''`;
  const params: any[] = [];
  if (COUNTRY !== "all") { query += " AND country = $1"; params.push(COUNTRY); }
  query += ` ORDER BY id LIMIT ${LIMIT}`;

  const { rows: breweries } = await DB.query(query, params);
  console.log(`\nCrawling ${breweries.length} breweries (country=${COUNTRY}, logos-only=${LOGOS_ONLY})\n`);

  const stats = { breweries: 0, pages: 0, beerImages: 0, breweryLogos: 0, breweryCovers: 0, offsite: 0, errors: 0, skipped: 0 };

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

    // ── Offsite / domain-hijack detection ─────────────────────────────────
    if (!isBeerSite(homeHtml)) {
      console.log(`  ⚠️  Not a beer site (trading/forex/other) — skipping`);
      stats.offsite++;
      done.add(brewery.id);
      continue;
    }

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

    // ── Brewery cover photo ───────────────────────────────────────────────
    if (!brewery.cover_image_url) {
      const coverCandidates = extractBreweryCoverCandidates(brewery.website_url, homeHtml);
      for (const coverUrl of coverCandidates) {
        const buf = await downloadImage(coverUrl, brewery.website_url);
        if (!buf || buf.byteLength < 20000) continue; // Skip tiny images (< 20KB — likely not a real photo)
        const cloudUrl = await uploadToCloudinary(buf, brewery.id, "fermenta/brewery-covers", `brewery_cover_${brewery.id}`);
        if (cloudUrl) {
          await DB.query(
            "UPDATE breweries SET cover_image_url = $1 WHERE id = $2 AND (cover_image_url IS NULL OR cover_image_url = '')",
            [cloudUrl, brewery.id]
          );
          stats.breweryCovers++;
          console.log(`  🖼️  Cover: ${cloudUrl}`);
          break;
        }
        // Fallback: let Cloudinary fetch it directly
        const cloudUrl2 = await uploadUrlToCloudinary(coverUrl, brewery.id, "fermenta/brewery-covers", `brewery_cover_${brewery.id}`);
        if (cloudUrl2) {
          await DB.query(
            "UPDATE breweries SET cover_image_url = $1 WHERE id = $2 AND (cover_image_url IS NULL OR cover_image_url = '')",
            [cloudUrl2, brewery.id]
          );
          stats.breweryCovers++;
          console.log(`  🖼️  Cover (via Cloudinary fetch): ${cloudUrl2}`);
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
      const matches = matchBlocksToBeers(brewery.website_url, blocks, dbBeers, true);

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
