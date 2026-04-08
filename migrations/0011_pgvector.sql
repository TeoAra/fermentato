-- ── pgvector semantic search for Fermenta.to ────────────────────────────────
-- Requires: postgresql-18-pgvector installed at OS level, then:
--   sudo -u postgres psql fermenta -c "CREATE EXTENSION IF NOT EXISTS vector;"
-- Run this file AFTER the extension is enabled.

CREATE EXTENSION IF NOT EXISTS vector;

-- beer_embeddings: pre-computed 768-dim vectors for fuzzy name search
CREATE TABLE IF NOT EXISTS beer_embeddings (
  beer_id      INTEGER PRIMARY KEY REFERENCES beers(id) ON DELETE CASCADE,
  embedding    vector(768) NOT NULL,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- HNSW index — works well even before table is populated
CREATE INDEX IF NOT EXISTS idx_beer_emb_hnsw
  ON beer_embeddings USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Add OCR embedding column to scan_logs (stores confirmed scans)
ALTER TABLE scan_logs ADD COLUMN IF NOT EXISTS ocr_embedding vector(768);

-- Partial HNSW index on confirmed scans only
CREATE INDEX IF NOT EXISTS idx_scan_logs_ocr_emb_hnsw
  ON scan_logs USING hnsw (ocr_embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64)
  WHERE ocr_embedding IS NOT NULL;
