CREATE TABLE "allergens" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"emoji" varchar NOT NULL,
	"order_index" integer DEFAULT 0,
	CONSTRAINT "allergens_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "beers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"brewery_id" integer NOT NULL,
	"style" varchar NOT NULL,
	"abv" numeric(3, 1),
	"ibu" integer,
	"description" text,
	"logo_url" varchar,
	"image_url" varchar,
	"bottle_image_url" varchar,
	"color" varchar,
	"is_bottled" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "bottle_list" (
	"id" serial PRIMARY KEY NOT NULL,
	"pub_id" integer NOT NULL,
	"beer_id" integer NOT NULL,
	"is_active" boolean DEFAULT true,
	"is_visible" boolean DEFAULT true,
	"prices" jsonb,
	"price_bottle" numeric(5, 2),
	"bottle_size" varchar DEFAULT '0.33L',
	"quantity" integer,
	"description" text,
	"added_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "breweries" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"location" varchar NOT NULL,
	"region" varchar NOT NULL,
	"country" varchar DEFAULT 'Italia',
	"description" text,
	"logo_url" varchar,
	"cover_image_url" varchar,
	"website_url" varchar,
	"vat_number" varchar,
	"phone" varchar,
	"latitude" numeric(10, 8),
	"longitude" numeric(11, 8),
	"rating" numeric(2, 1) DEFAULT '0',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "brewery_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"brewery_name" varchar NOT NULL,
	"brewery_location" varchar NOT NULL,
	"brewery_region" varchar,
	"brewery_country" varchar,
	"vat_number" varchar,
	"phone" varchar,
	"email" varchar,
	"website_url" varchar,
	"description" text,
	"existing_brewery_id" integer,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"admin_notes" text,
	"created_at" timestamp DEFAULT now(),
	"reviewed_at" timestamp,
	"reviewed_by" varchar
);
--> statement-breakpoint
CREATE TABLE "favorites" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"item_type" varchar NOT NULL,
	"item_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "favorites_user_id_item_type_item_id_unique" UNIQUE("user_id","item_type","item_id")
);
--> statement-breakpoint
CREATE TABLE "menu_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"pub_id" integer NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"is_visible" boolean DEFAULT true,
	"order_index" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "menu_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"category_id" integer NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"price" numeric(5, 2) NOT NULL,
	"allergens" jsonb,
	"is_visible" boolean DEFAULT true,
	"is_available" boolean DEFAULT true,
	"image_url" varchar,
	"order_index" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"tap_changes" boolean DEFAULT true,
	"events" boolean DEFAULT true,
	"new_pubs" boolean DEFAULT false,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "notification_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"type" varchar NOT NULL,
	"title" varchar NOT NULL,
	"message" text NOT NULL,
	"pub_id" integer,
	"beer_id" integer,
	"is_read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "oauth_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"provider" varchar NOT NULL,
	"provider_user_id" varchar NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "oauth_accounts_provider_provider_user_id_unique" UNIQUE("provider","provider_user_id")
);
--> statement-breakpoint
CREATE TABLE "pub_sizes" (
	"id" serial PRIMARY KEY NOT NULL,
	"pub_id" integer NOT NULL,
	"size_name" varchar NOT NULL,
	"size_volume" varchar NOT NULL,
	"order_index" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "publican_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"pub_name" varchar NOT NULL,
	"pub_address" varchar NOT NULL,
	"pub_city" varchar NOT NULL,
	"pub_region" varchar,
	"vat_number" varchar,
	"phone" varchar,
	"email" varchar,
	"description" text,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"admin_notes" text,
	"created_at" timestamp DEFAULT now(),
	"reviewed_at" timestamp,
	"reviewed_by" varchar
);
--> statement-breakpoint
CREATE TABLE "pubs" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"address" varchar NOT NULL,
	"city" varchar NOT NULL,
	"region" varchar NOT NULL,
	"postal_code" varchar,
	"latitude" numeric(10, 8),
	"longitude" numeric(11, 8),
	"phone" varchar,
	"email" varchar,
	"website_url" varchar,
	"description" text,
	"image_url" varchar,
	"logo_url" varchar,
	"cover_image_url" varchar,
	"rating" numeric(2, 1) DEFAULT '0',
	"is_active" boolean DEFAULT true,
	"opening_hours" jsonb,
	"facebook_url" varchar,
	"instagram_url" varchar,
	"twitter_url" varchar,
	"tiktok_url" varchar,
	"owner_id" varchar,
	"vat_number" varchar,
	"business_name" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ratings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"pub_id" integer NOT NULL,
	"rating" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "unique_user_pub_rating" UNIQUE("user_id","pub_id")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tap_list" (
	"id" serial PRIMARY KEY NOT NULL,
	"pub_id" integer NOT NULL,
	"beer_id" integer NOT NULL,
	"is_active" boolean DEFAULT true,
	"is_visible" boolean DEFAULT true,
	"prices" jsonb,
	"price_small" numeric(5, 2),
	"price_medium" numeric(5, 2),
	"price_large" numeric(5, 2),
	"tap_number" integer,
	"description" text,
	"added_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"activity_type" varchar NOT NULL,
	"item_type" varchar,
	"item_id" integer,
	"description" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_beer_tastings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"beer_id" integer NOT NULL,
	"rating" integer,
	"personal_notes" text,
	"tasted_at" timestamp DEFAULT now(),
	"pub_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_beer_tastings_user_id_beer_id_unique" UNIQUE("user_id","beer_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY NOT NULL,
	"email" varchar,
	"hashed_password" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"nickname" varchar,
	"bio" text,
	"favorite_styles" varchar[],
	"user_type" varchar DEFAULT 'customer' NOT NULL,
	"roles" varchar[],
	"active_role" varchar,
	"brewery_id" integer,
	"is_email_verified" boolean DEFAULT false,
	"password_reset_token" varchar,
	"password_reset_expires" timestamp,
	"last_nickname_update" timestamp DEFAULT now(),
	"email_last_updated" timestamp,
	"password_last_updated" timestamp,
	"joined_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_nickname_unique" UNIQUE("nickname")
);
--> statement-breakpoint
ALTER TABLE "beers" ADD CONSTRAINT "beers_brewery_id_breweries_id_fk" FOREIGN KEY ("brewery_id") REFERENCES "public"."breweries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bottle_list" ADD CONSTRAINT "bottle_list_pub_id_pubs_id_fk" FOREIGN KEY ("pub_id") REFERENCES "public"."pubs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bottle_list" ADD CONSTRAINT "bottle_list_beer_id_beers_id_fk" FOREIGN KEY ("beer_id") REFERENCES "public"."beers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brewery_requests" ADD CONSTRAINT "brewery_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brewery_requests" ADD CONSTRAINT "brewery_requests_existing_brewery_id_breweries_id_fk" FOREIGN KEY ("existing_brewery_id") REFERENCES "public"."breweries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brewery_requests" ADD CONSTRAINT "brewery_requests_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_categories" ADD CONSTRAINT "menu_categories_pub_id_pubs_id_fk" FOREIGN KEY ("pub_id") REFERENCES "public"."pubs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_category_id_menu_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."menu_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_pub_id_pubs_id_fk" FOREIGN KEY ("pub_id") REFERENCES "public"."pubs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_beer_id_beers_id_fk" FOREIGN KEY ("beer_id") REFERENCES "public"."beers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_accounts" ADD CONSTRAINT "oauth_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pub_sizes" ADD CONSTRAINT "pub_sizes_pub_id_pubs_id_fk" FOREIGN KEY ("pub_id") REFERENCES "public"."pubs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publican_requests" ADD CONSTRAINT "publican_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publican_requests" ADD CONSTRAINT "publican_requests_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pubs" ADD CONSTRAINT "pubs_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_pub_id_pubs_id_fk" FOREIGN KEY ("pub_id") REFERENCES "public"."pubs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tap_list" ADD CONSTRAINT "tap_list_pub_id_pubs_id_fk" FOREIGN KEY ("pub_id") REFERENCES "public"."pubs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tap_list" ADD CONSTRAINT "tap_list_beer_id_beers_id_fk" FOREIGN KEY ("beer_id") REFERENCES "public"."beers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_activities" ADD CONSTRAINT "user_activities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_beer_tastings" ADD CONSTRAINT "user_beer_tastings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_beer_tastings" ADD CONSTRAINT "user_beer_tastings_beer_id_beers_id_fk" FOREIGN KEY ("beer_id") REFERENCES "public"."beers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_beer_tastings" ADD CONSTRAINT "user_beer_tastings_pub_id_pubs_id_fk" FOREIGN KEY ("pub_id") REFERENCES "public"."pubs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_brewery_id_breweries_id_fk" FOREIGN KEY ("brewery_id") REFERENCES "public"."breweries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");