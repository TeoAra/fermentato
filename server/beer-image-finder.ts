/**
 * Beer Image Finder — finds the best web image for a beer after scan confirmation.
 *
 * Strategy (in order):
 *  1. Brewery website — scrape beer product page og:image
 *  2. Ratebeer — search for the beer, grab og:image (usually a medallion)
 *  3. WhataBeer — Italian craft beer DB (cdn1.whatabeer.com/beers/)
 *  4. Gemini + Google Search grounding → top Google result pages → og:image
 *  5. DuckDuckGo image search (multiple targeted queries, prefers square/medallion)
 *  6. Gemini Vision picks the best match from all candidates
 *  7. Upload winner to Cloudinary + update beers.image_url
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

// ─── 3. WhataBeer — Italian craft beer database (cdn1.whatabeer.com/beers/) ──

async function fetchWhataBeerImage(beerName: string, breweryName: string): Promise<string | null> {
  try {
    // Find the WhataBeer page via DDG text search restricted to site:whatabeer.com
    const query = `site:whatabeer.com "${beerName}" "${breweryName}"`;
    const ddgRes = await fetch(
      `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml",
          "Accept-Language": "it-IT,it;q=0.9",
        },
        signal: AbortSignal.timeout(10000),
      }
    );
    if (!ddgRes.ok) return null;
    const ddgHtml = await ddgRes.text();

    // Extract /birrifici/ URL from DDG result links
    const urlMatch = ddgHtml.match(/whatabeer\.com(\/birrifici\/[^"'\s&>]+)/);
    if (!urlMatch) return null;

    const beerPageUrl = `https://whatabeer.com${urlMatch[1].replace(/&amp;.*/, "").replace(/[^/\w-]$/, "")}`;
    console.log(`[beer-img] whatabeer page: ${beerPageUrl}`);

    // Fetch the beer page (server-side rendered, no JS needed)
    const pageRes = await fetch(beerPageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "it-IT,it;q=0.9",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!pageRes.ok) return null;
    const pageHtml = await pageRes.text();

    const beerWords = beerName.toLowerCase().split(/\s+/).filter(w => w.length > 2);

    // Look for beer-specific CDN images (not brewery images) matching the beer name
    const imgRe = /<img[^>]+src=["'](https:\/\/cdn1\.whatabeer\.com\/beers\/[^"']+)["'][^>]*(?:alt=["']([^"']*)["'])?/gi;
    let m: RegExpExecArray | null;
    const beerImgs: Array<{ src: string; score: number }> = [];
    while ((m = imgRe.exec(pageHtml)) !== null) {
      const src = m[1];
      const alt = (m[2] ?? "").toLowerCase();
      const score = beerWords.filter(w => alt.includes(w)).length;
      beerImgs.push({ src, score });
    }
    // Sort by name match, prefer details/ > list/ > widget/
    beerImgs.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const rank = (s: string) => s.includes("/details/") ? 2 : s.includes("/list/") ? 1 : 0;
      return rank(b.src) - rank(a.src);
    });
    if (beerImgs.length > 0) {
      const img = beerImgs[0];
      // Upgrade widget/ → list/ for better quality
      const src = img.src.replace(/\/widget\//, "/list/");
      console.log(`[beer-img] whatabeer image found (score=${img.score}): ${src.substring(0, 80)}`);
      return src;
    }

    return null;
  } catch (e: any) {
    console.warn(`[beer-img] whatabeer scrape failed: ${e?.message?.substring(0, 60)}`);
    return null;
  }
}

// ─── 4. Untappd ──────────────────────────────────────────────────────────────

async function fetchUntappdImage(beerName: string, breweryName: string): Promise<string | null> {
  try {
    // Find the Untappd beer page via DDG text search (site: only supports domain, not path)
    const query = `site:untappd.com "${beerName}" "${breweryName}" beer`;
    const ddgRes = await fetch(
      `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml",
          "Accept-Language": "it-IT,it;q=0.9",
        },
        signal: AbortSignal.timeout(10000),
      }
    );
    if (!ddgRes.ok) return null;
    const ddgHtml = await ddgRes.text();

    // Extract the Untappd /b/ beer page URL
    const urlMatch = ddgHtml.match(/untappd\.com(\/b\/[^"'\s&>?#]+\/\d+)/);
    if (!urlMatch) return null;
    const beerPath = urlMatch[1];

    const beerPageUrl = `https://untappd.com${beerPath}`;
    console.log(`[beer-img] untappd page: ${beerPageUrl}`);

    const pageRes = await fetch(beerPageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!pageRes.ok) return null;
    const html = await pageRes.text();

    // Untappd og:image is the beer label image
    const ogImage =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1];

    if (ogImage && ogImage.includes("assets.untappd.com")) {
      // Upgrade to hires if available (replace _sm with _hd or just strip suffix)
      const hires = ogImage.replace(/_sm\.jpeg/, ".jpeg").replace(/_sm\.jpg/, ".jpg");
      console.log(`[beer-img] untappd image found: ${hires.substring(0, 80)}`);
      return hires;
    }
    return null;
  } catch (e: any) {
    console.warn(`[beer-img] untappd scrape failed: ${e?.message?.substring(0, 60)}`);
    return null;
  }
}

