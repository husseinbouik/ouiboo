/**
 * Shared Next.js proxy (middleware) factory (#1018, finding D8).
 *
 * Until now every app cloned the same proxy boilerplate — the ~25-line
 * language preamble, the signed-BFF-cookie auth gate (#208) and the
 * matcher — and the clones drifted in a security-relevant way: the
 * sliding session renewal (#982) landed only in traveler's copy, so
 * agency/admin verified the session but never renewed it and the
 * "walled at /login mid-session" bug stayed latent in both portals.
 *
 * `createProxy` is now the single implementation. Each app's proxy.ts
 * is config-only: which paths are gated, which role they require, and
 * the app-specific extras (traveler's /fr + /ar locale aliases and its
 * noindex path list). Renewal parity is the default for every gated
 * app — see `renewSession`.
 *
 * Behaviour preserved per app (verified against the previous clones):
 * - Language resolution order: ?lang= → locale alias → i18nextLng
 *   cookie; the resolved language is forwarded as `x-ouiboo-language`
 *   and persisted to the i18nextLng cookie when it came from the query
 *   string or an alias.
 * - The gate redirects to /login with `?redirect=<original path>` —
 *   under the locale alias when the visitor arrived on one.
 * - Sliding renewal (#982) only ever extends a currently valid,
 *   signature-verified cookie past half its lifetime, and fails closed:
 *   a re-sign failure leaves the still-valid cookie untouched.
 */
