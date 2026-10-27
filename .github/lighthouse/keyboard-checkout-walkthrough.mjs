/**
 * Keyboard-only checkout walkthrough (#332 acceptance evidence).
 *
 * Drives the money flow search → trip detail → checkout → confirmation
 * using NOTHING but Tab / Shift+Tab / Enter / typing, against the e2e
 * mock API (trip-1, booking-1). At every Tab stop it asserts the focused
 * element is visible (WCAG 2.4.7) and that focus keeps moving (no trap,
 * WCAG 2.1.2), and it records each stop into a checklist that is printed
 * at the end (and written to $WALKTHROUGH_OUT as markdown when set).
 * The committed recording of a manual run lives in
 * .github/lighthouse/KEYBOARD_CHECKOUT_WALKTHROUGH.md; this script is
 * the repeatable, blocking CI version of the same walkthrough.
 *
 * Prerequisites (same as the other checks): the traveler app running
 * with NEXT_PUBLIC_API_URL pointing at e2e/mock-api-server.mjs.
 *
 * Usage: node .github/lighthouse/keyboard-checkout-walkthrough.mjs [baseUrl]
 */
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
import { describeFocus, readFocusInPage } from './a11y-common.mjs';

const baseUrl = process.argv[2] || 'http://localhost:3001';
const MAX_TABS_PER_LEG = 120;
const DATE_TIME_TYPES = ['date', 'time', 'datetime-local', 'month', 'week'];

const checklist = [];
const failures = [];
let stepNo = 0;

function record(stage, info, action = '') {
  stepNo += 1;
  const line = `${String(stepNo).padStart(2, '0')}. [${stage}] ${describeFocus(info)}${action ? ` — ${action}` : ''}`;
  checklist.push(line);
  console.log(line);
}

function fail(message) {
  failures.push(message);
  console.log(`❌ ${message}`);
}

const focusKey = (info) =>
  `${info.tag}#${info.id}@${info.name}@${info.ariaLabel}@${info.href}`;

/**
 * Presses Tab until `predicate(info)` matches. Records every stop,
 * asserts visibility, and detects traps (same element repeating beyond
 * the date/time-input allowance). Returns the matching focus info.
 */
async function tabUntil(page, stage, predicate, { maxTabs = MAX_TABS_PER_LEG, recordStops = true } = {}) {
  let lastKey = null;
  let stuck = 0;
  for (let i = 0; i < maxTabs; i++) {
    await page.keyboard.press('Tab');
    await page.waitForTimeout(90);
    const info = await page.evaluate(readFocusInPage);
    if (!info) continue;
    if (recordStops) record(stage, info);
    if (!info.visible || info.hiddenByCss) {
      fail(`[${stage}] focused element is not visible: ${describeFocus(info)}`);
    }
    const key = focusKey(info);
    if (key === lastKey) {
      stuck += 1;
      const limit = info.tag === 'input' && DATE_TIME_TYPES.includes(info.type) ? 6 : 3;
      if (stuck >= limit) {
        fail(`[${stage}] focus stuck on ${describeFocus(info)} (keyboard trap?)`);
        return null;
      }
    } else {
      stuck = 0;
    }
    lastKey = key;
    if (predicate(info)) return info;
  }
  fail(`[${stage}] target not reached within ${maxTabs} Tab presses`);
  return null;
}

const browser = await chromium.launch();
const page = await browser.newPage();

