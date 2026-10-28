'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Calendar, RotateCcw } from 'lucide-react';
import { Card } from '@ouiboo/ui';
import { useTranslation } from 'react-i18next';
import '../lib/i18n';

/** #444 (Council P2-05): one row of GET /bookings/rebooking-suggestions. */
export interface RebookingSuggestionItem {
    tripId: string;
    title: string;
    image: string | null;
    agencyId: string;
    companyName: string;
    previousBookingsWithAgency: number;
    sessionId: string;
    startDate: string;
    endDate: string;
    price: string;
    currency: string;
    availableSeats: number;
}

/**
 * #444 (Council P2-05): the rebooking-value surface. After a first
 * trip, a traveller holds the agency contacts and bank details by
 * design — the platform answer is to make the next booking here the
 * easiest one: new departures from agencies the traveller already
 * knows, with the relationship made visible. Renders nothing when
 * there is nothing to suggest (no relationship, or no upcoming
 * bookable session), so it never fills the page with noise.
 */
export function RebookingSuggestions({ suggestions }: { suggestions: RebookingSuggestionItem[] }) {
    const { t, i18n } = useTranslation();

    if (!suggestions || suggestions.length === 0) {
        return null;
    }

    return (
        <section aria-label={t('rebooking.title')} className="mt-12">
            <div className="mb-6">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <RotateCcw className="h-4 w-4 text-sunset-orange" /> {t('rebooking.title')}
                </p>
                <p className="mt-2 text-sm text-muted-foreground max-w-2xl">{t('rebooking.subtitle')}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {suggestions.map((suggestion) => {
                    const start = new Date(suggestion.startDate);
                    const dateLabel = Number.isNaN(start.getTime())
                        ? suggestion.startDate
                        : start.toLocaleDateString(i18n.language, { day: '2-digit', month: 'short', year: 'numeric' });
                    return (
                        <Card key={suggestion.sessionId} className="rounded-3xl border border-border shadow-sm bg-card overflow-hidden">
                            <div className="flex">
                                {suggestion.image ? (
                                    <div className="relative w-28 shrink-0">
                                        <Image
                                            src={suggestion.image}
                                            alt={suggestion.title}
                                            className="absolute inset-0 w-full h-full object-cover"
                                            fill
                                            sizes="7rem"
                                            unoptimized={suggestion.image.startsWith('http')}
                                        />
                                    </div>
                                ) : null}
                                <div className="p-5 space-y-2 min-w-0">
                                    <p className="font-bold text-foreground truncate">{suggestion.title}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {t('rebooking.withAgency', { agency: suggestion.companyName })}
                                        {' · '}
                                        {t('rebooking.tripsBooked', { count: suggestion.previousBookingsWithAgency })}
                                    </p>
                                    <p className="text-sm text-muted-foreground inline-flex items-center gap-2">
                                        <Calendar className="h-4 w-4" /> {dateLabel}
                                        {' · '}
                                        {t('rebooking.from', { price: suggestion.price, currency: suggestion.currency })}
                                    </p>
                                    <Link
                                        href={`/trip/${suggestion.tripId}`}
                                        className="inline-flex text-sm font-black text-sunset-orange hover:text-orange-600"
                                    >
                                        {t('rebooking.viewTrip')}
                                    </Link>
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>
        </section>
    );
}
