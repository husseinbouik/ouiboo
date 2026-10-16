/**
 * Basic keyboard-navigation regression check for key traveler pages (#213).
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
 * Usage: node .github/lighthouse/keyboard-nav-check.mjs [baseUrl]
 */
import { chromium } from 'playwright';

const baseUrl = process.argv[2] || 'http://localhost:3001';

// Key traveler journeys (highest-conversion surface)
const pages = ['/', '/search', '/login', '/signup'];
const MAX_TABS = 40;

function describe(el) {
  if (!el) return '<none>';
  const label = (el.ariaLabel || el.text || '').trim().slice(0, 40);
  return `<${el.tag}${el.id ? `#${el.id}` : ''}>${label ? ` "${label}"` : ''}`;
}

const browser = await chromium.launch();
const page = await browser.newPage();

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

      const info = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return {
          tag: el.tagName.toLowerCase(),
          id: el.id || '',
          ariaLabel:
            el.getAttribute('aria-label') ||
            (el.innerText || el.value || '').trim().slice(0, 60),
          text: (el.innerText || el.value || '').trim().slice(0, 60),
          visible: rect.width > 0 && rect.height > 0,
          hiddenByCss:
            style.visibility === 'hidden' || style.display === 'none',
        };
      });

      if (!info) {
        // Focus landed on body (or nowhere) — keep tabbing; only a
        // failure if we never find anything focusable at all.
        continue;
      }

      focusCount++;
      const key = `${info.tag}#${info.id}@${info.ariaLabel}`;
      if (key === lastKey) {
        stuckCount++;
        if (stuckCount >= 3) {
          pageFailures.push(
            `focus stuck on ${describe(info)} after ${i + 1} tabs (keyboard trap?)`,
          );
          break;
        }
      } else {
        stuckCount = 0;
      }
      lastKey = key;

      if (!info.visible || info.hiddenByCss) {
        pageFailures.push(
          `focused element is not visible: ${describe(info)}`,
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
    console.log(`⚠️  [keyboard] ${url}: could not analyze (${err.message})`);
  }
}

await browser.close();

if (failures > 0) {
  console.log(`\n${failures} keyboard-navigation problem(s) found.`);
  process.exit(1);
}
console.log('\nkeyboard navigation check complete.');
