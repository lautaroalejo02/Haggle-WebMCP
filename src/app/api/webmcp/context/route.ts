import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/db/client";
import { apiErrorResponse } from "@/lib/server/api";
import { getNegotiationsForSession, getPrivateListingBundle } from "@/lib/server/marketplace-data";
import { ensureBuyerSession, requireBuyerSessionId } from "@/lib/server/session";
import { MANDATE_FEATURE_ENABLED } from "@/lib/negotiation/mandate";

function disabled(reason: string) {
  return { enabled: false, reason };
}

type MakeOfferContext = ReturnType<typeof disabled> & { listingIds?: string[] };

export async function GET(request: NextRequest) {
  try {
    const listingIdValue = request.nextUrl.searchParams.get("listingId");
    const listingId = listingIdValue ? z.uuid().parse(listingIdValue) : null;
    const sessionId = requireBuyerSessionId(request);
    const db = getDatabase();
    await ensureBuyerSession(db, sessionId);
    const sessionNegotiations = await getNegotiationsForSession(db, sessionId);
    const active = sessionNegotiations.filter((item) =>
      ["seller_turn", "buyer_turn", "agreed_pending_approval"].includes(item.status),
    );
    const canCounter = active.filter((item) => item.possibleActions.includes("counter_offer"));
    const canAccept = active.filter((item) => item.possibleActions.includes("accept_deal"));
    const canReject = active.filter((item) => item.possibleActions.includes("reject_deal"));

    let makeOffer: MakeOfferContext = disabled(
      "Open or inspect an active listing that has no negotiation in this session.",
    );
    if (listingId) {
      const listing = await getPrivateListingBundle(db, listingId);
      const hasNegotiation = sessionNegotiations.some((item) => item.listingId === listingId);
      if (listing?.status === "active" && !hasNegotiation) {
        makeOffer = {
          enabled: true,
          reason: "This inspected listing is active and has no prior negotiation in this browser session.",
          listingIds: [listingId],
        };
      }
    }

    return NextResponse.json({
      version: sessionNegotiations.map((item) => `${item.id}:${item.status}:${item.round}:${item.updatedAt.toISOString()}`).join("|") || "empty",
      actions: {
        mandate: MANDATE_FEATURE_ENABLED
          ? {
              enabled: Boolean(listingId || active.length),
              reason: listingId
                ? "Set or read the buyer's private boundaries for this listing."
                : "Set or read the buyer's private boundaries for an active negotiation.",
              listingIds: listingId
                ? [listingId]
                : [...new Set(active.map((item) => item.listingId))],
            }
          : disabled("Buyer mandates are disabled for this deployment."),
        make_offer: makeOffer,
        counter_offer: canCounter.length
          ? {
              enabled: true,
              reason: "A seller counter is waiting and another buyer round remains.",
              negotiationIds: canCounter.map((item) => item.id),
            }
          : disabled("No seller counter is waiting with another bargaining round available."),
        accept_deal: canAccept.length
          ? {
              enabled: true,
              reason: "Seller terms are waiting for agent acceptance before human approval.",
              negotiationIds: canAccept.map((item) => item.id),
            }
          : disabled("No seller proposal is waiting for acceptance."),
        reject_deal: canReject.length
          ? {
              enabled: true,
              reason: "One or more active negotiations can still be ended.",
              negotiationIds: canReject.map((item) => item.id),
            }
          : disabled("No active negotiation can be rejected."),
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
