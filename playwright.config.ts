import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  forbidOnly: !!process.env.CI,
  workers: process.env.CI ? 1 : undefined,
  use: {
    baseURL: "http://localhost:3001",
    trace: process.env.CI ? "retain-on-failure" : "on-first-retry",
  },
  webServer: {
    command: process.env.CI
      ? "npm run start -- --port 3001"
      : "npm run dev -- --port 3001",
    url: "http://localhost:3001",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
