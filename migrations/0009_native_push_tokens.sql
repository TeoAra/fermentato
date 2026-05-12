CREATE TABLE IF NOT EXISTS "native_push_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"token" text NOT NULL,
	"platform" varchar(10) NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "native_push_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "native_push_tokens" ADD CONSTRAINT "native_push_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "native_push_tokens_user_idx" ON "native_push_tokens" USING btree ("user_id");
