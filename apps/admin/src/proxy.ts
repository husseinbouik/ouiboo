import { createProxy } from '@ouiboo/session';

/**
 * Admin proxy — configuration only since #1018 (finding D8).
 * The language preamble, the signed-BFF-cookie gate (#208) and the
 * sliding session renewal (#982) are implemented once in
 * `@ouiboo/session`'s `createProxy`; this file declares only what is
 * admin-specific: everything except /login is gated, and the session
 * must carry the ADMIN role (#257 portal isolation).
 *
 * Behaviour change in #1018, flagged deliberately: the shared factory
 * renews a verified session cookie past half its lifetime on every
 * matched path. Traveler had this since #982; the admin clone never
 * did, so operators could be walled at /login mid-session while their
 * API refresh session was still valid. Renewal only ever extends a
 * currently valid, signature-verified cookie.
 */
export const proxy = createProxy({
  gate: {
    role: 'ADMIN',
    publicPaths: ['/login'],
  },
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
