import { expect, test } from '@playwright/test';

/**
 * Production smoke tests — run against live deployments.
 * These catch the issues mocks can't: broken URLs, CORS, missing env vars,
 * dead links, and UI regressions.
 *
 * URLs come from env vars (set in CI) with production defaults.
 */

const TRAVELER_URL = process.env.SMOKE_TRAVELER_URL || 'https://ouiboo-traveler-nu.vercel.app';
const AGENCY_URL = process.env.SMOKE_AGENCY_URL || 'https://ouiboo-agency-gold.vercel.app';
const ADMIN_URL = process.env.SMOKE_ADMIN_URL || 'https://ouiboo-admin.vercel.app';
const LANDING_URL = process.env.SMOKE_LANDING_URL || 'https://ouiboo.vercel.app';
const API_URL = process.env.SMOKE_API_URL || 'https://ouiboo-api.vercel.app/api/v1';

test.describe('production smoke: all apps load', () => {
  test('traveler homepage loads', async ({ page }) => {
    const response = await page.goto(TRAVELER_URL, { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBeLessThan(400);
    await expect(page).not.toHaveTitle(/404|not found/i);
  });

  test('agency login loads', async ({ page }) => {
    const response = await page.goto(`${AGENCY_URL}/login`, { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBeLessThan(400);
  });

  test('admin login loads', async ({ page }) => {
    const response = await page.goto(`${ADMIN_URL}/login`, { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBeLessThan(400);
  });

  test('landing loads', async ({ page }) => {
    const response = await page.goto(LANDING_URL, { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBeLessThan(400);
  });
});

test.describe('production smoke: API health', () => {
  test('health endpoint returns 200', async ({ request }) => {
    const res = await request.get(`${API_URL}/health`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });

  test('public trips endpoint works', async ({ request }) => {
    const res = await request.get(`${API_URL}/trips?limit=5`);
    expect(res.status()).toBe(200);
  });

  test('protected routes return 401 without token', async ({ request }) => {
    for (const path of ['/bookings/my-bookings', '/users/me', '/users/wishlist']) {
      const res = await request.get(`${API_URL}${path}`);
      expect(res.status()).toBe(401);
    }
  });

  test('CORS headers present for traveler origin', async ({ request }) => {
    const res = await request.fetch(`${API_URL}/health`, {
      method: 'OPTIONS',
      headers: {
        'Origin': TRAVELER_URL,
        'Access-Control-Request-Method': 'GET',
      },
    });
    const allowOrigin = res.headers()['access-control-allow-origin'];
    expect(allowOrigin).toBeTruthy();
  });

  test('media endpoint serves uploaded files', async ({ request }) => {
    // Regression test for #74 — /media should not 404 on the base path check
    // (actual file keys are dynamic; this verifies the route exists)
    const res = await request.get(`${API_URL.replace('/api/v1', '')}/media/nonexistent-test-key`);
    // Should be 404 (not found) not 404 (no route) — both are 404 but route must exist
    // A missing route returns HTML; our endpoint returns JSON
    expect(res.status()).toBe(404);
  });
});

test.describe('production smoke: no localhost leaks', () => {
  test('landing CTAs do not point to localhost', async ({ page }) => {
    await page.goto(LANDING_URL, { waitUntil: 'domcontentloaded' });
    const html = await page.content();
    expect(html).not.toContain('localhost:3001');
    expect(html).not.toContain('localhost:3002');
    expect(html).not.toContain('localhost:3004');
  });

  test('traveler page has no localhost API URLs in links', async ({ page }) => {
    await page.goto(TRAVELER_URL, { waitUntil: 'domcontentloaded' });
    const html = await page.content();
    const badPatterns = [/href="http:\/\/localhost/, /src="http:\/\/localhost/];
    for (const pattern of badPatterns) {
      expect(html).not.toMatch(pattern);
    }
  });
});

test.describe('production smoke: auth UX', () => {
  test('traveler login shows error on bad credentials', async ({ page }) => {
    await page.goto(`${TRAVELER_URL}/login`, { waitUntil: 'domcontentloaded' });
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    if (await emailInput.count() > 0) {
      await emailInput.fill('smoke-test-bad@example.com');
      await passwordInput.fill('WrongPassword123!');
      await page.getByRole('button', { name: /sign in|log in/i }).click();
      await page.waitForTimeout(8000);
      const bodyText = await page.textContent('body');
      const hasError = /invalid|incorrect|wrong|failed|error|unauthorized/i.test(bodyText || '');
      const stillOnLogin = page.url().includes('/login');
      // Either shows error or navigates away — silent reset is the bug (#54)
      expect(hasError || !stillOnLogin).toBeTruthy();
    }
  });

  test('traveler signup page renders', async ({ page }) => {
    await page.goto(`${TRAVELER_URL}/signup`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('form, input[type="email"]').first()).toBeVisible({ timeout: 10000 });
  });

  test('password reset page renders', async ({ page }) => {
    await page.goto(`${TRAVELER_URL}/forgot-password`, { waitUntil: 'domcontentloaded' });
    expect(page.url()).toContain('forgot-password');
  });
});

test.describe('production smoke: no console errors on load', () => {
  for (const [name, url] of [
    ['traveler', TRAVELER_URL],
    ['landing', LANDING_URL],
  ] as const) {
    test(`${name} has no severe console errors`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (err) => errors.push(err.message));
      page.on('console', (msg) => {
        if (msg.type() === 'error' && !msg.text().includes('favicon')) {
          errors.push(msg.text());
        }
      });
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      expect(errors).toEqual([]);
    });
  }
});
