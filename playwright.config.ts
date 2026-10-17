import { defineConfig, devices } from "@playwright/test";

// Runs against the production standalone Node server, not `next dev`.
// On a slow (HDD-backed) filesystem, Turbopack's first-hit-per-route compile
// cost under `next dev` pushed startup past the old 120s webServer timeout.
// A production build pays its compile cost once, up front, during
// `npm run build` (run before this suite by `test:e2e`), so the server
// Playwright waits on here only has to boot, not compile — reliable
// regardless of disk speed.
//
// For iterating against `next dev` instead (e.g. testing a page without a
// full rebuild), use `npm run test:e2e:dev`, which loads
// playwright.dev.config.ts.
const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  timeout: 45_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    trace: "on-first-retry",
    navigationTimeout: 30_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run start",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
