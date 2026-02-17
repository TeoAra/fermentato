import pg from 'pg';
import { spawn } from 'child_process';

const VPS_HOST = '45.134.39.247';
const VPS_USER = 'root';
const SSH_KEY = `${process.env.HOME}/.ssh/id_replit_sync`;
const LOCAL_TUNNEL_PORT = 15432;
const BATCH_SIZE = 100;

function createPool(connectionString: string): pg.Pool {
  const isNeon = connectionString.includes('neon.tech');
  const pool = new pg.Pool({
    connectionString,
    max: 3,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    ...(isNeon ? { ssl: { rejectUnauthorized: false } } : {}),
  });
  pool.on('error', (err) => {
    console.error('Pool error:', err.message);
  });
  return pool;
}

const TABLES_PHASE1 = ['allergens', 'pub_sizes'];

const TABLES_PHASE3 = ['breweries', 'beers', 'pubs', 'oauth_accounts'];

const TABLES_PHASE5 = [
  'tap_list', 'bottle_list', 'menu_categories', 'menu_items',
  'favorites', 'ratings', 'notifications', 'notification_preferences',
  'push_subscriptions', 'publican_requests', 'brewery_requests',
  'user_activities', 'user_beer_tastings',
];

function startSSHTunnel(): ReturnType<typeof spawn> {
  console.log(`🔒 Apertura SSH tunnel verso ${VPS_HOST}...`);
  const tunnel = spawn('ssh', [
    '-o', 'StrictHostKeyChecking=no',
    '-o', 'ConnectTimeout=10',
    '-i', SSH_KEY,
    '-N',
    '-L', `${LOCAL_TUNNEL_PORT}:127.0.0.1:5432`,
    `${VPS_USER}@${VPS_HOST}`,
  ], { stdio: 'pipe' });

  tunnel.stderr.on('data', (data: Buffer) => {
    const msg = data.toString().trim();
    if (msg && !msg.includes('Warning:')) {
      console.error(`  SSH: ${msg}`);
    }
  });

  return tunnel;
}

async function waitForTunnel(maxRetries = 10): Promise<void> {
  const tunnelDbUrl = `postgres://fermenta:antanicorp94@127.0.0.1:${LOCAL_TUNNEL_PORT}/fermenta`;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const pool = new pg.Pool({ connectionString: tunnelDbUrl, connectionTimeoutMillis: 2000 });
      await pool.query('SELECT 1');
      await pool.end();
      console.log('✅ SSH tunnel attivo\n');
      return;
    } catch {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  throw new Error('Impossibile connettersi al database VPS tramite SSH tunnel');
}

async function getTableData(pool: pg.Pool, tableName: string, label: string, nullifyCols?: string[]): Promise<any[]> {
  try {
    const result = await pool.query(`SELECT * FROM "${tableName}" ORDER BY id`);
    const rows = result.rows || [];
    if (nullifyCols && nullifyCols.length > 0) {
      return rows.map(row => {
        const filtered = { ...row };
        nullifyCols.forEach(c => { filtered[c] = null; });
        return filtered;
      });
    }
    return rows;
  } catch (err: any) {
    if (err.message?.includes('does not exist')) {
      console.log(`  ⚠️  ${label}: ${tableName} non esiste`);
    } else {
      console.error(`  ❌ ${label}: ${tableName}: ${err.message}`);
    }
    return [];
  }
}

async function upsertBatch(client: pg.PoolClient, tableName: string, batch: any[], onlyUpdateCols?: string[]): Promise<void> {
  if (batch.length === 0) return;

  const cols = Object.keys(batch[0]);
  const colNames = cols.map(c => `"${c}"`).join(', ');

  let paramIdx = 1;
  const allValues: any[] = [];
  const rowPlaceholders: string[] = [];

  for (const row of batch) {
    const placeholders = cols.map(() => `$${paramIdx++}`);
    rowPlaceholders.push(`(${placeholders.join(', ')})`);
    cols.forEach(c => allValues.push(row[c]));
  }

  const updateCols = onlyUpdateCols || cols.filter(c => c !== 'id');
  const updateSet = updateCols.length > 0
    ? updateCols.map(c => `"${c}" = EXCLUDED."${c}"`).join(', ')
    : null;

  const query = updateSet
    ? `INSERT INTO "${tableName}" (${colNames}) VALUES ${rowPlaceholders.join(', ')} ON CONFLICT ("id") DO UPDATE SET ${updateSet}`
    : `INSERT INTO "${tableName}" (${colNames}) VALUES ${rowPlaceholders.join(', ')} ON CONFLICT ("id") DO NOTHING`;

  await client.query(query, allValues);
}

