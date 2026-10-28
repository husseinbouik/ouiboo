'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency, normalizeCurrency } from '@ouiboo/utils';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/components/AuthContext';

/**
 * #498 rework: display currency.
 *
 * The backend already owns the pieces — `User.displayCurrency`
 * (default MAD, validated as a 3-letter uppercase code by the
 * update-profile DTO and returned by /users/me) and the currency API
 * (GET /currency/supported, GET /currency/rates?target=X with rates
 * quoted against a MAD base). This module wires them into the
 * traveller UI:
 *
 * - signed-in travellers: the profile value is authoritative; changing
 *   it PATCHes /users/me and refetches the profile.
 * - guests: the choice persists locally under `ouiboo_display_currency`
 *   (a UI preference only — never an auth token, so localStorage is
 *   fine per the repo rules).
 *
 * Display conversion NEVER changes what checkout charges: prices are
 * converted for rendering only, always from the trip's authoritative
 * currency, and when no rate is available the price renders in that
 * authoritative currency rather than a made-up conversion.
 */
export const DISPLAY_CURRENCY_STORAGE_KEY = 'ouiboo_display_currency';
export const BASE_CURRENCY = 'MAD';
const FALLBACK_SUPPORTED = ['MAD', 'USD', 'EUR', 'GBP', 'AED', 'TND'];

export interface DisplayCurrencyContextValue {
  displayCurrency: string;
  supportedCurrencies: string[];
  setDisplayCurrency: (currency: string) => Promise<void>;
  isGuest: boolean;
}

const DisplayCurrencyContext = createContext<DisplayCurrencyContextValue>({
  displayCurrency: BASE_CURRENCY,
  supportedCurrencies: [BASE_CURRENCY],
  setDisplayCurrency: async () => undefined,
  isGuest: true,
});

export function useDisplayCurrency(): DisplayCurrencyContextValue {
  return useContext(DisplayCurrencyContext);
}

function readGuestCurrency(): string {
  try {
    return normalizeCurrency(window.localStorage.getItem(DISPLAY_CURRENCY_STORAGE_KEY));
  } catch {
    return BASE_CURRENCY;
  }
}

export function DisplayCurrencyProvider({ children }: { children: React.ReactNode }) {
  const { user, refetch } = useAuth();
  const [guestCurrency, setGuestCurrency] = useState<string>(BASE_CURRENCY);
  const [signedInOverride, setSignedInOverride] = useState<string | null>(null);

  // Hydrate the guest preference after mount (SSR renders MAD).
  useEffect(() => {
    setGuestCurrency(readGuestCurrency());
  }, []);

  // Once the profile catches up with an optimistic change, drop the override.
  useEffect(() => {
    if (signedInOverride && user?.displayCurrency === signedInOverride) {
      setSignedInOverride(null);
    }
  }, [signedInOverride, user?.displayCurrency]);

  const { data: supportedData } = useQuery({
    queryKey: ['currency', 'supported'],
    queryFn: async () => {
      const response = await apiClient.get('/currency/supported');
      const list = (response.data as { currencies?: unknown })?.currencies;
      return Array.isArray(list) ? list.filter((c): c is string => typeof c === 'string') : [];
    },
    staleTime: 24 * 60 * 60 * 1000,
    retry: 1,
  });

  const supportedCurrencies = React.useMemo(() => {
    const fromApi = supportedData && supportedData.length > 0 ? supportedData : FALLBACK_SUPPORTED;
    return Array.from(new Set([BASE_CURRENCY, ...fromApi.map((c) => normalizeCurrency(c))]));
  }, [supportedData]);

  const displayCurrency = user
    ? (signedInOverride ?? normalizeCurrency(user.displayCurrency ?? BASE_CURRENCY))
    : guestCurrency;

  const setDisplayCurrency = useCallback(
    async (currency: string) => {
      const next = normalizeCurrency(currency);
      if (user) {
        setSignedInOverride(next);
        try {
          await apiClient.patch('/users/me', { displayCurrency: next });
          await refetch();
        } catch {
          // Server rejected it — fall back to the profile value.
          setSignedInOverride(null);
        }
      } else {
        setGuestCurrency(next);
        try {
          window.localStorage.setItem(DISPLAY_CURRENCY_STORAGE_KEY, next);
        } catch {
          // Private mode etc. — the in-memory choice still applies.
        }
      }
    },
    [user, refetch],
  );

  const value = React.useMemo<DisplayCurrencyContextValue>(
    () => ({ displayCurrency, supportedCurrencies, setDisplayCurrency, isGuest: !user }),
    [displayCurrency, supportedCurrencies, setDisplayCurrency, user],
  );

  return <DisplayCurrencyContext.Provider value={value}>{children}</DisplayCurrencyContext.Provider>;
}

