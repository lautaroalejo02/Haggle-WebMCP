import { NextResponse, type NextRequest } from "next/server";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { getDatabase } from "@/db/client";
import { listings, negotiations, proposals } from "@/db/schema";
import { apiErrorResponse } from "@/lib/server/api";
import { ensureBuyerSession, requireBuyerSessionId } from "@/lib/server/session";

export async function GET(request: NextRequest) {
  try {
    const sellerPersonaId = z.uuid().parse(request.nextUrl.searchParams.get("sellerPersonaId"));
    const buyerSessionId = requireBuyerSessionId(request);
    const db = getDatabase();
    await ensureBuyerSession(db, buyerSessionId);
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
        privateFloorPriceCents: listings.floorPriceCents,
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
      .where(
        and(
          eq(listings.sellerPersonaId, sellerPersonaId),
          eq(negotiations.buyerSessionId, buyerSessionId),
          eq(negotiations.status, "agreed_pending_approval"),
        ),
      )
      .orderBy(desc(negotiations.updatedAt));
    const firstBuyerProposals = rows.length
      ? await db
          .select({
            negotiationId: proposals.negotiationId,
            sequence: proposals.sequence,
            side: proposals.side,
            includedAccessoryId: proposals.includedAccessoryId,
          })
          .from(proposals)
          .where(inArray(proposals.negotiationId, rows.map((row) => row.id)))
          .orderBy(asc(proposals.sequence))
      : [];
    const originalAccessoryByNegotiation = new Map<string, string | null>();
    for (const proposal of firstBuyerProposals) {
      if (proposal.side === "buyer" && !originalAccessoryByNegotiation.has(proposal.negotiationId)) {
        originalAccessoryByNegotiation.set(proposal.negotiationId, proposal.includedAccessoryId);
      }
    }
    const queue = rows.map(({ privateFloorPriceCents, ...row }) => ({
      ...row,
      originalIncludedAccessoryId: originalAccessoryByNegotiation.get(row.id) ?? null,
      privateReview: {
        priceWithinPrivateMinimum:
          typeof row.agreement?.itemPriceCents === "number" &&
          row.agreement.itemPriceCents >= privateFloorPriceCents,
      },
    }));
    return NextResponse.json({
      ok: true,
      summary: `${queue.length} deal${queue.length === 1 ? "" : "s"} waiting for seller review.`,
      negotiations: queue,
      data: queue,
      possibleNextActions: queue.length ? ["seller_approve"] : [],
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
