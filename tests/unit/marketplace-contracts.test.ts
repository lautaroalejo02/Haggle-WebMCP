import { describe, expect, it } from "vitest";
import {
  actionsForNegotiation,
  toPublicListing,
  usdToCents,
} from "@/lib/marketplace/contracts";

describe("public marketplace contracts", () => {
  it("never serializes the seller floor or private policy", () => {
    const result = toPublicListing({
      id: "listing-1",
      title: "Moss Green Trek FX 2",
      description: "A tidy city bike.",
      condition: "Excellent",
      photoUrl: "https://picsum.photos/seed/trek/1200/900",
      askingPriceCents: 22_000,
      floorPriceCents: 17_500,
      status: "active",
      seller: {
        id: "seller-1",
        name: "Haggler Hank",
        avatarEmoji: "🤝",
        styleDescription: "Friendly, but always counters once.",
        policyPrompt: "PRIVATE: never accept under 17500 cents.",
      },
    });

    expect(result).toMatchObject({
      id: "listing-1",
      askingPriceCents: 22_000,
      seller: { name: "Haggler Hank" },
    });
    expect(JSON.stringify(result)).not.toContain("floorPrice");
    expect(JSON.stringify(result)).not.toContain("policyPrompt");
    expect(JSON.stringify(result)).not.toContain("17500");
  });

  it("converts two-decimal USD tool inputs to integer cents", () => {
    expect(usdToCents(185)).toBe(18_500);
    expect(usdToCents(185.25)).toBe(18_525);
    expect(usdToCents(0)).toBeNull();
    expect(usdToCents(12.345)).toBeNull();
    expect(usdToCents(Number.NaN)).toBeNull();
  });
});

describe("server-derived contextual actions", () => {
  it("offers counter, accept, and reject on a buyer turn", () => {
    expect(actionsForNegotiation("buyer_turn", 2, 4)).toEqual([
      "counter_offer",
      "accept_deal",
      "reject_deal",
    ]);
  });

  it("removes counter at the round limit but still allows accept or reject", () => {
    expect(actionsForNegotiation("buyer_turn", 4, 4)).toEqual([
      "accept_deal",
      "reject_deal",
    ]);
  });

  it("exposes only rejection while the seller is considering", () => {
    expect(actionsForNegotiation("seller_turn", 1, 4)).toEqual(["reject_deal"]);
  });

  it("exposes no bargaining action after agreement or termination", () => {
    expect(actionsForNegotiation("agreed_pending_approval", 1, 4)).toEqual([]);
    expect(actionsForNegotiation("closed_deal", 1, 4)).toEqual([]);
    expect(actionsForNegotiation("rejected", 1, 4)).toEqual([]);
    expect(actionsForNegotiation("expired", 1, 4)).toEqual([]);
  });
});
