import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '../../database/database.service';
import { UserRole } from '@ouiboo/types';

const UNAUTHORIZED_MESSAGE = 'Unauthorized';

/**
 * #418 (Council P0-13): guard for the MFA enrolment endpoints.
 *
 * Enrolment is reachable in exactly two states:
 *  1. An already-authenticated ADMIN (normal access token) enrolling
 *     voluntarily — the service additionally requires password re-entry.
 *  2. An ADMIN who just passed password login but has no MFA yet while
 *     ADMIN_MFA_REQUIRED=true — they hold only a short-lived
 *     `purpose: 'mfa-enrollment'` challenge token, which grants access to
 *     NOTHING except these enrolment endpoints (the JwtStrategy rejects
 *     any token carrying a purpose claim).
 *
 * On success the request gains `user` (same shape as JwtStrategy) and
 * `mfaEnrollmentViaChallenge: boolean`.
 */
@Injectable()
export class MfaEnrollmentGuard implements CanActivate {
    constructor(
        private readonly jwtService: JwtService,
        private readonly db: DatabaseService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const req = context.switchToHttp().getRequest();
        const header = req.headers?.authorization as string | undefined;
        if (!header?.startsWith('Bearer ')) {
            throw new UnauthorizedException(UNAUTHORIZED_MESSAGE);
        }
        const token = header.slice('Bearer '.length).trim();
        const accessSecret = process.env.JWT_SECRET;
        if (!token || !accessSecret) {
            throw new UnauthorizedException(UNAUTHORIZED_MESSAGE);
        }

        let payload: { sub?: string; purpose?: string };
        try {
            payload = this.jwtService.verify(token, { secret: accessSecret });
        } catch {
            throw new UnauthorizedException(UNAUTHORIZED_MESSAGE);
        }
        if (!payload?.sub) {
            throw new UnauthorizedException(UNAUTHORIZED_MESSAGE);
        }

        const viaChallenge = payload.purpose === 'mfa-enrollment';
        if (payload.purpose && !viaChallenge) {
            // mfa-challenge tokens (and any other purpose) are not enrolment
            // credentials, and purpose tokens are never access tokens.
            throw new UnauthorizedException(UNAUTHORIZED_MESSAGE);
        }

        const user = await this.db.user.findUnique({
            where: { id: payload.sub },
            select: { id: true, email: true, role: true, isEmailVerified: true },
        });
        if (!user || !user.isEmailVerified || user.role !== UserRole.Admin) {
            throw new UnauthorizedException(UNAUTHORIZED_MESSAGE);
        }

        req.user = { id: user.id, userId: user.id, email: user.email, role: user.role };
        req.mfaEnrollmentViaChallenge = viaChallenge;
        return true;
    }
}
