import type { NegotiationStatus } from "@/lib/negotiation/state-machine";

export type PrivateListingRecord = {
  id: string;
  title: string;
  description: string;
  condition: string;
  photoUrl: string;
  askingPriceCents: number;
  floorPriceCents: number;
  status: "active" | "sold";
  seller: {
    id: string;
    name: string;
    avatarEmoji: string;
    styleDescription: string;
    policyPrompt: string;
  };
};

export type PublicListing = {
  id: string;
  title: string;
  description: string;
  condition: string;
  photoUrl: string;
  askingPriceCents: number;
  status: "active" | "sold";
  seller: {
    id: string;
    name: string;
    avatarEmoji: string;
    styleDescription: string;
  };
};

export type ContextualAction = "counter_offer" | "accept_deal" | "reject_deal";

export function toPublicListing(record: PrivateListingRecord): PublicListing {
  return {
    id: record.id,
    title: record.title,
    description: record.description,
    condition: record.condition,
    photoUrl: record.photoUrl,
    askingPriceCents: record.askingPriceCents,
    status: record.status,
    seller: {
      id: record.seller.id,
      name: record.seller.name,
      avatarEmoji: record.seller.avatarEmoji,
      styleDescription: record.seller.styleDescription,
    },
  };
}

export function usdToCents(value: number): number | null {
  if (!Number.isFinite(value) || value <= 0) return null;

  const cents = value * 100;
  if (Math.abs(cents - Math.round(cents)) > Number.EPSILON * 100) return null;

  return Math.round(cents);
}

export function actionsForNegotiation(
  status: NegotiationStatus,
  round: number,
  maxRounds: number,
): ContextualAction[] {
  if (status === "seller_turn") return ["reject_deal"];
  if (status !== "buyer_turn") return [];

  return round < maxRounds
    ? ["counter_offer", "accept_deal", "reject_deal"]
    : ["accept_deal", "reject_deal"];
}
