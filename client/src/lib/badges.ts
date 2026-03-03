export interface BadgeLevel {
  level: number;
  name: string;
  emoji: string;
  color: string;
  bgFrom: string;
  bgTo: string;
  textColor: string;
  borderColor: string;
  minReviews: number;
  description: string;
}

export const BADGE_LEVELS: BadgeLevel[] = [
  {
    level: 0,
    name: "Germoglio",
    emoji: "🌱",
    color: "emerald",
    bgFrom: "from-emerald-400",
    bgTo: "to-green-500",
    textColor: "text-emerald-700 dark:text-emerald-300",
    borderColor: "border-emerald-300 dark:border-emerald-700",
    minReviews: 0,
    description: "Hai appena iniziato il viaggio nel mondo della birra artigianale!",
  },
  {
    level: 1,
    name: "Curioso",
    emoji: "🍺",
    color: "lime",
    bgFrom: "from-lime-400",
    bgTo: "to-green-500",
    textColor: "text-lime-700 dark:text-lime-300",
    borderColor: "border-lime-300 dark:border-lime-700",
    minReviews: 5,
    description: "Stai cominciando ad esplorare con curiosità.",
  },
  {
    level: 2,
    name: "Assaggiatore",
    emoji: "🍻",
    color: "yellow",
    bgFrom: "from-yellow-400",
    bgTo: "to-amber-500",
    textColor: "text-yellow-700 dark:text-yellow-300",
    borderColor: "border-yellow-300 dark:border-yellow-700",
    minReviews: 20,
    description: "Il tuo palato si sta affinando. La birra diventa una passione.",
  },
  {
    level: 3,
    name: "Degustatore",
    emoji: "⭐",
    color: "amber",
    bgFrom: "from-amber-400",
    bgTo: "to-orange-500",
    textColor: "text-amber-700 dark:text-amber-300",
    borderColor: "border-amber-300 dark:border-amber-700",
    minReviews: 50,
    description: "Il tuo naso non mente. Sai riconoscere gli aromi al volo.",
  },
  {
    level: 4,
    name: "Esperto",
    emoji: "🏅",
    color: "orange",
    bgFrom: "from-orange-400",
    bgTo: "to-red-500",
    textColor: "text-orange-700 dark:text-orange-300",
    borderColor: "border-orange-300 dark:border-orange-700",
    minReviews: 100,
    description: "Conti più birre che giorni dell'anno. Rispettabile.",
  },
  {
    level: 5,
    name: "Mastro Birraio",
    emoji: "🏆",
    color: "red",
    bgFrom: "from-red-500",
    bgTo: "to-rose-600",
    textColor: "text-red-700 dark:text-red-300",
    borderColor: "border-red-300 dark:border-red-700",
    minReviews: 200,
    description: "Un'autorità. Le tue recensioni sono oro colato per i birrofili.",
  },
  {
    level: 6,
    name: "Gran Maestro",
    emoji: "💎",
    color: "purple",
    bgFrom: "from-purple-500",
    bgTo: "to-violet-600",
    textColor: "text-purple-700 dark:text-purple-300",
    borderColor: "border-purple-300 dark:border-purple-700",
    minReviews: 350,
    description: "Raro come una birra perfetta. La community ti guarda con ammirazione.",
  },
  {
    level: 7,
    name: "Leggenda del Luppolo",
    emoji: "🌟",
    color: "gold",
    bgFrom: "from-yellow-400",
    bgTo: "to-amber-300",
    textColor: "text-yellow-600 dark:text-yellow-200",
    borderColor: "border-yellow-400 dark:border-yellow-500",
    minReviews: 500,
    description: "Sei la leggenda. Ogni tua parola vale un boccale d'oro.",
  },
];

export function getBadgeForCount(reviewCount: number): BadgeLevel {
  let badge = BADGE_LEVELS[0];
  for (const level of BADGE_LEVELS) {
    if (reviewCount >= level.minReviews) {
      badge = level;
    } else {
      break;
    }
  }
  return badge;
}

export function getNextBadge(reviewCount: number): BadgeLevel | null {
  const current = getBadgeForCount(reviewCount);
  const nextIndex = BADGE_LEVELS.findIndex(l => l.level === current.level + 1);
  return nextIndex >= 0 ? BADGE_LEVELS[nextIndex] : null;
}

