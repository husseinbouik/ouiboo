/**
 * @jest-environment jsdom
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { VerificationStatus } from '@ouiboo/types';
import PaymentProofsTab from './PaymentProofsTab';
import type { AdminPaymentProof } from './types';

const t = (key: string, opts?: Record<string, unknown>) =>
  typeof opts?.defaultValue === 'string' ? (opts.defaultValue as string) : key;

const paginationLabels = {
  showing: 'Showing',
  of: 'of',
  pagination: 'Pagination',
  previousPage: 'Previous page',
  nextPage: 'Next page',
  goToPage: (page: number) => `Go to page ${page}`,
};

const makeProof = (status: VerificationStatus, extra: Partial<AdminPaymentProof> = {}): AdminPaymentProof => ({
  id: `proof-${status.toLowerCase()}`,
  bookingId: `booking-${status.toLowerCase()}`,
  uploadedAt: '2026-10-24T10:00:00.000Z',
  booking: {
    id: `booking-${status.toLowerCase()}`,
    totalAmount: '1500',
    session: { currency: 'MAD', template: { title: 'Chefchaouen Day Trip' } },
    traveler: { name: 'Layla Bennani', email: 'layla@example.com' },
    paymentProof: { status },
  } as unknown as AdminPaymentProof['booking'],
  ...extra,
});

function renderTab(proofs: AdminPaymentProof[]) {
  const onVerifyPayment = jest.fn();
  const utils = render(
    <PaymentProofsTab
      t={t}
      proofs={proofs}
      pagination={null}
      onPageChange={jest.fn()}
      paginationLabels={paginationLabels}
      paymentProofFeedback={null}
      viewingProofId={null}
      isVerifying={false}
      onViewProof={jest.fn()}
      onVerifyPayment={onVerifyPayment}
    />,
  );
  return { ...utils, onVerifyPayment };
}

describe('PaymentProofsTab (#422 — proof ≠ settlement)', () => {
  it('labels the review action as accepting the proof, not approving a payment', () => {
    const { onVerifyPayment } = renderTab([makeProof(VerificationStatus.Pending)]);
    const accept = screen.getByRole('button', { name: 'dashboard.actions.acceptProof' });
    expect(accept).toHaveProperty('disabled', false);
    expect(screen.queryByRole('button', { name: 'dashboard.actions.approve' })).toBeNull();
    fireEvent.click(accept);
    // The wire decision value stays VERIFIED; the API maps it to ACCEPTED.
    expect(onVerifyPayment).toHaveBeenCalledWith('proof-pending', VerificationStatus.Verified);
  });

  it('shows an accepted proof as awaiting agency bank confirmation and locks review actions', () => {
    renderTab([makeProof(VerificationStatus.Accepted)]);
    expect(screen.getByText('dashboard.status.proofAwaitingBankConfirmation')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'dashboard.actions.acceptProof' })).toHaveProperty('disabled', true);
    expect(screen.getByRole('button', { name: 'dashboard.actions.reject' })).toHaveProperty('disabled', true);
  });

  it('displays bank-confirmation details read-only when present', () => {
    renderTab([
      makeProof(VerificationStatus.Verified, {
        bankConfirmation: {
          confirmedAmount: '1500',
          bankReference: 'REF-42',
          bankConfirmedAt: '2026-10-24T12:00:00.000Z',
          bankConfirmedBy: 'agency-user-1',
        },
      }),
    ]);
    expect(screen.getByText('dashboard.status.proofBankConfirmed')).not.toBeNull();
    expect(screen.getByText(/REF-42/)).not.toBeNull();
    expect(screen.getByText(/agency-user-1/)).not.toBeNull();
  });

  it('never offers an admin bank-confirmation action (agency-only, D3)', () => {
    renderTab([
      makeProof(VerificationStatus.Pending),
      makeProof(VerificationStatus.Accepted),
      makeProof(VerificationStatus.Verified),
    ]);
    expect(screen.queryByRole('button', { name: /bank/i })).toBeNull();
  });
});
