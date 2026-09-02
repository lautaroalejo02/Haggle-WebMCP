import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import type { Database } from "@/db/client";
import { buyerMandates, mandateBlocks, negotiations, type DealTermsSnapshot } from "@/db/schema";
import {
  MANDATE_FEATURE_ENABLED,
  pickupWindowFromLabel,
  validateMandate,
  type BuyerMandate,
  type MandateProposal,
  type PickupWindow,
} from "@/lib/negotiation/mandate";
import type { DealTerms } from "@/lib/negotiation/state-machine";
import { usdToCents } from "@/lib/marketplace/contracts";
import { ApiError } from "@/lib/server/api";
import {
  getBudgetCents,
  type PrivateListingBundle,
} from "@/lib/server/marketplace-data";

const timeSchema = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, "Use 24-hour HH:MM time.");

export const mandateCommandSchema = z
  .object({
    maxPrice: z.number().finite().positive().max(100_000),
    pickupWindows: z
      .array(
        z
          .object({
            day: z.string().trim().min(1).max(20),
            from: timeSchema,
            to: timeSchema,
          })
          .strict()
          .refine((window) => window.from < window.to, "Pickup window must end after it starts."),
      )
      .max(14),
    placePolicy: z.enum(["public_only", "any"]).default("public_only"),
    mustInclude: z.array(z.string().trim().min(1).max(80)).max(10),
  })
  .strict()
  .superRefine((value, context) => {
    if (usdToCents(value.maxPrice) === null) {
      context.addIssue({
        code: "custom",
        path: ["maxPrice"],
        message: "Use a positive USD amount with no more than two decimal places.",
      });
    }
  });

export type MandateCommand = z.infer<typeof mandateCommandSchema>;
type ListingBundle = NonNullable<PrivateListingBundle>;

export function requireMandateFeature() {
  if (!MANDATE_FEATURE_ENABLED) {
    throw new ApiError(404, "FEATURE_DISABLED", "Buyer mandates are not enabled for this deployment.");
  }
}

export async function getBuyerMandate(
  db: Database,
  buyerSessionId: string,
  listing: ListingBundle,
) {
  const [stored] = await db
    .select()
    .from(buyerMandates)
    .where(and(eq(buyerMandates.buyerSessionId, buyerSessionId), eq(buyerMandates.listingId, listing.id)))
    .limit(1);
  const mandate = stored
    ? fromRecord(stored)
    : await defaultBuyerMandate(db, buyerSessionId, listing);
  return { id: stored?.id ?? null, persisted: Boolean(stored), mandate };
}

export async function setBuyerMandate(
  db: Database,
  buyerSessionId: string,
  listing: ListingBundle,
  command: MandateCommand,
) {
  requireMandateFeature();
  const maxPriceCents = usdToCents(command.maxPrice)!;
  const offeredAccessories = new Set(listing.accessories.map((item) => normalize(item.name)));
  const unavailable = command.mustInclude.filter((item) => !offeredAccessories.has(normalize(item)));
  if (unavailable.length) {
    throw new ApiError(
      422,
      "MANDATE_ITEM_UNAVAILABLE",
      `This listing does not offer: ${unavailable.join(", ")}.`,
      ["get_listing", "set_mandate"],
    );
  }
  const [activeNegotiation] = await db
    .select({ id: negotiations.id })
    .from(negotiations)
    .where(
      and(
        eq(negotiations.buyerSessionId, buyerSessionId),
        eq(negotiations.listingId, listing.id),
      ),
    )
    .orderBy(desc(negotiations.updatedAt))
    .limit(1);

  const [record] = await db
    .insert(buyerMandates)
    .values({
      buyerSessionId,
      listingId: listing.id,
      negotiationId: activeNegotiation?.id ?? null,
      maxPriceCents,
      pickupWindows: command.pickupWindows,
      placePolicy: command.placePolicy,
      mustInclude: dedupe(command.mustInclude),
    })
    .onConflictDoUpdate({
      target: [buyerMandates.buyerSessionId, buyerMandates.listingId],
      set: {
        negotiationId: activeNegotiation?.id ?? null,
        maxPriceCents,
        pickupWindows: command.pickupWindows,
        placePolicy: command.placePolicy,
        mustInclude: dedupe(command.mustInclude),
        updatedAt: new Date(),
      },
    })
    .returning();
  return fromRecord(record);
}

export async function ensureBuyerMandate(
  db: Database,
  buyerSessionId: string,
  listing: ListingBundle,
) {
  const current = await getBuyerMandate(db, buyerSessionId, listing);
  if (current.id) return { id: current.id, mandate: current.mandate };
  const defaultMandate = current.mandate;
  const [record] = await db
    .insert(buyerMandates)
    .values({
      buyerSessionId,
      listingId: listing.id,
      maxPriceCents: defaultMandate.maxPriceCents,
      pickupWindows: defaultMandate.pickupWindows,
      placePolicy: defaultMandate.placePolicy,
      mustInclude: defaultMandate.mustInclude,
    })
    .onConflictDoNothing({ target: [buyerMandates.buyerSessionId, buyerMandates.listingId] })
    .returning();
  if (record) return { id: record.id, mandate: fromRecord(record) };
  const refreshed = await getBuyerMandate(db, buyerSessionId, listing);
  if (!refreshed.id) throw new ApiError(500, "MANDATE_STORE_FAILED", "Haggle could not prepare your mandate.");
  return { id: refreshed.id, mandate: refreshed.mandate };
}

