import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@ouiboo/database';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class CurrencyService {
  private readonly logger = new Logger(CurrencyService.name);
  private readonly baseCurrency = 'MAD';
  private readonly supportedCurrencies = ['USD', 'EUR', 'GBP', 'AED', 'TND'];
  private readonly apiUrl = 'https://api.exchangerate-api.io/v4/latest';

  constructor(private prisma: PrismaService) {}

  /**
   * Get current exchange rates
   */
  async getExchangeRates(
    targetCurrency: string,
    forceRefresh: boolean = false,
  ): Promise<number> {
    // Check cache first
    if (!forceRefresh) {
      const cached = await this.prisma.exchangeRate.findUnique({
        where: {
          baseCurrency_targetCurrency: {
            baseCurrency: this.baseCurrency,
            targetCurrency,
          },
        },
      });

      if (cached && cached.expiresAt > new Date()) {
        return cached.rate;
      }
    }

    // Fetch from API
    const rate = await this.fetchExchangeRate(targetCurrency);

    // Cache the result
    await this.prisma.exchangeRate.upsert({
      where: {
        baseCurrency_targetCurrency: {
          baseCurrency: this.baseCurrency,
          targetCurrency,
        },
      },
      update: {
        rate,
        lastUpdated: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
      create: {
        baseCurrency: this.baseCurrency,
        targetCurrency,
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
    if (targetCurrency === this.baseCurrency) {
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
    try {
      const response = await fetch(
        `${this.apiUrl}/${this.baseCurrency}`,
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
      // Return cached rate if API fails
      throw error;
    }
  }
}
