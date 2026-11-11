import { NextRequest, NextResponse } from 'next/server';
import { verifySession, SESSION_COOKIE_NAME } from '@ouiboo/session';

const supportedLanguages = ['en', 'fr', 'ar'];

const privatePathPrefixes = [
  '/booking',
  '/bookings',
  '/checkout',
  '/forgot-password',
  '/login',
  '/profile',
  '/reset-password',
  '/signup',
  '/verify',
  '/wishlist',
];

function normalizeLanguage(value?: string | null) {
  const language = value?.split('-')[0]?.toLowerCase();

  return language && supportedLanguages.includes(language) ? language : null;
}

export async function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const queryLanguage = normalizeLanguage(request.nextUrl.searchParams.get('lang'));
  const cookieLanguage = normalizeLanguage(request.cookies.get('i18nextLng')?.value);

  // #883 (Council S12 P0): /fr and /ar path aliases. A shared link's
  // recipient inherits nothing — no ?lang=, no stored preference —
  // and the most natural retyped form of a forwarded link is /ar or
  // /fr. The prefix selects the locale (an explicit ?lang= still
  // wins) and the request is rewritten to the unprefixed path, so
  // every existing route serves localised under the alias — and an
  // unknown /fr/* or /ar/* path reaches the app 404, which renders
  // in that locale because the language cookie is set below. Only
  // exact prefixes match: /france or /articles are real paths, not
  // aliases. Full locale routing stays a public-launch item.
  const rawPathname = request.nextUrl.pathname;
  const localePrefix = rawPathname === '/fr' || rawPathname.startsWith('/fr/')
    ? 'fr'
    : rawPathname === '/ar' || rawPathname.startsWith('/ar/')
      ? 'ar'
      : null;
  const pathname = localePrefix
    ? rawPathname.slice(localePrefix.length + 1) || '/'
    : rawPathname;

  const language = queryLanguage || localePrefix || cookieLanguage;

  if (language) {
    requestHeaders.set('x-ouiboo-language', language);
  }


  // Auth gate: redirect unauthenticated users from protected pages.
  // Validates the signed BFF session cookie (ouiboo_session) (#208).
  // Runs on the STRIPPED path, so /ar/bookings gates exactly like
  // /bookings — and the login redirect keeps the alias the visitor
  // arrived on.
  const TRAVELER_PROTECTED = ['/messages', '/notifications', '/bookings', '/wishlist', '/profile'];
  const travelerPath = pathname;
  const travelerIsProtected = TRAVELER_PROTECTED.some((p) => travelerPath === p || travelerPath.startsWith(p + '/'));
  if (travelerIsProtected) {
    const session = await verifySession(request.cookies.get(SESSION_COOKIE_NAME)?.value);
    if (!session) {
      const loginUrl = new URL(localePrefix ? `/${localePrefix}/login` : '/login', request.url);
      loginUrl.searchParams.set('redirect', rawPathname);
      return NextResponse.redirect(loginUrl);
    }
  }

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

  if (queryLanguage || localePrefix) {
    response.cookies.set('i18nextLng', language!, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    });
  }

  const isPrivatePath = privatePathPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (isPrivatePath) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
