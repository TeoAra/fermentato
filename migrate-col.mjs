import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);
try {
  await sql`ALTER TABLE beers ADD COLUMN IF NOT EXISTS translated_it BOOLEAN DEFAULT false`;
  console.log('Column added successfully');
} catch(e) {
  console.error('Error:', e.message);
}
process.exit(0);
