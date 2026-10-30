import { BookingPaymentStatus, BookingStatus, PaymentMethod, SessionStatus, VerificationStatus } from '@ouiboo/types';
import { mapBookingDetails, normalizeBookingMeetingPoint, resolveBankConfirmation } from './booking-response.util';

describe('normalizeBookingMeetingPoint (#676)', () => {
  it('passes the full structure through for the booking view (exact address + maps link)', () => {
    expect(normalizeBookingMeetingPoint({
      address: '  Place du 9 Avril, Tanger ',
      mapsUrl: ' https://maps.example/x ',
      pickupAvailable: true,
    })).toEqual({ address: 'Place du 9 Avril, Tanger', mapsUrl: 'https://maps.example/x', pickupAvailable: true });
  });

  it('degrades malformed or empty values to null', () => {
    expect(normalizeBookingMeetingPoint(null)).toBeNull();
    expect(normalizeBookingMeetingPoint('a string')).toBeNull();
    expect(normalizeBookingMeetingPoint({ pickupAvailable: false })).toBeNull();
    expect(normalizeBookingMeetingPoint({ address: '  ' })).toBeNull();
  });
});

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
          meetingPoint: { address: 'Gare routière, Marrakech', mapsUrl: 'https://maps.example/gare', pickupAvailable: false },
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
          // #676: booking responses carry the FULL meeting point.
          meetingPoint: { address: 'Gare routière, Marrakech', mapsUrl: 'https://maps.example/gare', pickupAvailable: false },
          agency: {
            id: 'agency-1',
            companyName: 'Atlas Adventures',
          },
        },
      },
    });
    expect(mapped.bookingDate).toBe('2026-01-01T00:00:00.000Z');
    expect(mapped.session.startDate).toBe('2026-02-01T00:00:00.000Z');
    // CIN removal (founder decision 2026-10-25): booking responses never
    // carry a traveller identity-document number.
    expect(mapped).not.toHaveProperty('documentNumber');
  });

  describe('terms acceptance (#481)', () => {
    const baseInput = {
      id: 'booking-1',
      sessionId: 'session-1',
      travelerId: 'traveler-1',
      bookingDate: new Date('2026-01-01T00:00:00.000Z'),
      status: BookingStatus.AwaitingValidation,
      totalAmount: 1200,
      guestsCount: 2,
      paymentMethod: PaymentMethod.Manual,
      paymentStatus: BookingPaymentStatus.Unpaid,
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
    };

    it('surfaces the recorded terms version and acceptance time', () => {
      const mapped = mapBookingDetails({
        ...baseInput,
        termsVersion: '1.0',
        termsAcceptedAt: new Date('2026-01-01T00:05:00.000Z'),
      });

      expect(mapped.termsVersion).toBe('1.0');
      expect(mapped.termsAcceptedAt).toBe('2026-01-01T00:05:00.000Z');
    });

    it('surfaces the checkout locale recorded with the acceptance (B9)', () => {
      const mapped = mapBookingDetails({
        ...baseInput,
        termsVersion: '1.0',
        termsAcceptedAt: new Date('2026-01-01T00:05:00.000Z'),
        locale: 'fr',
      });

      expect(mapped.locale).toBe('fr');
    });

    it('maps an unrecorded acceptance to explicit nulls', () => {
      const mapped = mapBookingDetails(baseInput);

      expect(mapped.termsVersion).toBeNull();
      expect(mapped.termsAcceptedAt).toBeNull();
      expect(mapped.locale).toBeNull();
    });
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

    it('falls back to the latest confirmation when the current stage has none yet', () => {
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
      const depositPayment = {
        stage: 'DEPOSIT',
        confirmedAmount: '300',
        bankReference: 'DEP-REF-1',
        bankConfirmedAt: new Date('2026-01-03T12:00:00.000Z'),
        bankConfirmedBy: 'agency-user-1',
        updatedAt: new Date('2026-01-03T12:00:00.000Z'),
      };
      const balanceUnconfirmed = {
        stage: 'BALANCE',
        confirmedAmount: null,
        bankReference: null,
        bankConfirmedAt: null,
        bankConfirmedBy: null,
        updatedAt: new Date('2026-01-26T09:00:00.000Z'),
      };

      // Balance stage is due and its proof is under review; the only
      // bank confirmation on record is still the deposit's.
      const balanceDue = baseBooking({
        paymentPlan: plan('BALANCE_DUE'),
        externalPayments: [depositPayment, balanceUnconfirmed],
      }) as never;
      expect(resolveBankConfirmation(balanceDue)?.bankReference).toBe('DEP-REF-1');

      // Terminal plan states with no mapped stage also fall back to the
      // latest confirmation across stages.
      const balancePayment = {
        stage: 'BALANCE',
        confirmedAmount: '900',
        bankReference: 'BAL-REF-9',
        bankConfirmedAt: new Date('2026-01-25T12:00:00.000Z'),
        bankConfirmedBy: 'agency-user-1',
        updatedAt: new Date('2026-01-25T12:00:00.000Z'),
      };
      const cancelled = baseBooking({
        paymentPlan: plan('CANCELLED'),
        externalPayments: [depositPayment, balancePayment],
      }) as never;
      expect(resolveBankConfirmation(cancelled)?.bankReference).toBe('BAL-REF-9');
    });
  });
});

