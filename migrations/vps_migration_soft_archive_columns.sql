-- VPS manual migration: soft-archive columns (added 2026-06-04 via drizzle-kit push,
-- so NOT present in any numbered migration file). Required by server/visibility.ts,
-- storage.ts and routes.ts. Without them every listing/search/explore query fails and
-- the API returns an error object instead of an array -> the client crashes with
-- "X.map is not a function" / "(X ?? []).forEach is not a function".
-- Safe to run multiple times (uses IF NOT EXISTS). Additive, non-destructive.

ALTER TABLE "breweries" ADD COLUMN IF NOT EXISTS "is_closed" boolean DEFAULT false;
ALTER TABLE "breweries" ADD COLUMN IF NOT EXISTS "closed_source" varchar;
ALTER TABLE "breweries" ADD COLUMN IF NOT EXISTS "closed_at" timestamp;

ALTER TABLE "beers" ADD COLUMN IF NOT EXISTS "is_discontinued" boolean DEFAULT false;
ALTER TABLE "beers" ADD COLUMN IF NOT EXISTS "discontinued_source" varchar;
