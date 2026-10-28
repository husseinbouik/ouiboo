/**
 * @jest-environment jsdom
 */
import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { VerificationStatus, type BookingDetails } from '@ouiboo/types';
import { usePaymentProofReview } from './usePaymentProofReview';
import { apiClient } from '@/lib/api-client';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('@/lib/api-client', () => ({
  apiClient: { patch: jest.fn() },
}));

const patchMock = apiClient.patch as jest.Mock;

const booking = {
  id: 'booking-1',
  status: 'AWAITING_VALIDATION',
  paymentStatus: 'UNPAID',
  totalAmount: '1000',
  currency: 'MAD',
  paymentPlan: null,
  session: { id: 'session-1', template: { title: 'Trip' } },
  traveler: { id: 'traveler-1', name: 'Launch Traveler' },
  paymentProof: {
    id: 'proof-1',
    bookingId: 'booking-1',
    imageUrl: 'proof.png',
    status: VerificationStatus.Pending,
  },
} as unknown as BookingDetails;

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

describe('usePaymentProofReview (#422 two-step wiring)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('accepts the proof via verify-payment and lands on the ACCEPTED (unsettled) state', async () => {
    patchMock.mockResolvedValue({ data: { id: 'booking-1', status: 'AWAITING_VALIDATION', paymentStatus: 'UNPAID' } });
    const { result } = renderHook(() => usePaymentProofReview(), { wrapper });

    act(() => result.current.openReview(booking));
    act(() => result.current.approveProof());

    await waitFor(() =>
      expect(result.current.reviewingBooking?.paymentProof?.status).toBe(VerificationStatus.Accepted),
    );
    expect(patchMock).toHaveBeenCalledWith('/bookings/booking-1/verify-payment', { approved: true });
    // Accepting is not settlement: the review stays open and unpaid.
    expect(result.current.reviewingBooking).not.toBeNull();
    expect(result.current.reviewingBooking?.paymentStatus).toBe('UNPAID');
    expect(result.current.actionError).toBeNull();
  });

  it('rejects with a reason and closes the review', async () => {
    patchMock.mockResolvedValue({ data: { id: 'booking-1', status: 'REJECTED' } });
    const { result } = renderHook(() => usePaymentProofReview(), { wrapper });

    act(() => result.current.openReview(booking));
    act(() => result.current.rejectProof('Illegible screenshot, please re-upload'));

    await waitFor(() => expect(result.current.reviewingBooking).toBeNull());
    expect(patchMock).toHaveBeenCalledWith('/bookings/booking-1/verify-payment', {
      approved: false,
      rejectionReason: 'Illegible screenshot, please re-upload',
    });
  });

  it('confirms the bank payment and lands on the VERIFIED (settled) state', async () => {
    patchMock.mockResolvedValue({ data: { id: 'booking-1', status: 'CONFIRMED', paymentStatus: 'PAID' } });
    const { result } = renderHook(() => usePaymentProofReview(), { wrapper });

    act(() =>
      result.current.openReview({
        ...booking,
        paymentProof: { ...booking.paymentProof!, status: VerificationStatus.Accepted },
      }),
    );
    act(() =>
      result.current.confirmBankPayment({ confirmedAmount: 1000, bankReference: 'TRX-1' }),
    );

    await waitFor(() =>
      expect(result.current.reviewingBooking?.paymentProof?.status).toBe(VerificationStatus.Verified),
    );
    expect(patchMock).toHaveBeenCalledWith('/bookings/booking-1/confirm-bank-payment', {
      confirmedAmount: 1000,
      bankReference: 'TRX-1',
    });
    expect(result.current.reviewingBooking?.paymentStatus).toBe('PAID');
  });

  it('surfaces the API error message and keeps the review open on failure', async () => {
    patchMock.mockRejectedValue({
      response: { data: { message: 'Confirmed amount does not match the expected payment amount' } },
    });
    const { result } = renderHook(() => usePaymentProofReview(), { wrapper });

    act(() => result.current.openReview(booking));
    act(() =>
      result.current.confirmBankPayment({ confirmedAmount: 10, bankReference: 'TRX-1' }),
    );

    await waitFor(() =>
      expect(result.current.actionError).toBe(
        'Confirmed amount does not match the expected payment amount',
      ),
    );
    expect(result.current.reviewingBooking).not.toBeNull();
  });

  it('falls back to the generic error key when the API gives no message', async () => {
    patchMock.mockRejectedValue(new Error('network down'));
    const { result } = renderHook(() => usePaymentProofReview(), { wrapper });

    act(() => result.current.openReview(booking));
    act(() => result.current.approveProof());

    await waitFor(() => expect(result.current.actionError).toBe('paymentProof.actionFailed'));
  });
});
