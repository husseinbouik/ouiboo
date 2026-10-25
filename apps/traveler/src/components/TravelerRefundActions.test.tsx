/**
 * @jest-environment jsdom
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TravelerRefundActions, type TravelerRefundActionCase } from './TravelerRefundActions';
import { apiClient } from '@/lib/api-client';

jest.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key,
        i18n: { language: 'en' },
    }),
}));

jest.mock('@/lib/api-client', () => ({
    apiClient: { post: jest.fn() },
}));

const postMock = apiClient.post as jest.Mock;

const DAY_MS = 24 * 60 * 60 * 1000;
const isoDaysAgo = (days: number) => new Date(Date.now() - days * DAY_MS).toISOString();

function renderActions(refundCase: TravelerRefundActionCase) {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    return render(
        <QueryClientProvider client={queryClient}>
            <TravelerRefundActions refundCase={refundCase} />
        </QueryClientProvider>,
    );
}

describe('TravelerRefundActions (#416C)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        postMock.mockResolvedValue({});
    });

    it('offers receipt confirmation while the refund is initiated and unconfirmed', async () => {
        renderActions({ id: 'case-1', status: 'REFUND_INITIATED', travellerConfirmedAt: null });
        expect(screen.getByText('refunds.confirmReceiptHint')).not.toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'refunds.confirmReceipt' }));
        await waitFor(() => {
            expect(postMock).toHaveBeenCalledWith('/refunds/mine/case-1/confirm-receipt');
        });
    });

    it('shows the confirmed stamp instead of the button once receipt is confirmed', () => {
        renderActions({
            id: 'case-1',
            status: 'REFUND_INITIATED',
            travellerConfirmedAt: '2026-10-06T10:00:00.000Z',
        });
        expect(screen.getByText('refunds.receiptConfirmed')).not.toBeNull();
        expect(screen.queryByRole('button', { name: 'refunds.confirmReceipt' })).toBeNull();
    });

    it('surfaces a failure when confirming receipt fails', async () => {
        postMock.mockRejectedValue(new Error('boom'));
        renderActions({ id: 'case-1', status: 'REFUND_INITIATED', travellerConfirmedAt: null });
        fireEvent.click(screen.getByRole('button', { name: 'refunds.confirmReceipt' }));
        expect(await screen.findByText('refunds.actionFailed')).not.toBeNull();
    });

    it('explains the completion basis and runs the dispute flow inside the window', async () => {
        renderActions({
            id: 'case-2',
            status: 'REFUND_COMPLETED',
            completedAt: isoDaysAgo(10),
            disputedAt: null,
        });
        expect(screen.getByText('refunds.completedBasis')).not.toBeNull();
        expect(screen.getByText('refunds.disputeHint')).not.toBeNull();

        fireEvent.click(screen.getByRole('button', { name: 'refunds.dispute' }));
        const submit = screen.getByRole('button', { name: 'refunds.disputeSubmit' });
        expect(submit).toHaveProperty('disabled', true);

        fireEvent.change(screen.getByLabelText('refunds.disputeReasonPlaceholder'), {
            target: { value: 'The money has not arrived' },
        });
        expect(submit).toHaveProperty('disabled', false);
        fireEvent.click(submit);
        await waitFor(() => {
            expect(postMock).toHaveBeenCalledWith('/refunds/mine/case-2/dispute-receipt', {
                reason: 'The money has not arrived',
            });
        });
    });

    it('shows the disputed state and no dispute action after a dispute', () => {
        renderActions({
            id: 'case-2',
            status: 'REFUND_COMPLETED',
            completedAt: isoDaysAgo(10),
            disputedAt: isoDaysAgo(2),
        });
        expect(screen.getByText('refunds.disputed')).not.toBeNull();
        expect(screen.queryByRole('button', { name: 'refunds.dispute' })).toBeNull();
    });

    it('shows the window-closed note after the dispute window', () => {
        renderActions({
            id: 'case-2',
            status: 'REFUND_COMPLETED',
            completedAt: isoDaysAgo(90),
            disputedAt: null,
        });
        expect(screen.getByText('refunds.disputeWindowClosed')).not.toBeNull();
        expect(screen.queryByRole('button', { name: 'refunds.dispute' })).toBeNull();
    });

    it('renders nothing for statuses without traveller receipt actions', () => {
        const { container } = renderActions({ id: 'case-3', status: 'AGENCY_ACTION_REQUIRED' });
        expect(container.firstChild).toBeNull();
    });
});
