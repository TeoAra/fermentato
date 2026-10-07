import test from "node:test";
import assert from "node:assert/strict";
import { isFreshLocation, LOCATION_CACHE_MAX_AGE } from "../shared/location-policy";
import { sameBeerIdentity, sameBreweryIdentity, webResultMatchesBeer, webResultMatchesBrewery, normalizeText } from "../server/image-match";
import { untappdBeerMatches, untappdBreweryMatches, officialProductMatches, imageIdentityKey } from "../server/image-identity";
import { readFileSync } from "node:fs";

test("GPS: cache recente e valida; rifiuta coordinate vecchie, incomplete e fuori range", () => {
  const now = Date.now();
  const location = { lat: 45.4, lng: 11.9, accuracy: 16, timestamp: now };
  assert.ok(isFreshLocation(location, now));
  for (const invalid of [
    { lat: 45.4, lng: 11.9 },
    { ...location, timestamp: now - LOCATION_CACHE_MAX_AGE - 1 },
    { ...location, timestamp: now + 60000 },
    { ...location, accuracy: -1 },
    { ...location, lat: 95 },
    { ...location, lng: Infinity },
    null,
  ]) assert.equal(isFreshLocation(invalid, now), false);
});

test("Immagini: identità completa, accenti, numeri e alfabeti non latini", () => {
  assert.ok(sameBeerIdentity("Été 32", "Birrificio Lété", "Ete 32", "Lete Brewing Company"));
  assert.equal(sameBeerIdentity("Belvedere", "Rebel's", "Belvedere Bock", "Rebel's"), false);
  assert.equal(sameBeerIdentity("Belvedere", "Rebel's", "Belvedere", "Birrificio Altro"), false);
  assert.equal(sameBeerIdentity("X", "", "X", ""), false);
  assert.ok(sameBreweryIdentity("32 Via dei Birrai", "32 Via dei Birrai"));
  assert.equal(sameBreweryIdentity("Birrificio Alpha Beta", "Birrificio Alpha Gamma"), false);
  assert.ok(sameBeerIdentity("東京", "京都醸造", "東京", "京都醸造"));
  assert.equal(normalizeText("Été — 32"), "ete 32");
});

test("Ricerca web: niente sottostringhe o nomi parziali spacciati per corrispondenze", () => {
  assert.ok(webResultMatchesBeer("Eté 32 | Lété Brewing", "Été 32", "Lété"));
  assert.equal(webResultMatchesBeer("Principal Lete", "IPA", "Lete"), false);
  assert.equal(webResultMatchesBeer("Super IPA Lete", "Super IPA 2", "Lete"), false);
  assert.equal(webResultMatchesBeer("IPA altre birre", "IPA", ""), false);
  assert.equal(webResultMatchesBrewery("Alpha", "Alpha Beta"), false);
});

test("Untappd: query e primo risultato non bastano, si verifica la scheda", () => {
  const page = '<h1>Été 32</h1><p class="brewery"><a href="/w/lete/22">Lété Brewing</a></p>';
  assert.ok(untappdBeerMatches(page, "Ete 32", "Lete"));
  assert.equal(untappdBeerMatches(page, "Ete 32", "Altro"), false);
  assert.equal(untappdBeerMatches(page, "Ete 32 Bock", "Lete"), false);
  assert.ok(untappdBreweryMatches("<h1>Lété Brewing</h1>", "Lete"));
  assert.equal(untappdBreweryMatches("<h1>Lété Brewing</h1>", "Lete Nord"), false);
});

test("Sito ufficiale: prodotto esatto, non logo/homepage/variante", () => {
  assert.ok(officialProductMatches("<h1>Été 32</h1>", "Ete 32"));
  assert.equal(officialProductMatches("<h1>Été 32 Bock</h1>", "Ete 32"), false);
  assert.equal(officialProductMatches('<h1>Birrificio Lété</h1><meta property="og:title" content="Ete 32">', "Ete 32"), false);
});

test("Creazione, modifica e ricerca forzata mantengono la stessa soglia di affidabilità", () => {
  const routes = readFileSync("server/routes.ts", "utf8");
  for (const route of ["/api/beers/:id/find-image-preview", "/api/beer-images/search-by-name", "/api/breweries/:id/find-logo-preview"]) {
    const block = routes.slice(routes.indexOf(`app.post("${route}"`));
    const endpoint = block.slice(0, block.indexOf("\n  });") + 6);
    assert.match(endpoint, /result.confidence !== "high"/);
  }
  const finder = readFileSync("server/beer-image-finder.ts", "utf8");
  assert.match(finder.slice(finder.indexOf("export async function findAndUpdateBeerImage")), /result.confidence !== "high"/);
});

test("Etichette omonime di birrifici diversi non condividono la stessa immagine ospitata", () => {
  assert.notEqual(imageIdentityKey("IPA", "Alpha"), imageIdentityKey("IPA", "Beta"));
  assert.notEqual(imageIdentityKey("IPA", "Alpha", 1), imageIdentityKey("IPA", "Alpha", 2));
  assert.equal(imageIdentityKey(" ÉTÉ ", "Lété", 1), imageIdentityKey("ete", "lete", 1));
});
