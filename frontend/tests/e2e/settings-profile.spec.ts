import { expect, test } from "@playwright/test";
import { loginAsVerifiedUser, resolveOrigin } from "./helpers/auth";

test("settings and profile pages render runtime and operator details", async ({ page, request, baseURL }) => {
  const origin = resolveOrigin(baseURL);
  const user = await loginAsVerifiedUser(page, request, origin, {
    name: "Profile Operator",
  });

  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "Deployment Status" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Database, Cache, Object Storage" })).toBeVisible();
  await expect(page.getByText("Redis Cache")).toBeVisible();

  await page.goto("/profile");
  await expect(page.getByText("Operator Profile")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Account Details" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Recovery & Access" })).toBeVisible();
  await expect(page.getByText(user.email).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /send reset email/i })).toBeVisible();
});
