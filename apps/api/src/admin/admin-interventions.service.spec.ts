import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@ouiboo/database';
import { AdminInterventionsService } from './admin-interventions.service';

const D = (value: string) => new Prisma.Decimal(value);

const ACTOR = { id: 'admin-1', email: 'admin@example.test' };
const REASON = 'Traveller reported the state is stuck; verified against the agency ledger';

/**
 * Fake transaction surface for the booking repairs (the group repairs
 * delegate to StagedPaymentsService, which is stubbed — its own spec
 * covers the state machine). The same object plays `db` and `tx`,
 * mirroring the RefundsService spec style.
 */
function makeFake(booking: any) {
    const state = {
        booking,
        payments: [] as any[],
        refundCases: [] as any[],
        depositPayment: null as any,
        existingCase: null as any,
        activeCase: null as any,
        groupSessions: [] as any[],
    };
    const auditLog = {
        create: jest.fn(async ({ data }: any) => ({ id: 'audit-1', ...data })),
    };
    const tx: any = {
        auditLog,
        tripSession: {
            findMany: jest.fn(async () => state.groupSessions),
            count: jest.fn(async () => state.groupSessions.length),
        },
        booking: {
            findUnique: jest.fn(async () => state.booking),
            updateMany: jest.fn(async ({ where, data }: any) => {
                if (!state.booking || state.booking.status !== where.status) {
                    return { count: 0 };
                }
                Object.assign(state.booking, data);
                return { count: 1 };
            }),
        },
        externalPayment: {
            findMany: jest.fn(async () => state.payments),
            findFirst: jest.fn(async () => state.depositPayment),
        },
        refundCase: {
            findMany: jest.fn(async () => state.refundCases),
            findUnique: jest.fn(async () => state.existingCase),
            findFirst: jest.fn(async () => state.activeCase),
        },
    };
    const db: any = {
        ...tx,
        $transaction: jest.fn(async (fn: any) => fn(tx)),
    };
    return { db, tx, state, auditLog };
}

function makeStaged() {
    return {
        forceConfirmGroupInTransaction: jest.fn(async () => ({ participants: 2, minBookings: 4 })),
        closeGroupInTransaction: jest.fn(async () => ({ depositPaidBookings: 1, unpaidBookings: 2 })),
        extendConfirmationDeadlineInTransaction: jest.fn(async () => ({
            previousDeadline: new Date('2027-03-01T09:00:00.000Z'),
            newDeadline: new Date('2027-03-05T09:00:00.000Z'),
            plansUpdated: 3,
        })),
    };
}

function makeRefunds() {
    return {
        createRefundDueCaseInTransaction: jest.fn(async () => ({ id: 'case-new' })),
        // #419: traveller notification hook for close-group outcomes.
        notifyTravelersRefundDueForSession: jest.fn(async () => 1),
    };
}

function auditsOf(auditLog: any, action: string) {
    return auditLog.create.mock.calls
        .map((c: any) => c[0].data)
        .filter((d: any) => d.action === action);
}

