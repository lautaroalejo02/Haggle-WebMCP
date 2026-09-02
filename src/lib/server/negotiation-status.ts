import type { Database } from "@/db/client";
import { ApiError } from "@/lib/server/api";
import { getNegotiationsForSession } from "@/lib/server/marketplace-data";

export async function getNegotiationStatusPayload(
  db: Database,
  buyerSessionId: string,
  negotiationId: string,
) {
  const negotiation = (await getNegotiationsForSession(db, buyerSessionId)).find(
    (item) => item.id === negotiationId,
  );
  if (!negotiation) {
    throw new ApiError(404, "NEGOTIATION_NOT_FOUND", "Negotiation not found for this browser session.");
  }

  const compactProposal = (proposal: typeof negotiation.currentProposal) =>
    proposal
      ? {
          id: proposal.id,
          sequence: proposal.sequence,
          side: proposal.side,
          terms: proposal.terms,
          totalCents: proposal.totalCents,
        }
      : null;

  return {
    ok: true as const,
    summary: negotiation.awaitingBuyerRevision
      ? "The buyer declined the provisional terms. A revised counteroffer is expected."
      : `Negotiation is ${negotiation.status.replaceAll("_", " ")}.`,
    negotiation: {
      id: negotiation.id,
      listingId: negotiation.listingId,
      status: negotiation.status,
      round: negotiation.round,
      maxRounds: negotiation.maxRounds,
      whoseTurn:
        negotiation.status === "buyer_turn"
          ? "buyer_agent"
          : negotiation.status === "seller_turn"
            ? "seller_agent"
            : "human_approval_or_complete",
      currentProposal: compactProposal(negotiation.currentProposal),
      agreementProposal: compactProposal(negotiation.agreementProposal),
      pendingApprovals: {
        buyer: negotiation.status === "agreed_pending_approval" && !negotiation.buyerApproved,
        seller: negotiation.status === "agreed_pending_approval" && !negotiation.sellerApproved,
      },
      principalDecision: negotiation.principalDecision,
      mandate: negotiation.mandate,
      recentTimeline: negotiation.timeline.slice(-8),
      possibleActions: negotiation.possibleActions,
    },
    possibleNextActions: negotiation.possibleActions,
  };
}
