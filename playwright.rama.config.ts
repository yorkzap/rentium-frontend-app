import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/rama',
  workers: 1,
  timeout: 60_000,
  outputDir: '/private/tmp/rentium-rama-browser-results',
  use: {
    baseURL: process.env.WORKFLOW_E2E_URL || 'http://127.0.0.1:3109',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ...devices['Desktop Chrome'],
    channel: 'chrome',
  },
});
