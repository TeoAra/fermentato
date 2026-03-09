import { db } from "../server/db";
import { sql } from "drizzle-orm";

const rules: Array<{ pattern: RegExp | ((n: string) => boolean); country: string }> = [
  // German
  { pattern: /^brauerei\b/i, country: 'Germany' },
  { pattern: /^brauhaus\b/i, country: 'Germany' },
  { pattern: (n) => /malzmühle|will br[äa]u|franken stoff|biermanufaktur|drossenfelder|bayer brau|brauwerk/i.test(n), country: 'Germany' },
  { pattern: (n) => ['craftwerk brewing', 'fuerst wiacek', 'stone brewing berlin', 'allgauer'].some(b => n.includes(b)), country: 'Germany' },
  // Austrian
  { pattern: (n) => ['ottakringer', 'stift engelszell', 'brauerei scharpf'].some(b => n.includes(b)), country: 'Austria' },
  // Belgian (Brouwerij)
  { pattern: /^brouwerij\b/i, country: 'Belgium' },
  // Belgian specific names
  { pattern: (n) => ['cantillon', "d'orval", 'de dochter', 'de dolle', 'de cam', 'de halve maan', 'de glazen toren',
      'de ranke', 'de brabandere', 'caulier', 'dilewyns', 'verhaeghe', 'het nest', 'boon', 'de la senne',
      'girardin', 'oud beersel', 'van steenberge', 'kerkom', 'alvinne', 'hof ten dormaal', 'corsendonk',
      "d'achouffe", 'rodenbach', 'de silly', 'du bocq', 'fantôme', 'de blaugies', "t verzet",
      'omer vander ghinste', 'à vapeur', 'bosteels', 'bombrouwerij', 'alken-maes'].some(b => n.includes(b)), country: 'Belgium' },
  // French Brasseries (check Belgian first above)
  { pattern: (n) => n.startsWith('brasserie') && ['dieu du ciel', 'trois mousquetaires', 'ca brasse'].some(b => n.includes(b)), country: 'Canada' },
  { pattern: (n) => n.startsWith('brasserie') && !['cantillon', "d'orval", 'de la senne', 'girardin', 'oud beersel',
      "d'achouffe", 'rodenbach', 'du bocq', 'fantôme', 'de blaugies', 'à vapeur', 'rulles',
      'omer vander', 'hof ten dormaal', 'corsendonk', 'de ranke', 'rodenbach'].some(b => n.includes(b)), country: 'France' },
  { pattern: (n) => ["goutte d'or", 'deck & donohue', 'les brasseurs du grand paris', 'corrézienne', 'des garrigues'].some(b => n.includes(b)), country: 'France' },
  // Polish
  { pattern: /^browar\b/i, country: 'Poland' },
  { pattern: (n) => ['trzech kumpli', 'alebrowar', 'pinta'].some(b => n.includes(b)), country: 'Poland' },
  // Spanish
  { pattern: /^cerves[ae]s?\b|^cerveza\b/i, country: 'Spain' },
  { pattern: (n) => ['guineu', 'la pirata', 'cierzo', "dougall's", 'garage beer co', 'azimut brasserie'].some(b => n.includes(b)), country: 'Spain' },
  // Brazilian
  { pattern: (n) => n.startsWith('cervejaria') && ['lohn', 'maniba'].some(b => n.includes(b)), country: 'Brazil' },
  { pattern: (n) => ['daoravida'].some(b => n.includes(b)), country: 'Brazil' },
  // Portuguese
  { pattern: (n) => n.startsWith('cervejaria') && !['lohn', 'maniba'].some(b => n.includes(b)), country: 'Portugal' },
  { pattern: (n) => ['cervisiam'].some(b => n.includes(b)), country: 'Portugal' },
  // Norwegian
  { pattern: (n) => ['7 fjell', 'ægir', 'nøgne'].some(b => n.includes(b)), country: 'Norway' },
  // Swedish  
  { pattern: (n) => ['stigbergets', 'beerbliotek', 'brekeriet', 'brewski', 'oppigards'].some(b => n.includes(b)), country: 'Sweden' },
  { pattern: (n) => /bryggeri$/i.test(n) && !['7 fjell', 'ægir'].some(b => n.includes(b)), country: 'Sweden' },
  // UK (English)
  { pattern: (n) => ['brewdog', 'cloudwater', 'five points brewing', 'thornbridge', 'weird beard',
      'siren craft', 'verdant brewing', 'deya brewing', 'lost and grounded', 'brew by numbers',
      'northern monk', 'gipsy hill', 'brew york', 'staggeringly good', 'fourpure', 'arbor',
      'wild beer', 'brighton bier', 'st austell', 'unbarred', 'anarchy brew', 'black isle',
      'fallen', 'mondo brewing', 'cornish orchards', 'arundel', 'purity brewing', 'belhaven',
      'black iris', 'chorlton', 'shindigger', 'track brewing'].some(b => n.includes(b)), country: 'England' },
  // Scottish
  { pattern: (n) => ['harviestoun', 'six degrees north', 'tempest brew', 'thistly cross'].some(b => n.includes(b)), country: 'Scotland' },
  // Welsh
  { pattern: (n) => n.includes('tiny rebel'), country: 'Wales' },
  // US  
  { pattern: (n) => ['alesmith', 'stone brewing', 'sierra nevada', 'goose island', 'ballast point',
      'cigar city', 'trillium brewing', 'toppling goliath', 'three floyds', 'the alchemist',
      'the answer', 'the bruery', 'the rare barrel', 'victory brewing', 'weyerbacher', '4 hands',
      'anderson valley', 'anchorage brewing', 'angry chair', 'aviator brewing', 'bagby beer',
      'barrier brewing', 'bottle logic', 'boulevard brewing', 'cascade brewing', 'central waters',
      'cisco brewers', 'coppertail', 'coronado brewing', 'de garde', 'evil twin brewing',
      'great divide', 'lord hobo', 'leelanau', 'legitimate industries', 'american solera',
      'pipeworks', 'port brewing', 'side project', 'societe brewing', 'spiteful brewing',
      'stillwater', 'straight to ale', 'surly brewing', 'sweetwater', 'two brothers',
      'upland brewing', 'westbrook', 'wicked weed', 'pfr', 'funkwerks', 'monkish',
      'flying monkey brewing', 'other half brewing', 'all in brewing'].some(b => n.includes(b)), country: 'United States' },
  // Canadian
  { pattern: (n) => ['unibroue', 'les trois mousquetaires', 'flying monkeys', 'strange fellows',
      'dieu du ciel'].some(b => n.includes(b)), country: 'Canada' },
  // Collective Arts - Canadian
  { pattern: (n) => n.includes('collective arts'), country: 'Canada' },
];

function guessCountry(name: string): string | null {
  const n = name.toLowerCase();
  for (const rule of rules) {
    const match = typeof rule.pattern === 'function' ? rule.pattern(n) : rule.pattern.test(n);
    if (match) return rule.country;
  }
  return null;
}

async function main() {
  const { rows } = await db.execute(sql`
    SELECT id, name FROM breweries 
    WHERE region = 'Estero' AND location = 'Non specificato'
    ORDER BY name
  `) as any;

  console.log(`Found ${rows.length} breweries to fix`);

  let fixed = 0;
  const unresolved: string[] = [];

  for (const brewery of rows) {
    const country = guessCountry(brewery.name);
    if (country) {
      await db.execute(sql`UPDATE breweries SET country = ${country}, region = '' WHERE id = ${brewery.id}`);
      console.log(`✓ [${brewery.id}] ${brewery.name} → ${country}`);
      fixed++;
    } else {
      unresolved.push(`[${brewery.id}] ${brewery.name}`);
    }
  }

  console.log(`\n✅ Fixed: ${fixed} / ${rows.length}`);
  if (unresolved.length > 0) {
    console.log('\n❓ Unresolved:');
    unresolved.forEach(b => console.log('  ' + b));
  }
}

main().catch(console.error);
