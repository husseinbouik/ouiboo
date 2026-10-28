/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { TripCard, type TripCardTrip } from './TripCard';

jest.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, options?: any) => {
            if (key === 'tripCard.licenceChecked') return `Licence checked ${options?.date}`;
            if (key === 'tripCard.insuranceEvidenced') return `RC insurance evidenced ${options?.date}`;
            if (key === 'tripCard.verifiedAgency')
                return 'Licence number provided by the agency — not independently verified';
            if (key === 'tripCard.days') return `${options?.count} Days`;
            if (key === 'tripCard.spots') return `${options?.count} spots`;
            return key;
        },
        i18n: { language: 'en', dir: () => 'ltr' },
    }),
}));

jest.mock('next/image', () => ({
    __esModule: true,
    // eslint-disable-next-line @next/next/no-img-element
    default: (props: any) => <img {...props} alt={props.alt} />,
}));

jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

jest.mock('@tanstack/react-query', () => ({
    useQueryClient: () => ({ prefetchQuery: jest.fn() }),
    // #498 rework: TripCard's display-price hook queries FX rates; with
    // no provider the display currency stays MAD and no rate is needed.
    useQuery: () => ({ data: undefined }),
}));

jest.mock('@/lib/api-client', () => ({
    apiClient: { get: jest.fn() },
}));

jest.mock('./WishlistButton', () => ({
    WishlistButton: () => null,
}));

const fmt = (iso: string) =>
    new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(iso));

const LICENCE_DATE = '2026-10-24T00:00:00.000Z';
const INSURANCE_DATE = '2026-10-25T00:00:00.000Z';

function makeTrip(agency: TripCardTrip['agency']): TripCardTrip {
    return {
        id: 'trip-1',
        title: 'Atlas Trek',
        startLocation: 'Imlil',
        durationDays: 3,
        images: ['https://cdn.example.com/a.jpg'],
        sessions: [],
        agency,
    };
}

describe('TripCard verification statement (#413, Council B10)', () => {
    it('shows the dated what+when statement when licence and insurance are verified', () => {
        render(
            <TripCard
                trip={makeTrip({
                    verificationStatus: 'VERIFIED' as any,
                    travelLicenceStatus: 'VERIFIED',
                    licenceVerifiedAt: LICENCE_DATE,
                    insuranceStatus: 'VERIFIED',
                    insuranceVerifiedAt: INSURANCE_DATE,
                })}
            />,
        );

        expect(
            screen.getByText(
                `Licence checked ${fmt(LICENCE_DATE)} · RC insurance evidenced ${fmt(INSURANCE_DATE)}`,
            ),
        ).not.toBeNull();
        expect(screen.queryByText(/not independently verified/)).toBeNull();
    });

    it('shows only the licence part when insurance is not verified', () => {
        render(
            <TripCard
                trip={makeTrip({
                    verificationStatus: 'VERIFIED' as any,
                    travelLicenceStatus: 'VERIFIED',
                    licenceVerifiedAt: LICENCE_DATE,
                    insuranceStatus: 'PENDING_REVIEW',
                    insuranceVerifiedAt: INSURANCE_DATE,
                })}
            />,
        );

        expect(screen.getByText(`Licence checked ${fmt(LICENCE_DATE)}`)).not.toBeNull();
        expect(screen.queryByText(/RC insurance evidenced/)).toBeNull();
    });

    it('falls back to the plain disclaimer (no badge claim) without dated checks', () => {
        render(<TripCard trip={makeTrip({ verificationStatus: 'VERIFIED' as any })} />);

        expect(
            screen.getByText('Licence number provided by the agency — not independently verified'),
        ).not.toBeNull();
        expect(screen.queryByText(/Licence checked/)).toBeNull();
    });

    it('never dates a check that has no stamp on record', () => {
        render(
            <TripCard
                trip={makeTrip({
                    verificationStatus: 'VERIFIED' as any,
                    travelLicenceStatus: 'VERIFIED',
                    licenceVerifiedAt: null,
                })}
            />,
        );

        expect(screen.queryByText(/Licence checked/)).toBeNull();
        expect(
            screen.getByText('Licence number provided by the agency — not independently verified'),
        ).not.toBeNull();
    });

    it('renders no verification line at all for an unverified agency', () => {
        render(<TripCard trip={makeTrip({ verificationStatus: 'PENDING' as any })} />);

        expect(screen.queryByText(/not independently verified/)).toBeNull();
        expect(screen.queryByText(/Licence checked/)).toBeNull();
        expect(screen.queryByText(/RC insurance evidenced/)).toBeNull();
    });
});

describe('TripCard spots badge + carousel controls (#571/#490 rework)', () => {
    const future = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
    function tripWithSeats(seats: number | null): TripCardTrip {
        return {
            id: 'trip-2',
            title: 'Sahara Nights',
            startLocation: 'Merzouga',
            durationDays: 2,
            images: ['https://cdn.example.com/a.jpg', 'https://cdn.example.com/b.jpg'],
            sessions:
                seats === null
                    ? []
                    : [{ id: 's1', status: 'OPEN' as any, availableSeats: seats, price: 900, startDate: future }],
            agency: null,
        };
    }

    it('renders a solid deep-green badge at 12px when plenty of spots remain', () => {
        const { container } = render(<TripCard trip={tripWithSeats(20)} />);
        const badge = container.querySelector('[data-testid="trip-card-spots-badge"]');
        expect(badge).not.toBeNull();
        expect(badge?.getAttribute('data-state')).toBe('available');
        expect(badge?.className).toContain('bg-emerald-700');
        expect(badge?.className).toContain('text-white');
        expect(badge?.className).toContain('text-xs');
        expect(badge?.className).not.toContain('text-[10px]');
    });

    it('switches to a solid amber badge when fewer than 5 seats remain', () => {
        const { container } = render(<TripCard trip={tripWithSeats(3)} />);
        const badge = container.querySelector('[data-testid="trip-card-spots-badge"]');
        expect(badge?.getAttribute('data-state')).toBe('low');
        expect(badge?.className).toContain('bg-amber-600');
    });

    it('renders a visually distinct sold-out badge when no open session remains', () => {
        const { container } = render(<TripCard trip={tripWithSeats(null)} />);
        const badge = container.querySelector('[data-testid="trip-card-spots-badge"]');
        expect(badge?.getAttribute('data-state')).toBe('sold-out');
        expect(badge?.className).toContain('bg-rose-800');
    });

    it('keeps carousel arrows at a genuine 44px and always visible', () => {
        render(<TripCard trip={tripWithSeats(20)} />);
        for (const label of ['tripCard.previousImage', 'tripCard.nextImage']) {
            const btn = screen.getByLabelText(label);
            expect(btn.className).toContain('w-11');
            expect(btn.className).toContain('h-11');
            expect(btn.className).not.toContain('opacity-0');
            expect(btn.className).not.toContain('w-8');
        }
    });
});
