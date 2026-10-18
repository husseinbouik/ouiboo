/**
 * BFF session route factory (#208, #247, #252).
 *
 * POST   /api/auth/session  { accessToken } -> validates with API, sets signed session cookie
 * GET    /api/auth/session                    -> returns current session status from cookie
 * DELETE /api/auth/session                    -> clears session cookie
 *
 * Extracted verbatim from the three per-app session routes (agency/traveler/admin),
 * which were identical except for ALLOWED_ROLE. Behavior is byte-for-byte identical:
 * same error codes, same cookie options, same logging, same fail-fast config checks.
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
 *
 * Migration per app:
 *   import { createSessionRoute } from '@ouiboo/session';
 *   export const { POST, GET, DELETE } = createSessionRoute({ allowedRole: 'AGENCY' });
 */
import { NextRequest, NextResponse } from 'next/server';
import { signSession, verifySession, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from './signing';
import { sessionError, logSessionError } from './errors';
import { sessionCookieOptions } from './cookies';

export interface CreateSessionRouteOptions {
  /**
   * Portal role isolation (#257): only this role may establish a session here.
   * 'AGENCY' | 'TRAVELER' | 'ADMIN'
   */
  allowedRole: string;
  /**
   * Base URL of the API. Defaults to NEXT_PUBLIC_API_URL (same as the per-app routes).
   */
  apiUrl?: string;
}

const DEFAULT_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export function createSessionRoute(options: CreateSessionRouteOptions) {
  /** Portal role isolation (#257): only this role may establish a session here. */
  const ALLOWED_ROLE = options.allowedRole;
  const API_URL = options.apiUrl ?? DEFAULT_API_URL;

  async function POST(request: NextRequest) {
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

  async function GET(request: NextRequest) {
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

  async function DELETE() {
    const response = NextResponse.json({ message: 'Session cleared' });
    response.cookies.set(SESSION_COOKIE_NAME, '', {
      ...sessionCookieOptions(),
      maxAge: 0,
    });
    return response;
  }

  return { POST, GET, DELETE };
}
