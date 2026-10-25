import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import {
    BookingPaymentPlanStatus,
    BookingStatus,
    ExternalPaymentStage,
    PaymentAttemptStatus,
    PaymentCustodian,
    PaymentLedgerSource,
    PaymentMethod,
} from '@ouiboo/database';
import { DatabaseService } from '../database/database.service';
import { ExternalPaymentsService } from '../external-payments/external-payments.service';
import { RefundsService } from '../refunds/refunds.service';
import { PspAdapterRegistry } from './adapters/psp-adapter.registry';
import { toMoneyString } from '../common/money.util';

/**
 * #373 — server-created payment requests (plan §§8, 24, 25, 56).
 *
 * The traveller asks OuiBoo to create a payment request for a stage of
 * their booking; OuiBoo resolves the amount from the booking / payment
 * plan on the server (never from client input), delegates to the agency's
 * connected provider adapter, and persists a PaymentAttempt. Creating a
 * request NEVER marks anything paid — only a signature-validated provider
 * webhook (or the manual proof review) can do that (plan §23).
 */

const NON_PAYABLE_BOOKING_STATUSES: BookingStatus[] = [
    BookingStatus.CANCELLED,
    BookingStatus.REJECTED,
    BookingStatus.COMPLETED,
    BookingStatus.NOT_CONFIRMED,
];

@Injectable()
export class PaymentRequestsService {
    constructor(
        private db: DatabaseService,
        private registry: PspAdapterRegistry,
        private externalPaymentsService: ExternalPaymentsService,
        private refundsService: RefundsService,
    ) { }

    async createRequest(
        travelerId: string,
        bookingId: string,
        requestedStage: 'DEPOSIT' | 'BALANCE',
    ) {
        const booking = await this.db.booking.findUnique({
            where: { id: bookingId },
            include: {
                paymentPlan: true,
                session: { select: { template: { select: { agencyId: true } } } },
            },
        });
        if (!booking) {
            throw new NotFoundException('Booking not found');
        }
        if (booking.travelerId !== travelerId) {
            throw new ForbiddenException('You can only create payment requests for your own bookings');
        }
        if (NON_PAYABLE_BOOKING_STATUSES.includes(booking.status)) {
            throw new BadRequestException(`Booking in status ${booking.status} cannot accept payments`);
        }

        const agencyId = booking.session.template.agencyId;
        const plan = booking.paymentPlan;

        // Idempotent replay (plan §24): the same stage request for the
        // same booking returns the already-created attempt instead of
        // creating a duplicate — even once the plan has moved on.
        let candidateStage: ExternalPaymentStage = ExternalPaymentStage.FULL;
        if (plan) {
            candidateStage = requestedStage === 'DEPOSIT'
                ? ExternalPaymentStage.DEPOSIT
                : ExternalPaymentStage.BALANCE;
        }
        const candidateKey = `booking:${bookingId}:${candidateStage.toLowerCase()}:payment-request:v1`;
        const prior = await this.db.paymentAttempt.findUnique({ where: { idempotencyKey: candidateKey } });
        if (prior && prior.status !== PaymentAttemptStatus.FAILED) {
            return this.present(prior, null);
        }

        // Resolve stage + authoritative amount (plan §53 rule 7: the
        // balance can never be requested before the trip is confirmed,
        // which in the plan state machine means status BALANCE_DUE).
        let stage: ExternalPaymentStage;
        let amount = booking.totalAmount;
        if (plan) {
            if (requestedStage === 'DEPOSIT') {
                if (plan.status !== BookingPaymentPlanStatus.DEPOSIT_DUE) {
                    throw new BadRequestException('The deposit for this booking is not due');
                }
                stage = ExternalPaymentStage.DEPOSIT;
                amount = plan.depositAmount;
            } else {
                if (plan.status === BookingPaymentPlanStatus.FULLY_PAID) {
                    throw new BadRequestException('This booking is already fully paid');
                }
                if (plan.status !== BookingPaymentPlanStatus.BALANCE_DUE) {
                    throw new BadRequestException(
                        'The balance cannot be requested before the trip is confirmed',
                    );
                }
                stage = ExternalPaymentStage.BALANCE;
                amount = plan.balanceAmount;
            }
        } else {
            if (requestedStage === 'BALANCE') {
                throw new BadRequestException('This booking has no staged payment plan');
            }
            if (booking.paymentStatus === 'PAID') {
                throw new BadRequestException('This booking is already paid');
            }
            stage = ExternalPaymentStage.FULL;
        }

        const idempotencyKey = candidateKey;
        const existing = prior;

        const profile = await this.db.agencyPaymentProfile.findUnique({ where: { agencyId } });
        if (!profile || !profile.paymentEnabled || profile.onboardingStatus !== 'CONNECTED') {
            throw new BadRequestException(
                'The agency has not connected a payment solution yet; use the payment instructions shown at checkout',
            );
        }
        const adapter = this.registry.get(profile.provider);

        const key = existing
            ? `${idempotencyKey}:retry:${await this.db.paymentAttempt.count({ where: { bookingId, stage } })}`
            : idempotencyKey;

        const result = await adapter.createPaymentRequest(
            {
                agencyId,
                externalMerchantId: profile.externalMerchantId,
                currency: profile.currency,
            },
            {
                bookingId,
                stage,
                amount,
                currency: plan?.currency || booking.currency,
                idempotencyKey: key,
            },
        );

        const attempt = await this.db.paymentAttempt.create({
            data: {
                bookingId,
                agencyId,
                paymentProfileId: profile.id,
                stage,
                amount,
                currency: plan?.currency || booking.currency,
                provider: profile.provider,
                providerPaymentId: result.providerPaymentId,
                hostedUrl: result.hostedUrl,
                idempotencyKey: key,
                status: PaymentAttemptStatus.PENDING,
            },
        });

        return this.present(attempt, result.instructions);
    }

