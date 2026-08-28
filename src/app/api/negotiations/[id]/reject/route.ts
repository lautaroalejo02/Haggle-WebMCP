import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/db/client";
import { apiErrorResponse, readJson } from "@/lib/server/api";
import { runIdempotent } from "@/lib/server/idempotency";
import { rejectNegotiation } from "@/lib/server/negotiation-service";
import { ensureBuyerSession, requireBuyerSessionId } from "@/lib/server/session";

const bodySchema = z
  .object({ negotiationId: z.uuid().optional(), message: z.string().trim().max(280).optional() })
  .strict();

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const negotiationId = z.uuid().parse((await context.params).id);
    const body = bodySchema.parse(await readJson(request));
    if (body.negotiationId && body.negotiationId !== negotiationId) {
      throw new z.ZodError([{ code: "custom", path: ["negotiationId"], message: "Body and route negotiation IDs must match.", input: body.negotiationId }]);
    }
    const sessionId = requireBuyerSessionId(request);
    const db = getDatabase();
    await ensureBuyerSession(db, sessionId);
    const result = await runIdempotent(db, request, sessionId, "reject_deal", body, async () => ({
      ok: true,
      summary: "Negotiation ended and recorded in the audit trail.",
      negotiation: await rejectNegotiation(db, sessionId, negotiationId, body.message),
      possibleNextActions: ["search_listings"],
    }));
    return NextResponse.json(result.value);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
