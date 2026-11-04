/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReferralBlock } from './ReferralBlock';

const mockGet = jest.fn();
jest.mock('@/lib/api-client', () => ({
    apiClient: { get: (...args: unknown[]) => mockGet(...args) },
}));

jest.mock('@ouiboo/utils', () => ({
    ...jest.requireActual('@ouiboo/utils'),
    copyShareLink: jest.fn(async () => true),
}));

jest.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, opts?: Record<string, unknown>) => {
            if (key === 'referral.introduced') return `You've introduced ${opts?.count} travellers to Ouiboo`;
            if (key === 'referral.introducedOne') return `You've introduced 1 traveller to Ouiboo`;
            if (key === 'referral.thankYouZero') return 'Thank you for spreading the word — share your link to introduce your first traveller.';
            return key;
        },
        i18n: { language: 'en' },
    }),
}));

function renderBlock() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <QueryClientProvider client={client}>
            <ReferralBlock />
        </QueryClientProvider>,
    );
}

describe('ReferralBlock (#777)', () => {
    beforeEach(() => {
        mockGet.mockReset();
    });

    it('renders the personal link and the live recognition count', async () => {
        mockGet.mockResolvedValue({ data: { referralCode: 'OUI-TESTCODE12', referralCount: 3 } });
        renderBlock();
        await waitFor(() => expect(screen.getByTestId('referral-block')).toBeTruthy());
        expect(mockGet).toHaveBeenCalledWith('/users/me/referrals');
        expect(screen.getByTestId('referral-link').textContent).toContain('/signup?ref=OUI-TESTCODE12');
        expect(screen.getByTestId('referral-count').textContent).toBe("You've introduced 3 travellers to Ouiboo");
    });

    it('shows the thank-you state at zero', async () => {
        mockGet.mockResolvedValue({ data: { referralCode: 'OUI-TESTCODE12', referralCount: 0 } });
        renderBlock();
        await waitFor(() => expect(screen.getByTestId('referral-block')).toBeTruthy());
        expect(screen.getByTestId('referral-count').textContent).toContain('Thank you');
    });

    // Explicit #777 fence: the referrals payload carries no value or
    // balance field — the block renders only code + count.
    it('renders nothing value-like from the payload', async () => {
        mockGet.mockResolvedValue({ data: { referralCode: 'OUI-TESTCODE12', referralCount: 2 } });
        renderBlock();
        await waitFor(() => expect(screen.getByTestId('referral-block')).toBeTruthy());
        const text = screen.getByTestId('referral-block').textContent ?? '';
        expect(text).not.toMatch(/points|credits|discount|cash|balance/i);
    });
});
