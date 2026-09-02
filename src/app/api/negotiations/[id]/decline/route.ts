import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/db/client";
import { apiErrorResponse, readJson } from "@/lib/server/api";
import { runIdempotent } from "@/lib/server/idempotency";
import { declineAgreementByBuyerHuman } from "@/lib/server/negotiation-service";
import { ensureBuyerSession, requireBuyerSessionId } from "@/lib/server/session";

const bodySchema = z
  .object({
    negotiationId: z.uuid().optional(),
    reason: z.string().trim().max(140).optional(),
  })
  .strict();

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const negotiationId = z.uuid().parse((await context.params).id);
    const body = bodySchema.parse(await readJson(request));
    if (body.negotiationId && body.negotiationId !== negotiationId) {
      throw new z.ZodError([
        {
          code: "custom",
          path: ["negotiationId"],
          message: "Body and route negotiation IDs must match.",
          input: body.negotiationId,
        },
      ]);
    }
    const buyerSessionId = requireBuyerSessionId(request);
    const db = getDatabase();
    await ensureBuyerSession(db, buyerSessionId);
    const result = await runIdempotent(db, request, buyerSessionId, "decline_terms", body, async () => ({
      ok: true,
      summary: "You declined these terms. Your agent can make the next move.",
      negotiation: await declineAgreementByBuyerHuman(db, buyerSessionId, negotiationId, body.reason),
      possibleNextActions: ["get_negotiation_status", "counter_offer", "reject_deal"],
    }));
    return NextResponse.json(result.value);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
