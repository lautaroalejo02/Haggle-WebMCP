import { expect, test } from "@playwright/test";

const LISTING_ID = "10000000-0000-4000-8000-000000000006";

type RegisteredTool = {
  execute: (input: Record<string, unknown>) => Promise<{ content: Array<{ type: string; text: string }> }>;
};

test("registers a minimal dynamic WebMCP surface and returns guarded output", async ({ page }) => {
  await page.addInitScript(() => {
    const tools = new Map<string, RegisteredTool>();
    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: {
        registerTool(tool: RegisteredTool & { name: string }) {
          tools.set(tool.name, tool);
        },
        unregisterTool(name: string) {
          tools.delete(name);
        },
      },
    });
    Object.defineProperty(window, "__haggleTestTools", { configurable: true, value: tools });
  });

  await page.goto(`/listings/${LISTING_ID}`);

  await expect
    .poll(() => registeredToolNames(page))
    .toEqual(expect.arrayContaining(["search_listings", "get_listing", "get_my_negotiations", "set_budget", "make_offer"]));

  const searchResult = await executeTool(page, "search_listings", { query: "bike" });
  expect(searchResult.securityNotice).toContain("untrusted user data");
  expect(Array.isArray(searchResult.listings)).toBe(true);
  expect((searchResult.listings as unknown[]).length).toBeLessThanOrEqual(6);

  const listingResult = await executeTool(page, "get_listing", { listingId: LISTING_ID });
  expect(listingResult.listing).not.toHaveProperty("floorPriceCents");
  expect(JSON.stringify(listingResult)).not.toContain("policyPrompt");

  await executeTool(page, "make_offer", {
    listingId: LISTING_ID,
    amountUsd: 165,
    fulfillment: "pickup",
    meetingPlaceId: "riverside-library",
    timeWindowId: "sat-2-4",
    includedAccessoryId: "helmet",
    message: "A normal buyer note.",
  });

  await expect.poll(() => registeredToolNames(page)).not.toContain("make_offer");

  const negotiationsResult = await executeTool(page, "get_my_negotiations", {});
  const serialized = JSON.stringify(negotiationsResult);
  expect(serialized).not.toContain("A normal buyer note.");
  expect(negotiationsResult.negotiations).toHaveLength(1);
  const negotiation = (negotiationsResult.negotiations as Array<Record<string, unknown>>)[0];
  expect(negotiation).not.toHaveProperty("history");

  await expect.poll(() => registeredToolNames(page)).toContain("reject_deal");
  await executeTool(page, "reject_deal", { negotiationId: negotiation.id });
});

async function registeredToolNames(page: import("@playwright/test").Page) {
  return page.evaluate(() =>
    Array.from(
      (window as unknown as { __haggleTestTools: Map<string, RegisteredTool> }).__haggleTestTools.keys(),
    ).sort(),
  );
}

async function executeTool(
  page: import("@playwright/test").Page,
  name: string,
  input: Record<string, unknown>,
) {
  return page.evaluate(
    async ({ toolName, toolInput }) => {
      const tools = (window as unknown as { __haggleTestTools: Map<string, RegisteredTool> }).__haggleTestTools;
      const tool = tools.get(toolName);
      if (!tool) throw new Error(`Tool ${toolName} is not registered.`);
      const result = await tool.execute(toolInput);
      return JSON.parse(result.content[0].text) as Record<string, unknown>;
    },
    { toolName: name, toolInput: input },
  );
}
