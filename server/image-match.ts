/**
 * Text-relevance helpers that keep LOW-confidence web image results
 * (SearXNG / DuckDuckGo) from matching the WRONG beer or brewery — e.g. a beer
 * with the same name made by a different brewery ("Belvedere" by Rebel's vs
 * "Belvedere Bock" by another brewery). Trusted sources (Untappd, brewery
 * website, Open Food Facts) carry their own matching and bypass these checks.
 */

/** Lowercase + strip accents + keep alphanumerics only (space-separated). */
export function normalizeText(s: string): string {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Generic words that don't distinguish one brewery from another. */
const GENERIC_BREWERY_WORDS = new Set([
  "birrificio", "microbirrificio", "fabbrica", "brewery", "brewing", "brewpub",
  "brewery's", "brasserie", "brauerei", "cerveceria", "cerveza", "beer",
  "beers", "birra", "birre", "craft", "co", "company", "srl", "snc", "spa",
  "sas", "the", "di", "del", "della", "dei", "delle", "and", "of",
]);

/**
 * Distinctive brewery tokens (generic words + very short tokens removed). These
 * are what let us tell one brewery from another in free-text web results.
 */
export function breweryKeywords(breweryName: string): string[] {
  return normalizeText(breweryName)
    .split(" ")
    .filter(w => w.length >= 3 && !GENERIC_BREWERY_WORDS.has(w));
}

/** Beer-name tokens (>= 3 chars; falls back to >= 2 for very short names). */
export function beerNameTokens(beerName: string): string[] {
  const norm = normalizeText(beerName);
  let toks = norm.split(" ").filter(w => w.length >= 3);
  if (toks.length === 0) toks = norm.split(" ").filter(w => w.length >= 2);
  return toks;
}

/**
 * Does a web result's text (title + page URL + snippet) plausibly refer to THIS
 * beer by THIS brewery? Requires a strong beer-name match AND — when the brewery
 * has a distinctive name — at least one distinctive brewery token. That brewery
 * requirement is exactly what rejects same-name beers from other breweries.
 * When the brewery name has no distinctive token, we fall back to requiring a
 * near-exact beer-name match.
 */
export function webResultMatchesBeer(
  haystack: string,
  beerName: string,
  breweryName: string,
): boolean {
  const hay = normalizeText(haystack);
  if (!hay) return false;
  const beerToks = beerNameTokens(beerName);
  if (beerToks.length === 0) return false;
  const nameMatch = beerToks.filter(w => hay.includes(w)).length / beerToks.length;
  const brewToks = breweryKeywords(breweryName);
  if (brewToks.length > 0) {
    const brewHit = brewToks.some(w => hay.includes(w));
    return nameMatch >= 0.6 && brewHit;
  }
  return nameMatch >= 0.9;
}

/**
 * Does a web result's text plausibly refer to THIS brewery? Requires at least
 * half of the distinctive brewery tokens to appear. When the brewery name has
 * no distinctive token, we cannot verify it, so we reject (better no logo than
 * a wrong one).
 */
export function webResultMatchesBrewery(
  haystack: string,
  breweryName: string,
): boolean {
  const hay = normalizeText(haystack);
  if (!hay) return false;
  const brewToks = breweryKeywords(breweryName);
  if (brewToks.length === 0) return false;
  const hits = brewToks.filter(w => hay.includes(w)).length;
  return hits / brewToks.length >= 0.5;
}
