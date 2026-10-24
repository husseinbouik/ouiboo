import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AgencyPaymentOnboardingStatus } from '@ouiboo/database';
import { DatabaseService } from '../database/database.service';
import { PspAdapterRegistry } from './adapters/psp-adapter.registry';

export interface ConnectPaymentProfileInput {
    provider: string;
    externalMerchantId: string;
    currency?: string;
    webhookSecretRef?: string | null;
}

/**
 * #373 — agency payment profiles (plan §25). An agency connects ONE
 * payment solution under its own merchant identity. Connecting a profile
 * never stores a secret: `webhookSecretRef` is only the name of the
 * environment variable the API resolves when a webhook arrives.
 */
@Injectable()
export class PaymentProfilesService {
    constructor(
        private db: DatabaseService,
        private registry: PspAdapterRegistry,
    ) { }

    async getForAgency(agencyId: string) {
        return this.db.agencyPaymentProfile.findUnique({ where: { agencyId } });
    }

    async connect(agencyId: string, input: ConnectPaymentProfileInput) {
        if (!this.registry.has(input.provider)) {
            throw new BadRequestException(
                `Unsupported payment provider "${input.provider}". Supported: ${this.registry.keys().join(', ')}`,
            );
        }
        if (input.webhookSecretRef && !/^[A-Za-z_][A-Za-z0-9_]*$/.test(input.webhookSecretRef)) {
            throw new BadRequestException(
                'webhookSecretRef must be the name of an environment variable (letters, digits, underscores)',
            );
        }
        const data = {
            provider: input.provider,
            externalMerchantId: input.externalMerchantId,
            currency: input.currency || 'MAD',
            webhookSecretRef: input.webhookSecretRef ?? null,
            onboardingStatus: AgencyPaymentOnboardingStatus.PENDING_VERIFICATION,
            paymentEnabled: false,
            refundEnabled: false,
        };
        return this.db.agencyPaymentProfile.upsert({
            where: { agencyId },
            create: { agencyId, ...data },
            update: data,
        });
    }

    /**
     * Mark the connected merchant account as verified. For Phase 1 this is
     * an explicit agency action (the agency confirms its merchant account
     * is active with the provider); a provider-side verification call can
     * replace the body when a real PSP lands.
     */
    async verify(agencyId: string) {
        const profile = await this.getForAgency(agencyId);
        if (!profile) {
            throw new NotFoundException('No payment profile connected for this agency');
        }
        return this.db.agencyPaymentProfile.update({
            where: { agencyId },
            data: {
                onboardingStatus: AgencyPaymentOnboardingStatus.CONNECTED,
                paymentEnabled: true,
                refundEnabled: true,
                lastVerifiedAt: new Date(),
            },
        });
    }

    async disable(agencyId: string) {
        const profile = await this.getForAgency(agencyId);
        if (!profile) {
            throw new NotFoundException('No payment profile connected for this agency');
        }
        return this.db.agencyPaymentProfile.update({
            where: { agencyId },
            data: {
                onboardingStatus: AgencyPaymentOnboardingStatus.DISABLED,
                paymentEnabled: false,
                refundEnabled: false,
            },
        });
    }
}
