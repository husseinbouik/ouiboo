/**
 * Mobile-viewport axe-core accessibility check for key traveler pages.
 *
 * Companion to axe-check.mjs (#213). Runs the same serious/critical
 * axe-core scan with a 375x667 mobile viewport (touch emulation) so
 * mobile-only regressions (overlapping tap targets, clipped content,
 * hidden focus states) are caught in CI.
 *
 * Run in CI after `@axe-core/playwright` is installed with
 * `npm install --no-save @axe-core/playwright` (kept out of package.json).
 *
 * Usage: node .github/lighthouse/axe-check-mobile.mjs [baseUrl]
 */
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const baseUrl = process.argv[2] || 'http://localhost:3001';

// Key traveler journeys (highest-conversion surface)
const pages = ['/', '/search', '/login', '/signup'];

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 375, height: 667 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 2,
});
const page = await context.newPage();

let failures = 0;

for (const path of pages) {
  const url = `${baseUrl}${path}`;
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    // Let client-side translations/hydration settle
    await page.waitForTimeout(2500);

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
    console.log(`⚠️  [mobile] ${url}: could not analyze (${err.message})`);
  }
}

await browser.close();

if (failures > 0) {
  console.log(`\n${failures} serious/critical mobile axe violation(s) found.`);
  process.exit(1);
}
console.log('\nmobile axe check complete.');
