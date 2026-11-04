import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    Logger,
    UnauthorizedException,
} from '@nestjs/common';
import { UserRole } from '@ouiboo/types';
import { DatabaseService } from '../database/database.service';
import { MfaService } from '../auth/mfa.service';

/** The PlatformSetting key holding the gateway enablement lock. */
export const GATEWAY_ENABLEMENT_KEY = 'gateway.enablement';

/** AuditLog action written on every enablement change. */
export const GATEWAY_ENABLEMENT_AUDIT_ACTION = 'GATEWAY_ENABLEMENT_CHANGED';

/**
 * #635 (Council S4, P2-7): the SECOND, independent gateway-enablement
 * control. Card payments historically required only the
 * `ENABLE_GATEWAY_PAYMENTS` env flag — a single flip could activate
 * the gateway. Now the payment provider path requires BOTH controls:
 *
 *   1. env flag `ENABLE_GATEWAY_PAYMENTS === 'true'` (deploy layer), AND
 *   2. the DB-backed platform setting `gateway.enablement === 'true'`
 *      (data layer, this service).
 *
 * The setting defaults OFF: an absent row, any other value, or a read
 * failure all mean OFF (fail closed). It can only be changed through
 * `setEnabled`, which requires an admin account with MFA enrolled and
 * a fresh TOTP step-up code, and writes an AuditLog row in the same
 * transaction as the change.
 */
@Injectable()
export class GatewayEnablementService {
    private readonly logger = new Logger(GatewayEnablementService.name);

    constructor(
        private readonly db: DatabaseService,
        private readonly mfa: MfaService,
    ) { }

    /** Control 1: the deploy-layer env flag. */
    envFlagEnabled(): boolean {
        return process.env.ENABLE_GATEWAY_PAYMENTS === 'true';
    }

    /** Control 2: the DB-backed platform setting (absent = OFF). */
    async platformSettingEnabled(): Promise<boolean> {
        try {
            const row = await this.db.platformSetting.findUnique({
                where: { key: GATEWAY_ENABLEMENT_KEY },
            });
            return row?.value === 'true';
        } catch (error) {
            // Fail closed: an unreadable setting must never read as ON.
            this.logger.error(
                `Gateway enablement setting could not be read; treating as OFF: ${(error as Error)?.message ?? error}`,
            );
            return false;
        }
    }

    /** BOTH controls are required before any gateway flow activates. */
    async isGatewayEnabled(): Promise<boolean> {
        return this.envFlagEnabled() && (await this.platformSettingEnabled());
    }

    async getStatus() {
        const [platformSettingEnabled, settingRow] = await Promise.all([
            this.platformSettingEnabled(),
            this.db.platformSetting
                .findUnique({ where: { key: GATEWAY_ENABLEMENT_KEY } })
                .catch(() => null),
        ]);
        const envFlagEnabled = this.envFlagEnabled();
        return {
            envFlagEnabled,
            platformSettingEnabled,
            gatewayEnabled: envFlagEnabled && platformSettingEnabled,
            updatedById: settingRow?.updatedById ?? null,
            updatedByEmail: settingRow?.updatedByEmail ?? null,
            updatedAt: settingRow?.updatedAt ?? null,
        };
    }

    /**
     * Change the DB lock. Admin-only (the controller enforces the role;
     * re-checked here against the stored user), MFA-gated by a fresh
     * TOTP step-up: the code must verify against the admin's enrolled
     * secret and must not replay a previously accepted step (#642
     * discipline). Every successful change is audit-logged atomically
     * with the setting write.
     */
    async setEnabled(
        actor: { id: string; email?: string | null },
        enabled: boolean,
        totpCode: string,
    ) {
        const user = await this.db.user.findUnique({ where: { id: actor.id } });
        if (!user || user.role !== UserRole.Admin) {
            throw new ForbiddenException('Only administrators can change gateway enablement');
        }
        if (!user.mfaEnabled || !user.mfaTotpSecret) {
            throw new ForbiddenException(
                'MFA enrolment is required before gateway enablement can be changed',
            );
        }
        if (!totpCode || typeof totpCode !== 'string') {
            throw new BadRequestException('A current MFA code is required');
        }
        const secret = this.mfa.decryptSecret(user.mfaTotpSecret);
        const matchedStep = this.mfa.verifyTotpStep(secret, totpCode);
        if (matchedStep === null) {
            throw new UnauthorizedException('Invalid MFA code');
        }
        if (
            user.mfaTotpLastAcceptedStep !== null
            && user.mfaTotpLastAcceptedStep !== undefined
            && matchedStep <= user.mfaTotpLastAcceptedStep
        ) {
            throw new UnauthorizedException('MFA code has already been used');
        }

        const value = enabled ? 'true' : 'false';
        await this.db.$transaction(async (tx) => {
            await tx.platformSetting.upsert({
                where: { key: GATEWAY_ENABLEMENT_KEY },
                create: {
                    key: GATEWAY_ENABLEMENT_KEY,
                    value,
                    updatedById: user.id,
                    updatedByEmail: user.email,
                },
                update: {
                    value,
                    updatedById: user.id,
                    updatedByEmail: user.email,
                },
            });
            // Consume the TOTP step so the same code cannot be replayed
            // for a second change (or a sign-in) inside its window.
            await tx.user.update({
                where: { id: user.id },
                data: { mfaTotpLastAcceptedStep: matchedStep },
            });
            await tx.auditLog.create({
                data: {
                    actorId: user.id,
                    actorEmail: user.email,
                    action: GATEWAY_ENABLEMENT_AUDIT_ACTION,
                    targetType: 'PlatformSetting',
                    targetId: GATEWAY_ENABLEMENT_KEY,
                    metadata: {
                        enabled,
                        envFlagEnabledAtChange: this.envFlagEnabled(),
                    },
                },
            });
        });

        this.logger.warn(
            `Gateway enablement setting changed to ${value} by admin ${user.email}`,
        );
        return this.getStatus();
    }
}
