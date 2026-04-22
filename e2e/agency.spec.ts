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
});
