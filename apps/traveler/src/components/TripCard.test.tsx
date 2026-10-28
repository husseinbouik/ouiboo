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
