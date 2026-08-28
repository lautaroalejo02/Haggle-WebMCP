import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import type { Database } from "@/db/client";
import { negotiationCommands } from "@/db/schema";
import { ApiError } from "@/lib/server/api";

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export async function runIdempotent<T extends Record<string, unknown>>(
  db: Database,
  request: NextRequest,
  buyerSessionId: string,
  command: string,
  payload: unknown,
  execute: () => Promise<T>,
): Promise<{ value: T; replayed: boolean }> {
  const key = request.headers.get("idempotency-key")?.trim();
  if (!key) return { value: await execute(), replayed: false };
  if (key.length > 200) throw new ApiError(400, "INVALID_IDEMPOTENCY_KEY", "Idempotency key is too long.");

  const requestHash = createHash("sha256").update(stableJson({ command, payload })).digest("hex");
  const [existing] = await db
    .select({ requestHash: negotiationCommands.requestHash, response: negotiationCommands.response })
    .from(negotiationCommands)
    .where(
      and(
        eq(negotiationCommands.buyerSessionId, buyerSessionId),
        eq(negotiationCommands.idempotencyKey, key),
      ),
    )
    .limit(1);
  if (existing) {
    if (existing.requestHash !== requestHash) {
      throw new ApiError(
        409,
        "IDEMPOTENCY_KEY_REUSED",
        "That idempotency key was already used for a different request.",
      );
    }
    return { value: existing.response as T, replayed: true };
  }

  const value = await execute();
  await db
    .insert(negotiationCommands)
    .values({
      buyerSessionId,
      idempotencyKey: key,
      command,
      requestHash,
      response: value,
    })
    .onConflictDoNothing();
  return { value, replayed: false };
}
