import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function run() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS bot_connections (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      pub_id INTEGER NOT NULL REFERENCES pubs(id) ON DELETE CASCADE,
      platform VARCHAR(20) NOT NULL,
      chat_id VARCHAR(100) NOT NULL,
      display_name VARCHAR,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      CONSTRAINT bot_connections_platform_chat_id_unique UNIQUE (platform, chat_id)
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS bot_link_tokens (
      id SERIAL PRIMARY KEY,
      token VARCHAR(64) UNIQUE NOT NULL,
      user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      pub_id INTEGER NOT NULL REFERENCES pubs(id) ON DELETE CASCADE,
      expires_at TIMESTAMP NOT NULL,
      used_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log("✅ Tabelle bot create con successo");
}
run().then(() => process.exit(0)).catch(e => { console.error("❌", e.message); process.exit(1); });
