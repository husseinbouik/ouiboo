/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ProofReviewFeedback } from './ProofReviewFeedback';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('ProofReviewFeedback (Phase 4 — M5 agency side)', () => {
  it('renders nothing without a decision', () => {
    const { container } = render(<ProofReviewFeedback decision={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('states that accepting a proof is not settlement', () => {
    render(<ProofReviewFeedback decision="accepted" />);
    expect(screen.getByTestId('proof-review-feedback').getAttribute('data-decision')).toBe('accepted');
    expect(screen.getByText('paymentProof.feedbackAccepted')).toBeTruthy();
  });

  it('confirms settlement only on bank confirmation', () => {
    render(<ProofReviewFeedback decision="confirmed" />);
    expect(screen.getByText('paymentProof.feedbackConfirmed')).toBeTruthy();
  });
});
