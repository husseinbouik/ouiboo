import { expect, test } from '@playwright/test';
import { mockTravelerApi, seedLocalStorage } from './helpers';

test.describe('traveler launch flow', () => {
  test.beforeEach(async ({ page }) => {
    await mockTravelerApi(page);
  });

  test('traveler can sign up and verify an account', async ({ page }) => {
    await page.goto('/signup', { waitUntil: 'domcontentloaded' });

    await page.locator('#name').fill('Launch Traveler');
    await page.locator('#email').fill('traveler@example.com');
    await page.locator('#password').fill('Password123!');
    await page.getByRole('button', { name: /register|create account/i }).click();

    await page.waitForURL(/\/verify\?email=traveler@example\.com/);

    const otpInputs = page.locator('input[id^="otp-"]');
    await expect(otpInputs).toHaveCount(6);
    for (let index = 0; index < 6; index += 1) {
      await otpInputs.nth(index).fill(String(index + 1));
    }

    await page.getByRole('button', { name: /verify code/i }).click();
    await expect(page.getByText(/verified successfully/i)).toBeVisible();
  });

  test('traveler can go from trip detail to checkout confirmation', async ({ page }) => {
    await seedLocalStorage(page, {
      token: 'traveler-token',
      refresh_token: 'traveler-refresh',
    });

    await page.goto('/trip/trip-1', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Atlas Weekend Escape')).toBeVisible();
    await page.getByText(/spots left/i).first().click();
    await page.getByRole('button', { name: /book now/i }).click();

    await page.waitForURL(/\/checkout\/trip-1/);
    await expect(page.getByRole('heading', { name: /checkout/i })).toBeVisible();
    await page.getByPlaceholder(/abderrahmane/i).fill('Launch Traveler');
    await page.getByPlaceholder(/\+212/i).fill('+212600000000');
    await page.getByPlaceholder(/enter document number/i).fill('AB123456');
    await page.getByRole('button', { name: /complete booking/i }).click();

    await page.waitForURL(/\/checkout\/confirmation\?bookingId=booking-1/);
    await expect(page.getByText(/booking submitted/i)).toBeVisible();
    await expect(page.getByText(/booking reference: booking-1/i)).toBeVisible();
  });
});
