import { NextResponse, type NextRequest } from "next/server";
import { getDatabase } from "@/db/client";
import { buyerSessions } from "@/db/schema";
import { usdToCents } from "@/lib/marketplace/contracts";
import { apiErrorResponse, readJson } from "@/lib/server/api";
import { budgetCommandSchema } from "@/lib/server/backend-inputs";
import { runIdempotent } from "@/lib/server/idempotency";
import { ensureBuyerSession, requireBuyerSessionId } from "@/lib/server/session";

export async function POST(request: NextRequest) {
  try {
    const body = budgetCommandSchema.parse(await readJson(request));
    const sessionId = requireBuyerSessionId(request);
    const db = getDatabase();
    await ensureBuyerSession(db, sessionId);
    const cents = usdToCents(body.maxTotalUsd)!;
    const result = await runIdempotent(db, request, sessionId, "set_budget", body, async () => {
      await db
        .insert(buyerSessions)
        .values({ id: sessionId, maxTotalCents: cents })
        .onConflictDoUpdate({
          target: buyerSessions.id,
          set: { maxTotalCents: cents, updatedAt: new Date() },
        });
      return {
        ok: true,
        summary: `Budget guardrail set to $${(cents / 100).toFixed(2)} including delivery fees.`,
        maxTotalCents: cents,
        possibleNextActions: ["search_listings", "get_my_negotiations"],
      };
    });
    return NextResponse.json(result.value);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
