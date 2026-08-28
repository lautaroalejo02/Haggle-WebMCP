import { describe, expect, it } from "vitest";
import {
  budgetCommandSchema,
  dealCommandSchema,
  fallbackSellerDecision,
  modelDecisionSchema,
  termsFromDealCommand,
} from "@/lib/server/backend-inputs";

describe("backend deal command parsing", () => {
  it("derives pickup terms without trusting a client-supplied fee", () => {
    const command = dealCommandSchema.parse({
      amountUsd: 180,
      fulfillment: "pickup",
      meetingPlaceId: "riverside-library",
      timeWindowId: "sat-2-4",
      includedAccessoryId: "u-lock",
    });

    expect(termsFromDealCommand(command, 1_500)).toEqual({
      itemPriceCents: 18_000,
      fulfillment: "pickup",
      meetingPlaceId: "riverside-library",
      deliveryZoneId: null,
      timeWindowId: "sat-2-4",
      deliveryFeeCents: 0,
      includedAccessoryId: "u-lock",
    });
  });

  it("uses the listing's server-owned delivery fee", () => {
    const command = dealCommandSchema.parse({
      amountUsd: 180.25,
      fulfillment: "delivery",
      deliveryZoneId: "downtown",
      timeWindowId: "sat-2-4",
    });

    expect(termsFromDealCommand(command, 1_500)).toMatchObject({
      itemPriceCents: 18_025,
      meetingPlaceId: null,
      deliveryZoneId: "downtown",
      deliveryFeeCents: 1_500,
    });
  });

  it("rejects client attempts to set a delivery fee", () => {
    expect(() =>
      dealCommandSchema.parse({
        amountUsd: 180,
        fulfillment: "delivery",
        deliveryZoneId: "downtown",
        timeWindowId: "sat-2-4",
        deliveryFeeCents: 0,
      }),
    ).toThrow();
  });

  it.each([
    { amountUsd: 10.001, fulfillment: "pickup", meetingPlaceId: "riverside-library", timeWindowId: "sat-2-4" },
    { amountUsd: 10, fulfillment: "pickup", timeWindowId: "sat-2-4" },
    { amountUsd: 10, fulfillment: "pickup", meetingPlaceId: "riverside-library", deliveryZoneId: "downtown", timeWindowId: "sat-2-4" },
    { amountUsd: 10, fulfillment: "delivery", timeWindowId: "sat-2-4" },
    { amountUsd: 10, fulfillment: "delivery", deliveryZoneId: "downtown", meetingPlaceId: "library", timeWindowId: "sat-2-4" },
  ])("rejects ambiguous or invalid deal command %#", (command) => {
    expect(() => dealCommandSchema.parse(command)).toThrow();
  });

  it("validates budget precision and defends the conversion helper", () => {
    expect(() => budgetCommandSchema.parse({ maxTotalUsd: 190.001 })).toThrow();
    expect(() =>
      termsFromDealCommand(
        {
          amountUsd: 10.001,
          fulfillment: "pickup",
          meetingPlaceId: "riverside-library",
          timeWindowId: "sat-2-4",
        },
        0,
      ),
    ).toThrow(RangeError);
  });
});

describe("seller decision validation", () => {
  it("strictly rejects unstructured or incomplete model counters", () => {
    expect(() =>
      modelDecisionSchema.parse({
        action: "counter",
        amount: 185,
        message: "Meet me halfway.",
      }),
    ).toThrow();
  });

  it("falls back to a floor-safe counter below the acceptance target", () => {
    const decision = fallbackSellerDecision({
      askingPriceCents: 22_000,
      floorPriceCents: 17_500,
      round: 1,
      maxRounds: 4,
      currentTerms: {
        itemPriceCents: 16_000,
        fulfillment: "pickup",
        meetingPlaceId: "riverside-library",
        deliveryZoneId: null,
        timeWindowId: "sat-2-4",
        deliveryFeeCents: 0,
        includedAccessoryId: null,
      },
    });

    expect(decision.action).toBe("counter");
    if (decision.action === "counter") {
      expect(decision.terms.itemPriceCents).toBe(18_500);
    }
  });

  it("accepts a buyer offer at asking price", () => {
    const decision = fallbackSellerDecision({
      askingPriceCents: 22_000,
      floorPriceCents: 17_500,
      round: 1,
      maxRounds: 4,
      currentTerms: {
        itemPriceCents: 22_000,
        fulfillment: "pickup",
        meetingPlaceId: "riverside-library",
        deliveryZoneId: null,
        timeWindowId: "sat-2-4",
        deliveryFeeCents: 0,
        includedAccessoryId: null,
      },
    });

    expect(decision).toMatchObject({ action: "accept" });
  });

  it("accepts a buyer offer that meets the safe fallback target", () => {
    const decision = fallbackSellerDecision({
      askingPriceCents: 22_000,
      floorPriceCents: 17_500,
      round: 1,
      maxRounds: 4,
      currentTerms: {
        itemPriceCents: 18_500,
        fulfillment: "pickup",
        meetingPlaceId: "riverside-library",
        deliveryZoneId: null,
        timeWindowId: "sat-2-4",
        deliveryFeeCents: 0,
        includedAccessoryId: null,
      },
    });

    expect(decision).toMatchObject({ action: "accept" });
  });
});
