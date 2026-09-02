import type { DealTermsSnapshot } from "@/db/schema";

type HumanDeclineMetadata = {
  visibility: "buyer_private";
  reason: string | null;
};

export type TimelineSource = {
  id?: string;
  negotiationId: string;
  proposalId: string | null;
  actor: string;
  type: string;
  message: string | null;
  termsSnapshot: DealTermsSnapshot | null;
  metadata: Record<string, string | number | boolean | null> | null;
  createdAt?: Date;
};

export function buildHumanDeclineEvent(input: {
  negotiationId: string;
  proposalId: string;
  reason?: string;
  terms: DealTermsSnapshot;
}) {
  const reason = input.reason?.trim() || null;
  const metadata: HumanDeclineMetadata = { visibility: "buyer_private", reason };
  return {
    negotiationId: input.negotiationId,
    proposalId: input.proposalId,
    actor: "buyer_human" as const,
    type: "human_declined" as const,
    message: reason
      ? `You declined these terms: ${reason}`
      : "You declined these terms and asked your agent to keep negotiating.",
    termsSnapshot: { ...input.terms },
    metadata,
    dedupeKey: `human-decline:${input.negotiationId}:${input.proposalId}`,
  };
}

export function projectTimelineForViewer(
  timeline: TimelineSource[],
  viewer: "buyer" | "seller",
) {
  return timeline.map((event) => {
    if (event.type !== "human_declined") {
      return {
        ...event,
        reason: null,
        rejectedTerms: null,
      };
    }

    const privateReason =
      event.metadata && typeof event.metadata.reason === "string"
        ? event.metadata.reason
        : null;
    return {
      ...event,
      message:
        viewer === "buyer"
          ? event.message
          : "The buyer declined these terms. A new proposal is expected.",
      reason: viewer === "buyer" ? privateReason : null,
      rejectedTerms: event.termsSnapshot ? { ...event.termsSnapshot } : null,
      metadata: undefined,
    };
  });
}
