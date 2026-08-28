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
});

export async function GET(request: NextRequest) {
  try {
    const input = querySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    const maxPriceCents = input.maxPriceUsd == null ? undefined : usdToCents(input.maxPriceUsd) ?? undefined;
    const rows = await searchListings(getDatabase(), {
      query: input.query || undefined,
      maxPriceCents,
      fulfillment: input.fulfillment,
    });
    return NextResponse.json({
      ok: true,
      summary: `Found ${rows.length} negotiable bicycle${rows.length === 1 ? "" : "s"}.`,
      listings: rows,
      possibleNextActions: rows.length ? ["get_listing"] : ["search_listings"],
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
