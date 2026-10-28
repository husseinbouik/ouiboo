import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { CheckoutGuestForm } from './CheckoutGuestForm';
import mockEnTranslations from '../../../public/locales/en/translation.json';

jest.mock('react-i18next', () => {
    // #424: resolve keys against the real English locale file so the
    // assertions below read the shipped copy, not raw key names.
    const lookup = (key: string): unknown =>
        key.split('.').reduce<any>((acc, part) => acc?.[part], mockEnTranslations);
    return {
        useTranslation: () => ({
            t: (key: string, options?: Record<string, unknown>) => {
                let value = lookup(key);
                if (typeof value !== 'string') return key;
                if (options) {
                    for (const [name, replacement] of Object.entries(options)) {
                        value = (value as string).replaceAll(`{{${name}}}`, String(replacement));
                    }
                }
                return value;
            },
            i18n: { language: 'en' },
        }),
    };
});


// CIN removal (founder decision 2026-10-25): the checkout guest form must
// never ask for an identity-document number; the agency checks ID at
// departure instead.
describe('CheckoutGuestForm (CIN removal)', () => {
    const baseProps = {
        trip: {
            sessions: [
                {
                    id: 'session-1',
                    startDate: '2027-05-10T00:00:00.000Z',
                    endDate: '2027-05-12T00:00:00.000Z',
                    availableSeats: 8,
                    price: 600,
                    currency: 'MAD',
                },
            ],
        },
        retryBooking: null,
        selectedSessionId: 'session-1',
        onSelectSession: jest.fn(),
        guestCount: 2,
        onGuestCountChange: jest.fn(),
        fullName: 'Launch Traveler',
        onFullNameChange: jest.fn(),
        phoneNumber: '+212600000000',
        onPhoneNumberChange: jest.fn(),
        language: 'en',
    };

    it('collects name and phone only — no CIN / passport field anywhere', () => {
        const { container } = render(<CheckoutGuestForm {...baseProps} />);

        expect(screen.getByLabelText(/full name/i)).not.toBeNull();
        expect(screen.getByLabelText(/phone number/i)).not.toBeNull();
        expect(screen.queryByText(/CIN or Passport/i)).toBeNull();
        expect(container.querySelector('#document-number')).toBeNull();
        expect(container.querySelector('input[name="document-number"]')).toBeNull();
    });

    it('tells the traveller the agency may check ID at departure', () => {
        render(<CheckoutGuestForm {...baseProps} />);
        expect(screen.getByText(/may check your ID at departure/i)).not.toBeNull();
        expect(screen.getByText(/never ask for your ID number online/i)).not.toBeNull();
    });

    it('still wires the name and phone inputs', () => {
        const onFullNameChange = jest.fn();
        const onPhoneNumberChange = jest.fn();
        render(
            <CheckoutGuestForm
                {...baseProps}
                onFullNameChange={onFullNameChange}
                onPhoneNumberChange={onPhoneNumberChange}
            />,
        );

        fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Amina' } });
        fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '+212611111111' } });

        expect(onFullNameChange).toHaveBeenCalledWith('Amina');
        expect(onPhoneNumberChange).toHaveBeenCalledWith('+212611111111');
    });
});