export function getProgressToNextBadge(reviewCount: number): number {
  const current = getBadgeForCount(reviewCount);
  const next = getNextBadge(reviewCount);
  if (!next) return 100;
  const progress = ((reviewCount - current.minReviews) / (next.minReviews - current.minReviews)) * 100;
  return Math.min(100, Math.max(0, progress));
}

// ============================================================
// ACHIEVEMENT BADGES (Untappd-style)
// ============================================================

export type AchievementCategory = 'style' | 'country' | 'quantity' | 'special';

export interface Achievement {
  id: string;
  name: string;
  emoji: string;
  category: AchievementCategory;
  description: string;
  color: string; // tailwind color name
  check: (data: AchievementData) => boolean;
}

export interface AchievementData {
  reviewCount: number;
  tastingCount: number;
  styleCounts: Record<string, number>; // style -> count
  countryCounts: Record<string, number>; // country -> count
  countryCount: number; // unique countries tried
  styleCount: number; // unique styles tried
}

// Helper: check if any style matching keyword has count >= threshold
function styleMin(data: AchievementData, keywords: string[], min: number) {
  return Object.entries(data.styleCounts).some(([style, count]) =>
    keywords.some(kw => style.toLowerCase().includes(kw.toLowerCase())) && count >= min
  );
}

function countryMin(data: AchievementData, countryKeywords: string[], min: number) {
  return Object.entries(data.countryCounts).some(([country, count]) =>
    countryKeywords.some(kw => country.toLowerCase().includes(kw.toLowerCase())) && count >= min
  );
}

