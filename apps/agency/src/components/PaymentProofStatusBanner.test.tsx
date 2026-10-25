/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { VerificationStatus, type BookingDetails } from '@ouiboo/types';
import { PaymentProofStatusBanner } from './PaymentProofStatusBanner';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const bookingWithProof = (status: VerificationStatus): BookingDetails =>
  ({
    id: 'booking-1',
    paymentProof: { id: 'proof-1', bookingId: 'booking-1', imageUrl: 'proof.png', status },
  }) as unknown as BookingDetails;

const VERIFIED_KEY = 'paymentProof.paymentVerified';
const ACCEPTED_KEY = 'paymentProof.proofAccepted';

describe('PaymentProofStatusBanner (#422 honest states)', () => {
  it('shows an ACCEPTED proof as awaiting bank confirmation — never as verified/paid', () => {
    render(<PaymentProofStatusBanner booking={bookingWithProof(VerificationStatus.Accepted)} />);
    expect(screen.getByText(ACCEPTED_KEY)).not.toBeNull();
    expect(screen.getByText('paymentProof.acceptedBody')).not.toBeNull();
    expect(screen.queryByText(VERIFIED_KEY)).toBeNull();
    expect(screen.queryByText('paymentProof.verifiedBody')).toBeNull();
  });

  it('shows VERIFIED as bank-confirmed (the only settled state)', () => {
    render(<PaymentProofStatusBanner booking={bookingWithProof(VerificationStatus.Verified)} />);
    expect(screen.getByText(VERIFIED_KEY)).not.toBeNull();
    expect(screen.getByText('paymentProof.verifiedBody')).not.toBeNull();
    expect(screen.queryByText(ACCEPTED_KEY)).toBeNull();
  });

  it('shows REJECTED with its own state', () => {
    render(<PaymentProofStatusBanner booking={bookingWithProof(VerificationStatus.Rejected)} />);
    expect(screen.getByText('paymentProof.paymentRejected')).not.toBeNull();
    expect(screen.queryByText(VERIFIED_KEY)).toBeNull();
    expect(screen.queryByText(ACCEPTED_KEY)).toBeNull();
  });
});
