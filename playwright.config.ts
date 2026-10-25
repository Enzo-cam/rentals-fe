import { defineConfig, devices } from "@playwright/test";

import {
  E2E_ORIGIN_SECRET,
  FAKE_API_URL,
  FRONT_ORIGIN,
} from "./e2e/support/env";

/** Runs against `next start` (build first); one worker because the fake API holds global state. */
export default defineConfig({
  testDir: "e2e",
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: FRONT_ORIGIN,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "mobile-360",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 360, height: 740 },
        hasTouch: true,
        isMobile: true,
      },
    },
  ],
  webServer: [
    {
      command: "node e2e/support/fake-api.mjs",
      url: `${FAKE_API_URL}/__control/ping`,
      env: { ORIGIN_SECRET: E2E_ORIGIN_SECRET, FRONT_ORIGIN },
      reuseExistingServer: false,
    },
    {
      command: "pnpm start",
      url: FRONT_ORIGIN,
      env: {
        API_URL: FAKE_API_URL,
        ORIGIN_SECRET: E2E_ORIGIN_SECRET,
        FRONT_ORIGIN,
      },
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
