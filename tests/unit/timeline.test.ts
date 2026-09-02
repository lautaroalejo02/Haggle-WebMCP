import { describe, expect, it } from "vitest";
import { buildHumanDeclineEvent, projectTimelineForViewer } from "@/lib/negotiation/timeline";

const terms = {
  itemPriceCents: 18_500,
  fulfillment: "pickup" as const,
  meetingPlaceId: "riverside-library",
  deliveryZoneId: null,
  timeWindowId: "sat-2-4",
  deliveryFeeCents: 0,
  includedAccessoryId: "u-lock",
};

describe("human decline timeline privacy", () => {
  it("records the rejected terms, keeps the reason buyer-private, and tells the seller only that revision is expected", () => {
    const event = buildHumanDeclineEvent({
      negotiationId: "negotiation-1",
      proposalId: "proposal-2",
      reason: "Try $175 if the lock stays included.",
      terms,
    });

    expect(event).toMatchObject({
      type: "human_declined",
      actor: "buyer_human",
      termsSnapshot: terms,
    });
    expect(projectTimelineForViewer([event], "buyer")[0]).toMatchObject({
      reason: "Try $175 if the lock stays included.",
      rejectedTerms: terms,
    });
    expect(projectTimelineForViewer([event], "seller")[0]).toMatchObject({
      reason: null,
      message: "The buyer declined these terms. A new proposal is expected.",
      rejectedTerms: terms,
    });
    expect(JSON.stringify(projectTimelineForViewer([event], "seller"))).not.toContain("$175");
  });
});
