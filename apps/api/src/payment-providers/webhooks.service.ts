import {
    BadRequestException,
    Injectable,
    Logger,
    NotFoundException,
    UnauthorizedException,
    UnprocessableEntityException,
} from '@nestjs/common';
import {
    BookingPaymentPlanStatus,
    BookingPaymentStatus,
    BookingStatus,
    ExternalPaymentStage,
    PaymentAttemptStatus,
    PaymentLedgerEntryType,
    PaymentLedgerSource,
    PaymentMethod,
    PaymentReconciliationMismatchType,
    Prisma,
    SessionGroupStatus,
    WebhookProcessingStatus,
} from '@ouiboo/database';
import * as crypto from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { ExternalPaymentsService } from '../external-payments/external-payments.service';
import { RefundsService } from '../refunds/refunds.service';
import { StagedPaymentsService } from '../staged-payments/staged-payments.service';
import { decimalEqualsMoney } from '../common/money.util';
import { PspAdapterRegistry, resolveWebhookSecret } from './adapters/psp-adapter.registry';
import { PspAdapter, PspWebhookEvent } from './adapters/psp-adapter.interface';

/**
 * #373 — provider webhook processing (plan §§23, 49, 51, 53).
 *
 * Pipeline for every event, in order:
 *  1. Parse the envelope (untrusted — nothing is applied yet).
 *  2. Reject stale events when the provider supplies a timestamp.
 *  3. Bind the event to a server-created PaymentAttempt via the
 *     provider payment id — unknown payments are rejected.
 *  4. Validate the HMAC signature against the secret resolved from
 *     environment configuration (fail closed). Invalid → the attempt is
 *     recorded in the inbox as REJECTED and nothing else happens.
 *  5. Deduplicate on (provider, providerEventId): a redelivery is
 *     acknowledged without reprocessing — duplicates are harmless.
 *  6. Merchant / amount / booking binding checks: a mismatch creates a
 *     reconciliation alert record and is rejected with 422. Payment
 *     state is NEVER silently corrected to match a provider report.
 *  7. Apply the event in one transaction: ledger record via
 *     ExternalPaymentsService + booking/plan state transitions.
 *
 * A browser redirect plays no part in this pipeline (plan §23): there is
 * deliberately no code path from a return URL to a paid state.
 */

const MAX_EVENT_AGE_MS = 5 * 60_000;

function captureEntryType(stage: ExternalPaymentStage): PaymentLedgerEntryType {
    switch (stage) {
        case ExternalPaymentStage.DEPOSIT:
            return PaymentLedgerEntryType.DEPOSIT_CAPTURED;
        case ExternalPaymentStage.BALANCE:
            return PaymentLedgerEntryType.BALANCE_CAPTURED;
        default:
            return PaymentLedgerEntryType.PAYMENT_CAPTURED;
    }
}

type Tx = Prisma.TransactionClient;

@Injectable()
export class PaymentWebhooksService {
    private readonly logger = new Logger(PaymentWebhooksService.name);

    constructor(
        private db: DatabaseService,
        private registry: PspAdapterRegistry,
        private externalPaymentsService: ExternalPaymentsService,
        private stagedPaymentsService: StagedPaymentsService,
        private refundsService: RefundsService,
    ) { }

