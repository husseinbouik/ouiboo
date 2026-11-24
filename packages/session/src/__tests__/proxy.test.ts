/**
 * Unit tests for the shared proxy factory (#1018, finding D8).
 *
 * The per-app proxies used to be hand-copied clones; the drift that
 * mattered was traveler's sliding session renewal (#982) existing in
 * one copy only. These tests pin the factory's contract for each
 * app's configuration shape:
 *  - language preamble (?lang= / i18nextLng cookie handling)
 *  - role gates for the agency (gatedPrefix) and admin (gate-all)
 *    models, incl. #257 portal role isolation
 *  - renewal parity: a verified cookie past half its lifetime is
 *    re-issued under every gated configuration, not just traveler's
 *
 * `next/server` is mocked with minimal NextResponse stand-ins (same
 * approach as route.test.ts); the signing path runs for real.
 */
import { createProxy, normalizeLanguage } from '../proxy';
import { signSession, SESSION_MAX_AGE_SECONDS } from '../signing';
import type { NextRequest } from 'next/server';

jest.mock(
  'next/server',
  () => {
    class FakeCookies {
      private jar = new Map<string, { value: string }>();
      set(name: string, value: string) {
        this.jar.set(name, { value });
      }
      get(name: string) {
        return this.jar.get(name);
      }
    }
    function makeResponse(init?: { status?: number; location?: string }) {
      return {
        status: init?.status ?? 200,
        headers: new Headers(init?.location ? { location: init.location } : {}),
        cookies: new FakeCookies(),
      };
    }
    return {
      NextResponse: {
        next: () => makeResponse(),
        rewrite: () => makeResponse(),
        redirect: (url: URL | string) => makeResponse({ status: 307, location: url.toString() }),
      },
    };
  },
  { virtual: true },
);

process.env.SESSION_SECRET = 'proxy-factory-test-secret';

const BASE = 'https://portal.ouiboo.test';

async function sessionCookie(role: string, expOffsetSeconds: number): Promise<string> {
  const token = await signSession({
    sub: 'user-1',
    role,
    exp: Math.floor(Date.now() / 1000) + expOffsetSeconds,
  });
  return `ouiboo_session=${token}`;
}

function request(path: string, cookieHeader?: string): NextRequest {
  const url = new URL(BASE + path);
  const jar = new Map<string, string>();
  if (cookieHeader) {
    for (const pair of cookieHeader.split('; ')) {
      const eq = pair.indexOf('=');
      jar.set(pair.slice(0, eq), pair.slice(eq + 1));
    }
  }
  const fake = {
    url: url.toString(),
    headers: new Headers(),
    cookies: {
      get: (name: string) => {
        const value = jar.get(name);
        return value === undefined ? undefined : { name, value };
      },
    },
    nextUrl: {
      pathname: url.pathname,
      searchParams: url.searchParams,
      clone: () => new URL(url.toString()),
    },
  };
  return fake as unknown as NextRequest;
}

type FakeResponse = {
  status: number;
  headers: Headers;
  cookies: { get: (n: string) => { value: string } | undefined };
};

describe('normalizeLanguage', () => {
  it('accepts supported languages and strips regions', () => {
    expect(normalizeLanguage('fr-CA')).toBe('fr');
    expect(normalizeLanguage('AR')).toBe('ar');
  });

  it('rejects unsupported or missing values', () => {
    expect(normalizeLanguage('es')).toBeNull();
    expect(normalizeLanguage(undefined)).toBeNull();
    expect(normalizeLanguage(null)).toBeNull();
  });
});

describe('language preamble (landing configuration: no gate)', () => {
  const proxy = createProxy();

  it('persists an explicit ?lang= to the i18nextLng cookie', async () => {
    const res = (await proxy(request('/?lang=fr'))) as unknown as FakeResponse;
    expect(res.status).toBe(200);
    expect(res.cookies.get('i18nextLng')?.value).toBe('fr');
  });

  it('does not set the cookie when the language came from the cookie itself', async () => {
    const res = (await proxy(request('/', 'i18nextLng=ar'))) as unknown as FakeResponse;
    expect(res.status).toBe(200);
    expect(res.cookies.get('i18nextLng')).toBeUndefined();
  });
});

describe('agency configuration (gatedPrefix + role)', () => {
  const proxy = createProxy({
    gate: {
      role: 'AGENCY',
      publicPaths: ['/login', '/signup', '/forgot-password', '/reset-password', '/verify'],
      gatedPrefix: '/dashboard',
    },
  });

  it('redirects a cookieless visitor from the dashboard to /login', async () => {
    const res = (await proxy(request('/dashboard'))) as unknown as FakeResponse;
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/login?redirect=%2Fdashboard');
  });

  it('rejects a session for the wrong portal (#257)', async () => {
    const res = (await proxy(
      request('/dashboard', await sessionCookie('TRAVELER', SESSION_MAX_AGE_SECONDS)),
    )) as unknown as FakeResponse;
    expect(res.status).toBe(307);
  });

  it('lets a fresh AGENCY session through untouched', async () => {
    const res = (await proxy(
      request('/dashboard', await sessionCookie('AGENCY', SESSION_MAX_AGE_SECONDS)),
    )) as unknown as FakeResponse;
    expect(res.status).toBe(200);
    expect(res.cookies.get('ouiboo_session')).toBeUndefined();
  });

  it('renews a half-expired AGENCY session — the #1018 parity fix (#982)', async () => {
    const res = (await proxy(
      request('/dashboard', await sessionCookie('AGENCY', 200)),
    )) as unknown as FakeResponse;
    expect(res.status).toBe(200);
    const renewed = res.cookies.get('ouiboo_session');
    expect(renewed).toBeDefined();
    const payload = JSON.parse(
      Buffer.from(renewed!.value.split('.')[0], 'base64url').toString(),
    ) as { exp: number };
    expect(payload.exp - Math.floor(Date.now() / 1000)).toBeGreaterThan(
      SESSION_MAX_AGE_SECONDS - 30,
    );
  });

  it('leaves public auth pages open', async () => {
    const res = (await proxy(request('/login'))) as unknown as FakeResponse;
    expect(res.status).toBe(200);
  });
});

describe('admin configuration (gate everything non-public + role)', () => {
  const proxy = createProxy({
    gate: { role: 'ADMIN', publicPaths: ['/login'] },
  });

  it('redirects a cookieless visitor from any non-public path', async () => {
    const res = (await proxy(request('/'))) as unknown as FakeResponse;
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/login?redirect=%2F');
  });

  it('lets an ADMIN session through and leaves /login open', async () => {
    const ok = (await proxy(
      request('/', await sessionCookie('ADMIN', SESSION_MAX_AGE_SECONDS)),
    )) as unknown as FakeResponse;
    expect(ok.status).toBe(200);
    const login = (await proxy(request('/login'))) as unknown as FakeResponse;
    expect(login.status).toBe(200);
  });
});
