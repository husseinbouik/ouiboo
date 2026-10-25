import { Injectable } from '@nestjs/common';
import { ExternalPaymentStatus, PaymentCustodian } from '@ouiboo/database';
import { DatabaseService } from '../../database/database.service';
import { toMoneyString } from '../../common/money.util';
import { visibleBankDetails } from '../../common/bank-details.util';
import {
    PspAdapter,
    PspCreatePaymentRequestInput,
    PspCreatePaymentRequestResult,
    PspProfileContext,
    PspRefundResult,
    PspRemoteStatus,
    PspWebhookEvent,
} from './psp-adapter.interface';

/**
 * #373 — the "manual" adapter formalizes the live Phase 1 flow
 * (plan §57): the traveller pays the agency by bank transfer using the
 * agency's own payment instructions, and confirmation is the existing
 * payment-proof review. There is no hosted page and there are NO webhooks
 * for this adapter — signature validation fails closed by design, so a
 * forged "manual webhook" can never mark a booking paid.
 *
 * The "provider-side" status used by reconciliation is the proof-review
 * outcome recorded on the booking's ExternalPayment (#368).
 */
@Injectable()
export class ManualPspAdapter implements PspAdapter {
    readonly providerKey = 'manual';
    readonly custodian = PaymentCustodian.AGENCY;

    constructor(private db: DatabaseService) { }

    async createPaymentRequest(
        profile: PspProfileContext,
        _input: PspCreatePaymentRequestInput,
    ): Promise<PspCreatePaymentRequestResult> {
        const agency = await this.db.agencyProfile.findUnique({
            where: { id: profile.agencyId },
            select: { bankDetails: true, bankDetailsStatus: true, bankDetailsVerifiedAt: true },
        });
        return {
            providerPaymentId: null,
            hostedUrl: null,
            // #421: payment instructions are only handed out for an
            // admin-verified bank destination; anything else yields no
            // instructions, exactly like an unconfigured destination.
            instructions: visibleBankDetails(agency)?.trim() || null,
        };
    }

    verifyWebhookSignature(
        _rawBody: string,
        _signature: string | undefined,
        _secret: string | null,
    ): boolean {
        // The manual flow has no webhooks. Fail closed, always.
        return false;
    }

    parseWebhookEvent(): PspWebhookEvent {
        throw new Error('The manual payment provider does not emit webhooks');
    }

    async requestRefund(
        _profile: PspProfileContext,
        _input: { providerPaymentId: string | null; amount: any; currency: string },
    ): Promise<PspRefundResult> {
        // The agency executes the refund through its own bank channel; the
        // outcome is recorded through the refund workflow (#370) once the
        // agency confirms execution. Nothing is debited anywhere here.
        return { providerRefundId: null, mode: 'manual' };
    }

    async fetchPaymentStatus(
        profile: PspProfileContext,
        attempt: { providerPaymentId: string | null; bookingId: string; stage: any },
    ): Promise<PspRemoteStatus> {
        const payment = await this.db.externalPayment.findUnique({
            where: { bookingId_stage: { bookingId: attempt.bookingId, stage: attempt.stage } },
        });
        const status = !payment
            ? 'pending'
            : payment.status === ExternalPaymentStatus.VERIFIED
                ? 'captured'
                : payment.status === ExternalPaymentStatus.REJECTED
                    ? 'failed'
                    : payment.status === ExternalPaymentStatus.REFUNDED
                        ? 'refunded'
                        : payment.status === ExternalPaymentStatus.FAILED
                            ? 'failed'
                            : 'pending';
        return {
            status,
            amount: toMoneyString(payment?.amount) || '0.00',
            currency: payment?.currency || profile.currency,
            merchantId: profile.externalMerchantId,
        };
    }
}
