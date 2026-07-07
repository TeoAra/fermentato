---
name: Gemini removed + free image-search stack
description: Beer-card image/logo search is intentionally free (no Gemini/paid API); Gemini survives only in the camera OCR path. Plus the durable gotchas of the free stack.
---

## Gemini scope (as of this codebase)
- All Google Generative Language usage was removed EXCEPT the camera scanner `/api/scan/ocr` (still `gemini-2.0-flash`, needs `GEMINI_API_KEY`, with free fallbacks PaddleOCR/Tesseract/OCR.space). Translate/embeddings/bot-parser are stubs or regex.
- **The beer-card "Cerca sul web" image/logo search must stay free.** It uses NO Gemini and NO paid API.

**Why:** unexpected billing (a ~€260 spike) came from an earlier version of the *image finder* that used Gemini grounding + image-picking. That was removed. If prod is still charged, it's the manual-deploy VPS running old code — the fix is deploying current code, not editing code again.

## Free image-search stack (the "pacchetto gratis")
- `findBestBeerImage`: Untappd → brewery site og:image → Open Food Facts → (SearXNG + DuckDuckGo pool). First three are trusted/high; SearXNG/DDG are low-confidence and only used on forced re-search.
- `findBestBreweryLogo`: Untappd → website → SearXNG.
- SearXNG is optional/self-hosted: `server/searxng.ts` reads `SEARXNG_URL`; returns `[]` when unset so everything degrades cleanly.

**Gotchas (not obvious from code):**
- Open Food Facts: the legacy `world.openfoodfacts.org/cgi/search.pl` returns **503 from datacenter IPs** — use `https://search.openfoodfacts.org/search?q=` (search-a-licious). Response key is `hits`, and `brands` is an **array**.
- OFF full-text is fuzzy: a bare beer name ("Nazionale") matches unrelated supermarket products — require BOTH beer-name and brewery match to disambiguate.
- SearXNG needs `formats: [html, json]` enabled in its `settings.yml` or JSON output 404s. Its JSON `img_src` is usually a direct URL; if it's an instance-proxied path and `SEARXNG_URL` is localhost/private, that URL is unreachable by Cloudinary/browser — skip it.

**How to apply:** before touching image search, confirm the change stays free; never reintroduce a paid/AI image picker here.
