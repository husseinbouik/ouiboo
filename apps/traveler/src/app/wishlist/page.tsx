'use client';

import React, { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { TripCard } from '@/components/TripCard';
import { Button, Badge, EmptyState, TripCardSkeletonGrid } from '@ouiboo/ui';
import { ArrowRight, Calendar, X } from 'lucide-react';
import { useAuth } from '@/components/AuthContext';
import { useTranslation } from 'react-i18next';
import { nextBookableSession, type CurationSession, type CurationTrip } from '@/lib/curation';
import { cn } from '@ouiboo/ui/utils';

type WishlistTrip = {
  category?: string;
  durationDays: number;
  id: string;
  images?: string[];
  /** #962: false marks a save whose trip was deactivated — the page
   * renders a 'No longer available' tombstone, never a booking card. */
  isActive?: boolean;
  sessions?: Array<{
    availableSeats: number;
    id: string;
    price: number;
    startDate: string;
    status: string;
    currency?: string;
  }>;
  startLocation?: string;
  title: string;
};

type WishlistResponse = {
  items: WishlistTrip[];
  pages: number;
  total: number;
};

type RemovedSave = { trip: WishlistTrip; undoable: boolean };

type Entry = {
  trip: WishlistTrip;
  next: { session: CurationSession; spotsLeft: number | null } | null;
  removed: RemovedSave | null;
  unavailable: boolean;
};

function formatSessionDate(iso: string | null | undefined, language: string): string {
  if (!iso) return '';
  return new Intl.DateTimeFormat(language || 'en', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(iso));
}

/**
 * Item 17 (#963): the per-save status pill — BOOKING OPEN, or
 * FILLING UP · <N> SPOTS LEFT at ≤5 seats (the shared predicate's
 * precedence), each with its basis note. Fully-booked / session-less
 * saves read as plain text. NO toggles, NO alert language — the
 * watcher does not exist (#969, parked; Trust vetoes T1/T7 stand).
 */
function SaveStatus({ trip }: { trip: WishlistTrip }) {
  const { t, i18n } = useTranslation();
  const next = nextBookableSession(trip as unknown as CurationTrip);
  if (!next) {
    return (
      <p className="text-[13px] font-medium text-muted-foreground">{t('wishlistPage.noUpcoming')}</p>
    );
  }
  const date = formatSessionDate(next.session.startDate, i18n.language);
  const filling = next.spotsLeft !== null && next.spotsLeft <= 5;
  return (
    <div className="space-y-1">
      <span
        className={cn(
          'inline-flex rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide',
          filling ? 'bg-[#FEF3C7] text-[#B45309]' : 'bg-[#15803D] text-white',
        )}
      >
        {filling
          ? t('wishlistPage.fillingUp', { count: next.spotsLeft ?? 0 })
          : t('wishlistPage.bookingOpen')}
      </span>
      <p className="text-xs text-muted-foreground">
        {next.spotsLeft !== null
          ? t('wishlistPage.nextSessionBasis', {
              date,
              spots: t('wishlistPage.spotsOnSession', { count: next.spotsLeft }),
            })
          : t('wishlistPage.nextSessionBasisNoSpots', { date })}
      </p>
    </div>
  );
}

/**
 * Item 19 (#965): the removal tombstone — persistent, in place, with
 * a native Undo (labelled 'Undo removal of <title>') until dismissal
 * or navigation. Never a timed toast as the sole affordance.
 */
function RemovalTombstone({
  removed,
  onUndo,
  onDismiss,
}: {
  removed: RemovedSave;
  onUndo: () => void;
  onDismiss: () => void;
}) {
  const { t } = useTranslation();
  const title = removed.trip.title;
  return (
    <article
      className="flex flex-col justify-between rounded-3xl border border-dashed border-border bg-muted/40 p-5"
      aria-label={title}
    >
      <div>
        <h3 className="font-display text-[17px] font-bold text-foreground">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{t('wishlistPage.removedNote')}</p>
      </div>
      <div className="mt-4 flex items-center gap-2">
        {removed.undoable && (
          <Button type="button" variant="outline" onClick={onUndo} aria-label={t('wishlistPage.undoRemoval', { title })}>
            {t('common.undo')}
          </Button>
        )}
        <button
          type="button"
          onClick={onDismiss}
          aria-label={t('wishlistPage.dismissRemoval')}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}

/** Item 16 (#962): a deactivated save's row — no booking affordance,
 * just the fact and a way to clear the dead save. */
function UnavailableSaveRow({
  trip,
  onRemove,
}: {
  trip: WishlistTrip;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  return (
    <article
      className="flex flex-col justify-between rounded-3xl border border-border bg-muted/40 p-5"
      aria-label={trip.title}
    >
      <div>
        <h3 className="font-display text-[17px] font-bold text-foreground">{trip.title}</h3>
        <p className="mt-1 text-sm font-semibold text-muted-foreground">
          {t('wishlistPage.noLongerAvailable')}
        </p>
      </div>
      <div className="mt-4">
        <Button type="button" variant="outline" onClick={onRemove}>
          {t('wishlistPage.removeSave')}
        </Button>
      </div>
    </article>
  );
}

export default function WishlistPage() {
  const [page, setPage] = useState(1);
  const { user, isLoading: isAuthLoading } = useAuth();
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  // #965: removals leave a persistent tombstone (below) — this state
  // is the page's record of them; navigation discards it.
  const [removedSaves, setRemovedSaves] = useState<Map<string, RemovedSave>>(new Map());
  const [announcement, setAnnouncement] = useState('');

  const { data, isLoading } = useQuery<WishlistResponse>({
    queryKey: ['wishlist', page, i18n.language],
    queryFn: async () => {
      const res = await apiClient.get('/users/wishlist', { params: { page, limit: 20, locale: i18n.language } });
      return res.data;
    },
    placeholderData: keepPreviousData,
    enabled: Boolean(user),
  });

  const wishlist = useMemo(() => data?.items || [], [data]);
  const total = data?.total || 0;

  const invalidateWishlist = useCallback(
    (tripId?: string) => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      queryClient.invalidateQueries({ queryKey: ['wishlist-count'] });
      if (tripId) queryClient.invalidateQueries({ queryKey: ['wishlist-status', tripId] });
    },
    [queryClient],
  );

  const undoMutation = useMutation({
    mutationFn: async (tripId: string) => {
      await apiClient.post(`/users/wishlist/${tripId}`);
    },
    onSuccess: (_data, tripId) => {
      setRemovedSaves((prev) => {
        const next = new Map(prev);
        next.delete(tripId);
        return next;
      });
      invalidateWishlist(tripId);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (trip: WishlistTrip) => {
      await apiClient.delete(`/users/wishlist/${trip.id}`);
      return trip;
    },
    onSuccess: (trip) => {
      // A deactivated save cannot be re-added (the add endpoint
      // requires an ACTIVE trip), so its tombstone carries no Undo.
      setRemovedSaves((prev) => new Map(prev).set(trip.id, { trip, undoable: false }));
      setAnnouncement(t('wishlistPage.removedAnnouncement', { title: trip.title }));
      invalidateWishlist(trip.id);
    },
  });

  const handleWishlistToggle = useCallback(
    (tripId: string, next: boolean) => {
      if (next) return;
      const trip = wishlist.find((item) => item.id === tripId) ?? removedSaves.get(tripId)?.trip;
      if (!trip) return;
      setRemovedSaves((prev) => new Map(prev).set(tripId, { trip, undoable: true }));
      setAnnouncement(t('wishlistPage.removedAnnouncement', { title: trip.title }));
    },
    [wishlist, removedSaves, t],
  );

  const dismissRemoval = useCallback((tripId: string) => {
    setRemovedSaves((prev) => {
      const next = new Map(prev);
      next.delete(tripId);
      return next;
    });
  }, []);

  // Item 18 (#964): saves sorted by next session on load (client-side
  // over the loaded page — with more than a page of saves, later
  // pages sort within themselves; the server contract stays as is).
  // Removed saves stay in their group as tombstones until dismissed.
  const { upcoming, noUpcoming, unavailable } = useMemo(() => {
    const byId = new Map<string, WishlistTrip>();
    for (const item of wishlist) byId.set(item.id, item);
    for (const [id, removed] of removedSaves) {
      if (!byId.has(id)) byId.set(id, removed.trip);
    }
    const entries: Entry[] = [...byId.values()].map((trip) => {
      const unavailableEntry = trip.isActive === false;
      return {
        trip,
        next: unavailableEntry ? null : nextBookableSession(trip as unknown as CurationTrip),
        removed: removedSaves.get(trip.id) ?? null,
        unavailable: unavailableEntry,
      };
    });
    const startOf = (entry: Entry) => new Date(entry.next?.session.startDate ?? 0).getTime();
    return {
      upcoming: entries
        .filter((entry) => !entry.unavailable && entry.next)
        .sort((a, b) => startOf(a) - startOf(b) || a.trip.id.localeCompare(b.trip.id)),
      noUpcoming: entries.filter((entry) => !entry.unavailable && !entry.next),
      unavailable: entries.filter((entry) => entry.unavailable),
    };
  }, [wishlist, removedSaves]);

  const nextDeparture = upcoming.find((entry) => !entry.removed)?.next ?? upcoming[0]?.next ?? null;

  const renderEntry = (entry: Entry) => {
    if (entry.removed) {
      return (
        <RemovalTombstone
          key={entry.trip.id}
          removed={entry.removed}
          onUndo={() => undoMutation.mutate(entry.trip.id)}
          onDismiss={() => dismissRemoval(entry.trip.id)}
        />
      );
    }
    if (entry.unavailable) {
      return (
        <UnavailableSaveRow
          key={entry.trip.id}
          trip={entry.trip}
          onRemove={() => deleteMutation.mutate(entry.trip)}
        />
      );
    }
    return (
      <div key={entry.trip.id} className="flex flex-col gap-2">
        <TripCard trip={entry.trip} onWishlistToggle={handleWishlistToggle} />
        <SaveStatus trip={entry.trip} />
        {entry.next ? (
          // Growth's G-K4 condition (#964): the anchored action is
          // present, by name — 'See sessions →' (never 'Book now'
          // for a session-picker deep link, T11).
          <Link
            href={`/trip/${entry.trip.id}#booking-options`}
            className="inline-flex items-center gap-1.5 text-sm font-extrabold text-foreground transition-colors hover:text-sunset-orange-dark"
          >
            {t('wishlistPage.seeSessions')}
            <ArrowRight className={cn('h-4 w-4', i18n.language === 'ar' && 'rotate-180')} aria-hidden="true" />
          </Link>
        ) : (
          <Link
            href={`/trip/${entry.trip.id}`}
            className="inline-flex items-center gap-1.5 text-sm font-extrabold text-foreground transition-colors hover:text-sunset-orange-dark"
          >
            {t('wishlistPage.viewTrip')}
            <ArrowRight className={cn('h-4 w-4', i18n.language === 'ar' && 'rotate-180')} aria-hidden="true" />
          </Link>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background font-sans text-foreground pb-20">
      <div className="max-w-6xl mx-auto px-6 pt-32">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold">{t('wishlistPage.title')}</h1>
            {/* Item 17 (#963): the verbatim live-status header — the
                page's promises are exactly what it computes. */}
            <p className="text-muted-foreground mt-1">{t('wishlistPage.liveStatusTitle')}</p>
            <p className="text-muted-foreground">{t('wishlistPage.liveStatusNote')}</p>
          </div>
          <Badge className="bg-card/90 px-3 py-1 rounded-full text-sm font-bold">{total}</Badge>
        </div>

        {/* #965: the page's single removal announcement region. */}
        <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          {announcement}
        </div>

        {isAuthLoading || isLoading ? (
          <div role="status" aria-label={t('wishlistPage.loading')}>
            <TripCardSkeletonGrid count={6} />
            <span className="sr-only">{t('wishlistPage.loading')}</span>
          </div>
        ) : !user ? (
          <div className="text-center py-28 bg-card/70 rounded-2xl border border-dashed border-border">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold">{t('wishlistPage.signedOutTitle')}</h3>
            <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
              {t('wishlistPage.signedOutBody')}
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button asChild>
              <Link href="/login">{t('wishlistPage.signIn')}</Link>
            </Button>
              <Button asChild variant="outline">
              <Link href="/search">{t('wishlistPage.explore')}</Link>
            </Button>
            </div>
          </div>
        ) : wishlist.length === 0 && removedSaves.size === 0 ? (
          <EmptyState
            className="py-28"
            icon={<Calendar className="h-6 w-6" />}
            title={t('wishlistPage.emptyTitle')}
            description={t('wishlistPage.emptyBody')}
          />
        ) : (
          <>
            {/* Item 18 (#964): the navy summary bar — plain text:
                next departure + saved count, over the loaded page. */}
            <div className="mb-8 rounded-2xl bg-deep-blue px-5 py-3.5 text-sm font-semibold text-white">
              {[
                nextDeparture
                  ? t('wishlistPage.summaryNext', { date: formatSessionDate(nextDeparture.session.startDate, i18n.language) })
                  : t('wishlistPage.summaryNone'),
                t('wishlistPage.summarySaved', { count: total }),
              ].join(' · ')}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcoming.map(renderEntry)}
              {upcoming.length > 0 && noUpcoming.length > 0 && (
                <div className="col-span-full flex items-center gap-3" role="separator" aria-label={t('wishlistPage.noUpcomingDivider')}>
                  <span className="h-px flex-1 bg-border" aria-hidden="true" />
                  <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    {t('wishlistPage.noUpcomingDivider')}
                  </span>
                  <span className="h-px flex-1 bg-border" aria-hidden="true" />
                </div>
              )}
              {noUpcoming.map(renderEntry)}
              {unavailable.map(renderEntry)}
            </div>
          </>
        )}

        {/* Pagination Controls */}
        {data && data.pages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-8">
            <Button disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>{t('wishlistPage.previous')}</Button>
            <div className="text-sm text-muted-foreground">{t('wishlistPage.pageOf', { page, total: data.pages })}</div>
            <Button disabled={page === data.pages} onClick={() => setPage(p => Math.min(data.pages, p + 1))}>{t('wishlistPage.next')}</Button>
          </div>
        )}
      </div>
    </div>
  );
}
