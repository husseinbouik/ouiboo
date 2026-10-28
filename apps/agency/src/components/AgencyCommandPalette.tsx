'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { CommandPalette, type CommandPaletteItem } from '@ouiboo/ui';
import { apiClient } from '@/lib/api-client';

type AgencyTripSummary = { id: string; title?: string; status?: string };

/**
 * #487: agency command palette. Navigation items mirror AgencySidebar
 * exactly (same routes, same translations), so the palette can never
 * list a section the sidebar — and therefore the user's role — does not
 * offer. Trip items come from the agency's OWN trips endpoint
 * (`/agency/trips`, tenant-scoped server-side); selecting one only
 * navigates to its detail page. No destructive commands in v1.
 */
export function AgencyCommandPalette() {
  const { t } = useTranslation();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  // Fetch the agency's trips lazily — only once the palette first opens.
  const { data: trips = [] } = useQuery<AgencyTripSummary[]>({
    queryKey: ['agency-trips', 'command-palette'],
    queryFn: async () => {
      const response = await apiClient.get('/agency/trips');
      const payload = response.data as AgencyTripSummary[] | { data: AgencyTripSummary[] };
      return Array.isArray(payload) ? payload : (payload.data ?? []);
    },
    enabled: open,
    staleTime: 60 * 1000,
  });

  const items: CommandPaletteItem[] = React.useMemo(() => {
    const nav: Array<{ label: string; href: string }> = [
      { label: t('sidebar.dashboard'), href: '/dashboard' },
      { label: t('sidebar.analytics'), href: '/dashboard/analytics' },
      { label: t('sidebar.myTrips'), href: '/dashboard/trips' },
      { label: t('sidebar.bookings'), href: '/dashboard/bookings' },
      { label: t('sidebar.reviews'), href: '/dashboard/reviews' },
      { label: t('sidebar.wallet'), href: '/dashboard/wallet' },
      { label: t('sidebar.refunds'), href: '/dashboard/refunds' },
      { label: t('sidebar.billing'), href: '/dashboard/settings/billing' },
      { label: t('sidebar.compliance'), href: '/dashboard/onboarding' },
      { label: t('sidebar.settings'), href: '/dashboard/settings' },
      { label: t('sidebar.support'), href: '/dashboard/support' },
      { label: t('sidebar.createNew'), href: '/dashboard/trips/create' },
    ];
    return [
      ...nav.map((item) => ({
        id: `nav-${item.href}`,
        label: item.label,
        group: t('commandPalette.groupNavigation'),
        keywords: item.href,
        perform: () => router.push(item.href),
      })),
      ...trips
        .filter((trip) => trip.title)
        .map((trip) => ({
          id: `trip-${trip.id}`,
          label: trip.title as string,
          group: t('commandPalette.groupTrips'),
          keywords: `${trip.status ?? ''} ${trip.id}`,
          hint: trip.status,
          perform: () => router.push(`/dashboard/trips/${trip.id}`),
        })),
    ];
  }, [t, trips, router]);

  return (
    <CommandPalette
      items={items}
      placeholder={t('commandPalette.placeholder')}
      emptyText={t('commandPalette.empty')}
      ariaLabel={t('commandPalette.open')}
      triggerLabel={t('commandPalette.trigger')}
      withTrigger
      open={open}
      onOpenChange={setOpen}
    />
  );
}
