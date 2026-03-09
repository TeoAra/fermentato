import { db } from "../server/db";
import { sql } from "drizzle-orm";

// Italian location signals → skip these (they're actually Italian)
function isItalianLocation(loc: string): boolean {
  if (!loc || loc.trim() === '' || loc === 'Non specificato') return false;
  return /\b(via|vicolo|viale|piazza|piazzale|corso|contrada|strada|circonvallazione|localit[aà]|frazione|regione|comune|prov\.|Padova|Milano|Roma|Torino|Bologna|Firenze|Venezia|Napoli|Palermo|Genova|Bari|Bergamo|Brescia|Verona|Catania|Messina|Trieste|Trento|Perugia|Ancona|Cagliari|Sassari|Siena|Udine|Lecce|Taranto|Reggio|Vicenza|Modena|Parma|Ferrara|Ravenna|Rimini|Pisa|Livorno|Arezzo|Pescara|L'Aquila|Potenza|Campobasso|Isernia|Viterbo|Frosinone|Latina|Caserta|Salerno|Avellino|Benevento|Foggia|Andria|Barletta|Brindisi|Lecce|Matera|Cosenza|Catanzaro|Reggio Calabria|Trapani|Agrigento|Enna|Caltanissetta|Ragusa|Siracusa)\b/i.test(loc);
}

// Normalize a brewery name for matching (remove common suffixes/prefixes)
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(brewing company|brewing co\.|brewing co|brewery|brasserie|brouwerij|brauerei|bräu|brew|birrificio|birra|birreria|microbrewery|microbirrificio|craft beer|cervejaria|cervecería|bierbrouwerij|bryggeriet|bryggeri|pivovar|pivovarna|пивоварня|пивзавод)\b/gi, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function main() {
  // 1) Load ALL original breweries still labeled Italia (not clearly Italian by location)
  const { rows: originals } = await db.execute(sql`
    SELECT id, name, location FROM breweries 
    WHERE id < 5503 AND country = 'Italia'
    ORDER BY id
  `) as any;

  console.log(`\n${originals.length} original breweries still labeled Italia`);

  // 2) Load ALL imported breweries with non-Italian countries (48K set)
  const { rows: imported } = await db.execute(sql`
    SELECT id, name, location, country FROM breweries 
    WHERE id > 5502 AND country NOT IN ('Italia', 'Italy')
    LIMIT 60000
  `) as any;
  
  console.log(`Loaded ${imported.length} imported breweries for matching\n`);

  // Build lookup map: normalized_name → {country, name}
  const importedMap = new Map<string, {country: string, name: string, id: number}[]>();
  for (const imp of imported) {
    const norm = normalizeName(imp.name);
    if (!norm || norm.length < 3) continue;
    if (!importedMap.has(norm)) importedMap.set(norm, []);
    importedMap.get(norm)!.push({ country: imp.country, name: imp.name, id: imp.id });
  }
  
  console.log(`Built lookup map with ${importedMap.size} normalized names`);

  const toUpdate: Array<{id: number, origName: string, matchName: string, country: string, confidence: string}> = [];
  const skippedItalian: number[] = [];

  for (const orig of originals) {
    // Skip if clearly Italian location
    if (isItalianLocation(orig.location || '')) {
      skippedItalian.push(orig.id);
      continue;
    }

    const origNorm = normalizeName(orig.name);
    if (!origNorm || origNorm.length < 3) continue;

    // Try exact normalized match
    if (importedMap.has(origNorm)) {
      const matches = importedMap.get(origNorm)!;
      const best = matches[0];
      toUpdate.push({ id: orig.id, origName: orig.name, matchName: best.name, country: best.country, confidence: 'EXACT' });
      continue;
    }

    // Try partial: check if any imported normalized name CONTAINS the original normalized name
    // (handles cases like "fat lizard" matching "fat lizard brewing co")
    const origWords = origNorm.split(' ').filter(w => w.length > 2);
    if (origWords.length < 2) continue;
    
    let bestMatch: {country: string, name: string, id: number} | null = null;
    let bestWordOverlap = 0;
    
    for (const [impNorm, impList] of importedMap) {
      const impWords = impNorm.split(' ').filter(w => w.length > 2);
      const overlap = origWords.filter(w => impWords.includes(w)).length;
      const ratio = overlap / Math.max(origWords.length, impWords.length);
      if (overlap >= 2 && ratio >= 0.75 && overlap > bestWordOverlap) {
        bestWordOverlap = overlap;
        bestMatch = impList[0];
      }
    }
    
    if (bestMatch) {
      const conf = bestWordOverlap >= 3 ? 'HIGH' : 'MEDIUM';
      toUpdate.push({ id: orig.id, origName: orig.name, matchName: bestMatch.name, country: bestMatch.country, confidence: conf });
    }
  }

  console.log(`\nResults:`);
  console.log(`  Skipped (Italian location): ${skippedItalian.length}`);
  console.log(`  To update: ${toUpdate.length}`);
  
  const exact = toUpdate.filter(u => u.confidence === 'EXACT');
  const high = toUpdate.filter(u => u.confidence === 'HIGH');
  const medium = toUpdate.filter(u => u.confidence === 'MEDIUM');
  console.log(`    EXACT: ${exact.length}, HIGH: ${high.length}, MEDIUM: ${medium.length}`);

  // Apply EXACT and HIGH confidence updates
  let updated = 0;
  for (const u of [...exact, ...high]) {
    await db.execute(sql`UPDATE breweries SET country = ${u.country}, region = '' WHERE id = ${u.id}`);
    console.log(`✓ [${u.id}] "${u.origName}" → ${u.country} (${u.confidence} via "${u.matchName}")`);
    updated++;
  }
  
  console.log(`\n--- MEDIUM confidence (review needed) ---`);
  for (const u of medium.slice(0, 40)) {
    console.log(`  [${u.id}] "${u.origName}" → ${u.country} via "${u.matchName}"`);
  }

  console.log(`\n✅ Updated: ${updated}`);
  
  const { rows: stats } = await db.execute(sql`
    SELECT CASE WHEN country IN ('Italia','Italy') THEN 'Italiani' ELSE 'Esteri' END as tipo, COUNT(*) as n
    FROM breweries GROUP BY 1
  `) as any;
  stats.forEach((r: any) => console.log(`  ${r.tipo}: ${r.n}`));
}

main().catch(console.error);
