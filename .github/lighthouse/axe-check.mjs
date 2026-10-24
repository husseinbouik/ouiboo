/**
 * Standalone axe-core accessibility check for key pages.
 *
 * Run in CI after `@axe-core/playwright` is installed with
 * `npm install --no-save @axe-core/playwright` (kept out of package.json).
 *
 * Usage: node .github/lighthouse/axe-check.mjs [baseUrl] [pagesCsv] [--role=ROLE]
 * Defaults: traveler base URL + /, /search, /login, /signup (issue #213).
 * #332 extended the page sets per app in lighthouse-a11y.yml; --role signs
 * a test BFF session cookie (see a11y-common.mjs) for authed shells.
 * A page that cannot be analyzed at all now FAILS the check (#332):
 * a blocking gate must not silently pass unscanned pages.
 */
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { parseTargetArgs, addSessionCookies, scrollThroughPage, mockUnauthenticated } from './a11y-common.mjs';

const { baseUrl, pages, role, mockUnauthenticated: forceUnauth } = parseTargetArgs();

const browser = await chromium.launch();
const context = await browser.newContext();
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
    failures += 1;
    console.log(`❌ ${url}: could not analyze (${err.message})`);
  }
}

await browser.close();

if (failures > 0) {
  console.log(`\n${failures} serious/critical axe violation(s) found.`);
  process.exit(1);
}
console.log('\naxe check complete.');
