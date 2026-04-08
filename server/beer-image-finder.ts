/**
 * Beer Image Finder — finds the best web image for a beer after scan confirmation.
 *
 * Strategy (in order):
 *  1. Gemini + Google Search grounding → top Google result pages → og:image
 *  2. Brewery website og:image (official product photo)
 *  3. DuckDuckGo image search (free, no API key, fallback)
 *  4. Gemini Vision picks the best match from all candidates
 *  5. Upload winner to Cloudinary + update beers.image_url
 *
 * The function is fire-and-forget: call without await in confirmation handler.
 */

import { v2 as cloudinary } from "cloudinary";
import { pool } from "./db";

const GEMINI_API_KEY = () => process.env.GEMINI_API_KEY ?? "";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

// ─── 1. Google Search via Gemini grounding ────────────────────────────────────
// Uses the google_search tool included in Gemini — no extra API key needed.
// Returns the top Google result page URLs for the query.

async function googleViaGeminiGrounding(beerName: string, breweryName: string): Promise<string[]> {
  const key = GEMINI_API_KEY();
  if (!key) return [];

  const query = `${beerName} ${breweryName} birra artigianale medaglione etichetta`;

  try {
    const res = await fetch(`${GEMINI_URL}?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Cerca immagini del medaglione o etichetta rotonda della birra: ${query}` }] }],
        tools: [{ google_search: {} }],
        generationConfig: { temperature: 0, maxOutputTokens: 64 },
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return [];
    const data: any = await res.json();

    // Grounding metadata contains the actual Google result page URLs
    const chunks: any[] = data?.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
    const urls = chunks
      .map((c: any) => c.web?.uri)
      .filter((u: any) => typeof u === "string" && u.startsWith("http") && !u.includes("google.com"));

    console.log(`[beer-img] google grounding found ${urls.length} pages for "${beerName}"`);
    return urls.slice(0, 6);
  } catch (e: any) {
    console.warn(`[beer-img] gemini grounding error: ${e?.message?.substring(0, 60)}`);
    return [];
  }
}

// ─── Extract og:image from a list of page URLs ────────────────────────────────

async function extractOgImages(pageUrls: string[]): Promise<string[]> {
  const images: string[] = [];
  await Promise.allSettled(pageUrls.map(async (url) => {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; Fermentato-Bot/1.0; +https://fermenta.to)" },
        signal: AbortSignal.timeout(7000),
      });
      if (!res.ok) return;
      const html = await res.text();
      const ogImg =
        html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
        html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1];
      if (ogImg && ogImg.startsWith("http")) images.push(ogImg);
    } catch { /* skip */ }
  }));
  return images;
}

// ─── 2. Brewery website og:image ─────────────────────────────────────────────

async function fetchBreweryOgImage(websiteUrl: string, beerName: string): Promise<string | null> {
  if (!websiteUrl?.startsWith("http")) return null;
  const base = websiteUrl.replace(/\/$/, "");

  const slug = beerName.toLowerCase()
    .replace(/[àáâã]/g, "a").replace(/[èéê]/g, "e").replace(/[ìíî]/g, "i")
    .replace(/[òóô]/g, "o").replace(/[ùúû]/g, "u").replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-").replace(/^-|-$/g, "");
  const beerWords = slug.split("-").filter(w => w.length > 2);

  const urlsToTry = [
    base,
    `${base}/birre`,
    `${base}/beers`,
    `${base}/le-nostre-birre`,
    `${base}/prodotti`,
    `${base}/birre/${slug}`,
    `${base}/beer/${slug}`,
  ];

  for (const url of urlsToTry) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; Fermentato-Bot/1.0)" },
        signal: AbortSignal.timeout(7000),
      });
      if (!res.ok) continue;
      const html = await res.text();

      const ogTitle =
        html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
        html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i)?.[1] ?? "";
      const titleWords = ogTitle.toLowerCase();
      const matchScore = beerWords.filter(w => titleWords.includes(w)).length / Math.max(beerWords.length, 1);

      const ogImage =
        html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
        html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1];

      if (matchScore >= 0.5 && ogImage) return ogImage;

      // Follow links to beer-specific product page
      if (matchScore < 0.3) {
        const linkRe = /<a[^>]+href=["']([^"'#?]+)["'][^>]*>([^<]{1,80})<\/a>/gi;
        let m: RegExpExecArray | null;
        const links: Array<{ url: string; score: number }> = [];
        while ((m = linkRe.exec(html)) !== null) {
          const href = m[1], text = m[2].toLowerCase();
          if (!href || href.startsWith("javascript:")) continue;
          const fullUrl = href.startsWith("http") ? href : `${base}${href.startsWith("/") ? "" : "/"}${href}`;
          if (!fullUrl.startsWith(base)) continue;
          const score = beerWords.filter(w => text.includes(w) || fullUrl.toLowerCase().includes(w)).length;
          if (score > 0) links.push({ url: fullUrl, score });
        }
        links.sort((a, b) => b.score - a.score);
        for (const link of links.slice(0, 2)) {
          try {
            const pg = await fetch(link.url, {
              headers: { "User-Agent": "Mozilla/5.0" },
              signal: AbortSignal.timeout(6000),
            });
            if (!pg.ok) continue;
            const pgHtml = await pg.text();
            const pgOg =
              pgHtml.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
              pgHtml.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1];
            if (pgOg) return pgOg;
          } catch { continue; }
        }
      }
    } catch { continue; }
  }
  return null;
}

