'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@ouiboo/ui';
import { apiClient } from '@/lib/api-client';

type AgencyQuoteRequest = {
    id: string;
    templateId: string;
    requestedStartDate: string;
    requestedEndDate: string;
    guestsCount: number;
    note?: string | null;
    status: string;
    quotedTotalAmount?: string | null;
    quotedCurrency: string;
    quoteNote?: string | null;
    quotedAt?: string | null;
    acceptedAt?: string | null;
    template?: { id: string; title: string; startLocation: string } | null;
    traveler?: { email: string; name?: string | null } | null;
};

/**
 * #682 (Council S6): the agency side of the firm-quote flow. Reply to a
 * traveller's dates/party request within 48h with ONE firm total in
 * MAD TTC (the trip's structured cancellation scale rides along
 * server-side) — or decline. An accepted quote is final: the traveller
 * sees the quote, the scale and the acceptance timestamp snapshotted
 * exactly as sent here. No payment step follows in beta.
 */
export default function AgencyQuotesPage() {
    const { t, i18n } = useTranslation();
    const queryClient = useQueryClient();
    const [amounts, setAmounts] = useState<Record<string, string>>({});
    const [notes, setNotes] = useState<Record<string, string>>({});
    const [errorId, setErrorId] = useState<string | null>(null);

    const { data: requests = [], isLoading } = useQuery<AgencyQuoteRequest[]>({
        queryKey: ['agency-quote-requests'],
        queryFn: async () => {
            const response = await apiClient.get('/quote-requests/agency');
            return response.data as AgencyQuoteRequest[];
        },
    });

    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['agency-quote-requests'] });

    const quoteMutation = useMutation({
        mutationFn: async (id: string) => {
            await apiClient.patch(`/quote-requests/${id}/quote`, {
                totalAmount: amounts[id],
                note: notes[id]?.trim() || undefined,
            });
        },
        onSuccess: async () => { setErrorId(null); await invalidate(); },
        onError: (_e, id) => setErrorId(id),
    });

    const declineMutation = useMutation({
        mutationFn: async (id: string) => {
            await apiClient.patch(`/quote-requests/${id}/decline`);
        },
        onSuccess: async () => { setErrorId(null); await invalidate(); },
        onError: (_e, id) => setErrorId(id),
    });

    const formatDate = (value: string) =>
        new Intl.DateTimeFormat(i18n.language || 'en', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));

    return (
        <div className="space-y-6" data-testid="agency-quotes-page">
            <div>
                <h1 className="text-3xl font-bold text-foreground">{t('quotes.title')}</h1>
                <p className="mt-2 text-sm text-muted-foreground max-w-3xl">{t('quotes.subtitle')}</p>
            </div>

            {isLoading ? (
                <p className="text-sm text-muted-foreground">{t('quotes.loading')}</p>
            ) : requests.length === 0 ? (
                <Card className="border border-border bg-card shadow-sm">
                    <CardContent className="p-6 text-sm text-muted-foreground">{t('quotes.empty')}</CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {requests.map((request) => (
                        <Card key={request.id} className="border border-border bg-card shadow-sm">
                            <CardContent className="p-6 space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="font-bold text-foreground">{request.template?.title || request.templateId}</p>
                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-muted">
                                        {t(`quotes.status.${request.status}`, { defaultValue: request.status })}
                                    </span>
                                </div>
                                <div className="text-sm text-muted-foreground space-y-1">
                                    <p>{t('quotes.dates')}: {formatDate(request.requestedStartDate)} → {formatDate(request.requestedEndDate)} · {t('quotes.guests', { count: request.guestsCount })}</p>
                                    <p>{t('quotes.traveller')}: {request.traveler?.name || request.traveler?.email}</p>
                                    {request.note && <p>{request.note}</p>}
                                </div>

                                {request.status === 'PENDING' && (
                                    <div className="space-y-3 pt-2">
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <label className="space-y-1 text-xs font-bold uppercase tracking-wider text-foreground">
                                                {t('quotes.totalLabel')}
                                                <input
                                                    type="text"
                                                    inputMode="decimal"
                                                    value={amounts[request.id] ?? ''}
                                                    onChange={(e) => setAmounts((prev) => ({ ...prev, [request.id]: e.target.value }))}
                                                    placeholder={t('quotes.totalPlaceholder')}
                                                    className="w-full h-11 rounded-xl border border-border bg-background px-3 text-sm font-medium normal-case tracking-normal"
                                                />
                                            </label>
                                            <label className="space-y-1 text-xs font-bold uppercase tracking-wider text-foreground">
                                                {t('quotes.noteLabel')}
                                                <input
                                                    type="text"
                                                    value={notes[request.id] ?? ''}
                                                    onChange={(e) => setNotes((prev) => ({ ...prev, [request.id]: e.target.value }))}
                                                    placeholder={t('quotes.notePlaceholder')}
                                                    maxLength={1000}
                                                    className="w-full h-11 rounded-xl border border-border bg-background px-3 text-sm font-medium normal-case tracking-normal"
                                                />
                                            </label>
                                        </div>
                                        <div className="flex flex-wrap gap-3">
                                            <button
                                                type="button"
                                                disabled={!amounts[request.id] || quoteMutation.isPending}
                                                onClick={() => quoteMutation.mutate(request.id)}
                                                className="h-11 px-5 rounded-xl bg-primary text-primary-foreground text-xs font-black uppercase tracking-widest disabled:opacity-50"
                                            >
                                                {t('quotes.send')}
                                            </button>
                                            <button
                                                type="button"
                                                disabled={declineMutation.isPending}
                                                onClick={() => declineMutation.mutate(request.id)}
                                                className="h-11 px-5 rounded-xl border border-border text-xs font-black uppercase tracking-widest"
                                            >
                                                {t('quotes.decline')}
                                            </button>
                                        </div>
                                        {errorId === request.id && (
                                            <p className="text-sm font-semibold text-danger">{t('quotes.error')}</p>
                                        )}
                                    </div>
                                )}

                                {(request.status === 'QUOTED' || request.status === 'ACCEPTED') && request.quotedTotalAmount && (
                                    <p className="text-sm font-semibold text-foreground">
                                        {t('quotes.totalLabel')}: {request.quotedTotalAmount} MAD
                                        {request.quoteNote ? ` · ${request.quoteNote}` : ''}
                                    </p>
                                )}
                                {request.status === 'ACCEPTED' && request.acceptedAt && (
                                    <p className="text-sm font-semibold text-success">
                                        {t('quotes.acceptedOn', { date: formatDate(request.acceptedAt) })}
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
