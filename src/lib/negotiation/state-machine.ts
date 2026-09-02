export type Fulfillment = "pickup" | "delivery";
export type ProposalSide = "buyer" | "seller";
export type NegotiationStatus =
  | "seller_turn"
  | "buyer_turn"
  | "agreed_pending_approval"
  | "closed_deal"
  | "rejected"
  | "expired";

export type DealTerms = {
  itemPriceCents: number;
  fulfillment: Fulfillment;
  meetingPlaceId: string | null;
  deliveryZoneId: string | null;
  timeWindowId: string;
  deliveryFeeCents: number;
  includedAccessoryId: string | null;
};

export type Proposal = {
  id: string;
  side: ProposalSide;
  terms: DealTerms;
  respondingToProposalId: string | null;
};

export type NegotiationState = {
  status: NegotiationStatus;
  round: number;
  maxRounds: number;
  currentProposal: Proposal;
  agreementProposal: Proposal | null;
  buyerApproved: boolean;
  sellerApproved: boolean;
};

export type DealValidationRules = {
  askingPriceCents: number;
  budgetCents?: number | null;
  allowedFulfillment: Fulfillment[];
  allowedMeetingPlaceIds: string[];
  allowedDeliveryZoneIds: string[];
  allowedTimeWindowIds: string[];
  allowedAccessoryIds: string[];
};

export type DealValidationErrorCode =
  | "INVALID_MONEY"
  | "PRICE_OUT_OF_BOUNDS"
  | "BUDGET_EXCEEDED"
  | "FULFILLMENT_NOT_AVAILABLE"
  | "INVALID_FULFILLMENT_TERMS"
  | "INVALID_MEETING_PLACE"
  | "INVALID_DELIVERY_ZONE"
  | "INVALID_TIME_WINDOW"
  | "INVALID_ACCESSORY";

export type DealValidationResult =
  | { ok: true; totalCents: number }
  | {
      ok: false;
      code: DealValidationErrorCode;
      message: string;
      totalCents?: number;
    };

export class StateTransitionError extends Error {
  constructor(
    public readonly code: "INVALID_STATE" | "INVALID_PROPOSAL_SIDE",
    message: string,
  ) {
    super(message);
    this.name = "StateTransitionError";
  }
}

function copyTerms(terms: DealTerms): DealTerms {
  return { ...terms };
}

function copyProposal(proposal: Proposal): Proposal {
  return { ...proposal, terms: copyTerms(proposal.terms) };
}

function requireState(state: NegotiationState, expected: NegotiationStatus): void {
  if (state.status !== expected) {
    throw new StateTransitionError(
      "INVALID_STATE",
      `Expected ${expected}, received ${state.status}.`,
    );
  }
}

function requireProposalSide(state: NegotiationState, side: ProposalSide): void {
  if (state.currentProposal.side !== side) {
    throw new StateTransitionError(
      "INVALID_PROPOSAL_SIDE",
      `Expected a ${side} proposal, received ${state.currentProposal.side}.`,
    );
  }
}

export function totalDealCents(terms: DealTerms): number {
  return terms.itemPriceCents + terms.deliveryFeeCents;
}

export function validateDealTerms(
  terms: DealTerms,
  rules: DealValidationRules,
): DealValidationResult {
  if (
    !Number.isInteger(terms.itemPriceCents) ||
    terms.itemPriceCents <= 0 ||
    !Number.isInteger(terms.deliveryFeeCents) ||
    terms.deliveryFeeCents < 0
  ) {
    return {
      ok: false,
      code: "INVALID_MONEY",
      message: "Prices and fees must be non-negative whole cents.",
    };
  }

  const minimum = Math.ceil(rules.askingPriceCents * 0.01);
  const maximum = rules.askingPriceCents * 5;
  if (terms.itemPriceCents < minimum || terms.itemPriceCents > maximum) {
    return {
      ok: false,
      code: "PRICE_OUT_OF_BOUNDS",
      message: "The item price must be between 1% and 500% of asking price.",
    };
  }

  if (!rules.allowedFulfillment.includes(terms.fulfillment)) {
    return {
      ok: false,
      code: "FULFILLMENT_NOT_AVAILABLE",
      message: "That fulfillment method is unavailable for this listing.",
    };
  }

  if (terms.fulfillment === "pickup") {
    if (terms.deliveryFeeCents !== 0 || terms.deliveryZoneId !== null) {
      return {
        ok: false,
        code: "INVALID_FULFILLMENT_TERMS",
        message: "Pickup cannot include a delivery fee or delivery zone.",
      };
    }
    if (
      terms.meetingPlaceId === null ||
      !rules.allowedMeetingPlaceIds.includes(terms.meetingPlaceId)
    ) {
      return {
        ok: false,
        code: "INVALID_MEETING_PLACE",
        message: "Choose a public meeting place offered for this listing.",
      };
    }
  } else {
    if (terms.meetingPlaceId !== null) {
      return {
        ok: false,
        code: "INVALID_FULFILLMENT_TERMS",
        message: "Delivery cannot expose or use a pickup meeting place.",
      };
    }
    if (
      terms.deliveryZoneId === null ||
      !rules.allowedDeliveryZoneIds.includes(terms.deliveryZoneId)
    ) {
      return {
        ok: false,
        code: "INVALID_DELIVERY_ZONE",
        message: "Choose a delivery zone offered for this listing.",
      };
    }
  }

  if (!rules.allowedTimeWindowIds.includes(terms.timeWindowId)) {
    return {
      ok: false,
      code: "INVALID_TIME_WINDOW",
      message: "Choose an available time window for this listing.",
    };
  }

  if (
    terms.includedAccessoryId !== null &&
    !rules.allowedAccessoryIds.includes(terms.includedAccessoryId)
  ) {
    return {
      ok: false,
      code: "INVALID_ACCESSORY",
      message: "That accessory is not offered with this listing.",
    };
  }

  const totalCents = totalDealCents(terms);
  if (rules.budgetCents != null && totalCents > rules.budgetCents) {
    return {
      ok: false,
      code: "BUDGET_EXCEEDED",
      message: "The complete deal total exceeds the buyer's budget.",
      totalCents,
    };
  }

  return { ok: true, totalCents };
}

