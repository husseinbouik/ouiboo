/**
 * @jest-environment jsdom
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BookingPaymentStatus, BookingStatus, PaymentMethod, VerificationStatus } from '@ouiboo/types';
import BookingsTab from './BookingsTab';
import { apiClient } from '@/lib/api-client';
import type { AdminBooking } from './types';

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

const gatewayBooking = {
  id: 'booking-1234567890',
  sessionId: 'sess-1',
  travelerId: 'trav-1',
  bookingDate: '2026-10-20T10:00:00.000Z',
  status: BookingStatus.Confirmed,
  totalAmount: '1500',
  currency: 'MAD',
  guestsCount: 2,
  paymentMethod: PaymentMethod.Gateway,
  paymentStatus: BookingPaymentStatus.Paid,
  paymentGatewayTransactionId: 'pi_123',
  session: {
    currency: 'MAD',
    template: {
      id: 'tpl-1',
      title: 'Chefchaouen Day Trip',
      agencyId: 'ag-1',
      agency: { id: 'ag-1', companyName: 'Blue City Tours' },
      images: [],
      startLocation: 'Tangier',
    },
  },
  traveler: { email: 'layla@example.com', name: 'Layla Bennani' },
} as unknown as AdminBooking;

const manualBooking = {
  ...gatewayBooking,
  id: 'booking-0987654321',
  paymentMethod: PaymentMethod.Manual,
  paymentGatewayTransactionId: undefined,
  session: {
    currency: 'MAD',
    template: {
      id: 'tpl-2',
      title: 'Medina Walking Tour',
      agencyId: 'ag-2',
      agency: { id: 'ag-2', companyName: 'Medina Walks' },
      images: [],
      startLocation: 'Fes',
    },
  },
  traveler: { email: 'omar@example.com', name: 'Omar Haddad' },
} as unknown as AdminBooking;

function renderTab(overrides: Partial<React.ComponentProps<typeof BookingsTab>> = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const onRequestRefund = jest.fn();
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <BookingsTab
        t={t}
        bookings={[gatewayBooking, manualBooking]}
        pagination={null}
        onPageChange={jest.fn()}
        paginationLabels={paginationLabels}
        bookingFeedback={null}
        isRefunding={false}
        onRequestRefund={onRequestRefund}
        {...overrides}
      />
    </QueryClientProvider>,
  );
  return { ...utils, onRequestRefund };
}

/** The modal confirm button reuses the repair label; it renders last. */
function modalConfirm() {
  const all = screen.getAllByRole('button', { name: 'dashboard.interventions.repair' });
  return all[all.length - 1];
}

