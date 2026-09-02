import { describe, expect, it } from "vitest";
import {
  acceptBuyerProposal,
  acceptSellerProposal,
  applyHumanApproval,
  counterByBuyer,
  counterBySeller,
  declineAgreementByBuyer,
  enforceSellerFloor,
  startNegotiation,
  validateDealTerms,
  StateTransitionError,
  type DealTerms,
  type DealValidationRules,
} from "@/lib/negotiation/state-machine";

const pickupTerms: DealTerms = {
  itemPriceCents: 16_500,
  fulfillment: "pickup",
  meetingPlaceId: "riverside-library",
  deliveryZoneId: null,
  timeWindowId: "sat-2-4",
  deliveryFeeCents: 0,
  includedAccessoryId: "u-lock",
};

const rules: DealValidationRules = {
  askingPriceCents: 22_000,
  budgetCents: 19_000,
  allowedFulfillment: ["pickup", "delivery"],
  allowedMeetingPlaceIds: ["riverside-library"],
  allowedDeliveryZoneIds: ["downtown"],
  allowedTimeWindowIds: ["sat-2-4"],
  allowedAccessoryIds: ["u-lock"],
};

describe("structured deal validation", () => {
  it("accepts a public pickup arrangement inside the buyer's total budget", () => {
    expect(validateDealTerms(pickupTerms, rules)).toEqual({
      ok: true,
      totalCents: 16_500,
    });
  });

  it("counts the delivery fee against the buyer's total budget", () => {
    const result = validateDealTerms(
      {
        ...pickupTerms,
        itemPriceCents: 18_500,
        fulfillment: "delivery",
        meetingPlaceId: null,
        deliveryZoneId: "downtown",
        deliveryFeeCents: 1_500,
      },
      rules,
    );

    expect(result).toMatchObject({ ok: false, code: "BUDGET_EXCEEDED" });
  });

  it("rejects pickup terms that contain a delivery fee", () => {
    const result = validateDealTerms(
      { ...pickupTerms, deliveryFeeCents: 500 },
      rules,
    );

    expect(result).toMatchObject({ ok: false, code: "INVALID_FULFILLMENT_TERMS" });
  });

  it("rejects delivery terms that expose a pickup meeting place", () => {
    const result = validateDealTerms(
      {
        ...pickupTerms,
        fulfillment: "delivery",
        deliveryZoneId: "downtown",
        deliveryFeeCents: 500,
      },
      rules,
    );

    expect(result).toMatchObject({ ok: false, code: "INVALID_FULFILLMENT_TERMS" });
  });

  it("enforces the one-to-five-hundred-percent asking-price boundary", () => {
    expect(
      validateDealTerms({ ...pickupTerms, itemPriceCents: 219 }, rules),
    ).toMatchObject({ ok: false, code: "PRICE_OUT_OF_BOUNDS" });
    expect(
      validateDealTerms({ ...pickupTerms, itemPriceCents: 11_000_001 }, rules),
    ).toMatchObject({ ok: false, code: "PRICE_OUT_OF_BOUNDS" });
  });

  it.each([
    [{ ...pickupTerms, itemPriceCents: 100.5 }, "INVALID_MONEY"],
    [{ ...pickupTerms, fulfillment: "delivery" as const, meetingPlaceId: null, deliveryZoneId: null }, "INVALID_DELIVERY_ZONE"],
    [{ ...pickupTerms, meetingPlaceId: "unknown" }, "INVALID_MEETING_PLACE"],
    [{ ...pickupTerms, timeWindowId: "unknown" }, "INVALID_TIME_WINDOW"],
    [{ ...pickupTerms, includedAccessoryId: "unknown" }, "INVALID_ACCESSORY"],
  ])("rejects invalid structured terms with %s", (terms, code) => {
    expect(validateDealTerms(terms, rules)).toMatchObject({ ok: false, code });
  });

  it("rejects fulfillment methods unavailable for a listing", () => {
    expect(
      validateDealTerms(
        {
          ...pickupTerms,
          fulfillment: "delivery",
          meetingPlaceId: null,
          deliveryZoneId: "downtown",
          deliveryFeeCents: 500,
        },
        { ...rules, allowedFulfillment: ["pickup"] },
      ),
    ).toMatchObject({ ok: false, code: "FULFILLMENT_NOT_AVAILABLE" });
  });
});

describe("negotiation turns and rounds", () => {
  it("starts at round one with the seller considering the buyer proposal", () => {
    const negotiation = startNegotiation({
      proposalId: "proposal-1",
      terms: pickupTerms,
      maxRounds: 4,
    });

    expect(negotiation).toMatchObject({
      status: "seller_turn",
      round: 1,
      maxRounds: 4,
      currentProposal: { id: "proposal-1", side: "buyer" },
    });
  });

  it("rejects invalid round limits and out-of-turn transitions", () => {
    expect(() => startNegotiation({ proposalId: "p1", terms: pickupTerms, maxRounds: 0 })).toThrow(
      RangeError,
    );
    const started = startNegotiation({ proposalId: "p1", terms: pickupTerms });
    expect(() => acceptSellerProposal(started)).toThrow(StateTransitionError);
    expect(() =>
      counterBySeller({ ...started, currentProposal: { ...started.currentProposal, side: "seller" } }, {
        proposalId: "p2",
        terms: pickupTerms,
      }),
    ).toThrow(StateTransitionError);
  });

  it("does not increment the round when the seller counters", () => {
    const started = startNegotiation({ proposalId: "p1", terms: pickupTerms });
    const countered = counterBySeller(started, {
      proposalId: "p2",
      terms: { ...pickupTerms, itemPriceCents: 18_500 },
    });

    expect(countered).toMatchObject({
      status: "buyer_turn",
      round: 1,
      currentProposal: { id: "p2", side: "seller" },
    });
  });

  it("increments the round exactly once when the buyer counters", () => {
    const started = startNegotiation({ proposalId: "p1", terms: pickupTerms });
    const sellerTurn = counterBySeller(started, {
      proposalId: "p2",
      terms: { ...pickupTerms, itemPriceCents: 18_500 },
    });
    const buyerTurn = counterByBuyer(sellerTurn, {
      proposalId: "p3",
      terms: { ...pickupTerms, itemPriceCents: 17_500 },
    });

    expect(buyerTurn).toMatchObject({ status: "seller_turn", round: 2 });
  });

  it("expires instead of creating a fifth buyer proposal", () => {
    const started = startNegotiation({ proposalId: "p1", terms: pickupTerms });
    const atLimit = {
      ...counterBySeller(started, {
        proposalId: "p2",
        terms: { ...pickupTerms, itemPriceCents: 18_500 },
      }),
      round: 4,
    };

    const result = counterByBuyer(atLimit, {
      proposalId: "p3",
      terms: pickupTerms,
    });

    expect(result).toMatchObject({ status: "expired", round: 4 });
    expect(result.currentProposal.id).toBe("p2");
  });
});

