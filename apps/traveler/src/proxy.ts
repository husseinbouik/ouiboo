import { createProxy } from '@ouiboo/session';

/**
 * Traveler proxy — configuration only since #1018 (finding D8).
 * The language preamble, the signed-BFF-cookie gate (#208), the /fr +
 * /ar locale aliases (#883) and the sliding session renewal (#982) are
 * implemented once in `@ouiboo/session`'s `createProxy`; this file
 * declares only what is traveler-specific:
 * - the portal is public except the account surface below;
 * - any verified session passes the gate (no role requirement — the
 *   API session stays authoritative for the data the pages load);
 * - the alias prefixes and the noindex (private) path list.
 */
export const proxy = createProxy({
  gate: {
    protectedPaths: ['/messages', '/notifications', '/bookings', '/wishlist', '/profile'],
  },
  localeAliases: ['fr', 'ar'],
  privatePathPrefixes: [
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
  ],
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
