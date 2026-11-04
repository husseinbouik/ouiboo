'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BETA_DESTINATIONS } from '@ouiboo/types';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/components/AuthContext';
import { MyCustomTripRequests } from '@/components/MyCustomTripRequests';

/**
 * #684 (Council S6): the custom-trip request form. The feature lives
 * behind CUSTOM_TRIP_REQUESTS_ENABLED on the API (default OFF): while
 * off, the availability probe 404s and this page presents the feature
 * as unavailable — no form, no leaking routes.
 */
export default function CustomTripPage() {
  const { t } = useTranslation();
  const { user, setShowLoginModal } = useAuth();
  const queryClient = useQueryClient();
  const [sentRef, setSentRef] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    destinationSlug: '',
    startLocation: '',
    startDate: '',
    endDate: '',
    guestsCount: 2,
    budgetMaxMad: '',
    note: '',
  });

  const { data: availability } = useQuery({
    queryKey: ['custom-trips-availability'],
    queryFn: async () => {
      try {
        await apiClient.get('/custom-trips/requests/mine');
        return 'on' as const;
      } catch {
        return 'off' as const;
      }
    },
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/custom-trips/requests', {
        title: form.title,
        description: form.description || undefined,
        destinationSlug: form.destinationSlug || undefined,
        startLocation: form.startLocation || undefined,
        startDate: form.startDate,
        endDate: form.endDate,
        guestsCount: form.guestsCount,
        budgetMaxMad: form.budgetMaxMad || undefined,
        note: form.note || undefined,
      });
      return response.data;
    },
    onSuccess: async (data) => {
      setSentRef((data as { publicRef?: string })?.publicRef ?? '');
      await queryClient.invalidateQueries({ queryKey: ['my-custom-trip-requests'] });
    },
  });

  const set = (key: string, value: string | number) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="min-h-screen bg-muted/20 pb-24">
      <div className="mx-auto max-w-3xl px-6 pt-32">
        <h1 className="text-3xl font-black font-display text-foreground">{t('customTrip.title')}</h1>
        <p className="mt-3 text-muted-foreground leading-7">{t('customTrip.subtitle')}</p>

        {availability === 'off' ? (
          <div className="mt-10 rounded-3xl border border-border bg-card p-8 text-center" data-testid="custom-trip-unavailable">
            <p className="font-semibold text-foreground">{t('customTrip.unavailable')}</p>
          </div>
        ) : (
          <form
            className="mt-10 space-y-5 rounded-3xl border border-border bg-card p-8"
            onSubmit={(event) => {
              event.preventDefault();
              if (!user) {
                setShowLoginModal(true);
                return;
              }
              createMutation.mutate();
            }}
          >
            <div>
              <label htmlFor="ct-title" className="text-sm font-bold text-foreground">{t('customTrip.tripTitle')}</label>
              <input id="ct-title" required maxLength={200} value={form.title} onChange={(e) => set('title', e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label htmlFor="ct-description" className="text-sm font-bold text-foreground">{t('customTrip.description')}</label>
              <textarea id="ct-description" rows={4} maxLength={4000} value={form.description} onChange={(e) => set('description', e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="ct-destination" className="text-sm font-bold text-foreground">{t('customTrip.destination')}</label>
                <select id="ct-destination" value={form.destinationSlug} onChange={(e) => set('destinationSlug', e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm">
                  <option value="">—</option>
                  {BETA_DESTINATIONS.map((destination) => (
                    <option key={destination.slug} value={destination.slug}>{t(`search.destinationNames.${destination.slug}`)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="ct-start-location" className="text-sm font-bold text-foreground">{t('customTrip.startLocation')}</label>
                <input id="ct-start-location" maxLength={200} value={form.startLocation} onChange={(e) => set('startLocation', e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm" />
              </div>
              <div>
                <label htmlFor="ct-start" className="text-sm font-bold text-foreground">{t('customTrip.startDate')}</label>
                <input id="ct-start" type="date" required value={form.startDate} onChange={(e) => set('startDate', e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm" />
              </div>
              <div>
                <label htmlFor="ct-end" className="text-sm font-bold text-foreground">{t('customTrip.endDate')}</label>
                <input id="ct-end" type="date" required value={form.endDate} onChange={(e) => set('endDate', e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm" />
              </div>
              <div>
                <label htmlFor="ct-guests" className="text-sm font-bold text-foreground">{t('customTrip.guests')}</label>
                <input id="ct-guests" type="number" min={1} max={50} value={form.guestsCount} onChange={(e) => set('guestsCount', Number(e.target.value))} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm" />
              </div>
              <div>
                <label htmlFor="ct-budget" className="text-sm font-bold text-foreground">{t('customTrip.budget')}</label>
                <input id="ct-budget" inputMode="decimal" placeholder="3000.00" value={form.budgetMaxMad} onChange={(e) => set('budgetMaxMad', e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm" />
              </div>
            </div>
            <div>
              <label htmlFor="ct-note" className="text-sm font-bold text-foreground">{t('customTrip.note')}</label>
              <textarea id="ct-note" rows={2} maxLength={1000} value={form.note} onChange={(e) => set('note', e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm" />
            </div>
            {sentRef ? (
              <p className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-700 dark:text-emerald-300" role="status">
                {t('customTrip.sent', { ref: sentRef })}
              </p>
            ) : null}
            {createMutation.isError ? (
              <p className="text-sm font-semibold text-rose-600" role="alert">{t('customTrip.unavailable')}</p>
            ) : null}
            <button type="submit" disabled={createMutation.isPending} className="w-full rounded-xl bg-deep-blue py-3.5 text-base font-bold text-white disabled:opacity-50">
              {t('customTrip.submit')}
            </button>
          </form>
        )}

        {user ? <MyCustomTripRequests /> : null}
      </div>
    </div>
  );
}
