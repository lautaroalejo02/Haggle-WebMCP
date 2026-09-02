import { waitUntil } from "@vercel/functions";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/db/client";
import { apiErrorResponse, readJson } from "@/lib/server/api";
import { dealCommandSchema } from "@/lib/server/backend-inputs";
import { runIdempotent } from "@/lib/server/idempotency";
import { getNegotiationsForSession } from "@/lib/server/marketplace-data";
import { createNegotiation, runSellerTurnWithDelay } from "@/lib/server/negotiation-service";
import { ensureBuyerSession, requireBuyerSessionId } from "@/lib/server/session";

export async function GET(request: NextRequest) {
  try {
    const sessionId = requireBuyerSessionId(request);
    const db = getDatabase();
    await ensureBuyerSession(db, sessionId);
    const rows = await getNegotiationsForSession(db, sessionId);
    const agentView = request.nextUrl.searchParams.get("agent") === "1";
    const data = agentView ? rows.map(compactNegotiationForAgent) : rows;
    return NextResponse.json({
      ok: true,
      summary: rows.length ? `You have ${rows.length} negotiation${rows.length === 1 ? "" : "s"}.` : "You have no negotiations yet.",
      negotiations: data,
      data,
      possibleNextActions: rows.length ? ["get_listing"] : ["search_listings"],
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

function compactNegotiationForAgent(row: Awaited<ReturnType<typeof getNegotiationsForSession>>[number]) {
  const compactProposal = (proposal: typeof row.currentProposal) =>
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
    id: row.id,
    listingId: row.listingId,
    status: row.status,
    round: row.round,
    maxRounds: row.maxRounds,
    buyerApproved: row.buyerApproved,
    sellerApproved: row.sellerApproved,
    listing: row.listing,
    seller: row.seller,
    currentProposal: compactProposal(row.currentProposal),
    agreementProposal: compactProposal(row.agreementProposal),
    principalDecision: row.principalDecision,
    possibleActions: row.possibleActions,
  };
}

export async function POST(request: NextRequest) {
  try {
    const raw = z.record(z.string(), z.unknown()).parse(await readJson(request));
    const listingId = z.uuid().parse(raw.listingId);
    const { listingId: _listingId, ...dealFields } = raw;
    void _listingId;
    const command = dealCommandSchema.parse(dealFields);
    const sessionId = requireBuyerSessionId(request);
    const db = getDatabase();
    await ensureBuyerSession(db, sessionId);
    const result = await runIdempotent(db, request, sessionId, "make_offer", raw, async () => {
      const created = await createNegotiation(db, sessionId, listingId, command);
      return {
        ok: true,
        summary: "Offer recorded. The resident seller agent will respond in a few seconds.",
        negotiation: created.negotiation,
        negotiationId: created.negotiation?.id,
        shouldScheduleSeller: created.shouldScheduleSeller,
        possibleNextActions: ["get_my_negotiations", "reject_deal"],
      };
    });
    if (!result.replayed && result.value.shouldScheduleSeller && result.value.negotiationId) {
      waitUntil(
        runSellerTurnWithDelay(db, String(result.value.negotiationId)).catch((error) => {
          console.error("Seller worker failed", error);
        }),
      );
    }
    const { shouldScheduleSeller: _scheduled, ...response } = result.value;
    void _scheduled;
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
