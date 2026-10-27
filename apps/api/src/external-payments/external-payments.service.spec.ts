import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@ouiboo/database';
import {
    ExternalPaymentStage,
    ExternalPaymentStatus,
    PaymentCustodian,
    PaymentLedgerEntryType,
    PaymentLedgerSource,
    PaymentMethod,
} from '@ouiboo/database';
import {
    ExternalPaymentsService,
    RecordExternalPaymentInput,
    assertPhase1Custodian,
} from './external-payments.service';

const baseInput: RecordExternalPaymentInput = {
    bookingId: 'booking-1',
    agencyId: 'agency-1',
    travelerId: 'traveler-1',
    amount: 780,
    currency: 'MAD',
    method: PaymentMethod.MANUAL,
    externalReference: 'proof-1',
    custodian: PaymentCustodian.AGENCY,
    source: PaymentLedgerSource.MANUAL_PROOF_REVIEW,
};

function makeTx() {
    return {
        externalPayment: {
            upsert: jest.fn(async (args: any) => ({ id: 'ext-payment-1', ...args.create })),
        },
        $executeRaw: jest.fn(async () => 1),
        // Deliberately NO wallet / walletTransaction models on this fake:
        // if the service ever touches a wallet it throws and the test fails.
    } as any;
}

describe('assertPhase1Custodian (#368 invariant)', () => {
    it('accepts the agency and the agency PSP as custodians', () => {
        expect(() => assertPhase1Custodian(PaymentCustodian.AGENCY)).not.toThrow();
        expect(() => assertPhase1Custodian(PaymentCustodian.AGENCY_PSP)).not.toThrow();
    });

    it('rejects OuiBoo as custodian of traveller funds', () => {
        expect(() => assertPhase1Custodian('OUIBOO')).toThrow(BadRequestException);
        expect(() => assertPhase1Custodian('OUIBOO')).toThrow(/never by OuiBoo/);
    });
});

