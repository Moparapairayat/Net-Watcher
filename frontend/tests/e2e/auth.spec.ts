import { expect, test } from "@playwright/test";

test("signup and verify flow reaches the dashboard", async ({ page }) => {
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
  const email = `signup-${nonce}@example.com`;
  const password = "StrongPass123!";
  const name = "Signup Operator";

  await page.goto("/signup");

  const signupResponsePromise = page.waitForResponse((response) =>
    response.url().includes("/api/auth/signup") && response.request().method() === "POST",
  );

  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.locator("#signup-password").fill(password);
  await page.getByRole("button", { name: /create account/i }).click();

  const signupResponse = await signupResponsePromise;
  expect(signupResponse.ok()).toBeTruthy();
  const signupPayload = await signupResponse.json();
  expect(signupPayload.preview_code).toBeTruthy();

  await expect(page).toHaveURL(/\/verify-email\?email=/);
  await expect(page.getByLabel("Email")).toHaveValue(email);

  const verifyResponsePromise = page.waitForResponse((response) =>
    response.url().includes("/api/auth/verify-email") && response.request().method() === "POST",
  );

  await page.locator("#verify-code").fill(signupPayload.preview_code);
  await page.getByRole("button", { name: /verify email/i }).click();

  const verifyResponse = await verifyResponsePromise;
  expect(verifyResponse.ok()).toBeTruthy();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText("Network Operations Overview")).toBeVisible();
});

