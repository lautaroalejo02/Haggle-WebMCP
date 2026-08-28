import { and, desc, eq, ilike, inArray, lte, or, type SQL } from "drizzle-orm";
import type { Database } from "@/db/client";
import {
  accessories,
  availabilityWindows,
  buyerSessions,
  deliveryZones,
  events,
  listingAccessories,
  listingAvailabilityWindows,
  listingDeliveryZones,
  listingMeetingPlaces,
  listings,
  negotiations,
  proposals,
  safeMeetingPlaces,
  sellerPersonas,
  type ProposalRecord,
} from "@/db/schema";
import { actionsForNegotiation } from "@/lib/marketplace/contracts";
import type { DealTerms, DealValidationRules } from "@/lib/negotiation/state-machine";

export type PrivateListingBundle = Awaited<ReturnType<typeof getPrivateListingBundle>>;

export async function getPrivateListingBundle(db: Database, listingId: string) {
  const [record] = await db
    .select({
      id: listings.id,
      sellerPersonaId: listings.sellerPersonaId,
      title: listings.title,
      description: listings.description,
      condition: listings.condition,
      neighborhood: listings.neighborhood,
      photoUrl: listings.photoUrl,
      askingPriceCents: listings.askingPriceCents,
      floorPriceCents: listings.floorPriceCents,
      status: listings.status,
      allowsPickup: listings.allowsPickup,
      allowsDelivery: listings.allowsDelivery,
      deliveryFeeCents: listings.deliveryFeeCents,
      seller: {
        id: sellerPersonas.id,
        name: sellerPersonas.name,
        avatarEmoji: sellerPersonas.avatarEmoji,
        styleDescription: sellerPersonas.styleDescription,
        policyPrompt: sellerPersonas.policyPrompt,
      },
    })
    .from(listings)
    .innerJoin(sellerPersonas, eq(listings.sellerPersonaId, sellerPersonas.id))
    .where(eq(listings.id, listingId))
    .limit(1);

  if (!record) return null;

  const [meetingPlaces, zones, windows, includedAccessories] = await Promise.all([
    db
      .select({
        id: safeMeetingPlaces.id,
        name: safeMeetingPlaces.name,
        neighborhood: safeMeetingPlaces.neighborhood,
        publicDirections: safeMeetingPlaces.publicDirections,
      })
      .from(listingMeetingPlaces)
      .innerJoin(safeMeetingPlaces, eq(listingMeetingPlaces.meetingPlaceId, safeMeetingPlaces.id))
      .where(eq(listingMeetingPlaces.listingId, listingId)),
    db
      .select({ id: deliveryZones.id, name: deliveryZones.name, description: deliveryZones.description })
      .from(listingDeliveryZones)
      .innerJoin(deliveryZones, eq(listingDeliveryZones.deliveryZoneId, deliveryZones.id))
      .where(eq(listingDeliveryZones.listingId, listingId)),
    db
      .select({ id: availabilityWindows.id, label: availabilityWindows.label })
      .from(listingAvailabilityWindows)
      .innerJoin(
        availabilityWindows,
        eq(listingAvailabilityWindows.availabilityWindowId, availabilityWindows.id),
      )
      .where(eq(listingAvailabilityWindows.listingId, listingId))
      .orderBy(availabilityWindows.sortOrder),
    db
      .select({ id: accessories.id, name: accessories.name })
      .from(listingAccessories)
      .innerJoin(accessories, eq(listingAccessories.accessoryId, accessories.id))
      .where(eq(listingAccessories.listingId, listingId)),
  ]);

  return { ...record, meetingPlaces, deliveryZones: zones, timeWindows: windows, accessories: includedAccessories };
}

