import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "apps/web/tests/playwright",
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: "http://127.0.0.1:3000",
    headless: true,
  },
  webServer: {
    command: "pnpm --filter @doppel/web dev --port 3000",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === "1",
    timeout: 120_000,
  },
});
