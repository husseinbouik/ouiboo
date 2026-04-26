import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class CurrencyService {
  private readonly logger = new Logger(CurrencyService.name);
  private readonly baseCurrency = 'MAD';
  private readonly supportedCurrencies = ['USD', 'EUR', 'GBP', 'AED', 'TND'];
  private readonly apiUrl = 'https://api.exchangerate-api.io/v4/latest';
  private readonly requestTimeoutMs = 2500;
  private readonly fallbackRates: Record<string, number> = {
    USD: 0.1,
    EUR: 0.092,
    GBP: 0.079,
    AED: 0.37,
    TND: 0.31,
  };

  constructor(private prisma: DatabaseService) {}

  /**
   * Get current exchange rates
   */
  async getExchangeRates(
    targetCurrency: string,
    forceRefresh: boolean = false,
  ): Promise<number> {
    const normalizedTarget = targetCurrency.toUpperCase();

    if (normalizedTarget === this.baseCurrency) {
      return 1;
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
        return cached.rate;
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

    return rate;
  }

  /**
   * Convert amount from MAD to another currency
   */
  async convertCurrency(
    amount: number,
    targetCurrency: string,
  ): Promise<number> {
    if (targetCurrency.toUpperCase() === this.baseCurrency) {
      return amount;
    }

    const rate = await this.getExchangeRates(targetCurrency);
    return Math.round((amount * rate) * 100) / 100;
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
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
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
  private async fetchExchangeRate(targetCurrency: string): Promise<number> {
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

      return rate;
    } catch (error) {
      this.logger.error(`Failed to fetch exchange rate for ${targetCurrency}`, error);
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async getFreshOrFallbackRate(targetCurrency: string): Promise<number> {
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