export function publicListing(bundle: NonNullable<PrivateListingBundle>) {
  return {
    id: bundle.id,
    title: bundle.title,
    description: bundle.description,
    condition: bundle.condition,
    neighborhood: bundle.neighborhood,
    photoUrl: bundle.photoUrl,
    askingPriceCents: bundle.askingPriceCents,
    status: bundle.status,
    allowsPickup: bundle.allowsPickup,
    allowsDelivery: bundle.allowsDelivery,
    deliveryFeeCents: bundle.deliveryFeeCents,
    seller: {
      id: bundle.seller.id,
      name: bundle.seller.name,
      avatarEmoji: bundle.seller.avatarEmoji,
      styleDescription: bundle.seller.styleDescription,
    },
    meetingPlaces: bundle.meetingPlaces,
    deliveryZones: bundle.deliveryZones,
    timeWindows: bundle.timeWindows,
    accessories: bundle.accessories,
  };
}

export function validationRules(
  bundle: NonNullable<PrivateListingBundle>,
  budgetCents?: number | null,
): DealValidationRules {
  return {
    askingPriceCents: bundle.askingPriceCents,
    budgetCents,
    allowedFulfillment: [
      ...(bundle.allowsPickup ? (["pickup"] as const) : []),
      ...(bundle.allowsDelivery ? (["delivery"] as const) : []),
    ],
    allowedMeetingPlaceIds: bundle.meetingPlaces.map((place) => place.id),
    allowedDeliveryZoneIds: bundle.deliveryZones.map((zone) => zone.id),
    allowedTimeWindowIds: bundle.timeWindows.map((window) => window.id),
    allowedAccessoryIds: bundle.accessories.map((accessory) => accessory.id),
  };
}

export async function getBudgetCents(db: Database, buyerSessionId: string) {
  const [session] = await db
    .select({ maxTotalCents: buyerSessions.maxTotalCents })
    .from(buyerSessions)
    .where(eq(buyerSessions.id, buyerSessionId))
    .limit(1);
  return session?.maxTotalCents ?? null;
}

export async function searchListings(
  db: Database,
  filters: { query?: string; maxPriceCents?: number; fulfillment?: "pickup" | "delivery" },
) {
  const conditions: SQL[] = [eq(listings.status, "active")];
  if (filters.query) {
    const query = `%${filters.query}%`;
    conditions.push(or(ilike(listings.title, query), ilike(listings.description, query))!);
  }
  if (filters.maxPriceCents != null) {
    conditions.push(lte(listings.askingPriceCents, filters.maxPriceCents));
  }
  if (filters.fulfillment === "pickup") conditions.push(eq(listings.allowsPickup, true));
  if (filters.fulfillment === "delivery") conditions.push(eq(listings.allowsDelivery, true));

  return db
    .select({
      id: listings.id,
      title: listings.title,
      condition: listings.condition,
      neighborhood: listings.neighborhood,
      photoUrl: listings.photoUrl,
      askingPriceCents: listings.askingPriceCents,
      allowsPickup: listings.allowsPickup,
      allowsDelivery: listings.allowsDelivery,
      deliveryFeeCents: listings.deliveryFeeCents,
      seller: {
        name: sellerPersonas.name,
        avatarEmoji: sellerPersonas.avatarEmoji,
        styleDescription: sellerPersonas.styleDescription,
      },
    })
    .from(listings)
    .innerJoin(sellerPersonas, eq(listings.sellerPersonaId, sellerPersonas.id))
    .where(and(...conditions))
    .orderBy(desc(listings.createdAt))
    .limit(6);
}

function proposalTerms(proposal: ProposalRecord): DealTerms {
  return {
    itemPriceCents: proposal.itemPriceCents,
    fulfillment: proposal.fulfillment,
    meetingPlaceId: proposal.meetingPlaceId,
    deliveryZoneId: proposal.deliveryZoneId,
    timeWindowId: proposal.timeWindowId,
    deliveryFeeCents: proposal.deliveryFeeCents,
    includedAccessoryId: proposal.includedAccessoryId,
  };
}

