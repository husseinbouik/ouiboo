import { expect, test } from '@playwright/test';
import { mockAgencyApi, seedLocalStorage } from './helpers';

test.describe('agency launch flow', () => {
  test.beforeEach(async ({ page }) => {
    await seedLocalStorage(page, {
      token: 'agency-token',
      refresh_token: 'agency-refresh',
    });
    await mockAgencyApi(page);
  });

  test('agency wallet launch surface renders readiness state', async ({ page }) => {
    await page.goto('/dashboard/wallet', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: /wallet & payouts/i })).toBeVisible();
    await expect(page.getByText(/add your bank details before requesting a payout/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /request payout/i })).toBeDisabled();
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
