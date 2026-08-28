CREATE TYPE "public"."event_actor" AS ENUM('buyer_agent', 'seller_agent', 'buyer_human', 'seller_human', 'system');--> statement-breakpoint
CREATE TYPE "public"."event_type" AS ENUM('offer', 'counter', 'accept_pending', 'reject', 'approve', 'deal_closed', 'expired', 'rejected_out_of_bounds', 'tool_registered', 'tool_unregistered');--> statement-breakpoint
CREATE TYPE "public"."fulfillment_type" AS ENUM('pickup', 'delivery');--> statement-breakpoint
CREATE TYPE "public"."listing_status" AS ENUM('active', 'sold');--> statement-breakpoint
CREATE TYPE "public"."negotiation_status" AS ENUM('seller_turn', 'buyer_turn', 'agreed_pending_approval', 'closed_deal', 'rejected', 'expired');--> statement-breakpoint
CREATE TYPE "public"."proposal_side" AS ENUM('buyer', 'seller');--> statement-breakpoint
CREATE TABLE "accessories" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "availability_windows" (
	"id" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"sort_order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "buyer_sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"max_total_cents" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "delivery_zones" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"negotiation_id" uuid NOT NULL,
	"proposal_id" uuid,
	"actor" "event_actor" NOT NULL,
	"type" "event_type" NOT NULL,
	"amount_cents" integer,
	"message" text,
	"tool_name" text,
	"terms_snapshot" jsonb,
	"metadata" jsonb,
	"dedupe_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listing_accessories" (
	"listing_id" uuid NOT NULL,
	"accessory_id" text NOT NULL,
	CONSTRAINT "listing_accessories_listing_id_accessory_id_pk" PRIMARY KEY("listing_id","accessory_id")
);
--> statement-breakpoint
CREATE TABLE "listing_availability_windows" (
	"listing_id" uuid NOT NULL,
	"availability_window_id" text NOT NULL,
	CONSTRAINT "listing_availability_windows_listing_id_availability_window_id_pk" PRIMARY KEY("listing_id","availability_window_id")
);
--> statement-breakpoint
CREATE TABLE "listing_delivery_zones" (
	"listing_id" uuid NOT NULL,
	"delivery_zone_id" text NOT NULL,
	CONSTRAINT "listing_delivery_zones_listing_id_delivery_zone_id_pk" PRIMARY KEY("listing_id","delivery_zone_id")
);
--> statement-breakpoint
CREATE TABLE "listing_meeting_places" (
	"listing_id" uuid NOT NULL,
	"meeting_place_id" text NOT NULL,
	CONSTRAINT "listing_meeting_places_listing_id_meeting_place_id_pk" PRIMARY KEY("listing_id","meeting_place_id")
);
--> statement-breakpoint
CREATE TABLE "listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seller_persona_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"condition" text NOT NULL,
	"neighborhood" text NOT NULL,
	"photo_url" text NOT NULL,
	"asking_price_cents" integer NOT NULL,
	"floor_price_cents" integer NOT NULL,
	"status" "listing_status" DEFAULT 'active' NOT NULL,
	"allows_pickup" boolean DEFAULT true NOT NULL,
	"allows_delivery" boolean DEFAULT false NOT NULL,
	"delivery_fee_cents" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "listings_asking_positive" CHECK ("listings"."asking_price_cents" > 0),
	CONSTRAINT "listings_floor_positive" CHECK ("listings"."floor_price_cents" > 0),
	CONSTRAINT "listings_floor_not_above_asking" CHECK ("listings"."floor_price_cents" <= "listings"."asking_price_cents"),
	CONSTRAINT "listings_delivery_fee_nonnegative" CHECK ("listings"."delivery_fee_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "negotiation_commands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"buyer_session_id" uuid NOT NULL,
	"idempotency_key" text NOT NULL,
	"command" text NOT NULL,
	"request_hash" text NOT NULL,
	"response" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "negotiations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"buyer_session_id" uuid NOT NULL,
	"status" "negotiation_status" DEFAULT 'seller_turn' NOT NULL,
	"round" integer DEFAULT 1 NOT NULL,
	"max_rounds" integer DEFAULT 4 NOT NULL,
	"current_proposal_id" uuid,
	"agreement_proposal_id" uuid,
	"buyer_approved_at" timestamp with time zone,
	"seller_approved_at" timestamp with time zone,
	"terminal_reason" text,
	"version" integer DEFAULT 1 NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "negotiations_round_positive" CHECK ("negotiations"."round" > 0),
	CONSTRAINT "negotiations_max_rounds_positive" CHECK ("negotiations"."max_rounds" > 0),
	CONSTRAINT "negotiations_round_within_max" CHECK ("negotiations"."round" <= "negotiations"."max_rounds")
);
--> statement-breakpoint
CREATE TABLE "proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"negotiation_id" uuid NOT NULL,
	"sequence" integer NOT NULL,
	"side" "proposal_side" NOT NULL,
	"item_price_cents" integer NOT NULL,
	"fulfillment" "fulfillment_type" NOT NULL,
	"meeting_place_id" text,
	"delivery_zone_id" text,
	"time_window_id" text NOT NULL,
	"delivery_fee_cents" integer DEFAULT 0 NOT NULL,
	"included_accessory_id" text,
	"message" text,
	"responding_to_proposal_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "proposals_price_positive" CHECK ("proposals"."item_price_cents" > 0),
	CONSTRAINT "proposals_delivery_fee_nonnegative" CHECK ("proposals"."delivery_fee_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "safe_meeting_places" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"neighborhood" text NOT NULL,
	"public_directions" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seller_personas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"avatar_emoji" text NOT NULL,
	"style_description" text NOT NULL,
	"policy_prompt" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_negotiation_id_negotiations_id_fk" FOREIGN KEY ("negotiation_id") REFERENCES "public"."negotiations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_proposal_id_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_accessories" ADD CONSTRAINT "listing_accessories_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_accessories" ADD CONSTRAINT "listing_accessories_accessory_id_accessories_id_fk" FOREIGN KEY ("accessory_id") REFERENCES "public"."accessories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_availability_windows" ADD CONSTRAINT "listing_availability_windows_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_availability_windows" ADD CONSTRAINT "listing_availability_windows_availability_window_id_availability_windows_id_fk" FOREIGN KEY ("availability_window_id") REFERENCES "public"."availability_windows"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_delivery_zones" ADD CONSTRAINT "listing_delivery_zones_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_delivery_zones" ADD CONSTRAINT "listing_delivery_zones_delivery_zone_id_delivery_zones_id_fk" FOREIGN KEY ("delivery_zone_id") REFERENCES "public"."delivery_zones"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_meeting_places" ADD CONSTRAINT "listing_meeting_places_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_meeting_places" ADD CONSTRAINT "listing_meeting_places_meeting_place_id_safe_meeting_places_id_fk" FOREIGN KEY ("meeting_place_id") REFERENCES "public"."safe_meeting_places"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_seller_persona_id_seller_personas_id_fk" FOREIGN KEY ("seller_persona_id") REFERENCES "public"."seller_personas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "negotiation_commands" ADD CONSTRAINT "negotiation_commands_buyer_session_id_buyer_sessions_id_fk" FOREIGN KEY ("buyer_session_id") REFERENCES "public"."buyer_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "negotiations" ADD CONSTRAINT "negotiations_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "negotiations" ADD CONSTRAINT "negotiations_buyer_session_id_buyer_sessions_id_fk" FOREIGN KEY ("buyer_session_id") REFERENCES "public"."buyer_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_negotiation_id_negotiations_id_fk" FOREIGN KEY ("negotiation_id") REFERENCES "public"."negotiations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_meeting_place_id_safe_meeting_places_id_fk" FOREIGN KEY ("meeting_place_id") REFERENCES "public"."safe_meeting_places"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_delivery_zone_id_delivery_zones_id_fk" FOREIGN KEY ("delivery_zone_id") REFERENCES "public"."delivery_zones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_time_window_id_availability_windows_id_fk" FOREIGN KEY ("time_window_id") REFERENCES "public"."availability_windows"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_included_accessory_id_accessories_id_fk" FOREIGN KEY ("included_accessory_id") REFERENCES "public"."accessories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "events_created_idx" ON "events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "events_negotiation_idx" ON "events" USING btree ("negotiation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "events_dedupe_key_unique" ON "events" USING btree ("dedupe_key") WHERE "events"."dedupe_key" is not null;--> statement-breakpoint
CREATE INDEX "listings_status_idx" ON "listings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "listings_seller_idx" ON "listings" USING btree ("seller_persona_id");--> statement-breakpoint
CREATE UNIQUE INDEX "negotiation_commands_session_key_unique" ON "negotiation_commands" USING btree ("buyer_session_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "negotiations_buyer_idx" ON "negotiations" USING btree ("buyer_session_id");--> statement-breakpoint
CREATE INDEX "negotiations_listing_idx" ON "negotiations" USING btree ("listing_id");--> statement-breakpoint
CREATE UNIQUE INDEX "negotiations_one_active_per_buyer_listing" ON "negotiations" USING btree ("buyer_session_id","listing_id") WHERE "negotiations"."status" in ('seller_turn', 'buyer_turn', 'agreed_pending_approval');--> statement-breakpoint
CREATE UNIQUE INDEX "proposals_negotiation_sequence_unique" ON "proposals" USING btree ("negotiation_id","sequence");--> statement-breakpoint
CREATE UNIQUE INDEX "proposals_one_response_per_proposal" ON "proposals" USING btree ("responding_to_proposal_id") WHERE "proposals"."responding_to_proposal_id" is not null;