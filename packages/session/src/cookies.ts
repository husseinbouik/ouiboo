/**
 * Session cookie constants and options (#208, #247, #252).
 *
 * Byte-for-byte behavior-identical to the per-app session routes:
 * httpOnly, secure in production, sameSite 'lax', path '/', maxAge 15 minutes.
 */
import { SESSION_MAX_AGE_SECONDS } from './signing';

export { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from './signing';

export function sessionCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}
