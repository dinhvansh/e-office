import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests', testMatch: 'legal-pages.spec.ts', timeout: 60_000,
  use: { baseURL: 'http://127.0.0.1:3014', headless: true, viewport: { width: 1280, height: 720 } },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: { command: 'set NEXT_DIST_DIR=.next-ux001&& set NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:4010/api/v1&& next dev -p 3014', url: 'http://127.0.0.1:3014/login', reuseExistingServer: false, timeout: 60_000 },
});
