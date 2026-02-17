import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';
import * as schema from '../shared/schema';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

neonConfig.webSocketConstructor = ws;

const TABLES_TO_EXPORT = [
  'users',
  'breweries',
  'beers',
  'pubs',
  'tap_list',
  'bottle_list',
  'menu_categories',
  'menu_items',
  'allergens',
  'pub_sizes',
  'favorites',
  'ratings',
  'notifications',
  'notification_preferences',
  'push_subscriptions',
  'publican_requests',
  'brewery_requests',
  'oauth_accounts',
  'user_activities',
  'user_beer_tastings',
];

async function exportData() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle({ client: pool, schema });

  const exportDir = path.join(process.cwd(), 'data-export');
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  const exportData: Record<string, any[]> = {};

  for (const tableName of TABLES_TO_EXPORT) {
    try {
      const result = await db.execute(sql.raw(`SELECT * FROM "${tableName}" ORDER BY id`));
      exportData[tableName] = result.rows || [];
      console.log(`Exported ${exportData[tableName].length} rows from ${tableName}`);
    } catch (err: any) {
      if (err.message?.includes('does not exist')) {
        console.log(`Table ${tableName} does not exist, skipping`);
      } else {
        console.error(`Error exporting ${tableName}:`, err.message);
      }
    }
  }

  const exportFile = path.join(exportDir, `export-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(exportFile, JSON.stringify(exportData, null, 2));
  console.log(`\nData exported to: ${exportFile}`);
  console.log(`Total tables exported: ${Object.keys(exportData).length}`);

  await pool.end();
}

exportData().catch((err) => {
  console.error('Export failed:', err);
  process.exit(1);
});
