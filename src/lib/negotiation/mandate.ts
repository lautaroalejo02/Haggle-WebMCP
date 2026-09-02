export type PickupWindow = {
  day: string;
  from: string;
  to: string;
};

export type BuyerMandate = {
  maxPriceCents: number;
  pickupWindows: PickupWindow[];
  placePolicy: "public_only" | "any";
  mustInclude: string[];
};

export type MandateProposal = {
  totalCents: number;
  fulfillment: "pickup" | "delivery";
  pickupWindow: PickupWindow | null;
  placeName: string;
  placeIsPublic: boolean;
  includedItems: string[];
};

export type MandateViolation = {
  ok: false;
  reason: string;
  detail: {
    term: "price" | "pickup_window" | "place" | "must_include";
    proposed: number | string | string[] | PickupWindow | null;
    limit: number | string | string[] | PickupWindow[];
  };
};

export type MandateValidationResult = { ok: true } | MandateViolation;

export const MANDATE_FEATURE_ENABLED = process.env.NEXT_PUBLIC_FEATURE_MANDATE === "true";

export function validateMandate(
  mandate: BuyerMandate,
  proposal: MandateProposal,
): MandateValidationResult {
  if (proposal.totalCents > mandate.maxPriceCents) {
    return {
      ok: false,
      reason: "exceeds max price",
      detail: { term: "price", proposed: proposal.totalCents, limit: mandate.maxPriceCents },
    };
  }

  if (
    proposal.fulfillment === "pickup" &&
    (!proposal.pickupWindow || !mandate.pickupWindows.some((window) => containsWindow(window, proposal.pickupWindow!)))
  ) {
    return {
      ok: false,
      reason: "outside pickup windows",
      detail: {
        term: "pickup_window",
        proposed: proposal.pickupWindow,
        limit: mandate.pickupWindows,
      },
    };
  }

  if (mandate.placePolicy === "public_only" && !proposal.placeIsPublic) {
    return {
      ok: false,
      reason: "requires a public place",
      detail: { term: "place", proposed: proposal.placeName, limit: "public_only" },
    };
  }

  const included = new Set(proposal.includedItems.map(normalize));
  const missing = mandate.mustInclude.filter((item) => !included.has(normalize(item)));
  if (missing.length) {
    return {
      ok: false,
      reason: "missing required item",
      detail: {
        term: "must_include",
        proposed: proposal.includedItems,
        limit: mandate.mustInclude,
      },
    };
  }

  return { ok: true };
}

export function pickupWindowFromLabel(label: string): PickupWindow | null {
  const match = label.match(/^([^,]+),\s*(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?[–-](\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (!match) return null;
  const [, day, fromHour, fromMinute = "00", fromPeriod, toHour, toMinute = "00", toPeriod] = match;
  const inferredFromPeriod = fromPeriod ?? toPeriod;
  return {
    day: day.trim(),
    from: to24Hour(fromHour, fromMinute, inferredFromPeriod),
    to: to24Hour(toHour, toMinute, toPeriod),
  };
}

function containsWindow(allowed: PickupWindow, proposed: PickupWindow) {
  return (
    normalize(allowed.day) === normalize(proposed.day) &&
    proposed.from >= allowed.from &&
    proposed.to <= allowed.to
  );
}

function to24Hour(hourValue: string, minute: string, periodValue?: string) {
  let hour = Number(hourValue);
  const period = periodValue?.toUpperCase();
  if (period === "PM" && hour !== 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${minute}`;
}

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("en-US");
}
