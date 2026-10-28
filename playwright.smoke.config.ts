import { defineConfig } from '@playwright/test';

/**
 * Smoke config for e2e/production — these tests run against LIVE
 * deployments (URLs from the SMOKE_* env vars), so unlike
 * playwright.config.ts this config must NOT boot local webServers or
 * the mock API: the shared config's webServer block starts the Next.js
 * apps locally, which aborts the smoke run before any test executes.
 *
 * Used only by .github/workflows/production-smoke.yml. The JSON report
 * path below is exactly what that workflow's issue-filing step reads.
 * retries stay 0 on purpose: a smoke failure must surface as a failure
 * (issue #245), not be retried into a pass.
 */
export default defineConfig({
  testDir: './e2e/production',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: true,
  workers: 4,
  retries: 0,
  reporter: [['json', { outputFile: 'test-results/results.json' }]],
});
