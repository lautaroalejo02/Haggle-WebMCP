import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/db/client";
import { usdToCents } from "@/lib/marketplace/contracts";
import { apiErrorResponse } from "@/lib/server/api";
import { searchListings } from "@/lib/server/marketplace-data";

const querySchema = z.object({
  query: z.string().trim().max(100).optional(),
  maxPriceUsd: z.coerce.number().finite().positive().max(100_000).optional(),
  fulfillment: z.enum(["pickup", "delivery"]).optional(),
  limit: z.coerce.number().int().min(1).max(20).default(8),
  offset: z.coerce.number().int().min(0).max(10_000).default(0),
});

export async function GET(request: NextRequest) {
  try {
    const input = querySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    const maxPriceCents = input.maxPriceUsd == null ? undefined : usdToCents(input.maxPriceUsd) ?? undefined;
    const result = await searchListings(getDatabase(), {
      query: input.query || undefined,
      maxPriceCents,
      fulfillment: input.fulfillment,
      limit: input.limit,
      offset: input.offset,
    });
    const hasMore = result.offset + result.rows.length < result.total;
    return NextResponse.json({
      ok: true,
      summary: `Showing ${result.rows.length} of ${result.total} matching negotiable bicycle${result.total === 1 ? "" : "s"}.`,
      listings: result.rows,
      resultCount: result.rows.length,
      totalMatches: result.total,
      hasMore,
      nextOffset: hasMore ? result.offset + result.rows.length : null,
      possibleNextActions: result.rows.length ? ["prepare_negotiation"] : ["search_listings"],
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
