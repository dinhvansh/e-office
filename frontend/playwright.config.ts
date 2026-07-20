import { defineConfig, devices } from "@playwright/test";

// Require environment variable - no fallback to localhost
if (!process.env.PLAYWRIGHT_BASE_URL) {
  throw new Error('PLAYWRIGHT_BASE_URL environment variable is required');
}

const baseURL = process.env.PLAYWRIGHT_BASE_URL;
const browserChannel = process.env.PLAYWRIGHT_BROWSER_CHANNEL || undefined;

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL,
    headless: true,
    viewport: { width: 1280, height: 720 },
    actionTimeout: 10_000,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { 
        ...devices["Desktop Chrome"],
        ...(browserChannel ? { channel: browserChannel } : {}),
      },
    },
  ],
  webServer: process.env.PLAYWRIGHT_MANAGED_SERVER === "1" ? {
    command: "npx next dev --webpack -p 3211",
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      NEXT_PUBLIC_API_BASE_URL: "http://127.0.0.1:4010/api/v1",
      NEXT_PUBLIC_API_URL: "http://127.0.0.1:4010/api/v1",
    },
  } : undefined,
});
