import { NextRequest, NextResponse } from 'next/server';

const supportedLanguages = ['en', 'fr', 'ar'];

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


  // Auth gate (#185): redirect unauthenticated users from protected routes
  const ADMIN_PUBLIC = ['/login'];
  const adminPath = request.nextUrl.pathname;
  const adminIsPublic = ADMIN_PUBLIC.some((p) => adminPath === p || adminPath.startsWith(p + '/'));
  if (!adminIsPublic && !request.cookies.get('refresh_token')) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', adminPath);
    return NextResponse.redirect(loginUrl);
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
