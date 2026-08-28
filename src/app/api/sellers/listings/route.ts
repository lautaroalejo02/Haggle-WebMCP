import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/db/client";
import {
  listingAccessories,
  listingAvailabilityWindows,
  listingMeetingPlaces,
  listings,
} from "@/db/schema";
import { usdToCents } from "@/lib/marketplace/contracts";
import { apiErrorResponse, readJson } from "@/lib/server/api";

const listingDraftSchema = z
  .object({
    sellerPersonaId: z.uuid(),
    title: z.string().trim().min(3).max(100),
    description: z.string().trim().min(10).max(800),
    condition: z.enum(["Excellent", "Very good", "Good", "Fair"]),
    neighborhood: z.string().trim().min(2).max(80),
    askingPriceUsd: z.coerce.number().positive().max(100_000),
    floorPriceUsd: z.coerce.number().positive().max(100_000),
  })
  .strict()
  .refine((value) => value.floorPriceUsd <= value.askingPriceUsd, {
    path: ["floorPriceUsd"],
    message: "Private minimum cannot exceed the asking price.",
  });

export async function POST(request: NextRequest) {
  try {
    const input = listingDraftSchema.parse(await readJson(request));
    const askingPriceCents = usdToCents(input.askingPriceUsd);
    const floorPriceCents = usdToCents(input.floorPriceUsd);
    if (askingPriceCents === null || floorPriceCents === null) {
      throw new z.ZodError([
        {
          code: "custom",
          path: ["askingPriceUsd"],
          message: "Prices may have at most two decimal places.",
          input: input.askingPriceUsd,
        },
      ]);
    }

    const id = crypto.randomUUID();
    const photoUrl = `https://picsum.photos/seed/haggle-${id}/1200/900`;
    const db = getDatabase();
    await db.transaction(async (tx) => {
      await tx.insert(listings).values({
        id,
        sellerPersonaId: input.sellerPersonaId,
        title: input.title,
        description: input.description,
        condition: input.condition,
        neighborhood: input.neighborhood,
        photoUrl,
        askingPriceCents,
        floorPriceCents,
        status: "active",
        allowsPickup: true,
        allowsDelivery: false,
        deliveryFeeCents: 0,
      });
      await tx.insert(listingMeetingPlaces).values([
        { listingId: id, meetingPlaceId: "riverside-library" },
        { listingId: id, meetingPlaceId: "central-station-plaza" },
      ]);
      await tx.insert(listingAvailabilityWindows).values([
        { listingId: id, availabilityWindowId: "sat-10-12" },
        { listingId: id, availabilityWindowId: "sat-2-4" },
        { listingId: id, availabilityWindowId: "sun-11-1" },
      ]);
      await tx.insert(listingAccessories).values([
        { listingId: id, accessoryId: "u-lock" },
        { listingId: id, accessoryId: "lights" },
      ]);
    });

    return NextResponse.json(
      {
        ok: true,
        summary: `${input.title} is now listed and ready for structured pickup offers.`,
        listing: {
          id,
          title: input.title,
          askingPriceCents,
          status: "active",
        },
        possibleNextActions: [],
      },
      { status: 201 },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
