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
var CashPlusPaymentProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CashPlusPaymentProvider = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("axios");
const crypto = require("crypto");
let CashPlusPaymentProvider = CashPlusPaymentProvider_1 = class CashPlusPaymentProvider {
    constructor() {
        this.logger = new common_1.Logger(CashPlusPaymentProvider_1.name);
        this.merchantId = process.env.CASHPLUS_MERCHANT_ID || '';
        this.apiKey = process.env.CASHPLUS_API_KEY || '';
        this.baseUrl = process.env.CASHPLUS_BASE_URL || 'https://api.cashplus.ma';
        this.callbackUrl = process.env.CASHPLUS_CALLBACK_URL || '';
        this.http = axios_1.default.create({ baseURL: this.baseUrl, timeout: 10000 });
    }
    async initiatePayment(amount, bookingId, travelerEmail, travelerName) {
        try {
            const payload = {
                merchantId: this.merchantId,
                amount: Math.round(amount * 100),
                currency: 'MAD',
                orderId: bookingId,
                customerEmail: travelerEmail,
                customerName: travelerName,
                returnUrl: `${this.callbackUrl}/payments/callback`,
                notifyUrl: `${this.callbackUrl}/payments/webhook`,
            };
            const res = await this.callCashPlusAPI('/v1/payments/initiate', payload);
            return {
                sessionId: res.sessionId || res.transactionId || '',
                redirectUrl: res.redirectUrl || res.paymentUrl || '',
                expiresAt: res.expiresAt ? new Date(res.expiresAt) : new Date(Date.now() + 30 * 60 * 1000),
                metadata: { provider: 'CASHPLUS', ...res },
            };
        }
        catch (err) {
            throw new Error(`CashPlus payment initiation failed: ${err.message || err}`);
        }
    }
    async verifyPayment(transactionId, bookingId) {
        try {
            const res = await this.callCashPlusAPI('/v1/payments/verify', {
                transactionId,
                orderId: bookingId,
                merchantId: this.merchantId,
            });
            if (res.status === 'SUCCESS' || res.status === 'PAID') {
                return {
                    status: 'success',
                    transactionId: res.transactionId || transactionId,
                    metadata: res,
                };
            }
            else if (res.status === 'PENDING') {
                return { status: 'pending', metadata: res };
            }
            else {
                return { status: 'failure', errorMessage: res.errorMessage || 'Payment failed', metadata: res };
            }
        }
        catch (err) {
            return { status: 'failure', errorMessage: err.message };
        }
    }
    async processRefund(transactionId, amount) {
        try {
            const res = await this.callCashPlusAPI('/v1/payments/refund', {
                transactionId,
                amount: Math.round(amount * 100),
                merchantId: this.merchantId,
            });
            return { success: res.status === 'SUCCESS', refundId: res.refundId, error: res.errorMessage };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    validateWebhookSignature(payload, signature) {
        try {
            const expected = this.apiKey ? crypto.createHmac('sha256', this.apiKey).update(payload).digest('hex') : '';
            return expected === signature;
        }
        catch (err) {
            return false;
        }
    }
    async callCashPlusAPI(endpoint, data) {
        try {
            const payload = typeof data === 'string' ? data : JSON.stringify(data || {});
            const signature = this.apiKey ? crypto.createHmac('sha256', this.apiKey).update(payload).digest('hex') : '';
            const headers = { 'Content-Type': 'application/json' };
            if (this.merchantId)
                headers['X-Merchant-Id'] = this.merchantId;
            if (this.apiKey)
                headers['X-Api-Key'] = this.apiKey;
            if (signature)
                headers['X-Signature'] = signature;
            this.logger.debug(`Calling CashPlus ${this.baseUrl}${endpoint}`);
            const res = await this.http.post(endpoint, data, { headers });
            if (!res || !res.data)
                throw new Error('Empty response from CashPlus');
            return res.data;
        }
        catch (err) {
            this.logger.error('CashPlus API error', err?.message || err);
            throw err;
        }
    }
};
exports.CashPlusPaymentProvider = CashPlusPaymentProvider;
exports.CashPlusPaymentProvider = CashPlusPaymentProvider = CashPlusPaymentProvider_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], CashPlusPaymentProvider);
//# sourceMappingURL=cashplus-payment.provider.js.map