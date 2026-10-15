import { NextRequest, NextResponse } from 'next/server';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/session';

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
  const language = queryLanguage || cookieLanguage;

  if (language) {
    requestHeaders.set('x-ouiboo-language', language);
  }


  // Auth gate (#208): validate server-managed session instead of cookie presence.
  // The API's refresh_token cookie is HttpOnly and scoped to the API domain,
  // so this proxy can never see it. We validate our own signed session cookie.
  // Fail closed: invalid/missing/expired session -> redirect to login.
  const TRAVELER_PROTECTED = ['/messages', '/notifications', '/bookings', '/wishlist', '/profile'];
  const travelerPath = request.nextUrl.pathname;
  const travelerIsProtected = TRAVELER_PROTECTED.some((p) => travelerPath === p || travelerPath.startsWith(p + '/'));
  if (travelerIsProtected) {
    const session = await verifySession(request.cookies.get(SESSION_COOKIE_NAME)?.value);
    if (!session) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', travelerPath);
      return NextResponse.redirect(loginUrl);
    }
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  if (queryLanguage) {
    response.cookies.set('i18nextLng', queryLanguage, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    });
  }

  const isPrivatePath = privatePathPrefixes.some(
    (prefix) => request.nextUrl.pathname === prefix || request.nextUrl.pathname.startsWith(`${prefix}/`),
  );
  if (isPrivatePath) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
