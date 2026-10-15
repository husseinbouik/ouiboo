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
      // Mock API server — serves test data for both SSR (server-side fetches)
      // and browser requests. Must start before the Next.js apps.
      command: 'node e2e/mock-api-server.mjs 3000',
      url: 'http://localhost:3000/api/trips',
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      // Standalone builds: `next start` doesn't serve them; use the built server directly.
      // Apps are built in a separate CI step; the webServer only serves.
      command: 'PORT=3001 node apps/traveler/.next/standalone/server.js',
      url: 'http://localhost:3001/login',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: { ...process.env, NEXT_PUBLIC_API_URL: 'http://localhost:3000/api' },
    },
    {
      command: 'PORT=3002 node apps/agency/.next/standalone/server.js',
      url: 'http://localhost:3002/login',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: { ...process.env, NEXT_PUBLIC_API_URL: 'http://localhost:3000/api' },
    },
    {
      command: 'PORT=3003 node apps/admin/.next/standalone/server.js',
      url: 'http://localhost:3003/login',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
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
