import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const listingStatusEnum = pgEnum("listing_status", ["active", "sold"]);
export const negotiationStatusEnum = pgEnum("negotiation_status", [
  "seller_turn",
  "buyer_turn",
  "agreed_pending_approval",
  "closed_deal",
  "rejected",
  "expired",
]);
export const proposalSideEnum = pgEnum("proposal_side", ["buyer", "seller"]);
export const fulfillmentEnum = pgEnum("fulfillment_type", ["pickup", "delivery"]);
export const eventActorEnum = pgEnum("event_actor", [
  "buyer_agent",
  "seller_agent",
  "buyer_human",
  "seller_human",
  "system",
]);
export const eventTypeEnum = pgEnum("event_type", [
  "offer",
  "counter",
  "accept_pending",
  "reject",
  "approve",
  "deal_closed",
  "expired",
  "rejected_out_of_bounds",
  "human_declined",
  "tool_registered",
  "tool_unregistered",
]);

export const sellerPersonas = pgTable("seller_personas", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  avatarEmoji: text("avatar_emoji").notNull(),
  styleDescription: text("style_description").notNull(),
  policyPrompt: text("policy_prompt").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const safeMeetingPlaces = pgTable("safe_meeting_places", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  neighborhood: text("neighborhood").notNull(),
  publicDirections: text("public_directions").notNull(),
});

export const deliveryZones = pgTable("delivery_zones", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
});

export const availabilityWindows = pgTable("availability_windows", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  sortOrder: integer("sort_order").notNull(),
});

export const accessories = pgTable("accessories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
});

export const listings = pgTable(
  "listings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sellerPersonaId: uuid("seller_persona_id")
      .notNull()
      .references(() => sellerPersonas.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    condition: text("condition").notNull(),
    neighborhood: text("neighborhood").notNull(),
    photoUrl: text("photo_url").notNull(),
    askingPriceCents: integer("asking_price_cents").notNull(),
    floorPriceCents: integer("floor_price_cents").notNull(),
    status: listingStatusEnum("status").default("active").notNull(),
    allowsPickup: boolean("allows_pickup").default(true).notNull(),
    allowsDelivery: boolean("allows_delivery").default(false).notNull(),
    deliveryFeeCents: integer("delivery_fee_cents").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("listings_status_idx").on(table.status),
    index("listings_seller_idx").on(table.sellerPersonaId),
    check("listings_asking_positive", sql`${table.askingPriceCents} > 0`),
    check("listings_floor_positive", sql`${table.floorPriceCents} > 0`),
    check("listings_floor_not_above_asking", sql`${table.floorPriceCents} <= ${table.askingPriceCents}`),
    check("listings_delivery_fee_nonnegative", sql`${table.deliveryFeeCents} >= 0`),
  ],
);

export const listingMeetingPlaces = pgTable(
  "listing_meeting_places",
  {
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    meetingPlaceId: text("meeting_place_id")
      .notNull()
      .references(() => safeMeetingPlaces.id, { onDelete: "restrict" }),
  },
  (table) => [primaryKey({ columns: [table.listingId, table.meetingPlaceId] })],
);

export const listingDeliveryZones = pgTable(
  "listing_delivery_zones",
  {
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    deliveryZoneId: text("delivery_zone_id")
      .notNull()
      .references(() => deliveryZones.id, { onDelete: "restrict" }),
  },
  (table) => [primaryKey({ columns: [table.listingId, table.deliveryZoneId] })],
);

export const listingAvailabilityWindows = pgTable(
  "listing_availability_windows",
  {
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    availabilityWindowId: text("availability_window_id")
      .notNull()
      .references(() => availabilityWindows.id, { onDelete: "restrict" }),
  },
  (table) => [primaryKey({ columns: [table.listingId, table.availabilityWindowId] })],
);

export const listingAccessories = pgTable(
  "listing_accessories",
  {
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    accessoryId: text("accessory_id")
      .notNull()
      .references(() => accessories.id, { onDelete: "restrict" }),
  },
  (table) => [primaryKey({ columns: [table.listingId, table.accessoryId] })],
);

