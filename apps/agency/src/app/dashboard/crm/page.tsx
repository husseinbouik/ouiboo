'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button, Pagination } from '@ouiboo/ui';
import { Users } from 'lucide-react';
import type { BookingDetails } from '@ouiboo/types';
import { formatCurrency, formatLocalDate, toPaginatedList } from '@ouiboo/utils';
import { apiClient } from '@/lib/api-client';
import { crmStageLabelKey, type CrmContact, type CrmPipeline as CrmPipelineData } from '@/lib/crm';
import { CrmContacts } from '@/components/CrmContacts';
import { CrmPipeline, CrmPipelineSkeleton } from '@/components/CrmPipeline';
import { AgencyDataExport } from '@/components/AgencyDataExport';

/**
 * #786 (Council S6 Phase 3, smallest useful slice): agency CRM —
 * traveller contacts + booking pipeline, both derived from the
 * agency's own bookings (tenant-scoped server-side). The #780 CSV
 * exports are surfaced here rather than duplicated. Full channel
 * management (external channel sync, iCal feeds, third-party listing
 * pushes) stays out until post-beta agency demand — see #786.
 */
export default function CrmPage() {
  const { t, i18n } = useTranslation();
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [contactsPage, setContactsPage] = useState(1);

  const pipelineQuery = useQuery({
    queryKey: ['agency-crm-pipeline'],
    queryFn: async () => {
      const response = await apiClient.get('/agency/crm/pipeline');
      return response.data as CrmPipelineData;
    },
  });

  const contactsQuery = useQuery({
    queryKey: ['agency-crm-contacts', contactsPage, search],
    queryFn: async () => {
      const response = await apiClient.get('/agency/crm/contacts', {
        params: { page: contactsPage, limit: 20, search: search || undefined },
      });
      return toPaginatedList<CrmContact>(response.data);
    },
  });

  const stageBookingsQuery = useQuery({
    queryKey: ['agency-crm-stage-bookings', selectedStatus],
    enabled: selectedStatus !== null,
    queryFn: async () => {
      const response = await apiClient.get('/agency/bookings', {
        params: { page: 1, limit: 10, status: selectedStatus },
      });
      return toPaginatedList<BookingDetails>(response.data);
    },
  });

  return (
    <div className="space-y-10">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Users className="h-6 w-6" /> {t('crm.title')}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('crm.subtitle')}</p>
      </div>

      {pipelineQuery.isLoading ? (
        <CrmPipelineSkeleton />
      ) : pipelineQuery.data ? (
        <CrmPipeline
          pipeline={pipelineQuery.data}
          selectedStatus={selectedStatus}
          onSelect={setSelectedStatus}
        />
      ) : (
        <p role="alert" className="text-sm text-destructive">{t('crm.error')}</p>
      )}

      {selectedStatus !== null && (
        <section aria-label={t('crm.stageBookingsTitle')}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">
              {t('crm.stageBookingsTitle')} — {t(crmStageLabelKey(selectedStatus))}
            </h2>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/bookings">{t('crm.viewAllBookings')}</Link>
            </Button>
          </div>
          {stageBookingsQuery.isLoading ? (
            <p className="mt-3 text-sm text-muted-foreground">{t('crm.loading')}</p>
          ) : (
            <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
              {(stageBookingsQuery.data?.data ?? []).map((booking) => (
                <li key={booking.id}>
                  <Link
                    href="/dashboard/bookings"
                    className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-muted/50"
                  >
                    <span className="font-medium">
                      {booking.traveler?.name || booking.fullName || t('bookings.travelerFallback')}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {booking.session.template.title}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {formatLocalDate(new Date(booking.bookingDate), i18n.language)}
                    </span>
                    <span className="font-medium">
                      {formatCurrency(booking.totalAmount, booking.currency, i18n.language)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <CrmContacts
        contacts={contactsQuery.data?.data ?? []}
        isLoading={contactsQuery.isLoading}
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          setContactsPage(1);
        }}
      />
      <Pagination
        pagination={contactsQuery.data?.pagination ?? null}
        onPageChange={setContactsPage}
        className="mt-4"
      />

      <section aria-label={t('crm.exportsTitle')}>
        <h2 className="text-lg font-semibold">{t('crm.exportsTitle')}</h2>
        <div className="mt-3">
          <AgencyDataExport />
        </div>
      </section>
    </div>
  );
}
