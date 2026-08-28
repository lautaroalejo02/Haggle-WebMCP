import { z } from "zod";
import { usdToCents } from "@/lib/marketplace/contracts";
import type { DealTerms, SellerDecision } from "@/lib/negotiation/state-machine";

const nullableId = z.string().trim().min(1).max(100).nullable().optional();

export const dealCommandSchema = z
  .object({
    amountUsd: z.number().finite().positive().max(100_000),
    fulfillment: z.enum(["pickup", "delivery"]),
    meetingPlaceId: nullableId,
    deliveryZoneId: nullableId,
    timeWindowId: z.string().trim().min(1).max(100),
    includedAccessoryId: nullableId,
    message: z.string().trim().max(280).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (usdToCents(value.amountUsd) === null) {
      context.addIssue({
        code: "custom",
        path: ["amountUsd"],
        message: "Use a positive USD amount with no more than two decimal places.",
      });
    }
    if (value.fulfillment === "pickup") {
      if (!value.meetingPlaceId) {
        context.addIssue({
          code: "custom",
          path: ["meetingPlaceId"],
          message: "Pickup requires a public meeting-place ID.",
        });
      }
      if (value.deliveryZoneId) {
        context.addIssue({
          code: "custom",
          path: ["deliveryZoneId"],
          message: "Pickup cannot include a delivery zone.",
        });
      }
    } else {
      if (!value.deliveryZoneId) {
        context.addIssue({
          code: "custom",
          path: ["deliveryZoneId"],
          message: "Delivery requires a public delivery-zone ID.",
        });
      }
      if (value.meetingPlaceId) {
        context.addIssue({
          code: "custom",
          path: ["meetingPlaceId"],
          message: "Delivery cannot include a pickup meeting place.",
        });
      }
    }
  });

export type DealCommand = z.infer<typeof dealCommandSchema>;

export const budgetCommandSchema = z
  .object({ maxTotalUsd: z.number().finite().positive().max(100_000) })
  .strict()
  .superRefine((value, context) => {
    if (usdToCents(value.maxTotalUsd) === null) {
      context.addIssue({
        code: "custom",
        path: ["maxTotalUsd"],
        message: "Use a positive USD amount with no more than two decimal places.",
      });
    }
  });

const modelTermsSchema = z
  .object({
    itemPriceCents: z.number().int().positive(),
    fulfillment: z.enum(["pickup", "delivery"]),
    meetingPlaceId: z.string().min(1).nullable(),
    deliveryZoneId: z.string().min(1).nullable(),
    timeWindowId: z.string().min(1),
    deliveryFeeCents: z.number().int().nonnegative(),
    includedAccessoryId: z.string().min(1).nullable(),
  })
  .strict();

export const modelDecisionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("accept"), message: z.string().trim().min(1).max(280) }).strict(),
  z.object({ action: z.literal("reject"), message: z.string().trim().min(1).max(280) }).strict(),
  z
    .object({
      action: z.literal("counter"),
      terms: modelTermsSchema,
      message: z.string().trim().min(1).max(280),
    })
    .strict(),
]);

export function termsFromDealCommand(
  command: DealCommand,
  listingDeliveryFeeCents: number,
): DealTerms {
  const itemPriceCents = usdToCents(command.amountUsd);
  if (itemPriceCents === null) {
    throw new RangeError("amountUsd must have no more than two decimal places.");
  }

  return {
    itemPriceCents,
    fulfillment: command.fulfillment,
    meetingPlaceId: command.fulfillment === "pickup" ? command.meetingPlaceId ?? null : null,
    deliveryZoneId: command.fulfillment === "delivery" ? command.deliveryZoneId ?? null : null,
    timeWindowId: command.timeWindowId,
    deliveryFeeCents: command.fulfillment === "delivery" ? listingDeliveryFeeCents : 0,
    includedAccessoryId: command.includedAccessoryId ?? null,
  };
}

export function fallbackSellerDecision(input: {
  askingPriceCents: number;
  floorPriceCents: number;
  round: number;
  maxRounds: number;
  currentTerms: DealTerms;
}): SellerDecision {
  if (input.currentTerms.itemPriceCents >= input.askingPriceCents) {
    return {
      action: "accept",
      message: "That works for me. Let's send these terms to both humans for approval.",
    };
  }

  const gap = input.askingPriceCents - input.floorPriceCents;
  const progress = Math.min(1, input.round / input.maxRounds);
  const concessionShare = Math.min(0.9, 0.65 + progress * 0.4);
  const roundedTarget = Math.round(
    (input.askingPriceCents - gap * concessionShare) / 500,
  ) * 500;
  const target = Math.max(
    input.floorPriceCents,
    Math.min(input.askingPriceCents, roundedTarget),
  );

  if (input.currentTerms.itemPriceCents >= target) {
    return {
      action: "accept",
      message: "Those terms are fair. Let's put the deal in front of both humans.",
    };
  }

  return {
    action: "counter",
    terms: { ...input.currentTerms, itemPriceCents: target },
    message: `I can meet you at $${(target / 100).toFixed(2)} with the proposed handoff terms.`,
  };
}