export const ALL_ACHIEVEMENTS: Achievement[] = [
  // ── QUANTITY ──────────────────────────────────────────
  { id: 'first_taste', name: 'Primo Sorso', emoji: '🥂', category: 'quantity', color: 'emerald', description: 'Prima birra assaggiata su Fermenta.to', check: d => d.tastingCount >= 1 },
  { id: 'first_review', name: 'Prima Stella', emoji: '⭐', category: 'quantity', color: 'yellow', description: 'Prima recensione con voto', check: d => d.reviewCount >= 1 },
  { id: 'ten_reviews', name: 'Doppia Cifra', emoji: '🔟', category: 'quantity', color: 'blue', description: '10 recensioni completate', check: d => d.reviewCount >= 10 },
  { id: 'fifty_reviews', name: 'Cinquantone', emoji: '5️⃣0️⃣', category: 'quantity', color: 'amber', description: '50 recensioni completate', check: d => d.reviewCount >= 50 },
  { id: 'century', name: 'Centurione', emoji: '💯', category: 'quantity', color: 'orange', description: '100 recensioni — sei un veterano', check: d => d.reviewCount >= 100 },
  { id: 'explorer_styles', name: 'Stile Libero', emoji: '🎨', category: 'quantity', color: 'violet', description: 'Assaggiato birre di 10 stili diversi', check: d => d.styleCount >= 10 },
  { id: 'style_master', name: 'Maestro degli Stili', emoji: '🎓', category: 'quantity', color: 'purple', description: 'Assaggiato birre di 20 stili diversi', check: d => d.styleCount >= 20 },
  { id: 'world_traveler', name: 'Giramondo', emoji: '🌍', category: 'quantity', color: 'teal', description: 'Birre da 5 paesi diversi', check: d => d.countryCount >= 5 },
  { id: 'globe_trotter', name: 'Globe Trotter', emoji: '✈️', category: 'quantity', color: 'sky', description: 'Birre da 10 paesi diversi', check: d => d.countryCount >= 10 },

  // ── IPA / HOPS ────────────────────────────────────────
  { id: 'ipa_starter', name: 'Luppolaro', emoji: '🌿', category: 'style', color: 'green', description: '3+ IPA assaggiate', check: d => styleMin(d, ['ipa', 'india pale'], 3) },
  { id: 'ipa_fan', name: 'IPA Monk', emoji: '🍃', category: 'style', color: 'lime', description: '10+ IPA assaggiate', check: d => styleMin(d, ['ipa', 'india pale'], 10) },
  { id: 'ipa_master', name: 'Hop Head', emoji: '🌾', category: 'style', color: 'emerald', description: '25+ IPA — il luppolo scorre nelle vene', check: d => styleMin(d, ['ipa', 'india pale'], 25) },
  { id: 'hazy_lover', name: 'Hazy Lover', emoji: '☁️', category: 'style', color: 'yellow', description: '5+ New England / Hazy IPA', check: d => styleMin(d, ['hazy', 'new england', 'neipa', 'juicy'], 5) },
  { id: 'double_trouble', name: 'Double Trouble', emoji: '💥', category: 'style', color: 'red', description: '5+ Double / Imperial IPA', check: d => styleMin(d, ['double ipa', 'dipa', 'imperial ipa', 'triple ipa'], 5) },
  { id: 'session_hero', name: 'Session Hero', emoji: '🏃', category: 'style', color: 'blue', description: '5+ Session IPA o Session Ale', check: d => styleMin(d, ['session ipa', 'session ale'], 5) },

  // ── DARK BEERS ────────────────────────────────────────
  { id: 'dark_side', name: 'Lato Oscuro', emoji: '🌑', category: 'style', color: 'gray', description: '3+ Stout o Porter assaggiate', check: d => styleMin(d, ['stout', 'porter'], 3) },
  { id: 'stout_hunter', name: 'Stout Hunter', emoji: '🖤', category: 'style', color: 'slate', description: '10+ Stout o Porter', check: d => styleMin(d, ['stout', 'porter'], 10) },
  { id: 'imperial_master', name: 'Imperial Overlord', emoji: '👑', category: 'style', color: 'indigo', description: '5+ Imperial Stout', check: d => styleMin(d, ['imperial stout', 'russian imperial'], 5) },
  { id: 'milk_stout', name: 'Dolce Oscurità', emoji: '🍫', category: 'style', color: 'brown', description: '3+ Milk Stout o Sweet Stout', check: d => styleMin(d, ['milk stout', 'sweet stout', 'oatmeal stout'], 3) },

  // ── WHEAT / FRUITY ───────────────────────────────────
  { id: 'weizen_fan', name: 'Weizen Fan', emoji: '🌾', category: 'style', color: 'amber', description: '3+ Wheat Beer o Weizen', check: d => styleMin(d, ['weizen', 'wheat', 'weiss', 'witbier', 'wit '], 3) },
  { id: 'hefeweizen_hero', name: 'Hefeweizen Hero', emoji: '🏺', category: 'style', color: 'yellow', description: '10+ Hefeweizen o Wheat', check: d => styleMin(d, ['weizen', 'wheat', 'hefeweizen'], 10) },
  { id: 'fruity_explorer', name: 'Fruttoso', emoji: '🍓', category: 'style', color: 'pink', description: '5+ Fruited Ale o Sour con frutta', check: d => styleMin(d, ['fruited', 'fruit beer', 'fruit ale', 'raspberry', 'cherry'], 5) },
  { id: 'sour_lover', name: 'Amante dell\'Acido', emoji: '😬', category: 'style', color: 'lime', description: '5+ Sour Ale', check: d => styleMin(d, ['sour', 'lambic', 'gose', 'berliner', 'gueuze', 'kriek'], 5) },
  { id: 'lambic_pilgrim', name: 'Pellegrino Lambic', emoji: '🍷', category: 'style', color: 'red', description: '3+ Lambic, Gueuze o Kriek', check: d => styleMin(d, ['lambic', 'gueuze', 'kriek'], 3) },

  // ── LAGER / PILSNER ──────────────────────────────────
  { id: 'lager_lover', name: 'Lager Lover', emoji: '🍶', category: 'style', color: 'blue', description: '5+ Lager o Pilsner', check: d => styleMin(d, ['lager', 'pilsner', 'pilsener', 'pils'], 5) },
  { id: 'pilsner_purist', name: 'Purista Boemo', emoji: '🏰', category: 'style', color: 'sky', description: '10+ Pilsner', check: d => styleMin(d, ['pilsner', 'pilsener', 'pils'], 10) },
  { id: 'helles_hero', name: 'Helles Hero', emoji: '☀️', category: 'style', color: 'yellow', description: '5+ Helles o Munich Lager', check: d => styleMin(d, ['helles', 'munich lager', 'märzen', 'marzen', 'munich'], 5) },

  // ── BELGIAN / ABBEY ──────────────────────────────────
  { id: 'belgian_fan', name: 'Belga di Cuore', emoji: '🧇', category: 'style', color: 'gold', description: '3+ Belgian Ale', check: d => styleMin(d, ['belgian', 'saison', 'dubbel', 'tripel', 'quad', 'abbey'], 3) },
  { id: 'trappist_monk', name: 'Monaco Trappista', emoji: '⛪', category: 'style', color: 'amber', description: '5+ Trappist o Abbey', check: d => styleMin(d, ['trappist', 'abbey', 'dubbel', 'tripel', 'quadrupel'], 5) },
  { id: 'saison_master', name: 'Contadino Belga', emoji: '🌻', category: 'style', color: 'orange', description: '5+ Saison o Farmhouse Ale', check: d => styleMin(d, ['saison', 'farmhouse', 'bière de garde'], 5) },

  // ── STRONG / BARLEYWINE ──────────────────────────────
  { id: 'strong_ale', name: 'Testa Dura', emoji: '💪', category: 'style', color: 'orange', description: '3+ Strong Ale o Barleywine', check: d => styleMin(d, ['barleywine', 'strong ale', 'wee heavy', 'scotch ale'], 3) },
  { id: 'bock_fan', name: 'Bock Fan', emoji: '🐐', category: 'style', color: 'brown', description: '3+ Bock o Doppelbock', check: d => styleMin(d, ['bock', 'doppelbock', 'eisbock', 'maibock'], 3) },

  // ── SPECIALTY ─────────────────────────────────────────
  { id: 'craft_lover', name: 'Craft Addict', emoji: '🔨', category: 'style', color: 'teal', description: '5+ Pale Ale artigianali', check: d => styleMin(d, ['pale ale', 'american pale', 'apa'], 5) },
  { id: 'amber_lover', name: 'Ambra Pura', emoji: '🍯', category: 'style', color: 'amber', description: '5+ Amber Ale o Red Ale', check: d => styleMin(d, ['amber ale', 'red ale', 'irish red', 'amber ipa'], 5) },
  { id: 'porter_power', name: 'Porter Power', emoji: '⚓', category: 'style', color: 'slate', description: '5+ Baltic Porter o Robust Porter', check: d => styleMin(d, ['porter'], 5) },
  { id: 'gluten_free', name: 'Libero dal Glutine', emoji: '🌾', category: 'style', color: 'green', description: '3+ Gluten Free Beer', check: d => styleMin(d, ['gluten free', 'gluten-free', 'sans gluten'], 3) },
  { id: 'alcohol_free', name: 'Astemia Virtuosa', emoji: '💧', category: 'style', color: 'cyan', description: '3+ Analcolica o Low-Alcohol', check: d => styleMin(d, ['alcohol free', 'non-alcoholic', 'low alcohol', '0.0', 'dealcoolata'], 3) },

  // ── COUNTRIES ─────────────────────────────────────────
  { id: 'italian_pride', name: 'Patriota', emoji: '🇮🇹', category: 'country', color: 'green', description: '5+ birre italiane', check: d => countryMin(d, ['italy', 'italia', 'it'], 5) },
  { id: 'italian_master', name: 'Maestro Italiano', emoji: '🏛️', category: 'country', color: 'red', description: '20+ birre italiane', check: d => countryMin(d, ['italy', 'italia', 'it'], 20) },
  { id: 'german_fan', name: 'Amico Tedesco', emoji: '🇩🇪', category: 'country', color: 'yellow', description: '5+ birre tedesche', check: d => countryMin(d, ['germany', 'deutschland', 'de'], 5) },
  { id: 'german_meister', name: 'Reinheitsgebot', emoji: '🥨', category: 'country', color: 'amber', description: '15+ birre tedesche', check: d => countryMin(d, ['germany', 'deutschland', 'de'], 15) },
  { id: 'belgian_pilgrim', name: 'Pellegrino Belga', emoji: '🇧🇪', category: 'country', color: 'red', description: '5+ birre belghe', check: d => countryMin(d, ['belgium', 'belgique', 'belgie', 'be'], 5) },
  { id: 'belgian_connoisseur', name: 'Conoscitore Belga', emoji: '🍺🇧🇪', category: 'country', color: 'yellow', description: '15+ birre belghe — respect!', check: d => countryMin(d, ['belgium', 'belgique', 'belgie', 'be'], 15) },
  { id: 'american_dream', name: 'American Dream', emoji: '🇺🇸', category: 'country', color: 'blue', description: '5+ birre americane', check: d => countryMin(d, ['united states', 'usa', 'us', 'america'], 5) },
  { id: 'american_craft', name: 'Craft American', emoji: '🗽', category: 'country', color: 'red', description: '15+ birre americane', check: d => countryMin(d, ['united states', 'usa', 'us', 'america'], 15) },
  { id: 'real_ale_fan', name: 'Real Ale Fan', emoji: '🇬🇧', category: 'country', color: 'red', description: '5+ birre britanniche', check: d => countryMin(d, ['united kingdom', 'england', 'scotland', 'wales', 'gb', 'uk'], 5) },
  { id: 'czech_pilgrim', name: 'Pellegrino Ceco', emoji: '🇨🇿', category: 'country', color: 'red', description: '5+ birre ceche', check: d => countryMin(d, ['czech', 'czechia', 'bohemia', 'cz'], 5) },
  { id: 'nordic_explorer', name: 'Esploratore Nordico', emoji: '🇸🇪', category: 'country', color: 'blue', description: '5+ birre scandinave', check: d => countryMin(d, ['sweden', 'norway', 'denmark', 'finland', 'iceland'], 5) },
  { id: 'dutch_master', name: 'Olandese Volante', emoji: '🇳🇱', category: 'country', color: 'orange', description: '5+ birre olandesi', check: d => countryMin(d, ['netherlands', 'holland', 'nl'], 5) },
  { id: 'japanese_zen', name: 'Zen Giapponese', emoji: '🇯🇵', category: 'country', color: 'red', description: '3+ birre giapponesi', check: d => countryMin(d, ['japan', 'giappone', 'jp'], 3) },
  { id: 'aussie_mate', name: 'Mate Australiano', emoji: '🇦🇺', category: 'country', color: 'amber', description: '3+ birre australiane', check: d => countryMin(d, ['australia', 'au'], 3) },
  { id: 'french_touch', name: 'French Touch', emoji: '🇫🇷', category: 'country', color: 'blue', description: '5+ birre francesi', check: d => countryMin(d, ['france', 'fr', 'francia'], 5) },
  { id: 'spanish_vibes', name: 'Fiesta Cervecera', emoji: '🇪🇸', category: 'country', color: 'red', description: '3+ birre spagnole', check: d => countryMin(d, ['spain', 'españa', 'es', 'spagna'], 3) },
  { id: 'canadian_moose', name: 'Canadian Moose', emoji: '🇨🇦', category: 'country', color: 'red', description: '3+ birre canadesi', check: d => countryMin(d, ['canada', 'ca'], 3) },
  { id: 'irish_spirit', name: 'Spirito Irlandese', emoji: '🇮🇪', category: 'country', color: 'green', description: '3+ birre irlandesi', check: d => countryMin(d, ['ireland', 'irish', 'ie'], 3) },
  { id: 'polish_power', name: 'Polish Power', emoji: '🇵🇱', category: 'country', color: 'red', description: '3+ birre polacche', check: d => countryMin(d, ['poland', 'polska', 'pl'], 3) },
  { id: 'austrian_alps', name: 'Alpi Austriache', emoji: '🇦🇹', category: 'country', color: 'red', description: '3+ birre austriache', check: d => countryMin(d, ['austria', 'at', 'österreich'], 3) },
  { id: 'swiss_precision', name: 'Precisione Svizzera', emoji: '🇨🇭', category: 'country', color: 'red', description: '3+ birre svizzere', check: d => countryMin(d, ['switzerland', 'swiss', 'schweiz', 'ch'], 3) },
  { id: 'new_world', name: 'Nuovo Mondo', emoji: '🌎', category: 'country', color: 'teal', description: '3+ birre da Nuova Zelanda o Sudamerica', check: d => countryMin(d, ['new zealand', 'nz', 'brazil', 'argentina', 'chile'], 3) },
];

export function computeAchievements(data: AchievementData): Achievement[] {
  return ALL_ACHIEVEMENTS.filter(a => a.check(data));
}

export const ACHIEVEMENT_CATEGORY_LABEL: Record<AchievementCategory, string> = {
  quantity: 'Traguardi',
  style: 'Stili',
  country: 'Paesi',
  special: 'Speciali',
};

export const ACHIEVEMENT_CATEGORY_EMOJI: Record<AchievementCategory, string> = {
  quantity: '🎯',
  style: '🎨',
  country: '🌍',
  special: '✨',
};
