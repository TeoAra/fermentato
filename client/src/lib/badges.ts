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
    bgFrom: "from-emerald-600",
    bgTo: "to-green-800",
    textColor: "text-emerald-700 dark:text-emerald-300",
    borderColor: "border-emerald-300 dark:border-emerald-700",
    minReviews: 0,
    description: "Hai appena iniziato il viaggio nel mondo della birra artigianale!",
  },
  {
    level: 1,
    name: "Curioso",
    emoji: "🍺",
    color: "teal",
    bgFrom: "from-teal-600",
    bgTo: "to-emerald-700",
    textColor: "text-teal-700 dark:text-teal-300",
    borderColor: "border-teal-300 dark:border-teal-700",
    minReviews: 5,
    description: "Stai cominciando ad esplorare con curiosità.",
  },
  {
    level: 2,
    name: "Assaggiatore",
    emoji: "🍻",
    color: "yellow",
    bgFrom: "from-amber-500",
    bgTo: "to-yellow-700",
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
    bgFrom: "from-amber-600",
    bgTo: "to-orange-700",
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
    bgFrom: "from-orange-600",
    bgTo: "to-red-700",
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
    bgFrom: "from-red-600",
    bgTo: "to-rose-800",
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
    bgFrom: "from-purple-600",
    bgTo: "to-violet-800",
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
    bgFrom: "from-yellow-500",
    bgTo: "to-amber-600",
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
  color: string;
  check: (data: AchievementData) => boolean;
}