async function upsertRows(pool: pg.Pool, tableName: string, rows: any[], label: string, onlyUpdateCols?: string[]): Promise<number> {
  if (!rows || rows.length === 0) return 0;

  const client = await pool.connect();
  let imported = 0;

  try {
    await client.query('BEGIN');

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      await upsertBatch(client, tableName, batch, onlyUpdateCols);
      imported += batch.length;

      if (rows.length > BATCH_SIZE) {
        process.stdout.write(`\r  📥 ${label}: ${tableName} ← ${imported}/${rows.length}`);
      }
    }

    await client.query('COMMIT');

    const seqCheck = await client.query(
      `SELECT pg_get_serial_sequence('"${tableName}"', 'id') as seq`
    );
    if (seqCheck.rows[0]?.seq) {
      await client.query(
        `SELECT setval('${seqCheck.rows[0].seq}', COALESCE((SELECT MAX("id") FROM "${tableName}"), 0) + 1, false)`
      );
    }

    if (rows.length > BATCH_SIZE) {
      process.stdout.write('\n');
    } else {
      console.log(`  📥 ${label}: ${tableName} ← ${imported} righe`);
    }
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error(`\n  ❌ ${label}: errore ${tableName}: ${err.message}`);
  } finally {
    client.release();
  }

  return imported;
}

async function syncDirection(sourcePool: pg.Pool, destPool: pg.Pool, srcLabel: string, dstLabel: string) {
  console.log(`\n  Fase 1/5: Tabelle indipendenti...`);
  for (const table of TABLES_PHASE1) {
    const rows = await getTableData(sourcePool, table, srcLabel);
    if (rows.length > 0) {
      console.log(`  📤 ${srcLabel}: ${table} → ${rows.length}`);
      await upsertRows(destPool, table, rows, dstLabel);
    }
  }

  console.log(`  Fase 2/5: Utenti (senza FK birrificio)...`);
  const usersRows = await getTableData(sourcePool, 'users', srcLabel, ['brewery_id']);
  if (usersRows.length > 0) {
    console.log(`  📤 ${srcLabel}: users → ${usersRows.length}`);
    await upsertRows(destPool, 'users', usersRows, dstLabel);
  }

  console.log(`  Fase 3/5: Birrifici, birre, pub...`);
  for (const table of TABLES_PHASE3) {
    const rows = await getTableData(sourcePool, table, srcLabel);
    if (rows.length > 0) {
      console.log(`  📤 ${srcLabel}: ${table} → ${rows.length}`);
      await upsertRows(destPool, table, rows, dstLabel);
    }
  }

  console.log(`  Fase 4/5: Aggiornamento brewery_id utenti...`);
  const usersAll = await getTableData(sourcePool, 'users', srcLabel);
  const usersWithBrewery = usersAll.filter(u => u.brewery_id !== null);
  if (usersWithBrewery.length > 0) {
    await upsertRows(destPool, 'users', usersWithBrewery, dstLabel, ['brewery_id']);
  }

  console.log(`  Fase 5/5: Tabelle dipendenti...`);
  for (const table of TABLES_PHASE5) {
    const rows = await getTableData(sourcePool, table, srcLabel);
    if (rows.length > 0) {
      console.log(`  📤 ${srcLabel}: ${table} → ${rows.length}`);
      await upsertRows(destPool, table, rows, dstLabel);
    }
  }
}

async function syncBidirectional() {
  const direction = process.argv[2] || 'both';
  
  if (!['pull', 'push', 'both'].includes(direction)) {
    console.log(`
Uso: npx tsx scripts/sync-data.ts [pull|push|both]

  pull  - VPS → Replit
  push  - Replit → VPS  
  both  - Bidirezionale (prima pull, poi push)
`);
    process.exit(1);
  }

  console.log(`\n🔄 Sincronizzazione: ${direction.toUpperCase()}\n`);
  const startTime = Date.now();

  const tunnel = startSSHTunnel();

  try {
    await waitForTunnel();

    const replitDbUrl = process.env.DATABASE_URL;
    if (!replitDbUrl) throw new Error('DATABASE_URL non configurato');

    const vpsDbUrl = `postgres://fermenta:antanicorp94@127.0.0.1:${LOCAL_TUNNEL_PORT}/fermenta`;

    const replitPool = createPool(replitDbUrl);
    const vpsPool = createPool(vpsDbUrl);

    await replitPool.query('SELECT 1');
    console.log('✅ Database Replit OK');
    await vpsPool.query('SELECT 1');
    console.log('✅ Database VPS OK (via tunnel)');

    if (direction === 'pull' || direction === 'both') {
      console.log('\n━━━ PULL: VPS → Replit ━━━');
      await syncDirection(vpsPool, replitPool, 'VPS', 'Replit');
    }

    if (direction === 'push' || direction === 'both') {
      console.log('\n━━━ PUSH: Replit → VPS ━━━');
      await syncDirection(replitPool, vpsPool, 'Replit', 'VPS');
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n✅ Completato in ${elapsed}s\n`);

    await replitPool.end();
    await vpsPool.end();
  } catch (err: any) {
    console.error(`\n❌ Errore: ${err.message}`);
    process.exit(1);
  } finally {
    tunnel.kill();
    console.log('🔒 Tunnel chiuso');
  }
}

syncBidirectional();
