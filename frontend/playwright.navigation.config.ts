import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: 'role-aware-navigation.spec.ts',
  timeout: 60_000,
  use: { baseURL: 'http://127.0.0.1:3012', headless: true, viewport: { width: 1280, height: 720 } },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  globalTeardown: './scripts/cleanup-navigation-test-output.mjs',
  webServer: {
    command: 'node scripts/start-navigation-test-server.mjs',
    url: 'http://127.0.0.1:3012/login',
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
