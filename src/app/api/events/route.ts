import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/db/client";
import { apiErrorResponse } from "@/lib/server/api";
import { getRecentPublicEvents } from "@/lib/server/marketplace-data";

export async function GET(request: NextRequest) {
  try {
    const limit = z.coerce.number().int().min(1).max(20).default(10).parse(request.nextUrl.searchParams.get("limit") ?? undefined);
    const rows = await getRecentPublicEvents(getDatabase(), limit);
    return NextResponse.json({
      ok: true,
      summary: `${rows.length} recent marketplace event${rows.length === 1 ? "" : "s"}.`,
      events: rows,
      data: rows,
      possibleNextActions: [],
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
