import { expect, test } from "@playwright/test";
import { loginAsVerifiedUser, resolveOrigin } from "./helpers/auth";

test("alerts page can create and render a new rule", async ({ page, request, baseURL }) => {
  const origin = resolveOrigin(baseURL);
  const user = await loginAsVerifiedUser(page, request, origin, {
    name: "Alerts Operator",
  });

  const createRuleResponse = await page.context().request.post("/api/alerts/rules", {
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
    },
    data: {
      name: "ICMP Localhost Alert",
      protocol: "ping",
      target: "127.0.0.1",
      recipient_email: user.email,
      latency_threshold_ms: 150,
      consecutive_breaches: 1,
      cooldown_minutes: 30,
      notify_on_recovery: true,
      enabled: true,
    },
  });
  expect(createRuleResponse.ok()).toBeTruthy();

  await page.goto("/alerts");
  await expect(page.getByRole("heading", { name: "ICMP Localhost Alert" })).toBeVisible();
  await expect(page.getByText("Latency >= 150ms")).toBeVisible();
});
