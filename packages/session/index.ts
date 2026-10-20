/**
 * Public entrypoint for @ouiboo/session (#252).
 * Re-exports the shared BFF session primitives (Edge-runtime safe, zero runtime deps).
 */
export { createSessionRoute } from './src/route';
export type { CreateSessionRouteOptions } from './src/route';
export {
  signSession,
  verifySession,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from './src/signing';
export type { SessionPayload } from './src/signing';
export { sessionError, logSessionError } from './src/errors';
export type { SessionErrorCode } from './src/errors';
export { sessionCookieOptions } from './src/cookies';
