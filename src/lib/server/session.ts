import type { NextRequest } from "next/server";
import { z } from "zod";
import type { Database } from "@/db/client";
import { buyerSessions } from "@/db/schema";
import { ApiError } from "@/lib/server/api";

export const SESSION_COOKIE_NAME = "haggle_session";
const sessionIdSchema = z.uuid();

export function requireBuyerSessionId(request: NextRequest): string {
  const value = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!value || !sessionIdSchema.safeParse(value).success) {
    throw new ApiError(
      400,
      "SESSION_REQUIRED",
      "A browser session is required. Refresh the page and try again.",
    );
  }
  return value;
}

export async function ensureBuyerSession(db: Database, sessionId: string) {
  await db
    .insert(buyerSessions)
    .values({ id: sessionId })
    .onConflictDoNothing({ target: buyerSessions.id });
}