export async function linkMandateToNegotiation(
  db: Database,
  buyerSessionId: string,
  listingId: string,
  negotiationId: string,
) {
  if (!MANDATE_FEATURE_ENABLED) return;
  await db
    .update(buyerMandates)
    .set({ negotiationId, updatedAt: new Date() })
    .where(and(eq(buyerMandates.buyerSessionId, buyerSessionId), eq(buyerMandates.listingId, listingId)));
}

export async function enforceBuyerMandate(input: {
  db: Database;
  buyerSessionId: string;
  listing: ListingBundle;
  terms: DealTerms;
  negotiationId?: string;
  nextAction: string;
}) {
  if (!MANDATE_FEATURE_ENABLED) return;
  const { id: mandateId, mandate } = await ensureBuyerMandate(input.db, input.buyerSessionId, input.listing);
  const proposal = proposalForMandate(input.listing, input.terms);
  const result = validateMandate(mandate, proposal);
  if (result.ok) return;

  const message = blockMessage(result.detail, mandate, proposal);
  await input.db.insert(mandateBlocks).values({
    mandateId,
    negotiationId: input.negotiationId ?? null,
    reason: result.reason,
    detail: result.detail,
    message,
    termsSnapshot: input.terms satisfies DealTermsSnapshot,
  });
  throw new ApiError(
    422,
    "BLOCKED_BY_MANDATE",
    message,
    ["get_mandate", "set_mandate", input.nextAction],
    { reason: result.reason, detail: result.detail },
  );
}

export async function recentMandateBlocks(db: Database, mandateId: string, limit = 8) {
  return db
    .select()
    .from(mandateBlocks)
    .where(eq(mandateBlocks.mandateId, mandateId))
    .orderBy(desc(mandateBlocks.createdAt))
    .limit(limit);
}

export function publicMandate(mandate: BuyerMandate) {
  return {
    maxPrice: mandate.maxPriceCents / 100,
    maxPriceCents: mandate.maxPriceCents,
    pickupWindows: mandate.pickupWindows,
    placePolicy: mandate.placePolicy,
    mustInclude: mandate.mustInclude,
  };
}

async function defaultBuyerMandate(db: Database, buyerSessionId: string, listing: ListingBundle): Promise<BuyerMandate> {
  const budgetCents = await getBudgetCents(db, buyerSessionId);
  return {
    maxPriceCents: budgetCents ?? listing.askingPriceCents,
    pickupWindows: listing.timeWindows
      .map((window) => pickupWindowFromLabel(window.label))
      .filter((window): window is PickupWindow => window !== null),
    placePolicy: "public_only",
    mustInclude: [],
  };
}

function fromRecord(record: typeof buyerMandates.$inferSelect): BuyerMandate {
  return {
    maxPriceCents: record.maxPriceCents,
    pickupWindows: record.pickupWindows,
    placePolicy: record.placePolicy,
    mustInclude: record.mustInclude,
  };
}

function proposalForMandate(listing: ListingBundle, terms: DealTerms): MandateProposal {
  const timeLabel = listing.timeWindows.find((window) => window.id === terms.timeWindowId)?.label ?? "";
  const place =
    terms.fulfillment === "pickup"
      ? listing.meetingPlaces.find((item) => item.id === terms.meetingPlaceId)
      : listing.deliveryZones.find((item) => item.id === terms.deliveryZoneId);
  const accessory = listing.accessories.find((item) => item.id === terms.includedAccessoryId);
  return {
    totalCents: terms.itemPriceCents + terms.deliveryFeeCents,
    fulfillment: terms.fulfillment,
    pickupWindow: terms.fulfillment === "pickup" ? pickupWindowFromLabel(timeLabel) : null,
    placeName: place?.name ?? "Unknown place",
    placeIsPublic: Boolean(place),
    includedItems: accessory ? [accessory.name] : [],
  };
}

function blockMessage(
  detail: Exclude<ReturnType<typeof validateMandate>, { ok: true }>["detail"],
  mandate: BuyerMandate,
  proposal: MandateProposal,
) {
  if (detail.term === "price") {
    return `Blocked by your mandate, not by your agent — $${(proposal.totalCents / 100).toFixed(0)} exceeds your $${(mandate.maxPriceCents / 100).toFixed(0)} max.`;
  }
  if (detail.term === "pickup_window") {
    return "Blocked by your mandate, not by your agent — that pickup time is outside your windows.";
  }
  if (detail.term === "place") {
    return "Blocked by your mandate, not by your agent — that handoff place is not public.";
  }
  return `Blocked by your mandate, not by your agent — the deal does not include ${mandate.mustInclude.join(", ")}.`;
}

function dedupe(values: string[]) {
  return [...new Map(values.map((value) => [normalize(value), value.trim()])).values()];
}

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("en-US");
}
