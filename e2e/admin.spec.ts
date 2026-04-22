import { expect, test } from '@playwright/test';
import { mockAdminApi, seedLocalStorage } from './helpers';

test.describe('admin launch flow', () => {
  test.beforeEach(async ({ page }) => {
    await seedLocalStorage(page, {
      token: 'admin-token',
      refresh_token: 'admin-refresh',
    });
    await mockAdminApi(page);
  });

  test('admin dashboard exposes audit visibility for launch operators', async ({ page }) => {
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /verification queue/i })).toBeVisible();
    await page.getByRole('button', { name: /audit log/i }).click();
    await expect(page.getByText(/payout_processed/i)).toBeVisible();
    await page.getByRole('button', { name: /prune old logs/i }).click();
    await expect(page.getByText(/deleted 2 audit logs older than/i)).toBeVisible();
  });
});
