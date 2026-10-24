import { PaymentReconciliationService } from './reconciliation.service';
import { PspAdapterRegistry } from './adapters/psp-adapter.registry';
import { ManualPspAdapter } from './adapters/manual-psp.adapter';
import { SandboxPspAdapter } from './adapters/sandbox-psp.adapter';

const capturedEventPayload = {
    id: 'evt-1',
    type: 'payment.captured',
    data: {
        paymentId: 'sandbox_pay_1',
        bookingId: 'booking-1',
        merchantId: 'merchant-1',
        amount: '500.00',
        currency: 'MAD',
        transactionId: 'txn-1',
    },
};

function makeHarness(attempts: any[], inboxEntries: any[], existingMismatch: any = null) {
    const db: any = {
        paymentAttempt: {
            findMany: jest.fn(async () => attempts),
            // Deliberately NO update/create on paymentAttempt: reconciliation
            // must never mutate payment state (plan §51). If it tries, the
            // resulting TypeError is caught per-attempt and the assertions
            // on created mismatches will fail.
        },
        webhookInboxEntry: { findMany: jest.fn(async () => inboxEntries) },
        paymentReconciliationMismatch: {
            findFirst: jest.fn(async () => existingMismatch),
            create: jest.fn(async () => ({})),
        },
    };
    const registry = new PspAdapterRegistry(new ManualPspAdapter(db), new SandboxPspAdapter(db));
    const service = new PaymentReconciliationService(db, registry);
    return { service, db };
}

const profile = {
    id: 'profile-1',
    agencyId: 'agency-1',
    provider: 'sandbox',
    externalMerchantId: 'merchant-1',
    currency: 'MAD',
    webhookSecretRef: null,
};

const baseAttempt = {
    id: 'attempt-1',
    bookingId: 'booking-1',
    agencyId: 'agency-1',
    provider: 'sandbox',
    providerPaymentId: 'sandbox_pay_1',
    stage: 'FULL',
    status: 'PENDING',
    currency: 'MAD',
    externalPaymentId: null,
    paymentProfile: profile,
};

describe('PaymentReconciliationService (#373, plan §51)', () => {
    it('flags a provider-captured payment OuiBoo never applied as MISSING_WEBHOOK', async () => {
        const { service, db } = makeHarness(
            [{ ...baseAttempt, amount: '500.00' }],
            [{ payload: capturedEventPayload, processingStatus: 'RECEIVED' }],
        );

        const result = await service.runReconciliation();

        expect(result.checked).toBe(1);
        expect(result.mismatchesCreated).toBe(1);
        const create = db.paymentReconciliationMismatch.create.mock.calls[0][0];
        expect(create.data.type).toBe('MISSING_WEBHOOK');
    });

    it('does not duplicate an already-open mismatch', async () => {
        const { service, db } = makeHarness(
            [{ ...baseAttempt, amount: '500.00' }],
            [{ payload: capturedEventPayload, processingStatus: 'RECEIVED' }],
            { id: 'mismatch-1', status: 'OPEN' },
        );

        const result = await service.runReconciliation();

        expect(result.mismatchesCreated).toBe(0);
        expect(db.paymentReconciliationMismatch.create).not.toHaveBeenCalled();
    });

    it('flags a status disagreement between provider and records', async () => {
        const failedEvent = {
            ...capturedEventPayload,
            id: 'evt-2',
            type: 'payment.failed',
        };
        const { service, db } = makeHarness(
            [{ ...baseAttempt, status: 'CAPTURED', amount: '500.00' }],
            [{ payload: failedEvent, processingStatus: 'PROCESSED' }],
        );

        const result = await service.runReconciliation();

        expect(result.mismatchesCreated).toBe(1);
        const create = db.paymentReconciliationMismatch.create.mock.calls[0][0];
        expect(create.data.type).toBe('STATUS_MISMATCH');
    });

    it('a matching provider/record pair produces no alert', async () => {
        const { service, db } = makeHarness(
            [{ ...baseAttempt, status: 'CAPTURED', amount: '500.00' }],
            [{ payload: capturedEventPayload, processingStatus: 'PROCESSED' }],
        );

        const result = await service.runReconciliation();

        expect(result.mismatchesCreated).toBe(0);
        expect(db.paymentReconciliationMismatch.create).not.toHaveBeenCalled();
    });
});
