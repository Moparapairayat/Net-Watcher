import { expect, test } from "@playwright/test";
import { loginAsVerifiedUser, resolveOrigin } from "./helpers/auth";

test("history page loads stored ping data after a run", async ({ page, request, baseURL }) => {
  const origin = resolveOrigin(baseURL);
  await loginAsVerifiedUser(page, request, origin, {
    name: "History Operator",
  });

  await page.goto("/icmp-ping");
  await page.getByPlaceholder("example.com or 8.8.8.8").fill("127.0.0.1");
  await page.getByRole("button", { name: /run icmp ping/i }).click();
  await expect(page.locator("table.data-table tbody tr").first()).toBeVisible({ timeout: 20_000 });

  await page.goto("/history");
  await page.locator("#history-host").fill("127.0.0.1");
  await page.getByRole("button", { name: /load history/i }).click();

  await expect(page.getByText("Trend + Stored Points")).toBeVisible();
  await expect(page.locator("table.data-table tbody tr").first()).toBeVisible();
  await expect(page.getByRole("button", { name: /export json/i })).toBeEnabled();
});
