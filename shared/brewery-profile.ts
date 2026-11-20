import { z } from "zod";
import { descriptionToText } from "./description-text";

/** Legacy rich descriptions remain readable until the owner explicitly saves text. */
export function getBreweryDescription(profile: {
  description?: string | null; descriptionHtml?: string | null; richContent?: string | null;
} | null | undefined): string {
  for (const value of [profile?.descriptionHtml, profile?.description, profile?.richContent]) {
    const text = descriptionToText(value);
    if (text) return text;
  }
  return "";
}

const optionalText = z.string().trim().max(2000).nullable().optional()
  .transform(value => value === "" ? null : value);
const optionalLink = optionalText.transform((value, ctx) => {
  if (!value) return value;
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`);
    if (!["https:", "http:"].includes(url.protocol) || !url.hostname) throw new Error();
    return url.href;
  } catch {
    ctx.addIssue({ code: "custom", message: "Inserisci un collegamento web valido (http o https)" });
    return z.NEVER;
  }
});
const optionalImage = optionalText.transform((value, ctx) => {
  if (value?.startsWith("/") && !value.startsWith("//")) return value;
  const parsed = optionalLink.safeParse(value);
  if (parsed.success) return parsed.data;
  ctx.addIssue({ code: "custom", message: "Inserisci un indirizzo immagine valido" });
  return z.NEVER;
});
const coordinate = (limit: number) => z.union([z.string(), z.number(), z.null()]).optional()
  .transform((value, ctx) => {
    if (value === undefined) return undefined;
    if (value === null || (typeof value === "string" && !value.trim())) return null;
    const number = Number(value);
    if (!Number.isFinite(number) || Math.abs(number) > limit) {
      ctx.addIssue({ code: "custom", message: "Coordinate non valide" });
      return z.NEVER;
    }
    return String(number);
  });

// Never accept identifiers, ratings, archive flags or administrative metadata here.
export const breweryProfilePatchSchema = z.object({
  name: z.string().trim().min(1, "Inserisci il nome").max(255).optional(),
  location: z.string().trim().min(1, "Inserisci la posizione").max(2000).optional(),
  region: z.string().trim().max(255).optional(),
  country: optionalText,
  description: z.string().max(30000).nullable().optional(),
  descriptionHtml: z.string().max(30000).nullable().optional(),
  logoUrl: optionalImage, coverImageUrl: optionalImage, websiteUrl: optionalLink,
  phone: optionalText, email: optionalText, vatNumber: optionalText,
  instagramUrl: optionalLink, facebookUrl: optionalLink, tiktokUrl: optionalLink,
  latitude: coordinate(90), longitude: coordinate(180),
});

export function parseBreweryProfilePatch(input: unknown) {
  const parsed = breweryProfilePatchSchema.parse(input);
  const patch = Object.fromEntries(Object.entries(parsed).filter(([, value]) => value !== undefined)) as typeof parsed;
  if (Object.hasOwn(patch, "description")) {
    patch.description = descriptionToText(patch.description) || null;
    patch.descriptionHtml = null;
  } else if (Object.hasOwn(patch, "descriptionHtml")) {
    patch.description = descriptionToText(patch.descriptionHtml) || null;
    patch.descriptionHtml = null;
  }
  return patch;
}

/** Company email is public; VAT, owner identifiers and moderation metadata are not. */
export function publicBreweryProfile(profile: Record<string, any>) {
  const keys = [
    "id", "name", "location", "region", "country", "logoUrl", "coverImageUrl",
    "websiteUrl", "phone", "email", "instagramUrl", "facebookUrl", "tiktokUrl",
    "latitude", "longitude", "rating", "isClosed",
  ] as const;
  return {
    ...Object.fromEntries(keys.map(key => [key, profile[key]])),
    description: getBreweryDescription(profile),
  };
}