export function startNegotiation(input: {
  proposalId: string;
  terms: DealTerms;
  maxRounds?: number;
}): NegotiationState {
  const maxRounds = input.maxRounds ?? 4;
  if (!Number.isInteger(maxRounds) || maxRounds <= 0) {
    throw new RangeError("maxRounds must be a positive integer.");
  }

  return {
    status: "seller_turn",
    round: 1,
    maxRounds,
    currentProposal: {
      id: input.proposalId,
      side: "buyer",
      terms: copyTerms(input.terms),
      respondingToProposalId: null,
    },
    agreementProposal: null,
    buyerApproved: false,
    sellerApproved: false,
  };
}

export function counterBySeller(
  state: NegotiationState,
  input: { proposalId: string; terms: DealTerms },
): NegotiationState {
  requireState(state, "seller_turn");
  requireProposalSide(state, "buyer");

  return {
    ...state,
    status: "buyer_turn",
    currentProposal: {
      id: input.proposalId,
      side: "seller",
      terms: copyTerms(input.terms),
      respondingToProposalId: state.currentProposal.id,
    },
  };
}

export function counterByBuyer(
  state: NegotiationState,
  input: { proposalId: string; terms: DealTerms },
): NegotiationState {
  requireState(state, "buyer_turn");
  requireProposalSide(state, "seller");

  if (state.round >= state.maxRounds) {
    return { ...state, status: "expired" };
  }

  return {
    ...state,
    status: "seller_turn",
    round: state.round + 1,
    currentProposal: {
      id: input.proposalId,
      side: "buyer",
      terms: copyTerms(input.terms),
      respondingToProposalId: state.currentProposal.id,
    },
  };
}

export function acceptSellerProposal(state: NegotiationState): NegotiationState {
  requireState(state, "buyer_turn");
  requireProposalSide(state, "seller");

  return {
    ...state,
    status: "agreed_pending_approval",
    agreementProposal: copyProposal(state.currentProposal),
    buyerApproved: false,
    sellerApproved: false,
  };
}

export function acceptBuyerProposal(state: NegotiationState): NegotiationState {
  requireState(state, "seller_turn");
  requireProposalSide(state, "buyer");

  return {
    ...state,
    status: "agreed_pending_approval",
    agreementProposal: copyProposal(state.currentProposal),
    buyerApproved: false,
    sellerApproved: false,
  };
}

export function applyHumanApproval(
  state: NegotiationState,
  actor: "buyer" | "seller",
): NegotiationState {
  const alreadyApproved = actor === "buyer" ? state.buyerApproved : state.sellerApproved;
  if (alreadyApproved) return state;

  requireState(state, "agreed_pending_approval");

  const next = {
    ...state,
    buyerApproved: actor === "buyer" ? true : state.buyerApproved,
    sellerApproved: actor === "seller" ? true : state.sellerApproved,
  };

  return {
    ...next,
    status: next.buyerApproved && next.sellerApproved
      ? "closed_deal"
      : "agreed_pending_approval",
  };
}

export function declineAgreementByBuyer(state: NegotiationState): NegotiationState {
  requireState(state, "agreed_pending_approval");

  return {
    ...state,
    status: "buyer_turn",
    agreementProposal: null,
    buyerApproved: false,
    sellerApproved: false,
  };
}

export type SellerDecision =
  | { action: "accept"; message: string }
  | { action: "reject"; message: string }
  | { action: "counter"; terms: DealTerms; message: string };

export type EnforcedSellerDecision = {
  decision: SellerDecision;
  violation: "SELLER_FLOOR_VIOLATION" | null;
};

export function enforceSellerFloor(
  decision: SellerDecision,
  floorPriceCents: number,
  currentBuyerTerms: DealTerms,
): EnforcedSellerDecision {
  if (!Number.isInteger(floorPriceCents) || floorPriceCents <= 0) {
    throw new RangeError("floorPriceCents must be a positive integer.");
  }

  if (decision.action === "reject") {
    return { decision, violation: null };
  }

  const proposedItemPrice =
    decision.action === "accept"
      ? currentBuyerTerms.itemPriceCents
      : decision.terms.itemPriceCents;

  if (proposedItemPrice >= floorPriceCents) {
    return { decision, violation: null };
  }

  const sourceTerms = decision.action === "counter" ? decision.terms : currentBuyerTerms;
  return {
    decision: {
      action: "counter",
      terms: { ...sourceTerms, itemPriceCents: floorPriceCents },
      message: decision.message,
    },
    violation: "SELLER_FLOOR_VIOLATION",
  };
}
