import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/db/client";
import { ApiError, apiErrorResponse } from "@/lib/server/api";
import {
  getNegotiationsForSession,
  getPrivateListingBundle,
  publicListing,
} from "@/lib/server/marketplace-data";
import { ensureBuyerSession, requireBuyerSessionId } from "@/lib/server/session";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const listingId = z.uuid().parse(id);
    const sessionId = requireBuyerSessionId(request);
    const db = getDatabase();
    await ensureBuyerSession(db, sessionId);
    const listing = await getPrivateListingBundle(db, listingId);
    if (!listing) throw new ApiError(404, "LISTING_NOT_FOUND", "Bicycle listing not found.", ["search_listings"]);
    const negotiation = (await getNegotiationsForSession(db, sessionId)).find(
      (item) => item.listingId === listingId && ["seller_turn", "buyer_turn", "agreed_pending_approval"].includes(item.status),
    );
    return NextResponse.json({
      ok: true,
      summary: `${listing.title} is listed at $${(listing.askingPriceCents / 100).toFixed(2)} and supports structured negotiation.`,
      listing: publicListing(listing),
      negotiation: negotiation ?? null,
      possibleNextActions: negotiation?.possibleActions.length
        ? negotiation.possibleActions
        : listing.status === "active"
          ? ["make_offer"]
          : ["search_listings"],
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
