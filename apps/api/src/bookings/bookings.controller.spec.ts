import { BookingsController } from './bookings.controller';

/**
 * Thin-delegate specs for the agency payment review routes (#422): the
 * controller must forward the tenant (agency) and the acting user id so
 * the service can enforce ownership and stamp bankConfirmedBy.
 */
describe('BookingsController payment review routes (#422)', () => {
    const bookingsService = {
        verifyPayment: jest.fn(async () => ({ id: 'booking-1' })),
        confirmBankPayment: jest.fn(async () => ({ id: 'booking-1', status: 'CONFIRMED' })),
    };
    const controller = new BookingsController(bookingsService as any);

    beforeEach(() => jest.clearAllMocks());

    it('verifyPayment forwards booking id, tenant id and the decision', async () => {
        const req = { tenantId: 'agency-1', user: { userId: 'agency-user-1' } };
        await controller.verifyPayment(req, 'booking-1', { approved: true } as any);
        expect(bookingsService.verifyPayment).toHaveBeenCalledWith('booking-1', 'agency-1', true, undefined);
    });

    it('confirmBankPayment forwards booking id, tenant id, acting user and the DTO', async () => {
        const req = { tenantId: 'agency-1', user: { userId: 'agency-user-1' } };
        const dto = { confirmedAmount: 780, bankReference: 'TRX-1' };
        await controller.confirmBankPayment(req, 'booking-1', dto as any);
        expect(bookingsService.confirmBankPayment).toHaveBeenCalledWith('booking-1', 'agency-1', 'agency-user-1', dto);
    });
});

describe('BookingsController idempotency + duplicate-credit routes (#494)', () => {
    const bookingsService = {
        create: jest.fn(async () => ({ id: 'booking-1' })),
        uploadPaymentProof: jest.fn(async () => ({ id: 'proof-1' })),
        createDuplicateCreditFlag: jest.fn(async () => ({ id: 'flag-1', status: 'OPEN' })),
    };
    const controller = new BookingsController(bookingsService as any);

    beforeEach(() => jest.clearAllMocks());

    it('create forwards the Idempotency-Key header to the service', async () => {
        const req = { user: { userId: 'traveler-1' } };
        const dto = { sessionId: 'session-1', guestsCount: 2 };
        await controller.create(req, dto as any, 'attempt-uuid-1');
        expect(bookingsService.create).toHaveBeenCalledWith('traveler-1', dto, 'attempt-uuid-1');
    });

    it('create forwards an absent header as undefined (legacy behaviour)', async () => {
        const req = { user: { userId: 'traveler-1' } };
        const dto = { sessionId: 'session-1', guestsCount: 2 };
        await controller.create(req, dto as any, undefined);
        expect(bookingsService.create).toHaveBeenCalledWith('traveler-1', dto, undefined);
    });

    it('uploadPaymentProof forwards the Idempotency-Key header to the service', async () => {
        const req = { user: { userId: 'traveler-1' } };
        const file = { originalname: 'proof.png' };
        await controller.uploadPaymentProof(req, 'booking-1', file as any, 'proof-uuid-1');
        expect(bookingsService.uploadPaymentProof).toHaveBeenCalledWith('booking-1', 'traveler-1', file, 'proof-uuid-1');
    });

    it('flagDuplicateCredit forwards tenant, acting user and the report body', async () => {
        const req = { tenantId: 'agency-1', user: { userId: 'agency-user-1' } };
        const body = { amount: 200, bankReference: 'DUP-REF-1', note: null };
        await controller.flagDuplicateCredit(req, 'booking-1', body);
        expect(bookingsService.createDuplicateCreditFlag).toHaveBeenCalledWith('booking-1', 'agency-1', 'agency-user-1', body);
    });
});
