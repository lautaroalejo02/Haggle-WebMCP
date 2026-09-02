import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/db/client";
import { normalizeSellerWaitTimeout, waitForSellerResponse } from "@/lib/negotiation/wait-for-seller-response";
import { apiErrorResponse } from "@/lib/server/api";
import { getNegotiationStatusPayload } from "@/lib/server/negotiation-status";
import { ensureBuyerSession, requireBuyerSessionId } from "@/lib/server/session";

export const maxDuration = 60;

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const negotiationId = z.uuid().parse((await context.params).id);
    const rawTimeout = request.nextUrl.searchParams.get("timeoutSeconds");
    const timeoutSeconds = normalizeSellerWaitTimeout(
      rawTimeout === null ? undefined : Number(rawTimeout),
    );
    const buyerSessionId = requireBuyerSessionId(request);
    const db = getDatabase();
    await ensureBuyerSession(db, buyerSessionId);

    const result = await waitForSellerResponse({
      timeoutSeconds,
      readStatus: () => getNegotiationStatusPayload(db, buyerSessionId, negotiationId),
    });

    return NextResponse.json(
      result.pending ? { ...result.payload, pending: true } : result.payload,
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
