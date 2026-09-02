export const DEFAULT_SELLER_WAIT_SECONDS = 25;
export const MAX_SELLER_WAIT_SECONDS = 45;

type NegotiationStatusPayload = {
  negotiation: { status: string };
};

type WaitOptions<T extends NegotiationStatusPayload> = {
  timeoutSeconds?: number;
  readStatus: () => Promise<T>;
  pollIntervalMs?: number;
  now?: () => number;
  sleep?: (milliseconds: number) => Promise<void>;
};

export function normalizeSellerWaitTimeout(value: number | undefined) {
  if (!Number.isFinite(value)) return DEFAULT_SELLER_WAIT_SECONDS;
  return Math.min(MAX_SELLER_WAIT_SECONDS, Math.max(1, Math.floor(value!)));
}

export async function waitForSellerResponse<T extends NegotiationStatusPayload>({
  timeoutSeconds,
  readStatus,
  pollIntervalMs = 750,
  now = Date.now,
  sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
}: WaitOptions<T>): Promise<{ payload: T; pending: boolean }> {
  const deadline = now() + normalizeSellerWaitTimeout(timeoutSeconds) * 1_000;
  let payload = await readStatus();

  while (payload.negotiation.status === "seller_turn") {
    const remainingMs = deadline - now();
    if (remainingMs <= 0) return { payload, pending: true };
    await sleep(Math.min(pollIntervalMs, remainingMs));
    payload = await readStatus();
  }

  return { payload, pending: false };
}
