-- Migration: add missing columns and tables not captured in previous migrations
-- Safe to run multiple times (uses IF NOT EXISTS / DO blocks)

-- Add needs_onboarding column to users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "needs_onboarding" boolean DEFAULT false;

-- Add is_public column to users (public profile toggle)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_public" boolean DEFAULT true;

-- Create brewery_events table if it doesn't exist
CREATE TABLE IF NOT EXISTS "brewery_events" (
  "id" serial PRIMARY KEY NOT NULL,
  "brewery_id" integer NOT NULL,
  "title" varchar(255) NOT NULL,
  "description" text,
  "event_date" timestamp NOT NULL,
  "end_date" timestamp,
  "image_url" text,
  "category" varchar(50) DEFAULT 'altro',
  "is_published" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Add foreign key for brewery_events only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'brewery_events_brewery_id_breweries_id_fk'
  ) THEN
    ALTER TABLE "brewery_events"
      ADD CONSTRAINT "brewery_events_brewery_id_breweries_id_fk"
      FOREIGN KEY ("brewery_id") REFERENCES "breweries"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;
