/**
 * Brewery Logo Finder — finds the best web logo for a craft brewery.
 *
 * Strategy (in order):
 *  1. Brewery official website — favicon (Apple touch icon, large icon) + og:image
 *  2. Untappd brewery page — `/v/<slug>/<id>` first hit, scrape brewery_logos asset
 *
 * Returns a confidence label so callers can decide to ignore weak matches.
 */

import { v2 as cloudinary } from "cloudinary";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// ─── 1. Brewery website — favicon + og:image ─────────────────────────────────

async function fetchBreweryWebsiteLogo(websiteUrl: string): Promise<string[]> {
  if (!websiteUrl?.startsWith("http")) return [];
  const out: string[] = [];
  try {
    const u = new URL(websiteUrl);
    const origin = `${u.protocol}//${u.host}`;

    const res = await fetch(websiteUrl, {
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) return [];
    const html = await res.text();

    // og:image
    const og =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1];
    if (og) out.push(og.startsWith("http") ? og : `${origin}${og.startsWith("/") ? "" : "/"}${og}`);

    // Apple touch icons (usually big, square brand mark)
    const touchRe = /<link[^>]+rel=["']apple-touch-icon[^"']*["'][^>]+href=["']([^"']+)["']/gi;
    let m: RegExpExecArray | null;
    while ((m = touchRe.exec(html)) !== null) {
      const href = m[1];
      out.push(href.startsWith("http") ? href : `${origin}${href.startsWith("/") ? "" : "/"}${href}`);
    }

    // <link rel="icon" sizes="...">  prefer larger
    const iconRe = /<link[^>]+rel=["'](?:icon|shortcut icon)["'][^>]*>/gi;
    const iconLinks: Array<{ href: string; size: number }> = [];
    while ((m = iconRe.exec(html)) !== null) {
      const tag = m[0];
      const href = tag.match(/href=["']([^"']+)["']/i)?.[1];
      const sizeStr = tag.match(/sizes=["']([0-9]+)x[0-9]+["']/i)?.[1];
      const size = sizeStr ? parseInt(sizeStr, 10) : 0;
      if (href) {
        const full = href.startsWith("http") ? href : `${origin}${href.startsWith("/") ? "" : "/"}${href}`;
        iconLinks.push({ href: full, size });
      }
    }
    iconLinks.sort((a, b) => b.size - a.size);
    for (const ic of iconLinks) if (ic.size === 0 || ic.size >= 96) out.push(ic.href);
  } catch {
    /* ignore */
  }
  const seen = new Set<string>();
  return out.filter(u => {
    if (!u.startsWith("http") || seen.has(u)) return false;
    seen.add(u);
    return true;
  });
}

// ─── 2. Untappd brewery page ─────────────────────────────────────────────────

async function fetchUntappdBreweryLogo(breweryName: string, location?: string | null): Promise<string | null> {
  try {
    const q = `${breweryName} ${location ?? ""}`.trim();
    const searchUrl = `https://untappd.com/search?q=${encodeURIComponent(q)}&type=brewery`;
    const searchRes = await fetch(searchUrl, {
      headers: { "User-Agent": UA, Accept: "text/html", "Accept-Language": "en-US,en;q=0.9" },
      signal: AbortSignal.timeout(10000),
    });
    if (!searchRes.ok) return null;
    const searchHtml = await searchRes.text();

    // Untappd brewery URLs: /v/<slug>/<id> or /b/<slug>/<id>
    const linkMatch = searchHtml.match(/href="(\/(?:v|brewery)\/[^"]+\/\d+)"/);
    if (!linkMatch) return null;

    const pageUrl = `https://untappd.com${linkMatch[1]}`;
    console.log(`[brew-img] untappd brewery page: ${pageUrl}`);
    const pageRes = await fetch(pageUrl, {
      headers: { "User-Agent": UA, Accept: "text/html" },
      signal: AbortSignal.timeout(10000),
    });
    if (!pageRes.ok) return null;
    const html = await pageRes.text();

    const hd = html.match(/assets\.untappd\.com\/site\/brewery_logos_hd\/[^\s"'<>]+/);
    const sm = html.match(/assets\.untappd\.com\/site\/brewery_logos\/[^\s"'<>]+/);
    const found = hd?.[0] ?? sm?.[0];
    return found ? `https://${found}` : null;
  } catch (e: any) {
    console.warn(`[brew-img] untappd brewery scrape failed: ${e?.message?.substring(0, 60)}`);
    return null;
  }
}


// ─── Public API ──────────────────────────────────────────────────────────────

export type BreweryLogoResult = {
  url: string | null;
  source: string | null;       // 'untappd' | 'website'
  confidence: 'high' | 'low' | 'none';
};

/**
 * Search for the best brewery logo. Strict — returns 'none' when not confident.
 */
export async function findBestBreweryLogo(
  breweryName: string,
  websiteUrl: string | null | undefined,
  location?: string | null,
): Promise<BreweryLogoResult> {
  console.log(`[brew-img] searching logo for "${breweryName}"`);

  type Candidate = { url: string; source: string; trusted: boolean };
  const candidates: Candidate[] = [];
  const push = (c: Candidate) => {
    if (!candidates.some(x => x.url === c.url)) candidates.push(c);
  };

  const [websiteImgs, untappdLogo] = await Promise.all([
    fetchBreweryWebsiteLogo(websiteUrl ?? ""),
    fetchUntappdBreweryLogo(breweryName, location),
  ]);

  // Priority 1 — Untappd brewery logo (search matched the brewery name)
  if (untappdLogo) push({ url: untappdLogo, source: "untappd", trusted: true });

  // Priority 2 — official website assets (favicon + og:image)
  for (const img of websiteImgs.slice(0, 3)) push({ url: img, source: "website", trusted: false });

  if (candidates.length === 0) {
    console.log(`[brew-img] no candidates for "${breweryName}"`);
    return { url: null, source: null, confidence: "none" };
  }

  // Return first trusted source (Untappd) as high confidence
  const trusted = candidates.find(c => c.trusted);
  if (trusted) {
    console.log(`[brew-img] using trusted source (${trusted.source}) for "${breweryName}"`);
    return { url: trusted.url, source: trusted.source, confidence: "high" };
  }

  // Fallback: website source at low confidence
  const website = candidates.find(c => c.source === "website");
  if (website) {
    console.log(`[brew-img] using website source for "${breweryName}"`);
    return { url: website.url, source: website.source, confidence: "low" };
  }

  console.log(`[brew-img] no confident logo for "${breweryName}" — ignoring`);
  return { url: null, source: null, confidence: "none" };
}

// ─── Cloudinary re-host ──────────────────────────────────────────────────────

export async function uploadBreweryLogo(imageUrl: string, breweryId: number): Promise<string | null> {
  try {
    const result = await cloudinary.uploader.upload(imageUrl, {
      public_id: `brewery-logos/auto_${breweryId}_${Date.now()}`,
      resource_type: "image",
      transformation: [{ width: 600, height: 600, crop: "limit", quality: "auto:best", fetch_format: "auto" }],
      overwrite: true,
    });
    return result.secure_url;
  } catch (e: any) {
    console.warn(`[brew-img] cloudinary upload failed for brewery ${breweryId}: ${e?.message?.substring(0, 80)}`);
    return null;
  }
}
