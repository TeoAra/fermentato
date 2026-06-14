/**
 * Beer Image Finder — finds the best web image for a beer after scan confirmation.
 *
 * Strategy (in order):
 *  1. Brewery website — scrape beer product page og:image
 *  2. Untappd — search for the beer, grab beer_logos CDN image
 *  3. DuckDuckGo image search (multiple targeted queries, prefers square/medallion)
 *  4. Upload winner to Cloudinary + update beers.image_url
 *
 * The function is fire-and-forget: call without await in confirmation handler.
 */

import { v2 as cloudinary } from "cloudinary";
import { pool } from "./db";

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

// ─── 3. Untappd ──────────────────────────────────────────────────────────────

async function fetchUntappdImage(beerName: string, breweryName: string): Promise<string | null> {
  try {
    // Use Untappd's own search — no DDG needed
    const q = `${beerName} ${breweryName}`;
    const searchUrl = `https://untappd.com/search?q=${encodeURIComponent(q)}&type=beer`;
    const searchRes = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(12000),
    });
    if (!searchRes.ok) return null;
    const searchHtml = await searchRes.text();

    // Find the first beer result link: /b/<slug>/<id>
    const linkMatch = searchHtml.match(/href="(\/b\/[^"]+\/\d+)"/);
    if (!linkMatch) return null;

    const beerPageUrl = `https://untappd.com${linkMatch[1]}`;
    console.log(`[beer-img] untappd page: ${beerPageUrl}`);

    const pageRes = await fetch(beerPageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(12000),
    });
    if (!pageRes.ok) return null;
    const html = await pageRes.text();

    // Prefer HD beer label (beer_logos_hd), fall back to standard (beer_logos)
    // These are the actual medallion/label images, NOT the og:image composite
    const hdMatch = html.match(/assets\.untappd\.com\/site\/beer_logos_hd\/[^\s"'<>]+/);
    const smMatch = html.match(/assets\.untappd\.com\/site\/beer_logos\/[^\s"'<>]+/);
    const labelUrl = hdMatch?.[0] ?? smMatch?.[0];
    if (labelUrl) {
      const url = `https://${labelUrl}`;
      console.log(`[beer-img] untappd label found: ${url.substring(0, 80)}`);
      return url;
    }
    return null;
  } catch (e: any) {
    console.warn(`[beer-img] untappd scrape failed: ${e?.message?.substring(0, 60)}`);
    return null;
  }
}


// ─── 4. DuckDuckGo image search ──────────────────────────────────────────────

interface DdgImage { image: string; url: string; width: number; height: number; }

async function ddgSearchImages(query: string, limit = 8): Promise<DdgImage[]> {
  try {
    const pageRes = await fetch(
      `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`,
      { headers: { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36" }, signal: AbortSignal.timeout(3000) }
    );
    if (!pageRes.ok) return [];
    const html = await pageRes.text();
    const vqd = html.match(/vqd=['"]([^'"]+)['"]/)?.[1];
    if (!vqd) return [];

    const imgRes = await fetch(
      `https://duckduckgo.com/i.js?l=it-it&o=json&q=${encodeURIComponent(query)}&vqd=${encodeURIComponent(vqd)}&f=,,,,,`,
      { headers: { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36" }, signal: AbortSignal.timeout(3000) }
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
  if (url.includes("untappd.com")) score += 4;
  if (url.includes("cdn1.whatabeer.com/beers/")) score += 4;
  if (url.includes("beeradvocate.com")) score += 3;
  if (url.includes("beerpulse.com")) score += 2;
  if (url.includes("wp-content/uploads") || url.includes("cdn.")) score += 1;
  // Penalise likely lifestyle/glass images
  if (url.includes("glass") || url.includes("bicchiere") || url.includes("poured") ||
      url.includes("lifestyle") || url.includes("drinking") || url.includes("draft")) score -= 5;
  return score;
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

// ─── Search core (no DB writes) ──────────────────────────────────────────────

export type BeerImageResult = {
  url: string | null;
  source: string | null;          // 'untappd' | 'brewery' | 'ddg'
  confidence: 'high' | 'low' | 'none';
};

/**
 * Search-only entry point. Returns the best web image URL with a confidence
 * label, without uploading or touching the DB.
 *
 * Confidence rules:
 *  - HIGH: trusted source (Untappd/brewery website) returned a name-matched image.
 *  - LOW:  DuckDuckGo result, not visually verified.
 *  - NONE: nothing found.
 */
export async function findBestBeerImage(
  beerName: string,
  breweryName: string,
  breweryWebsite: string | null | undefined,
): Promise<BeerImageResult> {
  console.log(`[beer-img] searching image for "${beerName}" by "${breweryName}"`);

  type Candidate = { url: string; source: string; trusted: boolean };
  const candidates: Candidate[] = [];
  const push = (c: Candidate) => {
    if (!candidates.some(x => x.url === c.url)) candidates.push(c);
  };

  // Run all sources in parallel
  const [untappdImg, breweryOg, ddgMedaglione, ddgLabel, ddgBeerOnly] = await Promise.all([
    fetchUntappdImage(beerName, breweryName),
    fetchBreweryOgImage(breweryWebsite ?? "", beerName),
    ddgSearchImages(`"${beerName}" "${breweryName}" beer label logo medaglione`, 10),
    ddgSearchImages(`"${beerName}" "${breweryName}" birra etichetta badge`, 6),
    ddgSearchImages(`"${beerName}" birra artigianale etichetta label medaglione`, 6),
  ]);

  // Priority 1 — Untappd label (search already matched name+brewery)
  if (untappdImg?.startsWith("http") && (await isImageUrl(untappdImg))) {
    push({ url: untappdImg, source: "untappd", trusted: true });
  }

  // Priority 2 — Brewery official website (matchScore ≥ 0.5 already enforced)
  if (breweryOg?.startsWith("http") && (await isImageUrl(breweryOg))) {
    push({ url: breweryOg, source: "brewery", trusted: true });
  }

  // Priority 3 — DDG (scored to prefer square/medallion shots)
  const allDdg = [...ddgMedaglione, ...ddgLabel, ...ddgBeerOnly];
  const scoredDdg = allDdg
    .filter(r => r.image?.startsWith("http"))
    .map(r => ({ r, score: scoreDdgImage(r) }))
    .filter(({ score }) => score >= 0)
    .sort((a, b) => b.score - a.score);
  for (const { r } of scoredDdg) {
    if (candidates.length >= 8) break;
    push({ url: r.image, source: "ddg", trusted: false });
  }

  if (candidates.length === 0) {
    console.log(`[beer-img] no candidates for "${beerName}"`);
    return { url: null, source: null, confidence: "none" };
  }

  // Return first trusted source (Untappd/brewery website)
  const trusted = candidates.find(c => c.trusted);
  if (trusted) {
    console.log(`[beer-img] using trusted source (${trusted.source}) for "${beerName}"`);
    return { url: trusted.url, source: trusted.source, confidence: "high" };
  }

  // Return best DDG result as low confidence
  const bestDdg = candidates[0];
  if (bestDdg) {
    console.log(`[beer-img] using DDG result for "${beerName}": ${bestDdg.url.substring(0, 60)}`);
    return { url: bestDdg.url, source: bestDdg.source, confidence: "low" };
  }

  console.log(`[beer-img] no confident match for "${beerName}" — ignoring`);
  return { url: null, source: null, confidence: "none" };
}

// ─── Cloudinary upload + DB persist ──────────────────────────────────────────

/**
 * Searches and (if confident) saves the best web image for a beer.
 * Designed to be called fire-and-forget via setImmediate().
 * Only updates if the beer currently has no image_url, or if forceUpdate=true.
 */
export async function findAndUpdateBeerImage(
  beerId: number,
  beerName: string,
  breweryName: string,
  breweryWebsite: string | null | undefined,
  forceUpdate = false,
): Promise<void> {
  try {
    // Leggiamo SIA image_url SIA logo_url: il client mostra "logo_url || image_url",
    // quindi se logo_url contiene un placeholder (boccale generico), la nuova
    // image_url non viene mai visualizzata.
    const { rows } = await pool.query(
      "SELECT image_url, logo_url FROM beers WHERE id = $1",
      [beerId],
    );
    const existingImage = rows[0]?.image_url;
    const existingLogo = rows[0]?.logo_url;
    const logoIsPlaceholder = isPlaceholderImage(existingLogo);

    if (!forceUpdate) {
      const imageIsReal = existingImage && !isPlaceholderImage(existingImage);
      const logoIsReal = existingLogo && !logoIsPlaceholder;
      if (imageIsReal && logoIsReal) {
        console.log(`[beer-img] beer ${beerId} already has real image+logo, skipping`);
        return;
      }
      if (existingImage || existingLogo) {
        console.log(`[beer-img] beer ${beerId} has placeholder image/logo, replacing`);
      }
    }

    const result = await findBestBeerImage(beerName, breweryName, breweryWebsite);
    // Quando l'utente forza la ricerca (es. click su "Re-cerca img"), accettiamo
    // anche risultati a bassa confidenza: l'utente preferisce QUALCOSA piuttosto
    // che lasciare invariata l'immagine vecchia/errata. Senza force, solo "high".
    const minConfidence = forceUpdate ? ["high", "low"] : ["high"];
    if (!result.url || !minConfidence.includes(result.confidence)) {
      console.log(`[beer-img] no usable image for beer ${beerId} (confidence=${result.confidence}, force=${forceUpdate}) — leaving as-is`);
      return;
    }

    console.log(`[beer-img] best for beer ${beerId} (${result.source}): ${result.url.substring(0, 80)}`);

    const cloudUrl = await uploadBestImage(result.url, beerId);
    if (!cloudUrl) return;

    // Se il logo era un placeholder (o assente), lo azzeriamo: il client mostra
    // logo_url come priorità, quindi se restasse il boccale generico
    // l'utente non vedrebbe mai la nuova immagine appena trovata.
    if (logoIsPlaceholder) {
      await pool.query(
        "UPDATE beers SET image_url = $1, logo_url = NULL WHERE id = $2",
        [cloudUrl, beerId],
      );
      console.log(`[beer-img] ✓ beer ${beerId} image updated + placeholder logo cleared`);
    } else {
      await pool.query("UPDATE beers SET image_url = $1 WHERE id = $2", [cloudUrl, beerId]);
      console.log(`[beer-img] ✓ beer ${beerId} image updated (logo preserved)`);
    }
  } catch (e: any) {
    console.error(`[beer-img] error for beer ${beerId}: ${e?.message?.substring(0, 100)}`);
  }
}

// ─── Re-host arbitrary URL onto Cloudinary (used by preview-then-save flow) ──

export async function rehostImageOnCloudinary(
  imageUrl: string,
  folder: string,
  publicIdHint: string,
): Promise<string | null> {
  try {
    const result = await cloudinary.uploader.upload(imageUrl, {
      public_id: `${folder}/${publicIdHint}_${Date.now()}`,
      resource_type: "image",
      transformation: [{ width: 900, crop: "limit", quality: "auto:best", fetch_format: "auto" }],
      overwrite: true,
    });
    return result.secure_url;
  } catch (e: any) {
    console.warn(`[img] rehost failed: ${e?.message?.substring(0, 80)}`);
    return null;
  }
}
