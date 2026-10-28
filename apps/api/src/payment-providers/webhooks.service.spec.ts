import {
    UnauthorizedException,
    UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@ouiboo/database';
import * as crypto from 'node:crypto';
import { ExternalPaymentsService } from '../external-payments/external-payments.service';
import { PaymentWebhooksService } from './webhooks.service';
import { PspAdapterRegistry } from './adapters/psp-adapter.registry';
import { ManualPspAdapter } from './adapters/manual-psp.adapter';
import { SandboxPspAdapter } from './adapters/sandbox-psp.adapter';

const SECRET = 'webhook-secret-for-tests';

function makeAttempt(overrides: any = {}) {
    const profile = {
        id: 'profile-1',
        agencyId: 'agency-1',
        provider: 'sandbox',
        externalMerchantId: 'merchant-1',
        currency: 'MAD',
        webhookSecretRef: null,
        onboardingStatus: 'CONNECTED',
        paymentEnabled: true,
        refundEnabled: true,
    };
    return {
        id: 'attempt-1',
        bookingId: 'booking-1',
        agencyId: 'agency-1',
        paymentProfileId: 'profile-1',
        paymentProfile: profile,
        stage: 'FULL',
        amount: new Prisma.Decimal('500.00'),
        currency: 'MAD',
        provider: 'sandbox',
        providerPaymentId: 'sandbox_pay_1',
        status: 'PENDING',
        externalPaymentId: null,
        booking: {
            id: 'booking-1',
            travelerId: 'traveler-1',
            sessionId: 'session-1',
            paymentPlan: null,
            session: { groupStatus: 'NOT_REQUIRED' },
        },
        ...overrides,
    };
}

function makeHarness(attempt: any, inboxEntry: any = null) {
    const tx: any = {
        externalPayment: {
            upsert: jest.fn(async (args: any) => ({ id: 'ext-1', ...args.create })),
        },
        $executeRaw: jest.fn(async () => 1),
        paymentAttempt: { update: jest.fn(async () => ({})) },
        booking: {
            update: jest.fn(async () => ({})),
            updateMany: jest.fn(async () => ({ count: 1 })),
        },
        bookingPaymentPlan: { update: jest.fn(async () => ({})) },
    };
    const db: any = {
        paymentAttempt: { findUnique: jest.fn(async () => attempt) },
        webhookInboxEntry: {
            findUnique: jest.fn(async () => inboxEntry),
            upsert: jest.fn(async () => ({})),
        },
        paymentReconciliationMismatch: { create: jest.fn(async () => ({})) },
        $transaction: jest.fn(async (cb: any) => cb(tx)),
    };
    const externalPayments = new ExternalPaymentsService({} as any);
    const staged = { evaluateSessionGroupInTransaction: jest.fn(async () => 'still-pending') };
    const refunds = {
        recordPspRefundConfirmationInTransaction: jest.fn(
            async (_tx: any, _args: any): Promise<{ matched: boolean; completed: boolean; agencyId: string | null }> =>
                ({ matched: false, completed: false, agencyId: null }),
        ),
        refreshAgencyRestriction: jest.fn(async (_agencyId: string) => undefined),
    };
    const registry = new PspAdapterRegistry(
        new ManualPspAdapter(db),
        new SandboxPspAdapter(db),
    );
    const service = new PaymentWebhooksService(db, registry, externalPayments, staged as any, refunds as any);
    return { service, db, tx, staged, refunds };
}

function eventBody(overrides: { data?: any; type?: string; id?: string } = {}) {
    return JSON.stringify({
        id: overrides.id ?? 'evt-1',
        type: overrides.type ?? 'payment.captured',
        timestamp: Math.floor(Date.now() / 1000),
        data: {
            paymentId: 'sandbox_pay_1',
            bookingId: 'booking-1',
            merchantId: 'merchant-1',
            amount: '500.00',
            currency: 'MAD',
            transactionId: 'txn-1',
            ...(overrides.data ?? {}),
        },
    });
}

const sign = (body: string, secret = SECRET) =>
    crypto.createHmac('sha256', secret).update(body).digest('hex');

describe('PaymentWebhooksService (#373, plan §§23/49/51/63)', () => {
    const OLD = process.env;
    beforeEach(() => {
        process.env = { ...OLD, PSP_SANDBOX_WEBHOOK_SECRET: SECRET };
    });
    afterAll(() => { process.env = OLD; });

    it('rejects an invalid signature and applies nothing', async () => {
        const { service, db, tx } = makeHarness(makeAttempt());
        const body = eventBody();

        await expect(service.handleWebhook('sandbox', body, sign(body, 'wrong-secret')))
            .rejects.toThrow(UnauthorizedException);

        expect(db.$transaction).not.toHaveBeenCalled();
        expect(tx.booking.updateMany).not.toHaveBeenCalled();
        const inboxUpsert = db.webhookInboxEntry.upsert.mock.calls[0][0];
        expect(inboxUpsert.create.processingStatus).toBe('REJECTED');
        expect(inboxUpsert.create.signatureValidated).toBe(false);
    });

    it('fails closed when the webhook secret is not configured', async () => {
        delete process.env.PSP_SANDBOX_WEBHOOK_SECRET;
        const { service, db } = makeHarness(makeAttempt());
        const body = eventBody();

        await expect(service.handleWebhook('sandbox', body, sign(body)))
            .rejects.toThrow(UnauthorizedException);
        expect(db.$transaction).not.toHaveBeenCalled();
    });

    it('a captured event records the payment in the ledger and confirms the booking', async () => {
        const { service, db, tx } = makeHarness(makeAttempt());
        const body = eventBody();

        const result = await service.handleWebhook('sandbox', body, sign(body));

        expect(result).toMatchObject({ received: true, status: 'PROCESSED' });
        // Ledger append (via ExternalPaymentsService raw insert) happened once.
        expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
        // Attempt captured with the ledger record linked.
        const attemptUpdate = tx.paymentAttempt.update.mock.calls[0][0];
        expect(attemptUpdate.data.status).toBe('CAPTURED');
        expect(attemptUpdate.data.externalPaymentId).toBe('ext-1');
        // Booking confirmed + paid (FULL stage, no plan).
        const bookingUpdate = tx.booking.updateMany.mock.calls[0][0];
        expect(bookingUpdate.data.paymentStatus).toBe('PAID');
        expect(bookingUpdate.data.status).toBe('CONFIRMED');
        // Inbox audit entry marked processed with a validated signature.
        const inboxUpsert = db.webhookInboxEntry.upsert.mock.calls.at(-1)[0];
        expect(inboxUpsert.create.processingStatus).toBe('PROCESSED');
        expect(inboxUpsert.create.signatureValidated).toBe(true);
    });

    it('a duplicate delivery is acknowledged without reprocessing', async () => {
        const processed = { provider: 'sandbox', providerEventId: 'evt-1', processingStatus: 'PROCESSED' };
        const { service, db } = makeHarness(makeAttempt(), processed);
        const body = eventBody();

        const result = await service.handleWebhook('sandbox', body, sign(body));

        expect(result).toMatchObject({ received: true, duplicate: true });
        expect(db.$transaction).not.toHaveBeenCalled();
    });

    it('a second distinct capture event for a captured payment is a harmless duplicate', async () => {
        const { service, db } = makeHarness(makeAttempt({ status: 'CAPTURED' }));
        const body = eventBody({ id: 'evt-2' });

        const result = await service.handleWebhook('sandbox', body, sign(body));

        expect(result).toMatchObject({ received: true, duplicate: true });
        expect(db.$transaction).not.toHaveBeenCalled();
        const inboxUpsert = db.webhookInboxEntry.upsert.mock.calls[0][0];
        expect(inboxUpsert.create.processingStatus).toBe('DUPLICATE');
    });

    it('a failed payment can never mark the booking paid', async () => {
        const { service, tx } = makeHarness(makeAttempt());
        const body = eventBody({ type: 'payment.failed' });

        const result = await service.handleWebhook('sandbox', body, sign(body));

        expect(result).toMatchObject({ received: true, status: 'PROCESSED' });
        // The payment record went to FAILED…
        const upsertArgs = tx.externalPayment.upsert.mock.calls[0][0];
        expect(upsertArgs.create.status).toBe('FAILED');
        // …the attempt is FAILED…
        const attemptUpdate = tx.paymentAttempt.update.mock.calls[0][0];
        expect(attemptUpdate.data.status).toBe('FAILED');
        // …and the booking was never touched.
        expect(tx.booking.update).not.toHaveBeenCalled();
        expect(tx.booking.updateMany).not.toHaveBeenCalled();
        expect(tx.bookingPaymentPlan.update).not.toHaveBeenCalled();
    });

    it('an amount mismatch is rejected with an alert record and no state change', async () => {
        const { service, db } = makeHarness(makeAttempt());
        const body = eventBody({ data: { amount: '499.00' } });

        await expect(service.handleWebhook('sandbox', body, sign(body)))
            .rejects.toThrow(UnprocessableEntityException);

        expect(db.$transaction).not.toHaveBeenCalled();
        const mismatch = db.paymentReconciliationMismatch.create.mock.calls[0][0];
        expect(mismatch.data.type).toBe('AMOUNT_MISMATCH');
        expect(mismatch.data.paymentAttemptId).toBe('attempt-1');
    });

    it('a merchant mismatch is rejected with an alert record and no state change', async () => {
        const { service, db } = makeHarness(makeAttempt());
        const body = eventBody({ data: { merchantId: 'someone-elses-merchant' } });

        await expect(service.handleWebhook('sandbox', body, sign(body)))
            .rejects.toThrow(UnprocessableEntityException);

        expect(db.$transaction).not.toHaveBeenCalled();
        const mismatch = db.paymentReconciliationMismatch.create.mock.calls[0][0];
        expect(mismatch.data.type).toBe('MERCHANT_MISMATCH');
    });

    it('an event for an unknown payment id is rejected', async () => {
        const { service, db } = makeHarness(null);
        const body = eventBody();

        await expect(service.handleWebhook('sandbox', body, sign(body)))
            .rejects.toThrow('Unknown provider payment id');
        expect(db.$transaction).not.toHaveBeenCalled();
    });

    it('a staged deposit capture moves the plan to DEPOSIT_PAID and evaluates the group', async () => {
        const attempt = makeAttempt({
            stage: 'DEPOSIT',
            amount: new Prisma.Decimal('300.00'),
            booking: {
                id: 'booking-1',
                travelerId: 'traveler-1',
                sessionId: 'session-1',
                paymentPlan: { id: 'plan-1', status: 'DEPOSIT_DUE' },
                session: { groupStatus: 'PENDING_MINIMUM' },
            },
        });
        const { service, tx, staged } = makeHarness(attempt);
        const body = eventBody({ data: { amount: '300.00' } });

        await service.handleWebhook('sandbox', body, sign(body));

        const planUpdate = tx.bookingPaymentPlan.update.mock.calls[0][0];
        expect(planUpdate.data.status).toBe('DEPOSIT_PAID');
        const bookingUpdate = tx.booking.update.mock.calls[0][0];
        expect(bookingUpdate.data.status).toBe('PENDING_MINIMUM');
        expect(bookingUpdate.data.paymentStatus).toBe('PARTIALLY_PAID');
        expect(staged.evaluateSessionGroupInTransaction).toHaveBeenCalledWith(tx, 'session-1');
    });

    it('a refunded event records the ledger refund once and wires tier-1 evidence into the refund case (#416B)', async () => {
        const attempt = makeAttempt({ status: 'CAPTURED', externalPaymentId: 'ext-1' });
        const { service, tx, refunds } = makeHarness(attempt);
        const body = eventBody({ type: 'payment.refunded', id: 'evt-refund-1' });

        const result = await service.handleWebhook('sandbox', body, sign(body));

        expect(result).toMatchObject({ received: true, status: 'PROCESSED' });
        // Exactly one ledger append for the refund (the refunds side
        // never writes a second one).
        expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
        const attemptUpdate = tx.paymentAttempt.update.mock.calls[0][0];
        expect(attemptUpdate.data.status).toBe('REFUNDED');
        // Tier-1 wiring inside the same transaction, bound to the attempt.
        expect(refunds.recordPspRefundConfirmationInTransaction).toHaveBeenCalledTimes(1);
        const call = refunds.recordPspRefundConfirmationInTransaction.mock.calls[0];
        expect(call[0]).toBe(tx);
        expect(call[1]).toMatchObject({
            bookingId: 'booking-1',
            externalPaymentId: 'ext-1',
            providerRefundId: 'txn-1',
        });
        // No case completed -> no restriction recompute.
        expect(refunds.refreshAgencyRestriction).not.toHaveBeenCalled();
    });

    it('a refunded event that completes a refund case refreshes the agency restriction after commit (#416B)', async () => {
        const attempt = makeAttempt({ status: 'CAPTURED', externalPaymentId: 'ext-1' });
        const { service, refunds } = makeHarness(attempt);
        refunds.recordPspRefundConfirmationInTransaction.mockResolvedValue({
            matched: true, completed: true, agencyId: 'agency-1',
        });
        const body = eventBody({ type: 'payment.refunded', id: 'evt-refund-2' });

        const result = await service.handleWebhook('sandbox', body, sign(body));

        expect(result).toMatchObject({ received: true, status: 'PROCESSED' });
        expect(refunds.refreshAgencyRestriction).toHaveBeenCalledWith('agency-1');
    });

    it('a failure event after capture records a conflict alert and keeps the capture', async () => {
        const { service, db, tx } = makeHarness(makeAttempt({ status: 'CAPTURED' }));
        const body = eventBody({ type: 'payment.failed', id: 'evt-late-fail' });

        const result = await service.handleWebhook('sandbox', body, sign(body));

        expect(result).toMatchObject({ received: true, status: 'conflict-recorded' });
        expect(db.$transaction).not.toHaveBeenCalled();
        expect(tx.paymentAttempt.update).not.toHaveBeenCalled();
        const mismatch = db.paymentReconciliationMismatch.create.mock.calls[0][0];
        expect(mismatch.data.type).toBe('STATUS_MISMATCH');
    });
});
