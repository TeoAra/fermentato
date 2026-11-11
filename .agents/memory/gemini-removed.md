---
name: Servizi gratuiti e ricerca immagini
description: Regola di prodotto contro Gemini e API AI a pagamento; vincoli di fedeltà e particolarità delle fonti gratuite.
---

## Regola sui servizi AI
L'utente ha chiesto: «rimuovi tutti i servizi di gemini collegati e mi metti alternative gratuite e open source».
Vale anche per scanner, traduzioni e script fuori dal percorso principale: non
reintrodurre API AI a pagamento o con quote gratuite seguite da fatturazione.
I servizi Google estranei a Gemini non rientrano automaticamente nella richiesta.

**Why:** richiesta esplicita dell'utente, dopo precedenti costi imprevisti della ricerca immagini.

**How to apply:** preferire elaborazione locale e servizi open source self-hosted.
Distinguere sempre assenza di tariffe API dal costo delle risorse del server.
Non dichiarare un servizio attivo se richiede ancora installazione/configurazione sul VPS.
Non mescolare vecchi vettori con embedding di modelli diversi, anche a dimensione uguale.

**The beer-card "Cerca sul web" image/logo search must stay free.** It uses NO Gemini and NO paid API.

**Why:** unexpected billing (a ~€260 spike) came from an earlier version of the *image finder* that used Gemini grounding + image-picking. That was removed. If prod is still charged, it's the manual-deploy VPS running old code — the fix is deploying current code, not editing code again.

## Free image-search stack (the "pacchetto gratis")
- Free sources can supply candidates, but their ranking or source name alone is not proof of identity. Low-confidence web candidates must not be automatically applied, including forced re-search.
- `findBestBreweryLogo`: Untappd → website → SearXNG.
- SearXNG is optional/self-hosted: `server/searxng.ts` reads `SEARXNG_URL`; returns `[]` when unset so everything degrades cleanly.

**Gotchas (not obvious from code):**
- Open Food Facts: the legacy `world.openfoodfacts.org/cgi/search.pl` returns **503 from datacenter IPs** — use `https://search.openfoodfacts.org/search?q=` (search-a-licious). Response key is `hits`, and `brands` is an **array**.
- OFF full-text is fuzzy: a bare beer name ("Nazionale") matches unrelated supermarket products — require BOTH beer-name and brewery match to disambiguate.
- SearXNG needs `formats: [html, json]` enabled in its `settings.yml` or JSON output 404s. Its JSON `img_src` is usually a direct URL; if it's an instance-proxied path and `SEARXNG_URL` is localhost/private, that URL is unreachable by Cloudinary/browser — skip it.

**How to apply:** before touching image search, confirm the change stays free; never reintroduce a paid/AI image picker here.

## Faithfulness and consistency
Creation, editing, preview and forced search must use the same identity checks and confidence threshold. Prefer no image to an unrelated label, a different beer variant, or a brewery cover photo used as a logo. Include the brewery in hosted-image identity; beer names are not unique across breweries.

**Why:** the user explicitly requested precise, faithful image searches consistent across every case.

**How to apply:** never relax identity validation just because a search is forced or a source is popular. Offer manual selection/upload when automatic verification fails.
