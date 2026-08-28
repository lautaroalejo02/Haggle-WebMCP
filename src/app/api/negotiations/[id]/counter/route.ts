import { waitUntil } from "@vercel/functions";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/db/client";
import { apiErrorResponse, readJson } from "@/lib/server/api";
import { dealCommandSchema } from "@/lib/server/backend-inputs";
import { runIdempotent } from "@/lib/server/idempotency";
import { counterNegotiation, runSellerTurnWithDelay } from "@/lib/server/negotiation-service";
import { ensureBuyerSession, requireBuyerSessionId } from "@/lib/server/session";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const negotiationId = z.uuid().parse((await context.params).id);
    const raw = z.record(z.string(), z.unknown()).parse(await readJson(request));
    if (raw.negotiationId != null && raw.negotiationId !== negotiationId) {
      throw new z.ZodError([{ code: "custom", path: ["negotiationId"], message: "Body and route negotiation IDs must match.", input: raw.negotiationId }]);
    }
    const { negotiationId: _negotiationId, ...dealFields } = raw;
    void _negotiationId;
    const command = dealCommandSchema.parse(dealFields);
    const sessionId = requireBuyerSessionId(request);
    const db = getDatabase();
    await ensureBuyerSession(db, sessionId);
    const result = await runIdempotent(db, request, sessionId, "counter_offer", raw, async () => {
      const updated = await counterNegotiation(db, sessionId, negotiationId, command);
      return {
        ok: true,
        summary: "Counteroffer recorded. The seller agent will respond in a few seconds.",
        negotiation: updated.negotiation,
        shouldScheduleSeller: updated.shouldScheduleSeller,
        possibleNextActions: ["get_my_negotiations", "reject_deal"],
      };
    });
    if (!result.replayed && result.value.shouldScheduleSeller) {
      waitUntil(
        runSellerTurnWithDelay(db, negotiationId).catch((error) => console.error("Seller worker failed", error)),
      );
    }
    const { shouldScheduleSeller: _scheduled, ...response } = result.value;
    void _scheduled;
    return NextResponse.json(response);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
