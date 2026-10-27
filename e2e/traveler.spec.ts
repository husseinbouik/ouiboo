import { expect, test } from '@playwright/test';
import { mockTravelerApi } from './helpers';

test.describe('traveler launch flow', () => {
  test.beforeEach(async ({ page }) => {
    await mockTravelerApi(page);
  });

  test('traveler can sign up and verify an account', async ({ page }) => {
    await page.goto('/signup', { waitUntil: 'domcontentloaded' });

    await page.locator('#name').fill('Launch Traveler');
    await page.locator('#email').fill('traveler@example.com');
    await page.locator('#password').fill('Password123!');
    await page.locator('#dateOfBirth').fill('1990-01-15');
    // Accept terms (required by signup form validation)
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: /register|create account/i }).click();

    await page.waitForURL((url) => (
      url.pathname === '/verify' && url.searchParams.get('email') === 'traveler@example.com'
    ));

    const otpInputs = page.locator('input[id^="otp-"]');
    await expect(otpInputs).toHaveCount(6);
    for (let index = 0; index < 6; index += 1) {
      await otpInputs.nth(index).fill(String(index + 1));
    }

    await page.getByRole('button', { name: /verify code/i }).click();
    await expect(page.getByText(/verified successfully/i)).toBeVisible();
  });

  test('traveler can go from trip detail to checkout confirmation', async ({ page }) => {
    await page.goto('/search', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Atlas Weekend Escape' })).toBeVisible();
    // "View details" is rendered as a link (Next.js Link), not a button.
    await page.getByRole('link', { name: /view details/i }).first().click();
    await page.waitForURL(/\/trip\/trip-1/);
    await expect(page.getByRole('heading', { name: 'Atlas Weekend Escape' })).toBeVisible();
    await page.getByText(/spots left/i).first().click();
    await page.getByRole('button', { name: /book now/i }).click();

    await page.waitForURL(/\/checkout\/trip-1/);
    await expect(page.getByRole('heading', { name: /checkout/i })).toBeVisible();
    await page.getByPlaceholder(/abderrahmane/i).fill('Launch Traveler');
    await page.getByPlaceholder(/include country code/i).fill('+212600000000');
    // B9: the booking terms checkbox (unchecked by default) gates submit.
    const completeButton = page.getByRole('button', { name: /complete booking/i });
    await expect(completeButton).toBeDisabled();
    await page.getByRole('checkbox', { name: /accept the booking terms/i }).check();
    await expect(completeButton).toBeEnabled();
    await completeButton.click();

    await page.waitForURL(/\/checkout\/confirmation\?bookingId=booking-1/);
    await expect(page.getByText(/booking submitted/i)).toBeVisible();
    await expect(page.getByText(/booking reference: booking-1/i)).toBeVisible();
  });

  test('traveler search uses the corrected discovery contract', async ({ page }) => {
    await page.goto('/search', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /find your next adventure/i })).toBeVisible();

    await page.getByPlaceholder(/destination, activity or keyword/i).fill('atlas');
    await page.getByRole('button', { name: /^search$/i }).click();
    await page.getByRole('button', { name: 'Adventure' }).click();
    await expect(page.getByRole('heading', { name: 'Atlas Weekend Escape' })).toBeVisible();
  });
});
