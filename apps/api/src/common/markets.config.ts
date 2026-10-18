/**
 * Centralized market configuration for Ouiboo (#250).
 *
 * Adding a new market must NOT require code rewrites: add an entry here with
 * `enabled: true` and the rest of the system reads from this single source.
 *
 * Foundation only — existing code is not yet migrated to consume this config.
 */

export interface MarketConfig {
  /** ISO 3166-1 alpha-2 country code, e.g. 'MA' */
  code: string;
  /** Display name, e.g. 'Morocco' */
  name: string;
  /** BCP 47 locale tag, e.g. 'ar-MA' */
  defaultLocale: string;
  /** ISO 4217 currency code, e.g. 'MAD' */
  currency: string;
  /** Currency display symbol, e.g. 'MAD' or 'FCFA' */
  currencySymbol: string;
  /** IANA timezone, e.g. 'Africa/Casablanca' */
  timezone: string;
  /** E.164 dialing prefix, e.g. '+212' */
  phonePrefix: string;
  /** Only enabled markets are selectable in the product */
  enabled: boolean;
}

export const MARKETS: Record<string, MarketConfig> = {
  MA: {
    code: 'MA',
    name: 'Morocco',
    defaultLocale: 'ar-MA',
    currency: 'MAD',
    currencySymbol: 'MAD',
    timezone: 'Africa/Casablanca',
    phonePrefix: '+212',
    enabled: true,
  },
  // Future markets — disabled until launch readiness is confirmed
  // for each (payments, phone validation, timezone, legal).
  SN: {
    code: 'SN',
    name: 'Senegal',
    defaultLocale: 'fr-SN',
    currency: 'XOF',
    currencySymbol: 'FCFA',
    timezone: 'Africa/Dakar',
    phonePrefix: '+221',
    enabled: false,
  },
  EG: {
    code: 'EG',
    name: 'Egypt',
    defaultLocale: 'ar-EG',
    currency: 'EGP',
    currencySymbol: 'E£',
    timezone: 'Africa/Cairo',
    phonePrefix: '+20',
    enabled: false,
  },
  NG: {
    code: 'NG',
    name: 'Nigeria',
    defaultLocale: 'en-NG',
    currency: 'NGN',
    currencySymbol: '₦',
    timezone: 'Africa/Lagos',
    phonePrefix: '+234',
    enabled: false,
  },
  KE: {
    code: 'KE',
    name: 'Kenya',
    defaultLocale: 'en-KE',
    currency: 'KES',
    currencySymbol: 'KSh',
    timezone: 'Africa/Nairobi',
    phonePrefix: '+254',
    enabled: false,
  },
};

/** Market code used when no market is specified. */
export const DEFAULT_MARKET = 'MA';

/** Lookup helper that falls back to the default market for unknown codes. */
export function getMarket(code: string): MarketConfig {
  return MARKETS[code?.toUpperCase()] ?? MARKETS[DEFAULT_MARKET];
}

/** Codes of all launch-enabled markets. */
export function getEnabledMarkets(): MarketConfig[] {
  return Object.values(MARKETS).filter((m) => m.enabled);
}