/**
 * Pure conversion through the MAD base: the rates API quotes
 * `1 MAD = rate × target`, so amount(from) → MAD → display is
 * amount × rate(display) / rate(from), with MAD itself at rate 1.
 */
export function convertViaMadRates(
  amount: number,
  fromCurrency: string,
  displayCurrency: string,
  madRates: Record<string, number | null | undefined>,
): number | null {
  const from = normalizeCurrency(fromCurrency);
  const display = normalizeCurrency(displayCurrency);
  if (from === display) return amount;
  const fromRate = from === BASE_CURRENCY ? 1 : madRates[from];
  const displayRate = display === BASE_CURRENCY ? 1 : madRates[display];
  if (!fromRate || !displayRate) return null;
  return (amount * displayRate) / fromRate;
}

function useMadRate(currency: string): number | null {
  const normalized = normalizeCurrency(currency);
  const { data } = useQuery({
    queryKey: ['currency', 'rate', normalized],
    queryFn: async () => {
      const response = await apiClient.get('/currency/rates', { params: { target: normalized } });
      const rate = Number((response.data as { rate?: unknown })?.rate);
      return Number.isFinite(rate) && rate > 0 ? rate : null;
    },
    enabled: normalized !== BASE_CURRENCY,
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });
  if (normalized === BASE_CURRENCY) return 1;
  return data ?? null;
}

/**
 * #615: numeric companion to useDisplayPrice for surfaces that must
 * format SEVERAL amounts derived from one base — the trip page's
 * cancellation scale multiplies the session price by each band's
 * percent, so it needs the converted NUMBER, not a formatted string.
 * Returns a converter bound to one authoritative currency:
 * amount -> { amount, currency } in the display currency, falling
 * back to the authoritative amount/currency when no rate exists.
 */
export function useDisplayAmountConverter(fromCurrency?: string | null) {
  const { displayCurrency } = useDisplayCurrency();
  const from = normalizeCurrency(fromCurrency);
  const fromRate = useMadRate(from);
  const displayRate = useMadRate(displayCurrency);

  return useCallback(
    (amount: number | string | null | undefined): { amount: number; currency: string } | null => {
      if (amount === null || amount === undefined) return null;
      const numeric = Number(amount);
      if (!Number.isFinite(numeric)) return null;
      if (from === displayCurrency) return { amount: numeric, currency: from };
      const converted = convertViaMadRates(numeric, from, displayCurrency, {
        [from]: fromRate,
        [displayCurrency]: displayRate,
      });
      return converted === null
        ? { amount: numeric, currency: from }
        : { amount: converted, currency: displayCurrency };
    },
    [from, displayCurrency, fromRate, displayRate],
  );
}

/**
 * Format `amount` (denominated in the authoritative `fromCurrency`)
 * in the traveller's display currency. Falls back to the authoritative
 * currency when conversion is impossible (missing/failed rate) — a
 * truthful price in the trip's own currency beats a wrong conversion.
 */
export function useDisplayPrice(
  amount: number | string | null | undefined,
  fromCurrency?: string | null,
  locale?: string | null,
): string | null {
  const { displayCurrency } = useDisplayCurrency();
  const from = normalizeCurrency(fromCurrency);
  const fromRate = useMadRate(from);
  const displayRate = useMadRate(displayCurrency);

  if (amount === null || amount === undefined) return null;
  const numeric = Number(amount);
  if (!Number.isFinite(numeric)) return null;
  if (from === displayCurrency) return formatCurrency(numeric, from, locale);
  const converted = convertViaMadRates(numeric, from, displayCurrency, {
    [from]: fromRate,
    [displayCurrency]: displayRate,
  });
  if (converted === null) return formatCurrency(numeric, from, locale);
  return formatCurrency(converted, displayCurrency, locale);
}
