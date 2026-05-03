/**
 * Brewery Logo Finder — finds the best web logo for a craft brewery.
 *
 * Strategy (in order):
 *  1. Brewery official website — favicon (Apple touch icon, large icon) + og:image
 *  2. Untappd brewery page — `/v/<slug>/<id>` first hit, scrape brewery_logos asset
 *  3. WhataBeer brewery page (via Gemini Search grounding) — `/birrifici/...`
 *  4. Gemini Vision picks the best logo among candidates
 *
 * Returns a confidence label so callers can decide to ignore weak matches.
 */

import { v2 as cloudinary } from "cloudinary";

const GEMINI_API_KEY = () => process.env.GEMINI_API_KEY ?? "";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

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

// ─── 3. WhataBeer brewery page via Gemini grounding ──────────────────────────

async function googlePagesForBrewery(breweryName: string, location?: string | null): Promise<string[]> {
  const key = GEMINI_API_KEY();
  if (!key) return [];
  const query = `"${breweryName}" ${location ?? ""} birrificio logo brand`.trim();
  try {
    const res = await fetch(`${GEMINI_URL}?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Cerca la pagina ufficiale e il logo del birrificio: ${query}. Cerca su whatabeer.com, untappd.com, ratebeer.com o sito ufficiale.` }] }],
        tools: [{ google_search: {} }],
        generationConfig: { temperature: 0, maxOutputTokens: 64 },
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return [];
    const data: any = await res.json();
    const chunks: any[] = data?.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
    return chunks
      .map((c: any) => c.web?.uri)
      .filter((u: any) => typeof u === "string" && u.startsWith("http") && !u.includes("google.com"))
      .slice(0, 6);
  } catch {
    return [];
  }
}

async function scrapeWhataBeerBreweryLogo(pageUrl: string): Promise<string | null> {
  try {
    const r = await fetch(pageUrl, {
      headers: { "User-Agent": UA, Accept: "text/html", "Accept-Language": "it-IT,it;q=0.9" },
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) return null;
    const html = await r.text();
    // Brewery logos live under /birrifici/ in the CDN
    const m = html.match(/<img[^>]+src=["'](https:\/\/cdn1\.whatabeer\.com\/birrifici\/[^"']+)["']/i);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
}

// ─── 4. Gemini Vision verification ───────────────────────────────────────────

async function fetchImageBase64(url: string): Promise<{ mimeType: string; data: string } | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "image/jpeg";
    const mimeType = ct.split(";")[0].trim();
    if (!mimeType.startsWith("image/")) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength > 3_000_000) return null;
    return { mimeType, data: Buffer.from(buf).toString("base64") };
  } catch {
    return null;
  }
}

/**
 * Vision-pick the best brewery logo. Returns the URL chosen, or null if none
 * of the candidates is clearly a logo for this brewery.
 */