export async function getNegotiationsForSession(db: Database, buyerSessionId: string) {
  const rows = await db
    .select({
      id: negotiations.id,
      listingId: negotiations.listingId,
      status: negotiations.status,
      round: negotiations.round,
      maxRounds: negotiations.maxRounds,
      currentProposalId: negotiations.currentProposalId,
      agreementProposalId: negotiations.agreementProposalId,
      buyerApprovedAt: negotiations.buyerApprovedAt,
      sellerApprovedAt: negotiations.sellerApprovedAt,
      terminalReason: negotiations.terminalReason,
      createdAt: negotiations.createdAt,
      updatedAt: negotiations.updatedAt,
      listing: {
        title: listings.title,
        photoUrl: listings.photoUrl,
        askingPriceCents: listings.askingPriceCents,
        status: listings.status,
      },
      seller: {
        id: sellerPersonas.id,
        name: sellerPersonas.name,
        avatarEmoji: sellerPersonas.avatarEmoji,
      },
    })
    .from(negotiations)
    .innerJoin(listings, eq(negotiations.listingId, listings.id))
    .innerJoin(sellerPersonas, eq(listings.sellerPersonaId, sellerPersonas.id))
    .where(eq(negotiations.buyerSessionId, buyerSessionId))
    .orderBy(desc(negotiations.updatedAt));

  if (rows.length === 0) return [];
  const proposalRows = await db
    .select()
    .from(proposals)
    .where(inArray(proposals.negotiationId, rows.map((row) => row.id)))
    .orderBy(proposals.sequence);
  const byNegotiation = new Map<string, ProposalRecord[]>();
  for (const proposal of proposalRows) {
    const group = byNegotiation.get(proposal.negotiationId) ?? [];
    group.push(proposal);
    byNegotiation.set(proposal.negotiationId, group);
  }

  return rows.map((row) => {
    const history = (byNegotiation.get(row.id) ?? []).map((proposal) => ({
      id: proposal.id,
      sequence: proposal.sequence,
      side: proposal.side,
      terms: proposalTerms(proposal),
      totalCents: proposal.itemPriceCents + proposal.deliveryFeeCents,
      message: proposal.message,
      createdAt: proposal.createdAt,
    }));
    return {
      ...row,
      buyerApproved: row.buyerApprovedAt !== null,
      sellerApproved: row.sellerApprovedAt !== null,
      currentProposal: history.find((proposal) => proposal.id === row.currentProposalId) ?? null,
      agreementProposal: history.find((proposal) => proposal.id === row.agreementProposalId) ?? null,
      history,
      possibleActions: actionsForNegotiation(row.status, row.round, row.maxRounds),
    };
  });
}

export async function getRecentPublicEvents(db: Database, limit: number) {
  const rows = await db
    .select({
      id: events.id,
      actor: events.actor,
      type: events.type,
      amountCents: events.amountCents,
      createdAt: events.createdAt,
      listingTitle: listings.title,
      seller: { name: sellerPersonas.name, avatarEmoji: sellerPersonas.avatarEmoji },
    })
    .from(events)
    .innerJoin(negotiations, eq(events.negotiationId, negotiations.id))
    .innerJoin(listings, eq(negotiations.listingId, listings.id))
    .innerJoin(sellerPersonas, eq(listings.sellerPersonaId, sellerPersonas.id))
    .orderBy(desc(events.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    text: publicEventText(row),
    createdAt: row.createdAt,
  }));
}

function publicEventText(event: {
  actor: string;
  type: string;
  amountCents: number | null;
  listingTitle: string;
  seller: { name: string; avatarEmoji: string };
}) {
  const amount = event.amountCents == null ? "" : ` at $${(event.amountCents / 100).toFixed(2)}`;
  const subject = event.actor === "seller_agent" ? `${event.seller.avatarEmoji} ${event.seller.name}` : "A buyer agent";
  const actions: Record<string, string> = {
    offer: `opened terms${amount}`,
    counter: `countered${amount}`,
    accept_pending: `found acceptable terms${amount}`,
    buyer_approved: "received buyer approval",
    seller_approved: "received seller approval",
    closed: `closed a human-approved deal${amount}`,
    reject: "ended a negotiation",
    expired: "closed an expired negotiation",
    rejected_out_of_bounds: "corrected a proposal at a private guardrail",
  };
  return `${subject} ${actions[event.type] ?? "updated a negotiation"} for ${event.listingTitle}`;
}
