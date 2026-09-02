import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/db/client";
import { ApiError, apiErrorResponse, readJson } from "@/lib/server/api";
import { runIdempotent } from "@/lib/server/idempotency";
import { getPrivateListingBundle } from "@/lib/server/marketplace-data";
import {
  getBuyerMandate,
  mandateCommandSchema,
  publicMandate,
  recentMandateBlocks,
  requireMandateFeature,
  setBuyerMandate,
} from "@/lib/server/mandate-service";
import { ensureBuyerSession, requireBuyerSessionId } from "@/lib/server/session";

const bodySchema = z.object({ mandate: mandateCommandSchema }).strict();

async function contextFor(request: NextRequest, context: { params: Promise<{ listingId: string }> }) {
  requireMandateFeature();
  const listingId = z.uuid().parse((await context.params).listingId);
  const buyerSessionId = requireBuyerSessionId(request);
  const db = getDatabase();
  await ensureBuyerSession(db, buyerSessionId);
  const listing = await getPrivateListingBundle(db, listingId);
  if (!listing) throw new ApiError(404, "LISTING_NOT_FOUND", "Bicycle listing not found.");
  return { buyerSessionId, db, listing };
}

export async function GET(request: NextRequest, context: { params: Promise<{ listingId: string }> }) {
  try {
    const { buyerSessionId, db, listing } = await contextFor(request, context);
    const current = await getBuyerMandate(db, buyerSessionId, listing);
    const blocks = current.id ? await recentMandateBlocks(db, current.id) : [];
    return NextResponse.json({
      ok: true,
      summary: current.persisted
        ? "Your mandate is active for this negotiation."
        : "These default boundaries are ready to use or edit.",
      mandate: publicMandate(current.mandate),
      persisted: current.persisted,
      recentBlocks: blocks.map((block) => ({
        id: block.id,
        type: "blocked_by_mandate" as const,
        reason: block.reason,
        detail: block.detail,
        message: block.message,
        rejectedTerms: block.termsSnapshot,
        createdAt: block.createdAt,
      })),
      possibleNextActions: ["set_mandate", "get_listing"],
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ listingId: string }> }) {
  try {
    const { buyerSessionId, db, listing } = await contextFor(request, context);
    const body = bodySchema.parse(await readJson(request));
    const result = await runIdempotent(db, request, buyerSessionId, "set_mandate", body, async () => ({
      ok: true,
      summary: "Your mandate is saved. Haggle will block proposals outside it.",
      mandate: publicMandate(await setBuyerMandate(db, buyerSessionId, listing, body.mandate)),
      possibleNextActions: ["get_mandate", "make_offer", "get_negotiation_status"],
    }));
    return NextResponse.json(result.value);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
