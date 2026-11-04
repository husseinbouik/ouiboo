'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@ouiboo/ui';
import { apiClient } from '@/lib/api-client';

type AgencyCustomTripView = {
    id: string;
    publicRef: string;
    title: string;
    description?: string | null;
    destinationSlug?: string | null;
    startLocation?: string | null;
    requestedStartDate: string;
    requestedEndDate: string;
    guestsCount: number;
    budgetMaxMad?: string | null;
    note?: string | null;
    status: string;
    expiresAt: string;
    offerCount: number;
    myOffer?: {
        id: string;
        quotedTotalAmount: string;
        quotedCurrency: string;
        quoteNote?: string | null;
        status: string;
    } | null;
    traveler?: { name: string; email: string; phoneNumber?: string | null } | null;
};

/**
 * #684 (Council S6): the agency inbox for custom-trip requests.
 * Requests are PSEUDONYMISED — no traveller identity is ever shown
 * here; the accepted agency (and only it) receives the traveller's
 * contact in the detail view after acceptance. Quotes are transmitted
 * to the traveller unchanged. The whole page presents as unavailable
 * while CUSTOM_TRIP_REQUESTS_ENABLED is off (the API 404s).
 */
export default function AgencyCustomRequestsPage() {
    const { t, i18n } = useTranslation();
    const queryClient = useQueryClient();
    const [amounts, setAmounts] = useState<Record<string, string>>({});
    const [notes, setNotes] = useState<Record<string, string>>({});
    const [openId, setOpenId] = useState<string | null>(null);

    const { data, isError } = useQuery<{ available: boolean; requests: AgencyCustomTripView[] }>({
        queryKey: ['agency-custom-trip-requests'],
        queryFn: async () => {
            try {
                const response = await apiClient.get('/custom-trips/requests/agency-inbox');
                return { available: true, requests: response.data as AgencyCustomTripView[] };
            } catch {
                return { available: false, requests: [] };
            }
        },
        retry: false,
    });

    const detail = useQuery<AgencyCustomTripView>({
        queryKey: ['agency-custom-trip-request', openId],
        enabled: Boolean(openId),
        queryFn: async () => {
            const response = await apiClient.get(`/custom-trips/requests/${openId}/agency-view`);
            return response.data as AgencyCustomTripView;
        },
    });

    const invalidate = async () => {
        await queryClient.invalidateQueries({ queryKey: ['agency-custom-trip-requests'] });
        await queryClient.invalidateQueries({ queryKey: ['agency-custom-trip-request'] });
    };

    const quoteMutation = useMutation({
        mutationFn: async (requestId: string) => {
            await apiClient.post(`/custom-trips/requests/${requestId}/offers`, {
                quotedTotalAmount: amounts[requestId],
                quoteNote: notes[requestId] || undefined,
            });
        },
        onSuccess: invalidate,
    });

    const withdrawMutation = useMutation({
        mutationFn: async (offerId: string) => {
            await apiClient.patch(`/custom-trips/offers/${offerId}/withdraw`);
        },
        onSuccess: invalidate,
    });

    if (!isError && data && !data.available) {
        return (
            <div className="p-8" data-testid="custom-requests-unavailable">
                <h1 className="text-2xl font-bold text-foreground">{t('batchF.customRequests')}</h1>
                <p className="mt-3 text-muted-foreground">{t('batchF.customUnavailable')}</p>
            </div>
        );
    }

    const requests = data?.requests ?? [];
    const detailData = detail.data && detail.data.id === openId ? detail.data : null;

    return (
        <div className="p-8 space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-foreground">{t('batchF.customRequests')}</h1>
                <p className="mt-1 text-sm text-muted-foreground">{t('batchF.customRequestsHelp')}</p>
            </div>

            {requests.length === 0 ? (
                <p className="text-muted-foreground">{t('batchF.noCustomRequests')}</p>
            ) : (
                <div className="space-y-4">
                    {requests.map((request) => {
                        const view = detailData && detailData.id === request.id ? detailData : request;
                        return (
                            <Card key={request.id} className="border border-border shadow-sm bg-card">
                                <CardContent className="p-6 space-y-3">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <h2 className="font-bold text-foreground">{view.title}</h2>
                                        <span className="text-xs font-semibold text-muted-foreground">
                                            {t('batchF.requestRef')}: {view.publicRef} · {view.status}
                                        </span>
                                    </div>
                                    {view.description ? <p className="text-sm text-muted-foreground">{view.description}</p> : null}
                                    <p className="text-sm text-muted-foreground">
                                        {new Date(view.requestedStartDate).toLocaleDateString(i18n.language)} → {new Date(view.requestedEndDate).toLocaleDateString(i18n.language)}
                                        {' · '}{view.guestsCount}
                                        {view.startLocation ? ` · ${view.startLocation}` : ''}
                                        {view.budgetMaxMad ? ` · ≤ ${view.budgetMaxMad} MAD` : ''}
                                    </p>
                                    {view.note ? <p className="text-sm text-muted-foreground">{view.note}</p> : null}

                                    {view.traveler ? (
                                        <div className="rounded-xl bg-muted/50 px-4 py-3 text-sm" data-testid="traveller-contact">
                                            <p className="font-semibold text-foreground">{t('batchF.travellerContact')}</p>
                                            <p className="text-muted-foreground">
                                                {view.traveler.name} · {view.traveler.email}
                                                {view.traveler.phoneNumber ? ` · ${view.traveler.phoneNumber}` : ''}
                                            </p>
                                        </div>
                                    ) : null}

                                    {view.myOffer ? (
                                        <div className="space-y-2">
                                            <p className="text-sm font-semibold text-foreground">
                                                {t('batchF.yourQuote')}: {view.myOffer.quotedTotalAmount} {view.myOffer.quotedCurrency} ({view.myOffer.status})
                                            </p>
                                            {view.myOffer.status === 'QUOTED' && view.status !== 'CONVERTED' ? (
                                                <button
                                                    type="button"
                                                    disabled={withdrawMutation.isPending}
                                                    onClick={() => withdrawMutation.mutate(view.myOffer!.id)}
                                                    className="text-sm font-semibold text-muted-foreground hover:text-foreground"
                                                >
                                                    {t('batchF.withdraw')}
                                                </button>
                                            ) : null}
                                        </div>
                                    ) : view.status === 'PENDING' || view.status === 'QUOTED' ? (
                                        <div className="flex flex-wrap items-end gap-3">
                                            <label className="space-y-1">
                                                <span className="text-xs font-semibold text-muted-foreground">{t('batchF.quoteTotal')}</span>
                                                <input
                                                    inputMode="decimal"
                                                    placeholder="4500.00"
                                                    value={amounts[view.id] ?? ''}
                                                    onChange={(e) => setAmounts((prev) => ({ ...prev, [view.id]: e.target.value }))}
                                                    className="block h-10 rounded-lg border border-border bg-background px-3 text-sm"
                                                />
                                            </label>
                                            <label className="space-y-1 grow">
                                                <span className="text-xs font-semibold text-muted-foreground">{t('batchF.quoteNote')}</span>
                                                <input
                                                    value={notes[view.id] ?? ''}
                                                    onChange={(e) => setNotes((prev) => ({ ...prev, [view.id]: e.target.value }))}
                                                    className="block h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                                                />
                                            </label>
                                            <button
                                                type="button"
                                                disabled={quoteMutation.isPending || !amounts[view.id]}
                                                onClick={() => quoteMutation.mutate(view.id)}
                                                className="h-10 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50"
                                            >
                                                {t('batchF.quote')}
                                            </button>
                                        </div>
                                    ) : null}

                                    {openId !== view.id ? (
                                        <button type="button" onClick={() => setOpenId(view.id)} className="text-sm font-semibold text-primary hover:underline">
                                            {t('batchF.viewDetails')}
                                        </button>
                                    ) : null}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
