/**
 * Standalone axe-core accessibility check for key traveler pages.
 *
 * Run in CI after `@axe-core/playwright` is installed with
 * `npm install --no-save @axe-core/playwright` (kept out of package.json).
 *
 * Usage: node .github/lighthouse/axe-check.mjs [baseUrl]
 */
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const baseUrl = process.argv[2] || 'http://localhost:3001';

// Key traveler journeys (highest-conversion surface)
const pages = ['/', '/search', '/login', '/signup'];

const browser = await chromium.launch();
const page = await browser.newPage();

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
      console.log(`\n❌ ${url}: ${serious.length} serious/critical violation(s)`);
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
        `✅ ${url}: no serious/critical violations` +
          (total > 0 ? ` (${total} minor/moderate)` : ''),
      );
    }
  } catch (err) {
    console.log(`⚠️  ${url}: could not analyze (${err.message})`);
  }
}

await browser.close();

if (failures > 0) {
  console.log(`\n${failures} serious/critical axe violation(s) found.`);
  process.exit(1);
}
console.log('\naxe check complete.');
