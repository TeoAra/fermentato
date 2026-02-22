ALTER TABLE "beers" ADD COLUMN "is_gluten_free" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "beers" ADD COLUMN "is_alcohol_free" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "menu_items" ADD COLUMN "is_info_box" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "pubs" ADD COLUMN "menu_info_box" text;