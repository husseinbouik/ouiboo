import { CurrencyService } from './currency.service';
export declare class CurrencyController {
    private currencyService;
    constructor(currencyService: CurrencyService);
    getExchangeRate(targetCurrency?: string, forceRefresh?: boolean): Promise<{
        baseCurrency: string;
        targetCurrency: string;
        rate: number;
    }>;
    convert(amount: string, targetCurrency?: string): Promise<{
        amount: number;
        baseCurrency: string;
        convertedAmount: number;
        targetCurrency: string;
    }>;
    getSupportedCurrencies(): {
        currencies: string[];
    };
}