    async handleWebhook(providerKey: string, rawBody: string, signature: string | undefined) {
        const adapter = this.registry.get(providerKey);

        let payload: unknown;
        try {
            payload = JSON.parse(rawBody);
        } catch {
            throw new BadRequestException('Webhook body is not valid JSON');
        }

        let event: PspWebhookEvent;
        try {
            event = adapter.parseWebhookEvent(payload);
        } catch {
            await this.recordInbox(providerKey, {
                providerEventId: `unparseable-${crypto.createHash('sha256').update(rawBody).digest('hex').slice(0, 32)}`,
                eventType: 'unknown',
                signatureValidated: false,
                processingStatus: WebhookProcessingStatus.REJECTED,
                failureReason: 'Malformed event payload',
                payload: null,
            });
            throw new BadRequestException('Malformed webhook event');
        }

        if (event.occurredAt && Math.abs(Date.now() - event.occurredAt.getTime()) > MAX_EVENT_AGE_MS) {
            await this.recordInbox(providerKey, {
                providerEventId: event.providerEventId,
                eventType: event.eventType,
                signatureValidated: false,
                processingStatus: WebhookProcessingStatus.REJECTED,
                failureReason: 'Stale event timestamp (replay window exceeded)',
                payload,
            });
            throw new BadRequestException('Stale webhook event');
        }

        const attempt = await this.db.paymentAttempt.findUnique({
            where: {
                provider_providerPaymentId: {
                    provider: providerKey,
                    providerPaymentId: event.providerPaymentId,
                },
            },
            include: {
                paymentProfile: true,
                booking: {
                    include: {
                        paymentPlan: true,
                        session: { select: { groupStatus: true } },
                    },
                },
            },
        });
        if (!attempt) {
            await this.recordInbox(providerKey, {
                providerEventId: event.providerEventId,
                eventType: event.eventType,
                signatureValidated: false,
                processingStatus: WebhookProcessingStatus.REJECTED,
                failureReason: 'Unknown provider payment id',
                payload,
            });
            throw new NotFoundException('Unknown provider payment id');
        }

        const secret = resolveWebhookSecret(providerKey, attempt.paymentProfile.webhookSecretRef);
        const signatureValid = adapter.verifyWebhookSignature(rawBody, signature, secret);
        if (!signatureValid) {
            await this.recordInbox(providerKey, {
                providerEventId: event.providerEventId,
                eventType: event.eventType,
                signatureValidated: false,
                processingStatus: WebhookProcessingStatus.REJECTED,
                failureReason: 'Invalid webhook signature',
                payload,
            });
            throw new UnauthorizedException('Invalid webhook signature');
        }

        const priorInbox = await this.db.webhookInboxEntry.findUnique({
            where: {
                provider_providerEventId: {
                    provider: providerKey,
                    providerEventId: event.providerEventId,
                },
            },
        });
        if (priorInbox) {
            return { received: true, duplicate: true, status: priorInbox.processingStatus };
        }

        // Binding checks — a mismatch is an alert + rejection, never a
        // silent correction of payment state (plan §51).
        if (event.merchantId !== attempt.paymentProfile.externalMerchantId) {
            await this.rejectWithMismatch(providerKey, event, payload, attempt, {
                type: PaymentReconciliationMismatchType.MERCHANT_MISMATCH,
                reason: `Event merchant "${event.merchantId}" does not match the agency merchant "${attempt.paymentProfile.externalMerchantId}"`,
            });
            throw new UnprocessableEntityException('Webhook merchant does not match the payment attempt');
        }
        if (!decimalEqualsMoney(event.amount, attempt.amount)) {
            await this.rejectWithMismatch(providerKey, event, payload, attempt, {
                type: PaymentReconciliationMismatchType.AMOUNT_MISMATCH,
                reason: `Event amount ${event.amount} does not match the attempt amount ${attempt.amount.toString()}`,
            });
            throw new UnprocessableEntityException('Webhook amount does not match the payment attempt');
        }
        if (event.bookingId && event.bookingId !== attempt.bookingId) {
            await this.rejectWithMismatch(providerKey, event, payload, attempt, {
                type: PaymentReconciliationMismatchType.MERCHANT_MISMATCH,
                reason: `Event booking "${event.bookingId}" does not match the attempt booking "${attempt.bookingId}"`,
            });
            throw new UnprocessableEntityException('Webhook booking does not match the payment attempt');
        }

        // A second, distinct event repeating an already-applied terminal
        // transition is a duplicate in effect: acknowledge it, change
        // nothing (the ledger's own idempotency keys back this up).
        const alreadyApplied =
            (event.status === 'captured' && attempt.status === PaymentAttemptStatus.CAPTURED) ||
            (event.status === 'refunded' && attempt.status === PaymentAttemptStatus.REFUNDED) ||
            (event.status === 'failed' && attempt.status === PaymentAttemptStatus.FAILED);
        if (alreadyApplied) {
            await this.recordInbox(providerKey, {
                providerEventId: event.providerEventId,
                eventType: event.eventType,
                signatureValidated: true,
                processingStatus: WebhookProcessingStatus.DUPLICATE,
                failureReason: null,
                payload,
            });
            return { received: true, duplicate: true, status: WebhookProcessingStatus.DUPLICATE };
        }

        // A failure event for an already-captured payment is a logical
        // conflict: record the alert, keep the captured state.
        if (event.status === 'failed' && attempt.status === PaymentAttemptStatus.CAPTURED) {
            await this.recordInbox(providerKey, {
                providerEventId: event.providerEventId,
                eventType: event.eventType,
                signatureValidated: true,
                processingStatus: WebhookProcessingStatus.FAILED,
                failureReason: 'Failure event received for an already-captured payment',
                payload,
            });
            await this.createMismatch(attempt, {
                type: PaymentReconciliationMismatchType.STATUS_MISMATCH,
                reason: 'Provider reported failure for a payment already recorded as captured',
                providerStatus: 'failed',
            });
            return { received: true, status: 'conflict-recorded' };
        }

        let refundCaseOutcome: { completed: boolean; agencyId: string | null } | undefined;
        try {
            await this.db.$transaction(async (tx) => {
                refundCaseOutcome = await this.applyEventInTransaction(tx, attempt, event, adapter);
            });
        } catch (error: any) {
            await this.recordInbox(providerKey, {
                providerEventId: event.providerEventId,
                eventType: event.eventType,
                signatureValidated: true,
                processingStatus: WebhookProcessingStatus.FAILED,
                failureReason: error?.message ?? 'Processing failed',
                payload,
            });
            throw error;
        }

        // #416B: a PSP refund that completed a RefundCase may lift the
        // agency's overdue restriction — recompute it after commit,
        // exactly as the manual completion path does.
        if (refundCaseOutcome?.completed && refundCaseOutcome.agencyId) {
            await this.refundsService
                .refreshAgencyRestriction(refundCaseOutcome.agencyId)
                .catch(() => undefined);
        }

        await this.recordInbox(providerKey, {
            providerEventId: event.providerEventId,
            eventType: event.eventType,
            signatureValidated: true,
            processingStatus: WebhookProcessingStatus.PROCESSED,
            failureReason: null,
            payload,
            processedAt: new Date(),
        });
        return { received: true, status: WebhookProcessingStatus.PROCESSED };
    }

