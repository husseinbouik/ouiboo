import { AdminController } from './admin.controller';

/**
 * #422 (Council P0-20) follow-up: the admin payment responses must carry
 * the bank-confirmation data the Payment Proofs tab renders read-only
 * (PR #463 contract: `AdminPaymentProof.bankConfirmation`). Pending
 * payments now include ACCEPTED proofs — acceptance is not settlement,
 * so an accepted proof stays visible as awaiting the agency's bank
 * confirmation instead of disappearing from the tab.
 */
describe('AdminController payment responses (#422 bank confirmation)', () => {
    const confirmedAt = new Date('2026-10-24T12:00:00.000Z');

    function makeBooking(overrides: Record<string, any> = {}): any {
        return {
            id: 'booking-1',
            sessionId: 'session-1',
            travelerId: 'traveler-1',
            bookingDate: new Date('2026-10-20T00:00:00.000Z'),
            status: 'AWAITING_VALIDATION',
            totalAmount: 1500,
            currency: 'MAD',
            guestsCount: 2,
            paymentMethod: 'MANUAL',
            paymentStatus: 'UNPAID',
            confirmedAt: null,
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
            paymentProof: null,
            paymentPlan: null,
            externalPayments: [],
            ...overrides,
        };
    }

    function makeProof(status: string, bookingOverrides: Record<string, any> = {}): any {
        const booking = makeBooking(bookingOverrides);
        booking.paymentProof = {
            id: 'proof-1',
            bookingId: booking.id,
            imageUrl: 'private/payment-proofs/proof.png',
            uploadedAt: new Date('2026-10-24T10:00:00.000Z'),
            status,
            rejectionReason: null,
        };
        return {
            id: 'proof-1',
            bookingId: booking.id,
            imageUrl: booking.paymentProof.imageUrl,
            uploadedAt: booking.paymentProof.uploadedAt,
            status,
            rejectionReason: null,
            booking,
        };
    }

    const unconfirmedFullPayment = {
        stage: 'FULL',
        confirmedAmount: null,
        bankReference: null,
        bankConfirmedAt: null,
        bankConfirmedBy: null,
        updatedAt: new Date('2026-10-24T10:00:00.000Z'),
    };

    const confirmedFullPayment = {
        stage: 'FULL',
        confirmedAmount: '1500',
        bankReference: 'REF-42',
        bankConfirmedAt: confirmedAt,
        bankConfirmedBy: 'agency-user-1',
        updatedAt: confirmedAt,
    };

    function makeController({ proofs = [], bookings = [] }: { proofs?: any[]; bookings?: any[] } = {}) {
        const db: any = {
            paymentProof: {
                findMany: jest.fn(async () => proofs),
                count: jest.fn(async () => proofs.length),
            },
            booking: {
                findMany: jest.fn(async () => bookings),
                count: jest.fn(async () => bookings.length),
            },
        };
        const controller = new AdminController(
            db as any, {} as any, {} as any, {} as any, { log: jest.fn() } as any, {} as any,
        );
        return { controller, db };
    }

    describe('getPendingPayments', () => {
        it('queries PENDING and ACCEPTED proofs together, with the stage payments loaded', async () => {
            const { controller, db } = makeController({ proofs: [] });

            await controller.getPendingPayments();

            const args = db.paymentProof.findMany.mock.calls[0][0];
            expect(args.where.status).toEqual({ in: ['PENDING', 'ACCEPTED'] });
            expect(args.include.booking.include.externalPayments.select).toEqual(
                expect.objectContaining({ bankReference: true, bankConfirmedAt: true, bankConfirmedBy: true }),
            );
            expect(args.include.booking.include.paymentPlan).toBe(true);
            expect(args.include.booking.include.paymentProof).toBe(true);
        });

        it('returns PENDING and ACCEPTED rows with bankConfirmation null before agency confirmation', async () => {
            const pending = makeProof('PENDING', { externalPayments: [unconfirmedFullPayment] });
            const accepted = makeProof('ACCEPTED', { externalPayments: [unconfirmedFullPayment] });
            accepted.id = 'proof-2';
            const { controller } = makeController({ proofs: [pending, accepted] });

            const result: any = await controller.getPendingPayments();

            expect(result.data).toHaveLength(2);
            expect(result.pagination.total).toBe(2);
            expect(result.data.map((row: any) => row.status)).toEqual(['PENDING', 'ACCEPTED']);
            // Awaiting bank confirmation must not read as confirmed:
            // no bank facts exist on either row yet.
            expect(result.data[0].bankConfirmation).toBeNull();
            expect(result.data[1].bankConfirmation).toBeNull();
            expect(result.data[1].booking.paymentProof.bankConfirmation).toBeNull();
            expect(result.data[1].booking.paymentProof.status).toBe('ACCEPTED');
        });

        it('carries the bank confirmation on the row once the stage payment is bank-confirmed', async () => {
            const accepted = makeProof('ACCEPTED', { externalPayments: [confirmedFullPayment] });
            const { controller } = makeController({ proofs: [accepted] });

            const result: any = await controller.getPendingPayments();

            const expected = {
                confirmedAmount: '1500.00',
                bankReference: 'REF-42',
                bankConfirmedAt: '2026-10-24T12:00:00.000Z',
                bankConfirmedBy: 'agency-user-1',
            };
            expect(result.data[0].bankConfirmation).toEqual(expected);
            // The embedded booking details carry the same facts.
            expect(result.data[0].booking.paymentProof.bankConfirmation).toEqual(expected);
        });
    });

    describe('getBookings', () => {
        it('loads plan + stage payments and embeds the proof bank confirmation', async () => {
            const booking = makeBooking({ externalPayments: [confirmedFullPayment] });
            booking.status = 'CONFIRMED';
            booking.paymentStatus = 'PAID';
            booking.paymentProof = {
                id: 'proof-1',
                bookingId: booking.id,
                imageUrl: 'private/payment-proofs/proof.png',
                uploadedAt: new Date('2026-10-24T10:00:00.000Z'),
                status: 'VERIFIED',
                rejectionReason: null,
            };
            const { controller, db } = makeController({ bookings: [booking] });

            const result: any = await controller.getBookings();

            const args = db.booking.findMany.mock.calls[0][0];
            expect(args.include.paymentPlan).toBe(true);
            expect(args.include.externalPayments.select).toEqual(
                expect.objectContaining({ confirmedAmount: true, bankReference: true }),
            );
            expect(result.data[0].paymentProof.bankConfirmation).toEqual({
                confirmedAmount: '1500.00',
                bankReference: 'REF-42',
                bankConfirmedAt: '2026-10-24T12:00:00.000Z',
                bankConfirmedBy: 'agency-user-1',
            });
        });

        it('embeds bankConfirmation null for bookings without a bank confirmation', async () => {
            const booking = makeBooking({ externalPayments: [unconfirmedFullPayment] });
            booking.paymentProof = {
                id: 'proof-1',
                bookingId: booking.id,
                imageUrl: 'private/payment-proofs/proof.png',
                uploadedAt: new Date('2026-10-24T10:00:00.000Z'),
                status: 'PENDING',
                rejectionReason: null,
            };
            const { controller } = makeController({ bookings: [booking] });

            const result: any = await controller.getBookings();

            expect(result.data[0].paymentProof.bankConfirmation).toBeNull();
        });
    });
});
