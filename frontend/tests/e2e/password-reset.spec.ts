import { expect, test } from "@playwright/test";
import { provisionVerifiedUser, resolveOrigin } from "./helpers/auth";

test("verified user can request a reset link and sign in with the new password", async ({ page, request, baseURL }) => {
  const origin = resolveOrigin(baseURL);
  const user = await provisionVerifiedUser(request, origin, {
    name: "Recovery Operator",
  });
  const newPassword = "StrongerPass456!";

  await page.goto("/forgot-password");

  const forgotResponsePromise = page.waitForResponse((response) =>
    response.url().includes("/api/auth/forgot-password") && response.request().method() === "POST",
  );

  await page.getByLabel("Email").fill(user.email);
  await page.getByRole("button", { name: /send reset link/i }).click();

  const forgotResponse = await forgotResponsePromise;
  expect(forgotResponse.ok()).toBeTruthy();
  const forgotPayload = await forgotResponse.json();
  expect(
    forgotPayload.preview_url,
    "preview_url is only available when email delivery is disabled and the request host is loopback",
  ).toBeTruthy();

  await page.goto(forgotPayload.preview_url);
  await page.locator("#reset-password").fill(newPassword);
  await page.locator("#reset-confirm-password").fill(newPassword);
  await page.getByRole("button", { name: /set password/i }).click();

  await expect(page).toHaveURL(/\/login$/);

  await page.getByLabel("Email").fill(user.email);
  await page.locator("#login-password").fill(newPassword);
  await page.getByRole("button", { name: /^login$/i }).click();

  await expect(page.getByText("Network Operations Overview")).toBeVisible({ timeout: 20_000 });
});
