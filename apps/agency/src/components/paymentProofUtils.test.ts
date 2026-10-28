import {
  BookingPaymentPlanStatus,
  VerificationStatus,
  type BookingDetails,
} from '@ouiboo/types';
import {
  applyProofDecision,
  getExpectedStageAmount,
  getProofReviewStage,
  isBankConfirmationReady,
} from './paymentProofUtils';

const bookingWith = (overrides: Record<string, unknown>): BookingDetails =>
  ({
    id: 'booking-1',
    totalAmount: '1000',
    currency: 'MAD',
    paymentPlan: null,
    ...overrides,
  }) as unknown as BookingDetails;

describe('paymentProofUtils (#422 two-step review)', () => {
  describe('getProofReviewStage', () => {
    it('maps PENDING to the image-review step', () => {
      expect(getProofReviewStage(VerificationStatus.Pending)).toBe('review');
    });

    it('maps ACCEPTED to the bank-confirmation step — not a final state', () => {
      expect(getProofReviewStage(VerificationStatus.Accepted)).toBe('bank-confirmation');
    });

    it('maps VERIFIED and REJECTED to final', () => {
      expect(getProofReviewStage(VerificationStatus.Verified)).toBe('final');
      expect(getProofReviewStage(VerificationStatus.Rejected)).toBe('final');
    });

    it('maps a missing proof to none', () => {
      expect(getProofReviewStage(undefined)).toBe('none');
      expect(getProofReviewStage(null)).toBe('none');
    });
  });

  describe('getExpectedStageAmount', () => {
    it('uses the booking total for single-payment bookings', () => {
      expect(getExpectedStageAmount(bookingWith({}))).toBe(1000);
    });

    it('uses the deposit amount while the deposit is due', () => {
      const booking = bookingWith({
        paymentPlan: {
          status: BookingPaymentPlanStatus.DepositDue,
          depositAmount: '300',
          balanceAmount: '700',
        },
      });
      expect(getExpectedStageAmount(booking)).toBe(300);
    });

    it('uses the balance amount while the balance is due', () => {
      const booking = bookingWith({
        paymentPlan: {
          status: BookingPaymentPlanStatus.BalanceDue,
          depositAmount: '300',
          balanceAmount: '700',
        },
      });
      expect(getExpectedStageAmount(booking)).toBe(700);
    });
  });

  describe('isBankConfirmationReady', () => {
    it('blocks confirmation without a bank reference', () => {
      expect(isBankConfirmationReady('1000', '')).toBe(false);
      expect(isBankConfirmationReady('1000', '   ')).toBe(false);
    });

    it('blocks confirmation without a positive amount', () => {
      expect(isBankConfirmationReady('', 'REF-1')).toBe(false);
      expect(isBankConfirmationReady('0', 'REF-1')).toBe(false);
      expect(isBankConfirmationReady('-5', 'REF-1')).toBe(false);
      expect(isBankConfirmationReady('abc', 'REF-1')).toBe(false);
    });

    it('allows confirmation with a positive amount and a bank reference', () => {
      expect(isBankConfirmationReady('1000', 'REF-1')).toBe(true);
      expect(isBankConfirmationReady('999.50', '  REF-1  ')).toBe(true);
    });
  });

  describe('applyProofDecision', () => {
    const loaded = bookingWith({
      status: 'AWAITING_VALIDATION',
      paymentStatus: 'UNPAID',
      session: { id: 'session-1', template: { title: 'Trip' } },
      traveler: { id: 'traveler-1', name: 'Launch Traveler' },
      paymentProof: {
        id: 'proof-1',
        bookingId: 'booking-1',
        imageUrl: 'proof.png',
        status: VerificationStatus.Pending,
        rejectionReason: 'old reason',
      },
    });

    it('marks the proof ACCEPTED on accept, clears the rejection reason, and keeps relations', () => {
      const next = applyProofDecision(
        loaded,
        { status: 'AWAITING_VALIDATION' } as Partial<BookingDetails>,
        VerificationStatus.Accepted,
      );
      expect(next.paymentProof?.status).toBe(VerificationStatus.Accepted);
      expect(next.paymentProof?.rejectionReason).toBeUndefined();
      expect(next.session).toBe(loaded.session);
      expect(next.traveler).toBe(loaded.traveler);
      // Accepting must not settle: payment status stays whatever the API returned.
      expect(next.paymentStatus).toBe('UNPAID');
    });

    it('marks the proof VERIFIED and adopts the settled scalars on bank confirmation', () => {
      const next = applyProofDecision(
        loaded,
        {
          status: 'CONFIRMED',
          paymentStatus: 'PAID',
        } as unknown as Partial<BookingDetails>,
        VerificationStatus.Verified,
      );
      expect(next.paymentProof?.status).toBe(VerificationStatus.Verified);
      expect(next.status).toBe('CONFIRMED');
      expect(next.paymentStatus).toBe('PAID');
    });

    it('leaves a booking without a proof untouched apart from scalars', () => {
      const bare = bookingWith({});
      const next = applyProofDecision(bare, {}, VerificationStatus.Accepted);
      expect(next.paymentProof).toBeUndefined();
    });
  });
});
