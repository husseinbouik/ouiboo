/**
 * @jest-environment jsdom
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { PaymentProofViewer } from './PaymentProofViewer';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const baseProps = {
  imageLoading: false,
  imageError: false,
  onLoad: jest.fn(),
  onError: jest.fn(),
  onRetry: jest.fn(),
};

describe('PaymentProofViewer (blob object URL rendering)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the no-proof state when there is no proof and nothing is loading', () => {
    render(<PaymentProofViewer {...baseProps} proofUrl={null} fileType="unknown" />);
    expect(screen.getByText('paymentProof.noProof')).not.toBeNull();
  });

  it('shows a spinner instead of the no-proof state while the proof is being fetched', () => {
    render(<PaymentProofViewer {...baseProps} proofUrl={null} fileType="unknown" imageLoading />);
    expect(screen.queryByText('paymentProof.noProof')).toBeNull();
  });

  it('shows the error state and wires the retry button', () => {
    const onRetry = jest.fn();
    render(
      <PaymentProofViewer
        {...baseProps}
        proofUrl="blob:proof"
        fileType="image"
        imageError
        onRetry={onRetry}
      />,
    );
    expect(screen.getByText('paymentProof.loadFailed')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'paymentProof.retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders a PDF proof in an iframe from the object URL', () => {
    const onLoad = jest.fn();
    const { container } = render(
      <PaymentProofViewer {...baseProps} proofUrl="blob:proof" fileType="pdf" onLoad={onLoad} />,
    );
    const iframe = container.querySelector('iframe');
    expect(iframe?.getAttribute('src')).toBe('blob:proof');
    fireEvent.load(iframe as HTMLIFrameElement);
    expect(onLoad).toHaveBeenCalledTimes(1);
  });

  it('renders an image proof from the object URL and forwards load/error', () => {
    const onLoad = jest.fn();
    const onError = jest.fn();
    render(
      <PaymentProofViewer
        {...baseProps}
        proofUrl="blob:proof"
        fileType="image"
        onLoad={onLoad}
        onError={onError}
      />,
    );
    const img = screen.getByAltText('paymentProof.proofAlt');
    expect(img.getAttribute('src')).toBe('blob:proof');
    fireEvent.load(img);
    expect(onLoad).toHaveBeenCalledTimes(1);
    fireEvent.error(img);
    expect(onError).toHaveBeenCalledTimes(1);
  });
});
