import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

console.log('Avvio pulizia prefissi brand su Replit...');
const start = Date.now();

const sql = `
WITH brands AS (
  SELECT id AS brewery_id,
    NULLIF(TRIM(REGEXP_REPLACE(name,
      '\\s*(Brewing Company|Brewing Co\\.|Brewing Co|Brewing|Brauerei|Brewery|Bierbrauerei|Brasserie|Birrificio|Beer Company|Beer Garden|Beer|Craft Beer|Brewpub|Brew Pub|Brewhouse|Pub|Co\\.|Company|Ltd\\.?|LLC|GmbH|SRL|S\\.r\\.l\\.|Inc\\.?)(\\s*\\([^)]*\\))?\\s*$',
      '', 'gi'
    )), '') AS brand
  FROM breweries
),
candidates AS (
  SELECT b.id AS beer_id,
         b.brewery_id,
         TRIM(SUBSTRING(b.name FROM LENGTH(brands.brand) + 2)) AS new_name
  FROM beers b
  JOIN breweries br ON b.brewery_id = br.id
  JOIN brands ON brands.brewery_id = br.id
  WHERE brands.brand IS NOT NULL
    AND LENGTH(brands.brand) >= 2
    AND brands.brand <> br.name
    AND b.name ILIKE (brands.brand || ' %')
    AND length(b.name) > LENGTH(brands.brand) + 1
    AND NOT b.name ILIKE (br.name || ' %')
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
`;

try {
  const client = await pool.connect();
  // Set long statement timeout
  await client.query("SET statement_timeout = '10min'");
  const result = await client.query(sql);
  console.log(`Aggiornate: ${result.rowCount} birre`);
  console.log(`Tempo: ${((Date.now()-start)/1000).toFixed(1)}s`);
  client.release();
} catch (e) {
  console.error('Errore:', e.message);
} finally {
  await pool.end();
}
