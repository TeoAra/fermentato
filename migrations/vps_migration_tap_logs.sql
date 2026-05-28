-- Migration: tap_change_logs + tap_cleanings
-- Da eseguire sul VPS PostgreSQL (psql -U utente -d fermenta -f vps_migration_tap_logs.sql)

-- 1. Storico cambi fusto
CREATE TABLE IF NOT EXISTS tap_change_logs (
  id               SERIAL PRIMARY KEY,
  pub_id           INTEGER NOT NULL REFERENCES pubs(id) ON DELETE CASCADE,
  tap_number       INTEGER,
  tap_type         VARCHAR(20),
  old_beer_id      INTEGER,
  old_beer_name    TEXT,
  new_beer_id      INTEGER,
  new_beer_name    TEXT,
  changed_at       TIMESTAMP DEFAULT NOW(),
  duration_minutes INTEGER
);

-- 2. Log lavaggi linee
CREATE TABLE IF NOT EXISTS tap_cleanings (
  id          SERIAL PRIMARY KEY,
  pub_id      INTEGER NOT NULL REFERENCES pubs(id) ON DELETE CASCADE,
  tap_number  INTEGER,
  tap_type    VARCHAR(20),
  cleaned_at  TIMESTAMP DEFAULT NOW(),
  notes       TEXT
);

-- 3. Colonne aggiuntive su menu_items (se non esistono già)
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS pairing_beer_name VARCHAR(255);
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 4. Quantità fusti in magazzino (next_tap_proposals)
ALTER TABLE next_tap_proposals ADD COLUMN IF NOT EXISTS keg_count INTEGER DEFAULT 1;

-- Indici utili
CREATE INDEX IF NOT EXISTS idx_tap_change_logs_pub_id ON tap_change_logs(pub_id);
CREATE INDEX IF NOT EXISTS idx_tap_change_logs_changed_at ON tap_change_logs(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_tap_cleanings_pub_id ON tap_cleanings(pub_id);
