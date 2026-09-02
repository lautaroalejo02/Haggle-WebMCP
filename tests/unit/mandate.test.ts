import { describe, expect, it } from "vitest";
import { validateMandate, type BuyerMandate } from "@/lib/negotiation/mandate";

const mandate: BuyerMandate = {
  maxPriceCents: 19_000,
  pickupWindows: [{ day: "Saturday", from: "14:00", to: "16:00" }],
  placePolicy: "public_only",
  mustInclude: ["U-lock"],
};

const proposal = {
  totalCents: 18_500,
  fulfillment: "pickup" as const,
  pickupWindow: { day: "Saturday", from: "14:00", to: "16:00" },
  placeName: "Riverside Library",
  placeIsPublic: true,
  includedItems: ["U-lock"],
};

describe("buyer mandate validator", () => {
  it("blocks a price over the maximum", () => {
    expect(validateMandate(mandate, { ...proposal, totalCents: 19_500 })).toMatchObject({
      ok: false,
      reason: "exceeds max price",
      detail: { term: "price", proposed: 19_500, limit: 19_000 },
    });
  });

  it("blocks pickup outside every allowed window", () => {
    expect(
      validateMandate(mandate, {
        ...proposal,
        pickupWindow: { day: "Sunday", from: "11:00", to: "13:00" },
      }),
    ).toMatchObject({ ok: false, reason: "outside pickup windows", detail: { term: "pickup_window" } });
  });

  it("blocks a non-public place under public_only", () => {
    expect(validateMandate(mandate, { ...proposal, placeName: "Seller's home", placeIsPublic: false })).toMatchObject({
      ok: false,
      reason: "requires a public place",
      detail: { term: "place", proposed: "Seller's home", limit: "public_only" },
    });
  });

  it("blocks a deal missing a required included item", () => {
    expect(validateMandate(mandate, { ...proposal, includedItems: [] })).toMatchObject({
      ok: false,
      reason: "missing required item",
      detail: { term: "must_include", proposed: [], limit: ["U-lock"] },
    });
  });

  it("accepts terms that satisfy every mandate field", () => {
    expect(validateMandate(mandate, proposal)).toEqual({ ok: true });
  });
});
