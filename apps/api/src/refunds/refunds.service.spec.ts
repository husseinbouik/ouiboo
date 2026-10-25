import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@ouiboo/database';
import { RefundsService } from './refunds.service';

const D = (value: string) => new Prisma.Decimal(value);
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * In-memory fake of the Prisma surface RefundsService uses. The same
 * object plays both `db` and the transaction client, mirroring how the
 * service passes tx handles around.
 */
function makeFakeDb() {
    const cases = new Map<string, any>();
    const payments = new Map<string, any>();
    const plans: any[] = [];
    const agencies = new Map<string, any>();
    const bookings = new Map<string, any>();
    let seq = 0;

    const db: any = {
        _cases: cases,
        _payments: payments,
        _plans: plans,
        _agencies: agencies,
        _bookings: bookings,
        auditLog: {
            create: jest.fn(async ({ data }: any) => ({ id: `audit-${++seq}`, ...data })),
        },
        refundCase: {
            findUnique: jest.fn(async ({ where }: any) => {
                if (where.dedupeKey) {
                    return [...cases.values()].find((c) => c.dedupeKey === where.dedupeKey) ?? null;
                }
                return cases.get(where.id) ?? null;
            }),
            findFirst: jest.fn(async ({ where }: any) => {
                return [...cases.values()].find((c) =>
                    (where.bookingId === undefined || c.bookingId === where.bookingId)
                    && (where.status?.in === undefined || where.status.in.includes(c.status)),
                ) ?? null;
            }),
            findMany: jest.fn(async ({ where }: any) => {
                return [...cases.values()].filter((c) =>
                    (where?.agencyId === undefined || c.agencyId === where.agencyId)
                    && (where?.travelerId === undefined || c.travelerId === where.travelerId)
                    && (where?.status?.in === undefined || where.status.in.includes(c.status))
                    && (where?.status === undefined || typeof where.status !== 'string' || c.status === where.status)
                    && (where?.refundDueAt?.lt === undefined || (c.refundDueAt && c.refundDueAt < where.refundDueAt.lt))
                    && (where?.initiatedAt === undefined || where.initiatedAt !== null || c.initiatedAt === null),
                );
            }),
            count: jest.fn(async ({ where }: any) => {
                return [...cases.values()].filter((c) =>
                    (where.agencyId === undefined || c.agencyId === where.agencyId)
                    && (where.status?.in === undefined || where.status.in.includes(c.status))
                    && (where.status === undefined || typeof where.status !== 'string' || c.status === where.status),
                ).length;
            }),
            create: jest.fn(async ({ data }: any) => {
                const row = { id: `case-${++seq}`, createdAt: new Date(), updatedAt: new Date(), ...data };
                cases.set(row.id, row);
                return row;
            }),
            updateMany: jest.fn(async ({ where, data }: any) => {
                const row = cases.get(where.id);
                if (!row || (where.status !== undefined && row.status !== where.status)) {
                    return { count: 0 };
                }
                Object.assign(row, data);
                return { count: 1 };
            }),
        },
        externalPayment: {
            findMany: jest.fn(async ({ where }: any) => {
                return [...payments.values()].filter((p) =>
                    p.bookingId === where.bookingId
                    && (where.status === undefined || p.status === where.status),
                );
            }),
            findFirst: jest.fn(async ({ where }: any) => {
                return [...payments.values()].find((p) =>
                    p.bookingId === where.bookingId
                    && (where.stage === undefined || p.stage === where.stage)
                    && (where.status === undefined || p.status === where.status),
                ) ?? null;
            }),
            findUnique: jest.fn(async ({ where }: any) => payments.get(where.id) ?? null),
            count: jest.fn(async ({ where }: any) => {
                return [...payments.values()].filter((p) =>
                    p.bookingId === where.bookingId
                    && (where.status === undefined || p.status === where.status),
                ).length;
            }),
        },
        booking: {
            findUnique: jest.fn(async ({ where }: any) => bookings.get(where.id) ?? null),
            update: jest.fn(async ({ where, data }: any) => {
                const row = bookings.get(where.id);
                Object.assign(row, data);
                return row;
            }),
        },
        bookingPaymentPlan: {
            findMany: jest.fn(async () => plans),
            updateMany: jest.fn(async ({ where, data }: any) => {
                let count = 0;
                for (const plan of plans) {
                    if (plan.bookingId === where.bookingId && plan.status === where.status) {
                        plan.status = data.status;
                        count += 1;
                    }
                }
                return { count };
            }),
        },
        agencyProfile: {
            findUnique: jest.fn(async ({ where }: any) => agencies.get(where.id) ?? null),
            update: jest.fn(async ({ where, data }: any) => {
                const row = agencies.get(where.id);
                Object.assign(row, data);
                return row;
            }),
        },
    };
    db.$transaction = jest.fn(async (cb: any) => cb(db));
    db.refundCase.findUniqueOrThrow = jest.fn(async ({ where }: any) => {
        const row = cases.get(where.id);
        if (!row) throw new Error('not found');
        return row;
    });
    // findUniqueOrThrow is called on tx inside transitionInTransaction.
    db.refundCase = { ...db.refundCase, findUniqueOrThrow: db.refundCase.findUniqueOrThrow };
    return db;
}

