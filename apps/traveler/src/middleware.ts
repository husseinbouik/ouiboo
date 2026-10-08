import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that require authentication
const PROTECTED_PATHS = ['/messages', '/notifications', '/bookings', '/wishlist', '/profile'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only check protected paths; public pages (home, search, trip detail) are open
  const isProtected = PROTECTED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  );
  if (!isProtected) {
    return NextResponse.next();
  }

  // Check for refresh token cookie (httpOnly, set by API on login)
  const refreshToken = request.cookies.get('refresh_token');

  if (!refreshToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|locales).*)'],
};
