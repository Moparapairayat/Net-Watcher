import { expect, test } from "@playwright/test";

test("signup and verify flow reaches the dashboard", async ({ page }) => {
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
  const email = `signup-${nonce}@example.com`;
  const password = "StrongPass123!";
  const firstName = "Signup";
  const lastName = "Operator";

  await page.goto("/signup");

  await page.getByLabel("First name").fill(firstName);
  await page.getByLabel("Last name").fill(lastName);
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: /continue/i }).click();

  const signupResponsePromise = page.waitForResponse((response) =>
    response.url().includes("/api/auth/signup") && response.request().method() === "POST",
  );

  await page.locator("#signup-password").fill(password);
  await page.locator("#signup-confirm-password").fill(password);
  await page.getByRole("button", { name: /create account/i }).click();

  const signupResponse = await signupResponsePromise;
  expect(signupResponse.ok()).toBeTruthy();
  const signupPayload = await signupResponse.json();
  expect(signupPayload.preview_code).toBeTruthy();

  await expect(page.getByText(email)).toBeVisible();

  const verifyResponsePromise = page.waitForResponse((response) =>
    response.url().includes("/api/auth/verify-email") && response.request().method() === "POST",
  );

  await page.locator("#verify-code").fill(signupPayload.preview_code);
  await page.getByRole("button", { name: /verify email/i }).click();

  const verifyResponse = await verifyResponsePromise;
  expect(verifyResponse.ok()).toBeTruthy();

  const successHeading = page.getByText("Account ready");
  const dashboardHeading = page.getByText("Network Operations Overview");

  try {
    await expect(successHeading).toBeVisible({ timeout: 5_000 });
    await page.getByRole("button", { name: /open dashboard/i }).click();
  } catch {
    // The success step auto-redirects after a short hold, so the dashboard may already be open.
  }

  await expect(dashboardHeading).toBeVisible({ timeout: 20_000 });
});

