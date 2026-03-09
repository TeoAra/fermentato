
const ITALIAN_WORDS = [
  'birra', 'birre', ' la ', ' il ', ' di ', ' del ', ' della ', ' delle ', ' degli ',
  'artigianale', 'gusto', 'aroma', 'profumo', 'colore', 'schiuma', 'amaro', 'dolce',
  'secco', 'fresco', 'corposo', 'leggero', 'intenso', 'fruttato', 'luppolato',
  'malto', 'luppolo', 'fermentazione', 'gradazione', 'alcolica', 'basso fermentazione',
  'prodotto', 'prodotta', 'prodotto', 'realizzata', 'questo', 'questa', 'con un',
  ' con ', ' che ', ' per ', ' una ', ' uno ', ' gli ', ' nel ', ' nella ', ' ed ',
];

export function looksItalian(text: string): boolean {
  if (!text || text.trim().length < 10) return true;
  const lower = text.toLowerCase();
  const matches = ITALIAN_WORDS.filter(w => lower.includes(w));
  return matches.length >= 2;
}

export async function translateToItalian(text: string): Promise<string | null> {
  if (!text || text.trim().length < 5) return null;
  if (looksItalian(text)) return null;

  try {
    const maxLen = 450;
    const truncated = text.length > maxLen ? text.slice(0, maxLen) + '...' : text;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(truncated)}&langpair=en|it&de=fermenta.to@gmail.com`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    const data = await res.json() as any;
    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      const translated = data.responseData.translatedText;
      if (translated && translated !== truncated && !translated.includes('MYMEMORY WARNING')) {
        return translated;
      }
    }
  } catch (e: any) {
    if (e.name !== 'AbortError') {
      console.error('[translate] Error:', e.message);
    }
  }
  return null;
}
