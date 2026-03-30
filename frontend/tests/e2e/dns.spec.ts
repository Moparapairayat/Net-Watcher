import { expect, test } from "@playwright/test";
import { loginAsVerifiedUser, resolveOrigin } from "./helpers/auth";

test("dns inspector runs a lookup and renders record sections", async ({ page, request, baseURL }) => {
  const origin = resolveOrigin(baseURL);
  await loginAsVerifiedUser(page, request, origin, {
    name: "DNS Operator",
  });

  await page.goto("/dns-lookup");

  const lookupResponsePromise = page.waitForResponse((response) =>
    response.url().includes("/api/dnslookup") && response.request().method() === "POST",
  );

  await page.locator("#dns-target").fill("example.com");
  await page.getByRole("button", { name: /run lookup/i }).click();

  const lookupResponse = await lookupResponsePromise;
  expect(lookupResponse.ok()).toBeTruthy();

  await expect(page.getByRole("heading", { name: "A Records", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "MX Records", exact: true })).toBeVisible();
  await expect(page.getByText("example.com", { exact: false }).first()).toBeVisible();
});
