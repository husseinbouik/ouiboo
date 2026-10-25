import {
  BookingPaymentPlanStatus,
  VerificationStatus,
  type BookingDetails,
} from '@ouiboo/types';
import {
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
});
