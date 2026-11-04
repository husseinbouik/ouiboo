'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@ouiboo/ui';
import { Search } from 'lucide-react';
import { formatCurrency, formatLocalDate } from '@ouiboo/utils';
import type { CrmContact } from '@/lib/crm';

interface CrmContactsProps {
  contacts: CrmContact[];
  isLoading: boolean;
  search: string;
  onSearchChange: (value: string) => void;
}

/**
 * #786: the agency's traveller contacts, derived from its own
 * bookings. Only channels already visible through those bookings are
 * shown (account email + the booking contact phone) — nothing new is
 * collected and no other agency's travellers can appear here.
 */
export function CrmContacts({ contacts, isLoading, search, onSearchChange }: CrmContactsProps) {
  const { t, i18n } = useTranslation();

  let body: React.ReactNode;
  if (isLoading) {
    body = <p className="mt-4 text-sm text-muted-foreground">{t('crm.contactsLoading')}</p>;
  } else if (contacts.length === 0) {
    body = (
      <p className="mt-4 rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
        {t('crm.contactsEmpty')}
      </p>
    );
  } else {
    body = (
      <div className="mt-4 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-start">
              <th scope="col" className="px-4 py-3 text-start font-medium">{t('crm.colTraveller')}</th>
              <th scope="col" className="px-4 py-3 text-start font-medium">{t('crm.colContact')}</th>
              <th scope="col" className="px-4 py-3 text-start font-medium">{t('crm.colTrips')}</th>
              <th scope="col" className="px-4 py-3 text-start font-medium">{t('crm.colBookings')}</th>
              <th scope="col" className="px-4 py-3 text-start font-medium">{t('crm.colLastBooking')}</th>
              <th scope="col" className="px-4 py-3 text-start font-medium">{t('crm.colTotalBooked')}</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((contact) => (
              <tr key={contact.travelerId} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium">{contact.name ?? '—'}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  <span className="block">{contact.email ?? '—'}</span>
                  <span className="block">{contact.phone ?? '—'}</span>
                </td>
                <td className="px-4 py-3">{contact.tripCount}</td>
                <td className="px-4 py-3">{contact.bookingCount}</td>
                <td className="px-4 py-3">
                  {formatLocalDate(new Date(contact.lastBookingDate), i18n.language)}
                </td>
                <td className="px-4 py-3 font-medium">
                  {formatCurrency(contact.totalBookedValue, contact.currency, i18n.language)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <section aria-label={t('crm.contactsTitle')}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{t('crm.contactsTitle')}</h2>
          <p className="text-sm text-muted-foreground">{t('crm.contactsSubtitle')}</p>
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={t('crm.searchPlaceholder')}
            aria-label={t('crm.searchPlaceholder')}
            className="ps-9"
          />
        </div>
      </div>

      {body}
    </section>
  );
}
