'use client';

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Calendar, MapPin, X } from 'lucide-react';
import { Button } from '@ouiboo/ui';
import { useTranslation } from 'react-i18next';
import { BETA_DESTINATIONS } from '@ouiboo/types';
import { buildHeroSearchParams, isInvalidDateRange, isPastDate } from '@/lib/hero-search';
import {
  buildHeroSuggestions,
  type DestinationSuggestion,
  type HeroSuggestionTrip,
  type TripSuggestion,
} from '@/lib/hero-suggestions';
import { useDisplayPrice } from '@/lib/display-currency';

/**
 * Search-Interface Council adoption (#938) — "One Line": the hero
 * search as ONE unified pill (destination field + dates segment +
 * labelled Search), extracted from the monolithic HomeClient island
 * into its own component (#894, item 7). No framer-motion on this
 * path; suggestions are computed in memory from the catalogue in
 * props (lib/hero-suggestions.ts) — per-keystroke fetches are
 * banned by the build spec.
 *
 * Widget semantics are the binding spec on #941: APG
 * combobox-listbox for the suggestions, a labelled dialog for the
 * dates segment, logical properties throughout, `dir="auto"` on
 * the input, and a locale-conditional stacked variant — FR's
 * longer segment labels keep the stacked layout one breakpoint
 * longer. The no-dates state carries B's "I'm flexible" label
 * (impersonal forms in FR/AR, never a gendered first-person
 * string).
 *
 * Behaviour contracts preserved from the stacked card it replaces:
 * #723 destination resolution (`destination` facet vs free-text
 * `q`, canonical date params) and #877 (no dead ends — suggestions
 * only for places with trips; past/inverted dates rejected inline;
 * 0-trip places disclosed OUTSIDE the listbox per debate D3).
 */

interface HeroSearchProps {
  trips: HeroSuggestionTrip[];
}

function DestinationOption({
  suggestion,
  id,
  active,
  onActivate,
  onHover,
}: {
  suggestion: DestinationSuggestion;
  id: string;
  active: boolean;
  onActivate: () => void;
  onHover: () => void;
}) {
  const { t, i18n } = useTranslation();
  const displayPrice = useDisplayPrice(suggestion.minPrice, suggestion.priceCurrency, i18n.language);
  return (
    <div
      role="option"
      id={id}
      aria-selected={active}
      onMouseDown={(event) => {
        event.preventDefault();
        onActivate();
      }}
      onMouseEnter={onHover}
      className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 ${active ? 'bg-sunset-orange/10' : ''}`}
    >
      <MapPin className="h-5 w-5 shrink-0 text-sunset-orange" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-foreground">{suggestion.name}</span>
        <span className="block text-xs font-medium text-muted-foreground">
          {t('featured.betaRegion.tripsCount', { count: suggestion.count })}
          {displayPrice ? (
            <>
              {' · '}
              {t('featured.from')} <span className="font-bold text-foreground">{displayPrice}</span>
            </>
          ) : null}
        </span>
      </span>
    </div>
  );
}

function TripOption({
  suggestion,
  id,
  active,
  onActivate,
  onHover,
}: {
  suggestion: TripSuggestion;
  id: string;
  active: boolean;
  onActivate: () => void;
  onHover: () => void;
}) {
  const { t, i18n } = useTranslation();
  const displayPrice = useDisplayPrice(suggestion.minPrice, suggestion.priceCurrency, i18n.language);
  return (
    <div
      role="option"
      id={id}
      aria-selected={active}
      onMouseDown={(event) => {
        event.preventDefault();
        onActivate();
      }}
      onMouseEnter={onHover}
      className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 ${active ? 'bg-sunset-orange/10' : ''}`}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-foreground">{suggestion.title}</span>
        <span className="block text-xs font-medium text-muted-foreground">
          {suggestion.place}
          {suggestion.durationDays ? <> · {t('tripCard.days', { count: suggestion.durationDays })}</> : null}
          {displayPrice ? (
            <>
              {' · '}
              {t('featured.from')} <span className="font-bold text-foreground">{displayPrice}</span>
            </>
          ) : null}
        </span>
      </span>
    </div>
  );
}

