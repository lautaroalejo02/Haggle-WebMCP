import { expect, test } from "@playwright/test";

const LISTING_ID = "10000000-0000-4000-8000-000000000001";

type RegisteredTool = {
  annotations?: { readOnlyHint: boolean; untrustedContentHint: boolean };
  execute: (input: Record<string, unknown>) => Promise<{ content: Array<{ type: string; text: string }> }>;
};

test("registers a minimal dynamic WebMCP surface and returns guarded output", async ({ page }) => {
  test.setTimeout(90_000);
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
    .toEqual(expect.arrayContaining(["search_listings", "get_listing", "prepare_negotiation", "get_my_negotiations", "get_negotiation_status", "set_budget", "make_offer"]));
  await page.getByRole("button", { name: "Open Agent Lens" }).click();
  await expect(page.getByText("Page tools registered · agent unverified", { exact: true })).toBeVisible();
  await expect(page.getByText(/Registration does not prove agent access/)).toBeVisible();
  await page.getByRole("button", { name: "Close Agent Lens" }).last().click();

  const annotationSnapshot = await page.evaluate(() => {
    const tools = (window as unknown as { __haggleTestTools: Map<string, RegisteredTool> }).__haggleTestTools;
    return {
      search: tools.get("search_listings")?.annotations,
      budget: tools.get("set_budget")?.annotations,
      offer: tools.get("make_offer")?.annotations,
    };
  });
  expect(annotationSnapshot).toEqual({
    search: { readOnlyHint: true, untrustedContentHint: true },
    budget: { readOnlyHint: false, untrustedContentHint: false },
    offer: { readOnlyHint: false, untrustedContentHint: true },
  });

  const searchResult = await executeTool(page, "search_listings", { query: "bike" });
  expect(searchResult.securityNotice).toContain("untrusted user data");
  expect(Array.isArray(searchResult.listings)).toBe(true);
  expect(searchResult).toMatchObject({
    resultCount: expect.any(Number),
    totalMatches: expect.any(Number),
    hasMore: expect.any(Boolean),
  });
  expect((searchResult.listings as unknown[]).length).toBeLessThanOrEqual(8);

  const listingResult = await executeTool(page, "prepare_negotiation", { listingId: LISTING_ID });
  expect(listingResult.listing).not.toHaveProperty("floorPriceCents");
  expect(JSON.stringify(listingResult)).not.toContain("policyPrompt");
  expect(listingResult).toMatchObject({
    priceStatus: "asking_price",
    sellerHasResponded: false,
    negotiation: null,
    nextRecommendedTool: "make_offer",
  });

  if ((await registeredToolNames(page)).includes("set_mandate")) {
    const mandateResult = await executeTool(page, "set_mandate", {
      listingId: LISTING_ID,
      mandate: {
        maxPrice: 170,
        pickupWindows: [{ day: "Saturday", from: "14:00", to: "16:00" }],
        placePolicy: "public_only",
        mustInclude: ["U-lock"],
      },
    });
    expect(mandateResult).toMatchObject({
      ok: true,
      mandate: { maxPriceCents: 17_000, placePolicy: "public_only", mustInclude: ["U-lock"] },
    });
  }

  await executeTool(page, "make_offer", {
    listingId: LISTING_ID,
    amountUsd: 165,
    fulfillment: "pickup",
    meetingPlaceId: "riverside-library",
    timeWindowId: "sat-2-4",
    includedAccessoryId: "u-lock",
    message: "A normal buyer note.",
  });

  await expect.poll(() => registeredToolNames(page)).not.toContain("make_offer");

  await expect.poll(() => registeredToolNames(page)).toContain("counter_offer");

  const negotiationsResult = await executeTool(page, "get_my_negotiations", {});
  const serialized = JSON.stringify(negotiationsResult);
  expect(serialized).not.toContain("A normal buyer note.");
  expect(negotiationsResult.negotiations).toHaveLength(1);
  const negotiation = (negotiationsResult.negotiations as Array<Record<string, unknown>>)[0];
  expect(negotiation).not.toHaveProperty("history");

  if ((await registeredToolNames(page)).includes("get_mandate")) {
    await expect.poll(() => registeredToolNames(page)).toContain("accept_deal");
    const blocked = await executeTool(page, "accept_deal", { negotiationId: negotiation.id });
    expect(blocked).toMatchObject({
      ok: false,
      error: {
        code: "BLOCKED_BY_MANDATE",
        reason: "exceeds max price",
        detail: { term: "price", proposed: 18_500, limit: 17_000 },
      },
    });
    const status = await executeTool(page, "get_negotiation_status", { negotiationId: negotiation.id });
    expect(status.negotiation).toMatchObject({ mandate: { maxPriceCents: 17_000 } });
    expect(JSON.stringify(status)).toContain("Blocked by your mandate, not by your agent");
  }

  const counterResult = await executeTool(page, "counter_offer", {
    negotiationId: negotiation.id,
    amountUsd: 170,
    keepCurrentTerms: true,
  });
  expect(counterResult.negotiation).toMatchObject({
    currentProposal: {
      terms: {
        itemPriceCents: 17_000,
        fulfillment: "pickup",
        meetingPlaceId: "riverside-library",
        timeWindowId: "sat-2-4",
        includedAccessoryId: "u-lock",
      },
    },
  });

  await expect.poll(() => registeredToolNames(page)).toContain("reject_deal");
  await executeTool(page, "reject_deal", { negotiationId: negotiation.id });
});

