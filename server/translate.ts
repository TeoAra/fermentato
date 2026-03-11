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

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export async function translateToItalian(text: string): Promise<string | null> {
  if (!text || text.trim().length < 5) return null;
  if (looksItalian(text)) return null;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const maxLen = 1200;
    const truncated = text.length > maxLen ? text.slice(0, maxLen) + '...' : text;

    const prompt = `Traduci in italiano questa descrizione di birra artigianale. Rispondi SOLO con il testo tradotto, senza aggiungere note o spiegazioni. Se il testo è già in italiano, restituiscilo invariato.\n\nTesto:\n${truncated}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 512 },
      }),
    });

    clearTimeout(timeout);

    if (!res.ok) {
      console.error('[translate] Gemini HTTP error:', res.status);
      return null;
    }

    const data = await res.json() as any;
    const translated = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (translated && translated.length > 5 && translated !== truncated) {
      return translated;
    }
  } catch (e: any) {
    if (e.name !== 'AbortError') {
      console.error('[translate] Gemini error:', e.message);
    }
  }

  return null;
}