    /** Read-only status view for polling after a provider redirect. This
     *  method intentionally performs NO state transitions (plan §23). */
    async getAttemptStatus(user: { userId: string; role?: string; tenantId?: string }, attemptId: string) {
        const attempt = await this.db.paymentAttempt.findUnique({
            where: { id: attemptId },
            include: { booking: { select: { travelerId: true } } },
        });
        if (!attempt) {
            throw new NotFoundException('Payment attempt not found');
        }
        this.assertCanView(user, attempt.agencyId, attempt.booking.travelerId);
        return {
            id: attempt.id,
            bookingId: attempt.bookingId,
            stage: attempt.stage,
            provider: attempt.provider,
            amount: toMoneyString(attempt.amount),
            currency: attempt.currency,
            status: attempt.status,
            hostedUrl: attempt.hostedUrl,
            capturedAt: attempt.capturedAt,
            failedAt: attempt.failedAt,
        };
    }

    async listForBooking(
        user: { userId: string; role?: string; tenantId?: string },
        bookingId: string,
    ) {
        const booking = await this.db.booking.findUnique({
            where: { id: bookingId },
            select: {
                id: true,
                travelerId: true,
                session: { select: { template: { select: { agencyId: true } } } },
            },
        });
        if (!booking) {
            throw new NotFoundException('Booking not found');
        }
        this.assertCanView(user, booking.session.template.agencyId, booking.travelerId);
        const [attempts, payments] = await Promise.all([
            this.db.paymentAttempt.findMany({
                where: { bookingId },
                orderBy: { createdAt: 'asc' },
            }),
            this.db.externalPayment.findMany({
                where: { bookingId },
                orderBy: { createdAt: 'asc' },
            }),
        ]);
        return {
            attempts: attempts.map((attempt) => ({
                id: attempt.id,
                stage: attempt.stage,
                provider: attempt.provider,
                amount: toMoneyString(attempt.amount),
                currency: attempt.currency,
                status: attempt.status,
                hostedUrl: attempt.hostedUrl,
                createdAt: attempt.createdAt,
                capturedAt: attempt.capturedAt,
                failedAt: attempt.failedAt,
            })),
            payments: payments.map((payment) => ({
                id: payment.id,
                stage: payment.stage,
                amount: toMoneyString(payment.amount),
                currency: payment.currency,
                method: payment.method,
                provider: payment.provider,
                custodian: payment.custodian,
                status: payment.status,
                verifiedAt: payment.verifiedAt,
            })),
        };
    }

