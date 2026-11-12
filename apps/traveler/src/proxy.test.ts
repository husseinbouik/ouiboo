/**
 * @jest-environment node
 *
 * Traveller proxy gate + sliding BFF-session renewal (#982, #208).
 * Exercises the proxy with real signed session cookies and real
 * NextResponse objects. The request is a minimal duck-typed stand-in
 * for NextRequest: constructing a real NextRequest is impossible in
 * this app's jest setup (the '.* /lib/i18n' moduleNameMapper hijacks
 * next's internal locale-detection module), and the proxy only reads
 * url / nextUrl / cookies / headers from its request.
 */
import type { NextRequest } from 'next/server';
import { signSession, SESSION_MAX_AGE_SECONDS } from '@ouiboo/session';
import { proxy } from './proxy';

process.env.SESSION_SECRET = 'proxy-test-secret';

const BASE = 'https://traveler.ouiboo.test';

async function sessionCookie(expOffsetSeconds: number): Promise<string> {
  const token = await signSession({
    sub: 'user-1',
    role: 'TRAVELER',
    exp: Math.floor(Date.now() / 1000) + expOffsetSeconds,
  });
  return `ouiboo_session=${token}`;
}

function request(path: string, cookie?: string): NextRequest {
  const url = new URL(BASE + path);
  const jar = new Map<string, string>();
  if (cookie) {
    const eq = cookie.indexOf('=');
    jar.set(cookie.slice(0, eq), cookie.slice(eq + 1));
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

function renewedExp(response: { cookies: { get: (n: string) => { value: string } | undefined } }): number | null {
  const set = response.cookies.get('ouiboo_session');
  if (!set) return null;
  const payload = JSON.parse(Buffer.from(set.value.split('.')[0], 'base64url').toString()) as { exp: number };
  return payload.exp;
}

describe('traveler proxy auth gate', () => {
  it('redirects a cookieless visitor from a gated page to /login with the redirect back', async () => {
    const res = await proxy(request('/bookings'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/login?redirect=%2Fbookings');
  });

  it('redirects when the gate cookie has expired', async () => {
    const res = await proxy(request('/wishlist', await sessionCookie(-60)));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/login');
  });

  it('lets a fresh gate cookie through without touching it', async () => {
    const res = await proxy(request('/bookings', await sessionCookie(SESSION_MAX_AGE_SECONDS)));
    expect(res.status).not.toBe(307);
    expect(res.cookies.get('ouiboo_session')).toBeUndefined();
  });
});

describe('traveler proxy sliding renewal (#982)', () => {
  it('re-issues a verified cookie that is past half its lifetime, on a gated page', async () => {
    const res = await proxy(request('/bookings', await sessionCookie(200)));
    expect(res.status).not.toBe(307);
    const exp = renewedExp(res);
    expect(exp).not.toBeNull();
    // Renewed for a full fresh lifetime, not the ~200s the old one had left.
    expect(exp! - Math.floor(Date.now() / 1000)).toBeGreaterThan(SESSION_MAX_AGE_SECONDS - 30);
  });

  it('renews on public pages too — ordinary browsing is the activity that keeps the session alive', async () => {
    const res = await proxy(request('/', await sessionCookie(200)));
    expect(renewedExp(res)).not.toBeNull();
  });

  it('does not renew a cookie that still has most of its lifetime left', async () => {
    const res = await proxy(request('/', await sessionCookie(SESSION_MAX_AGE_SECONDS - 60)));
    expect(res.cookies.get('ouiboo_session')).toBeUndefined();
  });

  it('never renews an invalid cookie on a public page', async () => {
    const res = await proxy(request('/', 'ouiboo_session=not-a-real-token'));
    expect(res.status).not.toBe(307);
    expect(res.cookies.get('ouiboo_session')).toBeUndefined();
  });
});
