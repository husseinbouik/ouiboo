'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button } from '@ouiboo/ui';
import { formatCurrency } from '@ouiboo/utils';
import type { QuoteRequest } from '@ouiboo/types';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/components/AuthContext';
import '../lib/i18n';

/**
 * #682 (Council S6): the catalogue firm-quote panel on a published
 * trip. The traveller submits dates/party; the agency replies within
 * 48h with a firm total in MAD TTC + its cancellation scale; the
 * traveller accepts and the acceptance is snapshotted server-side.
 * No indicative prices anywhere (the request carries no amount), and
 * in beta an accepted quote leads to NO payment step — it is the
 * booking intent the agency confirms directly with the traveller.
 */
export function QuoteRequestRow({ request, onAccept, accepting }: {
    request: QuoteRequest;
    onAccept?: (id: string) => void;
    accepting?: boolean;
}) {
    const { t, i18n } = useTranslation();
    const snapshot = request.acceptedSnapshot;
    const scale = snapshot?.cancellationScale ?? request.cancellationScale;
    const formatDate = (value: string) =>
        new Intl.DateTimeFormat(i18n.language || 'en', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));

    return (
        <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 space-y-2 text-sm" data-testid="quote-request-row">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-foreground">
                    {formatDate(request.requestedStartDate)} → {formatDate(request.requestedEndDate)}
                </p>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-card border border-border">
                    {t(`quotes.status.${request.status}`, { defaultValue: request.status })}
                </span>
            </div>
            <p className="text-muted-foreground">{t('quotes.guestsLine', { count: request.guestsCount })}</p>
            {request.template?.agency?.companyName && (
                <p className="text-muted-foreground">{request.template.agency.companyName}</p>
            )}
            {(request.status === 'QUOTED' || request.status === 'ACCEPTED') && request.quotedTotalAmount && (
                <div className="space-y-1">
                    <p className="font-black text-foreground">
                        {t('quotes.firmTotal')}: {formatCurrency(request.quotedTotalAmount, 'MAD', i18n.language)}
                    </p>
                    {request.quoteNote && <p className="text-muted-foreground">{t('quotes.agencyNote')}: {request.quoteNote}</p>}
                    {scale?.bands && (
                        <div>
                            <p className="font-semibold text-foreground">{t('quotes.cancellationScale')}</p>
                            <ul className="text-muted-foreground">
                                {scale.bands.map((band) => (
                                    <li key={band.minDaysBeforeStart}>
                                        {t('quotes.bandLine', { days: band.minDaysBeforeStart, percent: band.refundPercent })}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
            {request.status === 'QUOTED' && onAccept && (
                <Button
                    onClick={() => onAccept(request.id)}
                    disabled={accepting}
                    className="h-11 px-5 rounded-xl bg-sunset-orange hover:bg-orange-600 border-none text-xs font-black uppercase tracking-widest"
                >
                    {t('quotes.accept')}
                </Button>
            )}
            {request.status === 'ACCEPTED' && snapshot && (
                <div className="rounded-xl border border-success/20 bg-success/10 px-3 py-2 font-semibold text-success">
                    <p>{t('quotes.acceptedOn', { date: formatDate(snapshot.acceptedAt) })}</p>
                    <p className="text-muted-foreground font-normal">{t('quotes.acceptedNote')}</p>
                </div>
            )}
        </div>
    );
}

export function QuoteRequestPanel({ templateId }: { templateId: string }) {
    const { t } = useTranslation();
    const { user, setShowLoginModal } = useAuth();
    const queryClient = useQueryClient();
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [guestsCount, setGuestsCount] = useState(2);
    const [note, setNote] = useState('');
    const [sent, setSent] = useState(false);
    const [error, setError] = useState(false);

    const { data: mine } = useQuery<QuoteRequest[]>({
        enabled: Boolean(user),
        queryKey: ['my-quote-requests', templateId],
        queryFn: async () => {
            const response = await apiClient.get('/quote-requests/mine');
            return (response.data as QuoteRequest[]).filter((r) => r.templateId === templateId);
        },
    });

    const submitMutation = useMutation({
        mutationFn: async () => {
            await apiClient.post('/quote-requests', {
                templateId,
                startDate,
                endDate: endDate || startDate,
                guestsCount,
                note: note.trim() || undefined,
            });
        },
        onSuccess: async () => {
            setSent(true);
            setError(false);
            await queryClient.invalidateQueries({ queryKey: ['my-quote-requests'] });
        },
        onError: () => setError(true),
    });

    const acceptMutation = useMutation({
        mutationFn: async (id: string) => {
            await apiClient.patch(`/quote-requests/${id}/accept`);
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['my-quote-requests'] });
        },
    });

    return (
        <div className="bg-card/80 backdrop-blur-xl border border-border/50 shadow-xl rounded-4xl p-8 space-y-5" data-testid="quote-request-panel">
            <div>
                <h3 className="text-xl font-black font-display text-foreground">{t('quotes.title')}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{t('quotes.subtitle')}</p>
            </div>

            {!user ? (
                <Button
                    onClick={() => setShowLoginModal(true)}
                    className="w-full h-12 rounded-xl font-bold bg-deep-blue dark:bg-sunset-orange text-white"
                >
                    {t('quotes.signIn')}
                </Button>
            ) : (
                <>
                    <div className="grid grid-cols-2 gap-3">
                        <label className="space-y-1 text-xs font-bold uppercase tracking-wider text-foreground">
                            {t('quotes.startDate')}
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full h-11 rounded-xl border border-border bg-background px-3 text-sm font-medium normal-case tracking-normal"
                            />
                        </label>
                        <label className="space-y-1 text-xs font-bold uppercase tracking-wider text-foreground">
                            {t('quotes.endDate')}
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full h-11 rounded-xl border border-border bg-background px-3 text-sm font-medium normal-case tracking-normal"
                            />
                        </label>
                    </div>
                    <label className="block space-y-1 text-xs font-bold uppercase tracking-wider text-foreground">
                        {t('quotes.guests')}
                        <input
                            type="number"
                            min={1}
                            max={50}
                            value={guestsCount}
                            onChange={(e) => setGuestsCount(Number(e.target.value))}
                            className="w-full h-11 rounded-xl border border-border bg-background px-3 text-sm font-medium normal-case tracking-normal"
                        />
                    </label>
                    <label className="block space-y-1 text-xs font-bold uppercase tracking-wider text-foreground">
                        {t('quotes.note')}
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            maxLength={1000}
                            placeholder={t('quotes.notePlaceholder')}
                            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium normal-case tracking-normal"
                            rows={2}
                        />
                    </label>
                    <Button
                        disabled={!startDate || submitMutation.isPending}
                        onClick={() => submitMutation.mutate()}
                        className="w-full h-12 rounded-xl font-bold bg-deep-blue dark:bg-sunset-orange text-white disabled:opacity-50"
                    >
                        {t('quotes.submit')}
                    </Button>
                    {sent && (
                        <p className="rounded-xl border border-success/20 bg-success/10 px-3 py-2 text-sm font-semibold text-success">
                            {t('quotes.sent')}
                        </p>
                    )}
                    {error && (
                        <p className="text-sm font-semibold text-danger">{t('quotes.error')}</p>
                    )}
                    {mine && mine.length > 0 && (
                        <div className="space-y-3 pt-2">
                            <p className="text-xs font-bold uppercase tracking-wider text-foreground">{t('quotes.yourRequests')}</p>
                            {mine.map((request) => (
                                <QuoteRequestRow
                                    key={request.id}
                                    request={request}
                                    onAccept={(id) => acceptMutation.mutate(id)}
                                    accepting={acceptMutation.isPending}
                                />
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
