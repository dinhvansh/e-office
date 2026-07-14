import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: 'destructive-confirmation.spec.ts',
  timeout: 60_000,
  use: { baseURL: 'http://127.0.0.1:3013', headless: true, viewport: { width: 1280, height: 720 } },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  globalTeardown: './scripts/cleanup-ux006-output.mjs',
  webServer: { command: 'node scripts/start-destructive-confirmation-test-server.mjs', url: 'http://127.0.0.1:3013/login', reuseExistingServer: false, timeout: 60_000 },
});