// ─── 3. DuckDuckGo image search ──────────────────────────────────────────────

// DuckDuckGo image result: `image` is the direct image URL, `url` is the source page
interface DdgImage { image: string; url: string; width: number; height: number; }

async function ddgSearchImages(query: string, limit = 8): Promise<DdgImage[]> {
  try {
    const pageRes = await fetch(
      `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`,
      { headers: { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36" }, signal: AbortSignal.timeout(8000) }
    );
    if (!pageRes.ok) return [];
    const html = await pageRes.text();
    const vqd = html.match(/vqd=['"]([^'"]+)['"]/)?.[1];
    if (!vqd) return [];

    const imgRes = await fetch(
      `https://duckduckgo.com/i.js?l=it-it&o=json&q=${encodeURIComponent(query)}&vqd=${encodeURIComponent(vqd)}&f=,,,,,`,
      { headers: { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36" }, signal: AbortSignal.timeout(8000) }
    );
    if (!imgRes.ok) return [];
    const data: any = await imgRes.json();
    return (data.results ?? []).slice(0, limit) as DdgImage[];
  } catch { return []; }
}

// ─── 4. Gemini image picker ───────────────────────────────────────────────────

async function geminiPickBestImage(beerName: string, breweryName: string, candidates: string[]): Promise<string | null> {
  const key = GEMINI_API_KEY();
  if (!key || candidates.length === 0) return candidates[0] ?? null;
  if (candidates.length === 1) return candidates[0];

  try {
    const prompt = `You are selecting the best product image for an Italian craft beer.

Beer: "${beerName}" by "${breweryName}"

Analyze these ${candidates.length} image URLs and pick the best one following this priority order:
1. BEST: Round tap badge / medallion (medaglione) — the circular label used for draft beer taps
2. GOOD: Official label artwork (etichetta) — the rectangular or shaped label from a bottle/can
3. OK: Clear bottle or can product photo with visible label
4. AVOID: Logos without label art, generic beer photos, photos with people, social media posts

Return ONLY the 0-based index of the best image, or -1 if none are suitable. No explanation.

URLs:
${candidates.map((u, i) => `${i}: ${u}`).join("\n")}`;

    const res = await fetch(`${GEMINI_URL}?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 8 },
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return candidates[0];
    const data: any = await res.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
    const idx = parseInt(raw);
    if (!isNaN(idx) && idx >= 0 && idx < candidates.length) return candidates[idx];
    return candidates[0];
  } catch { return candidates[0]; }
}

// ─── 5. Cloudinary upload ────────────────────────────────────────────────────

async function uploadBestImage(imageUrl: string, beerId: number): Promise<string | null> {
  try {
    const result = await cloudinary.uploader.upload(imageUrl, {
      public_id: `beers/scan_enriched_${beerId}_${Date.now()}`,
      resource_type: "image",
      transformation: [{ width: 900, crop: "limit", quality: "auto:best", fetch_format: "auto" }],
      overwrite: true,
    });
    return result.secure_url;
  } catch (e: any) {
    console.warn(`[beer-img] Cloudinary upload failed for beer ${beerId}: ${e?.message?.substring(0, 80)}`);
    return null;
  }
}

// ─── Detect placeholder/generic images that should be replaced ───────────────
// These are stock photo URLs inserted in bulk — not real beer imagery.
const PLACEHOLDER_DOMAINS = ["unsplash.com", "images.unsplash.com", "plus.unsplash.com"];

export function isPlaceholderImage(url: string | null | undefined): boolean {
  if (!url) return true;
  return PLACEHOLDER_DOMAINS.some(d => url.includes(d));
}

// ─── Validate that a URL actually points to an image ─────────────────────────
// Checks extension first (fast), then does a HEAD request for ambiguous URLs.

function hasImageExtension(url: string): boolean {
  const clean = url.split("?")[0].split("#")[0].toLowerCase();
  return /\.(jpe?g|png|webp|gif|avif|bmp|tiff?)$/.test(clean);
}

const IMAGE_CDN_PATTERNS = [
  /res\.cloudinary\.com/,
  /images\.(squarespace|shopify|wixstatic)\.com/,
  /wp-content\/uploads/,
  /\/media\//,
  /\/images\//,
  /imgix\.net/,
  /cdn\./,
  /static\./,
  /assets\./,
];

async function isImageUrl(url: string): Promise<boolean> {
  if (hasImageExtension(url)) return true;
  // Check CDN patterns (likely image even without extension)
  if (IMAGE_CDN_PATTERNS.some(p => p.test(url))) return true;
  // HEAD request to confirm content-type (for og:images without extension)
  try {
    const r = await fetch(url, {
      method: "HEAD",
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(5000),
    });
    const ct = r.headers.get("content-type") ?? "";
    return ct.startsWith("image/");
  } catch { return false; }
}

// ─── Main entry point ────────────────────────────────────────────────────────

/**
 * Finds and saves the best web image for a beer.
 * Designed to be called fire-and-forget via setImmediate().
 * Only updates if the beer currently has no image_url, or if forceUpdate=true.
 */
export async function findAndUpdateBeerImage(
  beerId: number,
  beerName: string,
  breweryName: string,
  breweryWebsite: string | null | undefined,
  forceUpdate = false
): Promise<void> {
  try {
    if (!forceUpdate) {
      const { rows } = await pool.query("SELECT image_url FROM beers WHERE id = $1", [beerId]);
      const existing = rows[0]?.image_url;
      if (existing && !isPlaceholderImage(existing)) {
        console.log(`[beer-img] beer ${beerId} already has real image, skipping`);
        return;
      }
      if (existing) console.log(`[beer-img] beer ${beerId} has placeholder image (Unsplash), replacing`);
    }

    console.log(`[beer-img] searching image for "${beerName}" by "${breweryName}" (id=${beerId})`);
    const candidates: string[] = [];

    // ── Run all 3 sources in parallel ────────────────────────────────────────
    const [googlePages, breweryOg, ddgResults] = await Promise.all([
      googleViaGeminiGrounding(beerName, breweryName),
      fetchBreweryOgImage(breweryWebsite ?? "", beerName),
      ddgSearchImages(`${beerName} ${breweryName} birra medaglione etichetta rotonda`, 10),
    ]);

    // Extract og:images from Google result pages (best quality source)
    const googleImages = await extractOgImages(googlePages);
    const googleChecks = await Promise.all(
      googleImages
        .filter(img => img.startsWith("http") && !candidates.includes(img))
        .map(async img => ({ img, ok: await isImageUrl(img) }))
    );
    for (const { img, ok } of googleChecks) {
      if (ok) candidates.push(img);
    }

    // Brewery website og:image — validate it's actually an image URL
    if (breweryOg && breweryOg.startsWith("http") && !candidates.includes(breweryOg)) {
      if (await isImageUrl(breweryOg)) {
        candidates.unshift(breweryOg); // highest priority — official source
      }
    }

    // DuckDuckGo images — use r.image (direct image URL), not r.url (source page)
    for (const r of ddgResults) {
      if (r.image?.startsWith("http") && r.width >= 300 && r.height >= 300 && !candidates.includes(r.image)) {
        candidates.push(r.image);
        if (candidates.length >= 8) break;
      }
    }

    if (candidates.length === 0) {
      console.log(`[beer-img] no candidates found for beer ${beerId}`);
      return;
    }

    console.log(`[beer-img] ${candidates.length} candidates for beer ${beerId}, asking Gemini to pick best`);

    // Gemini picks the best from all candidates
    const bestUrl = await geminiPickBestImage(beerName, breweryName, candidates.slice(0, 6));
    if (!bestUrl) return;

    console.log(`[beer-img] best for beer ${beerId}: ${bestUrl.substring(0, 80)}`);

    // Upload to Cloudinary
    const cloudUrl = await uploadBestImage(bestUrl, beerId);
    if (!cloudUrl) return;

    // Update beer record
    await pool.query("UPDATE beers SET image_url = $1 WHERE id = $2", [cloudUrl, beerId]);
    console.log(`[beer-img] ✓ beer ${beerId} image updated: ${cloudUrl.substring(0, 80)}`);
  } catch (e: any) {
    console.error(`[beer-img] error for beer ${beerId}: ${e?.message?.substring(0, 100)}`);
  }
}
