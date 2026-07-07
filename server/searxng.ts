/**
 * SearXNG image search client (self-hosted meta-search).
 *
 * Configure with the SEARXNG_URL env var (e.g. https://searx.example.com).
 * When it is unset, searxngSearchImages() returns [] so callers fall back to
 * their other free sources (Untappd, Open Food Facts, DuckDuckGo).
 *
 * The SearXNG instance MUST have the JSON output format enabled in its
 * settings.yml:
 *
 *   search:
 *     formats:
 *       - html
 *       - json
 */

export interface SearchImage {
  image: string; // direct image URL
  url: string; // source/page URL
  width: number;
  height: number;
}

function baseUrl(): string | null {
  const raw = process.env.SEARXNG_URL?.trim();
  if (!raw || !/^https?:\/\//.test(raw)) return null;
  return raw.replace(/\/+$/, "");
}

export function isSearxngConfigured(): boolean {
  return baseUrl() !== null;
}

/** Parse a "1200x800" / "1200×800" resolution string into width/height. */
function parseResolution(res?: string): { width: number; height: number } {
  if (!res || typeof res !== "string") return { width: 0, height: 0 };
  const m = res.match(/(\d+)\s*[x×]\s*(\d+)/i);
  if (!m) return { width: 0, height: 0 };
  return { width: parseInt(m[1], 10), height: parseInt(m[2], 10) };
}

/** True for localhost / RFC1918 private hosts that are unreachable externally. */
function isPrivateBase(base: string): boolean {
  try {
    const host = new URL(base).hostname;
    return (
      host === "localhost" ||
      host === "::1" ||
      /^127\./.test(host) ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    );
  } catch {
    return false;
  }
}

/**
 * Resolve a SearXNG img_src that may be protocol-relative or instance-proxied.
 * A proxied path (`/image_proxy?...`) is only reachable through the instance, so
 * when the instance is private/localhost we skip it (return "") — Cloudinary and
 * the browser preview could never load it. Direct http(s) URLs are the common
 * case in JSON output and pass through unchanged.
 */
function resolveImgSrc(src: string, base: string, basePrivate: boolean): string {
  if (!src) return "";
  if (src.startsWith("//")) return `https:${src}`;
  if (src.startsWith("/")) return basePrivate ? "" : `${base}${src}`; // proxied through the instance
  return src;
}

/**
 * Search images via a self-hosted SearXNG instance.
 * Returns a normalized list; empty when SEARXNG_URL is not configured or the
 * request fails (callers must treat [] as "no results, try other sources").
 */
export async function searxngSearchImages(query: string, limit = 10): Promise<SearchImage[]> {
  const base = baseUrl();
  if (!base) return [];
  const basePrivate = isPrivateBase(base);
  try {
    const url =
      `${base}/search?q=${encodeURIComponent(query)}` +
      `&format=json&categories=images&language=it&safesearch=1`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Fermentato-Bot/1.0)",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data: any = await res.json();
    const results: any[] = Array.isArray(data?.results) ? data.results : [];

    const out: SearchImage[] = [];
    const seen = new Set<string>();
    for (const r of results) {
      const image = resolveImgSrc(String(r?.img_src ?? ""), base, basePrivate);
      if (!image.startsWith("http") || seen.has(image)) continue;
      seen.add(image);
      const { width, height } = parseResolution(r?.resolution);
      out.push({
        image,
        url: String(r?.url ?? image),
        width,
        height,
      });
      if (out.length >= limit) break;
    }
    return out;
  } catch {
    return [];
  }
}
