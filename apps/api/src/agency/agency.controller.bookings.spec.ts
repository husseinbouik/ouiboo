import { AgencyController } from './agency.controller';

/**
 * #422 (Council P0-20) follow-up: the agency bookings list shapes rows
 * through mapBookingDetails, so it must load the plan and the stage
 * ExternalPayments (bank fields only) for the proof's bank-confirmation
 * state to be embedded.
 */
describe('AgencyController.getBookings (#422 bank confirmation)', () => {
    const req: any = { tenantId: 'agency-1' };

    function makeBooking(): any {
        return {
            id: 'booking-1',
            sessionId: 'session-1',
            travelerId: 'traveler-1',
            bookingDate: new Date('2026-10-20T00:00:00.000Z'),
            status: 'CONFIRMED',
            totalAmount: 1500,
            currency: 'MAD',
            guestsCount: 2,
            paymentMethod: 'MANUAL',
            paymentStatus: 'PAID',
            confirmedAt: new Date('2026-10-24T12:00:00.000Z'),
            cancelledAt: null,
            traveler: { email: 'layla@example.com', name: 'Layla Bennani' },
            session: {
                id: 'session-1',
                templateId: 'template-1',
                startDate: new Date('2026-11-01T00:00:00.000Z'),
                endDate: new Date('2026-11-01T00:00:00.000Z'),
                price: 1500,
                deposit: 1500,
                totalSeats: 10,
                availableSeats: 8,
                status: 'OPEN',
                currency: 'MAD',
                template: {
                    id: 'template-1',
                    title: 'Chefchaouen Day Trip',
                    startLocation: 'Tangier',
                    images: [],
                    agencyId: 'agency-1',
                    agency: { id: 'agency-1', companyName: 'Atlas Adventures' },
                },
            },
            paymentProof: {
                id: 'proof-1',
                bookingId: 'booking-1',
                imageUrl: 'private/payment-proofs/proof.png',
                uploadedAt: new Date('2026-10-24T10:00:00.000Z'),
                status: 'VERIFIED',
                rejectionReason: null,
            },
            paymentPlan: null,
            externalPayments: [{
                stage: 'FULL',
                confirmedAmount: '1500',
                bankReference: 'REF-42',
                bankConfirmedAt: new Date('2026-10-24T12:00:00.000Z'),
                bankConfirmedBy: 'agency-user-1',
                updatedAt: new Date('2026-10-24T12:00:00.000Z'),
            }],
        };
    }

    it('loads plan + stage payments and embeds the bank confirmation', async () => {
        const db: any = {
            booking: {
                findMany: jest.fn(async () => [makeBooking()]),
                count: jest.fn(async () => 1),
            },
        };
        const controller = new AgencyController(db, {} as any);

        const result: any = await controller.getBookings(req);

        const args = db.booking.findMany.mock.calls[0][0];
        expect(args.include.paymentPlan).toBe(true);
        expect(args.include.externalPayments.select).toEqual(
            expect.objectContaining({ confirmedAmount: true, bankReference: true, bankConfirmedAt: true, bankConfirmedBy: true }),
        );
        expect(result.data[0].paymentProof.bankConfirmation).toEqual({
            confirmedAmount: '1500.00',
            bankReference: 'REF-42',
            bankConfirmedAt: '2026-10-24T12:00:00.000Z',
            bankConfirmedBy: 'agency-user-1',
        });
    });
});