describe('AdminInterventionsService (#423)', () => {
    it('force-confirm writes exactly one audit row with the reason and the below-minimum flag', async () => {
        const { db, auditLog } = makeFake(null);
        const staged = makeStaged();
        const service = new AdminInterventionsService(db, staged as any, makeRefunds() as any);

        const result = await service.forceConfirmGroup(ACTOR, 'session-1', REASON);

        expect(result.groupStatus).toBe('CONFIRMED');
        expect(staged.forceConfirmGroupInTransaction).toHaveBeenCalledTimes(1);
        expect(auditLog.create).toHaveBeenCalledTimes(1);
        const audits = auditsOf(auditLog, 'ADMIN_GROUP_FORCE_CONFIRMED');
        expect(audits).toHaveLength(1);
        expect(audits[0]).toMatchObject({
            actorId: 'admin-1',
            actorEmail: 'admin@example.test',
            targetType: 'TRIP_SESSION',
            targetId: 'session-1',
        });
        expect(audits[0].metadata).toMatchObject({
            reason: REASON,
            participants: 2,
            minBookings: 4,
            belowMinimum: true,
            before: { groupStatus: 'PENDING_MINIMUM' },
            after: { groupStatus: 'CONFIRMED' },
        });
    });

    it('every intervention refuses to run without a reason and writes no audit row', async () => {
        const { db, auditLog } = makeFake(null);
        const staged = makeStaged();
        const service = new AdminInterventionsService(db, staged as any, makeRefunds() as any);

        await expect(service.forceConfirmGroup(ACTOR, 'session-1', '   '))
            .rejects.toBeInstanceOf(BadRequestException);
        await expect(service.closeGroup(ACTOR, 'session-1', ''))
            .rejects.toBeInstanceOf(BadRequestException);
        await expect(service.repairBooking(ACTOR, 'booking-1', 'resync-payment-state', ' '))
            .rejects.toBeInstanceOf(BadRequestException);
        expect(staged.forceConfirmGroupInTransaction).not.toHaveBeenCalled();
        expect(auditLog.create).not.toHaveBeenCalled();
    });

    it('close-group audits the refund cases created and the bookings cancelled', async () => {
        const { db, auditLog } = makeFake(null);
        const refunds = makeRefunds();
        const service = new AdminInterventionsService(db, makeStaged() as any, refunds as any);

        const result = await service.closeGroup(ACTOR, 'session-1', REASON);

        // #419: travellers owed refunds are notified post-commit.
        expect(refunds.notifyTravelersRefundDueForSession).toHaveBeenCalledWith('session-1');

        expect(result).toMatchObject({ groupStatus: 'NOT_CONFIRMED', depositPaidBookings: 1, cancelledBookings: 2 });
        const audits = auditsOf(auditLog, 'ADMIN_GROUP_CLOSED');
        expect(audits).toHaveLength(1);
        expect(audits[0].metadata).toMatchObject({
            reason: REASON,
            refundCasesCreated: 1,
            cancelledBookings: 2,
            after: { groupStatus: 'NOT_CONFIRMED' },
        });
    });

    it('extend-deadline audits the old and new deadline values', async () => {
        const { db, auditLog } = makeFake(null);
        const service = new AdminInterventionsService(db, makeStaged() as any, makeRefunds() as any);

        const result = await service.extendDeadline(ACTOR, 'session-1', '2027-03-05T09:00:00.000Z', REASON);

        expect(result.plansUpdated).toBe(3);
        const audits = auditsOf(auditLog, 'ADMIN_DEADLINE_EXTENDED');
        expect(audits).toHaveLength(1);
        expect(audits[0].metadata).toMatchObject({
            reason: REASON,
            previousDeadline: '2027-03-01T09:00:00.000Z',
            newDeadline: '2027-03-05T09:00:00.000Z',
            plansUpdated: 3,
        });
    });

    it('resync-payment-state repairs a plan/booking divergence (plan refunded, booking still PAID)', async () => {
        const booking = {
            id: 'booking-1',
            status: 'CONFIRMED',
            paymentStatus: 'PAID',
            refundStatus: null,
            travelerId: 'traveler-1',
            paymentPlan: { status: 'REFUNDED', agencyId: 'agency-1' },
            paymentProof: null,
        };
        const { db, auditLog } = makeFake(booking);
        const service = new AdminInterventionsService(db, makeStaged() as any, makeRefunds() as any);

        const result = await service.repairBooking(ACTOR, 'booking-1', 'resync-payment-state', REASON);

        expect(result.changed).toBe(true);
        expect((result as any).after).toEqual({ status: 'CONFIRMED', paymentStatus: 'REFUNDED', refundStatus: null });
        expect(booking.paymentStatus).toBe('REFUNDED');
        const audits = auditsOf(auditLog, 'ADMIN_BOOKING_REPAIRED');
        expect(audits).toHaveLength(1);
        expect(audits[0].metadata).toMatchObject({
            reason: REASON,
            repairAction: 'resync-payment-state',
            before: { paymentStatus: 'PAID' },
            after: { paymentStatus: 'REFUNDED' },
        });
    });

    it('resync-payment-state repairs the #412 divergence: fully refunded booking still reading CONFIRMED/PAID', async () => {
        const booking = {
            id: 'booking-1',
            status: 'CONFIRMED',
            paymentStatus: 'PAID',
            refundStatus: null,
            travelerId: 'traveler-1',
            paymentPlan: null,
            paymentProof: null,
        };
        const { db, state, auditLog } = makeFake(booking);
        state.payments = [{ stage: 'FULL', status: 'VERIFIED', amount: D('200.00') }];
        state.refundCases = [{ approvedAmount: D('200.00'), requestedAmount: D('200.00') }];
        const service = new AdminInterventionsService(db, makeStaged() as any, makeRefunds() as any);

        const result = await service.repairBooking(ACTOR, 'booking-1', 'resync-payment-state', REASON);

        expect((result as any).after).toEqual({ status: 'CONFIRMED', paymentStatus: 'REFUNDED', refundStatus: 'PROCESSED' });
        expect(auditsOf(auditLog, 'ADMIN_BOOKING_REPAIRED')).toHaveLength(1);
    });

    it('resync-payment-state is idempotent on an in-sync booking', async () => {
        const booking = {
            id: 'booking-1',
            status: 'CONFIRMED',
            paymentStatus: 'PAID',
            refundStatus: null,
            travelerId: 'traveler-1',
            paymentPlan: { status: 'FULLY_PAID', agencyId: 'agency-1' },
            paymentProof: null,
        };
        const { db, tx, auditLog } = makeFake(booking);
        const service = new AdminInterventionsService(db, makeStaged() as any, makeRefunds() as any);

        const result = await service.repairBooking(ACTOR, 'booking-1', 'resync-payment-state', REASON);

        expect(result.changed).toBe(false);
        expect(tx.booking.updateMany).not.toHaveBeenCalled();
        expect(auditsOf(auditLog, 'ADMIN_BOOKING_REPAIRED')[0].metadata.changed).toBe(false);
    });

    it('requeue-proof-review restores AWAITING_VALIDATION so the verify endpoint works again', async () => {
        const booking = {
            id: 'booking-1',
            status: 'PENDING',
            paymentStatus: 'UNPAID',
            refundStatus: null,
            travelerId: 'traveler-1',
            paymentPlan: { status: 'DEPOSIT_DUE', agencyId: 'agency-1' },
            paymentProof: { status: 'PENDING' },
        };
        const { db, auditLog } = makeFake(booking);
        const service = new AdminInterventionsService(db, makeStaged() as any, makeRefunds() as any);

        const result = await service.repairBooking(ACTOR, 'booking-1', 'requeue-proof-review', REASON);

        expect(result.changed).toBe(true);
        expect(booking.status).toBe('AWAITING_VALIDATION');
        expect(auditsOf(auditLog, 'ADMIN_BOOKING_REPAIRED')[0].metadata).toMatchObject({
            repairAction: 'requeue-proof-review',
            before: { status: 'PENDING' },
            after: { status: 'AWAITING_VALIDATION' },
        });
    });

    it('requeue-proof-review refuses when there is no pending proof', async () => {
        const booking = {
            id: 'booking-1',
            status: 'PENDING',
            paymentStatus: 'UNPAID',
            refundStatus: null,
            travelerId: 'traveler-1',
            paymentPlan: null,
            paymentProof: null,
        };
        const { db, auditLog } = makeFake(booking);
        const service = new AdminInterventionsService(db, makeStaged() as any, makeRefunds() as any);

        await expect(service.repairBooking(ACTOR, 'booking-1', 'requeue-proof-review', REASON))
            .rejects.toThrow('no payment proof');
        expect(auditLog.create).not.toHaveBeenCalled();
    });

    it('open-refund-case creates the missing case for a REFUND_DUE plan on demand', async () => {
        const booking = {
            id: 'booking-1',
            status: 'NOT_CONFIRMED',
            paymentStatus: 'PARTIALLY_PAID',
            refundStatus: null,
            travelerId: 'traveler-1',
            paymentPlan: { status: 'REFUND_DUE', agencyId: 'agency-1' },
            paymentProof: null,
        };
        const { db, state, auditLog } = makeFake(booking);
        state.depositPayment = {
            id: 'payment-1',
            amount: D('200.00'),
            currency: 'MAD',
            externalReference: 'proof-1',
        };
        const refunds = makeRefunds();
        const service = new AdminInterventionsService(db, makeStaged() as any, refunds as any);

        const result = await service.repairBooking(ACTOR, 'booking-1', 'open-refund-case', REASON);

        expect(result).toMatchObject({ changed: true, refundCaseId: 'case-new' });
        expect(refunds.createRefundDueCaseInTransaction).toHaveBeenCalledTimes(1);
        const [, createArgs] = refunds.createRefundDueCaseInTransaction.mock.calls[0] as any;
        expect(createArgs).toMatchObject({ bookingId: 'booking-1', agencyId: 'agency-1', travelerId: 'traveler-1' });
        expect(auditsOf(auditLog, 'ADMIN_BOOKING_REPAIRED')[0].metadata).toMatchObject({
            repairAction: 'open-refund-case',
            refundCaseId: 'case-new',
        });
    });

    it('listPendingGroups serializes sessions with paid participants vs the minimum', async () => {
        const { db, state } = makeFake(null);
        state.groupSessions = [{
            id: 'session-1',
            startDate: new Date('2027-03-10T09:00:00.000Z'),
            confirmationDeadline: new Date('2027-03-01T09:00:00.000Z'),
            minBookings: 4,
            currency: 'MAD',
            template: { title: 'Atlas Trek', agency: { companyName: 'Atlas Adventures SARL' } },
            paymentPlans: [
                { status: 'DEPOSIT_PAID', booking: { guestsCount: 2 } },
                { status: 'DEPOSIT_DUE', booking: { guestsCount: 3 } },
                { status: 'FULLY_PAID', booking: { guestsCount: 1 } },
            ],
        }];
        const service = new AdminInterventionsService(db, makeStaged() as any, makeRefunds() as any);

        const result = await service.listPendingGroups({});

        expect(result.pagination).toMatchObject({ total: 1, page: 1, limit: 25 });
        expect(result.data).toEqual([{
            sessionId: 'session-1',
            tripTitle: 'Atlas Trek',
            agencyName: 'Atlas Adventures SARL',
            startDate: new Date('2027-03-10T09:00:00.000Z'),
            confirmationDeadline: new Date('2027-03-01T09:00:00.000Z'),
            minBookings: 4,
            paidParticipants: 3,
            depositPaidBookings: 1,
            currency: 'MAD',
        }]);
    });

    it('a staged-service refusal (group not pending) propagates and writes no audit row', async () => {
        const { db, auditLog } = makeFake(null);
        const staged = makeStaged();
        staged.forceConfirmGroupInTransaction.mockRejectedValueOnce(
            new BadRequestException('Session group is not pending its minimum'),
        );
        const service = new AdminInterventionsService(db, staged as any, makeRefunds() as any);

        await expect(service.forceConfirmGroup(ACTOR, 'session-1', REASON))
            .rejects.toThrow('not pending its minimum');
        expect(auditLog.create).not.toHaveBeenCalled();
    });

    it('extend-deadline rejects an unparseable date before opening a transaction', async () => {
        const { db } = makeFake(null);
        const service = new AdminInterventionsService(db, makeStaged() as any, makeRefunds() as any);

        await expect(service.extendDeadline(ACTOR, 'session-1', 'not-a-date', REASON))
            .rejects.toThrow('must be a valid date');
        expect(db.$transaction).not.toHaveBeenCalled();
    });

    it('resync-payment-state follows the plan through its remaining states', async () => {
        const cases: Array<[string, any, any]> = [
            ['BALANCE_DUE', { status: 'PENDING_MINIMUM', paymentStatus: 'PARTIALLY_PAID' }, { status: 'CONFIRMED', paymentStatus: 'PARTIALLY_PAID' }],
            ['DEPOSIT_PAID', { status: 'AWAITING_VALIDATION', paymentStatus: 'UNPAID' }, { status: 'PENDING_MINIMUM', paymentStatus: 'PARTIALLY_PAID' }],
            ['REFUND_DUE', { status: 'PENDING_MINIMUM', paymentStatus: 'PARTIALLY_PAID' }, { status: 'NOT_CONFIRMED', paymentStatus: 'PARTIALLY_PAID' }],
            ['CANCELLED', { status: 'PENDING', paymentStatus: 'UNPAID' }, { status: 'CANCELLED', paymentStatus: 'UNPAID' }],
        ];
        for (const [planStatus, before, expected] of cases) {
            const booking = {
                id: 'booking-1',
                refundStatus: null,
                travelerId: 'traveler-1',
                paymentPlan: { status: planStatus, agencyId: 'agency-1' },
                paymentProof: null,
                ...before,
            };
            const { db } = makeFake(booking);
            const service = new AdminInterventionsService(db, makeStaged() as any, makeRefunds() as any);
            const result = await service.repairBooking(ACTOR, 'booking-1', 'resync-payment-state', REASON);
            expect((result as any).after).toMatchObject(expected);
        }
    });

    it('resync-payment-state never resurrects a locked booking status', async () => {
        const booking = {
            id: 'booking-1',
            status: 'CANCELLED',
            paymentStatus: 'UNPAID',
            refundStatus: null,
            travelerId: 'traveler-1',
            paymentPlan: { status: 'FULLY_PAID', agencyId: 'agency-1' },
            paymentProof: null,
        };
        const { db } = makeFake(booking);
        const service = new AdminInterventionsService(db, makeStaged() as any, makeRefunds() as any);

        const result = await service.repairBooking(ACTOR, 'booking-1', 'resync-payment-state', REASON);

        // Status stays CANCELLED (locked), but the payment fact is aligned.
        expect((result as any).after).toEqual({ status: 'CANCELLED', paymentStatus: 'PAID', refundStatus: null });
    });

    it('requeue-proof-review refuses a reviewed proof and an already-queued booking', async () => {
        const reviewed = {
            id: 'booking-1', status: 'PENDING', paymentStatus: 'UNPAID', refundStatus: null,
            travelerId: 'traveler-1', paymentPlan: null, paymentProof: { status: 'VERIFIED' },
        };
        const fakeA = makeFake(reviewed);
        const serviceA = new AdminInterventionsService(fakeA.db, makeStaged() as any, makeRefunds() as any);
        await expect(serviceA.repairBooking(ACTOR, 'booking-1', 'requeue-proof-review', REASON))
            .rejects.toThrow('not pending review');

        const queued = { ...reviewed, status: 'AWAITING_VALIDATION', paymentProof: { status: 'PENDING' } };
        const fakeB = makeFake(queued);
        const serviceB = new AdminInterventionsService(fakeB.db, makeStaged() as any, makeRefunds() as any);
        await expect(serviceB.repairBooking(ACTOR, 'booking-1', 'requeue-proof-review', REASON))
            .rejects.toThrow('already awaiting payment validation');
    });

    it('open-refund-case is a no-op when the case already exists, and refuses a conflicting active case', async () => {
        const booking = {
            id: 'booking-1', status: 'NOT_CONFIRMED', paymentStatus: 'PARTIALLY_PAID', refundStatus: null,
            travelerId: 'traveler-1', paymentPlan: { status: 'REFUND_DUE', agencyId: 'agency-1' }, paymentProof: null,
        };
        const fakeA = makeFake(booking);
        fakeA.state.existingCase = { id: 'case-existing' };
        const refundsA = makeRefunds();
        const serviceA = new AdminInterventionsService(fakeA.db, makeStaged() as any, refundsA as any);
        const result = await serviceA.repairBooking(ACTOR, 'booking-1', 'open-refund-case', REASON);
        expect(result).toMatchObject({ changed: false, refundCaseId: 'case-existing' });
        expect(refundsA.createRefundDueCaseInTransaction).not.toHaveBeenCalled();

        const fakeB = makeFake(booking);
        fakeB.state.activeCase = { id: 'case-active' };
        const serviceB = new AdminInterventionsService(fakeB.db, makeStaged() as any, makeRefunds() as any);
        await expect(serviceB.repairBooking(ACTOR, 'booking-1', 'open-refund-case', REASON))
            .rejects.toThrow('already open for this booking');

        const fakeC = makeFake(booking);
        const serviceC = new AdminInterventionsService(fakeC.db, makeStaged() as any, makeRefunds() as any);
        await expect(serviceC.repairBooking(ACTOR, 'booking-1', 'open-refund-case', REASON))
            .rejects.toThrow('No verified deposit payment');
    });

    it('repairBooking reports a missing booking', async () => {
        const { db } = makeFake(null);
        const service = new AdminInterventionsService(db, makeStaged() as any, makeRefunds() as any);
        await expect(service.repairBooking(ACTOR, 'missing', 'resync-payment-state', REASON))
            .rejects.toThrow('Booking not found');
    });

    it('open-refund-case refuses when the plan is not refund-due', async () => {
        const booking = {
            id: 'booking-1',
            status: 'PENDING_MINIMUM',
            paymentStatus: 'PARTIALLY_PAID',
            refundStatus: null,
            travelerId: 'traveler-1',
            paymentPlan: { status: 'DEPOSIT_PAID', agencyId: 'agency-1' },
            paymentProof: null,
        };
        const { db, auditLog } = makeFake(booking);
        const service = new AdminInterventionsService(db, makeStaged() as any, makeRefunds() as any);

        await expect(service.repairBooking(ACTOR, 'booking-1', 'open-refund-case', REASON))
            .rejects.toThrow('not refund-due');
        expect(auditLog.create).not.toHaveBeenCalled();
    });
});
