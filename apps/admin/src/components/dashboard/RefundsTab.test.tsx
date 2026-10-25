/**
 * @jest-environment jsdom
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RefundsTab from './RefundsTab';
import { apiClient } from '@/lib/api-client';
import type { AdminRefundCase } from './types';

jest.mock('@/lib/api-client', () => ({
  apiClient: { post: jest.fn() },
}));

const postMock = apiClient.post as jest.Mock;

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

const completedCase: AdminRefundCase = {
  id: 'case-1',
  bookingId: 'bk-1',
  travelerId: 'trav-1',
  agencyId: 'ag-1',
  status: 'REFUND_COMPLETED',
  reason: 'GROUP_NOT_CONFIRMED',
  requestedAmount: '1000',
  approvedAmount: '900',
  currency: 'MAD',
  requestedAt: '2026-10-01T10:00:00.000Z',
  refundDueAt: '2026-10-10T10:00:00.000Z',
  initiatedAt: null,
  completedAt: '2026-10-05T10:00:00.000Z',
  failureReason: null,
  completionTier: 'BANK_REFERENCE',
  auditRequired: true,
  auditedAt: null,
  auditedBy: null,
  evidence: [
    {
      id: 'ev-1',
      tier: 'BANK_REFERENCE',
      source: 'AGENCY',
      reference: 'VIR-2026-1042',
      amount: '900',
      createdAt: '2026-10-04T10:00:00.000Z',
    },
    {
      id: 'ev-2',
      tier: 'TRAVELLER_CONFIRMATION',
      source: 'TRAVELLER',
      reference: null,
      amount: null,
      createdAt: '2026-10-05T09:00:00.000Z',
    },
  ],
  originalPaymentId: 'pi_original',
  externalPaymentReference: 'EXT-1',
  agency: { id: 'ag-1', companyName: 'Atlas Tours' },
  traveler: { id: 'trav-1', name: 'Omar Haddad', email: 'omar@example.com' },
  booking: { id: 'bk-1', session: { template: { title: 'Atlas Trek' } } },
};

const requestedCase: AdminRefundCase = {
  ...completedCase,
  id: 'case-2',
  status: 'REFUND_REQUESTED',
  approvedAmount: null,
  refundDueAt: null,
  originalPaymentId: null,
  externalPaymentReference: null,
};

const initiatedCase: AdminRefundCase = {
  ...completedCase,
  id: 'case-3',
  status: 'REFUND_INITIATED',
  refundDueAt: null,
  failureReason: 'Bank rejected the transfer',
};

const overdueCase: AdminRefundCase = {
  ...completedCase,
  id: 'case-4',
  status: 'REFUND_OVERDUE',
  refundDueAt: '2026-10-02T10:00:00.000Z',
};

function renderTab(
  cases: AdminRefundCase[],
  auditProps?: { auditQueue: boolean; onAuditQueueChange: (value: boolean) => void },
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <RefundsTab
        t={t}
        cases={cases}
        pagination={null}
        onPageChange={jest.fn()}
        paginationLabels={paginationLabels}
        {...auditProps}
      />
    </QueryClientProvider>,
  );
}

/** The modal confirm button reuses the repair label; it renders last. */
function modalConfirm() {
  const all = screen.getAllByRole('button', { name: 'dashboard.interventions.repair' });
  return all[all.length - 1];
}

function openRepairFor(cardIndex: number) {
  const repairButtons = screen.getAllByRole('button', { name: 'dashboard.interventions.repair' });
  fireEvent.click(repairButtons[cardIndex]);
}

function typeReason(value: string) {
  fireEvent.change(screen.getByLabelText('dashboard.interventions.reasonLabel'), {
    target: { value },
  });
}

