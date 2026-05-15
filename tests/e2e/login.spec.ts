import { test, expect } from "@playwright/test";

// Smoke test: validates the e2e infrastructure works end-to-end.
// Replaced by the onboarding wizard spec in feat/onboarding.
test("login page renders and middleware redirects unauthenticated visitors", async ({ page }) => {
  await page.goto("/dashboard");
  // Unauthenticated → redirected to /login by the Supabase middleware.
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
});
