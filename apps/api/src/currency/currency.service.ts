import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { MoneyInput, toMoneyDecimal, toMoneyString, toRateDecimal, toRateString } from '../common/money.util';

/**
 * #649: where a served rate actually came from. `live` = fetched
 * from the provider by this call; `cache` = a provider rate fetched
 * earlier and still inside its 24h cache window (see fetchedAt /
 * ageSeconds for its real age); `fallback` = the static constant
 * below, served only when the provider cannot be reached; `base` =
 * the base currency itself (rate 1).
 */
export type ExchangeRateSource = 'live' | 'cache' | 'fallback' | 'base';

export interface ExchangeRateInfo {
  rate: string;
  source: ExchangeRateSource;
  /** When the served rate was fetched from the provider (ISO 8601);
   * null for the base currency and for fallback constants. */
  fetchedAt: string | null;
  /** Age of the served rate in whole seconds; null when not
   * applicable (base / fallback). */
  ageSeconds: number | null;
}

@Injectable()
export class CurrencyService {
  private readonly logger = new Logger(CurrencyService.name);
  private readonly baseCurrency = 'MAD';
  private readonly supportedCurrencies = ['USD', 'EUR', 'GBP', 'AED', 'TND'];
  // #649: exchangerate-api.io's free v4 endpoint no longer answers
  // without an API key (verified 2026-10-29: every fetch fails),
  // which pinned production to the fallback constants below. The
  // provider is now the keyless open endpoint of the same service
  // family — its response keeps the { result, rates } shape — and
  // the URL is env-overridable so a future keyed plan or provider
  // swap needs configuration, not code.
  private readonly apiUrl =
    process.env.EXCHANGE_RATE_API_URL || 'https://open.er-api.com/v6/latest';
  private readonly requestTimeoutMs = 2500;
  private readonly fallbackRates: Record<string, string> = {
    USD: '0.10000000',
    EUR: '0.09200000',
    GBP: '0.07900000',
    AED: '0.37000000',
    TND: '0.31000000',
  };

  constructor(private prisma: DatabaseService) {}

  /**
   * Get the current exchange rate for a currency, with its source
   * and age so a fallback can never pass as a live rate (#649).
   */
  async getExchangeRateInfo(
    targetCurrency: string,
    forceRefresh: boolean = false,
  ): Promise<ExchangeRateInfo> {
    const normalizedTarget = targetCurrency.toUpperCase();

    if (normalizedTarget === this.baseCurrency) {
      return { rate: '1.00000000', source: 'base', fetchedAt: null, ageSeconds: null };
    }

    if (!this.supportedCurrencies.includes(normalizedTarget)) {
      throw new Error(`Currency ${normalizedTarget} not supported`);
    }

    // Check cache first. Only provider-fetched rates are ever
    // cached (see below), so a cache hit is a genuine live rate of
    // a known age.
    if (!forceRefresh) {
      const cached = await this.prisma.exchangeRate.findUnique({
        where: {
          baseCurrency_targetCurrency: {
            baseCurrency: this.baseCurrency,
            targetCurrency: normalizedTarget,
          },
        },
      });

      if (cached && cached.expiresAt > new Date()) {
        const fetchedAt = cached.lastUpdated;
        return {
          rate: toRateString(cached.rate) || '1.00000000',
          source: 'cache',
          fetchedAt: fetchedAt.toISOString(),
          ageSeconds: Math.max(0, Math.floor((Date.now() - fetchedAt.getTime()) / 1000)),
        };
      }
    }

    try {
      const rate = await this.fetchExchangeRate(normalizedTarget);

      // Cache the live result for 24h.
      const now = new Date();
      await this.prisma.exchangeRate.upsert({
        where: {
          baseCurrency_targetCurrency: {
            baseCurrency: this.baseCurrency,
            targetCurrency: normalizedTarget,
          },
        },
        update: {
          rate,
          lastUpdated: now,
          expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        },
        create: {
          baseCurrency: this.baseCurrency,
          targetCurrency: normalizedTarget,
          rate,
          lastUpdated: now,
          expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        },
      });

      return { rate: toRateString(rate) || '1.00000000', source: 'live', fetchedAt: now.toISOString(), ageSeconds: 0 };
    } catch (error) {
      const fallbackRate = this.fallbackRates[normalizedTarget];

      if (!fallbackRate) {
        throw error;
      }

      // #649: a fallback serve is LOUD and is never written to the
      // cache. The previous implementation cached the fallback for
      // 24h, so one failed fetch silently pinned every conversion
      // to the constant for a day at a time (and, the fetch being
      // permanently broken, effectively forever) with a single
      // warning line. Now every fallback serve warns, and the next
      // request retries the provider.
      this.logger.warn(
        `FALLBACK exchange rate served for ${normalizedTarget}: live provider fetch failed (${error instanceof Error ? error.message : String(error)}). ` +
          `Serving the static fallback constant ${fallbackRate}; display conversions are approximate until the provider recovers.`,
      );
      return { rate: fallbackRate, source: 'fallback', fetchedAt: null, ageSeconds: null };
    }
  }

  /**
   * Get current exchange rates
   */
  async getExchangeRates(
    targetCurrency: string,
    forceRefresh: boolean = false,
  ): Promise<string> {
    const info = await this.getExchangeRateInfo(targetCurrency, forceRefresh);
    return info.rate;
  }

  /**
   * Convert amount from MAD to another currency
   */
  async convertCurrency(
    amount: MoneyInput,
    targetCurrency: string,
  ): Promise<string> {
    if (targetCurrency.toUpperCase() === this.baseCurrency) {
      return toMoneyString(amount) || '0.00';
    }

    const rate = await this.getExchangeRates(targetCurrency);
    return toMoneyString(toMoneyDecimal(amount).mul(toRateDecimal(rate)).toDecimalPlaces(2)) || '0.00';
  }

  /**
   * Get all supported currencies
   */
  getSupportedCurrencies() {
    return [this.baseCurrency, ...this.supportedCurrencies];
  }

  /**
   * Update exchange rates daily (invoked by the maintenance cron —
   * Vercel Cron /api/v1/cron/maintenance and the BullMQ maintenance
   * processor both call this).
   */
  async updateExchangeRates() {
    this.logger.log('Updating exchange rates');
    const degraded: string[] = [];
    for (const currency of this.supportedCurrencies) {
      try {
        const info = await this.getExchangeRateInfo(currency, true);
        if (info.source === 'fallback') degraded.push(currency);
      } catch (error) {
        this.logger.error(`Failed to refresh exchange rate for ${currency}`, error);
        degraded.push(currency);
      }
    }
    if (degraded.length > 0) {
      this.logger.error(
        `Exchange rate refresh DEGRADED: fallback rates in use for ${degraded.join(', ')}`,
      );
    } else {
      this.logger.log('Exchange rates updated successfully');
    }
  }

  /**
   * Fetch exchange rate from external API
   */
  private async fetchExchangeRate(targetCurrency: string): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs);

    try {
      const response = await fetch(
        `${this.apiUrl}/${this.baseCurrency}`,
        { signal: controller.signal },
      );

      if (!response.ok) {
        throw new Error(`Exchange rate provider HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data?.result !== 'success') {
        throw new Error(
          `Exchange rate provider returned result=${data?.result ?? 'unknown'}`,
        );
      }
      const rate = data.rates?.[targetCurrency];

      if (!rate) {
        throw new Error(`Currency ${targetCurrency} not supported`);
      }
      return toRateString(rate) || '1.00000000';
    } finally {
      clearTimeout(timeout);
    }
  }
}
