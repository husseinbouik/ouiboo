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

  test('agency can inspect proof but not finalize bank-transfer verification', async ({ page }) => {
    await page.goto('/dashboard/bookings', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: /booking manager/i })).toBeVisible();
    await expect(page.getByText(/loading bookings/i)).toHaveCount(0);
    await expect(page.getByRole('button', { name: /inspect proof/i })).toBeVisible();
    await page.getByRole('button', { name: /inspect proof/i }).click();

    await expect(page.getByRole('heading', { name: /review payment proof/i })).toBeVisible();
    await expect(page.getByText(/admin finance review/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /approve payment/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /reject payment/i })).toHaveCount(0);
  });
});
