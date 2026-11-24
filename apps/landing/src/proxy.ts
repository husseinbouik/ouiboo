import { createProxy } from '@ouiboo/session';

/**
 * Landing proxy — configuration only since #1018 (finding D8).
 * Landing has no session gate; it adopts the shared `createProxy`
 * factory for the language preamble alone (?lang= / i18nextLng cookie
 * → `x-ouiboo-language` header + cookie persistence), which was the
 * fourth hand-copied clone of the same ~25 lines.
 */
export const proxy = createProxy();

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
