import React from 'react';
import { render, screen } from '@testing-library/react';
import { CancellationOneLiner } from './CancellationOneLiner';

// react-i18next is mocked in traveller jest tests: t() returns the key.
describe('CancellationOneLiner (#687)', () => {
    it('renders the free-cancellation line when the standardised definition says free', () => {
        render(
            <CancellationOneLiner
                summary={{ freeCancellation: true, freeCancellationDays: 7, bestRefundPercent: 100 }}
                agencyName="Atlas Test SARL"
            />,
        );
        expect(screen.getByTestId('cancellation-one-liner')).toBeTruthy();
        expect(screen.getByText('batchF.freeCancellationUntil')).toBeTruthy();
    });

    it('renders the scale-applies line (agency still named as obligor) when not free', () => {
        render(
            <CancellationOneLiner
                summary={{ freeCancellation: false, freeCancellationDays: null, bestRefundPercent: 50 }}
                agencyName="Atlas Test SARL"
            />,
        );
        expect(screen.getByText('batchF.noFreeCancellation')).toBeTruthy();
    });

    it('renders nothing without a summary', () => {
        const { container } = render(<CancellationOneLiner summary={null} />);
        expect(container.firstChild).toBeNull();
    });
});
