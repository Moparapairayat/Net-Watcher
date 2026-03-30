import { expect, test } from "@playwright/test";
import { loginAsVerifiedUser, resolveOrigin } from "./helpers/auth";

test("verified user can run TCP ping against the local edge", async ({ page, request, baseURL }) => {
  const origin = resolveOrigin(baseURL);
  await loginAsVerifiedUser(page, request, origin, {
    name: "TCP Operator",
  });

  await page.goto("/tcp-ping");
  await page.getByPlaceholder("example.com or 8.8.8.8").fill("127.0.0.1");
  await page.locator("div").filter({ has: page.getByText("Port", { exact: true }) }).locator("input[type='number']").first().fill("8080");
  await page.getByRole("button", { name: /run tcp ping/i }).click();

  await expect(page.getByText("Awaiting telemetry results.")).not.toBeVisible({ timeout: 20_000 });
  await expect(page.locator("table.data-table tbody tr").first()).toBeVisible();
  await expect(page.getByText("Telemetry Summary")).toBeVisible();
});

test("verified user can run port scan and receive streamed results", async ({ page, request, baseURL }) => {
  const origin = resolveOrigin(baseURL);
  await loginAsVerifiedUser(page, request, origin, {
    name: "PortScan Operator",
  });

  await page.goto("/port-scan");
  await page.getByPlaceholder("example.com").fill("127.0.0.1");
  await page.getByPlaceholder("22,80,443,8080").fill("8080,65535");
  await page.getByRole("button", { name: /run port scan/i }).click();

  await expect(page.getByText("Awaiting port results.")).not.toBeVisible({ timeout: 20_000 });
  await expect(page.locator("table tbody tr").first()).toBeVisible();
  await expect(page.getByText("Exposure Summary")).toBeVisible();
});
