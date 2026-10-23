/**
 * Shared helpers for the .github/lighthouse a11y check scripts (#332).
 *
 * - parseTargetArgs: `node <script>.mjs [baseUrl] [pagesCsv] [--role=ROLE]`
 *   Defaults preserve the historical traveler-only invocations.
 * - signTestSession: signs a BFF `ouiboo_session` cookie exactly like
 *   e2e/helpers.ts does, so the checks can scan the authenticated
 *   agency/admin shells against the e2e mock API. Requires SESSION_SECRET
 *   to match the value the apps run with (the workflow sets the same
 *   test-only secret as browser-e2e.yml). Never a real secret.
 */
import { createHmac } from 'node:crypto';

export const DEFAULT_PAGES = ['/', '/search', '/login', '/signup'];

export function parseTargetArgs(argv = process.argv.slice(2)) {
  const positional = argv.filter((a) => !a.startsWith('--'));
  const roleArg = argv.find((a) => a.startsWith('--role='));
  return {
    baseUrl: positional[0] || 'http://localhost:3001',
    pages: positional[1]
      ? positional[1].split(',').map((p) => p.trim()).filter(Boolean)
      : DEFAULT_PAGES,
    role: roleArg ? roleArg.split('=')[1] : null,
    mockUnauthenticated: argv.includes('--mock-unauthenticated'),
  };
}

/**
 * Simulates the production unauthenticated state for one page: the real
 * API answers a tokenless GET /users/me with 401, while the e2e mock API
 * returns a user unconditionally. AdminShell (apps/admin) trusts that
 * response and never renders the login form when a "user" exists, so
 * the admin /login checks use this to see the form a logged-out admin
 * actually gets. Scoped per-invocation; all other targets keep the
 * mock's default behavior (which the authed shell scans rely on).
 */
export async function mockUnauthenticated(page) {
  await page.route('**/users/me', async (route) => {
    const origin = route.request().headers()['origin'] || '*';
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      },
      body: JSON.stringify({ message: 'Unauthorized' }),
    });
  });
}

const base64UrlEncode = (data) =>
  Buffer.from(data, 'utf8').toString('base64url');

export function signTestSession(role, sub = 'a11y-check-user') {
  const secret = process.env.SESSION_SECRET || 'e2e-test-secret';
  const payload = { sub, role, exp: Math.floor(Date.now() / 1000) + 15 * 60 };
  const encoded = base64UrlEncode(JSON.stringify(payload));
  const signature = createHmac('sha256', secret)
    .update(encoded, 'utf8')
    .digest('base64url');
  return `${encoded}.${signature}`;
}

/**
 * Scrolls through the whole page and back so scroll-triggered
 * (whileInView) content actually renders before an axe scan — without
 * this, below-the-fold sections sit at opacity 0 and axe silently
 * skips them (#332).
 */
export async function scrollThroughPage(page) {
  await page.evaluate(async () => {
    const step = Math.max(300, Math.floor(window.innerHeight * 0.8));
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 100));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(600);
}

/** Adds the BFF session cookies to a Playwright browser context. */
export async function addSessionCookies(context, baseUrl, role) {
  await context.addCookies([
    {
      name: 'ouiboo_session',
      value: signTestSession(role),
      url: baseUrl,
      httpOnly: true,
      sameSite: 'Lax',
    },
    {
      // The proxy also checks for a refresh_token cookie (see
      // e2e/helpers.ts authenticateAs for why a dummy value works).
      name: 'refresh_token',
      value: 'a11y-check-refresh-token',
      url: baseUrl,
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
}

/** Short human description of a focused element, for logs/checklists. */
export function describeFocus(el) {
  if (!el) return '<none>';
  const label = (el.ariaLabel || el.text || el.placeholder || '').trim().slice(0, 50);
  return `<${el.tag}${el.id ? `#${el.id}` : ''}>${label ? ` "${label}"` : ''}`;
}

/** Page-side probe of the currently focused element (pass to page.evaluate). */
export function readFocusInPage() {
  const el = document.activeElement;
  if (!el || el === document.body) return null;
  const rect = el.getBoundingClientRect();
  const style = window.getComputedStyle(el);
  return {
    tag: el.tagName.toLowerCase(),
    type: (el.getAttribute('type') || '').toLowerCase(),
    id: el.id || '',
    role: el.getAttribute('role') || '',
    href: el.getAttribute('href') || '',
    name: el.getAttribute('name') || '',
    placeholder: el.getAttribute('placeholder') || '',
    ariaLabel:
      el.getAttribute('aria-label') ||
      (el.innerText || el.value || '').trim().slice(0, 60),
    text: (el.innerText || el.value || '').trim().slice(0, 60),
    visible: rect.width > 0 && rect.height > 0,
    hiddenByCss: style.visibility === 'hidden' || style.display === 'none',
  };
}
