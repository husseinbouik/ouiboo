/**
 * Basic keyboard-navigation regression check for key pages (#213).
 *
 * Tabs through each page and verifies:
 *  1. At least one focusable element exists (keyboard users can operate the page).
 *  2. Focus keeps moving (no keyboard trap / stuck focus).
 *  3. Every focused element is visible (non-zero bounding box) — invisible
 *     focus targets are a WCAG 2.4.3 / 2.4.7 failure.
 *
 * This is a smoke-level check, not a full tab-order audit. Run in CI after
 * `npm install --no-save @axe-core/playwright` + `npx playwright install chromium`
 * (same prerequisites as axe-check.mjs).
 *
 * Usage: node .github/lighthouse/keyboard-nav-check.mjs [baseUrl] [pagesCsv] [--role=ROLE]
 * #332: page sets are per-app (see lighthouse-a11y.yml); --role signs a
 * test BFF session cookie for authed shells (see a11y-common.mjs). A page
 * that cannot be loaded at all now FAILS instead of warning.
 */
import { chromium } from 'playwright';
import {
  parseTargetArgs,
  addSessionCookies,
  describeFocus,
  readFocusInPage,
  mockUnauthenticated,
} from './a11y-common.mjs';

const { baseUrl, pages, role, mockUnauthenticated: forceUnauth } = parseTargetArgs();
const MAX_TABS = 40;

const browser = await chromium.launch();
const context = await browser.newContext();
if (role) await addSessionCookies(context, baseUrl, role);
const page = await context.newPage();
if (forceUnauth) await mockUnauthenticated(page);

let failures = 0;

for (const path of pages) {
  const url = `${baseUrl}${path}`;
  const pageFailures = [];
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2500);

    // Start from the top of the document
    await page.evaluate(() => {
      if (document.activeElement && document.activeElement.blur) {
        document.activeElement.blur();
      }
    });

    let lastKey = null;
    let stuckCount = 0;
    let focusCount = 0;

    for (let i = 0; i < MAX_TABS; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(120);

      const info = await page.evaluate(readFocusInPage);

      if (!info) {
        // Focus landed on body (or nowhere) — keep tabbing; only a
        // failure if we never find anything focusable at all.
        continue;
      }

      focusCount++;
      const key = `${info.tag}#${info.id}@${info.ariaLabel}`;
      if (key === lastKey) {
        stuckCount++;
        // Native date/time inputs are a special case (#332): Chromium keeps
        // document.activeElement on the <input> while Tab traverses its
        // internal segments (month/day/year + the picker indicator), so the
        // same element legitimately repeats several times before focus moves
        // on. Allow those repeats; a genuine trap still fails because focus
        // never advances past the higher limit either.
        const DATE_TIME_TYPES = ['date', 'time', 'datetime-local', 'month', 'week'];
        const stuckLimit =
          info.tag === 'input' && DATE_TIME_TYPES.includes(info.type) ? 6 : 3;
        if (stuckCount >= stuckLimit) {
          pageFailures.push(
            `focus stuck on ${describeFocus(info)} after ${i + 1} tabs (keyboard trap?)`,
          );
          break;
        }
      } else {
        stuckCount = 0;
      }
      lastKey = key;

      if (!info.visible || info.hiddenByCss) {
        pageFailures.push(
          `focused element is not visible: ${describeFocus(info)}`,
        );
      }
    }

    if (focusCount === 0) {
      pageFailures.push('no focusable elements found via Tab');
    }

    if (pageFailures.length > 0) {
      failures += pageFailures.length;
      console.log(`\n❌ [keyboard] ${url}: ${pageFailures.length} problem(s)`);
      for (const f of pageFailures) console.log(`   - ${f}`);
    } else {
      console.log(
        `✅ [keyboard] ${url}: ${focusCount} focusable element(s), focus moves and stays visible`,
      );
    }
  } catch (err) {
    failures += 1;
    console.log(`❌ [keyboard] ${url}: could not analyze (${err.message})`);
  }
}

await browser.close();

if (failures > 0) {
  console.log(`\n${failures} keyboard-navigation problem(s) found.`);
  process.exit(1);
}
console.log('\nkeyboard navigation check complete.');
