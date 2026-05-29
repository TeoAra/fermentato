-- VPS Migration: Drink Items + Drink Categories
-- Eseguire come superuser postgres:
-- sudo -u postgres psql fermenta -f /www/nodeapps/fermenta/migrations/vps_migration_drink_items.sql

-- 1. Create drink_items table (if not exists)
CREATE TABLE IF NOT EXISTS drink_items (
  id SERIAL PRIMARY KEY,
  pub_id INTEGER NOT NULL REFERENCES pubs(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL DEFAULT 'other',
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price NUMERIC(6,2),
  price_by_glass NUMERIC(6,2),
  price_by_bottle NUMERIC(6,2),
  image_url VARCHAR(500),
  is_visible BOOLEAN DEFAULT true,
  is_available BOOLEAN DEFAULT true,
  order_index INTEGER DEFAULT 0,
  allergens JSONB DEFAULT '[]',
  vintage INTEGER,
  region VARCHAR(255),
  grape_variety VARCHAR(255),
  distillery VARCHAR(255),
  alcohol_degree NUMERIC(4,1),
  volume_cl INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Add format column to bottle_list (if not exists)
ALTER TABLE bottle_list
  ADD COLUMN IF NOT EXISTS format VARCHAR(20) DEFAULT 'bottiglia';

-- 3. Create drink_categories table (new)
CREATE TABLE IF NOT EXISTS drink_categories (
  id SERIAL PRIMARY KEY,
  pub_id INTEGER NOT NULL REFERENCES pubs(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) DEFAULT 'custom',
  description TEXT,
  info_box TEXT,
  order_index INTEGER DEFAULT 0,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Grant ALL permissions (must run as postgres superuser)
GRANT ALL PRIVILEGES ON TABLE drink_items TO fermenta;
GRANT ALL PRIVILEGES ON SEQUENCE drink_items_id_seq TO fermenta;
GRANT ALL PRIVILEGES ON TABLE drink_categories TO fermenta;
GRANT ALL PRIVILEGES ON SEQUENCE drink_categories_id_seq TO fermenta;
