/**
 * @jest-environment jsdom
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RefundEvidenceForm, isRefundEvidenceReady } from './RefundEvidenceForm';
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
  }),
}));

jest.mock('@/lib/api-client', () => ({
  apiClient: { post: jest.fn() },
}));

const postMock = apiClient.post as jest.Mock;

function renderForm(onSubmitted = jest.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <RefundEvidenceForm
        caseId="case-1"
        expectedAmount="200.00"
        currency="MAD"
        onSubmitted={onSubmitted}
      />
    </QueryClientProvider>,
  );
  return { ...utils, onSubmitted };
}

async function uploadProof(container: HTMLElement) {
  const input = container.querySelector('input[type="file"]') as HTMLInputElement;
  const file = new File(['scan'], 'bank-confirmation.pdf', { type: 'application/pdf' });
  fireEvent.change(input, { target: { files: [file] } });
  await waitFor(() =>
    expect(screen.getByText(/onboarding\.documents\.current/)).not.toBeNull(),
  );
}

describe('RefundEvidenceForm (#416C)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    postMock.mockImplementation((url: string) => {
      if (url === '/upload') {
        return Promise.resolve({ data: { filename: 'private/u1/bank-confirmation.pdf' } });
      }
      return Promise.resolve({ data: {} });
    });
  });

  it('readiness requires both a reference and the retained proof document', () => {
    expect(isRefundEvidenceReady('', 'private/u1/doc.pdf')).toBe(false);
    expect(isRefundEvidenceReady('   ', 'private/u1/doc.pdf')).toBe(false);
    expect(isRefundEvidenceReady('VIR-1', null)).toBe(false);
    expect(isRefundEvidenceReady('VIR-1', 'private/u1/doc.pdf')).toBe(true);
  });

  it('keeps submit disabled until the reference and the proof are both present', async () => {
    const { container } = renderForm();
    const submit = screen.getByRole('button', { name: 'refunds.evidence.submit' });
    expect(submit).toHaveProperty('disabled', true);

    fireEvent.change(screen.getByLabelText(/refunds\.evidence\.referenceLabel/), {
      target: { value: 'VIR-2026-1042' },
    });
    expect(submit).toHaveProperty('disabled', true);

    await uploadProof(container);
    expect(submit).toHaveProperty('disabled', false);
  });

  it('submits the one-shape payload: reference + private proof key (+ optional amount/note)', async () => {
    const { container, onSubmitted } = renderForm();
    fireEvent.change(screen.getByLabelText(/refunds\.evidence\.referenceLabel/), {
      target: { value: 'VIR-2026-1042' },
    });
    fireEvent.change(screen.getByLabelText(/refunds\.evidence\.amountLabel/), {
      target: { value: '200' },
    });
    fireEvent.change(screen.getByLabelText('refunds.evidence.noteLabel'), {
      target: { value: 'Banque Populaire, value date 12 Oct' },
    });
    await uploadProof(container);

    fireEvent.click(screen.getByRole('button', { name: 'refunds.evidence.submit' }));

    await waitFor(() =>
      expect(postMock).toHaveBeenCalledWith('/agency/refunds/case-1/evidence', {
        reference: 'VIR-2026-1042',
        proofUrl: 'private/u1/bank-confirmation.pdf',
        amount: 200,
        note: 'Banque Populaire, value date 12 Oct',
      }),
    );
    expect(await screen.findByText('refunds.evidence.submitted')).not.toBeNull();
    expect(onSubmitted).toHaveBeenCalledTimes(1);
  });

  it('omits blank amount and note from the payload', async () => {
    const { container } = renderForm();
    fireEvent.change(screen.getByLabelText(/refunds\.evidence\.referenceLabel/), {
      target: { value: 'VIR-9' },
    });
    await uploadProof(container);
    fireEvent.click(screen.getByRole('button', { name: 'refunds.evidence.submit' }));
    await waitFor(() =>
      expect(postMock).toHaveBeenCalledWith('/agency/refunds/case-1/evidence', {
        reference: 'VIR-9',
        proofUrl: 'private/u1/bank-confirmation.pdf',
      }),
    );
  });

  it('surfaces the API error and does not report success', async () => {
    postMock.mockImplementation((url: string) => {
      if (url === '/upload') {
        return Promise.resolve({ data: { filename: 'private/u1/bank-confirmation.pdf' } });
      }
      return Promise.reject({ response: { data: { message: 'Case is not open' } } });
    });
    const { container, onSubmitted } = renderForm();
    fireEvent.change(screen.getByLabelText(/refunds\.evidence\.referenceLabel/), {
      target: { value: 'VIR-1' },
    });
    await uploadProof(container);
    fireEvent.click(screen.getByRole('button', { name: 'refunds.evidence.submit' }));
    expect(
      await screen.findByText('refunds.evidence.submitFailed Case is not open'),
    ).not.toBeNull();
    expect(screen.queryByText('refunds.evidence.submitted')).toBeNull();
    expect(onSubmitted).not.toHaveBeenCalled();
  });
});
