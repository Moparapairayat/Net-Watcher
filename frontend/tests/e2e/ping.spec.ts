import { expect, test } from "@playwright/test";
import { loginAsVerifiedUser, resolveOrigin } from "./helpers/auth";

test("verified user can log in and run ICMP ping", async ({ page, request, baseURL }) => {
  const origin = resolveOrigin(baseURL);
  await loginAsVerifiedUser(page, request, origin, {
    name: "Ping Operator",
  });

  await page.goto("/icmp-ping");
  await page.getByPlaceholder("example.com or 8.8.8.8").fill("127.0.0.1");
  await page.getByRole("button", { name: /run icmp ping/i }).click();

  await expect(page.getByText("Awaiting telemetry results.")).not.toBeVisible({ timeout: 20_000 });
  await expect(page.locator("tbody tr").first()).toBeVisible();
  await expect(page.getByText("Latency (ms)")).toBeVisible();
});