export function HeroSearch({ trips }: HeroSearchProps) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [datesOpen, setDatesOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [dateError, setDateError] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const datesButtonRef = useRef<HTMLButtonElement>(null);
  const dateFromInputRef = useRef<HTMLInputElement>(null);
  const dateToInputRef = useRef<HTMLInputElement>(null);
  const reactId = useId().replace(/[^a-zA-Z0-9]/g, '');
  const listboxId = `hero-suggestions-${reactId}`;

  const localizedNames = useMemo(() => {
    const names: Record<string, string> = {};
    for (const destination of BETA_DESTINATIONS) {
      names[destination.slug] = t(`search.destinationNames.${destination.slug}`);
    }
    return names;
  }, [t]);

  const suggestions = useMemo(
    () => buildHeroSuggestions(trips, query, localizedNames),
    [trips, query, localizedNames],
  );

  // The keyboard-navigable option list: destinations first, then
  // trips — the render order below. Zero-trip places are NEVER in
  // this list (debate D3): they are disclosed as plain text in a
  // separate headed region of the panel, not as options.
  const optionHrefs = useMemo(
    () => [
      ...suggestions.destinations.map((destination) => destination.href),
      ...suggestions.trips.map((trip) => trip.href),
    ],
    [suggestions],
  );

  // Overlay discipline (punch item 2): the panels are absolutely
  // positioned sheets — they never reflow the page — and one
  // outside tap dismisses them without touching scroll position.
  useEffect(() => {
    if (!panelOpen && !datesOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (formRef.current && !formRef.current.contains(event.target as Node)) {
        setPanelOpen(false);
        setDatesOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [panelOpen, datesOpen]);

  useEffect(() => {
    if (datesOpen) dateFromInputRef.current?.focus();
  }, [datesOpen]);

  const activate = (href: string) => {
    setPanelOpen(false);
    setDatesOpen(false);
    router.push(href);
  };

  const handleSubmit = (event?: React.FormEvent) => {
    event?.preventDefault();
    // Read dates from refs as fallback in case state hasn't synced (#120)
    const from = dateFrom || dateFromInputRef.current?.value || '';
    const to = dateTo || dateToInputRef.current?.value || '';
    // #877: past dates can only dead-end (every matching session is
    // gone) — reject them here, inline, like the reversed range.
    if (isPastDate(from) || isPastDate(to)) {
      setDateError(t('hero.pastDateError'));
      return;
    }
    if (isInvalidDateRange(from, to)) {
      setDateError(t('hero.dateRangeError'));
      return;
    }
    setDateError('');
    const params = buildHeroSearchParams({ query, dateFrom: from, dateTo: to }, localizedNames);
    const queryString = params.toString();
    router.push(`/search${queryString ? `?${queryString}` : ''}`);
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!panelOpen) {
        setPanelOpen(true);
      } else {
        setActiveIndex((index) => Math.min(index + 1, optionHrefs.length - 1));
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, -1));
    } else if (event.key === 'Enter') {
      if (panelOpen && activeIndex >= 0 && optionHrefs[activeIndex]) {
        event.preventDefault();
        activate(optionHrefs[activeIndex]);
      }
    } else if (event.key === 'Escape') {
      if (panelOpen) {
        setPanelOpen(false);
        setActiveIndex(-1);
      }
    }
  };

  const formatShortDate = (value: string) =>
    new Intl.DateTimeFormat(i18n.language || 'en', { day: 'numeric', month: 'short' }).format(new Date(`${value}T00:00:00`));
  const datesLabel =
    dateFrom || dateTo
      ? `${dateFrom ? formatShortDate(dateFrom) : '…'} – ${dateTo ? formatShortDate(dateTo) : '…'}`
      : t('hero.flexible');

  // #941: FR segment labels run long — the pill keeps its stacked
  // form one breakpoint longer instead of squeezing them.
  const stackedClass = (i18n.language || 'en').startsWith('fr')
    ? 'xl:flex-row xl:rounded-full'
    : 'lg:flex-row lg:rounded-full';

  let optionCursor = -1;

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="relative">
      <div
        className={`flex flex-col gap-2 rounded-[1.75rem] border border-border bg-card p-2 shadow-xl ${stackedClass} lg:items-stretch`}
      >
        <div className="flex flex-1 items-center rounded-full border border-transparent bg-muted/55 px-4 py-3 transition-all focus-within:border-border focus-within:bg-background">
          <MapPin className="me-3 h-5 w-5 shrink-0 text-sunset-orange" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={panelOpen}
            aria-controls={listboxId}
            aria-activedescendant={activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined}
            aria-autocomplete="list"
            aria-label={t('hero.where')}
            placeholder={t('hero.where')}
            dir="auto"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPanelOpen(true);
              setActiveIndex(-1);
            }}
            onFocus={() => setPanelOpen(true)}
            onKeyDown={handleInputKeyDown}
            autoComplete="off"
            className="w-full border-none bg-transparent font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {query && (
            <button
              type="button"
              aria-label={t('search.clear')}
              onClick={() => {
                setQuery('');
                setActiveIndex(-1);
                inputRef.current?.focus();
              }}
              className="ms-2 shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>

        <button
          type="button"
          ref={datesButtonRef}
          aria-haspopup="dialog"
          aria-expanded={datesOpen}
          aria-label={t('hero.addDates')}
          onClick={() => {
            setDatesOpen((open) => !open);
            setPanelOpen(false);
          }}
          className="flex items-center justify-center gap-2 rounded-full border border-dashed border-border px-4 py-3 font-medium text-muted-foreground transition-all hover:border-sunset-orange/50 hover:text-foreground"
        >
          <Calendar className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span className="whitespace-nowrap">{datesLabel}</span>
        </button>

        <Button
          type="submit"
          className="h-14 rounded-full bg-sunset-orange px-8 text-lg font-semibold text-deep-blue shadow-md transition-all hover:bg-sunset-orange-dark hover:text-white lg:h-auto"
        >
          {t('hero.search', 'Search')}
        </Button>
      </div>

      {panelOpen && (
        <div className="absolute inset-x-0 top-[calc(100%+0.5rem)] z-50 max-h-[min(26rem,70vh)] overflow-y-auto rounded-2xl border border-border bg-card p-2 text-start shadow-2xl">
          <div role="listbox" id={listboxId} aria-label={t('search.destination')}>
            {suggestions.destinations.length > 0 && (
              <div role="group" aria-label={t('search.destination')}>
                <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {t('search.destination')}
                </p>
                {suggestions.destinations.map((destination) => {
                  optionCursor += 1;
                  const index = optionCursor;
                  return (
                    <DestinationOption
                      key={destination.slug ?? destination.name}
                      suggestion={destination}
                      id={`${listboxId}-opt-${index}`}
                      active={activeIndex === index}
                      onActivate={() => activate(destination.href)}
                      onHover={() => setActiveIndex(index)}
                    />
                  );
                })}
              </div>
            )}
            {suggestions.trips.length > 0 && (
              <div role="group" aria-label={t('hero.tripSuggestions')}>
                <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {t('hero.tripSuggestions')}
                </p>
                {suggestions.trips.map((trip) => {
                  optionCursor += 1;
                  const index = optionCursor;
                  return (
                    <TripOption
                      key={trip.id}
                      suggestion={trip}
                      id={`${listboxId}-opt-${index}`}
                      active={activeIndex === index}
                      onActivate={() => activate(trip.href)}
                      onHover={() => setActiveIndex(index)}
                    />
                  );
                })}
              </div>
            )}
            {suggestions.destinations.length === 0 && suggestions.trips.length === 0 && (
              <p className="px-3 py-2 text-sm text-muted-foreground">{t('hero.noSuggestions')}</p>
            )}
          </div>

          {/* Debate D3 (punch item 1): 0-trip places are disclosed
              in a separate headed region of the same panel — plain
              text in the reading order, announced through the
              role="status" bridge when the query matches — never
              listbox options, never activatable. */}
          {suggestions.zeroPlaces.length > 0 && (
            <div role="group" aria-label={t('hero.placesNoTripsYet')} className="mt-1 border-t border-border px-3 py-2.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {t('hero.placesNoTripsYet')}
              </p>
              {suggestions.zeroPlaces.map((place) => (
                <p key={place.slug} className="mt-1 text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{place.name}</span>
                  {' · '}
                  <span role="status">{t('featured.betaRegion.noTripsYet')}</span>
                </p>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => activate('/search')}
            className="mt-1 flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-bold text-foreground transition-colors hover:bg-muted"
          >
            {t('hero.seeAllTrips', { count: suggestions.totalTrips })}
            <ArrowRight
              className={`h-4 w-4 shrink-0 ${(i18n.language || 'en').startsWith('ar') ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </button>
        </div>
      )}

      {datesOpen && (
        <div
          role="dialog"
          aria-label={t('search.dates')}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setDatesOpen(false);
              datesButtonRef.current?.focus();
            }
          }}
          className="absolute inset-x-0 top-[calc(100%+0.5rem)] z-50 rounded-2xl border border-border bg-card p-4 text-start shadow-2xl sm:inset-x-auto sm:end-0 sm:w-[26rem]"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center rounded-xl border border-transparent bg-muted/55 px-4 py-3 transition-all focus-within:border-border focus-within:bg-background">
              <Calendar className="me-3 h-5 w-5 shrink-0 text-sunset-orange" aria-hidden="true" />
              <label className="flex w-full flex-col gap-0.5 text-start">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('search.startDate')}
                </span>
                <input
                  type="date"
                  ref={dateFromInputRef}
                  aria-label={t('search.startDate')}
                  value={dateFrom}
                  onChange={(event) => {
                    setDateFrom(event.target.value);
                    setDateError('');
                  }}
                  aria-invalid={dateError ? true : undefined}
                  aria-describedby={dateError ? 'hero-date-error' : undefined}
                  className="w-full border-none bg-transparent font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
              </label>
            </div>
            <div className="flex items-center rounded-xl border border-transparent bg-muted/55 px-4 py-3 transition-all focus-within:border-border focus-within:bg-background">
              <Calendar className="me-3 h-5 w-5 shrink-0 text-sunset-orange" aria-hidden="true" />
              <label className="flex w-full flex-col gap-0.5 text-start">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('search.endDate')}
                </span>
                <input
                  type="date"
                  ref={dateToInputRef}
                  aria-label={t('search.endDate')}
                  value={dateTo}
                  onChange={(event) => {
                    setDateTo(event.target.value);
                    setDateError('');
                  }}
                  aria-invalid={dateError ? true : undefined}
                  aria-describedby={dateError ? 'hero-date-error' : undefined}
                  className="w-full border-none bg-transparent font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
              </label>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                setDateFrom('');
                setDateTo('');
                setDateError('');
              }}
              className="rounded-full px-3 py-2 text-sm font-bold text-muted-foreground transition-colors hover:text-foreground"
            >
              {t('hero.clearDates')}
            </button>
            <button
              type="button"
              onClick={() => setDatesOpen(false)}
              className="rounded-full bg-deep-blue px-5 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90"
            >
              {t('hero.datesDone')}
            </button>
          </div>
        </div>
      )}

      {dateError && (
        <p id="hero-date-error" role="alert" className="mt-3 text-sm font-medium text-danger">
          {dateError}
        </p>
      )}
    </form>
  );
}
