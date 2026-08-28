import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/db/client";
import { apiErrorResponse } from "@/lib/server/api";
import { approveNegotiation } from "@/lib/server/negotiation-service";
import { ensureBuyerSession, requireBuyerSessionId } from "@/lib/server/session";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const negotiationId = z.uuid().parse((await context.params).id);
    const sessionId = requireBuyerSessionId(request);
    const db = getDatabase();
    await ensureBuyerSession(db, sessionId);
    const result = await approveNegotiation(db, negotiationId, { kind: "buyer", buyerSessionId: sessionId });
    return NextResponse.json({
      ok: true,
      summary:
        result.status === "closed_deal"
          ? "Both humans approved. The deal is closed and the bicycle is sold."
          : "Buyer approval recorded. Waiting for the seller human.",
      status: result.status,
      possibleNextActions: [],
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