test("supports Chrome's AbortSignal tool lifecycle", async ({ page }) => {
  await page.addInitScript(() => {
    const tools = new Map<string, RegisteredTool>();
    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: {
        registerTool(
          tool: RegisteredTool & { name: string },
          options?: { signal?: AbortSignal },
        ) {
          tools.set(tool.name, tool);
          options?.signal?.addEventListener(
            "abort",
            () => tools.delete(tool.name),
            { once: true },
          );
        },
      },
    });
    Object.defineProperty(window, "__haggleTestTools", { configurable: true, value: tools });
  });

  await page.goto(`/listings/${LISTING_ID}`);

  await expect
    .poll(() => registeredToolNames(page))
    .toEqual(expect.arrayContaining(["search_listings", "get_listing", "prepare_negotiation", "make_offer"]));

  await page.goto("/");
  await expect.poll(() => registeredToolNames(page)).not.toContain("make_offer");
  await expect.poll(() => registeredToolNames(page)).toContain("search_listings");
});

test("previews the real tool catalog when WebMCP is unavailable", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");

  await expect(page.getByText("Static illustration · not an active offer", { exact: true })).toBeVisible();
  await expect(page.getByText(/agents must not treat these terms as marketplace or negotiation data/)).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Open Agent Lens" }).click();
  await expect(page.getByText("Browser WebMCP API unavailable", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Agent Lens", { exact: true }).getByText(/These tools activate in ChatGPT's browser/)).toBeVisible();
  await expect(page.getByText("Configured catalog · inactive", { exact: true })).toBeVisible();
  await expect(page.getByText("Preview catalog", { exact: true })).toBeVisible();
  await expect(page.getByText("search_listings", { exact: true })).toBeVisible();
  await page.getByText("Input schema", { exact: true }).first().click();
  await expect(page.locator("pre").first()).toContainText('"maxPriceUsd"');
  await expect(page.getByRole("link", { name: "How to try" }).first()).toHaveAttribute("href", "/how-to-try");

  await page.getByRole("button", { name: "Close Agent Lens" }).last().click();
  await page.goto(`/listings/${LISTING_ID}`);
  await page.getByRole("button", { name: "Open Agent Lens" }).click();
  await expect(page.getByLabel("Agent Lens", { exact: true }).getByText("make_offer", { exact: true })).toBeVisible();
});

test("offers a short judge walkthrough", async ({ page }) => {
  await page.goto("/how-to-try");
  await expect(page.getByRole("heading", { name: "Try Haggle with your agent." })).toBeVisible();
  await expect(page.getByText("Open Haggle with an agent", { exact: true })).toBeVisible();
  await expect(page.getByText("Copy the prompt", { exact: true })).toBeVisible();
  await expect(page.getByText("Watch the tools change", { exact: true })).toBeVisible();
  await expect(page.getByText("Keep the final say", { exact: true })).toBeVisible();
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
