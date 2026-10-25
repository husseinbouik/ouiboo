import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@ouiboo/database';
import { StagedPaymentsService } from './staged-payments.service';
import {
    MAX_GROUP_DEPOSIT_PERCENT,
    resolveStagedSessionConfig,
} from './staged-payments.util';

const D = (value: string) => new Prisma.Decimal(value);

const START = new Date('2027-03-10T09:00:00.000Z');
const DEADLINE = new Date('2027-03-01T09:00:00.000Z');
const NOW = new Date('2027-02-01T09:00:00.000Z');

function makeRefunds() {
    return {
        createRefundDueCaseInTransaction: jest.fn(async () => ({ id: 'refund-case-1' })),
    };
}

function makeExternalPayments() {
    return {
        recordPaymentVerifiedInTransaction: jest.fn(async () => ({})),
        recordPaymentRejectedInTransaction: jest.fn(async () => ({})),
        recordRefundDueInTransaction: jest.fn(async () => ({})),
    };
}

function makeSession(overrides: Record<string, unknown> = {}): any {
    return {
        id: 'session-1',
        startDate: START,
        confirmationDeadline: DEADLINE,
        groupStatus: 'PENDING_MINIMUM',
        minBookings: 4,
        deposit: D('100'),
        currency: 'MAD',
        availableSeats: 10,
        ...overrides,
    };
}

function makePlan(overrides: Record<string, unknown> = {}): any {
    return {
        id: 'plan-1',
        bookingId: 'booking-1',
        sessionId: 'session-1',
        agencyId: 'agency-1',
        status: 'DEPOSIT_DUE',
        depositAmount: D('200.00'),
        balanceAmount: D('1000.00'),
        currency: 'MAD',
        ...overrides,
    };
}

function makeBooking(overrides: Record<string, unknown> = {}): any {
    return {
        id: 'booking-1',
        sessionId: 'session-1',
        travelerId: 'traveler-1',
        currency: 'MAD',
        paymentMethod: 'MANUAL',
        status: 'AWAITING_VALIDATION',
        ...overrides,
    };
}

/**
 * Transaction fake. bookingPaymentPlan.findMany distinguishes the three
 * query shapes the service uses (counted plans / waiting plans / fail list)
 * by their status filter.
 */
function makeTx(options: {
    session?: any;
    countedPlans?: any[];
    waitingPlans?: any[];
    failPlans?: any[];
    planAfter?: any;
    bookingAfter?: any;
} = {}) {
    const session = options.session ?? makeSession();
    const tx: any = {
        tripSession: {
            findUnique: jest.fn(async () => session),
            updateMany: jest.fn(async () => ({ count: 1 })),
            update: jest.fn(async () => session),
        },
        booking: {
            updateMany: jest.fn(async () => ({ count: 1 })),
            findUniqueOrThrow: jest.fn(async () =>
                options.bookingAfter ?? { status: 'PENDING_MINIMUM', guestsCount: 2 }),
        },
        bookingPaymentPlan: {
            create: jest.fn(async ({ data }: any) => ({ id: 'plan-new', ...data })),
            update: jest.fn(async () => ({})),
            updateMany: jest.fn(async () => ({ count: 2 })),
            findUniqueOrThrow: jest.fn(async () =>
                options.planAfter ?? makePlan({ status: 'DEPOSIT_PAID' })),
            findMany: jest.fn(async ({ where }: any) => {
                const statusFilter = where?.status;
                if (statusFilter && typeof statusFilter === 'object' && Array.isArray(statusFilter.in)) {
                    if (statusFilter.in.includes('FULLY_PAID')) return options.countedPlans ?? [];
                    return options.failPlans ?? [];
                }
                return options.waitingPlans ?? [];
            }),
        },
    };
    return tx;
}

