import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const REGEX = String.raw`\s*(Brewing Company|Brewing Co\.|Brewing Co|Brewing|Brauerei|Brewery|Bierbrauerei|Brasserie|Birrificio|Beer Company|Beer Garden|Beer|Craft Beer|Brewpub|Brew Pub|Brewhouse|Pub|Co\.|Company|Ltd\.?|LLC|GmbH|SRL|S\.r\.l\.|Inc\.?)(\s*\([^)]*\))?\s*$`;

async function main() {
  const client = await pool.connect();
  try {
    // Get all brewery IDs that need processing (where brand != full name)
    const { rows: breweryRows } = await client.query(`
      SELECT id AS brewery_id, name,
        NULLIF(TRIM(REGEXP_REPLACE(name, $1, '', 'gi')), '') AS brand
      FROM breweries
      WHERE NULLIF(TRIM(REGEXP_REPLACE(name, $1, '', 'gi')), '') IS NOT NULL
        AND TRIM(REGEXP_REPLACE(name, $1, '', 'gi')) <> name
        AND LENGTH(TRIM(REGEXP_REPLACE(name, $1, '', 'gi'))) >= 2
      ORDER BY id
    `, [REGEX]);

    console.log(`Birrifici con brand da processare: ${breweryRows.length}`);

    const BATCH = 500;
    let totalUpdated = 0;

    for (let i = 0; i < breweryRows.length; i += BATCH) {
      const batch = breweryRows.slice(i, i + BATCH);
      
      const values: any[] = [];
      const placeholders: string[] = [];
      batch.forEach((row, idx) => {
        values.push(row.brewery_id, row.brand, row.name);
        placeholders.push(`($${idx*3+1}::int, $${idx*3+2}::text, $${idx*3+3}::text)`);
      });

      const result = await client.query(`
        WITH input(brewery_id, brand, full_name) AS (VALUES ${placeholders.join(',')}),
        candidates AS (
          SELECT b.id AS beer_id, b.brewery_id,
                 TRIM(SUBSTRING(b.name FROM LENGTH(inp.brand) + 2)) AS new_name
          FROM beers b
          JOIN input inp ON b.brewery_id = inp.brewery_id
          WHERE LENGTH(inp.brand) >= 2
            AND inp.brand <> inp.full_name
            AND b.name ILIKE (inp.brand || ' %')
            AND length(b.name) > LENGTH(inp.brand) + 1
            AND NOT b.name ILIKE (inp.full_name || ' %')
        ),
        conflicts AS (
          SELECT DISTINCT c.beer_id
          FROM candidates c
          JOIN beers ex ON ex.brewery_id = c.brewery_id
            AND LOWER(ex.name) = LOWER(c.new_name)
            AND ex.id <> c.beer_id
        )
        UPDATE beers b
        SET name = c.new_name
        FROM candidates c
        WHERE b.id = c.beer_id
          AND c.beer_id NOT IN (SELECT beer_id FROM conflicts)
      `, values);

      totalUpdated += result.rowCount || 0;
      const pct = Math.round(((i + BATCH) / breweryRows.length) * 100);
      process.stdout.write(`\r[${pct}%] Processati ${Math.min(i+BATCH,breweryRows.length)}/${breweryRows.length} birrifici — ${totalUpdated} birre aggiornate`);
    }

    console.log(`\n\nCompleto! Aggiornate ${totalUpdated} birre in totale.`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(e => { console.error('ERRORE:', e.message); process.exit(1); });
