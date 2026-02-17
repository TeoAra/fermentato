import pg from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const TABLE_PRIMARY_KEYS: Record<string, string> = {
  allergens: 'id',
  users: 'id',
  oauth_accounts: 'id',
  breweries: 'id',
  beers: 'id',
  pubs: 'id',
  pub_sizes: 'id',
  tap_list: 'id',
  bottle_list: 'id',
  menu_categories: 'id',
  menu_items: 'id',
  favorites: 'id',
  ratings: 'id',
  notifications: 'id',
  notification_preferences: 'id',
  push_subscriptions: 'id',
  publican_requests: 'id',
  brewery_requests: 'id',
  user_activities: 'id',
  user_beer_tastings: 'id',
};

const IMPORT_ORDER = [
  'allergens',
  'users',
  'oauth_accounts',
  'breweries',
  'beers',
  'pubs',
  'pub_sizes',
  'tap_list',
  'bottle_list',
  'menu_categories',
  'menu_items',
  'favorites',
  'ratings',
  'notifications',
  'notification_preferences',
  'push_subscriptions',
  'publican_requests',
  'brewery_requests',
  'user_activities',
  'user_beer_tastings',
];

async function importData() {
  const exportFile = process.argv[2];
  if (!exportFile) {
    const exportDir = path.join(process.cwd(), 'data-export');
    if (fs.existsSync(exportDir)) {
      const files = fs.readdirSync(exportDir).filter(f => f.endsWith('.json')).sort();
      if (files.length > 0) {
        console.log('Available export files:');
        files.forEach(f => console.log(`  data-export/${f}`));
        console.log(`\nUsage: npx tsx scripts/import-data.ts data-export/<filename>.json`);
      }
    }
    console.error('Please provide an export file path as argument');
    process.exit(1);
  }

  if (!fs.existsSync(exportFile)) {
    console.error(`File not found: ${exportFile}`);
    process.exit(1);
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const pool = new pg.Pool({ connectionString: databaseUrl });

  const data: Record<string, any[]> = JSON.parse(fs.readFileSync(exportFile, 'utf-8'));

  console.log('Starting data import (upsert mode - merge, not overwrite)...\n');

  for (const tableName of IMPORT_ORDER) {
    const rows = data[tableName];
    if (!rows || rows.length === 0) {
      console.log(`Skipping ${tableName} (no data)`);
      continue;
    }

    const primaryKey = TABLE_PRIMARY_KEYS[tableName];
    if (!primaryKey) {
      console.log(`Skipping ${tableName} (no primary key defined)`);
      continue;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      let imported = 0;
      for (const row of rows) {
        const cols = Object.keys(row);
        const colNames = cols.map(c => `"${c}"`).join(', ');
        const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
        const values = cols.map(c => row[c]);

        const updateCols = cols.filter(c => c !== primaryKey);
        const updateSet = updateCols.length > 0
          ? updateCols.map(c => `"${c}" = EXCLUDED."${c}"`).join(', ')
          : null;

        const query = updateSet
          ? `INSERT INTO "${tableName}" (${colNames}) VALUES (${placeholders}) ON CONFLICT ("${primaryKey}") DO UPDATE SET ${updateSet}`
          : `INSERT INTO "${tableName}" (${colNames}) VALUES (${placeholders}) ON CONFLICT ("${primaryKey}") DO NOTHING`;

        await client.query(query, values);
        imported++;
      }

      await client.query('COMMIT');
      console.log(`Imported ${imported} rows into ${tableName}`);

      const seqCheck = await client.query(
        `SELECT pg_get_serial_sequence('"${tableName}"', '${primaryKey}') as seq`
      );
      if (seqCheck.rows[0]?.seq) {
        await client.query(
          `SELECT setval('${seqCheck.rows[0].seq}', COALESCE((SELECT MAX("${primaryKey}") FROM "${tableName}"), 0) + 1, false)`
        );
      }
    } catch (err: any) {
      await client.query('ROLLBACK');
      console.error(`Error importing ${tableName}: ${err.message}`);
    } finally {
      client.release();
    }
  }

  console.log('\nImport complete!');
  await pool.end();
}

importData().catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});
