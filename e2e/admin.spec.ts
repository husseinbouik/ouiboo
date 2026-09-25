import { expect, test } from '@playwright/test';
import { mockAdminApi } from './helpers';

test.describe('admin launch flow', () => {
  test.beforeEach(async ({ page }) => {
    await mockAdminApi(page);
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

  test('admin can process refunds and payouts from launch surfaces', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await page.getByRole('button', { name: /system bookings/i }).click();
    await expect(page.getByText(/refund processed successfully/i)).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^refund$/i })).toBeVisible();
    await page.getByRole('button', { name: /^refund$/i }).click();
    await page.getByRole('button', { name: /process refund/i }).click();
    await expect(page.getByText(/refund processed successfully/i)).toBeVisible();

    await page.getByRole('button', { name: /payout requests/i }).click();
    await expect(page.getByRole('button', { name: /details/i }).first()).toBeVisible();
    await page.getByRole('button', { name: /details/i }).click();
    await page.getByRole('button', { name: /approve payout/i }).click();
    await expect(page.getByText(/payout marked as paid successfully/i)).toBeVisible();
  });
});
