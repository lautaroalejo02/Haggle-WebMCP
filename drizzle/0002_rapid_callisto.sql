CREATE TYPE "public"."mandate_place_policy" AS ENUM('public_only', 'any');--> statement-breakpoint
CREATE TABLE "buyer_mandates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"buyer_session_id" uuid NOT NULL,
	"listing_id" uuid NOT NULL,
	"negotiation_id" uuid,
	"max_price_cents" integer NOT NULL,
	"pickup_windows" jsonb NOT NULL,
	"place_policy" "mandate_place_policy" DEFAULT 'public_only' NOT NULL,
	"must_include" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "buyer_mandates_max_price_positive" CHECK ("buyer_mandates"."max_price_cents" > 0)
);
--> statement-breakpoint
CREATE TABLE "mandate_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mandate_id" uuid NOT NULL,
	"negotiation_id" uuid,
	"reason" text NOT NULL,
	"detail" jsonb NOT NULL,
	"message" text NOT NULL,
	"terms_snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "buyer_mandates" ADD CONSTRAINT "buyer_mandates_buyer_session_id_buyer_sessions_id_fk" FOREIGN KEY ("buyer_session_id") REFERENCES "public"."buyer_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buyer_mandates" ADD CONSTRAINT "buyer_mandates_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buyer_mandates" ADD CONSTRAINT "buyer_mandates_negotiation_id_negotiations_id_fk" FOREIGN KEY ("negotiation_id") REFERENCES "public"."negotiations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mandate_blocks" ADD CONSTRAINT "mandate_blocks_mandate_id_buyer_mandates_id_fk" FOREIGN KEY ("mandate_id") REFERENCES "public"."buyer_mandates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mandate_blocks" ADD CONSTRAINT "mandate_blocks_negotiation_id_negotiations_id_fk" FOREIGN KEY ("negotiation_id") REFERENCES "public"."negotiations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "buyer_mandates_session_listing_unique" ON "buyer_mandates" USING btree ("buyer_session_id","listing_id");--> statement-breakpoint
CREATE INDEX "buyer_mandates_negotiation_idx" ON "buyer_mandates" USING btree ("negotiation_id");--> statement-breakpoint
CREATE INDEX "mandate_blocks_mandate_idx" ON "mandate_blocks" USING btree ("mandate_id");--> statement-breakpoint
CREATE INDEX "mandate_blocks_negotiation_idx" ON "mandate_blocks" USING btree ("negotiation_id");