// ─── 5. Google Search via Gemini grounding ────────────────────────────────────

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
  if (url.includes("cdn1.whatabeer.com/beers/")) score += 4;
  if (url.includes("beeradvocate.com")) score += 3;
  if (url.includes("beerpulse.com")) score += 2;
  if (url.includes("wp-content/uploads") || url.includes("cdn.")) score += 1;
  // Penalise likely lifestyle/glass images
  if (url.includes("glass") || url.includes("bicchiere") || url.includes("poured") ||
      url.includes("lifestyle") || url.includes("drinking") || url.includes("draft")) score -= 5;
  return score;
}

// ─── 5. Gemini image picker (Vision) ─────────────────────────────────────────

/** Fetch an image URL and return { mimeType, base64 } — null on failure. */
async function fetchImageBase64(
  url: string
): Promise<{ mimeType: string; data: string } | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "image/jpeg";
    const mimeType = ct.split(";")[0].trim();
    if (!mimeType.startsWith("image/")) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength > 3_000_000) return null; // skip >3 MB
    return { mimeType, data: Buffer.from(buf).toString("base64") };
  } catch { return null; }
}

/**
 * Use Gemini Vision to pick the best candidate image.
 * Downloads up to 4 candidates and asks Gemini to visually identify the correct beer.
 * Falls back to URL-only picking if images can't be fetched.
 */