    /**
     * Ask the agency's provider to refund a captured attempt. Executed
     * refunds are recorded in the ledger; for the manual adapter the
     * agency executes the refund through its own bank channel and the
     * outcome is recorded by the refund workflow (#370) — this method is
     * the integration hook that workflow calls.
     */
    async requestRefundForAttempt(attemptId: string) {
        const attempt = await this.db.paymentAttempt.findUnique({
            where: { id: attemptId },
            include: { paymentProfile: true, booking: { select: { travelerId: true } } },
        });
        if (!attempt) {
            throw new NotFoundException('Payment attempt not found');
        }
        if (attempt.status !== PaymentAttemptStatus.CAPTURED) {
            throw new BadRequestException('Only a captured payment can be refunded');
        }
        if (!attempt.paymentProfile.refundEnabled) {
            throw new BadRequestException('Refunds are not enabled for this agency payment profile');
        }
        const adapter = this.registry.get(attempt.provider);
        const result = await adapter.requestRefund(
            {
                agencyId: attempt.agencyId,
                externalMerchantId: attempt.paymentProfile.externalMerchantId,
                currency: attempt.paymentProfile.currency,
            },
            {
                providerPaymentId: attempt.providerPaymentId,
                amount: attempt.amount,
                currency: attempt.currency,
            },
        );
        if (result.mode === 'executed') {
            let refundCaseOutcome: { completed: boolean; agencyId: string | null } | undefined;
            await this.db.$transaction(async (tx) => {
                await this.externalPaymentsService.recordRefundInTransaction(tx, {
                    bookingId: attempt.bookingId,
                    agencyId: attempt.agencyId,
                    travelerId: attempt.booking.travelerId,
                    amount: attempt.amount,
                    currency: attempt.currency,
                    method: PaymentMethod.GATEWAY,
                    provider: attempt.provider,
                    externalTransactionId: result.providerRefundId,
                    custodian: adapter.custodian as PaymentCustodian,
                    source: PaymentLedgerSource.GATEWAY_REFUND,
                    stage: attempt.stage,
                });
                await tx.paymentAttempt.update({
                    where: { id: attempt.id },
                    data: { status: PaymentAttemptStatus.REFUNDED },
                });
                // #416B (Council P0-09): an executed provider refund is
                // tier-1 evidence for the booking's RefundCase — attach
                // it and complete the case when it is awaiting action
                // or initiated. The ledger write above remains the only
                // one; the manual adapter path (mode 'manual') records
                // nothing here because no provider confirmation exists
                // yet — that outcome belongs to the refund workflow.
                refundCaseOutcome =
                    await this.refundsService.recordPspRefundConfirmationInTransaction(tx, {
                        bookingId: attempt.bookingId,
                        externalPaymentId: attempt.externalPaymentId ?? null,
                        providerRefundId: result.providerRefundId,
                    });
            });
            if (refundCaseOutcome?.completed && refundCaseOutcome.agencyId) {
                await this.refundsService
                    .refreshAgencyRestriction(refundCaseOutcome.agencyId)
                    .catch(() => undefined);
            }
        }
        return { attemptId: attempt.id, mode: result.mode, providerRefundId: result.providerRefundId };
    }

    private assertCanView(
        user: { userId: string; role?: string; tenantId?: string },
        agencyId: string,
        travelerId: string,
    ) {
        const isTraveler = user.userId === travelerId;
        const isOwningAgency = !!user.tenantId && user.tenantId === agencyId;
        const isAdmin = user.role === 'ADMIN';
        if (!isTraveler && !isOwningAgency && !isAdmin) {
            throw new ForbiddenException('You cannot view this payment');
        }
    }

    private present(attempt: any, instructions: string | null) {
        return {
            id: attempt.id,
            bookingId: attempt.bookingId,
            stage: attempt.stage,
            provider: attempt.provider,
            amount: toMoneyString(attempt.amount),
            currency: attempt.currency,
            status: attempt.status,
            hostedUrl: attempt.hostedUrl,
            instructions,
            createdAt: attempt.createdAt,
        };
    }
}
