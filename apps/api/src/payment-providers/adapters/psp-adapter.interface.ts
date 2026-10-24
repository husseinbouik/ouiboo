import { ExternalPaymentStage, PaymentCustodian } from '@ouiboo/database';
import { MoneyInput } from '../../common/money.util';

/**
 * #373 — payment-provider (PSP) adapter interface (plan §§8, 25).
 *
 * Every adapter settles traveller money with the AGENCY's own merchant
 * account — the custodian is the agency or its PSP, never OuiBoo. OuiBoo
 * only creates payment requests, receives signed webhooks, and records
 * the resulting facts in the payment-status ledger (#368).
 *
 * A real PSP (e.g. a BAM-authorised institution from the Phase 3 RFP) is
 * added by implementing this interface and registering the adapter; no
 * booking, webhook, or reconciliation code changes are needed.
 */

export type PspEventStatus = 'captured' | 'failed' | 'refunded' | 'pending';

export interface PspProfileContext {
    agencyId: string;
    /** The agency's merchant identifier at the provider. */
    externalMerchantId: string;
    currency: string;
}

export interface PspCreatePaymentRequestInput {
    bookingId: string;
    stage: ExternalPaymentStage;
    amount: MoneyInput;
    currency: string;
    idempotencyKey: string;
}

export interface PspCreatePaymentRequestResult {
    /** Provider-side payment id; null for the manual flow. */
    providerPaymentId: string | null;
    /** Hosted page where the traveller pays the provider directly. */
    hostedUrl: string | null;
    /** Human payment instructions (manual flow: the agency's bank details). */
    instructions: string | null;
}

export interface PspWebhookEvent {
    providerEventId: string;
    eventType: string;
    providerPaymentId: string;
    bookingId: string | null;
    merchantId: string;
    amount: string;
    currency: string;
    status: PspEventStatus;
    /** Provider transaction id for the ledger, when the event carries one. */
    transactionId: string | null;
    /** Event time when the provider supplies one (replay window checks). */
    occurredAt: Date | null;
}

export interface PspRefundResult {
    providerRefundId: string | null;
    /** 'executed' = provider executed it; 'manual' = agency must execute
     *  it through its own channel (manual adapter). */
    mode: 'executed' | 'manual';
}

export interface PspRemoteStatus {
    status: PspEventStatus;
    amount: string;
    currency: string;
    merchantId: string;
}

export interface PspAdapter {
    /** Registry key stored on AgencyPaymentProfile.provider. */
    readonly providerKey: string;
    /** Who holds the traveller's money for this provider's payments. */
    readonly custodian: PaymentCustodian;

    createPaymentRequest(
        profile: PspProfileContext,
        input: PspCreatePaymentRequestInput,
    ): Promise<PspCreatePaymentRequestResult>;

    /**
     * Validate a webhook signature over the RAW request body. `secret` is
     * resolved by the caller from environment configuration (never from
     * the database). Must fail closed: no secret or no match → false.
     */
    verifyWebhookSignature(rawBody: string, signature: string | undefined, secret: string | null): boolean;

    /** Parse a provider webhook payload into the normalized event shape. */
    parseWebhookEvent(payload: unknown): PspWebhookEvent;

    requestRefund(
        profile: PspProfileContext,
        input: { providerPaymentId: string | null; amount: MoneyInput; currency: string },
    ): Promise<PspRefundResult>;

    /**
     * The provider's own view of a payment, for reconciliation (plan §51).
     * `attempt` carries the local identifiers the adapter may need to
     * resolve the provider-side state (for the manual adapter the
     * "provider" state is the proof-review outcome).
     */
    fetchPaymentStatus(
        profile: PspProfileContext,
        attempt: { providerPaymentId: string | null; bookingId: string; stage: ExternalPaymentStage },
    ): Promise<PspRemoteStatus>;
}
