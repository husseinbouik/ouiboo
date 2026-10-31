/**
 * Mobile-viewport axe-core accessibility check for key pages.
 *
 * Companion to axe-check.mjs (#213). Runs the same serious/critical
 * axe-core scan with a 375x667 mobile viewport (touch emulation) so
 * mobile-only regressions (overlapping tap targets, clipped content,
 * hidden focus states) are caught in CI.
 *
 * Run in CI after `@axe-core/playwright` is installed with
 * `npm install --no-save @axe-core/playwright` (kept out of package.json).
 *
 * Usage: node .github/lighthouse/axe-check-mobile.mjs [baseUrl] [pagesCsv] [--role=ROLE]
 * A page that cannot be analyzed at all FAILS the check (#332), same as
 * the desktop script.
 */
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { parseTargetArgs, addSessionCookies, scrollThroughPage, mockUnauthenticated } from './a11y-common.mjs';

const { baseUrl, pages, role, mockUnauthenticated: forceUnauth } = parseTargetArgs();

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 375, height: 667 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 2,
});
if (role) await addSessionCookies(context, baseUrl, role);
const page = await context.newPage();
if (forceUnauth) await mockUnauthenticated(page);

let failures = 0;

for (const path of pages) {
  const url = `${baseUrl}${path}`;
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    // Let client-side translations/hydration settle, then reveal
    // scroll-triggered content so the scan covers the full page.
    await page.waitForTimeout(2000);
    await scrollThroughPage(page);
    // Scroll-triggered (framer-motion whileInView) animations can still
    // be in flight after the scroll-back; axe then measures text color
    // mid-blend and reports false color-contrast violations (PR #449
    // investigation, 2026-10-25). Wait for running WAAPI animations to
    // finish and for computed opacity/transform to stay stable across
    // two samples 400ms apart before scanning.
    await page.evaluate(async () => {
      const running = document
        .getAnimations({ subtree: true })
        .filter((a) => a.playState === 'running')
        .map((a) => a.finished.catch(() => {}));
      await Promise.race([
        Promise.all(running),
        new Promise((r) => setTimeout(r, 3000)),
      ]);
      const sample = () =>
        Array.from(document.querySelectorAll('body *'))
          .slice(0, 2000)
          .map((el) => {
            const cs = getComputedStyle(el);
            return cs.opacity + '|' + cs.transform;
          })
          .join(';');
      let last = sample();
      for (let i = 0; i < 12; i++) {
        await new Promise((r) => setTimeout(r, 400));
        const cur = sample();
        if (cur === last) break;
        last = cur;
      }
    });

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const serious = results.violations.filter((v) =>
      ['serious', 'critical'].includes(v.impact),
    );

    if (serious.length > 0) {
      failures += serious.length;
      console.log(`\n❌ [mobile] ${url}: ${serious.length} serious/critical violation(s)`);
      for (const v of serious) {
        console.log(`   [${v.impact}] ${v.id}: ${v.description}`);
        console.log(`   help: ${v.helpUrl}`);
        console.log(
          `   nodes: ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`,
        );
      }
    } else {
      const total = results.violations.length;
      console.log(
        `✅ [mobile] ${url}: no serious/critical violations` +
          (total > 0 ? ` (${total} minor/moderate)` : ''),
      );
    }
  } catch (err) {
    failures += 1;
    console.log(`❌ [mobile] ${url}: could not analyze (${err.message})`);
  }
}

await browser.close();

if (failures > 0) {
  console.log(`\n${failures} serious/critical mobile axe violation(s) found.`);
  process.exit(1);
}
console.log('\nmobile axe check complete.');
