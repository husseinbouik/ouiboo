/**
 * @jest-environment jsdom
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { VerificationStatus, type BookingDetails } from '@ouiboo/types';
import { PaymentProofReviewModal } from './PaymentProofReviewModal';
import { apiClient } from '@/lib/api-client';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      let out = key;
      if (opts) {
        for (const v of Object.values(opts)) out += ` ${String(v)}`;
      }
      return out;
    },
    i18n: { language: 'en' },
  }),
}));

jest.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({
      children,
      initial: _initial,
      animate: _animate,
      exit: _exit,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

jest.mock('@/lib/api-client', () => ({
  apiClient: { get: jest.fn() },
}));

const getMock = apiClient.get as jest.Mock;

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({
    unoptimized: _unoptimized,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & { unoptimized?: boolean }) => (
    <img {...props} alt={props.alt} />
  ),
}));

const bookingWithProof = (status: VerificationStatus): BookingDetails =>
  ({
    id: 'booking-1',
    status: 'AWAITING_VALIDATION',
    paymentStatus: 'UNPAID',
    totalAmount: '1000',
    currency: 'MAD',
    fullName: 'Launch Traveler',
    paymentPlan: null,
    session: { id: 'session-1', template: { id: 'trip-1', title: 'Atlas Weekend Escape' } },
    traveler: { id: 'traveler-1', name: 'Launch Traveler' },
    paymentProof: {
      id: 'proof-1',
      bookingId: 'booking-1',
      imageUrl: 'proof.png',
      status,
    },
  }) as unknown as BookingDetails;

const ACCEPT_KEY = 'paymentProof.acceptProof';
const CONFIRM_KEY = 'paymentProof.confirmBankReceipt';

describe('PaymentProofReviewModal (#422 two-step flow)', () => {
  beforeAll(() => {
    Object.assign(URL, {
      createObjectURL: jest.fn(() => 'blob:proof-url'),
      revokeObjectURL: jest.fn(),
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    getMock.mockResolvedValue({
      data: new Blob(['proof-bytes'], { type: 'image/png' }),
      headers: { 'content-type': 'image/png' },
    });
  });

  it('step 1 (PENDING): shows accept/reject and no bank-confirmation panel', () => {
    const onApprove = jest.fn();
    render(
      <PaymentProofReviewModal
        isOpen
        onClose={jest.fn()}
        booking={bookingWithProof(VerificationStatus.Pending)}
        onApprove={onApprove}
        onReject={jest.fn()}
        onConfirmBankPayment={jest.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: ACCEPT_KEY }));
    expect(onApprove).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: CONFIRM_KEY })).toBeNull();
    expect(screen.queryByText('paymentProof.proofAccepted')).toBeNull();
  });

  it('step 2 (ACCEPTED): shows the accepted banner and the bank panel, confirm guarded by the bank reference', () => {
    const onConfirmBankPayment = jest.fn();
    render(
      <PaymentProofReviewModal
        isOpen
        onClose={jest.fn()}
        booking={bookingWithProof(VerificationStatus.Accepted)}
        onApprove={jest.fn()}
        onReject={jest.fn()}
        onConfirmBankPayment={onConfirmBankPayment}
      />,
    );
    // Accepted is not settled: banner + panel, no accept action anymore.
    expect(screen.getByText('paymentProof.proofAccepted')).not.toBeNull();
    expect(screen.queryByRole('button', { name: ACCEPT_KEY })).toBeNull();

    const confirm = screen.getByRole('button', { name: CONFIRM_KEY }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('paymentProof.bankReference'), {
      target: { value: 'TRX-9' },
    });
    expect(confirm.disabled).toBe(false);
    fireEvent.click(confirm);
    expect(onConfirmBankPayment).toHaveBeenCalledWith({
      confirmedAmount: 1000,
      bankReference: 'TRX-9',
    });
  });

  it('final (VERIFIED): bank-confirmed banner and close-only footer', () => {
    render(
      <PaymentProofReviewModal
        isOpen
        onClose={jest.fn()}
        booking={bookingWithProof(VerificationStatus.Verified)}
        onApprove={jest.fn()}
        onReject={jest.fn()}
        onConfirmBankPayment={jest.fn()}
      />,
    );
    expect(screen.getByText('paymentProof.paymentVerified')).not.toBeNull();
    expect(screen.queryByRole('button', { name: ACCEPT_KEY })).toBeNull();
    expect(screen.queryByRole('button', { name: CONFIRM_KEY })).toBeNull();
    expect(screen.queryByRole('button', { name: 'paymentProof.rejectPayment' })).toBeNull();
  });

  it('readOnly forces a view-only modal even for a pending proof', () => {
    render(
      <PaymentProofReviewModal
        isOpen
        readOnly
        onClose={jest.fn()}
        booking={bookingWithProof(VerificationStatus.Pending)}
        onApprove={jest.fn()}
        onReject={jest.fn()}
        onConfirmBankPayment={jest.fn()}
      />,
    );
    expect(screen.queryByRole('button', { name: ACCEPT_KEY })).toBeNull();
    expect(screen.queryByRole('button', { name: 'paymentProof.rejectPayment' })).toBeNull();
  });

  it('loads the proof through the authenticated download endpoint and renders the blob URL', async () => {
    render(
      <PaymentProofReviewModal
        isOpen
        onClose={jest.fn()}
        booking={bookingWithProof(VerificationStatus.Pending)}
        onApprove={jest.fn()}
        onReject={jest.fn()}
      />,
    );
    await waitFor(() =>
      expect(getMock).toHaveBeenCalledWith('/bookings/booking-1/payment-proof/download', {
        responseType: 'blob',
      }),
    );
    const img = await screen.findByAltText('paymentProof.proofAlt');
    expect(img.getAttribute('src')).toBe('blob:proof-url');
  });

  it('shows the load-failed state when the authenticated fetch actually fails', async () => {
    getMock.mockRejectedValue(new Error('401'));
    render(
      <PaymentProofReviewModal
        isOpen
        onClose={jest.fn()}
        booking={bookingWithProof(VerificationStatus.Pending)}
        onApprove={jest.fn()}
        onReject={jest.fn()}
      />,
    );
    expect(await screen.findByText('paymentProof.loadFailed')).not.toBeNull();
  });

  it('renders a PDF proof in an iframe from the blob URL', async () => {
    getMock.mockResolvedValue({
      data: new Blob(['%PDF-1.4'], { type: 'application/pdf' }),
      headers: { 'content-type': 'application/pdf' },
    });
    const { container } = render(
      <PaymentProofReviewModal
        isOpen
        onClose={jest.fn()}
        booking={bookingWithProof(VerificationStatus.Pending)}
        onApprove={jest.fn()}
        onReject={jest.fn()}
      />,
    );
    await waitFor(() => expect(container.querySelector('iframe')).not.toBeNull());
    expect(container.querySelector('iframe')?.getAttribute('src')).toBe('blob:proof-url');
  });

  it('falls back to the blob type when the response has no content-type header', async () => {
    getMock.mockResolvedValue({
      data: new Blob(['proof-bytes'], { type: 'image/png' }),
      headers: {},
    });
    render(
      <PaymentProofReviewModal
        isOpen
        onClose={jest.fn()}
        booking={bookingWithProof(VerificationStatus.Pending)}
        onApprove={jest.fn()}
        onReject={jest.fn()}
      />,
    );
    const img = await screen.findByAltText('paymentProof.proofAlt');
    expect(img.getAttribute('src')).toBe('blob:proof-url');
  });

  it('shows the no-proof state without calling the endpoint when the booking has no proof', async () => {
    const bookingNoProof = {
      ...bookingWithProof(VerificationStatus.Pending),
      paymentProof: null,
    } as unknown as BookingDetails;
    render(
      <PaymentProofReviewModal
        isOpen
        onClose={jest.fn()}
        booking={bookingNoProof}
        onApprove={jest.fn()}
        onReject={jest.fn()}
      />,
    );
    expect(await screen.findByText('paymentProof.noProof')).not.toBeNull();
    expect(getMock).not.toHaveBeenCalled();
  });

  it('surfaces an action error inside the modal', () => {
    render(
      <PaymentProofReviewModal
        isOpen
        onClose={jest.fn()}
        booking={bookingWithProof(VerificationStatus.Pending)}
        onApprove={jest.fn()}
        onReject={jest.fn()}
        actionError="Server said no"
      />,
    );
    expect(screen.getByRole('alert').textContent).toBe('Server said no');
  });
});
