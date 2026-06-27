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
    const rate = await this.currencyService.getExchangeRates(
      targetCurrency,
      forceRefresh,
    );
    return {
      baseCurrency: 'MAD',
      targetCurrency,
      rate,
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
