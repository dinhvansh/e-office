import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: 'workflow-preview-localization.spec.ts',
  timeout: 60_000,
  use: { baseURL: 'http://127.0.0.1:3015', headless: true, viewport: { width: 1280, height: 720 } },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  globalTeardown: './scripts/cleanup-ux016-output.mjs',
  webServer: { command: 'node scripts/start-ux016-test-server.mjs', url: 'http://127.0.0.1:3015/login', reuseExistingServer: false, timeout: 60_000 },
});
