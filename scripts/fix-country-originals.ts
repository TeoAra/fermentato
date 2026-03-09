import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
  // Get all original breweries (pre-import) with country='Italia'
  const { rows: originals } = await db.execute(sql`
    SELECT id, name, location, region FROM breweries 
    WHERE id < 5178 AND country = 'Italia'
    ORDER BY id
  `) as any;

  console.log(`Checking ${originals.length} original breweries...`);
  
  let updated = 0;
  const results: any[] = [];

  for (const brewery of originals) {
    const cleanName = brewery.name.toLowerCase().trim().replace(/\s*\(.*\)\s*$/, '').trim();
    
    // Query single match using GIN index
    const { rows: matches } = await db.execute(sql`
      SELECT name, country, location, region,
             similarity(LOWER(TRIM(name)), ${cleanName}) as sim
      FROM breweries
      WHERE id > 5502
        AND country NOT IN ('Italia', 'Italy')
        AND LOWER(TRIM(name)) % ${cleanName}
      ORDER BY sim DESC
      LIMIT 1
    `) as any;

    if (matches.length > 0 && matches[0].sim >= 0.75) {
      results.push({
        id: brewery.id,
        orig_name: brewery.name,
        matched: matches[0].name,
        country: matches[0].country,
        location: matches[0].location,
        sim: Math.round(matches[0].sim * 100) / 100
      });
    }
  }

  // Show results for review, then apply high-confidence ones
  const highConf = results.filter(r => r.sim >= 0.85);
  const medConf = results.filter(r => r.sim >= 0.75 && r.sim < 0.85);

  console.log(`\nHigh confidence (>= 0.85): ${highConf.length}`);
  highConf.slice(0, 30).forEach(r => 
    console.log(`  [${r.id}] ${r.orig_name} → ${r.country} (${r.sim}) [matched: ${r.matched}]`)
  );

  console.log(`\nMedium confidence (0.75-0.84): ${medConf.length}`);
  medConf.slice(0, 20).forEach(r => 
    console.log(`  [${r.id}] ${r.orig_name} → ${r.country} (${r.sim}) [matched: ${r.matched}]`)
  );

  // Apply high confidence updates
  console.log(`\nApplying ${highConf.length} high-confidence updates...`);
  for (const r of highConf) {
    await db.execute(sql`UPDATE breweries SET country = ${r.country} WHERE id = ${r.id}`);
    updated++;
  }

  // Save all results to file for review
  const fs = await import('fs');
  fs.writeFileSync('/tmp/country-fix-results.json', JSON.stringify(results, null, 2));
  console.log(`\n✅ Updated: ${updated}`);
  console.log(`📄 All ${results.length} matches saved to /tmp/country-fix-results.json`);
}

main().catch(console.error);
