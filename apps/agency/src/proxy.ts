import { NextRequest, NextResponse } from 'next/server';
import { verifySession, SESSION_COOKIE_NAME } from '@ouiboo/session';

const supportedLanguages = ['en', 'fr', 'ar'];

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


  // Auth gate: redirect unauthenticated users from dashboard.
  // Validates the signed BFF session cookie (ouiboo_session) with AGENCY role (#208).
  const AGENCY_PUBLIC = ['/login', '/signup', '/forgot-password', '/reset-password', '/verify'];
  const agencyPath = request.nextUrl.pathname;
  const agencyIsPublic = AGENCY_PUBLIC.some((p) => agencyPath === p || agencyPath.startsWith(p + '/'));
  if (!agencyIsPublic && agencyPath.startsWith('/dashboard')) {
    const session = await verifySession(request.cookies.get(SESSION_COOKIE_NAME)?.value);
    if (!session || session.role !== 'AGENCY') {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', agencyPath);
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

  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
