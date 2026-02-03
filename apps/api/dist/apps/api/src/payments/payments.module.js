"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsModule = void 0;
const common_1 = require("@nestjs/common");
const database_module_1 = require("../database/database.module");
const email_module_1 = require("../email/email.module");
const payments_service_1 = require("./payments.service");
const payments_controller_1 = require("./payments.controller");
const cmi_payment_provider_1 = require("./providers/cmi-payment.provider");
const stripe_payment_provider_1 = require("./providers/stripe-payment.provider");
const cashplus_payment_provider_1 = require("./providers/cashplus-payment.provider");
const payment_provider_factory_1 = require("./providers/payment-provider.factory");
let PaymentsModule = class PaymentsModule {
};
exports.PaymentsModule = PaymentsModule;
exports.PaymentsModule = PaymentsModule = __decorate([
    (0, common_1.Module)({
        imports: [database_module_1.DatabaseModule, email_module_1.EmailModule],
        providers: [
            payments_service_1.PaymentsService,
            cmi_payment_provider_1.CMIPaymentProvider,
            stripe_payment_provider_1.StripePaymentProvider,
            cashplus_payment_provider_1.CashPlusPaymentProvider,
            payment_provider_factory_1.PaymentProviderFactory,
        ],
        controllers: [payments_controller_1.PaymentsController],
        exports: [payments_service_1.PaymentsService],
    })
], PaymentsModule);
//# sourceMappingURL=payments.module.js.map