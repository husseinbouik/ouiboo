import { DatabaseService } from '../database/database.service';
export declare class CurrencyService {
    private prisma;
    private readonly logger;
    private readonly baseCurrency;
    private readonly supportedCurrencies;
    private readonly apiUrl;
    constructor(prisma: DatabaseService);
    getExchangeRates(targetCurrency: string, forceRefresh?: boolean): Promise<number>;
    convertCurrency(amount: number, targetCurrency: string): Promise<number>;
    getSupportedCurrencies(): string[];
    updateExchangeRates(): Promise<void>;
    private fetchExchangeRate;
}
