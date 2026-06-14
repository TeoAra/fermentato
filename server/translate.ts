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

export async function translateToItalian(_text: string): Promise<string | null> {
  return null;
}

export async function translateText(_text: string, _targetLang: string): Promise<string | null> {
  return null;
}
