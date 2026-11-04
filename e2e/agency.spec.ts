import { expect, test } from '@playwright/test';
import { authenticateAs, mockAgencyApi } from './helpers';

test.describe('agency launch flow', () => {
  test.beforeEach(async ({ page }) => {
    await mockAgencyApi(page);
    // The #208 proxy auth gate redirects /dashboard/* to /login without a
    // valid signed session cookie — establish one before navigating.
    await authenticateAs(page, 'AGENCY');
  });

  test('agency payments surface reports payments received by the agency, with no payout flow', async ({ page }) => {
    await page.goto('/dashboard/wallet', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: /^payments$/i })).toBeVisible();
    await expect(page.getByText('Received by your merchant account', { exact: true })).toBeVisible();
    await expect(page.getByText(/payment received/i)).toBeVisible();
    // #368: traveller money is paid directly to the agency — there is no
    // OuiBoo balance and no payout request UI anymore.
    await expect(page.getByRole('button', { name: /request payout/i })).toHaveCount(0);
    await expect(page.getByText(/available balance/i)).toHaveCount(0);
  });

  test('account menu entries land on implemented dashboard pages, never 404 (#724)', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

    const menuTrigger = page.getByRole('button', { name: /atlas agency/i });
    await expect(menuTrigger).toBeVisible();

    const destinations: Array<{ item: RegExp; url: RegExp }> = [
      { item: /^billing$/i, url: /\/dashboard\/settings\/billing$/ },
      { item: /^profile$/i, url: /\/dashboard\/settings$/ },
      { item: /^settings$/i, url: /\/dashboard\/settings$/ },
    ];
    for (const { item, url } of destinations) {
      await menuTrigger.click();
      await page.getByRole('menuitem', { name: item }).click();
      await expect(page).toHaveURL(url);
      await expect(page.getByText('Page not found', { exact: true })).toHaveCount(0);
    }
  });

  test('agency reviews proof in two steps — accepting is not settlement, bank confirmation settles', async ({ page }) => {
    await page.goto('/dashboard/bookings', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: /booking manager/i })).toBeVisible();
    await expect(page.getByText(/loading bookings/i)).toHaveCount(0);
    await expect(page.getByRole('button', { name: /inspect proof/i })).toBeVisible();
    await page.getByRole('button', { name: /inspect proof/i }).click();

    await expect(page.getByRole('heading', { name: /review payment proof/i })).toBeVisible();
    // #422: the single "approve = paid" action is gone. Step 1 only
    // accepts or rejects the proof image.
    await expect(page.getByRole('button', { name: /approve payment/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /accept proof/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /reject payment/i })).toBeVisible();

    await page.getByRole('button', { name: /accept proof/i }).click();

    // Step 2: accepted ≠ settled — the bank-confirmation step appears and
    // its action stays disabled until a bank reference is entered.
    await expect(page.getByText(/awaiting bank confirmation/i)).toBeVisible();
    const confirmButton = page.getByRole('button', { name: /confirm bank receipt/i });
    await expect(confirmButton).toBeVisible();
    await expect(confirmButton).toBeDisabled();
    await page.getByLabel(/bank reference/i).fill('TRX-E2E-001');
    await expect(confirmButton).toBeEnabled();
  });
});

test.describe('agency login accessibility (mobile viewport)', () => {
  // #730: no session here — the login form is the logged-out surface.
  // The mock API answers /users/me unconditionally, so force the real
  // production 401 (same pattern as .github/lighthouse/a11y-common.mjs)
  // to keep the page from bouncing to the dashboard.
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

    const forgot = page.getByRole('link', { name: /forgot password/i });
    await expect(forgot).toBeVisible();
    expect((await forgot.boundingBox())?.height).toBeGreaterThanOrEqual(44);

    const toggle = page.getByRole('button', { name: /show password/i });
    const toggleBox = await toggle.boundingBox();
    expect(toggleBox?.width).toBeGreaterThanOrEqual(44);
    expect(toggleBox?.height).toBeGreaterThanOrEqual(44);

    const signUp = page.getByRole('link', { name: /register your business/i });
    expect((await signUp.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  });
});
