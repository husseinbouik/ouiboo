import { expect, test, type Page } from '@playwright/test';
import { authenticateAs, mockTravelerApi } from './helpers';

// #336: console-error gate for the traveler app.
//
// A React hydration mismatch (minified error #418) and the react-i18next
// "pass in an i18next instance" warning reached production silently — the
// pages rendered, so nobody noticed. This spec makes both (and any uncaught
// page error) fail CI on the public, login, and authenticated surfaces.

const FATAL_PATTERNS = [
  /hydration/i,
  /react-i18next/,
  /initReactI18next/,
  /Minified React error #418/,
  /Minified React error #423/,
  /Minified React error #425/,
];

function watchConsole(page: Page): string[] {
  const problems: string[] = [];
  page.on('console', (msg) => {
    const text = msg.text();
    if (msg.type() === 'error' || FATAL_PATTERNS.some((pattern) => pattern.test(text))) {
      problems.push(`[console.${msg.type()}] ${text}`);
    }
  });
  page.on('pageerror', (err) => {
    problems.push(`[pageerror] ${err.message}`);
  });
  return problems;
}

async function expectCleanConsole(page: Page, problems: string[]) {
  await page.waitForTimeout(1500);
  expect(problems, problems.join('\n')).toEqual([]);
}

test.describe('traveler console hygiene (#336)', () => {
  test.beforeEach(async ({ page }) => {
    await mockTravelerApi(page);
  });

  for (const path of ['/', '/search', '/login']) {
    test(`no console errors on ${path}`, async ({ page }) => {
      const problems = watchConsole(page);
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await expectCleanConsole(page, problems);
    });
  }

  test('no console errors on authenticated reload', async ({ page }) => {
    const problems = watchConsole(page);
    await authenticateAs(page, 'TRAVELER');
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expectCleanConsole(page, problems);
  });
});
