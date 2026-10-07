import { normalizeText, sameBeerIdentity, sameBreweryIdentity } from "./image-match";

import { createHash } from "node:crypto";

export function imageIdentityKey(beerName: string, breweryName: string, breweryId?: number): string {
  return createHash("sha256").update(JSON.stringify([normalizeText(beerName), normalizeText(breweryName), breweryId ?? null])).digest("hex").slice(0, 16);
}

export function htmlText(value: string): string {
  return value.replace(/<[^>]*>/g, " ")
    .replace(/&#(?:x([a-f\d]+)|(\d+));/gi, (_all, hex, decimal) => {
      const code = parseInt(hex ?? decimal, hex ? 16 : 10);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
    })
    .replace(/&amp;/gi, "&").replace(/&quot;/gi, '"')
    .replace(/&(?:apos|#39);/gi, "'").replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ").trim();
}

export function pageHeading(html: string): string {
  return htmlText(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "");
}

export function untappdBeerMatches(html: string, beerName: string, breweryName: string): boolean {
  const brewerySection = html.match(/<p\b[^>]*class=["'][^"']*\bbrewery\b[^"']*["'][^>]*>([\s\S]*?)<\/p>/i)?.[1];
  const brewery = htmlText((brewerySection ?? html).match(/<a\b[^>]*href=["'](?:https:\/\/untappd\.com)?\/w\/[^"']+["'][^>]*>([\s\S]*?)<\/a>/i)?.[1] ?? "");
  return sameBeerIdentity(beerName, breweryName, pageHeading(html), brewery);
}

export function untappdBreweryMatches(html: string, breweryName: string): boolean {
  return sameBreweryIdentity(breweryName, pageHeading(html));
}

/** Require a product heading, never a brewery homepage/category og:image. */
export function officialProductMatches(html: string, beerName: string): boolean {
  return !!normalizeText(beerName) && normalizeText(pageHeading(html)) === normalizeText(beerName);
}
