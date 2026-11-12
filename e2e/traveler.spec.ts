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
    // Checkout needs the signed-in traveler the mock API returns for
    // /users/me. Since #245 that probe only fires when a session may
    // exist, so seed the login hint a real login would have written.
    await seedLocalStorage(page, { 'ouiboo.session.hint': '1' });
    await page.goto('/search', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Atlas Weekend Escape' })).toBeVisible();
    // #975: /search cards no longer carry a "View Details" affordance —
    // the whole card body is the link (Next.js Link), named by its text.
    await page.getByRole('link', { name: /atlas weekend escape/i }).first().click();
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

  test('traveler homepage hero search navigates to the filtered search page', async ({ page }) => {
    // #723: the hero is a real form — a configured destination submits
    // as the destination facet, dates as dateFrom/dateTo, in exactly
    // the params the search page consumes.
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await page.getByLabel(/where to/i).fill('Chefchaouen');
    // #877: dates are demoted behind the "Add dates" toggle.
    await page.getByRole('button', { name: /add dates/i }).click();
    await page.getByLabel(/start date/i).fill('2027-05-10');
    await page.getByLabel(/end date/i).fill('2027-05-12');
    await page.getByRole('button', { name: /^search$/i }).click();

    await page.waitForURL((url) => (
      url.pathname === '/search'
      && url.searchParams.get('destination') === 'chefchaouen'
      && url.searchParams.get('dateFrom') === '2027-05-10'
      && url.searchParams.get('dateTo') === '2027-05-12'
    ));
    // #975: /search opens on the slim segmented search bar, not the
    // retired marketing heading ("Find your next Adventure").
    await expect(page.getByRole('combobox', { name: /destination, activity or keyword/i })).toBeVisible();
  });

  test('traveler homepage hero search submits with Enter and stays unfiltered when empty', async ({ page }) => {
    // #723: keyboard submission works, and an empty hero search goes
    // to the plain (unfiltered) search page rather than dead-ending.
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await page.getByLabel(/where to/i).press('Enter');

    await page.waitForURL((url) => (
      url.pathname === '/search'
      && !url.searchParams.get('destination')
      && !url.searchParams.get('q')
    ));
    await expect(page.getByRole('combobox', { name: /destination, activity or keyword/i })).toBeVisible();
  });

  test('traveler search uses the corrected discovery contract', async ({ page }) => {
    await page.goto('/search', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('combobox', { name: /destination, activity or keyword/i })).toBeVisible();

    await page.getByPlaceholder(/destination, activity or keyword/i).fill('atlas');
    await page.getByRole('button', { name: /^search$/i }).click();
    // #599/#560 + #975: on small viewports the category controls live
    // inside the MobileFilterDrawer — they are not in the DOM at all
    // until it opens (the desktop sidebar is display:none there), so
    // the mobile project must open the drawer first, exactly as a
    // phone user does. Desktop keeps the direct sidebar click. Since
    // #975 the category control is a checkbox row, so the click lands
    // on its label (which toggles the input), not a button. The
    // category assertion itself is unchanged: Adventure is still
    // clicked and must still surface the trip.
    const viewport = page.viewportSize();
    const isMobileViewport = viewport !== null && viewport.width < 1024;
    if (isMobileViewport) {
      await page.getByRole('button', { name: /^filters/i }).click();
      await page.locator('section[role="dialog"] label', { hasText: 'Adventure' }).first().click();
    } else {
      await page.locator('aside label', { hasText: 'Adventure' }).first().click();
    }
    if (isMobileViewport) {
      // Close the drawer via its footer CTA so the result is uncovered.
      // Search-page council item 3 (#877): the drawer applies
      // instantly, so the footer is a truthful Done carrying the
      // APPLIED total — 'Done · <N> trips match' (was 'View N trips').
      await page.getByRole('button', { name: /done · .* trips? match/i }).click();
    }
    await expect(page.getByRole('heading', { name: 'Atlas Weekend Escape' })).toBeVisible();
  });
});
