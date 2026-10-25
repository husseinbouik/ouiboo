import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AgencyPaymentOnboardingStatus } from '@ouiboo/database';
import { DatabaseService } from '../database/database.service';
import { PspAdapterRegistry } from './adapters/psp-adapter.registry';
import { isBankDestinationVerified } from '../common/bank-details.util';

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
     * Mark the connected merchant account as verified.
     *
     * #421 (Council P0-19): self-attestation is removed for the `manual`
     * provider. A manual profile's merchant identity IS the agency's bank
     * destination, so activation requires that destination to be
     * admin-verified against a bank attestation first; the profile stays
     * PENDING_VERIFICATION until then. (A real PSP adapter will replace
     * this with a provider-side verification call when one lands.)
     */
    async verify(agencyId: string) {
        const profile = await this.getForAgency(agencyId);
        if (!profile) {
            throw new NotFoundException('No payment profile connected for this agency');
        }
        if (profile.provider === 'manual') {
            const agency = await this.db.agencyProfile.findUnique({
                where: { id: agencyId },
                select: { bankDetailsStatus: true, bankDetailsVerifiedAt: true },
            });
            if (!isBankDestinationVerified(agency)) {
                throw new BadRequestException(
                    'Your bank payment destination must be verified by an admin before the manual payment profile can be activated',
                );
            }
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
