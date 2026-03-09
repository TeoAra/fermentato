import { db } from "../server/db";
import { sql } from "drizzle-orm";
import { createReadStream } from "fs";
import { createInterface } from "readline";

// ISO3 → full country name mapping
const ISO3_TO_COUNTRY: Record<string, string> = {
  USA: 'United States', DEU: 'Germany', GBR: 'England', GER: 'Germany',
  BEL: 'Belgium', FRA: 'France', ESP: 'Spain', SWE: 'Sweden',
  DNK: 'Denmark', NLD: 'Netherlands', IRL: 'Ireland', IRE: 'Ireland',
  CAN: 'Canada', NOR: 'Norway', POL: 'Poland', AUT: 'Austria',
  RUS: 'Russia', CZE: 'Czech Republic', BRA: 'Brazil', EST: 'Estonia',
  POR: 'Portugal', FIN: 'Finland', AUS: 'Australia', SVN: 'Slovenia',
  SRB: 'Serbia', ROU: 'Romania', HUN: 'Hungary', HRV: 'Croatia',
  GRC: 'Greece', SLV: 'El Salvador', JPN: 'Japan', MEX: 'Mexico',
  ARG: 'Argentina', CHI: 'Chile', ZAF: 'South Africa', ISR: 'Israel',
  NZL: 'New Zealand', KOR: 'South Korea', CHN: 'China',
};

// Parse CSV line accounting for quoted fields
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let inQuotes = false;
  let current = '';
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQuotes = !inQuotes; }
    else if (c === ',' && !inQuotes) { result.push(current); current = ''; }
    else { current += c; }
  }
  result.push(current);
  return result;
}

async function main() {
  const CSV_PATH = './attached_assets/breweries_1753136998070.csv';
  const rl = createInterface({ input: createReadStream(CSV_PATH), crlfDelay: Infinity });
  
  const foreignBreweries: Array<{name: string, country: string}> = [];
  let firstLine = true;
  
  for await (const line of rl) {
    if (firstLine) { firstLine = false; continue; } // skip header
    const parts = parseCsvLine(line);
    if (parts.length < 3) continue;
    
    const name = parts[1].trim();
    const address = parts[2].trim();
    
    // Extract 3-letter country code from parentheses at end: "(DEU)", "(USA)" etc.
    const match = address.match(/\(([A-Z]{3})\)\s*$/);
    if (!match) continue;
    
    const iso3 = match[1];
    const country = ISO3_TO_COUNTRY[iso3];
    if (!country) { console.log(`Unknown ISO3: ${iso3} for "${name}"`); continue; }
    
    foreignBreweries.push({ name, country });
  }
  
  console.log(`Found ${foreignBreweries.length} foreign breweries in CSV`);
  
  let updated = 0;
  let notFound = 0;
  
  for (const { name, country } of foreignBreweries) {
    // Try exact name match first
    const { rows } = await db.execute(sql`
      SELECT id, name, country FROM breweries 
      WHERE LOWER(TRIM(name)) = LOWER(TRIM(${name}))
      LIMIT 5
    `) as any;
    
    if (rows.length > 0) {
      for (const row of rows) {
        if (row.country === 'Italia' || row.country === 'Italy') {
          await db.execute(sql`
            UPDATE breweries SET country = ${country}, region = '' WHERE id = ${row.id}
          `);
          console.log(`✓ [${row.id}] "${row.name}" → ${country}`);
          updated++;
        }
      }
    } else {
      // Try fuzzy match with GIN index (threshold 0.85)
      const { rows: fuzzy } = await db.execute(sql`
        SELECT id, name, country, similarity(LOWER(name), LOWER(${name})) as sim
        FROM breweries
        WHERE LOWER(name) % LOWER(${name})
          AND (country = 'Italia' OR country = 'Italy')
        ORDER BY sim DESC
        LIMIT 1
      `) as any;
      
      if (fuzzy.length > 0 && fuzzy[0].sim >= 0.85) {
        await db.execute(sql`
          UPDATE breweries SET country = ${country}, region = '' WHERE id = ${fuzzy[0].id}
        `);
        console.log(`≈ [${fuzzy[0].id}] "${fuzzy[0].name}" ≈ "${name}" → ${country} (${Math.round(fuzzy[0].sim*100)}%)`);
        updated++;
      } else {
        notFound++;
        if (notFound <= 20) console.log(`✗ Not found: "${name}" (${country})`);
      }
    }
  }
  
  console.log(`\n✅ Updated: ${updated}, Not found: ${notFound}`);
  
  // Final stats
  const { rows: stats } = await db.execute(sql`
    SELECT 
      CASE WHEN country IN ('Italia','Italy') THEN 'Italiani' ELSE 'Esteri' END as tipo,
      COUNT(*) as totale
    FROM breweries GROUP BY 1
  `) as any;
  console.log('\nFinal stats:');
  stats.forEach((r: any) => console.log(`  ${r.tipo}: ${r.totale}`));
}

main().catch(console.error);