    private async applyEventInTransaction(
        tx: Tx,
        attempt: any,
        event: PspWebhookEvent,
        adapter: PspAdapter,
    ) {
        const booking = attempt.booking;
        const plan = booking.paymentPlan;
        const baseInput = {
            bookingId: attempt.bookingId,
            agencyId: attempt.agencyId,
            travelerId: booking.travelerId,
            amount: attempt.amount,
            currency: attempt.currency,
            method: PaymentMethod.GATEWAY,
            provider: attempt.provider,
            externalTransactionId: event.transactionId ?? event.providerPaymentId,
            custodian: adapter.custodian,
            source: PaymentLedgerSource.GATEWAY_WEBHOOK,
            stage: attempt.stage,
        };

        if (event.status === 'captured') {
            const entryType = captureEntryType(attempt.stage);
            const payment = await this.externalPaymentsService.recordPaymentVerifiedInTransaction(
                tx,
                baseInput,
                entryType,
            );
            await tx.paymentAttempt.update({
                where: { id: attempt.id },
                data: {
                    status: PaymentAttemptStatus.CAPTURED,
                    capturedAt: new Date(),
                    externalPaymentId: payment.id,
                },
            });

            if (plan && attempt.stage === ExternalPaymentStage.DEPOSIT) {
                await tx.bookingPaymentPlan.update({
                    where: { id: plan.id },
                    data: { status: BookingPaymentPlanStatus.DEPOSIT_PAID },
                });
                await tx.booking.update({
                    where: { id: booking.id },
                    data: {
                        status: BookingStatus.PENDING_MINIMUM,
                        paymentStatus: BookingPaymentStatus.PARTIALLY_PAID,
                    },
                });
                if (booking.session.groupStatus === SessionGroupStatus.NOT_CONFIRMED) {
                    // The group already failed while this payment was in
                    // flight: the deposit is refund-due (same outcome as
                    // the late proof-approval path in #369).
                    await tx.bookingPaymentPlan.update({
                        where: { id: plan.id },
                        data: { status: BookingPaymentPlanStatus.REFUND_DUE },
                    });
                    await tx.booking.update({
                        where: { id: booking.id },
                        data: { status: BookingStatus.NOT_CONFIRMED },
                    });
                    await this.externalPaymentsService.recordRefundDueInTransaction(tx, {
                        ...baseInput,
                        source: PaymentLedgerSource.GATEWAY_WEBHOOK,
                    });
                } else {
                    await this.stagedPaymentsService.evaluateSessionGroupInTransaction(tx, booking.sessionId);
                }
            } else if (plan && attempt.stage === ExternalPaymentStage.BALANCE) {
                await tx.bookingPaymentPlan.update({
                    where: { id: plan.id },
                    data: { status: BookingPaymentPlanStatus.FULLY_PAID },
                });
                await tx.booking.update({
                    where: { id: booking.id },
                    data: {
                        status: BookingStatus.CONFIRMED,
                        paymentStatus: BookingPaymentStatus.PAID,
                        confirmedAt: new Date(),
                    },
                });
            } else if (!plan) {
                await tx.booking.updateMany({
                    where: {
                        id: booking.id,
                        paymentStatus: { not: BookingPaymentStatus.PAID },
                        status: { notIn: [BookingStatus.CANCELLED, BookingStatus.COMPLETED] },
                    },
                    data: {
                        status: BookingStatus.CONFIRMED,
                        paymentStatus: BookingPaymentStatus.PAID,
                        confirmedAt: new Date(),
                    },
                });
            }
            return;
        }

        if (event.status === 'failed') {
            await this.externalPaymentsService.recordPaymentFailedInTransaction(tx, baseInput);
            await tx.paymentAttempt.update({
                where: { id: attempt.id },
                data: { status: PaymentAttemptStatus.FAILED, failedAt: new Date() },
            });
            // The booking is intentionally untouched: a failed payment
            // can never confirm or pay a booking (plan §63).
            return;
        }

        if (event.status === 'refunded') {
            await this.externalPaymentsService.recordRefundInTransaction(tx, {
                ...baseInput,
                source: PaymentLedgerSource.GATEWAY_REFUND,
            });
            await tx.paymentAttempt.update({
                where: { id: attempt.id },
                data: { status: PaymentAttemptStatus.REFUNDED },
            });
            if (plan && attempt.stage === ExternalPaymentStage.DEPOSIT
                && plan.status === BookingPaymentPlanStatus.REFUND_DUE) {
                await tx.bookingPaymentPlan.update({
                    where: { id: plan.id },
                    data: { status: BookingPaymentPlanStatus.REFUNDED },
                });
            }
            if (!plan) {
                await tx.booking.update({
                    where: { id: booking.id },
                    data: { paymentStatus: BookingPaymentStatus.REFUNDED },
                });
            }
            // #416B (Council P0-09): the provider's refund confirmation
            // is tier-1 evidence for the booking's RefundCase. The
            // ledger refund above stays the single ledger write — the
            // refunds side only attaches the evidence and, when the
            // case is awaiting the agency's action or already
            // initiated, completes it from this confirmation.
            return this.refundsService.recordPspRefundConfirmationInTransaction(tx, {
                bookingId: attempt.bookingId,
                externalPaymentId: attempt.externalPaymentId ?? null,
                providerRefundId: event.transactionId ?? event.providerPaymentId,
                providerStatus: 'REFUNDED',
            });
        }
    }