describe('resolveStagedSessionConfig (#369)', () => {
    const base = { price: D('1000'), startDate: START };

    it('is not staged without a minimum above 1', () => {
        const resolved = resolveStagedSessionConfig(
            { ...base, deposit: D('500'), minBookings: 1, confirmationDeadline: DEADLINE },
            NOW,
        );
        expect(resolved.staged).toBe(false);
        expect(resolved.groupStatus).toBe('NOT_REQUIRED');
        expect(resolved.confirmationDeadline).toBeNull();
    });

    it('is not staged with a minimum but no deposit', () => {
        const resolved = resolveStagedSessionConfig(
            { ...base, deposit: D('0'), minBookings: 6, confirmationDeadline: DEADLINE },
            NOW,
        );
        expect(resolved.staged).toBe(false);
    });

    it('accepts a deposit exactly at the platform cap', () => {
        const cap = D('1000').mul(MAX_GROUP_DEPOSIT_PERCENT).div(100);
        const resolved = resolveStagedSessionConfig(
            { ...base, deposit: cap, minBookings: 6, confirmationDeadline: DEADLINE },
            NOW,
        );
        expect(resolved.staged).toBe(true);
        expect(resolved.groupStatus).toBe('PENDING_MINIMUM');
        expect(resolved.confirmationDeadline).toEqual(DEADLINE);
    });

    it('rejects a deposit above the platform cap', () => {
        expect(() => resolveStagedSessionConfig(
            { ...base, deposit: D('301'), minBookings: 6, confirmationDeadline: DEADLINE },
            NOW,
        )).toThrow('cannot exceed 30%');
    });

    it('rejects a ~90% "deposit"', () => {
        expect(() => resolveStagedSessionConfig(
            { ...base, deposit: D('900'), minBookings: 6, confirmationDeadline: DEADLINE },
            NOW,
        )).toThrow(BadRequestException);
    });

    it('requires a confirmation deadline for staged sessions', () => {
        expect(() => resolveStagedSessionConfig(
            { ...base, deposit: D('100'), minBookings: 6, confirmationDeadline: null },
            NOW,
        )).toThrow('confirmation deadline is required');
    });

    it('requires the deadline to be in the future and before the start date', () => {
        expect(() => resolveStagedSessionConfig(
            { ...base, deposit: D('100'), minBookings: 6, confirmationDeadline: new Date('2027-01-01T00:00:00.000Z') },
            NOW,
        )).toThrow('must be in the future');
        expect(() => resolveStagedSessionConfig(
            { ...base, deposit: D('100'), minBookings: 6, confirmationDeadline: START },
            NOW,
        )).toThrow('before the session start date');
    });

    it('leaves uncapped deposits alone for non-staged sessions', () => {
        const resolved = resolveStagedSessionConfig(
            { ...base, deposit: D('900'), minBookings: 1, confirmationDeadline: null },
            NOW,
        );
        expect(resolved.staged).toBe(false);
    });
});

