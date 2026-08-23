CREATE TABLE "bios" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar(64) NOT NULL,
	"bioname" varchar(128) NOT NULL,
	"title" varchar(255),
	"description" text,
	"link_ids" text DEFAULT '[]' NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "click_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"redirect_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(128) DEFAULT '',
	"email" varchar(255) NOT NULL,
	"username" varchar(64),
	"password" text,
	"role" varchar(64) DEFAULT 'Insights Viewer' NOT NULL,
	"status" varchar(32) DEFAULT 'invited' NOT NULL,
	"invite_token" varchar(128),
	"permissions" text DEFAULT '["view_insights"]' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "redirects" ALTER COLUMN "webname" SET DATA TYPE varchar(128);--> statement-breakpoint
ALTER TABLE "redirects" ALTER COLUMN "created_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "redirects" ALTER COLUMN "updated_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "redirects" ADD COLUMN "expired_click_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "redirects" ADD COLUMN "expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "redirects" ADD COLUMN "parent_id" integer;--> statement-breakpoint
ALTER TABLE "redirects" ADD COLUMN "show_on_profile" boolean DEFAULT true NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "username_bioname_idx" ON "bios" USING btree ("username","bioname");--> statement-breakpoint
CREATE INDEX "click_redirect_id_idx" ON "click_events" USING btree ("redirect_id");--> statement-breakpoint
CREATE INDEX "click_created_at_idx" ON "click_events" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "employee_email_idx" ON "employees" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "employee_invite_token_idx" ON "employees" USING btree ("invite_token");