describe('mapBookingDetails agency emergency contact (#419)', () => {
  const baseBooking = (agency: Record<string, unknown>) => ({
    id: 'booking-1',
    sessionId: 'session-1',
    travelerId: 'traveler-1',
    bookingDate: new Date('2026-01-01T00:00:00.000Z'),
    status: BookingStatus.Confirmed,
    totalAmount: 1200,
    guestsCount: 2,
    paymentMethod: PaymentMethod.Manual,
    paymentStatus: BookingPaymentStatus.Paid,
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
        agency,
      },
    },
  }) as any;

  it('exposes the emergency contact when the agency has published one', () => {
    const mapped = mapBookingDetails(baseBooking({
      id: 'agency-1',
      companyName: 'Atlas Adventures',
      emergencyContactName: 'Yasmine',
      emergencyContactPhone: '+212 6 12 34 56 78',
    }));

    expect(mapped.session.template.agency).toMatchObject({
      emergencyContactName: 'Yasmine',
      emergencyContactPhone: '+212 6 12 34 56 78',
    });
  });

  it('omits the emergency contact keys entirely when the agency has none', () => {
    const mapped = mapBookingDetails(baseBooking({
      id: 'agency-1',
      companyName: 'Atlas Adventures',
      emergencyContactName: null,
      emergencyContactPhone: null,
    }));

    expect(mapped.session.template.agency).not.toHaveProperty('emergencyContactPhone');
    expect(mapped.session.template.agency).not.toHaveProperty('emergencyContactName');
  });
});

describe('mapBookingDetails attendance (#434)', () => {
  const baseBooking = (overrides: Record<string, unknown> = {}) => ({
    id: 'booking-1',
    sessionId: 'session-1',
    travelerId: 'traveler-1',
    bookingDate: new Date('2026-01-01T00:00:00.000Z'),
    status: BookingStatus.Completed,
    totalAmount: 1200,
    guestsCount: 2,
    paymentMethod: PaymentMethod.Manual,
    paymentStatus: BookingPaymentStatus.Paid,
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
  }) as any;

  it('surfaces the recorded attendance and its stamps', () => {
    const mapped = mapBookingDetails(baseBooking({
      attendance: 'ATTENDED',
      attendanceRecordedAt: new Date('2026-02-05T09:30:00.000Z'),
      attendanceRecordedBy: 'agency-user-1',
    }));
    expect(mapped.attendance).toBe('ATTENDED');
    expect(mapped.attendanceRecordedAt).toBe('2026-02-05T09:30:00.000Z');
    expect(mapped.attendanceRecordedBy).toBe('agency-user-1');
  });

  it('maps unrecorded attendance to explicit nulls', () => {
    const mapped = mapBookingDetails(baseBooking());
    expect(mapped.attendance).toBeNull();
    expect(mapped.attendanceRecordedAt).toBeNull();
    expect(mapped.attendanceRecordedBy).toBeNull();
  });
});
