import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: 'ux011-config-guard.spec.ts',
  timeout: 60_000,
  use: { baseURL: 'http://127.0.0.1:3011', headless: true, viewport: { width: 1280, height: 720 } },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  globalTeardown: './scripts/cleanup-ux011-output.mjs',
  webServer: { command: 'node scripts/start-ux011-server.mjs', url: 'http://127.0.0.1:3011/login', reuseExistingServer: false, timeout: 60_000 },
});