    private async rejectWithMismatch(
        providerKey: string,
        event: PspWebhookEvent,
        payload: unknown,
        attempt: any,
        mismatch: { type: PaymentReconciliationMismatchType; reason: string },
    ) {
        await this.recordInbox(providerKey, {
            providerEventId: event.providerEventId,
            eventType: event.eventType,
            signatureValidated: true,
            processingStatus: WebhookProcessingStatus.MISMATCH,
            failureReason: mismatch.reason,
            payload,
        });
        await this.createMismatch(attempt, {
            type: mismatch.type,
            reason: mismatch.reason,
            providerStatus: event.status,
        });
    }

    private async createMismatch(
        attempt: any,
        mismatch: { type: PaymentReconciliationMismatchType; reason: string; providerStatus: string },
    ) {
        await this.db.paymentReconciliationMismatch.create({
            data: {
                provider: attempt.provider,
                type: mismatch.type,
                agencyId: attempt.agencyId,
                bookingId: attempt.bookingId,
                paymentAttemptId: attempt.id,
                externalPaymentId: attempt.externalPaymentId ?? null,
                details: {
                    reason: mismatch.reason,
                    providerStatus: mismatch.providerStatus,
                },
            },
        });
    }

    private async recordInbox(
        provider: string,
        entry: {
            providerEventId: string;
            eventType: string;
            signatureValidated: boolean;
            processingStatus: WebhookProcessingStatus;
            failureReason: string | null;
            payload: unknown;
            processedAt?: Date;
        },
    ) {
        try {
            await this.db.webhookInboxEntry.upsert({
                where: {
                    provider_providerEventId: {
                        provider,
                        providerEventId: entry.providerEventId,
                    },
                },
                create: {
                    provider,
                    providerEventId: entry.providerEventId,
                    eventType: entry.eventType,
                    signatureValidated: entry.signatureValidated,
                    processingStatus: entry.processingStatus,
                    failureReason: entry.failureReason,
                    payload: (entry.payload ?? undefined) as Prisma.InputJsonValue | undefined,
                    processedAt: entry.processedAt ?? null,
                },
                update: {
                    signatureValidated: entry.signatureValidated,
                    processingStatus: entry.processingStatus,
                    failureReason: entry.failureReason,
                    processedAt: entry.processedAt ?? undefined,
                },
            });
        } catch (error) {
            // The inbox is an audit sink: never let its failure mask the
            // webhook outcome itself.
            this.logger.error(`Failed to record webhook inbox entry: ${(error as Error).message}`);
        }
    }
}