import { NextRequest, NextResponse } from 'next/server';
import {
  signSession,
  verifySession,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from './signing';
import { sessionCookieOptions } from './cookies';

export const SUPPORTED_LANGUAGES = ['en', 'fr', 'ar'] as const;

export function normalizeLanguage(value?: string | null): string | null {
  const language = value?.split('-')[0]?.toLowerCase();

  return language && (SUPPORTED_LANGUAGES as readonly string[]).includes(language)
    ? language
    : null;
}

export interface ProxyGateOptions {
  /** Session role required on gated paths (e.g. 'AGENCY'). Omit to accept any verified session (traveler). */
  role?: string;
  /** Paths exempt from the gate (exact match or path-prefix). */
  publicPaths?: string[];
  /**
   * Gate only these paths (traveler model: the portal is public except
   * the account surface). Takes precedence over `gatedPrefix`.
   */
  protectedPaths?: string[];
  /**
   * Gate every path under this prefix unless it is public (agency
   * model: '/dashboard'). When neither this nor `protectedPaths` is
   * set, every non-public path is gated (admin model).
   */
  gatedPrefix?: string;
}

export interface CreateProxyOptions {
  /** Auth gate configuration. Omit for a language-only proxy (landing). */
  gate?: ProxyGateOptions;
  /**
   * Sliding session renewal (#982). Defaults to true when a gate is
   * configured, false otherwise. Renewal parity across the gated
   * portals is the point of #1018 — turning this off per app re-opens
   * the drift it fixes.
   */
  renewSession?: boolean;
  /**
   * Locale path aliases that rewrite to the unprefixed path with that
   * locale selected (#883, traveler: ['fr', 'ar']). Only exact prefix
   * matches count — /france or /articles are real paths, not aliases.
   */
  localeAliases?: readonly string[];
  /** Paths (matched on the alias-stripped pathname) that get an `X-Robots-Tag: noindex` header. */
  privatePathPrefixes?: readonly string[];
}

function matchesPath(pathname: string, paths: readonly string[]): boolean {
  return paths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function createProxy(options: CreateProxyOptions = {}) {
  const { gate } = options;
  const renewSession = options.renewSession ?? Boolean(gate);
  const localeAliases = options.localeAliases ?? [];
  const privatePathPrefixes = options.privatePathPrefixes ?? [];

  return async function proxy(request: NextRequest) {
    const requestHeaders = new Headers(request.headers);
    const queryLanguage = normalizeLanguage(request.nextUrl.searchParams.get('lang'));
    const cookieLanguage = normalizeLanguage(request.cookies.get('i18nextLng')?.value);

    // Locale aliases (#883): a shared link's recipient inherits no
    // ?lang= and no stored preference; the /fr or /ar prefix selects
    // the locale (an explicit ?lang= still wins) and the request is
    // rewritten to the unprefixed path below, so every existing route
    // serves localised under the alias.
    const rawPathname = request.nextUrl.pathname;
    const localePrefix =
      localeAliases.find(
        (alias) => rawPathname === `/${alias}` || rawPathname.startsWith(`/${alias}/`),
      ) ?? null;
    const pathname = localePrefix
      ? rawPathname.slice(localePrefix.length + 1) || '/'
      : rawPathname;

    const language = queryLanguage || localePrefix || cookieLanguage;

    if (language) {
      requestHeaders.set('x-ouiboo-language', language);
    }

    // The gate cookie is verified once, up front: the gate below
    // consumes it, and the sliding renewal further down re-issues it.
    const session =
      gate || renewSession
        ? await verifySession(request.cookies.get(SESSION_COOKIE_NAME)?.value)
        : null;

    // Auth gate (#208): redirect unauthenticated users from gated
    // paths. Runs on the alias-stripped path, so /ar/bookings gates
    // exactly like /bookings — and the login redirect keeps the alias
    // the visitor arrived on.
    if (gate) {
      const isPublic = gate.publicPaths ? matchesPath(pathname, gate.publicPaths) : false;
      let isGated: boolean;
      if (gate.protectedPaths) {
        isGated = matchesPath(pathname, gate.protectedPaths);
      } else if (gate.gatedPrefix) {
        isGated = !isPublic && pathname.startsWith(gate.gatedPrefix);
      } else {
        isGated = !isPublic;
      }
      const roleOk = !gate.role || session?.role === gate.role;
      if (isGated && (!session || !roleOk)) {
        const loginUrl = new URL(localePrefix ? `/${localePrefix}/login` : '/login', request.url);
        loginUrl.searchParams.set('redirect', rawPathname);
        return NextResponse.redirect(loginUrl);
      }
    }

    // Sliding renewal (#982, extends #208): the BFF cookie lives 15
    // minutes and was otherwise renewed only as a side effect of an
    // API-token refresh — an API call has to 401 first — so it lapsed
    // mid-session while the 7-day API refresh session was still valid,
    // and the gate walled signed-in users at /login. A verified cookie
    // past half its lifetime is re-signed and re-set on the response
    // (every matched path, public ones included: ordinary browsing is
    // the activity that must keep it alive).
    const sessionNeedsRenewal =
      renewSession &&
      session !== null &&
      session.exp * 1000 - Date.now() <= (SESSION_MAX_AGE_SECONDS * 1000) / 2;

    const response = localePrefix
      ? (() => {
          const rewriteUrl = request.nextUrl.clone();
          rewriteUrl.pathname = pathname;
          return NextResponse.rewrite(rewriteUrl, {
            request: {
              headers: requestHeaders,
            },
          });
        })()
      : NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        });

    if (sessionNeedsRenewal && session) {
      try {
        const renewed = await signSession({
          sub: session.sub,
          role: session.role,
          exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
        });
        response.cookies.set(SESSION_COOKIE_NAME, renewed, sessionCookieOptions());
      } catch {
        // Fail closed: a re-sign failure (e.g. missing SESSION_SECRET —
        // in which case verification above already failed) leaves the
        // still-valid cookie untouched; the gate above has the last word.
      }
    }

    if (queryLanguage || localePrefix) {
      response.cookies.set('i18nextLng', language!, {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax',
      });
    }

    if (privatePathPrefixes.length > 0 && matchesPath(pathname, privatePathPrefixes)) {
      response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
    }

    return response;
  };
}