async function geminiPickBestLogo(breweryName: string, candidates: string[]): Promise<string | null> {
  const key = GEMINI_API_KEY();
  if (!key || candidates.length === 0) return null;
  if (candidates.length === 1) {
    // Single candidate — verify with Vision; if Gemini missing, accept.
    const img = await fetchImageBase64(candidates[0]);
    if (!img) return null;
    try {
      const res = await fetch(`${GEMINI_URL}?key=${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: `Brewery: "${breweryName}"\n\nIs this image clearly the official brewery logo (square brand mark, wordmark or shield with the brewery name)? Reply YES or NO.` },
              { inlineData: img },
            ],
          }],
          generationConfig: { temperature: 0, maxOutputTokens: 4 },
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) return null;
      const data: any = await res.json();
      const raw = (data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim().toUpperCase();
      return raw.startsWith("Y") ? candidates[0] : null;
    } catch {
      return null;
    }
  }

  const top = candidates.slice(0, 4);
  const fetched = await Promise.all(top.map(fetchImageBase64));
  const visionParts: Array<{ url: string; part: any }> = [];
  for (let i = 0; i < top.length; i++) {
    if (fetched[i]) visionParts.push({ url: top[i], part: { inlineData: fetched[i]! } });
  }
  if (visionParts.length === 0) return null;

  const letters = ["A", "B", "C", "D"];
  const parts: any[] = [
    { text: `You are selecting the official LOGO of a craft brewery.\n\nBrewery: "${breweryName}"\n\nBelow are ${visionParts.length} images, each labelled with a letter.\nIMPORTANT: The letters A/B/C/D are IMAGE LABELS — they are not part of the brewery name.\n` },
  ];
  for (let i = 0; i < visionParts.length; i++) {
    parts.push({ text: `Image ${letters[i]}:` });
    parts.push(visionParts[i].part);
  }
  parts.push({ text: `\nYour task:\n1. Pick the image that is clearly the OFFICIAL BREWERY LOGO of "${breweryName}" — a brand mark, wordmark, shield, or tap badge that contains the brewery name or its iconic emblem.\n2. PREFER: square logo on plain background > shield/wordmark > stylised brand mark.\n3. REJECT: a single beer label, a glass pour, a bottle photo, a generic stock image, a brewery photo of the building, or a logo for a DIFFERENT brewery.\n4. If NONE clearly match "${breweryName}", reply NONE.\n\nReply with ONLY the letter (A/B/C/D) or NONE.` });

  try {
    const res = await fetch(`${GEMINI_URL}?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { temperature: 0, maxOutputTokens: 4 },
      }),
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) return null;
    const data: any = await res.json();
    const raw = (data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "").toUpperCase();
    const letter = raw.match(/\b([A-D])\b/)?.[1] ?? raw.match(/^([A-D])/)?.[1];
    const idx = letter ? letters.indexOf(letter) : -1;
    if (idx >= 0 && idx < visionParts.length) {
      console.log(`[brew-img] gemini vision picked "${letter}" (raw="${raw}")`);
      return visionParts[idx].url;
    }
    console.log(`[brew-img] gemini vision: no match for "${breweryName}" (raw="${raw}")`);
    return null;
  } catch (e: any) {
    console.warn(`[brew-img] vision failed: ${e?.message?.substring(0, 60)}`);
    return null;
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export type BreweryLogoResult = {
  url: string | null;
  source: string | null;       // 'whatabeer' | 'untappd' | 'website' | 'gemini-vision'
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

  const [websiteImgs, untappdLogo, googlePages] = await Promise.all([
    fetchBreweryWebsiteLogo(websiteUrl ?? ""),
    fetchUntappdBreweryLogo(breweryName, location),
    googlePagesForBrewery(breweryName, location),
  ]);

  // Priority 1 — WhataBeer brewery page (Italian DB, name-matched URL slug)
  const wbUrls = googlePages.filter(u => u.includes("whatabeer.com/birrifici/"));
  for (const wb of wbUrls.slice(0, 2)) {
    const img = await scrapeWhataBeerBreweryLogo(wb.split("?")[0]);
    if (img) {
      push({ url: img, source: "whatabeer", trusted: true });
      break;
    }
  }

  // Priority 2 — Untappd brewery logo (search matched the brewery name)
  if (untappdLogo) push({ url: untappdLogo, source: "untappd", trusted: true });

  // Priority 3 — official website assets (favicon + og:image)
  for (const img of websiteImgs.slice(0, 3)) push({ url: img, source: "website", trusted: false });

  if (candidates.length === 0) {
    console.log(`[brew-img] no candidates for "${breweryName}"`);
    return { url: null, source: null, confidence: "none" };
  }

  // If we have a trusted (name-matched DB) candidate AND no other options, just return it.
  const trusted = candidates.find(c => c.trusted);
  if (trusted && candidates.length === 1) {
    return { url: trusted.url, source: trusted.source, confidence: "high" };
  }

  // Otherwise let Gemini Vision verify the best one.
  const visionPick = await geminiPickBestLogo(breweryName, candidates.map(c => c.url));
  if (visionPick) {
    const matched = candidates.find(c => c.url === visionPick);
    return { url: visionPick, source: matched?.source ?? "gemini-vision", confidence: "high" };
  }

  // Vision rejected everything, but a trusted source exists — use it.
  if (trusted) {
    console.log(`[brew-img] using trusted source (${trusted.source}) for "${breweryName}"`);
    return { url: trusted.url, source: trusted.source, confidence: "high" };
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
