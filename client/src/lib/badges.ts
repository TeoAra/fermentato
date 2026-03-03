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
