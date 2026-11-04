/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { QuoteRequestRow } from './QuoteRequestPanel';

jest.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, opts?: Record<string, unknown>) => {
            if (key === 'quotes.bandLine') return `band:${opts?.days}:${opts?.percent}`;
            if (key === 'quotes.guestsLine') return `guests:${opts?.count}`;
            if (key === 'quotes.acceptedOn') return `acceptedOn:${opts?.date}`;
            return key;
        },
        i18n: { language: 'en' },
    }),
}));

jest.mock('@/components/AuthContext', () => ({
    useAuth: () => ({ user: { id: 'trav-1' }, setShowLoginModal: jest.fn() }),
}));

const quoted: any = {
    id: 'qr-1', templateId: 'trip-1', agencyId: 'agency-1', travelerId: 'trav-1',
    requestedStartDate: '2026-12-18T00:00:00.000Z', requestedEndDate: '2026-12-20T00:00:00.000Z',
    guestsCount: 4, note: null, status: 'QUOTED',
    quotedTotalAmount: '2400.00', quotedCurrency: 'MAD', quoteNote: 'Lunch included',
    cancellationScale: { version: 'cancellation-v1', bands: [{ minDaysBeforeStart: 7, refundPercent: 50 }, { minDaysBeforeStart: 0, refundPercent: 0 }], floorRefundPercent: 100, refundInitiationDays: 7 },
    quotedAt: '2026-12-01T10:00:00.000Z', acceptedAt: null, acceptedSnapshot: null,
    createdAt: '2026-12-01T09:00:00.000Z', updatedAt: '2026-12-01T10:00:00.000Z',
    template: { id: 'trip-1', title: 'Desert Trek', startLocation: 'Tangier', agency: { id: 'agency-1', companyName: 'Atlas Adventures' } },
};

describe('QuoteRequestRow (#682)', () => {
    it('renders the firm MAD total + scale for a QUOTED request with an accept action', () => {
        render(<QuoteRequestRow request={quoted} onAccept={jest.fn()} />);
        expect(screen.getByText(/quotes\.firmTotal/)).not.toBeNull();
        expect(screen.getByText(/2,400/)).not.toBeNull();
        expect(screen.getByText('band:7:50')).not.toBeNull();
        expect(screen.getByRole('button', { name: 'quotes.accept' })).not.toBeNull();
    });

    it('renders the acceptance snapshot for an ACCEPTED request and no accept action', () => {
        const accepted = {
            ...quoted, status: 'ACCEPTED', acceptedAt: '2026-12-02T12:00:00.000Z',
            acceptedSnapshot: {
                quotedTotalAmount: '2400.00', quotedCurrency: 'MAD',
                cancellationScale: quoted.cancellationScale,
                quotedAt: quoted.quotedAt, acceptedAt: '2026-12-02T12:00:00.000Z',
                templateId: 'trip-1', agencyId: 'agency-1',
            },
        };
        render(<QuoteRequestRow request={accepted} onAccept={jest.fn()} />);
        expect(screen.getByText(/acceptedOn:/)).not.toBeNull();
        expect(screen.queryByRole('button', { name: 'quotes.accept' })).toBeNull();
    });
});