describe('BookingsTab repair interventions (#423)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    postMock.mockResolvedValue({});
  });

  it('renders booking rows with traveler, trip and amount', () => {
    renderTab();
    expect(screen.getByText(/dashboard\.sections\.bookingMonitor/)).not.toBeNull();
    expect(screen.getByText('Chefchaouen Day Trip')).not.toBeNull();
    expect(screen.getByText('Layla Bennani')).not.toBeNull();
    expect(screen.getAllByText('1500 MAD')).toHaveLength(2);
    expect(screen.getAllByText('#booking-')).toHaveLength(2);
  });

  it('enables Refund only for gateway-paid bookings with a transaction id', () => {
    const { onRequestRefund } = renderTab();
    const refundButtons = screen.getAllByRole('button', { name: 'dashboard.actions.refund' });
    expect(refundButtons[0]).toHaveProperty('disabled', false);
    expect(refundButtons[1]).toHaveProperty('disabled', true);
    fireEvent.click(refundButtons[0]);
    expect(onRequestRefund).toHaveBeenCalledWith(gatewayBooking);
  });

  it('disables Refund for every row while a refund is in flight', () => {
    renderTab({ isRefunding: true });
    const refundButtons = screen.getAllByRole('button', { name: 'dashboard.actions.refund' });
    expect(refundButtons[0]).toHaveProperty('disabled', true);
  });

  it('renders booking feedback with success and error styling', () => {
    const { unmount } = renderTab({
      bookingFeedback: { type: 'success', message: 'Refund initiated' },
    });
    expect(screen.getByText('Refund initiated').className).toContain('text-success');
    unmount();
    renderTab({ bookingFeedback: { type: 'error', message: 'Refund failed' } });
    expect(screen.getByText('Refund failed').className).toContain('text-danger');
  });

  it('opens the repair modal defaulted to resync-payment-state with its hint', () => {
    renderTab();
    const repairButtons = screen.getAllByRole('button', { name: 'dashboard.interventions.repair' });
    fireEvent.click(repairButtons[0]);
    expect(screen.getByText('dashboard.interventions.bookingRepair.title')).not.toBeNull();
    const select = screen.getByLabelText('dashboard.interventions.repairActionLabel') as HTMLSelectElement;
    expect(select.value).toBe('resync-payment-state');
    expect(Array.from(select.options).map((option) => option.value)).toEqual([
      'resync-payment-state',
      'requeue-proof-review',
      'open-refund-case',
    ]);
    expect(screen.getByText('dashboard.interventions.bookingRepair.resync-payment-stateHint')).not.toBeNull();
    // The shared reason gate applies here too.
    expect(modalConfirm()).toHaveProperty('disabled', true);
    expect(postMock).not.toHaveBeenCalled();
  });

  it('posts the chosen repair action with the reason and confirms success', async () => {
    renderTab();
    const repairButtons = screen.getAllByRole('button', { name: 'dashboard.interventions.repair' });
    fireEvent.click(repairButtons[0]);
    const select = screen.getByLabelText('dashboard.interventions.repairActionLabel');
    fireEvent.change(select, { target: { value: 'open-refund-case' } });
    expect(screen.getByText('dashboard.interventions.bookingRepair.open-refund-caseHint')).not.toBeNull();
    fireEvent.change(screen.getByLabelText('dashboard.interventions.reasonLabel'), {
      target: { value: 'Traveler charged twice' },
    });
    fireEvent.click(modalConfirm());
    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith('/admin/bookings/booking-1234567890/repair', {
        action: 'open-refund-case',
        reason: 'Traveler charged twice',
      });
    });
    expect(await screen.findByText('dashboard.groups.success')).not.toBeNull();
    expect(screen.queryByText('dashboard.interventions.bookingRepair.title')).toBeNull();
  });

  it('shows the API error inside the repair modal', async () => {
    postMock.mockRejectedValue({ response: { data: { message: 'Booking is not repairable' } } });
    renderTab();
    const repairButtons = screen.getAllByRole('button', { name: 'dashboard.interventions.repair' });
    fireEvent.click(repairButtons[1]);
    fireEvent.change(screen.getByLabelText('dashboard.interventions.reasonLabel'), {
      target: { value: 'State drift after gateway timeout' },
    });
    fireEvent.click(modalConfirm());
    expect(await screen.findByText('Booking is not repairable')).not.toBeNull();
    expect(screen.getByText('dashboard.interventions.bookingRepair.title')).not.toBeNull();
  });
});

describe('BookingsTab bank-confirmation state (#422)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    postMock.mockResolvedValue({});
  });

  it('flags an accepted proof as awaiting agency bank confirmation — not settled', () => {
    const acceptedBooking = {
      ...manualBooking,
      id: 'booking-accepted-1',
      paymentProof: { status: VerificationStatus.Accepted },
    } as unknown as AdminBooking;
    renderTab({ bookings: [acceptedBooking] });
    expect(screen.getByText('dashboard.status.proofAwaitingBankConfirmation')).not.toBeNull();
  });

  it('shows the recorded bank confirmation for a verified proof', () => {
    const verifiedBooking = {
      ...manualBooking,
      id: 'booking-verified-1',
      paymentStatus: BookingPaymentStatus.Paid,
      paymentProof: { status: VerificationStatus.Verified },
    } as unknown as AdminBooking;
    renderTab({ bookings: [verifiedBooking] });
    expect(screen.getByText('dashboard.status.proofBankConfirmed')).not.toBeNull();
  });

  it('renders no bank-confirmation badge before any proof review', () => {
    renderTab();
    expect(screen.queryByText('dashboard.status.proofAwaitingBankConfirmation')).toBeNull();
    expect(screen.queryByText('dashboard.status.proofBankConfirmed')).toBeNull();
  });

  it('shows the recorded terms acceptance for a booking that has one (#481)', () => {
    const termsBooking = {
      ...manualBooking,
      id: 'booking-terms-1',
      termsVersion: '1.0',
      termsAcceptedAt: '2026-10-20T10:05:00.000Z',
    } as unknown as AdminBooking;
    renderTab({ bookings: [termsBooking] });
    // The t mock echoes the key; the date renders next to it.
    expect(screen.getByText(/dashboard\.table\.termsAccepted/)).not.toBeNull();
  });

  it('labels a booking with no recorded terms as unrecorded, never with a version (B9)', () => {
    renderTab();
    expect(screen.queryByText(/dashboard\.table\.termsAccepted/)).toBeNull();
    // The default fixture renders several bookings, all without recorded
    // terms — every row carries the unrecorded label.
    expect(screen.getAllByText('dashboard.table.termsUnrecorded').length).toBeGreaterThan(0);
  });
});
