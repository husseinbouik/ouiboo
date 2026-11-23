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
    // The apps ship a strict Content-Security-Policy (connect-src 'self'
    // + production API). E2E tests call a local mock API on :3000, which CSP
    // would block before page.route can intercept. Bypass CSP in tests only;
    // production CSP is untouched.
    bypassCSP: true,
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
      // Exercise the same standalone artifact layout used by the app image.
      command: 'node scripts/start-next-standalone.mjs traveler 3001',
      url: 'http://localhost:3001/login',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: { ...process.env, NEXT_PUBLIC_API_URL: 'http://localhost:3000/api' },
    },
    {
      command: 'node scripts/start-next-standalone.mjs agency 3002',
      url: 'http://localhost:3002/login',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: { ...process.env, NEXT_PUBLIC_API_URL: 'http://localhost:3000/api' },
    },
    {
      command: 'node scripts/start-next-standalone.mjs admin 3003',
      url: 'http://localhost:3003/login',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: { ...process.env, NEXT_PUBLIC_API_URL: 'http://localhost:3000/api' },
    },
  ],
  projects: [
    {
      name: 'traveler',
      // #560: traveler-console.spec.ts was orphaned (it matched no
      // project, so the #336 console-hygiene gate never ran in CI).
      testMatch: /(traveler|traveler-console)\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:3001',
        channel: process.platform === 'win32' ? 'chrome' : undefined,
      },
    },
    {
      // #560: one mobile project — the audience is mobile-first but the
      // suite was desktop-only. Runs the traveler journeys on a
      // touch/notched handset profile.
      name: 'traveler-mobile',
      testMatch: /traveler\.spec\.ts/,
      use: {
        ...devices['Pixel 7'],
        baseURL: 'http://localhost:3001',
        // Match the desktop projects on Windows, where the corporate TLS
        // trust chain can prevent Playwright from downloading its bundled
        // Chromium. CI remains on Playwright Chromium.
        channel: process.platform === 'win32' ? 'chrome' : undefined,
      },
    },
    {
      // #560: production/smoke.spec.ts was orphaned too. It targets the
      // LIVE deployments (URLs from SMOKE_* env vars, canonical prod
      // defaults in the spec) — run it explicitly with
      // `npx playwright test --project=production-smoke`; it is not part
      // of the local mock-backed projects above. Because a bare
      // `playwright test` runs EVERY project, the browser-e2e workflow
      // enumerates the local projects explicitly — otherwise this suite
      // grades the previously released production build in the PR gate
      // (it failed on the pre-#468/#582/#583 production build's
      // localhost canonical, hydration #418 and anonymous 401s, none of
      // which reproduce on current code: the local traveler-console
      // gate, which exercises the same pages anonymously and
      // authenticated against the mock API, is clean). Its live gate is
      // production-smoke.yml (staging URLs, every PR).
      name: 'production-smoke',
      testMatch: /production\/smoke\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
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
