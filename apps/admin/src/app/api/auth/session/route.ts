/**
 * BFF session route (#208).
 *
 * POST   /api/auth/session  { accessToken } -> validates with API, sets signed session cookie
 * GET    /api/auth/session                    -> returns current session status from cookie
 * DELETE /api/auth/session                    -> clears session cookie
 */
import { NextRequest, NextResponse } from 'next/server';
import { signSession, verifySession, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from '@/lib/session';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

function sessionCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

export async function POST(request: NextRequest) {
  try {
    const { accessToken } = await request.json();
    if (!accessToken || typeof accessToken !== 'string') {
      return NextResponse.json({ error: 'accessToken required' }, { status: 400 });
    }

    // Validate the access token with the API (authoritative)
    const apiRes = await fetch(`${API_URL}/users/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });
    if (!apiRes.ok) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    const user = await apiRes.json();
    const userData = user.data ?? user;
    if (!userData?.id || !userData?.role) {
      return NextResponse.json({ error: 'Invalid user' }, { status: 401 });
    }

    const token = await signSession({
      sub: userData.id,
      role: userData.role,
      exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
    });

    const response = NextResponse.json({
      user: { id: userData.id, email: userData.email, name: userData.name, role: userData.role },
    });
    response.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions());
    return response;
  } catch {
    return NextResponse.json({ error: 'Session creation failed' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const session = await verifySession(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({
    authenticated: true,
    user: { id: session.sub, role: session.role },
    expiresAt: new Date(session.exp * 1000).toISOString(),
  });
}

export async function DELETE() {
  const response = NextResponse.json({ message: 'Session cleared' });
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    ...sessionCookieOptions(),
    maxAge: 0,
  });
  return response;
}
