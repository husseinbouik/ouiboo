"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var CurrencyService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrencyService = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../database/database.service");
const schedule_1 = require("@nestjs/schedule");
let CurrencyService = CurrencyService_1 = class CurrencyService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(CurrencyService_1.name);
        this.baseCurrency = 'MAD';
        this.supportedCurrencies = ['USD', 'EUR', 'GBP', 'AED', 'TND'];
        this.apiUrl = 'https://api.exchangerate-api.io/v4/latest';
    }
    async getExchangeRates(targetCurrency, forceRefresh = false) {
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
        const rate = await this.fetchExchangeRate(targetCurrency);
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
    async convertCurrency(amount, targetCurrency) {
        if (targetCurrency === this.baseCurrency) {
            return amount;
        }
        const rate = await this.getExchangeRates(targetCurrency);
        return Math.round((amount * rate) * 100) / 100;
    }
    getSupportedCurrencies() {
        return [this.baseCurrency, ...this.supportedCurrencies];
    }
    async updateExchangeRates() {
        this.logger.log('Updating exchange rates');
        try {
            for (const currency of this.supportedCurrencies) {
                await this.getExchangeRates(currency, true);
            }
            this.logger.log('Exchange rates updated successfully');
        }
        catch (error) {
            this.logger.error('Failed to update exchange rates', error);
        }
    }
    async fetchExchangeRate(targetCurrency) {
        try {
            const response = await fetch(`${this.apiUrl}/${this.baseCurrency}`);
            if (!response.ok) {
                throw new Error(`API error: ${response.statusText}`);
            }
            const data = await response.json();
            const rate = data.rates[targetCurrency];
            if (!rate) {
                throw new Error(`Currency ${targetCurrency} not supported`);
            }
            return rate;
        }
        catch (error) {
            this.logger.error(`Failed to fetch exchange rate for ${targetCurrency}`, error);
            throw error;
        }
    }
};
exports.CurrencyService = CurrencyService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_MIDNIGHT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CurrencyService.prototype, "updateExchangeRates", null);
exports.CurrencyService = CurrencyService = CurrencyService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], CurrencyService);
//# sourceMappingURL=currency.service.js.map