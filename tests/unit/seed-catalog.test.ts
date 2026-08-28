import { describe, expect, it } from "vitest";
import { additionalListingRows } from "@/db/seed-catalog";

describe("demo seed catalog", () => {
  it("adds at least 20 valid, varied bicycles", () => {
    expect(additionalListingRows.length).toBeGreaterThanOrEqual(20);
    expect(new Set(additionalListingRows.map((listing) => listing.id)).size).toBe(additionalListingRows.length);
    expect(new Set(additionalListingRows.map((listing) => listing.title)).size).toBe(additionalListingRows.length);
    expect(additionalListingRows.every((listing) => listing.floorPriceCents <= listing.askingPriceCents)).toBe(true);
    expect(additionalListingRows.some((listing) => listing.allowsDelivery)).toBe(true);
    expect(additionalListingRows.some((listing) => !listing.allowsDelivery)).toBe(true);
  });
});
