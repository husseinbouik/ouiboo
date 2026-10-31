import { expect, test } from '@playwright/test';
import { authenticateAs, mockAdminApi } from './helpers';

test.describe('admin launch flow', () => {
  test.beforeEach(async ({ page }) => {
    await mockAdminApi(page);
    // The #208 proxy auth gate redirects everything except /login to /login
    // without a valid signed ADMIN session cookie.
    await authenticateAs(page, 'ADMIN');
  });

  test('admin dashboard exposes audit visibility for launch operators', async ({ page }) => {
    await page.goto('/?tab=AUDIT', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /^audit log$/i })).toBeVisible();
    await expect(page.getByText(/audit trail/i)).toBeVisible();
    await expect(page.getByText('PAYOUT_PROCESSED')).toBeVisible();
    await page.getByRole('button', { name: /prune old logs/i }).click();
    await page.getByRole('button', { name: /delete old logs/i }).click();
    await expect(page.getByText(/deleted 2 audit logs older than/i)).toBeVisible();
  });

  test('admin can process refunds from launch surfaces', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await page.getByRole('button', { name: /system bookings/i }).click();
    await expect(page.getByText(/refund processed successfully/i)).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^refund$/i })).toBeVisible();
    await page.getByRole('button', { name: /^refund$/i }).click();
    await page.getByRole('button', { name: /process refund/i }).click();
    await expect(page.getByText(/refund processed successfully/i)).toBeVisible();

  });
});

test.describe('admin login accessibility (mobile viewport)', () => {
  // #730: no session here — see the agency login suite for why the
  // mock's unconditional /users/me answer must be overridden with 401.
  test.beforeEach(async ({ page }) => {
    await page.route('**/users/me', async (route) => {
      const origin = route.request().headers()['origin'] || '*';
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Allow-Headers': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        },
        body: JSON.stringify({ message: 'Unauthorized' }),
      });
    });
    await page.setViewportSize({ width: 390, height: 844 });
  });

  test('login touch targets meet the 44px design-system size (#730)', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });

    const toggle = page.getByRole('button', { name: /show password/i });
    await expect(toggle).toBeVisible();
    const toggleBox = await toggle.boundingBox();
    expect(toggleBox?.width).toBeGreaterThanOrEqual(44);
    expect(toggleBox?.height).toBeGreaterThanOrEqual(44);

    const breakGlass = page.getByRole('button', { name: /break-glass/i });
    expect((await breakGlass.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  });

  test('language switcher accessible name contains its visible text (#730)', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });

    // Regression: admin locales lacked common.switchLanguage, so the
    // button rendered the raw key as its accessible name while showing
    // "EN" — Lighthouse's label-content-name-mismatch.
    const switcher = page.getByRole('button', { name: /switch language/i });
    await expect(switcher).toBeVisible();
    await expect(switcher).toHaveAccessibleName(/EN/);
    await expect(switcher).not.toHaveAccessibleName(/common\.switchLanguage/);
  });
});
