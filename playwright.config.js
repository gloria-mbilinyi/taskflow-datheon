import { defineConfig } from '@playwright/test';

const external = !!process.env.TASKFLOW_BASE_URL;
const baseURL = (process.env.TASKFLOW_BASE_URL || 'http://127.0.0.1:4173').replace(/\/?$/, '/');
export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  expect: { timeout: 5000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    browserName: 'chromium',
    channel: process.env.PLAYWRIGHT_CHANNEL || (process.platform === 'win32' ? 'chrome' : undefined),
    viewport: { width: 1440, height: 1000 },
    colorScheme: 'light',
    reducedMotion: 'reduce',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: external ? undefined : { command: 'node scripts/serve.mjs', url: baseURL, reuseExistingServer: !process.env.CI, timeout: 15000 },
});
