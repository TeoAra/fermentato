import { db } from "../server/db";
import { sql } from "drizzle-orm";

// Known US address patterns
function detectFromLocation(location: string): string | null {
  const l = location.trim();
  if (!l || l === 'Non specificato') return null;
  
  // US street patterns: "123 Main St", "235 Grandville Ave SW", "725 4th St"
  if (/^\d+\s+\w.*\b(St|Ave|Blvd|Dr|Rd|Ct|Ln|Way|Pl|Pkwy|Hwy|Park|Center|Circle|Place|Square|Trail)\b/i.test(l)) {
    return 'United States';
  }
  // US format with state abbreviation at end: "Santa Rosa CA", "Portland OR"  
  if (/,\s*[A-Z]{2}\s*\d{5}/.test(l) || /\b[A-Z]{2}\s+\d{5}/.test(l)) return 'United States';
  // Canadian postal code
  if (/[A-Z]\d[A-Z]\s*\d[A-Z]\d/.test(l)) return 'Canada';
  // UK postcodes (e.g. "SE1 2HQ", "WD3 9XQ", "TR20 8XE")
  if (/\b[A-Z]{1,2}\d[A-Z0-9]?\s*\d[A-Z]{2}\b/.test(l) && !/[a-z]/.test(l.slice(0,3))) return 'England';
  // German: Straße/Strasse
  if (/stra[ß|ss]e/i.test(l) || /str\.\s*\d/i.test(l)) return 'Germany';
  // Dutch: straat, laan, weg, dijk
  if (/\b(straat|laan|dijk|steenweg)\b/i.test(l)) return 'Netherlands';
  // Danish/Norwegian: vej, gade, torvet
  if (/\b(vej|gade|torvet|gatan|veien)\b/i.test(l)) return 'Denmark';
  // Latvian: iela
  if (/\b(iela)\b/i.test(l)) return 'Latvia';
  // Czech: nám, ulice
  if (/\b(náměstí|nám\.|ulice)\b/i.test(l)) return 'Czech Republic';
  return null;
}

async function main() {
  // Get all original breweries still labeled Italia
  const { rows: originals } = await db.execute(sql`
    SELECT id, name, location FROM breweries 
    WHERE id < 5503 AND country = 'Italia'
    ORDER BY id
  `) as any;

  console.log(`Processing ${originals.length} breweries...`);
  
  const toUpdate: Array<{id: number, country: string, source: string}> = [];
  const uncertain: string[] = [];
  
  for (const b of originals) {
    // First: try location-based detection
    const fromLoc = detectFromLocation(b.location || '');
    if (fromLoc) {
      toUpdate.push({ id: b.id, country: fromLoc, source: 'location' });
      continue;
    }
    
    // Second: try name-based lookup in imported dataset using GIN index
    const cleanName = b.name.trim().toLowerCase();
    // Skip clearly Italian names
    if (/^(birrificio|birra|birreria|azienda|fattoria|podere|brasserie)\b/i.test(b.name) &&
        !/^brasserie\s*(cantillon|boon|senne|orval|achouffe|girardin|bocq|fantôme)/i.test(b.name)) {
      continue; // Likely Italian
    }
    
    try {
      const { rows: matches } = await db.execute(sql`
        SELECT country, name, similarity(LOWER(name), ${cleanName}) as sim
        FROM breweries
        WHERE id > 5502 
          AND country NOT IN ('Italia', 'Italy')
          AND LOWER(name) % ${cleanName}
        ORDER BY sim DESC
        LIMIT 1
      `) as any;
      
      if (matches.length > 0 && matches[0].sim >= 0.80) {
        toUpdate.push({ id: b.id, country: matches[0].country, source: `name:${matches[0].name}(${Math.round(matches[0].sim*100)}%)` });
      } else if (matches.length > 0 && matches[0].sim >= 0.70) {
        uncertain.push(`[${b.id}] "${b.name}" → ${matches[0].country} (${Math.round(matches[0].sim*100)}% vs "${matches[0].name}")`);
      }
    } catch (e) { /* skip on error */ }
  }
  
  console.log(`\nFound ${toUpdate.length} to update, ${uncertain.length} uncertain`);
  
  // Apply updates
  let updated = 0;
  for (const u of toUpdate) {
    await db.execute(sql`UPDATE breweries SET country = ${u.country}, region = '' WHERE id = ${u.id}`);
    console.log(`✓ [${u.id}] → ${u.country} (${u.source})`);
    updated++;
  }
  
  console.log(`\n✅ Updated: ${updated}`);
  if (uncertain.length > 0) {
    console.log('\n❓ Uncertain (need review):');
    uncertain.slice(0, 30).forEach(u => console.log('  ' + u));
  }
}

main().catch(console.error);
