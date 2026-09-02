import { expect, test } from "@playwright/test";

const LISTING_PATH = "/listings/10000000-0000-4000-8000-000000000001";

test("buyer and seller humans close the deterministic agent-negotiated deal", async ({ page, browser }) => {
  await page.goto(LISTING_PATH);

  await page.getByLabel("Your item price").fill("165");
  await page.locator('select[name="timeWindowId"]').selectOption("sat-2-4");
  await page.getByRole("button", { name: "Send terms to seller agent" }).click();

  await expect(page.getByText("The seller agent is considering your terms…")).toBeVisible();
  await expect(page.getByRole("button", { name: "Accept terms" })).toBeVisible();
  await expect(page.getByText("$185", { exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: "Accept terms" }).click();
  await expect(page.getByRole("button", { name: "Approve these terms" })).toBeVisible();
  await page.getByLabel("If these terms do not work").fill("Try $180 if the lock stays included.");
  await page.getByRole("button", { name: "Decline & keep negotiating" }).click();
  await expect(page.getByText("Your agent has the next move.")).toBeVisible();
  await expect(page.getByText(/Try \$180 if the lock stays included/)).toBeVisible();

  const negotiationId = await page.evaluate(async () => {
    const response = await fetch("/api/negotiations", { cache: "no-store" });
    const result = (await response.json()) as { negotiations: Array<{ id: string; status: string }> };
    return result.negotiations.find((item) => item.status === "buyer_turn")!.id;
  });
  const statusAfterDecline = await page.evaluate(async (id) => {
    const response = await fetch(`/api/negotiations/${id}/status`, { cache: "no-store" });
    return response.json() as Promise<{
      negotiation: {
        principalDecision: { reason: string };
        possibleActions: string[];
      };
    }>;
  }, negotiationId);
  expect(statusAfterDecline.negotiation.principalDecision.reason).toBe("Try $180 if the lock stays included.");
  expect(statusAfterDecline.negotiation.possibleActions).toContain("counter_offer");
  expect(statusAfterDecline.negotiation.possibleActions).not.toContain("accept_deal");

  await page.evaluate(async (id) => {
    await fetch(`/api/negotiations/${id}/counter`, {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
      body: JSON.stringify({ negotiationId: id, amountUsd: 180, keepCurrentTerms: true }),
    });
  }, negotiationId);
  await expect(page.getByRole("button", { name: "Approve these terms" })).toBeVisible();
  await page.getByRole("button", { name: "Approve these terms" }).click();
  await expect(page.getByRole("button", { name: "You approved" })).toBeVisible();

  const otherSession = await browser.newContext();
  const otherPage = await otherSession.newPage();
  await otherPage.goto("/sellers");
  await expect(otherPage.getByText("Terms found · Moss Green Trek FX 2")).toHaveCount(0);
  const foreignApprovalStatus = await otherPage.evaluate(async (id) => {
    const response = await fetch(`/api/sellers/negotiations/${id}/approve`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sellerPersonaId: "33333333-3333-4333-8333-333333333333" }),
    });
    return response.status;
  }, negotiationId);
  expect(foreignApprovalStatus).toBe(404);
  await otherSession.close();

  await page.goto("/sellers");
  await expect(page.getByText("Terms found · Moss Green Trek FX 2")).toBeVisible();
  await page.getByRole("button", { name: "Approve sale" }).click();
  await expect(page.getByText(/Both humans approved/i)).toBeVisible();

  await page.goto(LISTING_PATH);
  await expect(page.getByText("Deal closed", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Both people said yes.")).toBeVisible();
});
