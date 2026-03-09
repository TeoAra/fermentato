import { db } from "../server/db";
import { sql } from "drizzle-orm";

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/^\s*(brouwerij|brasserie|brauerei|birrificio|birra|birreria|microbirrificio|brewery|brewing company|brewing co\.?|craft brewery|pivovar|pivovarna|cervecería|cervejaria|bryggeri|brygghus|cerveceria|birreria artigianale|microbrewery|beerwork|beer company|bierbrouwerij|bierbrauerei)\s+/gi, '')
    .replace(/\s+(brouwerij|brasserie|brauerei|birrificio|birra|birreria|brewery|brewing company|brewing co\.?|craft brewery|pivovar|pivovarna|cervecería|cervejaria|bryggeri|brygghus|cerveceria|brewing|brew|bräu|beer|birreria)\s*$/gi, '')
    .replace(/\s*(srl|s\.r\.l\.|spa|s\.p\.a\.|gmbh|ag|sa|s\.a\.|bv|nv|ltd|llc|inc\.|ab inbev|duvel moortgat|heineken|ab-inbev|coors|diageo|asahi|molson|tilray)\s*$/gi, '')
    .replace(/[^a-z0-9àèéìíòóùúäöüß\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function main() {
  const { rows: breweries } = await db.execute(sql`
    SELECT b.id, b.name, b.country, b.location, b.region, b.description, b.logo_url,
           b.website_url,
           COUNT(br.id) as beer_count
    FROM breweries b
    LEFT JOIN beers br ON br.brewery_id = b.id
    GROUP BY b.id, b.name, b.country, b.location, b.region, b.description, b.logo_url, b.website_url
    ORDER BY b.name
  `) as any;

  console.log(`Loaded ${breweries.length} breweries`);

  // Group by normalized name + country
  const groups = new Map<string, any[]>();
  for (const b of breweries) {
    const norm = normalizeName(b.name);
    if (!norm || norm.length < 3) continue;
    const key = `${norm}||${b.country}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push({ ...b, norm });
  }

  const duplicateGroups: any[][] = [];
  for (const [, group] of groups) {
    if (group.length > 1) duplicateGroups.push(group);
  }

  console.log(`Found ${duplicateGroups.length} groups with duplicates (${duplicateGroups.reduce((s, g) => s + g.length - 1, 0)} to remove)\n`);

  let totalBeers = 0, totalDeleted = 0;

  for (const group of duplicateGroups) {
    // Keep the one with most beers; tie-break: most data (logo, description, longest name)
    group.sort((a: any, b: any) => {
      const bc = Number(b.beer_count) - Number(a.beer_count);
      if (bc !== 0) return bc;
      const score = (x: any) => (x.logo_url ? 2 : 0) + (x.description ? 1 : 0) + (x.website_url ? 1 : 0);
      return score(b) - score(a);
    });

    const keeper = group[0];
    const duplicates = group.slice(1);

    console.log(`📌 KEEP [${keeper.id}] "${keeper.name}" (${keeper.beer_count} beers, ${keeper.country})`);

    for (const dup of duplicates) {
      console.log(`  🗑  DEL [${dup.id}] "${dup.name}" (${dup.beer_count} beers)`);

      // 1. Reassign beers
      const res = await db.execute(sql`UPDATE beers SET brewery_id = ${keeper.id} WHERE brewery_id = ${dup.id}`) as any;
      totalBeers += Number(res.rowCount ?? 0);

      // 2. Reassign brewery_events
      await db.execute(sql`UPDATE brewery_events SET brewery_id = ${keeper.id} WHERE brewery_id = ${dup.id}`);

      // 3. Handle brewery_requests (set to NULL to avoid FK violation)
      await db.execute(sql`UPDATE brewery_requests SET existing_brewery_id = ${keeper.id} WHERE existing_brewery_id = ${dup.id}`);

      // 4. Reassign notifications
      await db.execute(sql`UPDATE notifications SET brewery_id = ${keeper.id} WHERE brewery_id = ${dup.id}`);

      // 5. Reassign users
      await db.execute(sql`UPDATE users SET brewery_id = ${keeper.id} WHERE brewery_id = ${dup.id}`);

      // 6. Merge missing data into keeper
      await db.execute(sql`
        UPDATE breweries SET
          logo_url = COALESCE(NULLIF(logo_url, ''), ${dup.logo_url || null}),
          description = COALESCE(NULLIF(description, ''), ${dup.description || null}),
          website_url = COALESCE(NULLIF(website_url, ''), ${dup.website_url || null}),
          location = COALESCE(NULLIF(NULLIF(location, ''), 'Non specificato'), NULLIF(NULLIF(${dup.location || ''}, ''), 'Non specificato'), '')
        WHERE id = ${keeper.id}
      `);

      // 7. Delete the duplicate
      await db.execute(sql`DELETE FROM breweries WHERE id = ${dup.id}`);
      totalDeleted++;
    }
  }

  console.log(`\n✅ Done! Moved ${totalBeers} beers, deleted ${totalDeleted} duplicate breweries`);
  const { rows } = await db.execute(sql`SELECT COUNT(*) as n FROM breweries`) as any;
  console.log(`Breweries remaining: ${rows[0].n}`);
}

main().catch(console.error);
