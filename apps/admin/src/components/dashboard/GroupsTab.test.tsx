/**
 * @jest-environment jsdom
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import GroupsTab from './GroupsTab';
import { apiClient } from '@/lib/api-client';
import type { AdminPendingGroup } from './types';

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

const belowMinimum: AdminPendingGroup = {
  sessionId: 'sess-below',
  tripTitle: 'Atlas Day Trek',
  agencyName: 'Atlas Tours',
  startDate: '2026-11-05T09:00:00.000Z',
  confirmationDeadline: '2026-10-30T18:00:00.000Z',
  minBookings: 5,
  paidParticipants: 2,
  depositPaidBookings: 2,
  currency: 'MAD',
};

const minimumMet: AdminPendingGroup = {
  ...belowMinimum,
  sessionId: 'sess-met',
  tripTitle: 'Sahara Night',
  paidParticipants: 5,
  depositPaidBookings: 5,
};

function renderTab(groups: AdminPendingGroup[], overrides: Partial<React.ComponentProps<typeof GroupsTab>> = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const onPageChange = jest.fn();
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <GroupsTab
        t={t}
        groups={groups}
        pagination={null}
        onPageChange={onPageChange}
        paginationLabels={paginationLabels}
        {...overrides}
      />
    </QueryClientProvider>,
  );
  return { ...utils, onPageChange, queryClient };
}

/** The modal confirm button reuses the action label; it renders last. */
function modalConfirm(name: string) {
  const all = screen.getAllByRole('button', { name });
  return all[all.length - 1];
}

function typeReason(value: string) {
  fireEvent.change(screen.getByLabelText('dashboard.interventions.reasonLabel'), {
    target: { value },
  });
}

describe('GroupsTab (#423)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    postMock.mockResolvedValue({});
  });

  it('renders the empty state when no groups are pending', () => {
    renderTab([]);
    expect(screen.getByText('dashboard.groups.empty')).not.toBeNull();
    expect(screen.getByText('dashboard.groups.emptyHint')).not.toBeNull();
  });

  it('renders pending groups with a below-minimum warning badge', () => {
    renderTab([belowMinimum, minimumMet]);
    expect(screen.getByText('Atlas Day Trek')).not.toBeNull();
    expect(screen.getByText('Sahara Night')).not.toBeNull();
    const badges = screen.getAllByText('dashboard.groups.paidOfMin');
    expect(badges[0].className).toContain('bg-warning/15');
    expect(badges[1].className).toContain('bg-success/15');
    expect(screen.getAllByText('dashboard.groups.depositPaidBookings')).toHaveLength(2);
  });

  it('force-confirm: blocks submit without a reason, then posts the intervention with the reason', async () => {
    renderTab([belowMinimum]);
    fireEvent.click(screen.getByRole('button', { name: 'dashboard.groups.actions.forceConfirm' }));
    expect(screen.getByText('dashboard.groups.forceConfirmTitle')).not.toBeNull();
    // No deadline input for force-confirm, and no submit without a reason.
    expect(screen.queryByLabelText('dashboard.groups.newDeadline')).toBeNull();
    expect(modalConfirm('dashboard.groups.actions.forceConfirm')).toHaveProperty('disabled', true);
    expect(postMock).not.toHaveBeenCalled();

    typeReason('Agency confirmed the group by phone');
    fireEvent.click(modalConfirm('dashboard.groups.actions.forceConfirm'));

    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith('/admin/sessions/sess-below/force-confirm-group', {
        reason: 'Agency confirmed the group by phone',
      });
    });
    expect(await screen.findByText('dashboard.groups.success')).not.toBeNull();
    expect(screen.queryByText('dashboard.groups.forceConfirmTitle')).toBeNull();
  });

  it('close-group posts to the close endpoint for the clicked group', async () => {
    renderTab([belowMinimum, minimumMet]);
    const closeButtons = screen.getAllByRole('button', { name: 'dashboard.groups.actions.closeGroup' });
    fireEvent.click(closeButtons[1]);
    expect(screen.getByText('dashboard.groups.closeTitle')).not.toBeNull();
    typeReason('Minimum unreachable before departure');
    fireEvent.click(modalConfirm('dashboard.groups.actions.closeGroup'));
    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith('/admin/sessions/sess-met/close-group', {
        reason: 'Minimum unreachable before departure',
      });
    });
  });

  it('extend-deadline requires a new deadline before anything is posted', async () => {
    renderTab([belowMinimum]);
    fireEvent.click(screen.getByRole('button', { name: 'dashboard.groups.actions.extendDeadline' }));
    expect(screen.getByText('dashboard.groups.extendTitle')).not.toBeNull();
    const deadlineInput = screen.getByLabelText('dashboard.groups.newDeadline');
    typeReason('Agency asked for two more days');
    fireEvent.click(modalConfirm('dashboard.groups.actions.extendDeadline'));

    expect(await screen.findByText('dashboard.groups.newDeadlineRequired')).not.toBeNull();
    expect(postMock).not.toHaveBeenCalled();

    fireEvent.change(deadlineInput, { target: { value: '2026-11-02T12:00' } });
    fireEvent.click(modalConfirm('dashboard.groups.actions.extendDeadline'));
    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith('/admin/sessions/sess-below/extend-deadline', {
        reason: 'Agency asked for two more days',
        newDeadline: new Date('2026-11-02T12:00').toISOString(),
      });
    });
  });

  it('surfaces the API error inside the modal and keeps it open', async () => {
    postMock.mockRejectedValue({ response: { data: { message: 'Group already confirmed' } } });
    renderTab([belowMinimum]);
    fireEvent.click(screen.getByRole('button', { name: 'dashboard.groups.actions.forceConfirm' }));
    typeReason('Duplicate confirmation attempt');
    fireEvent.click(modalConfirm('dashboard.groups.actions.forceConfirm'));
    expect(await screen.findByText('Group already confirmed')).not.toBeNull();
    expect(screen.getByText('dashboard.groups.forceConfirmTitle')).not.toBeNull();
  });

  it('paginates through the shared Pagination control', () => {
    const { onPageChange } = renderTab([belowMinimum], {
      pagination: { total: 30, page: 1, limit: 25, totalPages: 2 },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});
