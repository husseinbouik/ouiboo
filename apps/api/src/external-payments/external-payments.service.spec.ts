import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@ouiboo/database';
import {
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
            expect(upsertArgs.where).toEqual({ bookingId: 'booking-1' });
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
});
