import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  webServer: [
    {
      command: 'npm run build --workspace apps/traveler && npm run start --workspace apps/traveler',
      url: 'http://localhost:3001/login',
      reuseExistingServer: !process.env.CI,
      timeout: 300_000,
      env: { ...process.env, NEXT_PUBLIC_API_URL: 'http://localhost:3000/api' },
    },
    {
      command: 'npm run build --workspace apps/agency && npm run start --workspace apps/agency',
      url: 'http://localhost:3002/login',
      reuseExistingServer: !process.env.CI,
      timeout: 300_000,
      env: { ...process.env, NEXT_PUBLIC_API_URL: 'http://localhost:3000/api' },
    },
    {
      command: 'npm run build --workspace apps/admin && npm run start --workspace apps/admin',
      url: 'http://localhost:3003/login',
      reuseExistingServer: !process.env.CI,
      timeout: 300_000,
      env: { ...process.env, NEXT_PUBLIC_API_URL: 'http://localhost:3000/api' },
    },
  ],
  projects: [
    {
      name: 'traveler',
      testMatch: /traveler\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:3001',
        channel: process.platform === 'win32' ? 'chrome' : undefined,
      },
    },
    {
      name: 'agency',
      testMatch: /agency\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:3002',
        channel: process.platform === 'win32' ? 'chrome' : undefined,
      },
    },
    {
      name: 'admin',
      testMatch: /admin\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:3003',
        channel: process.platform === 'win32' ? 'chrome' : undefined,
      },
    },
  ],
});
