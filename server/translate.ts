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

// In-memory cache: "text|targetLang" → translated text
const translationCache = new Map<string, string>();

async function callGemini(prompt: string, maxTokens = 2048): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: maxTokens },
      }),
    });
    clearTimeout(timeout);
    if (!res.ok) {
      console.error('[translate] Gemini HTTP error:', res.status);
      return null;
    }
    const data = await res.json() as any;
    const parts = data?.candidates?.[0]?.content?.parts;
    if (!parts || !Array.isArray(parts)) return null;
    const text = parts.map((p: any) => p?.text ?? '').join('').trim();
    return text || null;
  } catch (e: any) {
    clearTimeout(timeout);
    if (e.name !== 'AbortError') console.error('[translate] Gemini error:', e.message);
    return null;
  }
}

export async function translateToItalian(text: string): Promise<string | null> {
  if (!text || text.trim().length < 5) return null;
  if (looksItalian(text)) return null;

  const cacheKey = `${text.slice(0, 100)}|it`;
  if (translationCache.has(cacheKey)) return translationCache.get(cacheKey)!;

  const maxLen = 1200;
  const truncated = text.length > maxLen ? text.slice(0, maxLen) + '...' : text;
  const prompt = `Traduci in italiano questa descrizione di birra artigianale. Rispondi SOLO con il testo tradotto, senza aggiungere note o spiegazioni. Se il testo è già in italiano, restituiscilo invariato.\n\nTesto:\n${truncated}`;

  const translated = await callGemini(prompt);
  if (translated && translated.length > 10 && translated !== truncated) {
    // Only save if the translated text is at least 40% as long as the original
    // to prevent saving truncated/incomplete translations
    const minAcceptableLength = Math.max(20, text.length * 0.4);
    if (translated.length >= minAcceptableLength) {
      translationCache.set(cacheKey, translated);
      return translated;
    }
    console.warn(`[translate] Skipping short translation (${translated.length}/${text.length} chars) for: ${text.slice(0, 50)}...`);
  }
  return null;
}

const LANG_NAMES: Record<string, string> = {
  en: 'English', de: 'German', fr: 'French', es: 'Spanish', pt: 'Portuguese',
  nl: 'Dutch', pl: 'Polish', cs: 'Czech', sv: 'Swedish', da: 'Danish',
  fi: 'Finnish', no: 'Norwegian', ja: 'Japanese', zh: 'Chinese', ko: 'Korean',
  ru: 'Russian', ar: 'Arabic', tr: 'Turkish', ro: 'Romanian', hu: 'Hungarian',
};

export async function translateText(text: string, targetLang: string): Promise<string | null> {
  if (!text || text.trim().length < 5) return null;
  const lang = targetLang.split('-')[0].toLowerCase();
  if (lang === 'it') return null;

  const cacheKey = `${text.slice(0, 100)}|${lang}`;
  if (translationCache.has(cacheKey)) return translationCache.get(cacheKey)!;

  const langName = LANG_NAMES[lang] || lang;
  const maxLen = 1200;
  const truncated = text.length > maxLen ? text.slice(0, maxLen) + '...' : text;
  const prompt = `Translate the following craft beer description into ${langName}. Reply ONLY with the translated text, no notes or explanations.\n\nText:\n${truncated}`;

  const translated = await callGemini(prompt);
  if (translated && translated.length > 5 && translated !== truncated) {
    translationCache.set(cacheKey, translated);
    return translated;
  }
  return null;
}