describe('RefundsTab (#370 oversight, #423 repairs)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    postMock.mockResolvedValue({});
  });

  it('renders the empty state when there are no refund cases', () => {
    renderTab([]);
    expect(screen.getByText('dashboard.refunds.empty')).not.toBeNull();
    expect(screen.getByText('dashboard.refunds.emptyHint')).not.toBeNull();
  });

  it('renders a completed case with approved amount and no lifecycle actions', () => {
    renderTab([completedCase]);
    expect(screen.getByText(/Atlas Trek · 900 MAD/)).not.toBeNull();
    expect(screen.getByText(/Atlas Tours/)).not.toBeNull();
    expect(screen.getByText('REFUND COMPLETED')).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'dashboard.refunds.actions.review' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'dashboard.refunds.actions.approve' })).toBeNull();
    expect(screen.getByRole('button', { name: 'dashboard.interventions.repair' })).not.toBeNull();
  });

  it('runs lifecycle actions for a requested case against the refunds API', async () => {
    renderTab([requestedCase]);
    fireEvent.click(screen.getByRole('button', { name: 'dashboard.refunds.actions.approve' }));
    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith('/admin/refunds/case-2/approve', {});
    });
    // The row stays busy until the mutation settles.
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'dashboard.refunds.actions.review' })).toHaveProperty('disabled', false);
    });
    fireEvent.click(screen.getByRole('button', { name: 'dashboard.refunds.actions.review' }));
    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith('/admin/refunds/case-2/review', {});
    });
  });

  it('marks an initiated refund failed with the admin failure reason', async () => {
    renderTab([initiatedCase]);
    expect(screen.getByText(/Bank rejected the transfer/)).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'dashboard.refunds.actions.fail' }));
    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith('/admin/refunds/case-3/fail', {
        failureReason: 'Marked failed by admin',
      });
    });
  });

  it('highlights overdue cases with their due date', () => {
    renderTab([overdueCase]);
    const due = screen.getByText(/dashboard\.refunds\.dueBy/);
    expect(due.className).toContain('text-destructive');
    expect(screen.getByRole('button', { name: 'dashboard.refunds.actions.initiate' })).not.toBeNull();
  });

  it('repair on a completed case defaults to reopen and posts it with the reason', async () => {
    renderTab([completedCase]);
    openRepairFor(0);
    expect(screen.getByText('dashboard.interventions.refundRepair.title')).not.toBeNull();
    const select = screen.getByLabelText('dashboard.interventions.repairActionLabel') as HTMLSelectElement;
    expect(select.value).toBe('reopen');
    expect(Array.from(select.options).map((option) => option.value)).toEqual([
      'reopen',
      'correct-amount',
      'relink-payment',
    ]);
    expect(screen.queryByLabelText(/dashboard\.interventions\.refundRepair\.amountLabel/)).toBeNull();
    typeReason('Traveler proved the refund never arrived');
    fireEvent.click(modalConfirm());
    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith('/admin/refunds/case-1/repair', {
        action: 'reopen',
        reason: 'Traveler proved the refund never arrived',
      });
    });
    expect(await screen.findByText('dashboard.groups.success')).not.toBeNull();
  });

  it('correct-amount sends the edited approved amount as a number', async () => {
    renderTab([completedCase]);
    openRepairFor(0);
    fireEvent.change(screen.getByLabelText('dashboard.interventions.repairActionLabel'), {
      target: { value: 'correct-amount' },
    });
    const amountInput = screen.getByLabelText(/dashboard\.interventions\.refundRepair\.amountLabel/) as HTMLInputElement;
    expect(amountInput.value).toBe('900');
    fireEvent.change(amountInput, { target: { value: '750.5' } });
    typeReason('Agency applied the wrong fee tier');
    fireEvent.click(modalConfirm());
    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith('/admin/refunds/case-1/repair', {
        action: 'correct-amount',
        reason: 'Agency applied the wrong fee tier',
        approvedAmount: 750.5,
      });
    });
  });

  it('relink-payment omits blanked fields and sends the edited reference', async () => {
    renderTab([completedCase]);
    openRepairFor(0);
    fireEvent.change(screen.getByLabelText('dashboard.interventions.repairActionLabel'), {
      target: { value: 'relink-payment' },
    });
    const paymentIdInput = screen.getByLabelText('dashboard.interventions.refundRepair.paymentIdLabel') as HTMLInputElement;
    const referenceInput = screen.getByLabelText('dashboard.interventions.refundRepair.referenceLabel') as HTMLInputElement;
    expect(paymentIdInput.value).toBe('pi_original');
    expect(referenceInput.value).toBe('EXT-1');
    fireEvent.change(paymentIdInput, { target: { value: '   ' } });
    fireEvent.change(referenceInput, { target: { value: 'EXT-2' } });
    typeReason('Original payment was mis-linked');
    fireEvent.click(modalConfirm());
    await waitFor(() => {
      expect(postMock).toHaveBeenCalledTimes(1);
    });
    const body = postMock.mock.calls[0][1] as Record<string, unknown>;
    expect(postMock.mock.calls[0][0]).toBe('/admin/refunds/case-1/repair');
    expect(body.action).toBe('relink-payment');
    expect(body.externalPaymentReference).toBe('EXT-2');
    expect('originalPaymentId' in body).toBe(false);
  });

  it('repair on a requested case offers only relink-payment', () => {
    renderTab([requestedCase]);
    openRepairFor(0);
    const select = screen.getByLabelText('dashboard.interventions.repairActionLabel') as HTMLSelectElement;
    expect(Array.from(select.options).map((option) => option.value)).toEqual(['relink-payment']);
    expect(select.value).toBe('relink-payment');
    // The relink inputs are shown immediately for the only available action.
    expect(screen.getByLabelText('dashboard.interventions.refundRepair.paymentIdLabel')).not.toBeNull();
  });

  it.each([
    ['ELIGIBILITY_REVIEW', ['approve', 'reject'], ['relink-payment']],
    ['REFUND_APPROVED', ['initiate'], ['correct-amount', 'relink-payment']],
    ['REFUND_FAILED', ['initiate'], ['correct-amount', 'relink-payment']],
    ['REFUND_REJECTED', [], ['reopen', 'relink-payment']],
  ])('status %s offers lifecycle %j and repairs %j', (status, lifecycle, repairs) => {
    renderTab([{ ...completedCase, id: `case-${status}`, status }]);
    for (const action of ['review', 'approve', 'reject', 'initiate', 'complete', 'fail']) {
      const button = screen.queryByRole('button', { name: `dashboard.refunds.actions.${action}` });
      if (lifecycle.includes(action)) {
        expect(button).not.toBeNull();
      } else {
        expect(button).toBeNull();
      }
    }
    openRepairFor(0);
    const select = screen.getByLabelText('dashboard.interventions.repairActionLabel') as HTMLSelectElement;
    expect(Array.from(select.options).map((option) => option.value)).toEqual(repairs);
  });

  it('re-enables the row when a lifecycle action fails', async () => {
    postMock.mockRejectedValueOnce(new Error('network down'));
    renderTab([requestedCase]);
    const approve = screen.getByRole('button', { name: 'dashboard.refunds.actions.approve' });
    fireEvent.click(approve);
    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith('/admin/refunds/case-2/approve', {});
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'dashboard.refunds.actions.approve' })).toHaveProperty('disabled', false);
    });
  });

  it('shows the API error inside the repair modal', async () => {
    postMock.mockRejectedValue({ response: { data: { message: 'Case is not repairable' } } });
    renderTab([completedCase]);
    openRepairFor(0);
    typeReason('Trying to reopen a settled case');
    fireEvent.click(modalConfirm());
    expect(await screen.findByText('Case is not repairable')).not.toBeNull();
    expect(screen.getByText('dashboard.interventions.refundRepair.title')).not.toBeNull();
  });
});

