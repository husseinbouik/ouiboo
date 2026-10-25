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
