'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { CustomTripRequest } from '@ouiboo/types';
import { apiClient } from '@/lib/api-client';
import '../lib/i18n';

/**
 * #684 (Council S6): the traveller's custom-trip requests on the
 * bookings page — offers with firm totals transmitted unchanged from
 * the agencies, acceptance, and the converted private trip link.
 * Renders NOTHING while the feature flag is off (the API 404s) or
 * when the traveller has no requests.
 */
export function MyCustomTripRequests() {
    const { t, i18n } = useTranslation();
    const queryClient = useQueryClient();

    const { data: requests = [] } = useQuery<CustomTripRequest[]>({
        queryKey: ['my-custom-trip-requests'],
        queryFn: async () => {
            try {
                const response = await apiClient.get('/custom-trips/requests/mine');
                return response.data as CustomTripRequest[];
            } catch {
                // Flag OFF (404) or unavailable — the section stays hidden.
                return [];
            }
        },
        retry: false,
    });

    const acceptMutation = useMutation({
        mutationFn: async ({ requestId, offerId }: { requestId: string; offerId: string }) => {
            await apiClient.patch(`/custom-trips/requests/${requestId}/accept/${offerId}`);
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['my-custom-trip-requests'] });
        },
    });

    const cancelMutation = useMutation({
        mutationFn: async (requestId: string) => {
            await apiClient.patch(`/custom-trips/requests/${requestId}/cancel`);
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['my-custom-trip-requests'] });
        },
    });

    if (requests.length === 0) return null;

    return (
        <section className="mt-12 space-y-4" data-testid="my-custom-trip-requests">
            <h2 className="text-2xl font-black font-display tracking-tight text-foreground">{t('customTrip.mine')}</h2>
            <div className="space-y-3">
                {requests.map((request) => (
                    <div key={request.id} className="rounded-3xl border border-border bg-card p-6 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <h3 className="font-bold text-foreground">{request.title}</h3>
                            <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-bold">
                                {t(`customTrip.statuses.${request.status}`)} · {request.publicRef}
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {new Date(request.requestedStartDate).toLocaleDateString(i18n.language)} → {new Date(request.requestedEndDate).toLocaleDateString(i18n.language)}
                            {' · '}{t('customTrip.expires', { date: new Date(request.expiresAt).toLocaleDateString(i18n.language) })}
                        </p>
                        {request.status === 'CONVERTED' && request.convertedTemplateId ? (
                            <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">{t('customTrip.converted')}</p>
                                <Link href={`/trip/${request.convertedTemplateId}`} className="text-sm font-bold text-sunset-orange hover:underline">
                                    {t('customTrip.viewTrip')}
                                </Link>
                            </div>
                        ) : null}
                        {(request.offers ?? []).length > 0 ? (
                            <ul className="space-y-2">
                                {(request.offers ?? []).map((offer) => (
                                    <li key={offer.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-muted/40 px-4 py-3">
                                        <div>
                                            <p className="text-sm font-bold text-foreground">
                                                {t('customTrip.quoteBy', { agency: offer.agency?.companyName ?? '' })}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {t('customTrip.quoteTotal')}: {offer.quotedTotalAmount} {offer.quotedCurrency}
                                            </p>
                                            {offer.quoteNote ? <p className="text-xs text-muted-foreground">{offer.quoteNote}</p> : null}
                                        </div>
                                        {request.status === 'QUOTED' && offer.status === 'QUOTED' ? (
                                            <button
                                                type="button"
                                                disabled={acceptMutation.isPending}
                                                onClick={() => acceptMutation.mutate({ requestId: request.id, offerId: offer.id })}
                                                className="rounded-xl bg-deep-blue px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                                            >
                                                {t('customTrip.accept')}
                                            </button>
                                        ) : null}
                                    </li>
                                ))}
                            </ul>
                        ) : request.status === 'PENDING' || request.status === 'QUOTED' ? (
                            <p className="text-sm text-muted-foreground">{t('customTrip.noOffers')}</p>
                        ) : null}
                        {(request.status === 'PENDING' || request.status === 'QUOTED') ? (
                            <button
                                type="button"
                                disabled={cancelMutation.isPending}
                                onClick={() => cancelMutation.mutate(request.id)}
                                className="text-sm font-semibold text-muted-foreground hover:text-foreground"
                            >
                                {t('customTrip.cancel')}
                            </button>
                        ) : null}
                    </div>
                ))}
            </div>
        </section>
    );
}