describe("structural seller guardrails", () => {
  it("clamps a below-floor seller counter and reports the violation", () => {
    const result = enforceSellerFloor(
      {
        action: "counter",
        terms: { ...pickupTerms, itemPriceCents: 15_000 },
        message: "Let's make a deal.",
      },
      17_500,
      pickupTerms,
    );

    expect(result.violation).toBe("SELLER_FLOOR_VIOLATION");
    expect(result.decision).toMatchObject({
      action: "counter",
      terms: { itemPriceCents: 17_500 },
    });
  });

  it("cannot accept a buyer proposal below the private floor", () => {
    const result = enforceSellerFloor(
      { action: "accept", message: "Accepted." },
      17_500,
      pickupTerms,
    );

    expect(result.violation).toBe("SELLER_FLOOR_VIOLATION");
    expect(result.decision).toMatchObject({
      action: "counter",
      terms: { itemPriceCents: 17_500 },
    });
  });

  it("passes through safe and rejected decisions, and validates the floor itself", () => {
    const rejected = { action: "reject" as const, message: "No thanks." };
    expect(enforceSellerFloor(rejected, 17_500, pickupTerms)).toEqual({
      decision: rejected,
      violation: null,
    });
    const safe = { action: "accept" as const, message: "Accepted." };
    expect(
      enforceSellerFloor(safe, 16_000, { ...pickupTerms, itemPriceCents: 18_000 }),
    ).toEqual({ decision: safe, violation: null });
    expect(() => enforceSellerFloor(safe, 0, pickupTerms)).toThrow(RangeError);
  });
});

describe("human approval", () => {
  it("freezes the exact seller proposal when the buyer accepts", () => {
    const started = startNegotiation({ proposalId: "p1", terms: pickupTerms });
    const sellerTurn = counterBySeller(started, {
      proposalId: "p2",
      terms: { ...pickupTerms, itemPriceCents: 18_500 },
    });
    const agreed = acceptSellerProposal(sellerTurn);

    expect(agreed).toMatchObject({
      status: "agreed_pending_approval",
      agreementProposal: { id: "p2", side: "seller" },
      buyerApproved: false,
      sellerApproved: false,
    });
  });

  it("freezes the buyer proposal when the seller accepts", () => {
    const started = startNegotiation({ proposalId: "p1", terms: pickupTerms });
    expect(acceptBuyerProposal(started)).toMatchObject({
      status: "agreed_pending_approval",
      agreementProposal: { id: "p1", side: "buyer" },
    });
  });

  it("closes only after both humans approve, in either order", () => {
    const started = startNegotiation({ proposalId: "p1", terms: pickupTerms });
    const sellerTurn = counterBySeller(started, {
      proposalId: "p2",
      terms: { ...pickupTerms, itemPriceCents: 18_500 },
    });
    const agreed = acceptSellerProposal(sellerTurn);
    const sellerApproved = applyHumanApproval(agreed, "seller");

    expect(sellerApproved.status).toBe("agreed_pending_approval");
    expect(sellerApproved.sellerApproved).toBe(true);

    const bothApproved = applyHumanApproval(sellerApproved, "buyer");
    expect(bothApproved).toMatchObject({
      status: "closed_deal",
      buyerApproved: true,
      sellerApproved: true,
    });
  });

  it("treats repeated human approval as an idempotent no-op", () => {
    const started = startNegotiation({ proposalId: "p1", terms: pickupTerms });
    const agreed = acceptSellerProposal(
      counterBySeller(started, {
        proposalId: "p2",
        terms: { ...pickupTerms, itemPriceCents: 18_500 },
      }),
    );
    const once = applyHumanApproval(agreed, "buyer");
    const twice = applyHumanApproval(once, "buyer");

    expect(twice).toEqual(once);
  });

  it("keeps the negotiation open when the buyer human declines provisional terms", () => {
    const started = startNegotiation({ proposalId: "p1", terms: pickupTerms });
    const sellerTurn = counterBySeller(started, {
      proposalId: "p2",
      terms: { ...pickupTerms, itemPriceCents: 18_500 },
    });
    const declined = declineAgreementByBuyer(acceptSellerProposal(sellerTurn));

    expect(declined).toMatchObject({
      status: "buyer_turn",
      agreementProposal: null,
      buyerApproved: false,
      sellerApproved: false,
      currentProposal: { id: "p2", terms: { itemPriceCents: 18_500 } },
    });
  });
});
