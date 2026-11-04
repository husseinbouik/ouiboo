/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CrmContacts } from './CrmContacts';
import type { CrmContact } from '@/lib/crm';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

const contacts: CrmContact[] = [
  {
    travelerId: 't1',
    name: 'Sara Shared',
    email: 'sara@example.com',
    phone: '+212622222222',
    bookingCount: 2,
    tripCount: 2,
    lastBookingDate: '2026-10-01T10:00:00.000Z',
    totalBookedValue: '3500.00',
    currency: 'MAD',
  },
  {
    travelerId: 't2',
    name: 'Omar Aonly',
    email: 'omar-a@example.com',
    phone: null,
    bookingCount: 1,
    tripCount: 1,
    lastBookingDate: '2026-10-05T10:00:00.000Z',
    totalBookedValue: '0.00',
    currency: 'MAD',
  },
];

describe('CrmContacts (#786)', () => {
  it('renders one row per contact with channels, counts and booked value', () => {
    render(
      <CrmContacts contacts={contacts} isLoading={false} search="" onSearchChange={() => {}} />,
    );

    expect(screen.getByText('Sara Shared')).not.toBeNull();
    expect(screen.getByText('sara@example.com')).not.toBeNull();
    expect(screen.getByText('+212622222222')).not.toBeNull();
    expect(screen.getByText(/3,500/)).not.toBeNull();
    expect(screen.getByText('Omar Aonly')).not.toBeNull();
  });

  it('shows the empty state when the agency has no contacts', () => {
    render(<CrmContacts contacts={[]} isLoading={false} search="" onSearchChange={() => {}} />);
    expect(screen.getByText('crm.contactsEmpty')).not.toBeNull();
  });

  it('shows the loading state', () => {
    render(<CrmContacts contacts={[]} isLoading search="" onSearchChange={() => {}} />);
    expect(screen.getByText('crm.contactsLoading')).not.toBeNull();
  });

  it('reports search input changes', async () => {
    const onSearchChange = jest.fn();
    const user = userEvent.setup();
    render(
      <CrmContacts contacts={contacts} isLoading={false} search="" onSearchChange={onSearchChange} />,
    );

    await user.type(screen.getByRole('searchbox'), 's');
    expect(onSearchChange).toHaveBeenCalledWith('s');
  });
});