try {
  // ---- Leg 1: search → trip detail -------------------------------------
  await page.goto(`${baseUrl}/search`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.getByRole('heading', { name: 'Atlas Weekend Escape' }).first().waitFor({ timeout: 20000 });
  await page.waitForTimeout(2000);
  console.log('\n--- Leg 1: /search → trip detail (keyboard only) ---');

  const tripLink = await tabUntil(
    page,
    'search',
    (el) => el.tag === 'a' && el.href.includes('/trip/trip-1'),
  );
  if (!tripLink) throw new Error('trip link not reachable by keyboard');
  record('search', tripLink, 'press Enter');
  await page.keyboard.press('Enter');
  await page.waitForURL(/\/trip\/trip-1/, { timeout: 20000 });
  await page.getByRole('heading', { name: 'Atlas Weekend Escape' }).first().waitFor({ timeout: 20000 });
  // Let the auth context settle (mock API session bootstrap) before
  // interacting with the booking panel.
  await page.waitForTimeout(3000);

  // ---- Leg 2: trip detail → select session → Book Now ------------------
  console.log('\n--- Leg 2: trip detail → checkout (keyboard only) ---');
  const sessionRadio = await tabUntil(
    page,
    'trip',
    (el) => el.role === 'radio',
    { maxTabs: 80 },
  );
  if (!sessionRadio) throw new Error('session radio not reachable by keyboard');
  record('trip', sessionRadio, 'press Enter to select the session');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(400);

  let reachedCheckout = false;
  for (let attempt = 1; attempt <= 2 && !reachedCheckout; attempt++) {
    const bookNow = await tabUntil(
      page,
      'trip',
      (el) => el.tag === 'button' && /book now/i.test(el.text || el.ariaLabel || ''),
      { maxTabs: 40 },
    );
    if (!bookNow) throw new Error('Book Now button not reachable by keyboard');
    record('trip', bookNow, 'press Enter');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2500);

    if (/\/checkout\/trip-1/.test(page.url())) {
      reachedCheckout = true;
      break;
    }
    // Logged-out path: the auth modal opens instead. Complete it with
    // the keyboard too (mock API accepts any credentials), then retry.
    const passwordInput = page.locator('input[type="password"]');
    if (await passwordInput.isVisible().catch(() => false)) {
      console.log('   (auth modal opened — completing login by keyboard)');
      const email = await tabUntil(
        page,
        'auth-modal',
        (el) => el.tag === 'input' && el.type !== 'password' && el.type !== 'hidden',
        { maxTabs: 15 },
      );
      if (!email) throw new Error('auth modal email field not reachable');
      await page.keyboard.type('traveler@example.com');
      const password = await tabUntil(
        page,
        'auth-modal',
        (el) => el.tag === 'input' && el.type === 'password',
        { maxTabs: 10 },
      );
      if (!password) throw new Error('auth modal password field not reachable');
      await page.keyboard.type('Password123!');
      const submit = await tabUntil(
        page,
        'auth-modal',
        (el) => el.tag === 'button' && el.type === 'submit',
        { maxTabs: 10 },
      );
      if (!submit) throw new Error('auth modal submit not reachable');
      record('auth-modal', submit, 'press Enter to sign in');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(3000);
      if (/\/checkout\/trip-1/.test(page.url())) reachedCheckout = true;
    }
  }
  if (!reachedCheckout) throw new Error('could not reach checkout by keyboard');
  await page.getByRole('heading', { name: /checkout/i }).first().waitFor({ timeout: 20000 });
  await page.waitForTimeout(1500);

  // ---- Leg 3: checkout form → submit → confirmation --------------------
  console.log('\n--- Leg 3: checkout form → confirmation (keyboard only) ---');
  // One continuous Tab walk through the whole form; we fill each field
  // as it receives focus and stop at the submit button. Tab order on
  // this page is DOM order: session radio → guests → name → phone →
  // proof upload → … → terms checkbox → Complete booking. (The
  // document/CIN field was removed in #466; the form now shows an
  // "agency may check ID at departure" note instead — asserted after
  // the walk below.)
  //
  // B9 (#481, PR #515): the terms-acceptance checkbox gates the submit
  // — the Complete booking button is disabled (and therefore not
  // Tab-focusable) until the box is ticked. A keyboard user accepts
  // with Space while the checkbox is focused, so the walk does exactly
  // that; before ticking it also asserts the gate is really holding
  // (button disabled), so a regression that ungates the submit fails
  // here instead of passing silently.
  const filled = { name: false, phone: false };
  let sawSessionRadio = false;
  let sawGuests = false;
  let sawProofUpload = false;
  let sawTermsCheckbox = false;
  let termsTicked = false;
  let submitInfo = null;
  let lastKey = null;
  let stuck = 0;

  for (let i = 0; i < 160 && !submitInfo; i++) {
    await page.keyboard.press('Tab');
    await page.waitForTimeout(90);
    const info = await page.evaluate(readFocusInPage);
    if (!info) continue;
    record('checkout', info);
    if (!info.visible || info.hiddenByCss) {
      fail(`[checkout] focused element is not visible: ${describeFocus(info)}`);
    }
    const key = focusKey(info);
    if (key === lastKey) {
      stuck += 1;
      const limit = info.tag === 'input' && DATE_TIME_TYPES.includes(info.type) ? 6 : 3;
      if (stuck >= limit) {
        fail(`[checkout] focus stuck on ${describeFocus(info)} (keyboard trap?)`);
        break;
      }
    } else {
      stuck = 0;
    }
    lastKey = key;

    if (info.role === 'radio') sawSessionRadio = true;
    if (info.tag === 'input' && info.type === 'number') sawGuests = true;
    if (info.tag === 'input' && info.type === 'file') sawProofUpload = true;

    if (info.tag === 'input' && info.name === 'name' && !filled.name) {
      await page.keyboard.type('Launch Traveler');
      filled.name = true;
      record('checkout', info, 'typed full name');
    } else if (info.tag === 'input' && (info.name === 'tel' || /country code/i.test(info.placeholder)) && !filled.phone) {
      await page.keyboard.type('+212600000000');
      filled.phone = true;
      record('checkout', info, 'typed phone number');
    } else if (
      info.tag === 'input' &&
      info.type === 'checkbox' &&
      info.id === 'checkout-terms-accept' &&
      !termsTicked
    ) {
      // B9 terms gate: assert the submit is still disabled BEFORE
      // acceptance (gate holding), then accept by keyboard (Space).
      sawTermsCheckbox = true;
      const submitDisabledBefore = await page.evaluate(() => {
        const btn = [...document.querySelectorAll('button')].find((b) =>
          /complete booking/i.test(b.textContent || ''),
        );
        return btn ? btn.disabled : null;
      });
      if (submitDisabledBefore === false) {
        fail('[checkout] Complete booking button is enabled before terms acceptance — the B9 gate is not holding');
      } else if (submitDisabledBefore === true) {
        console.log('   ✓ B9 gate holding: submit disabled before terms acceptance');
      }
      await page.keyboard.press('Space');
      await page.waitForTimeout(250);
      const nowChecked = await page.evaluate(
        () => document.getElementById('checkout-terms-accept')?.checked === true,
      );
      if (!nowChecked) {
        fail('[checkout] terms checkbox did not toggle with Space (keyboard acceptance failed)');
      } else {
        termsTicked = true;
        record('checkout', info, 'press Space to accept the booking terms (B9)');
      }
    } else if (info.tag === 'button' && /complete booking/i.test(info.text || info.ariaLabel || '')) {
      submitInfo = info;
    }
  }

  if (!sawSessionRadio) fail('[checkout] session radio was not in the Tab order');
  if (!sawGuests) fail('[checkout] guest-count input was not in the Tab order');
  if (!sawProofUpload) fail('[checkout] payment-proof file input was not keyboard-focusable');
  if (!sawTermsCheckbox) fail('[checkout] terms-acceptance checkbox (B9) was not in the Tab order');
  if (!filled.name || !filled.phone) {
    fail(`[checkout] could not fill all guest fields by keyboard: ${JSON.stringify(filled)}`);
  }
  // #466: no ID number is collected online anymore — the guest form
  // must show the "agency may check ID at departure" note in place of
  // the removed document field.
  const idNoteVisible = await page
    .getByText(/agency may check your ID at departure/i)
    .first()
    .isVisible()
    .catch(() => false);
  if (!idNoteVisible) {
    fail('[checkout] "agency may check your ID at departure" note not shown (the #466 replacement for the removed document field)');
  } else {
    console.log('   ✓ ID-at-departure note shown (no document field collected)');
  }
  if (!submitInfo) throw new Error('Complete booking button not reachable by keyboard');

  record('checkout', submitInfo, 'press Enter to submit the booking');
  await page.keyboard.press('Enter');
  await page.waitForURL(/\/checkout\/confirmation\?bookingId=booking-1/, { timeout: 25000 });
  await page.getByText(/booking submitted/i).first().waitFor({ timeout: 15000 });
  console.log('✅ Reached /checkout/confirmation — "Booking submitted" visible.');
} catch (err) {
  fail(`walkthrough aborted: ${err.message}`);
} finally {
  await browser.close();
}

console.log(`\n=== Keyboard checkout walkthrough: ${checklist.length} recorded Tab stops ===`);
if (process.env.WALKTHROUGH_OUT) {
  const md = [
    '# Keyboard checkout walkthrough — recorded run',
    '',
    `Environment: traveler app + e2e mock API (trip-1 / booking-1), Chromium, keyboard input only (Tab / Enter / typing).`,
    `Result: ${failures.length === 0 ? 'PASS — zero traps, every stop visible, booking submitted.' : `FAIL — ${failures.length} problem(s).`}`,
    '',
    '## Tab stops in order',
    '',
    ...checklist.map((l) => `- ${l}`),
    '',
    ...(failures.length ? ['## Failures', '', ...failures.map((f) => `- ${f}`), ''] : []),
  ].join('\n');
  writeFileSync(process.env.WALKTHROUGH_OUT, md);
  console.log(`Checklist written to ${process.env.WALKTHROUGH_OUT}`);
}

if (failures.length > 0) {
  console.log(`\n${failures.length} keyboard walkthrough problem(s) found.`);
  process.exit(1);
}
console.log('\nkeyboard checkout walkthrough complete — zero traps.');
