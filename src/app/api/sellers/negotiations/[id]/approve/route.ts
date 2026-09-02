import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/db/client";
import { apiErrorResponse, readJson } from "@/lib/server/api";
import { approveNegotiation } from "@/lib/server/negotiation-service";
import { ensureBuyerSession, requireBuyerSessionId } from "@/lib/server/session";

const bodySchema = z.object({ sellerPersonaId: z.uuid() }).strict();

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const negotiationId = z.uuid().parse((await context.params).id);
    const body = bodySchema.parse(await readJson(request));
    const buyerSessionId = requireBuyerSessionId(request);
    const db = getDatabase();
    await ensureBuyerSession(db, buyerSessionId);
    const result = await approveNegotiation(db, negotiationId, {
      kind: "seller",
      sellerPersonaId: body.sellerPersonaId,
      buyerSessionId,
    });
    return NextResponse.json({
      ok: true,
      summary:
        result.status === "closed_deal"
          ? "Both humans approved. The bicycle is now sold."
          : "Seller approval recorded. Waiting for the buyer human.",
      status: result.status,
      possibleNextActions: [],
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
