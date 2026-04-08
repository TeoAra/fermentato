/**
 * Beer Image Finder — finds the best web image for a beer after scan confirmation.
 *
 * Strategy (in order):
 *  1. DuckDuckGo image search (free, no API key) → top results for "{name} {brewery} birra"
 *  2. Brewery website og:image (if website_url available) → official product photo
 *  3. Gemini Vision picks the best match from candidates
 *  4. Upload winner to Cloudinary + update beers.image_url
 *
 * The function is fire-and-forget: call without await in confirmation handler.
 */

import { v2 as cloudinary } from "cloudinary";
import { pool } from "./db";

const GEMINI_API_KEY = () => process.env.GEMINI_API_KEY ?? "";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

// ─── DuckDuckGo image search ─────────────────────────────────────────────────

interface DdgImage {
  url: string;
  width: number;
  height: number;
  thumbnail: string;
  title: string;
}

async function ddgSearchImages(query: string, limit = 8): Promise<DdgImage[]> {
  try {
    // Step 1: get vqd token from DDG search page
    const pageRes = await fetch(
      `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`,
      { headers: { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36" }, signal: AbortSignal.timeout(8000) }
    );
    if (!pageRes.ok) return [];
    const html = await pageRes.text();
    const vqd = html.match(/vqd=['"]([^'"]+)['"]/)?.[1];
    if (!vqd) return [];

    // Step 2: fetch image results JSON
    const imgRes = await fetch(
      `https://duckduckgo.com/i.js?l=it-it&o=json&q=${encodeURIComponent(query)}&vqd=${encodeURIComponent(vqd)}&f=,,,,,`,
      { headers: { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36" }, signal: AbortSignal.timeout(8000) }
    );
    if (!imgRes.ok) return [];
    const data: any = await imgRes.json();
    return (data.results ?? []).slice(0, limit) as DdgImage[];
  } catch {
    return [];
  }
}

// ─── Brewery website og:image ─────────────────────────────────────────────────

async function fetchOgImage(websiteUrl: string, beerName: string): Promise<string | null> {
  if (!websiteUrl?.startsWith("http")) return null;
  const base = websiteUrl.replace(/\/$/, "");

  // Slugified beer name for URL pattern matching
  const slug = beerName.toLowerCase()
    .replace(/[àáâã]/g, "a").replace(/[èéê]/g, "e").replace(/[ìíî]/g, "i")
    .replace(/[òóô]/g, "o").replace(/[ùúû]/g, "u").replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-").replace(/^-|-$/g, "");

  const beerWords = slug.split("-").filter(w => w.length > 2);

  // Pages to try: homepage + common beer-list + guessed product page
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
        headers: { "User-Agent": "Mozilla/5.0 (compatible; Fermentato-Bot/1.0; +https://fermenta.to)" },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;
      const html = await res.text();

      // og:title matching: if this page is specifically about our beer
      const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1]
        ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i)?.[1]
        ?? "";
      const titleWords = ogTitle.toLowerCase();
      const matchScore = beerWords.filter(w => titleWords.includes(w)).length / Math.max(beerWords.length, 1);

      const ogImage = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1]
        ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1];

      // Good match: at least half the beer name words in the page title
      if (matchScore >= 0.5 && ogImage) return ogImage;

      // Fallback: find links to the beer's specific product page
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
          const pg = await fetch(link.url, {
            headers: { "User-Agent": "Mozilla/5.0" },
            signal: AbortSignal.timeout(6000),
          });
          if (!pg.ok) continue;
          const pgHtml = await pg.text();
          const pgOg = pgHtml.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1]
            ?? pgHtml.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1];
          if (pgOg) return pgOg;
        }
      }
    } catch { continue; }
  }
  return null;
}

// ─── Gemini image picker ──────────────────────────────────────────────────────

async function geminiPickBestImage(
  beerName: string,
  breweryName: string,
  candidates: string[]
): Promise<string | null> {
  const key = GEMINI_API_KEY();
  if (!key || candidates.length === 0) return candidates[0] ?? null;
  if (candidates.length === 1) return candidates[0];

  try {
    const prompt = `You are selecting the best product image for an Italian craft beer.

Beer: "${beerName}" by "${breweryName}"

Analyze these ${candidates.length} image URLs and pick the one that is most likely to be a clear, high-quality photo of the beer bottle, can, or label. Prefer official product photos over blog/social media photos.

Return ONLY the index (0-based) of the best image, or -1 if none are suitable. No explanation.

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
  } catch {
    return candidates[0];
  }
}

// ─── Cloudinary upload ───────────────────────────────────────────────────────

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
    // Check if beer already has an image (don't overwrite unless forced)
    if (!forceUpdate) {
      const { rows } = await pool.query("SELECT image_url FROM beers WHERE id = $1", [beerId]);
      if (rows[0]?.image_url) {
        console.log(`[beer-img] beer ${beerId} already has image, skipping`);
        return;
      }
    }

    console.log(`[beer-img] searching web image for "${beerName}" (id=${beerId})`);

    const candidates: string[] = [];

    // Source 1: Brewery website og:image (most accurate)
    const webOg = await fetchOgImage(breweryWebsite ?? "", beerName);
    if (webOg && webOg.startsWith("http")) candidates.push(webOg);

    // Source 2: DuckDuckGo image search
    const query = `${beerName} ${breweryName} birra artigianale`;
    const ddgResults = await ddgSearchImages(query, 8);
    for (const r of ddgResults) {
      if (r.url?.startsWith("http") && r.width >= 400 && r.height >= 400) {
        candidates.push(r.url);
        if (candidates.length >= 5) break;
      }
    }

    if (candidates.length === 0) {
      console.log(`[beer-img] no candidates found for beer ${beerId}`);
      return;
    }

    // Deduplicate
    const unique = [...new Set(candidates)];

    // Gemini picks the best
    const bestUrl = await geminiPickBestImage(beerName, breweryName, unique.slice(0, 5));
    if (!bestUrl) return;

    console.log(`[beer-img] best candidate for beer ${beerId}: ${bestUrl.substring(0, 80)}`);

    // Upload to Cloudinary
    const cloudUrl = await uploadBestImage(bestUrl, beerId);
    if (!cloudUrl) return;

    // Update beer record
    await pool.query("UPDATE beers SET image_url = $1 WHERE id = $2", [cloudUrl, beerId]);
    console.log(`[beer-img] ✓ updated beer ${beerId} image: ${cloudUrl.substring(0, 80)}`);
  } catch (e: any) {
    console.error(`[beer-img] error for beer ${beerId}: ${e?.message?.substring(0, 100)}`);
  }
}
