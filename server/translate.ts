const ITALIAN_WORDS = [
  'birra', 'birre', ' la ', ' il ', ' di ', ' del ', ' della ', ' delle ', ' degli ',
  'artigianale', 'gusto', 'aroma', 'profumo', 'colore', 'schiuma', 'amaro', 'dolce',
  'secco', 'fresco', 'corposo', 'leggero', 'intenso', 'fruttato', 'luppolato',
  'malto', 'luppolo', 'fermentazione', 'gradazione', 'alcolica',
  'prodotto', 'prodotta', 'realizzata', 'questo', 'questa', 'con un',
  ' con ', ' che ', ' per ', ' una ', ' uno ', ' gli ', ' nel ', ' nella ', ' ed ',
];

export function looksItalian(text: string): boolean {
  if (!text || text.trim().length < 10) return true;
  const lower = text.toLowerCase();
  const matches = ITALIAN_WORDS.filter(w => lower.includes(w));
  return matches.length >= 2;
}

export function translationAvailable(): boolean {
  return Boolean(process.env.LIBRETRANSLATE_URL?.trim());
}

export async function translateToItalian(text: string): Promise<string | null> {
  return translateText(text, "it");
}

// A self-hosted instance, not a hosted "free tier" or a paid API fallback.
export async function translateText(text: string, targetLang: string): Promise<string | null> {
  const base = process.env.LIBRETRANSLATE_URL?.trim();
  if (!base || !text?.trim()) return null;
  try {
    const endpoint = new URL(`${base.replace(/\/+$/, "")}/translate`);
    if (!["http:", "https:"].includes(endpoint.protocol)) return null;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: text, source: "auto", target: targetLang.split("-")[0].toLowerCase(), format: "text" }),
      signal: AbortSignal.timeout(15000),
      redirect: "error",
    });
    if (!response.ok) return null;
    const data = await response.json();
    return typeof data.translatedText === "string" && data.translatedText.trim()
      ? data.translatedText : null;
  } catch {
    return null;
  }
}
