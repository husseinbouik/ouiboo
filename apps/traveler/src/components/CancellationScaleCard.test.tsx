import React from 'react';
import { render, screen } from '@testing-library/react';
import { CancellationScaleCard } from './CancellationScaleCard';
import type { CancellationScaleSnapshot } from '@ouiboo/types';

// In traveller jest tests react-i18next is mocked: t() returns the key,
// so assertions target the keys the card renders (the en/fr/ar copy
// itself lives in public/locales/*/translation.json under "cancellation").
const scale: CancellationScaleSnapshot = {
    version: 'cancellation-v1',
    floorRefundPercent: 100,
    refundInitiationDays: 7,
    bands: [
        { minDaysBeforeStart: 30, refundPercent: 100 },
        { minDaysBeforeStart: 7, refundPercent: 50 },
        { minDaysBeforeStart: 0, refundPercent: 0 },
    ],
};

describe('CancellationScaleCard (#417)', () => {
    it('renders the floor lines first, then one row per band with amounts in the trip currency', () => {
        render(<CancellationScaleCard scale={scale} baseAmount={200} currency="MAD" />);

        expect(screen.getByText('cancellation.title')).toBeTruthy();
        expect(screen.getByText('cancellation.floorAgency')).toBeTruthy();
        expect(screen.getByText('cancellation.floorMinimum')).toBeTruthy();
        expect(screen.getByText('cancellation.ifYouCancel')).toBeTruthy();
        // Two "at least" bands (30d, 7d) and one closing "less than" band.
        expect(screen.getAllByText('cancellation.bandAtLeast')).toHaveLength(2);
        expect(screen.getAllByText('cancellation.bandLessThan')).toHaveLength(1);
        // Amounts computed on the 200 MAD base: 100% / 50% / 0%.
        expect(screen.getByText(/MAD 200/)).toBeTruthy();
        expect(screen.getByText(/MAD 100/)).toBeTruthy();
        expect(screen.getByText(/MAD 0/)).toBeTruthy();
        expect(screen.getByText('cancellation.paidByAgency')).toBeTruthy();
    });

    it('omits amounts when no base amount is known', () => {
        render(<CancellationScaleCard scale={scale} />);
        expect(screen.queryByText(/MAD/)).toBeNull();
        expect(screen.getAllByText('cancellation.refundPercent')).toHaveLength(3);
    });

    it('renders nothing without a scale', () => {
        const { container } = render(<CancellationScaleCard scale={null} />);
        expect(container.firstChild).toBeNull();
    });
});
