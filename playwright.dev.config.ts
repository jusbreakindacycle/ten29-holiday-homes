import { defineConfig, devices } from "@playwright/test";

// Dev-server variant of playwright.config.ts, for iterating on a page
// without paying for a full `next build` first. Single-worker and serial:
// against a Turbopack DEV server (not a production build), the first hit to
// each route pays a real compile cost, and parallel workers hammering a cold
// dev server produced flaky navigation timeouts that had nothing to do with
// application behavior (verified via curl). Not suitable as the default
// `test:e2e` gate on a slow (HDD-backed) filesystem — use `npm run
// test:e2e:dev` explicitly when this tradeoff is wanted.
const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3100";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  // A cold Turbopack route can take tens of seconds on the supported local
  // Windows/HDD setup; allow route-by-route browser checks to finish compiling.
  timeout: 240_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    trace: "on-first-retry",
    navigationTimeout: 120_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev -- --port 3100",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
