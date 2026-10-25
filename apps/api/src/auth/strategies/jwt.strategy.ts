import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private readonly db: DatabaseService,
    ) {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            throw new Error('JWT_SECRET is required');
        }
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: secret,
        });
    }

    async validate(payload: { sub?: string; purpose?: string }) {
        // #418: purpose-scoped tokens (MFA challenge / enrolment challenges)
        // are single-purpose credentials, never access tokens. Reject any
        // token that carries a purpose claim on normal API routes.
        if (!payload?.sub || payload.purpose) {
            throw new UnauthorizedException('Unauthorized');
        }

        const record = await this.db.user.findUnique({
            where: { id: payload.sub },
            select: {
                id: true,
                email: true,
                role: true,
                isEmailVerified: true,
                agencyProfile: { select: { id: true } },
            },
        });

        if (!record || !record.isEmailVerified) {
            throw new UnauthorizedException(
                record ? 'EMAIL_NOT_VERIFIED' : 'Unauthorized',
            );
        }

        const tenantId = record.agencyProfile?.id ?? null;
        return {
            id: record.id,
            userId: record.id,
            email: record.email,
            role: record.role,
            agencyId: tenantId,
            tenantId,
        };
    }
}
