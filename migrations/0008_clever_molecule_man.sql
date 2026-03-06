CREATE TABLE "brewery_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"brewery_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"category" varchar(50) DEFAULT 'altro',
	"event_date" timestamp NOT NULL,
	"end_date" timestamp,
	"image_url" text,
	"is_published" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "review_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"review_id" integer NOT NULL,
	"reporter_id" varchar NOT NULL,
	"reason" varchar(50) NOT NULL,
	"description" text,
	"status" varchar(20) DEFAULT 'pending',
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verification_token" varchar;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verification_expires" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "needs_onboarding" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_public" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "brewery_events" ADD CONSTRAINT "brewery_events_brewery_id_breweries_id_fk" FOREIGN KEY ("brewery_id") REFERENCES "public"."breweries"("id") ON DELETE cascade ON UPDATE no action;