describe('RefundsTab audit queue (#416C)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    postMock.mockResolvedValue({});
  });

  it('shows the completion tier, the evidence summary and the audit flag on a completed case', () => {
    renderTab([completedCase]);
    expect(screen.getByText(/dashboard\.refunds\.tierLabel/)).not.toBeNull();
    // The t mock resolves the tier label through its defaultValue fallback.
    expect(screen.getByText('BANK REFERENCE')).not.toBeNull();
    expect(screen.getByText('dashboard.refunds.evidenceSummary')).not.toBeNull();
    expect(screen.getByText('dashboard.refunds.audit.required')).not.toBeNull();
  });

  it('marks a flagged case audited through the audit endpoint', async () => {
    renderTab([completedCase]);
    fireEvent.click(screen.getByRole('button', { name: 'dashboard.refunds.audit.markAudited' }));
    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith('/admin/refunds/case-1/audit');
    });
  });

  it('shows the audited stamp and no audit action once a case is audited', () => {
    renderTab([{ ...completedCase, auditedAt: '2026-10-06T10:00:00.000Z', auditedBy: 'admin-1' }]);
    expect(screen.getByText('dashboard.refunds.audit.audited')).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'dashboard.refunds.audit.markAudited' })).toBeNull();
    expect(screen.queryByText('dashboard.refunds.audit.required')).toBeNull();
  });

  it('does not offer auditing for completions that were never flagged', () => {
    renderTab([{ ...completedCase, id: 'case-9', auditRequired: false }]);
    expect(screen.queryByRole('button', { name: 'dashboard.refunds.audit.markAudited' })).toBeNull();
    expect(screen.queryByText('dashboard.refunds.audit.required')).toBeNull();
  });

  it('toggles between all cases and the audit queue', () => {
    const onAuditQueueChange = jest.fn();
    renderTab([completedCase], { auditQueue: false, onAuditQueueChange });
    fireEvent.click(screen.getByRole('button', { name: 'dashboard.refunds.audit.queue' }));
    expect(onAuditQueueChange).toHaveBeenCalledWith(true);
  });

  it('renders the audit-queue empty state (with the toggle) when the queue is empty', () => {
    const onAuditQueueChange = jest.fn();
    renderTab([], { auditQueue: true, onAuditQueueChange });
    expect(screen.getByText('dashboard.refunds.audit.queueEmpty')).not.toBeNull();
    expect(screen.getByText('dashboard.refunds.audit.queueEmptyHint')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'dashboard.refunds.audit.all' }));
    expect(onAuditQueueChange).toHaveBeenCalledWith(false);
  });
});