export const buyerSessions = pgTable("buyer_sessions", {
  id: uuid("id").primaryKey(),
  maxTotalCents: integer("max_total_cents"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const negotiations = pgTable(
  "negotiations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "restrict" }),
    buyerSessionId: uuid("buyer_session_id")
      .notNull()
      .references(() => buyerSessions.id, { onDelete: "cascade" }),
    status: negotiationStatusEnum("status").default("seller_turn").notNull(),
    round: integer("round").default(1).notNull(),
    maxRounds: integer("max_rounds").default(4).notNull(),
    currentProposalId: uuid("current_proposal_id"),
    agreementProposalId: uuid("agreement_proposal_id"),
    buyerApprovedAt: timestamp("buyer_approved_at", { withTimezone: true }),
    sellerApprovedAt: timestamp("seller_approved_at", { withTimezone: true }),
    terminalReason: text("terminal_reason"),
    version: integer("version").default(1).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("negotiations_buyer_idx").on(table.buyerSessionId),
    index("negotiations_listing_idx").on(table.listingId),
    uniqueIndex("negotiations_one_active_per_buyer_listing")
      .on(table.buyerSessionId, table.listingId)
      .where(
        sql`${table.status} in ('seller_turn', 'buyer_turn', 'agreed_pending_approval')`,
      ),
    check("negotiations_round_positive", sql`${table.round} > 0`),
    check("negotiations_max_rounds_positive", sql`${table.maxRounds} > 0`),
    check("negotiations_round_within_max", sql`${table.round} <= ${table.maxRounds}`),
  ],
);

export const proposals = pgTable(
  "proposals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    negotiationId: uuid("negotiation_id")
      .notNull()
      .references(() => negotiations.id, { onDelete: "cascade" }),
    sequence: integer("sequence").notNull(),
    side: proposalSideEnum("side").notNull(),
    itemPriceCents: integer("item_price_cents").notNull(),
    fulfillment: fulfillmentEnum("fulfillment").notNull(),
    meetingPlaceId: text("meeting_place_id").references(() => safeMeetingPlaces.id),
    deliveryZoneId: text("delivery_zone_id").references(() => deliveryZones.id),
    timeWindowId: text("time_window_id")
      .notNull()
      .references(() => availabilityWindows.id),
    deliveryFeeCents: integer("delivery_fee_cents").default(0).notNull(),
    includedAccessoryId: text("included_accessory_id").references(() => accessories.id),
    message: text("message"),
    respondingToProposalId: uuid("responding_to_proposal_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("proposals_negotiation_sequence_unique").on(
      table.negotiationId,
      table.sequence,
    ),
    uniqueIndex("proposals_one_response_per_proposal")
      .on(table.respondingToProposalId)
      .where(sql`${table.respondingToProposalId} is not null`),
    check("proposals_price_positive", sql`${table.itemPriceCents} > 0`),
    check("proposals_delivery_fee_nonnegative", sql`${table.deliveryFeeCents} >= 0`),
  ],
);

export type DealTermsSnapshot = {
  itemPriceCents: number;
  fulfillment: "pickup" | "delivery";
  meetingPlaceId: string | null;
  deliveryZoneId: string | null;
  timeWindowId: string;
  deliveryFeeCents: number;
  includedAccessoryId: string | null;
};

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    negotiationId: uuid("negotiation_id")
      .notNull()
      .references(() => negotiations.id, { onDelete: "cascade" }),
    proposalId: uuid("proposal_id").references(() => proposals.id, { onDelete: "set null" }),
    actor: eventActorEnum("actor").notNull(),
    type: eventTypeEnum("type").notNull(),
    amountCents: integer("amount_cents"),
    message: text("message"),
    toolName: text("tool_name"),
    termsSnapshot: jsonb("terms_snapshot").$type<DealTermsSnapshot>(),
    metadata: jsonb("metadata").$type<Record<string, string | number | boolean | null>>(),
    dedupeKey: text("dedupe_key"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("events_created_idx").on(table.createdAt),
    index("events_negotiation_idx").on(table.negotiationId),
    uniqueIndex("events_dedupe_key_unique")
      .on(table.dedupeKey)
      .where(sql`${table.dedupeKey} is not null`),
  ],
);

export const negotiationCommands = pgTable(
  "negotiation_commands",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    buyerSessionId: uuid("buyer_session_id")
      .notNull()
      .references(() => buyerSessions.id, { onDelete: "cascade" }),
    idempotencyKey: text("idempotency_key").notNull(),
    command: text("command").notNull(),
    requestHash: text("request_hash").notNull(),
    response: jsonb("response").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("negotiation_commands_session_key_unique").on(
      table.buyerSessionId,
      table.idempotencyKey,
    ),
  ],
);

export type SellerPersona = typeof sellerPersonas.$inferSelect;
export type Listing = typeof listings.$inferSelect;
export type Negotiation = typeof negotiations.$inferSelect;
export type ProposalRecord = typeof proposals.$inferSelect;
export type EventRecord = typeof events.$inferSelect;
