import { BookingPaymentStatus, BookingStatus, PaymentMethod, SessionStatus, VerificationStatus } from '@ouiboo/types';
import { mapBookingDetails, resolveBankConfirmation } from './booking-response.util';

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

  describe('bank confirmation (#422 — proof ≠ settlement)', () => {
    const baseBooking = (overrides: Record<string, unknown> = {}) => ({
      id: 'booking-1',
      sessionId: 'session-1',
      travelerId: 'traveler-1',
      bookingDate: new Date('2026-01-01T00:00:00.000Z'),
      status: BookingStatus.AwaitingValidation,
      totalAmount: 1200,
      guestsCount: 2,
      paymentMethod: PaymentMethod.Manual,
      paymentStatus: BookingPaymentStatus.Unpaid,
      confirmedAt: null,
      cancelledAt: null,
      paymentProof: {
        id: 'proof-1',
        bookingId: 'booking-1',
        imageUrl: 'private/proof.png',
        uploadedAt: new Date('2026-01-02T00:00:00.000Z'),
        status: VerificationStatus.Accepted,
        rejectionReason: null,
      },
      traveler: { email: 'traveler@example.com', name: 'John Doe' },
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
          agency: { id: 'agency-1', companyName: 'Atlas Adventures' },
        },
      },
      ...overrides,
    }) as never;

    const confirmedFullPayment = {
      stage: 'FULL',
      confirmedAmount: '1200',
      bankReference: 'REF-42',
      bankConfirmedAt: new Date('2026-01-03T12:00:00.000Z'),
      bankConfirmedBy: 'agency-user-1',
      updatedAt: new Date('2026-01-03T12:00:00.000Z'),
    };

    it('is null before any bank confirmation (proof upload or acceptance alone)', () => {
      // No ExternalPayment loaded at all.
      expect(mapBookingDetails(baseBooking()).paymentProof?.bankConfirmation).toBeNull();

      // Stage payment exists from upload, but carries no bank facts yet.
      const pending = baseBooking({
        externalPayments: [{
          stage: 'FULL',
          confirmedAmount: null,
          bankReference: null,
          bankConfirmedAt: null,
          bankConfirmedBy: null,
          updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        }],
      });
      expect(mapBookingDetails(pending).paymentProof?.bankConfirmation).toBeNull();
      expect(resolveBankConfirmation(pending as never)).toBeNull();
    });

    it('exposes the stage bank confirmation once the agency confirms the credit', () => {
      const mapped = mapBookingDetails(baseBooking({ externalPayments: [confirmedFullPayment] }));

      expect(mapped.paymentProof?.bankConfirmation).toEqual({
        confirmedAmount: '1200.00',
        bankReference: 'REF-42',
        bankConfirmedAt: '2026-01-03T12:00:00.000Z',
        bankConfirmedBy: 'agency-user-1',
      });
    });

    it('resolves the stage the plan is on for staged bookings', () => {
      const depositPayment = {
        ...confirmedFullPayment,
        stage: 'DEPOSIT',
        confirmedAmount: '300',
        bankReference: 'DEP-REF-1',
        bankConfirmedAt: new Date('2026-01-03T12:00:00.000Z'),
      };
      const balanceUnconfirmed = {
        stage: 'BALANCE',
        confirmedAmount: null,
        bankReference: null,
        bankConfirmedAt: null,
        bankConfirmedBy: null,
        updatedAt: new Date('2026-01-04T09:00:00.000Z'),
      };
      const plan = (status: string) => ({
        id: 'plan-1',
        status,
        totalAmount: 1200,
        depositAmount: 300,
        balanceAmount: 900,
        currency: 'MAD',
        minimumParticipants: 4,
        confirmationDeadline: new Date('2026-01-20T00:00:00.000Z'),
        paymentPolicyVersion: 'v1',
        refundPolicyVersion: 'v1',
      });

      // Deposit settled, balance proof pending: the deposit's
      // confirmation is the one that exists.
      const depositPaid = baseBooking({
        paymentPlan: plan('DEPOSIT_PAID'),
        externalPayments: [depositPayment, balanceUnconfirmed],
      });
      expect(mapBookingDetails(depositPaid).paymentProof?.bankConfirmation?.bankReference).toBe('DEP-REF-1');

      // Fully paid: the balance stage's confirmation wins.
      const balancePayment = {
        ...confirmedFullPayment,
        stage: 'BALANCE',
        confirmedAmount: '900',
        bankReference: 'BAL-REF-9',
        bankConfirmedAt: new Date('2026-01-25T12:00:00.000Z'),
      };
      const fullyPaid = baseBooking({
        paymentPlan: plan('FULLY_PAID'),
        externalPayments: [depositPayment, balancePayment],
      });
      expect(mapBookingDetails(fullyPaid).paymentProof?.bankConfirmation).toEqual({
        confirmedAmount: '900.00',
        bankReference: 'BAL-REF-9',
        bankConfirmedAt: '2026-01-25T12:00:00.000Z',
        bankConfirmedBy: 'agency-user-1',
      });
    });
  });
});
