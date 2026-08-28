import { NextResponse, type NextRequest } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDatabase } from "@/db/client";
import { listings, negotiations, proposals } from "@/db/schema";
import { apiErrorResponse } from "@/lib/server/api";

export async function GET(request: NextRequest) {
  try {
    const sellerPersonaId = z.uuid().parse(request.nextUrl.searchParams.get("sellerPersonaId"));
    const db = getDatabase();
    const rows = await db
      .select({
        id: negotiations.id,
        status: negotiations.status,
        round: negotiations.round,
        maxRounds: negotiations.maxRounds,
        buyerApprovedAt: negotiations.buyerApprovedAt,
        sellerApprovedAt: negotiations.sellerApprovedAt,
        updatedAt: negotiations.updatedAt,
        listing: { id: listings.id, title: listings.title, photoUrl: listings.photoUrl },
        agreement: {
          itemPriceCents: proposals.itemPriceCents,
          deliveryFeeCents: proposals.deliveryFeeCents,
          fulfillment: proposals.fulfillment,
          meetingPlaceId: proposals.meetingPlaceId,
          deliveryZoneId: proposals.deliveryZoneId,
          timeWindowId: proposals.timeWindowId,
          includedAccessoryId: proposals.includedAccessoryId,
        },
      })
      .from(negotiations)
      .innerJoin(listings, eq(negotiations.listingId, listings.id))
      .leftJoin(proposals, eq(negotiations.agreementProposalId, proposals.id))
      .where(and(eq(listings.sellerPersonaId, sellerPersonaId), eq(negotiations.status, "agreed_pending_approval")))
      .orderBy(desc(negotiations.updatedAt));
    return NextResponse.json({
      ok: true,
      summary: `${rows.length} deal${rows.length === 1 ? "" : "s"} waiting for seller review.`,
      negotiations: rows,
      data: rows,
      possibleNextActions: rows.length ? ["seller_approve"] : [],
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
