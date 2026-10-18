/**
 * BFF session route (#208, #247).
 *
 * POST   /api/auth/session  { accessToken } -> validates with API, sets signed session cookie
 * GET    /api/auth/session                    -> returns current session status from cookie
 * DELETE /api/auth/session                    -> clears session cookie
 *
 * #247: POST failures return stable error codes for diagnostics:
 *   SESSION_MALFORMED      (400) - missing/invalid request body
 *   SESSION_INVALID_TOKEN  (401) - API rejected the token
 *   SESSION_ROLE_MISMATCH  (403) - token valid but role not allowed on this portal (#257)
 *   SESSION_UPSTREAM_ERROR (502) - API validation unreachable (network/timeout)
 *   SESSION_CONFIG_ERROR   (500) - SESSION_SECRET missing or invalid
 *
 * #257: Portal role isolation - a session is only created when the user's role
 * matches this portal. Cross-portal sessions are rejected with 403.
 */
import { NextRequest, NextResponse } from 'next/server';
import { signSession, verifySession, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from '@/lib/session';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

/** Stable error codes for BFF session diagnostics (#247). */
type SessionErrorCode =
  | 'SESSION_MALFORMED'
  | 'SESSION_INVALID_TOKEN'
  | 'SESSION_ROLE_MISMATCH'
  | 'SESSION_UPSTREAM_ERROR'
  | 'SESSION_CONFIG_ERROR';

/** Portal role isolation (#257): only this role may establish a session here. */
const ALLOWED_ROLE = 'ADMIN';

function sessionError(code: SessionErrorCode, status: number, message: string) {
  return NextResponse.json({ error: code, message }, { status });
}

/**
 * Safe diagnostic logging (#247): error category + timestamp only.
 * NEVER log tokens, cookies, passwords, or request bodies.
 */
function logSessionError(code: SessionErrorCode, context: string) {
  console.error(`[session:${code}] ${context} at=${new Date().toISOString()}`);
}

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
  let accessToken: unknown;
  try {
    ({ accessToken } = await request.json());
  } catch {
    logSessionError('SESSION_MALFORMED', 'POST body parse failed');
    return sessionError('SESSION_MALFORMED', 400, 'Invalid request body');
  }
  if (!accessToken || typeof accessToken !== 'string') {
    logSessionError('SESSION_MALFORMED', 'POST missing accessToken');
    return sessionError('SESSION_MALFORMED', 400, 'Invalid request body');
  }

  // Fail fast on missing server config (#243, #247) rather than hitting the API first.
  if (!process.env.SESSION_SECRET) {
    logSessionError('SESSION_CONFIG_ERROR', 'POST SESSION_SECRET not configured');
    return sessionError('SESSION_CONFIG_ERROR', 500, 'Session service misconfigured');
  }

  // Validate the access token with the API (authoritative)
  let apiRes: Response;
  try {
    apiRes = await fetch(`${API_URL}/users/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });
  } catch {
    logSessionError('SESSION_UPSTREAM_ERROR', 'POST users/me fetch failed');
    return sessionError('SESSION_UPSTREAM_ERROR', 502, 'Authentication service unavailable');
  }
  if (!apiRes.ok) {
    logSessionError('SESSION_INVALID_TOKEN', `POST users/me rejected status=${apiRes.status}`);
    return sessionError('SESSION_INVALID_TOKEN', 401, 'Invalid or expired token');
  }
  const user = await apiRes.json();
  const userData = user.data ?? user;
  if (!userData?.id || !userData?.role) {
    logSessionError('SESSION_INVALID_TOKEN', 'POST users/me missing id/role');
    return sessionError('SESSION_INVALID_TOKEN', 401, 'Invalid or expired token');
  }

  // Portal role isolation (#257): reject tokens whose role does not match this portal.
  // Log only the mismatch (never the token or user id).
  if (userData.role !== ALLOWED_ROLE) {
    logSessionError('SESSION_ROLE_MISMATCH', `POST role mismatch expected=${ALLOWED_ROLE}`);
    return sessionError('SESSION_ROLE_MISMATCH', 403, 'Account not authorized for this portal');
  }

  let token: string;
  try {
    token = await signSession({
      sub: userData.id,
      role: userData.role,
      exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
    });
  } catch {
    logSessionError('SESSION_CONFIG_ERROR', 'POST signSession failed');
    return sessionError('SESSION_CONFIG_ERROR', 500, 'Session service misconfigured');
  }

  const response = NextResponse.json({
    user: { id: userData.id, email: userData.email, name: userData.name, role: userData.role },
  });
  response.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions());
  return response;
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
