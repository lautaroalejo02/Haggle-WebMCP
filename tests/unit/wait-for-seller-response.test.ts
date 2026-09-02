import { describe, expect, it, vi } from "vitest";
import {
  normalizeSellerWaitTimeout,
  waitForSellerResponse,
} from "@/lib/negotiation/wait-for-seller-response";

type StatusPayload = {
  ok: true;
  negotiation: { status: string };
};

describe("waitForSellerResponse", () => {
  it("uses a 25 second default, caps the wait at 45 seconds, and returns when the seller responds", async () => {
    expect(normalizeSellerWaitTimeout(undefined)).toBe(25);
    expect(normalizeSellerWaitTimeout(90)).toBe(45);

    let now = 0;
    const pending: StatusPayload = { ok: true, negotiation: { status: "seller_turn" } };
    const responded: StatusPayload = {
      ok: true,
      negotiation: { status: "agreed_pending_approval" },
    };
    const readStatus = vi.fn().mockResolvedValueOnce(pending).mockResolvedValueOnce(responded);

    const result = await waitForSellerResponse({
      timeoutSeconds: 25,
      readStatus,
      now: () => now,
      sleep: async (milliseconds) => {
        now += milliseconds;
      },
      pollIntervalMs: 1_000,
    });

    expect(result).toEqual({ payload: responded, pending: false });
    expect(readStatus).toHaveBeenCalledTimes(2);
  });

  it("returns the latest status as pending when the deadline passes", async () => {
    let now = 0;
    const status: StatusPayload = { ok: true, negotiation: { status: "seller_turn" } };

    const result = await waitForSellerResponse({
      timeoutSeconds: 2,
      readStatus: async () => status,
      now: () => now,
      sleep: async (milliseconds) => {
        now += milliseconds;
      },
      pollIntervalMs: 1_000,
    });

    expect(result).toEqual({ payload: status, pending: true });
  });
});
