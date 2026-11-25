import { createProxy } from '@ouiboo/session';

/**
 * Agency proxy — configuration only since #1018 (finding D8).
 * The language preamble, the signed-BFF-cookie gate (#208) and the
 * sliding session renewal (#982) are implemented once in
 * `@ouiboo/session`'s `createProxy`; this file declares only what is
 * agency-specific: the dashboard is gated, the auth pages are public,
 * and the session must carry the AGENCY role (#257 portal isolation).
 *
 * Behaviour change in #1018, flagged deliberately: the shared factory
 * renews a verified session cookie past half its lifetime on every
 * matched path. Traveler had this since #982; the agency clone never
 * did, so agency users could be walled at /login mid-session while
 * their API refresh session was still valid. Renewal only ever extends
 * a currently valid, signature-verified cookie.
 */
export const proxy = createProxy({
  gate: {
    role: 'AGENCY',
    publicPaths: ['/login', '/signup', '/forgot-password', '/reset-password', '/verify'],
    gatedPrefix: '/dashboard',
  },
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