describe('ExternalPaymentsService', () => {
    describe('recordPaymentVerifiedInTransaction', () => {
        it('sets the ExternalPayment to VERIFIED and appends a PAYMENT_VERIFIED ledger entry', async () => {
            const tx = makeTx();
            const service = new ExternalPaymentsService({} as any);

            const payment = await service.recordPaymentVerifiedInTransaction(tx, baseInput);

            expect(payment.id).toBe('ext-payment-1');
            const upsertArgs = tx.externalPayment.upsert.mock.calls[0][0];
            // #369: the upsert is scoped by (bookingId, stage); FULL is the default stage.
            expect(upsertArgs.where).toEqual({
                bookingId_stage: { bookingId: 'booking-1', stage: ExternalPaymentStage.FULL },
            });
            expect(upsertArgs.create.stage).toBe(ExternalPaymentStage.FULL);
            expect(upsertArgs.create.status).toBe(ExternalPaymentStatus.VERIFIED);
            expect(upsertArgs.create.custodian).toBe(PaymentCustodian.AGENCY);
            expect(upsertArgs.create.verifiedAt).toBeInstanceOf(Date);
            expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
        });

        it('cannot create a withdrawable balance: the transaction surface has no wallet at all', async () => {
            const tx = makeTx();
            const service = new ExternalPaymentsService({} as any);

            await service.recordPaymentVerifiedInTransaction(tx, baseInput);

            expect((tx as any).wallet).toBeUndefined();
            expect((tx as any).walletTransaction).toBeUndefined();
        });

        it('refuses to record a payment held by OuiBoo', async () => {
            const tx = makeTx();
            const service = new ExternalPaymentsService({} as any);

            await expect(
                service.recordPaymentVerifiedInTransaction(tx, {
                    ...baseInput,
                    custodian: 'OUIBOO' as PaymentCustodian,
                }),
            ).rejects.toThrow(BadRequestException);
            expect(tx.externalPayment.upsert).not.toHaveBeenCalled();
            expect(tx.$executeRaw).not.toHaveBeenCalled();
        });
    });

    describe('recordPaymentVerifiedInTransaction bank confirmation (#422)', () => {
        it('stamps the bank-confirmation facts that bind VERIFIED to the bank credit', async () => {
            const tx = makeTx();
            const service = new ExternalPaymentsService({} as any);

            await service.recordPaymentVerifiedInTransaction(tx, {
                ...baseInput,
                bankReference: 'TRX-2026-000123',
                bankConfirmedBy: 'agency-user-1',
            });

            const upsertArgs = tx.externalPayment.upsert.mock.calls[0][0];
            expect(upsertArgs.create.status).toBe(ExternalPaymentStatus.VERIFIED);
            expect(upsertArgs.create.confirmedAmount.toString()).toBe('780');
            expect(upsertArgs.create.bankReference).toBe('TRX-2026-000123');
            expect(upsertArgs.create.bankConfirmedAt).toBeInstanceOf(Date);
            expect(upsertArgs.create.bankConfirmedBy).toBe('agency-user-1');
            expect(upsertArgs.update.bankReference).toBe('TRX-2026-000123');
        });

        it('records bankConfirmedBy as null when a bank reference arrives without a named confirmer', async () => {
            const tx = makeTx();
            const service = new ExternalPaymentsService({} as any);

            await service.recordPaymentVerifiedInTransaction(tx, {
                ...baseInput,
                bankReference: 'TRX-2026-000777',
            });

            const upsertArgs = tx.externalPayment.upsert.mock.calls[0][0];
            expect(upsertArgs.create.bankReference).toBe('TRX-2026-000777');
            expect(upsertArgs.create.bankConfirmedBy).toBeNull();
            expect(upsertArgs.update.bankReference).toBe('TRX-2026-000777');
            expect(upsertArgs.update.bankConfirmedBy).toBeNull();
        });

        it('leaves bank-confirmation facts untouched for PSP/webhook records', async () => {
            const tx = makeTx();
            const service = new ExternalPaymentsService({} as any);

            await service.recordPaymentVerifiedInTransaction(tx, baseInput);

            const upsertArgs = tx.externalPayment.upsert.mock.calls[0][0];
            expect(upsertArgs.create).not.toHaveProperty('bankReference');
            expect(upsertArgs.update).not.toHaveProperty('confirmedAmount');
        });
    });

    describe('recordPaymentPendingInTransaction (#422)', () => {
        it('creates the stage payment as PENDING_VERIFICATION with no ledger entry and no bank facts', async () => {
            const tx = makeTx();
            const service = new ExternalPaymentsService({} as any);

            const payment = await service.recordPaymentPendingInTransaction(tx, baseInput);

            expect(payment.id).toBe('ext-payment-1');
            const upsertArgs = tx.externalPayment.upsert.mock.calls[0][0];
            expect(upsertArgs.create.status).toBe(ExternalPaymentStatus.PENDING_VERIFICATION);
            expect(upsertArgs.create.verifiedAt).toBeNull();
            // A fresh proof supersedes any earlier bank confirmation.
            expect(upsertArgs.create.confirmedAmount).toBeNull();
            expect(upsertArgs.create.bankReference).toBeNull();
            expect(upsertArgs.create.bankConfirmedAt).toBeNull();
            expect(upsertArgs.create.bankConfirmedBy).toBeNull();
            expect(upsertArgs.update.status).toBe(ExternalPaymentStatus.PENDING_VERIFICATION);
            // Pending is not settlement: the append-only ledger is untouched.
            expect(tx.$executeRaw).not.toHaveBeenCalled();
        });
    });

    describe('recordPaymentRejectedInTransaction', () => {
        it('sets the ExternalPayment to REJECTED and clears verifiedAt', async () => {
            const tx = makeTx();
            const service = new ExternalPaymentsService({} as any);

            await service.recordPaymentRejectedInTransaction(tx, baseInput);

            const upsertArgs = tx.externalPayment.upsert.mock.calls[0][0];
            expect(upsertArgs.create.status).toBe(ExternalPaymentStatus.REJECTED);
            expect(upsertArgs.update.verifiedAt).toBeNull();
            expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
        });
    });

    describe('recordRefundInTransaction', () => {
        it('marks the ExternalPayment REFUNDED without debiting anything', async () => {
            const tx = makeTx();
            const service = new ExternalPaymentsService({} as any);

            await service.recordRefundInTransaction(tx, {
                ...baseInput,
                method: PaymentMethod.GATEWAY,
                custodian: PaymentCustodian.AGENCY_PSP,
                source: PaymentLedgerSource.GATEWAY_REFUND,
                externalReference: 'refund-1',
                externalTransactionId: 'gateway-tx-1',
            });

            const upsertArgs = tx.externalPayment.upsert.mock.calls[0][0];
            expect(upsertArgs.create.status).toBe(ExternalPaymentStatus.REFUNDED);
            expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
        });
    });

    describe('getAgencyPaymentsOverview', () => {
        it('derives totals from ledger entries and pending external payments', async () => {
            const db = {
                paymentStatusLedgerEntry: {
                    aggregate: jest
                        .fn()
                        .mockResolvedValueOnce({ _sum: { amount: new Prisma.Decimal('1560.00') } })
                        .mockResolvedValueOnce({ _sum: { amount: new Prisma.Decimal('120.00') } }),
                },
                externalPayment: {
                    findMany: jest.fn(async () => [
                        { amount: new Prisma.Decimal('300.00') },
                        { amount: new Prisma.Decimal('450.00') },
                    ]),
                    findFirst: jest.fn(async () => ({ currency: 'MAD' })),
                },
            };
            const service = new ExternalPaymentsService(db as any);

            const overview = await service.getAgencyPaymentsOverview('agency-1');

            expect(overview).toEqual({
                currency: 'MAD',
                totalReceived: '1560.00',
                totalRefunded: '120.00',
                pendingVerificationCount: 2,
                pendingVerificationAmount: '750.00',
            });
            const receivedQuery = db.paymentStatusLedgerEntry.aggregate.mock.calls[0][0];
            expect(receivedQuery.where.type.in).toEqual([
                PaymentLedgerEntryType.PAYMENT_VERIFIED,
                PaymentLedgerEntryType.PAYMENT_CAPTURED,
                PaymentLedgerEntryType.DEPOSIT_CAPTURED,
                PaymentLedgerEntryType.BALANCE_CAPTURED,
            ]);
        });

        it('returns zeros for an agency with no payments', async () => {
            const db = {
                paymentStatusLedgerEntry: {
                    aggregate: jest.fn(async () => ({ _sum: { amount: null } })),
                },
                externalPayment: {
                    findMany: jest.fn(async () => []),
                    findFirst: jest.fn(async () => null),
                },
            };
            const service = new ExternalPaymentsService(db as any);

            const overview = await service.getAgencyPaymentsOverview('agency-new');

            expect(overview.totalReceived).toBe('0.00');
            expect(overview.totalRefunded).toBe('0.00');
            expect(overview.pendingVerificationCount).toBe(0);
            expect(overview.pendingVerificationAmount).toBe('0.00');
        });
    });

    describe('getBookingLedgerTotals (#412)', () => {
        it('sums captures and completed refunds for one booking from the ledger', async () => {
            const tx = {
                paymentStatusLedgerEntry: {
                    aggregate: jest
                        .fn()
                        .mockResolvedValueOnce({ _sum: { amount: new Prisma.Decimal('1000.00') } })
                        .mockResolvedValueOnce({ _sum: { amount: new Prisma.Decimal('200.00') } }),
                },
            };
            const service = new ExternalPaymentsService({} as any);

            const totals = await service.getBookingLedgerTotals(tx as any, 'booking-1');

            expect(totals.verifiedTotal.toString()).toBe('1000');
            expect(totals.refundedTotal.toString()).toBe('200');
            const [verifiedQuery, refundedQuery] = tx.paymentStatusLedgerEntry.aggregate.mock.calls.map(
                (c: any[]) => c[0],
            );
            expect(verifiedQuery.where.bookingId).toBe('booking-1');
            expect(verifiedQuery.where.type.in).toEqual([
                PaymentLedgerEntryType.PAYMENT_VERIFIED,
                PaymentLedgerEntryType.PAYMENT_CAPTURED,
                PaymentLedgerEntryType.DEPOSIT_CAPTURED,
                PaymentLedgerEntryType.BALANCE_CAPTURED,
            ]);
            expect(refundedQuery.where).toEqual({
                bookingId: 'booking-1',
                type: PaymentLedgerEntryType.REFUND_COMPLETED,
            });
        });

        it('returns zero totals when the booking has no ledger entries', async () => {
            const tx = {
                paymentStatusLedgerEntry: {
                    aggregate: jest.fn(async () => ({ _sum: { amount: null } })),
                },
            };
            const service = new ExternalPaymentsService({} as any);

            const totals = await service.getBookingLedgerTotals(tx as any, 'booking-none');

            expect(totals.verifiedTotal.toString()).toBe('0');
            expect(totals.refundedTotal.toString()).toBe('0');
        });
    });

    describe('staged payments (#369)', () => {
        it('scopes the upsert to the DEPOSIT stage for a deposit capture', async () => {
            const tx = makeTx();
            const service = new ExternalPaymentsService({} as any);

            await service.recordPaymentVerifiedInTransaction(
                tx,
                { ...baseInput, amount: 240, stage: ExternalPaymentStage.DEPOSIT },
                PaymentLedgerEntryType.DEPOSIT_CAPTURED,
            );

            const upsertArgs = tx.externalPayment.upsert.mock.calls[0][0];
            expect(upsertArgs.where).toEqual({
                bookingId_stage: { bookingId: 'booking-1', stage: ExternalPaymentStage.DEPOSIT },
            });
            expect(upsertArgs.create.stage).toBe(ExternalPaymentStage.DEPOSIT);
            expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
        });

        it('recordRefundDueInTransaction appends a REFUND_DUE entry against the deposit', async () => {
            const tx = {
                ...makeTx(),
                externalPayment: {
                    upsert: jest.fn(),
                    findFirst: jest.fn(async () => ({
                        id: 'deposit-payment-1',
                        amount: new Prisma.Decimal('240.00'),
                        currency: 'MAD',
                    })),
                },
            } as any;
            const service = new ExternalPaymentsService({} as any);

            const deposit = await service.recordRefundDueInTransaction(tx, baseInput);

            expect(deposit?.id).toBe('deposit-payment-1');
            expect(tx.externalPayment.upsert).not.toHaveBeenCalled();
            expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
        });

        it('recordRefundDueInTransaction is a no-op without a deposit payment', async () => {
            const tx = {
                ...makeTx(),
                externalPayment: {
                    upsert: jest.fn(),
                    findFirst: jest.fn(async () => null),
                },
            } as any;
            const service = new ExternalPaymentsService({} as any);

            const deposit = await service.recordRefundDueInTransaction(tx, baseInput);

            expect(deposit).toBeNull();
            expect(tx.$executeRaw).not.toHaveBeenCalled();
        });
    });
});
