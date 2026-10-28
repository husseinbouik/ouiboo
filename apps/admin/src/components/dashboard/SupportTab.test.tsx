/**
 * @jest-environment jsdom
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SupportTab from './SupportTab';
import { apiClient } from '@/lib/api-client';

jest.mock('@/lib/api-client', () => ({
  apiClient: { get: jest.fn(), patch: jest.fn() },
}));

const getMock = apiClient.get as jest.Mock;
const patchMock = apiClient.patch as jest.Mock;
const t = (key: string, opts?: Record<string, unknown>) =>
  opts && 'count' in opts ? `${key}:${opts.count}` : key;

const ticket = {
  id: 'ticket-1',
  requesterName: 'Atlas Tours',
  requesterEmail: 'ops@atlas.example',
  requesterRole: 'AGENCY',
  category: 'REFUND',
  subject: 'Refund case stuck',
  message: 'The refund case has not moved in three days, please help.',
  bookingRef: 'bk-9',
  status: 'OPEN',
  createdAt: '2026-10-27T10:00:00.000Z',
  firstResponseAt: null,
  resolvedAt: null,
};

function renderTab() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <SupportTab t={t} />
    </QueryClientProvider>,
  );
}

describe('SupportTab (#581 rework)', () => {
  beforeEach(() => {
    getMock.mockReset();
    patchMock.mockReset();
  });

  it('lists tickets from the admin support API and opens the detail view', async () => {
    getMock.mockResolvedValue({ data: [ticket] });
    renderTab();
    await waitFor(() => expect(screen.getByText('Refund case stuck')).not.toBeNull());
    expect(getMock).toHaveBeenCalledWith('/admin/support/tickets', { params: {} });
    fireEvent.click(screen.getByText('dashboard.support.details'));
    expect(screen.getByTestId('support-ticket-detail').textContent).toContain('please help');
  });

  it('sends status transitions through PATCH and refilters by status', async () => {
    getMock.mockResolvedValue({ data: [ticket] });
    patchMock.mockResolvedValue({ data: { ...ticket, status: 'IN_PROGRESS' } });
    renderTab();
    await waitFor(() => expect(screen.getByText('Refund case stuck')).not.toBeNull());
    fireEvent.click(screen.getByText('dashboard.support.details'));
    const statusSelect = screen.getByLabelText('dashboard.support.setStatus') as HTMLSelectElement;
    fireEvent.change(statusSelect, { target: { value: 'IN_PROGRESS' } });
    await waitFor(() =>
      expect(patchMock).toHaveBeenCalledWith('/admin/support/tickets/ticket-1', { status: 'IN_PROGRESS' }),
    );
    const filter = document.querySelector('#support-status-filter') as HTMLSelectElement;
    fireEvent.change(filter, { target: { value: 'OPEN' } });
    await waitFor(() =>
      expect(getMock).toHaveBeenCalledWith('/admin/support/tickets', { params: { status: 'OPEN' } }),
    );
  });

  it('shows the empty state honestly when the queue is empty', async () => {
    getMock.mockResolvedValue({ data: [] });
    renderTab();
    await waitFor(() => expect(screen.getByText('dashboard.support.empty')).not.toBeNull());
  });
});
