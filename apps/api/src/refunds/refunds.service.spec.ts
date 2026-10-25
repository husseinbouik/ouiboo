import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { Prisma, RefundEvidenceTier } from '@ouiboo/database';
import { RefundsService } from './refunds.service';
import { EmailService } from '../email/email.service';

// #424: RefundsService builds its agency notice through EmailService's
// localized template getters — delegate to a real instance, mock only
// the send.
const emailTemplates = new EmailService();
import { refundAuditRequired, refundAuditSampled } from './refunds.util';

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
    const evidence: any[] = [];
    const attempts: any[] = [];
    const auditRows: any[] = [];
    let seq = 0;

    const db: any = {
        _cases: cases,
        _payments: payments,
        _plans: plans,
        _agencies: agencies,
        _bookings: bookings,
        _evidence: evidence,
        _attempts: attempts,
        _audits: auditRows,
        auditLog: {
            create: jest.fn(async ({ data }: any) => {
                const row = { id: `audit-${++seq}`, ...data };
                auditRows.push(row);
                return row;
            }),
            findMany: jest.fn(async ({ where }: any = {}) =>
                auditRows.filter((r) =>
                    (where?.targetType === undefined || r.targetType === where.targetType)
                    && (where?.targetId === undefined || r.targetId === where.targetId)
                    && (where?.action === undefined || r.action === where.action),
                ),
            ),
        },
        refundEvidence: {
            create: jest.fn(async ({ data }: any) => {
                const row = {
                    id: `evidence-${++seq}`,
                    createdAt: new Date(),
                    reference: null,
                    proofUrl: null,
                    amount: null,
                    note: null,
                    ...data,
                };
                evidence.push(row);
                return row;
            }),
            findMany: jest.fn(async ({ where }: any) =>
                evidence.filter((e) => e.refundCaseId === where.refundCaseId),
            ),
        },
        paymentAttempt: {
            findFirst: jest.fn(async ({ where }: any) =>
                attempts.find((a) =>
                    a.bookingId === where.bookingId
                    && a.providerPaymentId === where.providerPaymentId,
                ) ?? null,
            ),
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
                    (where?.bookingId === undefined
                        || (typeof where.bookingId === 'string'
                            ? c.bookingId === where.bookingId
                            : where.bookingId.in?.includes(c.bookingId)))
                    && (where?.agencyId === undefined || c.agencyId === where.agencyId)
                    && (where?.travelerId === undefined || c.travelerId === where.travelerId)
                    && (where?.status?.in === undefined || where.status.in.includes(c.status))
                    && (where?.status === undefined || typeof where.status !== 'string' || c.status === where.status)
                    && (where?.refundDueAt?.lt === undefined || (c.refundDueAt && c.refundDueAt < where.refundDueAt.lt))
                    && (where?.initiatedAt === undefined || where.initiatedAt !== null || c.initiatedAt === null)
                    // #419: session traveller-notification sweep filters.
                    && (where?.dedupeKey === undefined || (where.dedupeKey.not === null ? c.dedupeKey != null : c.dedupeKey === where.dedupeKey))
                    && (where?.travelerNotifiedAt === undefined || (where.travelerNotifiedAt === null ? c.travelerNotifiedAt == null : true)),
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
        recordRefundInTransaction: jest.fn(async (_tx: any, _input: any) => ({})),
    };
    const email = {
        sendEmail: jest.fn(async () => undefined),
        getRefundActionRequiredTemplate:
            emailTemplates.getRefundActionRequiredTemplate.bind(emailTemplates),
        getRefundActionRequiredSubject:
            emailTemplates.getRefundActionRequiredSubject.bind(emailTemplates),
        getRefundCaseOpenedTemplate:
            emailTemplates.getRefundCaseOpenedTemplate.bind(emailTemplates),
        getRefundCaseOpenedSubject:
            emailTemplates.getRefundCaseOpenedSubject.bind(emailTemplates),
    };
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

    describe('cancellation scale (#417)', () => {
        const seedCancellableBooking = (
            db: any,
            overrides: Record<string, unknown> = {},
            daysUntilStart = 10.5,
        ) => {
            db._bookings.set('booking-1', {
                id: 'booking-1',
                travelerId: 'traveler-1',
                currency: 'MAD',
                cancellationScale: null,
                session: {
                    startDate: new Date(Date.now() + daysUntilStart * DAY_MS),
                    template: { agencyId: 'agency-1', title: 'Trek', cancellationPolicy: null },
                },
                ...overrides,
            });
        };

        it('computes the requested amount from the default scale bands', async () => {
            const db = makeFakeDb();
            seedAgency(db);
            seedCancellableBooking(db); // 10 whole days before start → 50% band
            seedDepositPayment(db, { stage: 'FULL' });
            const { service } = makeService(db);

            const created = await service.requestRefund('traveler-1', {
                bookingId: 'booking-1',
                cancellation: true,
            });

            expect(created.status).toBe('REFUND_REQUESTED');
            expect(created.requestedAmount).toBe('100.00'); // 50% of 200
            expect(created.reason).toBe('TRAVELLER_CANCELLATION');
            expect(created.eligibilityRule).toBe('CANCELLATION_SCALE_BAND_7D_50PCT');
        });

        it('prefers the booking snapshot over the template policy', async () => {
            const db = makeFakeDb();
            seedAgency(db);
            seedCancellableBooking(
                db,
                {
                    cancellationScale: {
                        version: 'cancellation-v1',
                        bands: [
                            { minDaysBeforeStart: 14, refundPercent: 80 },
                            { minDaysBeforeStart: 0, refundPercent: 10 },
                        ],
                        floorRefundPercent: 100,
                        refundInitiationDays: 7,
                    },
                    session: {
                        startDate: new Date(Date.now() + 20.5 * DAY_MS),
                        template: { agencyId: 'agency-1', title: 'Trek', cancellationPolicy: null },
                    },
                },
                20.5,
            );
            seedDepositPayment(db, { stage: 'FULL' });
            const { service } = makeService(db);

            const created = await service.requestRefund('traveler-1', {
                bookingId: 'booking-1',
                cancellation: true,
            });

            expect(created.requestedAmount).toBe('160.00'); // 80% of 200
            expect(created.eligibilityRule).toBe('CANCELLATION_SCALE_BAND_14D_80PCT');
        });

        it('refunds in full at the 30-day boundary of the default scale', async () => {
            const db = makeFakeDb();
            seedAgency(db);
            seedCancellableBooking(db, {}, 30.5);
            seedDepositPayment(db, { stage: 'FULL' });
            const { service } = makeService(db);

            const created = await service.requestRefund('traveler-1', {
                bookingId: 'booking-1',
                cancellation: true,
            });

            expect(created.requestedAmount).toBe('200.00');
            expect(created.eligibilityRule).toBe('CANCELLATION_SCALE_BAND_30D_100PCT');
        });

        it('opens no case inside the zero band of the scale', async () => {
            const db = makeFakeDb();
            seedAgency(db);
            seedCancellableBooking(db, {}, 1.5); // 1 whole day before start → 0%
            seedDepositPayment(db, { stage: 'FULL' });
            const { service } = makeService(db);

            await expect(
                service.requestRefund('traveler-1', { bookingId: 'booking-1', cancellation: true }),
            ).rejects.toBeInstanceOf(BadRequestException);
            expect(db._cases.size).toBe(0);
        });

        it('marks agency-initiated cases with the platform floor rule at 100%', async () => {
            const db = makeFakeDb();
            seedAgency(db);
            seedCancellableBooking(db, {}, 1.5); // bands would give 0% — the floor overrides
            seedDepositPayment(db, { stage: 'FULL' });
            const { service } = makeService(db);

            const created = await service.createCase(
                { id: 'agency-user-1' },
                'AGENCY',
                'agency-1',
                { bookingId: 'booking-1' },
            );

            expect(created.status).toBe('AGENCY_ACTION_REQUIRED');
            expect(created.requestedAmount).toBe('200.00');
            expect(created.eligibilityRule).toBe('AGENCY_FAULT_FULL_REFUND');
        });
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
        // #416: completion requires qualifying evidence (tier 3 here).
        db._evidence.push({
            id: 'evidence-1', refundCaseId: 'case-1', tier: 'BANK_REFERENCE', source: 'AGENCY',
            reference: 'VIR-2026-1042', proofUrl: 'private/agency-user-1/bank-confirmation.pdf',
            amount: D('200.00'), note: null, recordedBy: 'agency-user-1', createdAt: new Date(),
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
        expect(updated.completionTier).toBe('BANK_REFERENCE');
        expect(external.recordRefundInTransaction).toHaveBeenCalledTimes(1);
        expect(external.recordRefundInTransaction.mock.calls[0][1].source).toBe('BANK_CONFIRMATION');
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

describe('RefundsService completion evidence gate (#416)', () => {
    const AGENCY_ACTOR = { id: 'agency-user-1' };
    const ADMIN_ACTOR = { id: 'admin-1' };

    function seedInitiatedCase(db: any, overrides: Record<string, unknown> = {}) {
        const row = {
            id: 'case-1', bookingId: 'booking-1', travelerId: 'traveler-1', agencyId: 'agency-1',
            originalPaymentId: 'payment-1', requestedAmount: D('200.00'), approvedAmount: D('200.00'),
            currency: 'MAD', status: 'REFUND_INITIATED', initiatedAt: new Date(),
            providerRefundId: null, providerStatus: null, completionTier: null,
            ...overrides,
        };
        db._cases.set(row.id, row);
        return row;
    }

    function seedEvidence(db: any, overrides: Record<string, unknown> = {}) {
        const row = {
            id: `evidence-${db._evidence.length + 1}`, refundCaseId: 'case-1',
            tier: 'BANK_REFERENCE', source: 'AGENCY', reference: 'VIR-2026-1042',
            proofUrl: 'private/agency-user-1/bank-confirmation.pdf', amount: D('200.00'),
            note: null, recordedBy: 'agency-user-1', createdAt: new Date(),
            ...overrides,
        };
        db._evidence.push(row);
        return row;
    }

    function seedCompleteFixture(db: any) {
        seedAgency(db);
        seedDepositPayment(db);
        db._bookings.set('booking-1', { id: 'booking-1', refundStatus: null });
        seedInitiatedCase(db);
    }

    it('council verify case: an agency cannot complete a refund with no evidence', async () => {
        const db = makeFakeDb();
        seedCompleteFixture(db);
        const { service, external } = makeService(db);

        await expect(
            service.complete(AGENCY_ACTOR, 'AGENCY', 'agency-1', 'case-1', {}),
        ).rejects.toBeInstanceOf(BadRequestException);

        expect(db._cases.get('case-1').status).toBe('REFUND_INITIATED');
        expect(external.recordRefundInTransaction).not.toHaveBeenCalled();
    });

    it('a typed providerRefundId no longer manufactures GATEWAY_REFUND provenance', async () => {
        const db = makeFakeDb();
        seedCompleteFixture(db);
        const { service, external } = makeService(db);

        // The typed string alone completes nothing.
        await expect(
            service.complete(AGENCY_ACTOR, 'AGENCY', 'agency-1', 'case-1', { providerRefundId: 'rf-typed' }),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(external.recordRefundInTransaction).not.toHaveBeenCalled();

        // With tier-3 evidence attached, the same typed string is recorded
        // as reported — but the ledger source comes from the evidence.
        seedEvidence(db);
        const updated = await service.complete(
            AGENCY_ACTOR, 'AGENCY', 'agency-1', 'case-1', { providerRefundId: 'rf-typed' },
        );
        expect(updated.status).toBe('REFUND_COMPLETED');
        expect(updated.providerRefundId).toBe('rf-typed');
        expect(updated.completionTier).toBe('BANK_REFERENCE');
        expect(external.recordRefundInTransaction.mock.calls[0][1].source).toBe('BANK_CONFIRMATION');
    });

    it('tier-3 evidence without the retained proof file does not qualify', async () => {
        const db = makeFakeDb();
        seedCompleteFixture(db);
        seedEvidence(db, { proofUrl: null });
        const { service } = makeService(db);
        await expect(
            service.complete(AGENCY_ACTOR, 'AGENCY', 'agency-1', 'case-1', {}),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(db._cases.get('case-1').status).toBe('REFUND_INITIATED');
    });

    it('tier-4 traveller confirmation alone never completes', async () => {
        const db = makeFakeDb();
        seedCompleteFixture(db);
        seedEvidence(db, {
            tier: 'TRAVELLER_CONFIRMATION', source: 'TRAVELLER',
            reference: null, proofUrl: null, recordedBy: 'traveler-1',
        });
        const { service } = makeService(db);
        await expect(
            service.complete(AGENCY_ACTOR, 'AGENCY', 'agency-1', 'case-1', {}),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('tier 4 + tier 5 completes via ADMIN_PROOF_REVIEW', async () => {
        const db = makeFakeDb();
        seedCompleteFixture(db);
        seedEvidence(db, {
            tier: 'TRAVELLER_CONFIRMATION', source: 'TRAVELLER',
            reference: null, proofUrl: null, recordedBy: 'traveler-1',
        });
        seedEvidence(db, {
            tier: 'ADMIN_REVIEW', source: 'ADMIN',
            reference: null, proofUrl: null, recordedBy: 'admin-1',
        });
        const { service, external } = makeService(db);

        const updated = await service.complete(AGENCY_ACTOR, 'AGENCY', 'agency-1', 'case-1', {});

        expect(updated.status).toBe('REFUND_COMPLETED');
        expect(updated.completionTier).toBe('ADMIN_REVIEW');
        expect(external.recordRefundInTransaction.mock.calls[0][1].source).toBe('ADMIN_PROOF_REVIEW');
    });

    it('tier-2 bank/provider confirmation completes via BANK_CONFIRMATION', async () => {
        const db = makeFakeDb();
        seedCompleteFixture(db);
        seedEvidence(db, { tier: 'BANK_PROVIDER_CONFIRMATION', reference: 'pay_123' });
        const { service, external } = makeService(db);

        const updated = await service.complete(AGENCY_ACTOR, 'AGENCY', 'agency-1', 'case-1', {});

        expect(updated.status).toBe('REFUND_COMPLETED');
        expect(updated.completionTier).toBe('BANK_PROVIDER_CONFIRMATION');
        const ledgerInput = external.recordRefundInTransaction.mock.calls[0][1];
        expect(ledgerInput.source).toBe('BANK_CONFIRMATION');
        expect(ledgerInput.externalTransactionId).toBe('pay_123');
    });

    it('tier-1 PSP confirmation completes via GATEWAY_REFUND', async () => {
        const db = makeFakeDb();
        seedCompleteFixture(db);
        seedEvidence(db, {
            tier: 'PSP_CONFIRMATION', source: 'SYSTEM_WEBHOOK', reference: 'psp-refund-1',
            proofUrl: null, recordedBy: 'SYSTEM',
        });
        const { service, external } = makeService(db);

        const updated = await service.complete(AGENCY_ACTOR, 'AGENCY', 'agency-1', 'case-1', {});

        expect(updated.status).toBe('REFUND_COMPLETED');
        expect(updated.completionTier).toBe('PSP_CONFIRMATION');
        expect(external.recordRefundInTransaction.mock.calls[0][1].source).toBe('GATEWAY_REFUND');
    });

    it('an admin completing without evidence records their review as tier-5 evidence', async () => {
        const db = makeFakeDb();
        seedCompleteFixture(db);
        const { service, external } = makeService(db);

        const updated = await service.complete(ADMIN_ACTOR, 'ADMIN', null, 'case-1', {});

        expect(updated.status).toBe('REFUND_COMPLETED');
        expect(updated.completionTier).toBe('ADMIN_REVIEW');
        const recorded = db._evidence.filter((e: any) => e.tier === 'ADMIN_REVIEW');
        expect(recorded).toHaveLength(1);
        expect(recorded[0].source).toBe('ADMIN');
        expect(recorded[0].recordedBy).toBe('admin-1');
        expect(external.recordRefundInTransaction.mock.calls[0][1].source).toBe('ADMIN_PROOF_REVIEW');
    });

    it('providerStatus is recorded as reported and never defaulted to COMPLETED', async () => {
        const db = makeFakeDb();
        seedCompleteFixture(db);
        seedEvidence(db);
        const { service } = makeService(db);

        const updated = await service.complete(AGENCY_ACTOR, 'AGENCY', 'agency-1', 'case-1', {});
        expect(updated.providerStatus ?? null).toBeNull();

        const db2 = makeFakeDb();
        seedCompleteFixture(db2);
        seedEvidence(db2);
        const { service: service2 } = makeService(db2);
        const updated2 = await service2.complete(
            AGENCY_ACTOR, 'AGENCY', 'agency-1', 'case-1', { providerStatus: 'SETTLED_BY_BANK' },
        );
        expect(updated2.providerStatus).toBe('SETTLED_BY_BANK');
    });

    it('addEvidence requires both a reference and a retained proof document', async () => {
        const db = makeFakeDb();
        seedCompleteFixture(db);
        const { service } = makeService(db);

        await expect(
            service.addEvidence(AGENCY_ACTOR, 'AGENCY', 'agency-1', 'case-1', { proofUrl: 'private/agency-user-1/doc.pdf' }),
        ).rejects.toBeInstanceOf(BadRequestException);
        await expect(
            service.addEvidence(AGENCY_ACTOR, 'AGENCY', 'agency-1', 'case-1', { reference: 'VIR-1' }),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(db._evidence).toHaveLength(0);
    });

    it('addEvidence rejects proof keys outside the agency\u2019s own private folder', async () => {
        const db = makeFakeDb();
        seedCompleteFixture(db);
        const { service } = makeService(db);

        await expect(
            service.addEvidence(AGENCY_ACTOR, 'AGENCY', 'agency-1', 'case-1', {
                reference: 'VIR-1', proofUrl: 'private/another-user/doc.pdf',
            }),
        ).rejects.toBeInstanceOf(BadRequestException);
        await expect(
            service.addEvidence(AGENCY_ACTOR, 'AGENCY', 'agency-1', 'case-1', {
                reference: 'VIR-1', proofUrl: 'https://example.com/doc.pdf',
            }),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(db._evidence).toHaveLength(0);
    });

    it('addEvidence records tier BANK_REFERENCE and audits the submission', async () => {
        const db = makeFakeDb();
        seedCompleteFixture(db);
        const { service } = makeService(db);

        const created = await service.addEvidence(AGENCY_ACTOR, 'AGENCY', 'agency-1', 'case-1', {
            reference: 'VIR-2026-1042',
            proofUrl: 'private/agency-user-1/bank-confirmation.pdf',
            amount: 200,
        });

        expect(created.tier).toBe('BANK_REFERENCE');
        expect(created.source).toBe('AGENCY');
        expect(created.reference).toBe('VIR-2026-1042');
        expect(created.amount).toBe('200.00');
        expect(db._evidence).toHaveLength(1);
        const audits = db.auditLog.create.mock.calls
            .map((c: any) => c[0].data)
            .filter((d: any) => d.action === 'REFUND_EVIDENCE_RECORDED');
        expect(audits).toHaveLength(1);
        expect(audits[0].metadata.tier).toBe('BANK_REFERENCE');
    });

    it('addEvidence upgrades to BANK_PROVIDER_CONFIRMATION when the reference is a known provider transaction id', async () => {
        const db = makeFakeDb();
        seedCompleteFixture(db);
        db._attempts.push({ id: 'attempt-1', bookingId: 'booking-1', providerPaymentId: 'pay_123' });
        const { service } = makeService(db);

        const created = await service.addEvidence(AGENCY_ACTOR, 'AGENCY', 'agency-1', 'case-1', {
            reference: 'pay_123',
            proofUrl: 'private/agency-user-1/provider-confirmation.pdf',
        });

        expect(created.tier).toBe('BANK_PROVIDER_CONFIRMATION');
    });

    it('addEvidence refuses terminal cases and other agencies\u2019 cases', async () => {
        const db = makeFakeDb();
        seedCompleteFixture(db);
        db._cases.get('case-1').status = 'REFUND_COMPLETED';
        const { service } = makeService(db);
        await expect(
            service.addEvidence(AGENCY_ACTOR, 'AGENCY', 'agency-1', 'case-1', {
                reference: 'VIR-1', proofUrl: 'private/agency-user-1/doc.pdf',
            }),
        ).rejects.toBeInstanceOf(BadRequestException);

        const db2 = makeFakeDb();
        seedCompleteFixture(db2);
        const { service: service2 } = makeService(db2);
        await expect(
            service2.addEvidence(AGENCY_ACTOR, 'AGENCY', 'agency-2', 'case-1', {
                reference: 'VIR-1', proofUrl: 'private/agency-user-1/doc.pdf',
            }),
        ).rejects.toBeInstanceOf(ForbiddenException);
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

    it('reopen is an admin repair path only: ordinary transitions still cannot leave a terminal state', async () => {
        const db = makeFakeDb();
        seedAgency(db);
        seedCase(db);
        const { service } = makeService(db);

        // Ordinary transitions refuse to leave REFUND_COMPLETED — the
        // repair works precisely because it does not go through
        // transitionInTransaction. (Since #416B the state machine has
        // exactly one whitelisted exit from REFUND_COMPLETED: the
        // traveller dispute path in disputeReceipt.)
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

describe('RefundsService PSP wiring + traveller confirm/dispute (#416B)', () => {
    const AGENCY_ACTOR = { id: 'agency-user-1' };
    const ADMIN_ACTOR = { id: 'admin-1' };

    function seedCaseRow(db: any, overrides: Record<string, unknown> = {}) {
        const row = {
            id: 'case-1', bookingId: 'booking-1', travelerId: 'traveler-1', agencyId: 'agency-1',
            originalPaymentId: 'payment-1', requestedAmount: D('200.00'), approvedAmount: D('200.00'),
            currency: 'MAD', status: 'REFUND_INITIATED', initiatedAt: new Date(),
            providerRefundId: null, providerStatus: null, completionTier: null,
            travellerConfirmedAt: null, disputedAt: null, disputeReason: null,
            completedAt: null, auditRequired: false, auditedAt: null, auditedBy: null,
            refundDueAt: null,
            ...overrides,
        };
        db._cases.set(row.id, row);
        return row;
    }

    function seedFixture(db: any, caseOverrides: Record<string, unknown> = {}) {
        seedAgency(db);
        seedDepositPayment(db);
        db._bookings.set('booking-1', { id: 'booking-1', refundStatus: null, paymentStatus: 'PAID' });
        return seedCaseRow(db, caseOverrides);
    }

    function transitionTos(db: any) {
        return db._audits
            .filter((a: any) => a.action === 'REFUND_CASE_TRANSITION' && a.targetId === 'case-1')
            .map((a: any) => a.metadata.to);
    }

    it('a PSP confirmation completes an initiated case with tier-1 evidence and writes no second ledger refund', async () => {
        const db = makeFakeDb();
        seedFixture(db);
        db._plans.push({ bookingId: 'booking-1', agencyId: 'agency-1', status: 'REFUND_DUE' });
        const { service, external } = makeService(db);

        const outcome = await service.recordPspRefundConfirmationInTransaction(db, {
            bookingId: 'booking-1',
            externalPaymentId: 'payment-1',
            providerRefundId: 'psp-refund-9',
            providerStatus: 'REFUNDED',
        });

        expect(outcome).toEqual({ matched: true, completed: true, agencyId: 'agency-1' });
        const row = db._cases.get('case-1');
        expect(row.status).toBe('REFUND_COMPLETED');
        expect(row.completionTier).toBe('PSP_CONFIRMATION');
        expect(row.providerRefundId).toBe('psp-refund-9');
        expect(row.completedAt).toBeInstanceOf(Date);
        // Tier-1 evidence recorded once, from the system webhook source.
        expect(db._evidence).toHaveLength(1);
        expect(db._evidence[0]).toMatchObject({
            refundCaseId: 'case-1',
            tier: 'PSP_CONFIRMATION',
            source: 'SYSTEM_WEBHOOK',
            reference: 'psp-refund-9',
            recordedBy: 'SYSTEM',
        });
        // The PSP caller already recorded the ledger refund — this
        // method must never write a second one.
        expect(external.recordRefundInTransaction).not.toHaveBeenCalled();
        // Booking/plan completion effects match the manual path.
        expect(db._bookings.get('booking-1').refundStatus).toBe('PROCESSED');
        expect(db._plans[0].status).toBe('REFUNDED');
    });

    it('a PSP confirmation completes an AGENCY_ACTION_REQUIRED case through an audited initiate step', async () => {
        const db = makeFakeDb();
        seedFixture(db, { status: 'AGENCY_ACTION_REQUIRED', initiatedAt: null });
        const { service } = makeService(db);

        const outcome = await service.recordPspRefundConfirmationInTransaction(db, {
            bookingId: 'booking-1',
            externalPaymentId: 'payment-1',
            providerRefundId: 'psp-refund-10',
        });

        expect(outcome.completed).toBe(true);
        expect(db._cases.get('case-1').status).toBe('REFUND_COMPLETED');
        expect(db._cases.get('case-1').initiatedAt).toBeInstanceOf(Date);
        expect(transitionTos(db)).toEqual(['REFUND_INITIATED', 'REFUND_COMPLETED']);
    });

    it('a PSP confirmation with no active case for the booking changes nothing', async () => {
        const db = makeFakeDb();
        seedAgency(db);
        const { service, external } = makeService(db);

        const outcome = await service.recordPspRefundConfirmationInTransaction(db, {
            bookingId: 'booking-1',
            providerRefundId: 'psp-refund-11',
        });

        expect(outcome).toEqual({ matched: false, completed: false, agencyId: null });
        expect(db._evidence).toHaveLength(0);
        expect(external.recordRefundInTransaction).not.toHaveBeenCalled();
    });

    it('a PSP confirmation records evidence but does not complete a case still in eligibility review', async () => {
        const db = makeFakeDb();
        seedFixture(db, { status: 'ELIGIBILITY_REVIEW', initiatedAt: null });
        const { service } = makeService(db);

        const outcome = await service.recordPspRefundConfirmationInTransaction(db, {
            bookingId: 'booking-1',
            providerRefundId: 'psp-refund-12',
        });

        expect(outcome).toEqual({ matched: true, completed: false, agencyId: 'agency-1' });
        expect(db._cases.get('case-1').status).toBe('ELIGIBILITY_REVIEW');
        expect(db._evidence).toHaveLength(1);
        expect(db._evidence[0].tier).toBe('PSP_CONFIRMATION');
    });

    it('a repeated PSP confirmation does not duplicate the evidence row', async () => {
        const db = makeFakeDb();
        seedFixture(db, { status: 'ELIGIBILITY_REVIEW', initiatedAt: null });
        const { service } = makeService(db);

        await service.recordPspRefundConfirmationInTransaction(db, {
            bookingId: 'booking-1', providerRefundId: 'psp-refund-13',
        });
        const second = await service.recordPspRefundConfirmationInTransaction(db, {
            bookingId: 'booking-1', providerRefundId: 'psp-refund-13',
        });

        expect(second.matched).toBe(true);
        expect(db._evidence).toHaveLength(1);
    });

    it('confirmReceipt records tier-4 evidence and stamps the case, for the case traveller only', async () => {
        const db = makeFakeDb();
        seedFixture(db);
        const { service } = makeService(db);

        const updated = await service.confirmReceipt('traveler-1', 'case-1');

        expect(updated.travellerConfirmedAt).toBeInstanceOf(Date);
        expect(updated.status).toBe('REFUND_INITIATED'); // tier 4 never completes alone
        expect(db._evidence).toHaveLength(1);
        expect(db._evidence[0]).toMatchObject({
            tier: 'TRAVELLER_CONFIRMATION',
            source: 'TRAVELLER',
            recordedBy: 'traveler-1',
        });

        const db2 = makeFakeDb();
        seedFixture(db2);
        const { service: service2 } = makeService(db2);
        await expect(service2.confirmReceipt('traveler-2', 'case-1'))
            .rejects.toBeInstanceOf(ForbiddenException);
        expect(db2._evidence).toHaveLength(0);
    });

    it('confirmReceipt rejects the wrong status and a double confirmation', async () => {
        const db = makeFakeDb();
        seedFixture(db, { status: 'AGENCY_ACTION_REQUIRED', initiatedAt: null });
        const { service } = makeService(db);
        await expect(service.confirmReceipt('traveler-1', 'case-1'))
            .rejects.toBeInstanceOf(BadRequestException);

        const db2 = makeFakeDb();
        seedFixture(db2);
        const { service: service2 } = makeService(db2);
        await service2.confirmReceipt('traveler-1', 'case-1');
        await expect(service2.confirmReceipt('traveler-1', 'case-1'))
            .rejects.toBeInstanceOf(BadRequestException);
        expect(db2._evidence).toHaveLength(1);
    });

    it('disputeReceipt reopens a completed case inside the window and reverts the money fields — ledger untouched', async () => {
        const db = makeFakeDb();
        seedFixture(db, {
            status: 'REFUND_COMPLETED',
            completedAt: new Date(Date.now() - 10 * DAY_MS),
            completionTier: 'BANK_REFERENCE',
        });
        db._bookings.get('booking-1').refundStatus = 'PROCESSED';
        db._plans.push({ bookingId: 'booking-1', agencyId: 'agency-1', status: 'REFUNDED' });
        const { service, external } = makeService(db);

        const updated = await service.disputeReceipt('traveler-1', 'case-1', {
            reason: 'The money never arrived',
        });

        expect(updated.status).toBe('ELIGIBILITY_REVIEW');
        expect(updated.disputeReason).toBe('The money never arrived');
        expect(updated.disputedAt).toBeInstanceOf(Date);
        expect(updated.completionTier).toBeNull();
        // Obligation is live again on the dashboards…
        expect(db._bookings.get('booking-1').refundStatus).toBe('PENDING');
        expect(db._plans[0].status).toBe('REFUND_DUE');
        // …but the append-only ledger is not rewritten.
        expect(external.recordRefundInTransaction).not.toHaveBeenCalled();
        const disputes = db._audits.filter((a: any) => a.action === 'TRAVELLER_DISPUTE');
        expect(disputes).toHaveLength(1);
        expect(disputes[0].actorId).toBe('traveler-1');
    });

    it('disputeReceipt rejects disputes after the 60-day window, non-completed cases, and non-owners', async () => {
        const db = makeFakeDb();
        seedFixture(db, {
            status: 'REFUND_COMPLETED',
            completedAt: new Date(Date.now() - 61 * DAY_MS),
            completionTier: 'BANK_REFERENCE',
        });
        const { service } = makeService(db);
        await expect(service.disputeReceipt('traveler-1', 'case-1', { reason: 'Too late' }))
            .rejects.toBeInstanceOf(BadRequestException);
        expect(db._cases.get('case-1').status).toBe('REFUND_COMPLETED');

        const db2 = makeFakeDb();
        seedFixture(db2); // REFUND_INITIATED, not completed
        const { service: service2 } = makeService(db2);
        await expect(service2.disputeReceipt('traveler-1', 'case-1', { reason: 'Not completed' }))
            .rejects.toBeInstanceOf(BadRequestException);

        const db3 = makeFakeDb();
        seedFixture(db3, {
            status: 'REFUND_COMPLETED',
            completedAt: new Date(),
            completionTier: 'PSP_CONFIRMATION',
        });
        const { service: service3 } = makeService(db3);
        await expect(service3.disputeReceipt('traveler-2', 'case-1', { reason: 'Not mine' }))
            .rejects.toBeInstanceOf(ForbiddenException);
    });

    it('beginReview cannot reopen a completed case (the dispute path is traveller-only)', async () => {
        const db = makeFakeDb();
        seedFixture(db, {
            status: 'REFUND_COMPLETED',
            completedAt: new Date(),
            completionTier: 'BANK_REFERENCE',
        });
        const { service } = makeService(db);

        await expect(service.beginReview(ADMIN_ACTOR, 'ADMIN', null, 'case-1'))
            .rejects.toBeInstanceOf(BadRequestException);
        await expect(service.beginReview(AGENCY_ACTOR, 'AGENCY', 'agency-1', 'case-1'))
            .rejects.toBeInstanceOf(BadRequestException);
        expect(db._cases.get('case-1').status).toBe('REFUND_COMPLETED');
    });

    it('audit flag: a small tier-2 completion with no risk signals is not flagged (case-1 is outside the sample)', async () => {
        expect(refundAuditSampled('case-1')).toBe(false);
        const db = makeFakeDb();
        seedFixture(db);
        db._evidence.push({
            id: 'evidence-1', refundCaseId: 'case-1', tier: 'BANK_PROVIDER_CONFIRMATION',
            source: 'AGENCY', reference: 'pay_1', proofUrl: 'private/agency-user-1/doc.pdf',
            amount: D('200.00'), note: null, recordedBy: 'agency-user-1', createdAt: new Date(),
        });
        const { service } = makeService(db);

        const updated = await service.complete(AGENCY_ACTOR, 'AGENCY', 'agency-1', 'case-1', {});

        expect(updated.status).toBe('REFUND_COMPLETED');
        expect(updated.auditRequired).toBe(false);
    });

    it('audit flag: amount at or above the 5000 threshold is always flagged', async () => {
        const db = makeFakeDb();
        seedFixture(db, { requestedAmount: D('6000.00'), approvedAmount: D('6000.00') });
        db._evidence.push({
            id: 'evidence-1', refundCaseId: 'case-1', tier: 'BANK_PROVIDER_CONFIRMATION',
            source: 'AGENCY', reference: 'pay_2', proofUrl: 'private/agency-user-1/doc.pdf',
            amount: D('6000.00'), note: null, recordedBy: 'agency-user-1', createdAt: new Date(),
        });
        const { service } = makeService(db);

        const updated = await service.complete(AGENCY_ACTOR, 'AGENCY', 'agency-1', 'case-1', {});

        expect(updated.auditRequired).toBe(true);
    });

    it('audit flag: tier-3 (weakest path) completions are always flagged', async () => {
        const db = makeFakeDb();
        seedFixture(db);
        db._evidence.push({
            id: 'evidence-1', refundCaseId: 'case-1', tier: 'BANK_REFERENCE',
            source: 'AGENCY', reference: 'VIR-1', proofUrl: 'private/agency-user-1/doc.pdf',
            amount: D('200.00'), note: null, recordedBy: 'agency-user-1', createdAt: new Date(),
        });
        const { service } = makeService(db);

        const updated = await service.complete(AGENCY_ACTOR, 'AGENCY', 'agency-1', 'case-1', {});

        expect(updated.completionTier).toBe('BANK_REFERENCE');
        expect(updated.auditRequired).toBe(true);
    });

    it('audit flag: tier 4 + tier 5 completions are always flagged', async () => {
        const db = makeFakeDb();
        seedFixture(db);
        db._evidence.push({
            id: 'evidence-1', refundCaseId: 'case-1', tier: 'TRAVELLER_CONFIRMATION',
            source: 'TRAVELLER', reference: null, proofUrl: null,
            amount: null, note: null, recordedBy: 'traveler-1', createdAt: new Date(),
        });
        const { service } = makeService(db);

        // Admin completion records the tier-5 review; the traveller
        // confirmation makes the qualifying path tier 4 + 5.
        const updated = await service.complete(ADMIN_ACTOR, 'ADMIN', null, 'case-1', {});

        expect(updated.completionTier).toBe('ADMIN_REVIEW');
        expect(updated.auditRequired).toBe(true);
    });

    it('audit flag: a case that was ever overdue is flagged on completion', async () => {
        const db = makeFakeDb();
        seedFixture(db, {
            status: 'AGENCY_ACTION_REQUIRED',
            initiatedAt: null,
            refundDueAt: new Date(Date.now() - DAY_MS),
        });
        const { service } = makeService(db);

        await service.markOverdueCases();
        expect(db._cases.get('case-1').status).toBe('REFUND_OVERDUE');
        await service.initiate(AGENCY_ACTOR, 'AGENCY', 'agency-1', 'case-1', {});
        db._evidence.push({
            id: 'evidence-1', refundCaseId: 'case-1', tier: 'BANK_PROVIDER_CONFIRMATION',
            source: 'AGENCY', reference: 'pay_3', proofUrl: 'private/agency-user-1/doc.pdf',
            amount: D('200.00'), note: null, recordedBy: 'agency-user-1', createdAt: new Date(),
        });
        const updated = await service.complete(AGENCY_ACTOR, 'AGENCY', 'agency-1', 'case-1', {});

        expect(updated.status).toBe('REFUND_COMPLETED');
        expect(updated.auditRequired).toBe(true);
    });

    it('audit sampling is deterministic and covers at least 20% of cases', () => {
        const ids = Array.from({ length: 200 }, (_, i) => `case-${i}`);
        const first = ids.map((id) => refundAuditSampled(id));
        const second = ids.map((id) => refundAuditSampled(id));
        expect(second).toEqual(first);
        const sampled = first.filter(Boolean).length;
        expect(sampled).toBeGreaterThanOrEqual(40); // >= 20%
        expect(sampled).toBeLessThanOrEqual(70);
        // With no hard signal and a strong tier, the flag is exactly the sample.
        const base = {
            wasEverOverdue: false,
            wasDisputed: false,
            amountAtOrAboveThreshold: false,
            completionTier: RefundEvidenceTier.PSP_CONFIRMATION,
            travellerConfirmationPresent: false,
        };
        for (const id of ['case-1', 'case-2', 'case-3']) {
            expect(refundAuditRequired({ ...base, caseId: id })).toBe(refundAuditSampled(id));
        }
    });

    it('markAudited stamps auditedAt/auditedBy and audits the review', async () => {
        const db = makeFakeDb();
        seedFixture(db, {
            status: 'REFUND_COMPLETED',
            completedAt: new Date(),
            completionTier: 'BANK_REFERENCE',
            auditRequired: true,
        });
        const { service } = makeService(db);

        const updated = await service.markAudited(ADMIN_ACTOR, 'case-1');

        expect(updated.auditedBy).toBe('admin-1');
        expect(updated.auditedAt).toBeInstanceOf(Date);
        const audits = db._audits.filter((a: any) => a.action === 'REFUND_CASE_AUDITED');
        expect(audits).toHaveLength(1);
        expect(audits[0].metadata.auditRequired).toBe(true);
    });
});

describe('RefundsService audit queue + evidence exposure (#416C)', () => {
    const ADMIN_ACTOR = { id: 'admin-1' };

    function seedCase(db: any, overrides: Record<string, unknown> = {}) {
        const row = {
            id: `case-${db._cases.size + 1}`, bookingId: 'booking-1', travelerId: 'traveler-1',
            agencyId: 'agency-1', originalPaymentId: 'payment-1',
            requestedAmount: D('200.00'), approvedAmount: D('200.00'), currency: 'MAD',
            status: 'REFUND_COMPLETED', completedAt: new Date(), completionTier: 'BANK_REFERENCE',
            auditRequired: true, auditedAt: null, auditedBy: null,
            ...overrides,
        };
        db._cases.set(row.id, row);
        return row;
    }

    /**
     * The shared fake's findMany/count do not model the auditQueue where
     * fields — extend them here with the full matcher listAdminCases uses.
     */
    function honourAuditFields(db: any) {
        const matches = (c: any, where: any = {}) =>
            (where.agencyId === undefined || c.agencyId === where.agencyId)
            && (where.status === undefined || typeof where.status !== 'string' || c.status === where.status)
            && (where.auditRequired === undefined || c.auditRequired === where.auditRequired)
            && (where.auditedAt === undefined || (c.auditedAt ?? null) === where.auditedAt);
        db.refundCase.findMany = jest.fn(async ({ where }: any) =>
            [...db._cases.values()].filter((c: any) => matches(c, where)),
        );
        db.refundCase.count = jest.fn(async ({ where }: any) =>
            [...db._cases.values()].filter((c: any) => matches(c, where)).length,
        );
    }

    it('the audit queue lists only completed, audit-flagged, not-yet-audited cases', async () => {
        const db = makeFakeDb();
        honourAuditFields(db);
        seedAgency(db);
        const queued = seedCase(db);
        seedCase(db, { auditedAt: new Date(), auditedBy: 'admin-1' }); // already audited
        seedCase(db, { auditRequired: false }); // not flagged
        seedCase(db, { status: 'REFUND_INITIATED', completedAt: null, completionTier: null }); // not completed
        const { service } = makeService(db);

        const result = await service.listAdminCases({ auditQueue: 'true' });

        expect(result.pagination.total).toBe(1);
        expect(result.data.map((c: any) => c.id)).toEqual([queued.id]);
        expect(result.data[0].auditRequired).toBe(true);
        expect(result.data[0].auditedAt).toBeNull();
        expect(result.data[0].completionTier).toBe('BANK_REFERENCE');
    });

    it('without auditQueue the admin list is unfiltered by the audit fields', async () => {
        const db = makeFakeDb();
        honourAuditFields(db);
        seedAgency(db);
        seedCase(db);
        seedCase(db, { auditRequired: false });
        const { service } = makeService(db);

        const result = await service.listAdminCases({});

        expect(result.pagination.total).toBe(2);
    });

    it('a marked-audited case leaves the audit queue', async () => {
        const db = makeFakeDb();
        honourAuditFields(db);
        seedAgency(db);
        seedCase(db);
        const { service } = makeService(db);

        await service.markAudited(ADMIN_ACTOR, 'case-1');
        const result = await service.listAdminCases({ auditQueue: true });

        expect(result.pagination.total).toBe(0);
    });

    it('case responses carry the evidence trail with amounts serialized as strings', async () => {
        const db = makeFakeDb();
        seedAgency(db);
        const refundCase = seedCase(db, { status: 'REFUND_INITIATED', completedAt: null, completionTier: null });
        (refundCase as any).evidence = [
            {
                id: 'evidence-1', refundCaseId: refundCase.id, tier: 'BANK_REFERENCE',
                source: 'AGENCY', reference: 'VIR-2026-1042',
                proofUrl: 'private/agency-user-1/bank-confirmation.pdf',
                amount: D('200.00'), note: null, recordedBy: 'agency-user-1',
                createdAt: new Date(),
            },
            {
                id: 'evidence-2', refundCaseId: refundCase.id, tier: 'TRAVELLER_CONFIRMATION',
                source: 'TRAVELLER', reference: null, proofUrl: null,
                amount: null, note: null, recordedBy: 'traveler-1',
                createdAt: new Date(),
            },
        ];
        const { service } = makeService(db);

        const result = await service.getCaseForActor(refundCase.id, 'ADMIN', null);
        const evidence = (result as any).evidence;

        expect(evidence).toHaveLength(2);
        expect(evidence[0].tier).toBe('BANK_REFERENCE');
        expect(evidence[0].reference).toBe('VIR-2026-1042');
        expect(evidence[0].amount).toBe('200.00');
        expect(evidence[1].amount).toBeNull();
    });
});

describe('RefundsService traveller notification (#419)', () => {
    function seedRefundDueCase(db: any, overrides: Record<string, unknown> = {}) {
        const refundCase = {
            id: 'case-notify-1',
            bookingId: 'booking-1',
            travelerId: 'traveler-1',
            agencyId: 'agency-1',
            status: 'AGENCY_ACTION_REQUIRED',
            dedupeKey: 'refund-due:booking-1',
            requestedAmount: D('200.00'),
            approvedAmount: D('200.00'),
            currency: 'MAD',
            refundDueAt: new Date('2027-01-22T09:00:00.000Z'),
            travelerNotifiedAt: null,
            traveler: { email: 'traveler@example.test', name: 'Sara' },
            agency: { companyName: 'Atlas Adventures SARL' },
            booking: { session: { template: { title: 'Atlas Trek' } } },
            ...overrides,
        };
        db._cases.set(refundCase.id, refundCase);
        return refundCase;
    }

    it('emails the traveller when an automatic refund case opens, with amount, agency and deadline — once', async () => {
        const db = makeFakeDb();
        const refundCase = seedRefundDueCase(db);
        const { service, email } = makeService(db);

        const sent = await service.notifyTravelerRefundCaseOpened(refundCase.id);

        expect(sent).toBe(true);
        expect(email.sendEmail).toHaveBeenCalledTimes(1);
        const [to, subject, html] = (email.sendEmail as jest.Mock).mock.calls[0];
        expect(to).toBe('traveler@example.test');
        expect(subject).toBe('Your refund is on its way');
        expect(html).toContain('Atlas Trek');
        expect(html).toContain('200');
        expect(html).toContain('MAD');
        expect(html).toContain('Atlas Adventures SARL');
        expect(html).toContain('22 January 2027');
        expect(html).toContain('48 hours');
        expect(refundCase.travelerNotifiedAt).toBeInstanceOf(Date);

        // Idempotent: a second call (another cascade path) sends nothing.
        const again = await service.notifyTravelerRefundCaseOpened(refundCase.id);
        expect(again).toBe(false);
        expect(email.sendEmail).toHaveBeenCalledTimes(1);
    });

    it('renders the traveller email in French when the booking locale is fr (#424)', async () => {
        const db = makeFakeDb();
        const refundCase = seedRefundDueCase(db, {
            booking: { locale: 'fr', session: { template: { title: 'Atlas Trek' } } },
        });
        const { service, email } = makeService(db);

        const sent = await service.notifyTravelerRefundCaseOpened(refundCase.id);

        expect(sent).toBe(true);
        const [, subject, html] = (email.sendEmail as jest.Mock).mock.calls[0];
        expect(subject).toBe('Votre remboursement est en route');
        expect(html).toContain('<html lang="fr" dir="ltr">');
        expect(html).toContain('22 janvier 2027');
        expect(html).toContain('Atlas Trek');
        expect(html).not.toContain('Your refund is on its way');
    });

    it('renders the traveller email in Arabic (RTL) when the booking locale is ar (#424)', async () => {
        const db = makeFakeDb();
        const refundCase = seedRefundDueCase(db, {
            booking: { locale: 'ar', session: { template: { title: 'Atlas Trek' } } },
        });
        const { service, email } = makeService(db);

        const sent = await service.notifyTravelerRefundCaseOpened(refundCase.id);

        expect(sent).toBe(true);
        const [, subject, html] = (email.sendEmail as jest.Mock).mock.calls[0];
        expect(subject).toBe('استردادك في الطريق إليك');
        expect(html).toContain('<html lang="ar" dir="rtl">');
        expect(html).toContain('لم تصل رحلتك');
        expect(html).not.toContain('Your refund is on its way');
    });

    it('falls back to English when the booking has no recorded locale (#424)', async () => {
        const db = makeFakeDb();
        const refundCase = seedRefundDueCase(db);
        const { service, email } = makeService(db);

        const sent = await service.notifyTravelerRefundCaseOpened(refundCase.id);

        expect(sent).toBe(true);
        const [, subject, html] = (email.sendEmail as jest.Mock).mock.calls[0];
        expect(subject).toBe('Your refund is on its way');
        expect(html).toContain('<html lang="en" dir="ltr">');
    });

    it('does not email when the traveller has no address on file', async () => {
        const db = makeFakeDb();
        const refundCase = seedRefundDueCase(db, {
            traveler: { email: null, name: 'Sara' },
        });
        const { service, email } = makeService(db);

        const sent = await service.notifyTravelerRefundCaseOpened(refundCase.id);

        expect(sent).toBe(false);
        expect(email.sendEmail).not.toHaveBeenCalled();
        expect(refundCase.travelerNotifiedAt).toBeNull();
    });

    it('session sweep notifies only unstamped refund-due cases of the session bookings', async () => {
        const db = makeFakeDb();
        const due = seedRefundDueCase(db);
        seedRefundDueCase(db, {
            id: 'case-notify-2',
            bookingId: 'booking-2',
            dedupeKey: 'refund-due:booking-2',
            travelerNotifiedAt: new Date(),
        });
        seedRefundDueCase(db, {
            id: 'case-notify-3',
            bookingId: 'booking-3',
            dedupeKey: null,
        });
        db._plans.push(
            { bookingId: 'booking-1', sessionId: 'session-1', status: 'REFUND_DUE' },
            { bookingId: 'booking-2', sessionId: 'session-1', status: 'REFUND_DUE' },
            { bookingId: 'booking-3', sessionId: 'session-1', status: 'REFUND_DUE' },
        );
        const { service, email } = makeService(db);

        const notified = await service.notifyTravelersRefundDueForSession('session-1');

        expect(notified).toBe(1);
        expect(email.sendEmail).toHaveBeenCalledTimes(1);
        expect(due.travelerNotifiedAt).toBeInstanceOf(Date);
    });
});

describe('RefundsService traveller notification branches (#419)', () => {
    it('sends without trip title or due date when the case lacks them', async () => {
        const db = makeFakeDb();
        const refundCase: any = {
            id: 'case-notify-bare',
            bookingId: 'booking-9',
            travelerId: 'traveler-9',
            agencyId: 'agency-1',
            status: 'AGENCY_ACTION_REQUIRED',
            dedupeKey: 'refund-due:booking-9',
            requestedAmount: D('150.00'),
            approvedAmount: null,
            currency: 'MAD',
            refundDueAt: null,
            travelerNotifiedAt: null,
            traveler: { email: 'bare@example.test', name: null },
            agency: { companyName: '' },
            booking: { session: { template: { title: '' } } },
        };
        db._cases.set(refundCase.id, refundCase);
        const { service, email } = makeService(db);

        const sent = await service.notifyTravelerRefundCaseOpened(refundCase.id);

        expect(sent).toBe(true);
        const [, , html] = (email.sendEmail as jest.Mock).mock.calls[0];
        expect(html).toContain('150');
        expect(html).toContain('the agency');
        expect(html).not.toContain('agency has until');
    });

    it('does not send when another caller claimed the stamp first', async () => {
        const db = makeFakeDb();
        const refundCase: any = {
            id: 'case-notify-race',
            bookingId: 'booking-10',
            travelerId: 'traveler-10',
            agencyId: 'agency-1',
            status: 'AGENCY_ACTION_REQUIRED',
            dedupeKey: 'refund-due:booking-10',
            requestedAmount: D('150.00'),
            approvedAmount: D('150.00'),
            currency: 'MAD',
            refundDueAt: new Date('2027-01-22T09:00:00.000Z'),
            travelerNotifiedAt: null,
            traveler: { email: 'race@example.test', name: 'Sara' },
            agency: { companyName: 'Atlas Adventures SARL' },
            booking: { session: { template: { title: 'Atlas Trek' } } },
        };
        db._cases.set(refundCase.id, refundCase);
        (db.refundCase.updateMany as jest.Mock).mockResolvedValueOnce({ count: 0 });
        const { service, email } = makeService(db);

        const sent = await service.notifyTravelerRefundCaseOpened(refundCase.id);

        expect(sent).toBe(false);
        expect(email.sendEmail).not.toHaveBeenCalled();
    });

    it('session sweep returns 0 with no refund-due plans and skips non-cascade cases', async () => {
        const db = makeFakeDb();
        const { service, email } = makeService(db);

        await expect(service.notifyTravelersRefundDueForSession('session-none')).resolves.toBe(0);

        const foreign: any = {
            id: 'case-foreign',
            bookingId: 'booking-11',
            travelerId: 'traveler-11',
            agencyId: 'agency-1',
            status: 'AGENCY_ACTION_REQUIRED',
            dedupeKey: 'manual:booking-11',
            requestedAmount: D('10.00'),
            approvedAmount: D('10.00'),
            currency: 'MAD',
            refundDueAt: null,
            travelerNotifiedAt: null,
            traveler: { email: 'foreign@example.test', name: null },
            agency: { companyName: 'Atlas' },
            booking: { session: { template: { title: 'Trek' } } },
        };
        db._cases.set(foreign.id, foreign);
        db._plans.push({ bookingId: 'booking-11', sessionId: 'session-1', status: 'REFUND_DUE' });

        await expect(service.notifyTravelersRefundDueForSession('session-1')).resolves.toBe(0);
        expect(email.sendEmail).not.toHaveBeenCalled();
    });
});
