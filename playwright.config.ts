import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  expect: {
    timeout: 7_000
  },
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: 'http://localhost:8080',
    trace: 'on-first-retry'
  },
  projects: [
    {
      name: 'desktop chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'mobile pixel 5',
      use: { ...devices['Pixel 5'] }
    }
  ],
  webServer: {
    command: 'node server/index.js',
    port: 8080,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000
  }
});
