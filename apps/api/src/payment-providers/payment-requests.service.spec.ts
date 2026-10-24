import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@ouiboo/database';
import { PaymentRequestsService } from './payment-requests.service';
import { PspAdapterRegistry } from './adapters/psp-adapter.registry';
import { ManualPspAdapter } from './adapters/manual-psp.adapter';
import { SandboxPspAdapter } from './adapters/sandbox-psp.adapter';

function stagedBooking(planStatus: string) {
    return {
        id: 'booking-1',
        travelerId: 'traveler-1',
        status: 'PENDING',
        paymentStatus: 'UNPAID',
        totalAmount: new Prisma.Decimal('2000.00'),
        currency: 'MAD',
        session: { template: { agencyId: 'agency-1' } },
        paymentPlan: {
            id: 'plan-1',
            status: planStatus,
            depositAmount: new Prisma.Decimal('500.00'),
            balanceAmount: new Prisma.Decimal('1500.00'),
            currency: 'MAD',
        },
    };
}

function makeHarness(booking: any, profile: any) {
    const attemptsByKey = new Map<string, any>();
    const db: any = {
        booking: { findUnique: jest.fn(async () => booking) },
        agencyProfile: { findUnique: jest.fn(async () => ({ bankDetails: 'RIB 999' })) },
        agencyPaymentProfile: { findUnique: jest.fn(async () => profile) },
        paymentAttempt: {
            findUnique: jest.fn(async ({ where }: any) =>
                attemptsByKey.get(where.idempotencyKey) ?? null),
            count: jest.fn(async () => attemptsByKey.size),
            create: jest.fn(async ({ data }: any) => {
                const attempt = { id: `attempt-${attemptsByKey.size + 1}`, createdAt: new Date(), ...data };
                attemptsByKey.set(data.idempotencyKey, attempt);
                return attempt;
            }),
            update: jest.fn(async () => ({})),
        },
        externalPayment: { findMany: jest.fn(async () => []) },
    };
    const registry = new PspAdapterRegistry(new ManualPspAdapter(db), new SandboxPspAdapter(db));
    const service = new PaymentRequestsService(db, registry, {} as any);
    return { service, db, attemptsByKey };
}

const manualProfile = {
    id: 'profile-1',
    agencyId: 'agency-1',
    provider: 'manual',
    externalMerchantId: 'agency-1-rib',
    currency: 'MAD',
    onboardingStatus: 'CONNECTED',
    paymentEnabled: true,
    refundEnabled: true,
    webhookSecretRef: null,
};

describe('PaymentRequestsService (#373, plan §§24/25/53)', () => {
    it('creates a deposit request with the server-side plan amount and instructions', async () => {
        const { service, db } = makeHarness(stagedBooking('DEPOSIT_DUE'), manualProfile);

        const result = await service.createRequest('traveler-1', 'booking-1', 'DEPOSIT');

        expect(result.stage).toBe('DEPOSIT');
        expect(result.amount).toBe('500.00');
        expect(result.instructions).toBe('RIB 999');
        const createArgs = db.paymentAttempt.create.mock.calls[0][0];
        expect(createArgs.data.idempotencyKey).toBe('booking:booking-1:deposit:payment-request:v1');
        expect(createArgs.data.status).toBe('PENDING');
    });

    it('replaying the same request returns the existing attempt (idempotent)', async () => {
        const { service, db } = makeHarness(stagedBooking('DEPOSIT_DUE'), manualProfile);

        const first = await service.createRequest('traveler-1', 'booking-1', 'DEPOSIT');
        const second = await service.createRequest('traveler-1', 'booking-1', 'DEPOSIT');

        expect(second.id).toBe(first.id);
        expect(db.paymentAttempt.create).toHaveBeenCalledTimes(1);
    });

    it('the balance cannot be requested before the trip is confirmed (rule 7)', async () => {
        const { service, db } = makeHarness(stagedBooking('DEPOSIT_PAID'), manualProfile);

        await expect(service.createRequest('traveler-1', 'booking-1', 'BALANCE'))
            .rejects.toThrow(/cannot be requested before the trip is confirmed/);
        expect(db.paymentAttempt.create).not.toHaveBeenCalled();
    });

    it('the balance can be requested once the plan is BALANCE_DUE', async () => {
        const { service } = makeHarness(stagedBooking('BALANCE_DUE'), manualProfile);

        const result = await service.createRequest('traveler-1', 'booking-1', 'BALANCE');

        expect(result.stage).toBe('BALANCE');
        expect(result.amount).toBe('1500.00');
    });

    it('a traveller cannot create requests for someone else\'s booking', async () => {
        const { service, db } = makeHarness(stagedBooking('DEPOSIT_DUE'), manualProfile);

        await expect(service.createRequest('traveler-2', 'booking-1', 'DEPOSIT'))
            .rejects.toThrow(ForbiddenException);
        expect(db.paymentAttempt.create).not.toHaveBeenCalled();
    });

    it('requests fail clearly when the agency has no connected payment profile', async () => {
        const { service } = makeHarness(stagedBooking('DEPOSIT_DUE'), null);

        await expect(service.createRequest('traveler-1', 'booking-1', 'DEPOSIT'))
            .rejects.toThrow(BadRequestException);
    });

    it('status polling is read-only: a provider redirect can never mark a payment captured (rule 10)', async () => {
        const { service, db, attemptsByKey } = makeHarness(stagedBooking('DEPOSIT_DUE'), manualProfile);
        const created = await service.createRequest('traveler-1', 'booking-1', 'DEPOSIT');
        db.paymentAttempt.findUnique = jest.fn(async () => ({
            ...attemptsByKey.get('booking:booking-1:deposit:payment-request:v1'),
            booking: { travelerId: 'traveler-1' },
        }));

        const status = await service.getAttemptStatus({ userId: 'traveler-1' }, created.id);

        expect(status.status).toBe('PENDING');
        expect(db.paymentAttempt.update).not.toHaveBeenCalled();
        expect(db.booking.update).toBeUndefined();
    });
});
