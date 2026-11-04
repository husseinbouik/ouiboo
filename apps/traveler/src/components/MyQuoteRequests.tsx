'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { QuoteRequest } from '@ouiboo/types';
import { apiClient } from '@/lib/api-client';
import { QuoteRequestRow } from '@/components/QuoteRequestPanel';
import '../lib/i18n';

/**
 * #682 (Council S6): the traveller's firm-quote requests on the
 * bookings page — firm totals, scales, and the immutable acceptance
 * snapshots render back here. Renders nothing until a request exists.
 */
export function MyQuoteRequests() {
    const { t } = useTranslation();
    const queryClient = useQueryClient();

    const { data: requests = [] } = useQuery<QuoteRequest[]>({
        queryKey: ['my-quote-requests'],
        queryFn: async () => {
            const response = await apiClient.get('/quote-requests/mine');
            return response.data as QuoteRequest[];
        },
    });

    const acceptMutation = useMutation({
        mutationFn: async (id: string) => {
            await apiClient.patch(`/quote-requests/${id}/accept`);
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['my-quote-requests'] });
        },
    });

    if (requests.length === 0) return null;

    return (
        <section className="mt-12 space-y-4" data-testid="my-quote-requests">
            <h2 className="text-2xl font-black font-display tracking-tight text-foreground">{t('quotes.allTitle')}</h2>
            <div className="space-y-3">
                {requests.map((request) => (
                    <div key={request.id}>
                        {request.template?.title && (
                            <p className="mb-1 text-sm font-bold text-foreground">{request.template.title}</p>
                        )}
                        <QuoteRequestRow
                            request={request}
                            onAccept={(id) => acceptMutation.mutate(id)}
                            accepting={acceptMutation.isPending}
                        />
                    </div>
                ))}
            </div>
        </section>
    );
}
