import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { MoneyInput, toMoneyDecimal, toMoneyString, toRateDecimal, toRateString } from '../common/money.util';

@Injectable()
export class CurrencyService {
  private readonly logger = new Logger(CurrencyService.name);
  private readonly baseCurrency = 'MAD';
  private readonly supportedCurrencies = ['USD', 'EUR', 'GBP', 'AED', 'TND'];
  private readonly apiUrl = 'https://api.exchangerate-api.io/v4/latest';
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
   * Get current exchange rates
   */
  async getExchangeRates(
    targetCurrency: string,
    forceRefresh: boolean = false,
  ): Promise<string> {
    const normalizedTarget = targetCurrency.toUpperCase();

    if (normalizedTarget === this.baseCurrency) {
      return '1.00000000';
    }

    if (!this.supportedCurrencies.includes(normalizedTarget)) {
      throw new Error(`Currency ${normalizedTarget} not supported`);
    }

    // Check cache first
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
        return toRateString(cached.rate) || '1.00000000';
      }
    }

    const rate = await this.getFreshOrFallbackRate(normalizedTarget);

    // Cache the result
    await this.prisma.exchangeRate.upsert({
      where: {
        baseCurrency_targetCurrency: {
          baseCurrency: this.baseCurrency,
          targetCurrency: normalizedTarget,
        },
      },
      update: {
        rate,
        lastUpdated: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
      create: {
        baseCurrency: this.baseCurrency,
        targetCurrency: normalizedTarget,
        rate,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    return toRateString(rate) || '1.00000000';
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
   * Update exchange rates daily
   */
  async updateExchangeRates() {
    this.logger.log('Updating exchange rates');
    try {
      for (const currency of this.supportedCurrencies) {
        await this.getExchangeRates(currency, true);
      }
      this.logger.log('Exchange rates updated successfully');
    } catch (error) {
      this.logger.error('Failed to update exchange rates', error);
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
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();
      const rate = data.rates[targetCurrency];

      if (!rate) {
        throw new Error(`Currency ${targetCurrency} not supported`);
      }
      return toRateString(rate) || '1.00000000';
    } finally {
      clearTimeout(timeout);
    }
  }

  private async getFreshOrFallbackRate(targetCurrency: string): Promise<string> {
    try {
      return await this.fetchExchangeRate(targetCurrency);
    } catch (error) {
      const fallbackRate = this.fallbackRates[targetCurrency];

      if (!fallbackRate) {
        throw error;
      }

      this.logger.warn(
        `Using fallback exchange rate for ${targetCurrency}: ${fallbackRate}`,
      );
      return fallbackRate;
    }
  }
}
