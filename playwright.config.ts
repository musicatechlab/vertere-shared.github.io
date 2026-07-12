import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 180_000,
  workers: 1,
  reporter: 'line',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    headless: true,
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
