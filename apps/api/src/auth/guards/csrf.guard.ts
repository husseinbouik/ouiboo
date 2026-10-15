import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import { getTrustedOrigins } from '../../common/trusted-origins.util';

/**
 * CSRF protection for cookie-based mutations (#212).
 *
 * The refresh_token cookie uses SameSite=None in production for cross-site
 * app/API communication, so the browser WILL send it on cross-origin requests.
 * This guard ensures the request actually originated from a trusted app.
 *
 * Validation order (fail-closed):
 * 1. Origin header present → must exactly match a trusted origin.
 * 2. No Origin, Referer present → Referer's origin must match a trusted origin.
 * 3. Neither present → require X-Requested-With header (custom headers can't be
 *    sent cross-origin without a CORS preflight, which untrusted origins fail).
 *
 * Browsers always send Origin on POST fetch/XHR requests and cannot be forged
 * by an attacker's page, so step 1 blocks classic CSRF form/fetch attacks.
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const trustedOrigins = getTrustedOrigins();

    const origin = req.headers.origin;
    if (origin) {
      if (!trustedOrigins.includes(origin)) {
        throw new ForbiddenException('Cross-origin request rejected');
      }
      return true;
    }

    const referer = req.headers.referer;
    if (referer) {
      let refererOrigin: string;
      try {
        refererOrigin = new URL(referer).origin;
      } catch {
        throw new ForbiddenException('Invalid referer header');
      }
      if (!trustedOrigins.includes(refererOrigin)) {
        throw new ForbiddenException('Cross-origin request rejected');
      }
      return true;
    }

    // No Origin or Referer (non-browser client): require a custom header.
    // Fail closed — reject when in doubt.
    const requestedWith = req.headers['x-requested-with'];
    if (requestedWith) {
      return true;
    }

    throw new ForbiddenException('Missing origin validation');
  }
}
