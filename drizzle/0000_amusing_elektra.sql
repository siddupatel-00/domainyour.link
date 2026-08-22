CREATE TABLE "redirects" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar(64) NOT NULL,
	"webname" varchar(64) NOT NULL,
	"destination_url" text NOT NULL,
	"redirect_code" integer DEFAULT 307 NOT NULL,
	"click_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "username_webname_idx" ON "redirects" USING btree ("username","webname");