import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { QuoteRequestsService } from './quote-requests.service';

/**
 * #682 (Council S6): firm-quote flow — request (no price) → agency firm
 * MAD TTC quote + scale → traveller acceptance snapshots immutably.
 */
describe('QuoteRequestsService (#682)', () => {
    const db: any = {
        tripTemplate: { findUnique: jest.fn() },
        agencyProfile: { findUnique: jest.fn() },
        quoteRequest: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    };
    let service: QuoteRequestsService;

    const pendingRow = {
        id: 'qr-1', templateId: 'trip-1', agencyId: 'agency-1', travelerId: 'trav-1',
        requestedStartDate: new Date('2026-12-18'), requestedEndDate: new Date('2026-12-20'),
        guestsCount: 4, note: null, status: 'PENDING',
        quotedTotalAmount: null, quotedCurrency: 'MAD', quoteNote: null,
        cancellationScale: null, quotedAt: null, acceptedAt: null, acceptedSnapshot: null,
        createdAt: new Date(), updatedAt: new Date(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        service = new QuoteRequestsService(db);
    });

    it('creates a request only on a PUBLISHED trip, with no price anywhere', async () => {
        db.tripTemplate.findUnique.mockResolvedValue({ id: 'trip-1', agencyId: 'agency-1', status: 'ACTIVE' });
        db.quoteRequest.create.mockImplementation(({ data }: any) => Promise.resolve({ ...pendingRow, ...data }));
        const result = await service.create('trav-1', {
            templateId: 'trip-1', startDate: '2026-12-18', endDate: '2026-12-20', guestsCount: 4,
        } as any);
        expect(result.status).toBe('PENDING');
        expect(result.quotedTotalAmount).toBeNull();
        const data = db.quoteRequest.create.mock.calls[0][0].data;
        expect(data).not.toHaveProperty('quotedTotalAmount');
        expect(data.agencyId).toBe('agency-1');
    });

    it('refuses a request on an unpublished trip', async () => {
        db.tripTemplate.findUnique.mockResolvedValue({ id: 'trip-1', agencyId: 'agency-1', status: 'DRAFT' });
        await expect(service.create('trav-1', {
            templateId: 'trip-1', startDate: '2026-12-18', endDate: '2026-12-20', guestsCount: 2,
        } as any)).rejects.toThrow(BadRequestException);
        expect(db.quoteRequest.create).not.toHaveBeenCalled();
    });

    it('agency quotes a firm MAD total and the trip scale by default', async () => {
        db.agencyProfile.findUnique.mockResolvedValue({ id: 'agency-1' });
        db.quoteRequest.findUnique.mockResolvedValue({ ...pendingRow });
        db.tripTemplate.findUnique.mockResolvedValue({
            cancellationPolicy: { version: 'cancellation-v1', bands: [{ minDaysBeforeStart: 7, refundPercent: 50 }, { minDaysBeforeStart: 0, refundPercent: 0 }] },
        });
        db.quoteRequest.update.mockImplementation(({ data }: any) => Promise.resolve({ ...pendingRow, ...data }));
        const result = await service.quote('agency-user-1', 'qr-1', { totalAmount: '2400.00' } as any);
        expect(result.status).toBe('QUOTED');
        expect(result.quotedTotalAmount).toBe('2400.00');
        expect(result.quotedCurrency).toBe('MAD');
        const data = db.quoteRequest.update.mock.calls[0][0].data;
        expect(data.cancellationScale.bands).toHaveLength(2);
        expect(data.quotedAt).toBeInstanceOf(Date);
    });

    it('a foreign agency cannot quote the request', async () => {
        db.agencyProfile.findUnique.mockResolvedValue({ id: 'agency-2' });
        db.quoteRequest.findUnique.mockResolvedValue({ ...pendingRow });
        await expect(service.quote('other-user', 'qr-1', { totalAmount: '100.00' } as any))
            .rejects.toThrow(ForbiddenException);
        expect(db.quoteRequest.update).not.toHaveBeenCalled();
    });

    it('acceptance snapshots quote + scale + timestamp, and the snapshot is final', async () => {
        const quotedRow = {
            ...pendingRow, status: 'QUOTED', quotedTotalAmount: '2400.00',
            quotedAt: new Date('2026-12-01T10:00:00.000Z'),
            cancellationScale: { version: 'cancellation-v1', bands: [{ minDaysBeforeStart: 0, refundPercent: 0 }], floorRefundPercent: 100, refundInitiationDays: 7 },
        };
        db.quoteRequest.findUnique.mockResolvedValue(quotedRow);
        db.quoteRequest.update.mockImplementation(({ data }: any) => Promise.resolve({ ...quotedRow, ...data }));
        const result = await service.accept('trav-1', 'qr-1');
        expect(result.status).toBe('ACCEPTED');
        const data = db.quoteRequest.update.mock.calls[0][0].data;
        expect(data.acceptedSnapshot.quotedTotalAmount).toBe('2400.00');
        expect(data.acceptedSnapshot.quotedCurrency).toBe('MAD');
        expect(data.acceptedSnapshot.cancellationScale.bands).toHaveLength(1);
        expect(typeof data.acceptedSnapshot.acceptedAt).toBe('string');

        // Immutability: quoting or accepting an ACCEPTED request is refused.
        db.quoteRequest.findUnique.mockResolvedValue({ ...quotedRow, status: 'ACCEPTED', acceptedAt: new Date(), acceptedSnapshot: data.acceptedSnapshot });
        db.agencyProfile.findUnique.mockResolvedValue({ id: 'agency-1' });
        await expect(service.quote('agency-user-1', 'qr-1', { totalAmount: '1.00' } as any))
            .rejects.toThrow(/already accepted/i);
        await expect(service.accept('trav-1', 'qr-1')).rejects.toThrow(/already accepted/i);
    });

    it('a traveller cannot accept before the agency quotes', async () => {
        db.quoteRequest.findUnique.mockResolvedValue({ ...pendingRow });
        await expect(service.accept('trav-1', 'qr-1')).rejects.toThrow(/has not sent a firm quote/i);
    });
});