describe('StagedPaymentsService (#369)', () => {
    it('creates a plan with the deposit/balance split snapshotted from the session', async () => {
        const external = makeExternalPayments();
        const service = new StagedPaymentsService({} as any, external as any, makeRefunds() as any);
        const tx = makeTx();

        const plan = await service.createPlanInTransaction(tx, {
            bookingId: 'booking-1',
            agencyId: 'agency-1',
            guestsCount: 2,
            totalAmount: D('1200.00'),
            session: makeSession(),
        });

        expect(plan.depositAmount.toString()).toBe('200');
        expect(plan.balanceAmount.toString()).toBe('1000');
        expect(plan.status).toBe('DEPOSIT_DUE');
        expect(plan.minimumParticipants).toBe(4);
        expect(plan.confirmationDeadline).toEqual(DEADLINE);
        expect(plan.paymentPolicyVersion).toBe('phase1-v1');
        expect(plan.refundPolicyVersion).toBe('phase1-v1');
    });

    it('bank-confirming a deposit records only the confirmed deposit amount and waits for the minimum', async () => {
        const external = makeExternalPayments();
        const service = new StagedPaymentsService({} as any, external as any, makeRefunds() as any);
        const tx = makeTx({
            countedPlans: [{ booking: { id: 'booking-1', guestsCount: 2, status: 'PENDING_MINIMUM' } }],
            planAfter: makePlan({ status: 'DEPOSIT_PAID' }),
            bookingAfter: { status: 'PENDING_MINIMUM' },
        });

        const result = await service.applyBankConfirmationInTransaction(tx, {
            booking: makeBooking(),
            plan: makePlan(),
            source: 'MANUAL_PROOF_REVIEW' as any,
            externalReference: 'proof-1',
            confirmedAmount: D('200.00'),
            bankReference: 'BANK-REF-DEP',
            bankConfirmedBy: 'agency-user-1',
        });

        expect(external.recordPaymentVerifiedInTransaction).toHaveBeenCalledTimes(1);
        const [recordTx, recordInput, entryType] = external.recordPaymentVerifiedInTransaction.mock.calls[0] as any;
        expect(recordTx).toBe(tx);
        expect(recordInput.stage).toBe('DEPOSIT');
        // #422: the recorded amount is the confirmed bank credit, bound to
        // its bank reference — not merely the expected stage amount.
        expect(recordInput.amount.toString()).toBe('200');
        expect(recordInput.bankReference).toBe('BANK-REF-DEP');
        expect(recordInput.bankConfirmedBy).toBe('agency-user-1');
        expect(entryType).toBe('DEPOSIT_CAPTURED');
        expect(result.bookingStatus).toBe('PENDING_MINIMUM');
        expect(result.planStatus).toBe('DEPOSIT_PAID');
        expect(result.fullyPaid).toBe(false);
        // Booking moved to PENDING_MINIMUM / PARTIALLY_PAID, never PAID.
        const bookingWrites = tx.booking.updateMany.mock.calls.map((c: any) => c[0].data);
        expect(bookingWrites).toContainEqual(
            expect.objectContaining({ status: 'PENDING_MINIMUM', paymentStatus: 'PARTIALLY_PAID' }),
        );
        expect(bookingWrites).not.toContainEqual(
            expect.objectContaining({ paymentStatus: 'PAID' }),
        );
    });

    it('reaching the minimum confirms the group and makes the balance due', async () => {
        const external = makeExternalPayments();
        const service = new StagedPaymentsService({} as any, external as any, makeRefunds() as any);
        const tx = makeTx({
            countedPlans: [
                { booking: { id: 'booking-1', guestsCount: 2, status: 'PENDING_MINIMUM' } },
                { booking: { id: 'booking-2', guestsCount: 2, status: 'PENDING_MINIMUM' } },
            ],
            waitingPlans: [
                { id: 'plan-1', bookingId: 'booking-1', booking: { id: 'booking-1', status: 'PENDING_MINIMUM' } },
            ],
            planAfter: makePlan({ status: 'BALANCE_DUE' }),
            bookingAfter: { status: 'CONFIRMED' },
        });

        const result = await service.applyBankConfirmationInTransaction(tx, {
            booking: makeBooking(),
            plan: makePlan(),
            source: 'MANUAL_PROOF_REVIEW' as any,
            externalReference: 'proof-1',
            confirmedAmount: D('200.00'),
            bankReference: 'BANK-REF-DEP',
            bankConfirmedBy: 'agency-user-1',
        });

        expect(tx.tripSession.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({ data: { groupStatus: 'CONFIRMED' } }),
        );
        const planWrites = tx.bookingPaymentPlan.update.mock.calls.map((c: any) => c[0].data);
        expect(planWrites).toContainEqual(
            expect.objectContaining({
                status: 'BALANCE_DUE',
                balanceDueAt: START,
                groupConfirmedAt: expect.any(Date),
            }),
        );
        expect(result.bookingStatus).toBe('CONFIRMED');
        expect(result.planStatus).toBe('BALANCE_DUE');
    });

    it('bank-confirming the balance fully pays the booking', async () => {
        const external = makeExternalPayments();
        const service = new StagedPaymentsService({} as any, external as any, makeRefunds() as any);
        const tx = makeTx();

        const result = await service.applyBankConfirmationInTransaction(tx, {
            booking: makeBooking({ status: 'AWAITING_VALIDATION' }),
            plan: makePlan({ status: 'BALANCE_DUE' }),
            source: 'MANUAL_PROOF_REVIEW' as any,
            externalReference: 'proof-2',
            confirmedAmount: D('1000.00'),
            bankReference: 'BANK-REF-BAL',
            bankConfirmedBy: 'agency-user-1',
        });

        const [, recordInput, entryType] = external.recordPaymentVerifiedInTransaction.mock.calls[0] as any;
        expect(recordInput.stage).toBe('BALANCE');
        expect(recordInput.amount.toString()).toBe('1000');
        expect(recordInput.bankReference).toBe('BANK-REF-BAL');
        expect(entryType).toBe('BALANCE_CAPTURED');
        expect(result.fullyPaid).toBe(true);
        const bookingWrites = tx.booking.updateMany.mock.calls.map((c: any) => c[0].data);
        expect(bookingWrites).toContainEqual(
            expect.objectContaining({ status: 'CONFIRMED', paymentStatus: 'PAID', confirmedAt: expect.any(Date) }),
        );
    });

    it('rejects a payment decision when the plan is not awaiting one (no balance before confirmation)', async () => {
        const external = makeExternalPayments();
        const service = new StagedPaymentsService({} as any, external as any, makeRefunds() as any);
        const tx = makeTx();

        await expect(service.applyBankConfirmationInTransaction(tx, {
            booking: makeBooking(),
            plan: makePlan({ status: 'DEPOSIT_PAID' }),
            source: 'MANUAL_PROOF_REVIEW' as any,
            externalReference: 'proof-x',
            confirmedAmount: D('200.00'),
            bankReference: 'BANK-REF-X',
            bankConfirmedBy: 'agency-user-1',
        })).rejects.toThrow('not awaiting a staged payment');
        await expect(service.applyProofRejectionInTransaction(tx, {
            booking: makeBooking(),
            plan: makePlan({ status: 'DEPOSIT_PAID' }),
            source: 'MANUAL_PROOF_REVIEW' as any,
            externalReference: 'proof-x',
        })).rejects.toThrow('not awaiting a staged payment');
        expect(external.recordPaymentVerifiedInTransaction).not.toHaveBeenCalled();
    });

    it('rejecting a deposit proof fails the booking and keeps the plan at DEPOSIT_DUE', async () => {
        const external = makeExternalPayments();
        const service = new StagedPaymentsService({} as any, external as any, makeRefunds() as any);
        const tx = makeTx();

        const result = await service.applyProofRejectionInTransaction(tx, {
            booking: makeBooking(),
            plan: makePlan(),
            source: 'MANUAL_PROOF_REVIEW' as any,
            externalReference: 'proof-1',
        });

        expect(external.recordPaymentRejectedInTransaction).toHaveBeenCalledTimes(1);
        expect(result.bookingStatus).toBe('REJECTED');
        expect(result.planStatus).toBe('DEPOSIT_DUE');
    });

    it('rejecting a balance proof keeps the booking confirmed with the deposit paid', async () => {
        const external = makeExternalPayments();
        const service = new StagedPaymentsService({} as any, external as any, makeRefunds() as any);
        const tx = makeTx();

        const result = await service.applyProofRejectionInTransaction(tx, {
            booking: makeBooking(),
            plan: makePlan({ status: 'BALANCE_DUE' }),
            source: 'MANUAL_PROOF_REVIEW' as any,
            externalReference: 'proof-2',
        });

        expect(result.bookingStatus).toBe('CONFIRMED');
        expect(result.planStatus).toBe('BALANCE_DUE');
        const bookingWrites = tx.booking.updateMany.mock.calls.map((c: any) => c[0].data);
        expect(bookingWrites).toContainEqual(
            expect.objectContaining({ status: 'CONFIRMED', paymentStatus: 'PARTIALLY_PAID' }),
        );
    });

    it('a deposit bank-confirmed after the group failed becomes refund-due immediately', async () => {
        const external = makeExternalPayments();
        const service = new StagedPaymentsService({} as any, external as any, makeRefunds() as any);
        const tx = makeTx({ session: makeSession({ groupStatus: 'NOT_CONFIRMED' }) });

        const result = await service.applyBankConfirmationInTransaction(tx, {
            booking: makeBooking(),
            plan: makePlan(),
            source: 'MANUAL_PROOF_REVIEW' as any,
            externalReference: 'proof-late',
            confirmedAmount: D('200.00'),
            bankReference: 'BANK-REF-LATE',
            bankConfirmedBy: 'agency-user-1',
        });

        expect(result.bookingStatus).toBe('NOT_CONFIRMED');
        expect(result.planStatus).toBe('REFUND_DUE');
        expect(external.recordRefundDueInTransaction).toHaveBeenCalledTimes(1);
    });

    it('deadline job: unmet minimum marks deposits refund-due, cancels unpaid bookings, restores seats', async () => {
        const external = makeExternalPayments();
        const pastDeadline = new Date('2027-01-15T09:00:00.000Z');
        const tx = makeTx({
            session: makeSession({ confirmationDeadline: pastDeadline }),
            countedPlans: [
                { booking: { id: 'booking-1', guestsCount: 2, status: 'PENDING_MINIMUM' } },
            ],
            failPlans: [
                {
                    id: 'plan-1', bookingId: 'booking-1', status: 'DEPOSIT_PAID',
                    depositAmount: D('200.00'), balanceAmount: D('1000.00'), currency: 'MAD', agencyId: 'agency-1', sessionId: 'session-1',
                    booking: { id: 'booking-1', guestsCount: 2, status: 'PENDING_MINIMUM', travelerId: 'traveler-1' },
                },
                {
                    id: 'plan-2', bookingId: 'booking-2', status: 'DEPOSIT_DUE',
                    depositAmount: D('200.00'), balanceAmount: D('1000.00'), currency: 'MAD', agencyId: 'agency-1', sessionId: 'session-1',
                    booking: { id: 'booking-2', guestsCount: 1, status: 'PENDING', travelerId: 'traveler-2' },
                },
            ],
        });
        const db: any = {
            tripSession: { findMany: jest.fn(async () => [{ id: 'session-1' }]) },
            $transaction: jest.fn(async (fn: any) => fn(tx)),
        };
        const service = new StagedPaymentsService(db, external as any, makeRefunds() as any);

        const summary = await service.evaluateConfirmationDeadlines(new Date('2027-02-01T09:00:00.000Z'));

        expect(summary).toEqual({ evaluated: 1, confirmed: 0, notConfirmed: 1 });
        expect(tx.tripSession.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({ data: { groupStatus: 'NOT_CONFIRMED' } }),
        );
        expect(external.recordRefundDueInTransaction).toHaveBeenCalledTimes(1);
        const bookingWrites = tx.booking.updateMany.mock.calls.map((c: any) => c[0]);
        expect(bookingWrites).toContainEqual(expect.objectContaining({
            where: { id: 'booking-1', status: 'PENDING_MINIMUM' },
            data: expect.objectContaining({ status: 'NOT_CONFIRMED' }),
        }));
        expect(bookingWrites).toContainEqual(expect.objectContaining({
            where: { id: 'booking-2', status: 'PENDING' },
            data: expect.objectContaining({ status: 'CANCELLED', cancellationReason: 'GROUP_MINIMUM_NOT_REACHED' }),
        }));
        const planWrites = tx.bookingPaymentPlan.update.mock.calls.map((c: any) => c[0].data);
        expect(planWrites).toContainEqual({ status: 'REFUND_DUE' });
        expect(planWrites).toContainEqual({ status: 'CANCELLED' });
        // Seats restored for both bookings (2 + 1).
        expect(tx.tripSession.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: { availableSeats: { increment: 3 } } }),
        );
    });

    it('force-confirm confirms the group below the minimum and before the deadline (#423)', async () => {
        const external = makeExternalPayments();
        const service = new StagedPaymentsService({} as any, external as any, makeRefunds() as any);
        const tx = makeTx({
            countedPlans: [
                { booking: { id: 'booking-1', guestsCount: 2, status: 'PENDING_MINIMUM' } },
            ],
            waitingPlans: [
                { id: 'plan-1', bookingId: 'booking-1', booking: { id: 'booking-1', status: 'PENDING_MINIMUM' } },
            ],
        });

        const result = await service.forceConfirmGroupInTransaction(tx, 'session-1', NOW);

        // The session minimum is 4, only 2 participants paid: the
        // intervention deliberately overrides both guards.
        expect(result).toEqual({ participants: 2, minBookings: 4 });
        expect(tx.tripSession.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({ data: { groupStatus: 'CONFIRMED' } }),
        );
        const planWrites = tx.bookingPaymentPlan.update.mock.calls.map((c: any) => c[0].data);
        expect(planWrites).toContainEqual(
            expect.objectContaining({ status: 'BALANCE_DUE', groupConfirmedAt: NOW }),
        );
    });

    it('force-confirm refuses a session that is not pending its minimum (#423)', async () => {
        const external = makeExternalPayments();
        const service = new StagedPaymentsService({} as any, external as any, makeRefunds() as any);
        const tx = makeTx({ session: makeSession({ groupStatus: 'CONFIRMED' }) });

        await expect(service.forceConfirmGroupInTransaction(tx, 'session-1'))
            .rejects.toThrow('not pending its minimum');
        expect(tx.tripSession.updateMany).not.toHaveBeenCalled();
    });

    it('close-group fails the group and creates refund cases in the same transaction (#423)', async () => {
        const external = makeExternalPayments();
        const refunds = makeRefunds();
        const service = new StagedPaymentsService({} as any, external as any, refunds as any);
        const tx = makeTx({
            failPlans: [
                {
                    id: 'plan-1', bookingId: 'booking-1', status: 'DEPOSIT_PAID',
                    depositAmount: D('200.00'), balanceAmount: D('1000.00'), currency: 'MAD', agencyId: 'agency-1', sessionId: 'session-1',
                    booking: { id: 'booking-1', guestsCount: 2, status: 'PENDING_MINIMUM', travelerId: 'traveler-1' },
                },
                {
                    id: 'plan-2', bookingId: 'booking-2', status: 'DEPOSIT_DUE',
                    depositAmount: D('200.00'), balanceAmount: D('1000.00'), currency: 'MAD', agencyId: 'agency-1', sessionId: 'session-1',
                    booking: { id: 'booking-2', guestsCount: 1, status: 'PENDING', travelerId: 'traveler-2' },
                },
            ],
        });

        const result = await service.closeGroupInTransaction(tx, 'session-1');

        expect(result).toEqual({ depositPaidBookings: 1, unpaidBookings: 1 });
        expect(tx.tripSession.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({ data: { groupStatus: 'NOT_CONFIRMED' } }),
        );
        // The refund case is created immediately by the close itself —
        // not left for the cron backstop to discover later.
        expect(refunds.createRefundDueCaseInTransaction).toHaveBeenCalledTimes(1);
        const bookingWrites = tx.booking.updateMany.mock.calls.map((c: any) => c[0]);
        expect(bookingWrites).toContainEqual(expect.objectContaining({
            where: { id: 'booking-2', status: 'PENDING' },
            data: expect.objectContaining({ status: 'CANCELLED' }),
        }));
    });

    it('extend-deadline moves the session deadline and every plan snapshot together (#423)', async () => {
        const external = makeExternalPayments();
        const service = new StagedPaymentsService({} as any, external as any, makeRefunds() as any);
        const tx = makeTx();
        const newDeadline = new Date('2027-03-05T09:00:00.000Z');

        const result = await service.extendConfirmationDeadlineInTransaction(tx, 'session-1', newDeadline, NOW);

        expect(result.previousDeadline).toEqual(DEADLINE);
        expect(result.newDeadline).toEqual(newDeadline);
        expect(result.plansUpdated).toBe(2);
        expect(tx.tripSession.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: { confirmationDeadline: newDeadline } }),
        );
        const [planUpdate] = tx.bookingPaymentPlan.updateMany.mock.calls[0] as any;
        expect(planUpdate.data).toEqual({ confirmationDeadline: newDeadline });
        expect(planUpdate.where.sessionId).toBe('session-1');
        // Terminal plans (REFUNDED / CANCELLED) keep their historical snapshot.
        expect(planUpdate.where.status.in).not.toContain('REFUNDED');
        expect(planUpdate.where.status.in).not.toContain('CANCELLED');
    });

    it('extend-deadline rejects past deadlines and deadlines on/after the session start (#423)', async () => {
        const external = makeExternalPayments();
        const service = new StagedPaymentsService({} as any, external as any, makeRefunds() as any);
        const tx = makeTx();

        await expect(service.extendConfirmationDeadlineInTransaction(
            tx, 'session-1', new Date('2027-01-01T09:00:00.000Z'), NOW,
        )).rejects.toThrow('must be in the future');
        await expect(service.extendConfirmationDeadlineInTransaction(
            tx, 'session-1', START, NOW,
        )).rejects.toThrow('start date');
        expect(tx.tripSession.update).not.toHaveBeenCalled();
    });

    it('deadline job is idempotent when nothing is pending', async () => {
        const external = makeExternalPayments();
        const db: any = {
            tripSession: { findMany: jest.fn(async () => []) },
            $transaction: jest.fn(),
        };
        const service = new StagedPaymentsService(db, external as any, makeRefunds() as any);

        const summary = await service.evaluateConfirmationDeadlines();
        expect(summary).toEqual({ evaluated: 0, confirmed: 0, notConfirmed: 0 });
        expect(db.$transaction).not.toHaveBeenCalled();
    });
});
