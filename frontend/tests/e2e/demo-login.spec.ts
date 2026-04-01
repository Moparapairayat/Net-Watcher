import { expect, test } from "@playwright/test";

test("contributors can enter the full dashboard through demo login", async ({ page }) => {
  await page.goto("/login");

  await page.getByRole("button", { name: /continue as demo/i }).click();

  await expect(page.getByText("Network Operations Overview")).toBeVisible({ timeout: 20_000 });
  await page.goto("/alerts");
  await expect(page.getByRole("heading", { name: /alert rules/i })).toBeVisible();
});