async function geminiPickBestImage(
  beerName: string,
  breweryName: string,
  candidates: string[]
): Promise<string | null> {
  const key = GEMINI_API_KEY();
  if (!key || candidates.length === 0) return candidates[0] ?? null;
  if (candidates.length === 1) return candidates[0];

  // ── Try vision-based picking first (top 4 candidates) ───────────────────
  const topCandidates = candidates.slice(0, 4);
  const fetchResults = await Promise.all(topCandidates.map(fetchImageBase64));
  const visionParts: Array<{ url: string; part: { inlineData: { mimeType: string; data: string } }; originalIdx: number }> = [];

  for (let i = 0; i < topCandidates.length; i++) {
    const img = fetchResults[i];
    if (img) visionParts.push({ url: topCandidates[i], part: { inlineData: img }, originalIdx: i });
  }

  if (visionParts.length >= 2) {
    try {
      const letters = ["A", "B", "C", "D", "E", "F", "G", "H"];

      // Interleave: label text + image for each candidate so Gemini maps letters unambiguously
      const parts: any[] = [
        { text: `You are selecting the correct product image for a specific craft beer.\n\nBeer name: "${beerName}"\nBrewery: "${breweryName}"\n\nBelow are ${visionParts.length} images, each labelled with a letter.\nIMPORTANT: The letters A/B/C/D are IMAGE LABELS — they have NOTHING to do with any number in the beer name.\n` }
      ];
      for (let i = 0; i < visionParts.length; i++) {
        parts.push({ text: `Image ${letters[i]}:` });
        parts.push(visionParts[i].part);
      }
      parts.push({ text: `\nYour task:\n1. Examine each image's label/text. Which image shows the beer EXACTLY named "${beerName}"?\n2. If multiple match, prefer: round medallion/badge > label art > bottle/can photo.\n3. REJECT any image showing a DIFFERENT beer, a glass pour, lifestyle photo, or a generic brewery logo.\n4. If NONE match "${beerName}", reply NONE.\n\nReply with ONLY the letter (A, B, C, D...) of the correct image, or NONE. No other text.` });

      const res = await fetch(`${GEMINI_URL}?key=${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { temperature: 0, maxOutputTokens: 4 },
        }),
        signal: AbortSignal.timeout(25000),
      });

      if (res.ok) {
        const data: any = await res.json();
        const raw = (data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "").toUpperCase();
        const letterIdx = letters.indexOf(raw);
        if (letterIdx >= 0 && letterIdx < visionParts.length) {
          const chosen = visionParts[letterIdx].url;
          console.log(`[beer-img] gemini vision picked "${raw}": ${chosen.substring(0, 60)}`);
          return chosen;
        }
        // NONE or unrecognised → fall through to URL-only
        console.log(`[beer-img] gemini vision: no match for "${beerName}" (raw="${raw}") — running URL-only on all ${candidates.length} candidates`);
      }
    } catch (e: any) {
      console.warn(`[beer-img] gemini vision failed: ${e?.message?.substring(0, 60)} — falling back to URL picking`);
    }
  }

  // ── Fallback: URL-only picking ───────────────────────────────────────────
  try {
    const prompt = `You are selecting the best product image for a craft beer to display in an app.

Beer: "${beerName}" by "${breweryName}"

IMPORTANT: The image MUST be for THIS specific beer ("${beerName}"), not a different beer by the same brewery.
If you are not confident the URL belongs to "${beerName}", return -1.

PRIORITY (choose highest):
1. Round tap badge / medallion with "${beerName}" in filename or domain
2. Official product label artwork for "${beerName}"
3. Bottle or can photo for "${beerName}"
REJECT: Different beer, glass pour, lifestyle, generic logo, brewery homepage images

Return ONLY the 0-based index of the best image, or -1 if none are clearly for "${beerName}".

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
    if (!res.ok) return null;
    const data: any = await res.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
    const idx = parseInt(raw);
    if (!isNaN(idx) && idx >= 0 && idx < candidates.length) {
      console.log(`[beer-img] gemini url-only picked index ${idx}: ${candidates[idx].substring(0, 60)}`);
      return candidates[idx];
    }
    console.log(`[beer-img] gemini url-only returned no match (raw="${raw}") for "${beerName}" — skipping image assignment`);
    return null;
  } catch { return null; }
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
    const [whataBeerImg, untappdImg, ratebeerImg, breweryOg, googlePages, ddgMedaglione, ddgLabel, ddgBeerOnly] = await Promise.all([
      fetchWhataBeerImage(beerName, breweryName),
      fetchUntappdImage(beerName, breweryName),
      fetchRatebeerImage(beerName, breweryName),
      fetchBreweryOgImage(breweryWebsite ?? "", beerName),
      googleViaGeminiGrounding(beerName, breweryName),
      // Two targeted DDG queries: medallion first, then label
      ddgSearchImages(`"${beerName}" "${breweryName}" beer label logo medaglione`, 10),
      ddgSearchImages(`"${beerName}" "${breweryName}" birra etichetta badge`, 6),
      // Extra query: beer name only (catches collab beers not indexed under primary brewery)
      ddgSearchImages(`"${beerName}" birra artigianale etichetta label medaglione`, 6),
    ]);

    // Priority 1: WhataBeer — Italian craft beer DB with beer-specific CDN images
    if (whataBeerImg && whataBeerImg.startsWith("http")) {
      if (await isImageUrl(whataBeerImg)) {
        candidates.push(whataBeerImg);
        console.log(`[beer-img] ✓ whatabeer candidate: ${whataBeerImg.substring(0, 60)}`);
      }
    }

    // Priority 2: Untappd — biggest beer DB, always a label image
    if (untappdImg && untappdImg.startsWith("http") && !candidates.includes(untappdImg)) {
      if (await isImageUrl(untappdImg)) {
        candidates.push(untappdImg);
        console.log(`[beer-img] ✓ untappd candidate: ${untappdImg.substring(0, 60)}`);
      }
    }

    // Priority 3: Ratebeer — almost always a medallion
    if (ratebeerImg && ratebeerImg.startsWith("http") && !candidates.includes(ratebeerImg)) {
      if (await isImageUrl(ratebeerImg)) {
        candidates.push(ratebeerImg);
        console.log(`[beer-img] ✓ ratebeer candidate: ${ratebeerImg.substring(0, 60)}`);
      }
    }

    // Priority 4: Brewery official website
    if (breweryOg && breweryOg.startsWith("http") && !candidates.includes(breweryOg)) {
      if (await isImageUrl(breweryOg)) {
        candidates.push(breweryOg);
        console.log(`[beer-img] brewery site candidate: ${breweryOg.substring(0, 60)}`);
      }
    }

    // Priority 5: Google grounding → extract og:images
    const googleImages = await extractOgImages(googlePages);
    const googleChecks = await Promise.all(
      googleImages
        .filter(img => img.startsWith("http") && !candidates.includes(img))
        .map(async img => ({ img, ok: await isImageUrl(img) }))
    );
    for (const { img, ok } of googleChecks) {
      if (ok) candidates.push(img);
    }

    // Priority 6: DuckDuckGo — scored and sorted to prefer square/medallion images
    const allDdg = [...ddgMedaglione, ...ddgLabel, ...ddgBeerOnly];
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
