/**
 * Beer Image Finder — finds the best web image for a beer after scan confirmation.
 *
 * Strategy (in order):
 *  1. Brewery website — scrape beer product page og:image
 *  2. Ratebeer — search for the beer, grab og:image (usually a medallion)
 *  3. Gemini + Google Search grounding → top Google result pages → og:image
 *  4. DuckDuckGo image search (multiple targeted queries, prefers square/medallion)
 *  5. Gemini Vision picks the best match from all candidates
 *  6. Upload winner to Cloudinary + update beers.image_url
 *
 * The function is fire-and-forget: call without await in confirmation handler.
 */

import { v2 as cloudinary } from "cloudinary";
import { pool } from "./db";

const GEMINI_API_KEY = () => process.env.GEMINI_API_KEY ?? "";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

// ─── 1. Brewery website og:image ─────────────────────────────────────────────

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
    `${base}/bières`,
    `${base}/bieres`,
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

// ─── 2. Ratebeer — og:image on the beer page is almost always the medallion ──

async function fetchRatebeerImage(beerName: string, breweryName: string): Promise<string | null> {
  try {
    const q = encodeURIComponent(`${beerName} ${breweryName}`);
    const searchUrl = `https://www.ratebeer.com/search?beername=${q}`;
    const res = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const html = await res.text();

    // Find first beer result link — /beer/<name>/<id>/
    const beerLinkMatch = html.match(/href="(\/beer\/[^"]+\/\d+\/?)"/);
    if (!beerLinkMatch) return null;

    const beerPage = await fetch(`https://www.ratebeer.com${beerLinkMatch[1]}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!beerPage.ok) return null;
    const beerHtml = await beerPage.text();

    const ogImage =
      beerHtml.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
      beerHtml.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1];

    if (ogImage && ogImage.startsWith("http") && !ogImage.includes("ratebeer-assets")) {
      console.log(`[beer-img] ratebeer image found for "${beerName}"`);
      return ogImage;
    }
    return null;
  } catch (e: any) {
    console.warn(`[beer-img] ratebeer scrape failed: ${e?.message?.substring(0, 60)}`);
    return null;
  }
}

// ─── 3. Google Search via Gemini grounding ────────────────────────────────────

async function googleViaGeminiGrounding(beerName: string, breweryName: string): Promise<string[]> {
  const key = GEMINI_API_KEY();
  if (!key) return [];

  const query = `"${beerName}" "${breweryName}" birra medaglione logo etichetta label`;

  try {
    const res = await fetch(`${GEMINI_URL}?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Cerca l'immagine ufficiale del medaglione o etichetta della birra: ${query}. Cerca sul sito ufficiale del birrificio o su ratebeer.com, untappd.com, beeradvocate.com` }] }],
        tools: [{ google_search: {} }],
        generationConfig: { temperature: 0, maxOutputTokens: 64 },
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return [];
    const data: any = await res.json();

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

// ─── 4. DuckDuckGo image search ──────────────────────────────────────────────

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

/** Score a DDG image by how likely it is to be a medallion/label (not a glass). */
function scoreDdgImage(img: DdgImage): number {
  let score = 0;
  const url = img.url.toLowerCase();
  // Square-ish images are likely medallions or product shots (not lifestyle)
  const ratio = img.width > 0 && img.height > 0 ? img.width / img.height : 1;
  if (ratio >= 0.8 && ratio <= 1.25) score += 3;   // square/near-square → medallion
  else if (ratio >= 0.6 && ratio <= 1.5) score += 1; // portrait/slight landscape → label
  // Good image size
  if (img.width >= 400 && img.height >= 400) score += 2;
  else if (img.width >= 300 && img.height >= 300) score += 1;
  // Trusted domains for beer imagery
  if (url.includes("ratebeer.com")) score += 4;
  if (url.includes("untappd.com") || url.includes("untappd-assets.com")) score += 4;
  if (url.includes("beeradvocate.com")) score += 3;
  if (url.includes("beerpulse.com")) score += 2;
  if (url.includes("wp-content/uploads") || url.includes("cdn.")) score += 1;
  // Penalise likely lifestyle/glass images
  if (url.includes("glass") || url.includes("bicchiere") || url.includes("poured") ||
      url.includes("lifestyle") || url.includes("drinking") || url.includes("draft")) score -= 5;
  return score;
}

// ─── 5. Gemini image picker ───────────────────────────────────────────────────

async function geminiPickBestImage(beerName: string, breweryName: string, candidates: string[]): Promise<string | null> {
  const key = GEMINI_API_KEY();
  if (!key || candidates.length === 0) return candidates[0] ?? null;
  if (candidates.length === 1) return candidates[0];

  try {
    const prompt = `You are selecting the best product image for a craft beer to display in an app.

Beer: "${beerName}" by "${breweryName}"

PRIORITY ORDER (choose the highest available):
1. BEST: Round tap badge / medallion (medaglione) — circular logo used on tap handles or labels
2. BEST: Official product label artwork (etichetta) — the label art from bottle/can, usually square or portrait
3. OK: Clear bottle or can product photo where the label is clearly visible and fills most of the frame
4. REJECT: Beer poured in a glass or mug — DO NOT choose these
5. REJECT: Lifestyle photos, people holding beer, pub/bar scenes
6. REJECT: Generic brand logos without label art
7. REJECT: Low quality, blurry, or very small images

Important: images from ratebeer.com, untappd.com or the brewery's own website are usually good.

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

// ─── 6. Cloudinary upload ────────────────────────────────────────────────────

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
const PLACEHOLDER_DOMAINS = ["unsplash.com", "images.unsplash.com", "plus.unsplash.com"];

export function isPlaceholderImage(url: string | null | undefined): boolean {
  if (!url) return true;
  return PLACEHOLDER_DOMAINS.some(d => url.includes(d));
}

// ─── Validate that a URL actually points to an image ─────────────────────────

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
  if (IMAGE_CDN_PATTERNS.some(p => p.test(url))) return true;
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

    // ── Run all sources in parallel ─────────────────────────────────────────
    const [breweryOg, ratebeerImg, googlePages, ddgMedaglione, ddgLabel] = await Promise.all([
      fetchBreweryOgImage(breweryWebsite ?? "", beerName),
      fetchRatebeerImage(beerName, breweryName),
      googleViaGeminiGrounding(beerName, breweryName),
      // Two targeted DDG queries: medallion first, then label
      ddgSearchImages(`"${beerName}" "${breweryName}" beer label logo medaglione`, 10),
      ddgSearchImages(`"${beerName}" "${breweryName}" birra etichetta badge`, 6),
    ]);

    // Priority 1: brewery official website (highest trust)
    if (breweryOg && breweryOg.startsWith("http")) {
      if (await isImageUrl(breweryOg)) {
        candidates.push(breweryOg);
        console.log(`[beer-img] brewery site candidate: ${breweryOg.substring(0, 60)}`);
      }
    }

    // Priority 2: Ratebeer (almost always a medallion)
    if (ratebeerImg && ratebeerImg.startsWith("http") && !candidates.includes(ratebeerImg)) {
      if (await isImageUrl(ratebeerImg)) {
        candidates.unshift(ratebeerImg); // put at front — very reliable
        console.log(`[beer-img] ratebeer candidate: ${ratebeerImg.substring(0, 60)}`);
      }
    }

    // Priority 3: Google grounding → extract og:images
    const googleImages = await extractOgImages(googlePages);
    const googleChecks = await Promise.all(
      googleImages
        .filter(img => img.startsWith("http") && !candidates.includes(img))
        .map(async img => ({ img, ok: await isImageUrl(img) }))
    );
    for (const { img, ok } of googleChecks) {
      if (ok) candidates.push(img);
    }

    // Priority 4: DuckDuckGo — scored and sorted to prefer square/medallion images
    const allDdg = [...ddgMedaglione, ...ddgLabel];
    const scoredDdg = allDdg
      .filter(r => r.image?.startsWith("http") && !candidates.includes(r.image))
      .map(r => ({ r, score: scoreDdgImage(r) }))
      .filter(({ score }) => score >= 0) // reject clearly bad images
      .sort((a, b) => b.score - a.score);

    for (const { r } of scoredDdg) {
      if (candidates.length >= 8) break;
      candidates.push(r.image);
    }

    if (candidates.length === 0) {
      console.log(`[beer-img] no candidates found for beer ${beerId}`);
      return;
    }

    console.log(`[beer-img] ${candidates.length} candidates for beer ${beerId}, asking Gemini to pick best`);

    const bestUrl = await geminiPickBestImage(beerName, breweryName, candidates.slice(0, 8));
    if (!bestUrl) return;

    console.log(`[beer-img] best for beer ${beerId}: ${bestUrl.substring(0, 80)}`);

    const cloudUrl = await uploadBestImage(bestUrl, beerId);
    if (!cloudUrl) return;

    await pool.query("UPDATE beers SET image_url = $1 WHERE id = $2", [cloudUrl, beerId]);
    console.log(`[beer-img] ✓ beer ${beerId} image updated: ${cloudUrl.substring(0, 80)}`);
  } catch (e: any) {
    console.error(`[beer-img] error for beer ${beerId}: ${e?.message?.substring(0, 100)}`);
  }
}
