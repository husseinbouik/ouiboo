import { BookingPaymentStatus, BookingStatus, PaymentMethod, SessionStatus, VerificationStatus } from '@ouiboo/types';
import { mapBookingDetails } from './booking-response.util';

describe('mapBookingDetails', () => {
  it('returns the canonical booking shape with nested traveler, payment proof, and session template data', () => {
    const mapped = mapBookingDetails({
      id: 'booking-1',
      sessionId: 'session-1',
      travelerId: 'traveler-1',
      bookingDate: new Date('2026-01-01T00:00:00.000Z'),
      status: BookingStatus.AwaitingValidation,
      totalAmount: 1200,
      guestsCount: 2,
      paymentMethod: PaymentMethod.Manual,
      paymentStatus: BookingPaymentStatus.Unpaid,
      paymentProofId: 'proof-1',
      paymentProofUrl: '/proofs/1',
      confirmedAt: null,
      cancelledAt: null,
      fullName: 'John Doe',
      phoneNumber: '+212600000000',
      documentNumber: 'AB123456',
      paymentProof: {
        id: 'proof-1',
        bookingId: 'booking-1',
        imageUrl: 'private/proof.png',
        uploadedAt: new Date('2026-01-02T00:00:00.000Z'),
        status: VerificationStatus.Pending,
        rejectionReason: null,
      },
      traveler: {
        email: 'traveler@example.com',
        name: 'John Doe',
      },
      session: {
        id: 'session-1',
        templateId: 'template-1',
        startDate: new Date('2026-02-01T00:00:00.000Z'),
        endDate: new Date('2026-02-05T00:00:00.000Z'),
        price: 600,
        deposit: 100,
        totalSeats: 12,
        availableSeats: 10,
        status: SessionStatus.Open,
        template: {
          id: 'template-1',
          title: 'Atlas Trek',
          startLocation: 'Marrakech',
          images: ['cover.jpg'],
          agency: {
            id: 'agency-1',
            companyName: 'Atlas Adventures',
          },
        },
      },
    });

    expect(mapped).toMatchObject({
      id: 'booking-1',
      status: BookingStatus.AwaitingValidation,
      paymentStatus: BookingPaymentStatus.Unpaid,
      paymentMethod: PaymentMethod.Manual,
      traveler: {
        email: 'traveler@example.com',
        name: 'John Doe',
      },
      paymentProof: {
        id: 'proof-1',
        status: VerificationStatus.Pending,
      },
      session: {
        id: 'session-1',
        template: {
          id: 'template-1',
          title: 'Atlas Trek',
          agency: {
            id: 'agency-1',
            companyName: 'Atlas Adventures',
          },
        },
      },
    });
    expect(mapped.bookingDate).toBe('2026-01-01T00:00:00.000Z');
    expect(mapped.session.startDate).toBe('2026-02-01T00:00:00.000Z');
  });
});