export interface AchievementData {
  reviewCount: number;
  tastingCount: number;
  styleCounts: Record<string, number>;
  countryCounts: Record<string, number>;
  countryCount: number;
  styleCount: number;
}

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
  { id: 'three_tastings', name: 'Primo Weekend', emoji: '🍻', category: 'quantity', color: 'green', description: '3 birre assaggiate', check: d => d.tastingCount >= 3 },
  { id: 'five_reviews', name: 'Cinque di Fila', emoji: '5️⃣', category: 'quantity', color: 'cyan', description: '5 recensioni completate', check: d => d.reviewCount >= 5 },
  { id: 'ten_reviews', name: 'Doppia Cifra', emoji: '🔟', category: 'quantity', color: 'blue', description: '10 recensioni completate', check: d => d.reviewCount >= 10 },
  { id: 'fifteen_reviews', name: 'Quindici Birre', emoji: '🎯', category: 'quantity', color: 'indigo', description: '15 recensioni completate', check: d => d.reviewCount >= 15 },
  { id: 'twenty_five_reviews', name: 'Venticinque', emoji: '🌠', category: 'quantity', color: 'violet', description: '25 recensioni completate', check: d => d.reviewCount >= 25 },
  { id: 'thirty_reviews', name: 'Trenta e Lode', emoji: '🎓', category: 'quantity', color: 'purple', description: '30 recensioni — il giusto mezzo', check: d => d.reviewCount >= 30 },
  { id: 'fifty_reviews', name: 'Cinquantone', emoji: '5️⃣0️⃣', category: 'quantity', color: 'amber', description: '50 recensioni completate', check: d => d.reviewCount >= 50 },
  { id: 'seventy_five_reviews', name: 'Tre Quarti di Cento', emoji: '🎖️', category: 'quantity', color: 'orange', description: '75 recensioni — quasi centurione!', check: d => d.reviewCount >= 75 },
  { id: 'century', name: 'Centurione', emoji: '💯', category: 'quantity', color: 'orange', description: '100 recensioni — sei un veterano', check: d => d.reviewCount >= 100 },
  { id: 'one_fifty', name: 'Instancabile', emoji: '⚡', category: 'quantity', color: 'amber', description: '150 recensioni — non ti fermi mai', check: d => d.reviewCount >= 150 },
  { id: 'two_hundred', name: 'Duecento', emoji: '🔥', category: 'quantity', color: 'red', description: '200 recensioni — livello leggendario', check: d => d.reviewCount >= 200 },
  { id: 'three_hundred', name: 'Trecento', emoji: '💥', category: 'quantity', color: 'rose', description: '300 recensioni — fenomeno!', check: d => d.reviewCount >= 300 },
  { id: 'style_first', name: 'Primo Stile', emoji: '🎨', category: 'quantity', color: 'pink', description: 'Assaggiato birre di 3 stili diversi', check: d => d.styleCount >= 3 },
  { id: 'style_five', name: 'Cinque Stili', emoji: '🖌️', category: 'quantity', color: 'fuchsia', description: 'Assaggiato birre di 5 stili diversi', check: d => d.styleCount >= 5 },
  { id: 'explorer_styles', name: 'Stile Libero', emoji: '🎭', category: 'quantity', color: 'violet', description: 'Assaggiato birre di 10 stili diversi', check: d => d.styleCount >= 10 },
  { id: 'style_master', name: 'Maestro degli Stili', emoji: '🎓', category: 'quantity', color: 'purple', description: 'Assaggiato birre di 20 stili diversi', check: d => d.styleCount >= 20 },
  { id: 'style_legend', name: 'Enciclopedia Birraria', emoji: '📚', category: 'quantity', color: 'indigo', description: '30+ stili diversi — sei un\'enciclopedia vivente', check: d => d.styleCount >= 30 },
  { id: 'country_first', name: 'Primo Confine', emoji: '🗺️', category: 'quantity', color: 'emerald', description: 'Birre da 3 paesi diversi', check: d => d.countryCount >= 3 },
  { id: 'world_traveler', name: 'Giramondo', emoji: '🌍', category: 'quantity', color: 'teal', description: 'Birre da 5 paesi diversi', check: d => d.countryCount >= 5 },
  { id: 'globe_trotter', name: 'Globe Trotter', emoji: '✈️', category: 'quantity', color: 'sky', description: 'Birre da 10 paesi diversi', check: d => d.countryCount >= 10 },
  { id: 'globe_master', name: 'Ambasciatore', emoji: '🌐', category: 'quantity', color: 'blue', description: 'Birre da 15 paesi diversi', check: d => d.countryCount >= 15 },
  { id: 'globe_champion', name: 'Cittadino del Mondo', emoji: '🏳️', category: 'quantity', color: 'cyan', description: 'Birre da 20+ paesi — sei cosmopolita', check: d => d.countryCount >= 20 },

  // ── IPA / HOPS ────────────────────────────────────────
  { id: 'ipa_starter', name: 'Luppolaro', emoji: '🌿', category: 'style', color: 'green', description: '3+ IPA assaggiate', check: d => styleMin(d, ['ipa', 'india pale'], 3) },
  { id: 'ipa_fan', name: 'IPA Monk', emoji: '🍃', category: 'style', color: 'lime', description: '10+ IPA assaggiate', check: d => styleMin(d, ['ipa', 'india pale'], 10) },
  { id: 'ipa_devotee', name: 'IPA Devotee', emoji: '🫙', category: 'style', color: 'emerald', description: '20+ IPA — è una filosofia di vita', check: d => styleMin(d, ['ipa', 'india pale'], 20) },
  { id: 'ipa_master', name: 'Hop Head', emoji: '🌾', category: 'style', color: 'emerald', description: '30+ IPA — il luppolo scorre nelle vene', check: d => styleMin(d, ['ipa', 'india pale'], 30) },
  { id: 'hazy_lover', name: 'Hazy Lover', emoji: '☁️', category: 'style', color: 'yellow', description: '5+ New England / Hazy IPA', check: d => styleMin(d, ['hazy', 'new england', 'neipa', 'juicy'], 5) },
  { id: 'double_trouble', name: 'Double Trouble', emoji: '💥', category: 'style', color: 'red', description: '5+ Double / Imperial IPA', check: d => styleMin(d, ['double ipa', 'dipa', 'imperial ipa', 'triple ipa'], 5) },
  { id: 'session_hero', name: 'Session Hero', emoji: '🏃', category: 'style', color: 'blue', description: '5+ Session IPA o Session Ale', check: d => styleMin(d, ['session ipa', 'session ale'], 5) },
  { id: 'west_coast_rider', name: 'West Coast Rider', emoji: '🏄', category: 'style', color: 'sky', description: '5+ West Coast IPA', check: d => styleMin(d, ['west coast ipa', 'west coast'], 5) },

  // ── DARK BEERS ────────────────────────────────────────
  { id: 'dark_curiosity', name: 'Curiosità Oscura', emoji: '🌒', category: 'style', color: 'slate', description: 'Prima Stout o Porter assaggiata', check: d => styleMin(d, ['stout', 'porter'], 1) },
  { id: 'dark_side', name: 'Lato Oscuro', emoji: '🌑', category: 'style', color: 'gray', description: '3+ Stout o Porter assaggiate', check: d => styleMin(d, ['stout', 'porter'], 3) },
  { id: 'stout_hunter', name: 'Stout Hunter', emoji: '🖤', category: 'style', color: 'slate', description: '10+ Stout o Porter', check: d => styleMin(d, ['stout', 'porter'], 10) },
  { id: 'imperial_master', name: 'Imperial Overlord', emoji: '👑', category: 'style', color: 'indigo', description: '5+ Imperial Stout', check: d => styleMin(d, ['imperial stout', 'russian imperial'], 5) },
  { id: 'milk_stout', name: 'Dolce Oscurità', emoji: '🍫', category: 'style', color: 'brown', description: '3+ Milk Stout o Sweet Stout', check: d => styleMin(d, ['milk stout', 'sweet stout', 'oatmeal stout'], 3) },
  { id: 'coffee_stout', name: 'Barista Birrario', emoji: '☕', category: 'style', color: 'amber', description: '3+ Coffee Stout o Pastry Stout', check: d => styleMin(d, ['coffee stout', 'pastry stout', 'coffee porter'], 3) },

  // ── WHEAT / FRUITY ───────────────────────────────────
  { id: 'weizen_fan', name: 'Weizen Fan', emoji: '🌾', category: 'style', color: 'amber', description: '3+ Wheat Beer o Weizen', check: d => styleMin(d, ['weizen', 'wheat', 'weiss', 'witbier', 'wit '], 3) },
  { id: 'hefeweizen_hero', name: 'Hefeweizen Hero', emoji: '🏺', category: 'style', color: 'yellow', description: '10+ Hefeweizen o Wheat', check: d => styleMin(d, ['weizen', 'wheat', 'hefeweizen'], 10) },
  { id: 'wit_fan', name: 'Bicchiere Bianco', emoji: '🥛', category: 'style', color: 'gray', description: '3+ Witbier o Belgian White', check: d => styleMin(d, ['witbier', 'wit beer', 'white ale', 'belgian white'], 3) },
  { id: 'fruity_explorer', name: 'Fruttoso', emoji: '🍓', category: 'style', color: 'pink', description: '5+ Fruited Ale o Sour con frutta', check: d => styleMin(d, ['fruited', 'fruit beer', 'fruit ale', 'raspberry', 'cherry', 'mango'], 5) },
  { id: 'sour_first', name: 'Prima Acidità', emoji: '😮', category: 'style', color: 'lime', description: 'Prima Sour Ale assaggiata', check: d => styleMin(d, ['sour', 'lambic', 'gose', 'berliner', 'gueuze', 'kriek'], 1) },
  { id: 'sour_lover', name: 'Amante dell\'Acido', emoji: '😬', category: 'style', color: 'lime', description: '5+ Sour Ale', check: d => styleMin(d, ['sour', 'lambic', 'gose', 'berliner', 'gueuze', 'kriek'], 5) },
  { id: 'sour_master', name: 'Palato Acido', emoji: '🍋', category: 'style', color: 'yellow', description: '15+ Sour — le tue papille chiedono acido', check: d => styleMin(d, ['sour', 'lambic', 'gose', 'berliner', 'gueuze', 'kriek'], 15) },
  { id: 'lambic_pilgrim', name: 'Pellegrino Lambic', emoji: '🍷', category: 'style', color: 'red', description: '3+ Lambic, Gueuze o Kriek', check: d => styleMin(d, ['lambic', 'gueuze', 'kriek'], 3) },
  { id: 'gose_fan', name: 'Salato è Bello', emoji: '🧂', category: 'style', color: 'cyan', description: '3+ Gose o Berliner Weisse', check: d => styleMin(d, ['gose', 'berliner weisse', 'berliner'], 3) },

  // ── LAGER / PILSNER ──────────────────────────────────
  { id: 'lager_lover', name: 'Lager Lover', emoji: '🍶', category: 'style', color: 'blue', description: '5+ Lager o Pilsner', check: d => styleMin(d, ['lager', 'pilsner', 'pilsener', 'pils'], 5) },
  { id: 'pilsner_purist', name: 'Purista Boemo', emoji: '🏰', category: 'style', color: 'sky', description: '10+ Pilsner', check: d => styleMin(d, ['pilsner', 'pilsener', 'pils'], 10) },
  { id: 'helles_hero', name: 'Helles Hero', emoji: '☀️', category: 'style', color: 'yellow', description: '5+ Helles o Munich Lager', check: d => styleMin(d, ['helles', 'munich lager', 'märzen', 'marzen', 'munich'], 5) },
  { id: 'kolsch_fan', name: 'Colonia Forever', emoji: '🗼', category: 'style', color: 'blue', description: '3+ Kölsch', check: d => styleMin(d, ['kölsch', 'kolsch', 'koelsch'], 3) },

  // ── BELGIAN / ABBEY ──────────────────────────────────
  { id: 'belgian_first', name: 'Fiammingo', emoji: '🧇', category: 'style', color: 'gold', description: 'Prima Belgian Ale assaggiata', check: d => styleMin(d, ['belgian', 'saison', 'dubbel', 'tripel', 'quad', 'abbey'], 1) },
  { id: 'belgian_fan', name: 'Belga di Cuore', emoji: '🍺', category: 'style', color: 'gold', description: '5+ Belgian Ale', check: d => styleMin(d, ['belgian', 'saison', 'dubbel', 'tripel', 'quad', 'abbey'], 5) },
  { id: 'trappist_monk', name: 'Monaco Trappista', emoji: '⛪', category: 'style', color: 'amber', description: '5+ Trappist o Abbey', check: d => styleMin(d, ['trappist', 'abbey', 'dubbel', 'tripel', 'quadrupel'], 5) },
  { id: 'saison_master', name: 'Contadino Belga', emoji: '🌻', category: 'style', color: 'orange', description: '5+ Saison o Farmhouse Ale', check: d => styleMin(d, ['saison', 'farmhouse', 'bière de garde'], 5) },
  { id: 'quad_master', name: 'Quadrupel Quest', emoji: '🙏', category: 'style', color: 'purple', description: '3+ Quadrupel o Belgian Dark Strong', check: d => styleMin(d, ['quadrupel', 'quad', 'belgian dark strong'], 3) },

  // ── STRONG / BARLEYWINE ──────────────────────────────
  { id: 'strong_ale', name: 'Testa Dura', emoji: '💪', category: 'style', color: 'orange', description: '3+ Strong Ale o Barleywine', check: d => styleMin(d, ['barleywine', 'strong ale', 'wee heavy', 'scotch ale'], 3) },
  { id: 'bock_fan', name: 'Bock Fan', emoji: '🐐', category: 'style', color: 'brown', description: '3+ Bock o Doppelbock', check: d => styleMin(d, ['bock', 'doppelbock', 'eisbock', 'maibock'], 3) },
  { id: 'smoked_lover', name: 'Sapore di Fumo', emoji: '🔥', category: 'style', color: 'gray', description: '3+ Rauchbier o Smoked Beer', check: d => styleMin(d, ['rauchbier', 'smoked', 'smoke', 'affumicata'], 3) },

  // ── SPECIALTY ─────────────────────────────────────────
  { id: 'craft_lover', name: 'Craft Addict', emoji: '🔨', category: 'style', color: 'teal', description: '5+ Pale Ale artigianali', check: d => styleMin(d, ['pale ale', 'american pale', 'apa'], 5) },
  { id: 'amber_lover', name: 'Ambra Pura', emoji: '🍯', category: 'style', color: 'amber', description: '5+ Amber Ale o Red Ale', check: d => styleMin(d, ['amber ale', 'red ale', 'irish red', 'amber ipa'], 5) },
  { id: 'porter_power', name: 'Porter Power', emoji: '⚓', category: 'style', color: 'slate', description: '5+ Porter', check: d => styleMin(d, ['porter'], 5) },
  { id: 'golden_ale', name: 'Oro Puro', emoji: '✨', category: 'style', color: 'yellow', description: '5+ Golden Ale o Blonde Ale', check: d => styleMin(d, ['golden ale', 'blonde ale', 'golden strong', 'blond'], 5) },
  { id: 'cider_explorer', name: 'Sidro Curioso', emoji: '🍎', category: 'style', color: 'green', description: '3+ Sidro o Apple Cider', check: d => styleMin(d, ['cider', 'sidro', 'apple wine'], 3) },
  { id: 'gluten_free', name: 'Libero dal Glutine', emoji: '🌿', category: 'style', color: 'green', description: '3+ Gluten Free Beer', check: d => styleMin(d, ['gluten free', 'gluten-free', 'sans gluten'], 3) },
  { id: 'alcohol_free', name: 'Astemia Virtuosa', emoji: '💧', category: 'style', color: 'cyan', description: '3+ Analcolica o Low-Alcohol', check: d => styleMin(d, ['alcohol free', 'non-alcoholic', 'low alcohol', '0.0', 'dealcoolata'], 3) },
  { id: 'mixed_ferm', name: 'Fermentazione Selvaggia', emoji: '🦠', category: 'style', color: 'orange', description: '3+ Wild Ale o Mixed Fermentation', check: d => styleMin(d, ['wild ale', 'mixed ferm', 'brett', 'brettanomyces', 'spontaneous'], 3) },

  // ── COUNTRIES ─────────────────────────────────────────
  { id: 'italian_first', name: 'Orgoglio Italiano', emoji: '🍕', category: 'country', color: 'green', description: 'Prima birra italiana assaggiata', check: d => countryMin(d, ['italy', 'italia', 'it'], 1) },
  { id: 'italian_pride', name: 'Patriota', emoji: '🇮🇹', category: 'country', color: 'green', description: '5+ birre italiane', check: d => countryMin(d, ['italy', 'italia', 'it'], 5) },
  { id: 'italian_veteran', name: 'Veterano del Tricolore', emoji: '🏛️', category: 'country', color: 'red', description: '15+ birre italiane', check: d => countryMin(d, ['italy', 'italia', 'it'], 15) },
  { id: 'italian_master', name: 'Maestro Italiano', emoji: '👨‍🍳', category: 'country', color: 'red', description: '30+ birre italiane — vera passione', check: d => countryMin(d, ['italy', 'italia', 'it'], 30) },
  { id: 'german_fan', name: 'Amico Tedesco', emoji: '🇩🇪', category: 'country', color: 'yellow', description: '5+ birre tedesche', check: d => countryMin(d, ['germany', 'deutschland', 'de'], 5) },
  { id: 'german_meister', name: 'Reinheitsgebot', emoji: '🥨', category: 'country', color: 'amber', description: '15+ birre tedesche', check: d => countryMin(d, ['germany', 'deutschland', 'de'], 15) },
  { id: 'belgian_pilgrim', name: 'Pellegrino Belga', emoji: '🇧🇪', category: 'country', color: 'red', description: '5+ birre belghe', check: d => countryMin(d, ['belgium', 'belgique', 'belgie', 'be'], 5) },
  { id: 'belgian_connoisseur', name: 'Conoscitore Belga', emoji: '🍺', category: 'country', color: 'yellow', description: '15+ birre belghe — respect!', check: d => countryMin(d, ['belgium', 'belgique', 'belgie', 'be'], 15) },
  { id: 'american_dream', name: 'American Dream', emoji: '🇺🇸', category: 'country', color: 'blue', description: '5+ birre americane', check: d => countryMin(d, ['united states', 'usa', 'us', 'america'], 5) },
  { id: 'american_craft', name: 'Craft American', emoji: '🗽', category: 'country', color: 'red', description: '15+ birre americane', check: d => countryMin(d, ['united states', 'usa', 'us', 'america'], 15) },
  { id: 'real_ale_fan', name: 'Real Ale Fan', emoji: '🇬🇧', category: 'country', color: 'red', description: '5+ birre britanniche', check: d => countryMin(d, ['united kingdom', 'england', 'scotland', 'wales', 'gb', 'uk'], 5) },
  { id: 'czech_pilgrim', name: 'Pellegrino Ceco', emoji: '🇨🇿', category: 'country', color: 'red', description: '5+ birre ceche', check: d => countryMin(d, ['czech', 'czechia', 'bohemia', 'cz'], 5) },
  { id: 'nordic_explorer', name: 'Esploratore Nordico', emoji: '🇸🇪', category: 'country', color: 'blue', description: '5+ birre scandinave', check: d => countryMin(d, ['sweden', 'norway', 'denmark', 'finland', 'iceland'], 5) },
  { id: 'dutch_master', name: 'Olandese Volante', emoji: '🇳🇱', category: 'country', color: 'orange', description: '5+ birre olandesi', check: d => countryMin(d, ['netherlands', 'holland', 'nl'], 5) },
  { id: 'japanese_zen', name: 'Zen Giapponese', emoji: '🇯🇵', category: 'country', color: 'red', description: '3+ birre giapponesi', check: d => countryMin(d, ['japan', 'giappone', 'jp'], 3) },
  { id: 'japanese_devotee', name: 'Samurai Birrario', emoji: '⚔️', category: 'country', color: 'red', description: '10+ birre giapponesi', check: d => countryMin(d, ['japan', 'giappone', 'jp'], 10) },
  { id: 'aussie_mate', name: 'Mate Australiano', emoji: '🇦🇺', category: 'country', color: 'amber', description: '3+ birre australiane', check: d => countryMin(d, ['australia', 'au'], 3) },
  { id: 'french_touch', name: 'French Touch', emoji: '🇫🇷', category: 'country', color: 'blue', description: '5+ birre francesi', check: d => countryMin(d, ['france', 'fr', 'francia'], 5) },
  { id: 'spanish_vibes', name: 'Fiesta Cervecera', emoji: '🇪🇸', category: 'country', color: 'red', description: '3+ birre spagnole', check: d => countryMin(d, ['spain', 'españa', 'es', 'spagna'], 3) },
  { id: 'canadian_moose', name: 'Canadian Moose', emoji: '🇨🇦', category: 'country', color: 'red', description: '3+ birre canadesi', check: d => countryMin(d, ['canada', 'ca'], 3) },
  { id: 'irish_spirit', name: 'Spirito Irlandese', emoji: '🇮🇪', category: 'country', color: 'green', description: '3+ birre irlandesi', check: d => countryMin(d, ['ireland', 'irish', 'ie'], 3) },
  { id: 'polish_power', name: 'Polish Power', emoji: '🇵🇱', category: 'country', color: 'red', description: '3+ birre polacche', check: d => countryMin(d, ['poland', 'polska', 'pl'], 3) },
  { id: 'austrian_alps', name: 'Alpi Austriache', emoji: '🇦🇹', category: 'country', color: 'red', description: '3+ birre austriache', check: d => countryMin(d, ['austria', 'at', 'österreich'], 3) },
  { id: 'swiss_precision', name: 'Precisione Svizzera', emoji: '🇨🇭', category: 'country', color: 'red', description: '3+ birre svizzere', check: d => countryMin(d, ['switzerland', 'swiss', 'schweiz', 'ch'], 3) },
  { id: 'new_world', name: 'Nuovo Mondo', emoji: '🌎', category: 'country', color: 'teal', description: '3+ birre da Nuova Zelanda o Sudamerica', check: d => countryMin(d, ['new zealand', 'nz', 'brazil', 'argentina', 'chile'], 3) },
  { id: 'portuguese_soul', name: 'Anima Lusitana', emoji: '🇵🇹', category: 'country', color: 'green', description: '3+ birre portoghesi', check: d => countryMin(d, ['portugal', 'portogallo', 'pt'], 3) },
  { id: 'greek_odyssey', name: 'Odissea Greca', emoji: '🏛️', category: 'country', color: 'blue', description: '3+ birre greche', check: d => countryMin(d, ['greece', 'grecia', 'gr', 'hellas'], 3) },
  { id: 'mexican_fiesta', name: 'Viva la Cerveza', emoji: '🇲🇽', category: 'country', color: 'green', description: '3+ birre messicane', check: d => countryMin(d, ['mexico', 'messico', 'mx'], 3) },
  { id: 'chinese_dragon', name: 'Drago di Birra', emoji: '🐉', category: 'country', color: 'red', description: '3+ birre cinesi', check: d => countryMin(d, ['china', 'cina', 'cn'], 3) },
  { id: 'african_safari', name: 'Safari Birrario', emoji: '🦁', category: 'country', color: 'amber', description: '3+ birre africane', check: d => countryMin(d, ['south africa', 'kenya', 'ethiopia', 'nigeria', 'ghana'], 3) },

  // ── SPECIAL ───────────────────────────────────────────
  { id: 'collector', name: 'Collezionista', emoji: '🏅', category: 'special', color: 'amber', description: '10+ achievement sbloccati', check: d => {
    const earned = ALL_ACHIEVEMENTS.filter(a => a.id !== 'collector' && a.check(d)).length;
    return earned >= 10;
  }},
  { id: 'hoarder', name: 'Accumulatore Seriale', emoji: '🗄️', category: 'special', color: 'purple', description: '20+ achievement sbloccati', check: d => {
    const earned = ALL_ACHIEVEMENTS.filter(a => a.id !== 'hoarder' && a.id !== 'collector' && a.check(d)).length;
    return earned >= 20;
  }},
  { id: 'taster_vs_reviewer', name: 'Bevitore Silenzioso', emoji: '🤫', category: 'special', color: 'slate', description: '10+ birre assaggiate senza recensione', check: d => d.tastingCount >= 10 && (d.tastingCount - d.reviewCount) >= 5 },
  { id: 'diligent_reviewer', name: 'Recensore Diligente', emoji: '📝', category: 'special', color: 'blue', description: '10+ birre con recensione testuale', check: d => d.reviewCount >= 10 },
  { id: 'polyglot_palate', name: 'Palato Poliglotta', emoji: '🗣️', category: 'special', color: 'violet', description: 'Birre da 3 continenti diversi', check: d => {
    const europe = ['italy', 'germany', 'belgium', 'france', 'uk', 'england', 'spain', 'portugal', 'netherlands', 'czech', 'austria', 'switzerland', 'ireland', 'poland', 'sweden', 'norway', 'denmark', 'finland', 'greece'];
    const americas = ['united states', 'usa', 'canada', 'mexico', 'brazil', 'argentina', 'chile'];
    const asia = ['japan', 'china', 'korea', 'india'];
    const hasEurope = Object.keys(d.countryCounts).some(c => europe.some(e => c.toLowerCase().includes(e)));
    const hasAmericas = Object.keys(d.countryCounts).some(c => americas.some(e => c.toLowerCase().includes(e)));
    const hasAsia = Object.keys(d.countryCounts).some(c => asia.some(e => c.toLowerCase().includes(e)));
    return [hasEurope, hasAmericas, hasAsia].filter(Boolean).length >= 3;
  }},
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
