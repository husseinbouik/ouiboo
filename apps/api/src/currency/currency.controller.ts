import { Controller, Get, Query } from '@nestjs/common';
import { CurrencyService } from './currency.service';

@Controller('currency')
export class CurrencyController {
  constructor(private currencyService: CurrencyService) {}

  /**
   * Get exchange rate
   */
  @Get('rates')
  async getExchangeRate(
    @Query('target') targetCurrency: string = 'USD',
    @Query('force') forceRefresh: boolean = false,
  ) {
    const info = await this.currencyService.getExchangeRateInfo(
      targetCurrency,
      forceRefresh,
    );
    return {
      baseCurrency: 'MAD',
      targetCurrency,
      rate: info.rate,
      // #649: additive — where this rate came from and how old it
      // is, so a fallback can never pass as a live rate downstream.
      source: info.source,
      fetchedAt: info.fetchedAt,
      ageSeconds: info.ageSeconds,
    };
  }

  /**
   * Convert currency
   */
  @Get('convert')
  async convert(
    @Query('amount') amount: string,
    @Query('target') targetCurrency: string = 'USD',
  ) {
    const convertedAmount = await this.currencyService.convertCurrency(
      amount,
      targetCurrency,
    );
    return {
      amount,
      baseCurrency: 'MAD',
      convertedAmount,
      targetCurrency,
    };
  }

  /**
   * Get supported currencies
   */
  @Get('supported')
  getSupportedCurrencies() {
    return {
      currencies: this.currencyService.getSupportedCurrencies(),
    };
  }
}
