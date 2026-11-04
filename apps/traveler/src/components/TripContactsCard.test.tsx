/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { TripContactsCard } from './TripContactsCard';

jest.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key,
        i18n: { language: 'en' },
    }),
}));

const DAY_MS = 24 * 60 * 60 * 1000;
const isoInDays = (days: number) => new Date(Date.now() + days * DAY_MS).toISOString();

function makeBooking(overrides: Record<string, any> = {}): any {
    return {
        id: 'booking-1',
        status: 'CONFIRMED',
        session: {
            id: 'session-1',
            startDate: isoInDays(7),
            endDate: isoInDays(9),
            template: {
                id: 'template-1',
                title: 'Atlas Trek',
                agency: {
                    id: 'agency-1',
                    companyName: 'Atlas Adventures',
                    emergencyContactName: 'Yasmine',
                    emergencyContactPhone: '+212 6 12 34 56 78',
                },
            },
        },
        ...overrides,
    };
}

describe('TripContactsCard (#419)', () => {
    it('shows the agency emergency contact first, then the OuiBoo escalation', () => {
        render(<TripContactsCard booking={makeBooking()} />);

        expect(screen.getByText('support.agencyFirstTitle')).not.toBeNull();
        expect(screen.getByText('Yasmine')).not.toBeNull();
        const callLink = screen.getByRole('link', { name: /\+212 6 12 34 56 78/ });
        expect(callLink.getAttribute('href')).toBe('tel:+212612345678');
        expect(screen.getByText('support.escalationTitle')).not.toBeNull();
        expect(screen.getByText('support.normalLine')).not.toBeNull();
    });

    it('offers the agency WhatsApp deep link and in-app messaging alongside (#679)', () => {
        render(<TripContactsCard booking={makeBooking()} />);

        const whatsApp = screen.getByRole('link', { name: /support\.agencyWhatsApp/ });
        expect(whatsApp.getAttribute('href')).toContain('https://wa.me/212612345678?text=');
        const inApp = screen.getByRole('link', { name: /support\.messageAgencyInApp/ });
        expect(inApp.getAttribute('href')).toBe('/messages');
    });

    it('renders the Emergency Card with the meeting point, agency first (#680)', () => {
        const booking = makeBooking();
        booking.session.template.meetingPoint = {
            address: 'Place du 9 Avril, Tanger',
            mapsUrl: 'https://maps.example.com/place',
            pickupAvailable: false,
        };
        const { container } = render(<TripContactsCard booking={booking} />);

        expect(screen.getByTestId('emergency-card')).not.toBeNull();
        expect(screen.getByText('Place du 9 Avril, Tanger')).not.toBeNull();
        const maps = screen.getByRole('link', { name: /bookingDetail\.viewOnMap/ });
        expect(maps.getAttribute('href')).toBe('https://maps.example.com/place');
        // Agency-first ordering: the agency block precedes the escalation block.
        const text = container.textContent ?? '';
        expect(text.indexOf('support.agencyFirstTitle')).toBeLessThan(text.indexOf('support.escalationTitle'));
    });

    it('shows the honest fallback when the agency published no emergency contact', () => {
        const booking = makeBooking();
        booking.session.template.agency = { id: 'agency-1', companyName: 'Atlas Adventures' };
        render(<TripContactsCard booking={booking} />);

        expect(screen.getByText('support.noAgencyContact')).not.toBeNull();
        expect(screen.queryByText('support.tripActiveNow')).toBeNull();
    });

    it('flags the active-trip window while the trip is running', () => {
        const booking = makeBooking();
        booking.session.startDate = isoInDays(-1);
        booking.session.endDate = isoInDays(1);
        render(<TripContactsCard booking={booking} />);

        expect(screen.getByText('support.tripActiveNow')).not.toBeNull();
    });

    it('renders nothing for a booking with no departure to pack for', () => {
        const { container } = render(<TripContactsCard booking={makeBooking({ status: 'CANCELLED' })} />);
        expect(container.firstChild).toBeNull();
    });
});
