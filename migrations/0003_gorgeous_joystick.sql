CREATE TABLE "pub_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"pub_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"event_date" timestamp NOT NULL,
	"end_date" timestamp,
	"image_url" text,
	"is_published" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "pub_events" ADD CONSTRAINT "pub_events_pub_id_pubs_id_fk" FOREIGN KEY ("pub_id") REFERENCES "public"."pubs"("id") ON DELETE cascade ON UPDATE no action;