import { SetMetadata } from '@nestjs/common';

/**
 * Marks a route handler (or a whole controller) as exempt from
 * JwtAuthGuard (#391). Use sparingly: only for endpoints that carry
 * their own credential — e.g. the signed-token private-file download,
 * where the short-lived token itself is the authorization and no
 * session exists. Other guards (rate limiting, roles, …) still apply.
 */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
