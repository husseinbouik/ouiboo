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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentProviderFactory = void 0;
const common_1 = require("@nestjs/common");
const cmi_payment_provider_1 = require("./cmi-payment.provider");
const stripe_payment_provider_1 = require("./stripe-payment.provider");
const cashplus_payment_provider_1 = require("./cashplus-payment.provider");
let PaymentProviderFactory = class PaymentProviderFactory {
    constructor(cmiProvider, stripeProvider, cashplusProvider) {
        this.cmiProvider = cmiProvider;
        this.stripeProvider = stripeProvider;
        this.cashplusProvider = cashplusProvider;
    }
    getProvider(providerType) {
        switch (providerType) {
            case 'CMI':
                return this.cmiProvider;
            case 'STRIPE':
                return this.stripeProvider;
            case 'CASHPLUS':
                return this.cashplusProvider;
            default:
                throw new Error(`Unknown payment provider: ${providerType}`);
        }
    }
};
exports.PaymentProviderFactory = PaymentProviderFactory;
exports.PaymentProviderFactory = PaymentProviderFactory = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [cmi_payment_provider_1.CMIPaymentProvider,
        stripe_payment_provider_1.StripePaymentProvider,
        cashplus_payment_provider_1.CashPlusPaymentProvider])
], PaymentProviderFactory);
//# sourceMappingURL=payment-provider.factory.js.map