function makeService(db: any) {
    const external = {
        recordRefundInTransaction: jest.fn(async () => ({})),
    };
    const email = { sendEmail: jest.fn(async () => undefined) };
    const service = new RefundsService(db as any, external as any, email as any);
    return { service, external, email };
}

function seedAgency(db: any, overrides: Record<string, unknown> = {}) {
    const agency = {
        id: 'agency-1',
        companyName: 'Atlas Adventures SARL',
        newBookingsRestrictedAt: null,
        newBookingsRestrictionReason: null,
        user: { email: 'agency@example.test' },
        ...overrides,
    };
    db._agencies.set(agency.id, agency);
    return agency;
}

function seedDepositPayment(db: any, overrides: Record<string, unknown> = {}) {
    const payment = {
        id: 'payment-1',
        bookingId: 'booking-1',
        agencyId: 'agency-1',
        travelerId: 'traveler-1',
        amount: D('200.00'),
        currency: 'MAD',
        method: 'MANUAL',
        provider: null,
        externalReference: 'proof-1',
        custodian: 'AGENCY',
        status: 'VERIFIED',
        stage: 'DEPOSIT',
        createdAt: new Date(),
        ...overrides,
    };
    db._payments.set(payment.id, payment);
    return payment;
}

describe('RefundsService (#370)', () => {
    it('creates an actionable refund-due case for a cancelled unconfirmed trip, idempotently', async () => {
        const db = makeFakeDb();
        seedAgency(db);
        const payment = seedDepositPayment(db);
        const { service } = makeService(db);

        const created = await service.createRefundDueCaseInTransaction(db, {
            bookingId: 'booking-1',
            agencyId: 'agency-1',
            travelerId: 'traveler-1',
            payment: {
                id: payment.id,
                amount: payment.amount,
                currency: 'MAD',
                externalReference: 'proof-1',
            },
        });

        expect(created.status).toBe('AGENCY_ACTION_REQUIRED');
        expect(created.reason).toBe('GROUP_MINIMUM_NOT_REACHED');
        expect(created.requestedAmount.toString()).toBe('200');
        expect(created.approvedAmount!.toString()).toBe('200');
        expect(created.agencyNotifiedAt).toBeInstanceOf(Date);
        // SLA: due 7 days after creation by default.
        expect(created.refundDueAt!.getTime() - created.requestedAt.getTime()).toBe(7 * DAY_MS);
        expect(db.auditLog.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ action: 'REFUND_CASE_CREATED', targetId: created.id }),
            }),
        );

        const again = await service.createRefundDueCaseInTransaction(db, {
            bookingId: 'booking-1',
            agencyId: 'agency-1',
            travelerId: 'traveler-1',
            payment: { id: payment.id, amount: payment.amount, currency: 'MAD', externalReference: 'proof-1' },
        });
        expect(again.id).toBe(created.id);
        expect(db.refundCase.create).toHaveBeenCalledTimes(1);
    });

    it('syncRefundDueCases creates cases for REFUND_DUE plans and skips plans without a verified deposit', async () => {
        const db = makeFakeDb();
        seedAgency(db);
        seedDepositPayment(db);
        db._plans.push(
            { bookingId: 'booking-1', agencyId: 'agency-1', status: 'REFUND_DUE', booking: { travelerId: 'traveler-1' } },
            { bookingId: 'booking-2', agencyId: 'agency-1', status: 'REFUND_DUE', booking: { travelerId: 'traveler-2' } },
        );
        const { service, email } = makeService(db);

        const result = await service.syncRefundDueCases();

        expect(result.created).toBe(1);
        expect(db._cases.size).toBe(1);
        expect(email.sendEmail).toHaveBeenCalledTimes(1);
    });

    it('traveller request requires a verified payment and forbids other travellers', async () => {
        const db = makeFakeDb();
        seedAgency(db);
        db._bookings.set('booking-1', {
            id: 'booking-1',
            travelerId: 'traveler-1',
            currency: 'MAD',
            session: { template: { agencyId: 'agency-1', title: 'Trek' } },
        });
        const { service } = makeService(db);

        await expect(
            service.requestRefund('someone-else', { bookingId: 'booking-1' }),
        ).rejects.toBeInstanceOf(ForbiddenException);

        await expect(
            service.requestRefund('traveler-1', { bookingId: 'booking-1' }),
        ).rejects.toBeInstanceOf(BadRequestException);

        seedDepositPayment(db, { stage: 'FULL' });
        const created = await service.requestRefund('traveler-1', { bookingId: 'booking-1' });
        expect(created.status).toBe('REFUND_REQUESTED');
        expect(created.requestedAmount).toBe('200.00');

        await expect(
            service.requestRefund('traveler-1', { bookingId: 'booking-1' }),
        ).rejects.toBeInstanceOf(ConflictException);
    });

    it('approve records REFUND_APPROVED in the audit trail and lands in AGENCY_ACTION_REQUIRED with an SLA deadline', async () => {
        const db = makeFakeDb();
        seedAgency(db);
        const row = {
            id: 'case-1', bookingId: 'booking-1', travelerId: 'traveler-1', agencyId: 'agency-1',
            requestedAmount: D('200.00'), approvedAmount: null, currency: 'MAD',
            status: 'ELIGIBILITY_REVIEW', initiatedAt: null, providerRefundId: null,
        };
        db._cases.set(row.id, row);
        const { service } = makeService(db);

        const updated = await service.approve({ id: 'admin-1' }, 'ADMIN', null, 'case-1', {});

        expect(updated.status).toBe('AGENCY_ACTION_REQUIRED');
        expect(updated.approvedAmount).toBe('200.00');
        expect(updated.approvedAt).toBeInstanceOf(Date);
        expect(updated.refundDueAt!.getTime() - updated.approvedAt!.getTime()).toBe(7 * DAY_MS);
        const transitions = db.auditLog.create.mock.calls
            .map((c: any) => c[0].data)
            .filter((d: any) => d.action === 'REFUND_CASE_TRANSITION');
        expect(transitions.map((d: any) => d.metadata.to)).toEqual([
            'REFUND_APPROVED',
            'AGENCY_ACTION_REQUIRED',
        ]);
    });

    it('approve rejects amounts above the requested amount', async () => {
        const db = makeFakeDb();
        seedAgency(db);
        db._cases.set('case-1', {
            id: 'case-1', bookingId: 'booking-1', travelerId: 'traveler-1', agencyId: 'agency-1',
            requestedAmount: D('200.00'), approvedAmount: null, currency: 'MAD',
            status: 'REFUND_REQUESTED', initiatedAt: null, providerRefundId: null,
        });
        const { service } = makeService(db);
        await expect(
            service.approve({ id: 'admin-1' }, 'ADMIN', null, 'case-1', { approvedAmount: 250 }),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('complete records the refund in the ledger, marks the booking refunded and the plan REFUNDED', async () => {
        const db = makeFakeDb();
        seedAgency(db);
        const payment = seedDepositPayment(db);
        db._bookings.set('booking-1', { id: 'booking-1', refundStatus: null });
        db._plans.push({ bookingId: 'booking-1', status: 'REFUND_DUE' });
        db._cases.set('case-1', {
            id: 'case-1', bookingId: 'booking-1', travelerId: 'traveler-1', agencyId: 'agency-1',
            originalPaymentId: payment.id, requestedAmount: D('200.00'), approvedAmount: D('200.00'),
            currency: 'MAD', status: 'REFUND_INITIATED', initiatedAt: new Date(), providerRefundId: null,
        });
        const { service, external } = makeService(db);
        // After completion the payment leaves VERIFIED (recorded by the
        // external payments service in real code; mirrored here).
        external.recordRefundInTransaction.mockImplementation(async () => {
            payment.status = 'REFUNDED';
            return {};
        });

        const updated = await service.complete({ id: 'agency-user-1' }, 'AGENCY', 'agency-1', 'case-1', {});

        expect(updated.status).toBe('REFUND_COMPLETED');
        expect(updated.completedAt).toBeInstanceOf(Date);
        expect(external.recordRefundInTransaction).toHaveBeenCalledTimes(1);
        const booking = db._bookings.get('booking-1');
        expect(booking.refundStatus).toBe('PROCESSED');
        expect(booking.paymentStatus).toBe('REFUNDED');
        expect(db._plans[0].status).toBe('REFUNDED');
    });

    it('a failed refund does not disappear: it can be initiated again', async () => {
        const db = makeFakeDb();
        seedAgency(db);
        db._bookings.set('booking-1', { id: 'booking-1', refundStatus: null });
        db._cases.set('case-1', {
            id: 'case-1', bookingId: 'booking-1', travelerId: 'traveler-1', agencyId: 'agency-1',
            requestedAmount: D('200.00'), approvedAmount: D('200.00'), currency: 'MAD',
            status: 'REFUND_INITIATED', initiatedAt: new Date(), providerRefundId: null,
        });
        const { service } = makeService(db);

        const failed = await service.fail(
            { id: 'agency-user-1' }, 'AGENCY', 'agency-1', 'case-1',
            { failureReason: 'Bank rejected the transfer' },
        );
        expect(failed.status).toBe('REFUND_FAILED');
        expect(failed.failureReason).toBe('Bank rejected the transfer');
        expect(db._cases.has('case-1')).toBe(true);

        const retried = await service.initiate(
            { id: 'agency-user-1' }, 'AGENCY', 'agency-1', 'case-1', {},
        );
        expect(retried.status).toBe('REFUND_INITIATED');
    });

    it('overdue sweep flips past-due cases and restricts NEW bookings without touching existing bookings', async () => {
        const db = makeFakeDb();
        const agency = seedAgency(db);
        db._bookings.set('booking-1', { id: 'booking-1', status: 'CONFIRMED' });
        db._cases.set('case-1', {
            id: 'case-1', bookingId: 'booking-1', travelerId: 'traveler-1', agencyId: 'agency-1',
            requestedAmount: D('200.00'), approvedAmount: D('200.00'), currency: 'MAD',
            status: 'AGENCY_ACTION_REQUIRED', initiatedAt: null,
            refundDueAt: new Date(Date.now() - DAY_MS),
        });
        const { service } = makeService(db);

        const result = await service.markOverdueCases(new Date());

        expect(result.marked).toBe(1);
        expect(db._cases.get('case-1').status).toBe('REFUND_OVERDUE');
        expect(agency.newBookingsRestrictedAt).toBeInstanceOf(Date);
        expect(agency.newBookingsRestrictionReason).toBe('OVERDUE_REFUND');
        // Invariant: the sweep never writes to bookings.
        expect(db.booking.update).not.toHaveBeenCalled();
        expect(db._bookings.get('booking-1').status).toBe('CONFIRMED');
    });

    it('restriction clears once no overdue cases remain', async () => {
        const db = makeFakeDb();
        const agency = seedAgency(db, {
            newBookingsRestrictedAt: new Date(),
            newBookingsRestrictionReason: 'OVERDUE_REFUND',
        });
        const { service } = makeService(db);

        await service.refreshAgencyRestriction('agency-1');

        expect(agency.newBookingsRestrictedAt).toBeNull();
        expect(agency.newBookingsRestrictionReason).toBeNull();
    });

    it('agency actors cannot act on another agency\'s case', async () => {
        const db = makeFakeDb();
        seedAgency(db);
        db._cases.set('case-1', {
            id: 'case-1', bookingId: 'booking-1', travelerId: 'traveler-1', agencyId: 'agency-1',
            requestedAmount: D('200.00'), approvedAmount: null, currency: 'MAD',
            status: 'REFUND_REQUESTED', initiatedAt: null, providerRefundId: null,
        });
        const { service } = makeService(db);
        await expect(
            service.beginReview({ id: 'other-agency-user' }, 'AGENCY', 'agency-2', 'case-1'),
        ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('invalid transitions are rejected', async () => {
        const db = makeFakeDb();
        seedAgency(db);
        db._cases.set('case-1', {
            id: 'case-1', bookingId: 'booking-1', travelerId: 'traveler-1', agencyId: 'agency-1',
            requestedAmount: D('200.00'), approvedAmount: null, currency: 'MAD',
            status: 'REFUND_REQUESTED', initiatedAt: null, providerRefundId: null,
        });
        const { service } = makeService(db);
        await expect(
            service.complete({ id: 'agency-user-1' }, 'AGENCY', 'agency-1', 'case-1', {}),
        ).rejects.toBeInstanceOf(BadRequestException);
    });
});

describe('RefundsService admin repairs (#423)', () => {
    const ADMIN = { id: 'admin-1', email: 'admin@example.test' };

    function seedCase(db: any, overrides: Record<string, unknown> = {}) {
        const row = {
            id: 'case-1', bookingId: 'booking-1', travelerId: 'traveler-1', agencyId: 'agency-1',
            requestedAmount: D('200.00'), approvedAmount: D('200.00'), currency: 'MAD',
            status: 'REFUND_COMPLETED', initiatedAt: new Date(), providerRefundId: 'rf-1',
            originalPaymentId: 'payment-1', externalPaymentReference: 'proof-1',
            completedAt: new Date(),
            ...overrides,
        };
        db._cases.set(row.id, row);
        return row;
    }

    function repairAudits(db: any) {
        return db.auditLog.create.mock.calls
            .map((c: any) => c[0].data)
            .filter((d: any) => d.action === 'ADMIN_REFUND_REPAIRED');
    }

    it('reopens a completed case into eligibility review and audits the repair with its reason', async () => {
        const db = makeFakeDb();
        seedAgency(db);
        seedCase(db);
        const { service } = makeService(db);

        const updated = await service.repairCaseAsAdmin(ADMIN, 'case-1', {
            action: 'reopen',
            reason: 'Completed against the wrong booking',
        });

        expect(updated.status).toBe('ELIGIBILITY_REVIEW');
        expect(updated.completedAt).toBeNull();
        const audits = repairAudits(db);
        expect(audits).toHaveLength(1);
        expect(audits[0].targetId).toBe('case-1');
        expect(audits[0].metadata).toMatchObject({
            repairAction: 'reopen',
            reason: 'Completed against the wrong booking',
            reopened: true,
            before: { status: 'REFUND_COMPLETED' },
            after: { status: 'ELIGIBILITY_REVIEW', completedAt: null },
        });
    });

    it('reopen is an admin repair path only: the public state machine still has no exit from terminal states', async () => {
        const db = makeFakeDb();
        seedAgency(db);
        seedCase(db);
        const { service } = makeService(db);

        // The whitelisted transition engine refuses to leave REFUND_COMPLETED
        // for any actor — the repair works precisely because it does not go
        // through transitionInTransaction.
        await expect(
            service.initiate(ADMIN, 'ADMIN', null, 'case-1', {}),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(db._cases.get('case-1').status).toBe('REFUND_COMPLETED');
    });

    it('reopen refuses a case that is not terminal', async () => {
        const db = makeFakeDb();
        seedAgency(db);
        seedCase(db, { status: 'AGENCY_ACTION_REQUIRED', completedAt: null });
        const { service } = makeService(db);

        await expect(service.repairCaseAsAdmin(ADMIN, 'case-1', {
            action: 'reopen',
            reason: 'Trying to reopen an active case',
        })).rejects.toThrow('Only a completed or rejected');
        expect(repairAudits(db)).toHaveLength(0);
    });

    it('correct-amount on a completed case fixes the amount and reopens it in the same intervention', async () => {
        const db = makeFakeDb();
        seedAgency(db);
        seedCase(db);
        const { service } = makeService(db);

        const updated = await service.repairCaseAsAdmin(ADMIN, 'case-1', {
            action: 'correct-amount',
            reason: 'Approved amount recorded the balance instead of the deposit',
            approvedAmount: 150,
        });

        expect(updated.approvedAmount).toBe('150.00');
        expect(updated.status).toBe('ELIGIBILITY_REVIEW');
        expect(updated.completedAt).toBeNull();
        expect(repairAudits(db)[0].metadata).toMatchObject({
            repairAction: 'correct-amount',
            reopened: true,
            before: { approvedAmount: '200.00' },
            after: { approvedAmount: '150.00' },
        });
    });

    it('correct-amount validates the amount and never exceeds the requested amount', async () => {
        const db = makeFakeDb();
        seedAgency(db);
        seedCase(db, { status: 'ELIGIBILITY_REVIEW', completedAt: null });
        const { service } = makeService(db);

        await expect(service.repairCaseAsAdmin(ADMIN, 'case-1', {
            action: 'correct-amount',
            reason: 'Amount above the request',
            approvedAmount: 250,
        })).rejects.toThrow('no more than the requested amount');
        await expect(service.repairCaseAsAdmin(ADMIN, 'case-1', {
            action: 'correct-amount',
            reason: 'Missing the amount entirely',
        })).rejects.toThrow('approvedAmount is required');
    });

    it('relink-payment points the case at another payment of the same booking', async () => {
        const db = makeFakeDb();
        seedAgency(db);
        seedDepositPayment(db);
        seedDepositPayment(db, { id: 'payment-2', stage: 'BALANCE', externalReference: 'proof-2' });
        seedCase(db, { status: 'ELIGIBILITY_REVIEW', completedAt: null });
        const { service } = makeService(db);

        const updated = await service.repairCaseAsAdmin(ADMIN, 'case-1', {
            action: 'relink-payment',
            reason: 'Case was linked to the deposit instead of the balance payment',
            originalPaymentId: 'payment-2',
        });

        expect(updated.originalPaymentId).toBe('payment-2');
        expect(updated.externalPaymentReference).toBe('proof-2');
        expect(repairAudits(db)[0].metadata).toMatchObject({
            repairAction: 'relink-payment',
            before: { originalPaymentId: 'payment-1' },
            after: { originalPaymentId: 'payment-2', externalPaymentReference: 'proof-2' },
        });
    });

    it('relink-payment refuses a payment that belongs to a different booking', async () => {
        const db = makeFakeDb();
        seedAgency(db);
        seedDepositPayment(db, { id: 'payment-9', bookingId: 'booking-2' });
        seedCase(db, { status: 'ELIGIBILITY_REVIEW', completedAt: null });
        const { service } = makeService(db);

        await expect(service.repairCaseAsAdmin(ADMIN, 'case-1', {
            action: 'relink-payment',
            reason: 'Wrong payment id supplied',
            originalPaymentId: 'payment-9',
        })).rejects.toThrow('different booking');
    });

    it('every repair requires a reason', async () => {
        const db = makeFakeDb();
        seedAgency(db);
        seedCase(db);
        const { service } = makeService(db);

        await expect(service.repairCaseAsAdmin(ADMIN, 'case-1', {
            action: 'reopen',
            reason: '   ',
        })).rejects.toThrow('reason is required');
        expect(repairAudits(db)).toHaveLength(0);
    });
});
