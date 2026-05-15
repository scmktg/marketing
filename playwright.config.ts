import { defineConfig, devices } from "@playwright/test";

// One e2e spec in v1: the login → dashboard smoke (tests/e2e/login.spec.ts).
// The onboarding e2e replaces it in feat/onboarding once the wizard exists.
// See PLAN.md §11.2.
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // CI runs against a pre-built app started by the workflow; locally,
  // start the dev server yourself with `pnpm dev`.
  webServer: process.env.CI
    ? undefined
    : {
        command: "pnpm dev",
        url: "http://localhost:3000",
        reuseExistingServer: true,
        timeout: 60_000,
      },
});
