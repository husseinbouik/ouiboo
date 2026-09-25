import { NextRequest, NextResponse } from 'next/server';

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

export function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const queryLanguage = normalizeLanguage(request.nextUrl.searchParams.get('lang'));
  const cookieLanguage = normalizeLanguage(request.cookies.get('i18nextLng')?.value);
  const language = queryLanguage || cookieLanguage;

  if (language) {
    requestHeaders.set('x-ouiboo-language', language);
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
