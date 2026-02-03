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
var CMIPaymentProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CMIPaymentProvider = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("axios");
const crypto = require("crypto");
let CMIPaymentProvider = CMIPaymentProvider_1 = class CMIPaymentProvider {
    constructor() {
        this.logger = new common_1.Logger(CMIPaymentProvider_1.name);
        this.merchantId = process.env.CMI_MERCHANT_ID || '';
        this.apiKey = process.env.CMI_API_KEY || '';
        this.baseUrl = process.env.CMI_BASE_URL || 'https://api.cmipay.com';
        this.callbackUrl = process.env.CMI_CALLBACK_URL || '';
        this.http = axios_1.default.create({ baseURL: this.baseUrl, timeout: 10000 });
    }
    async initiatePayment(amount, bookingId, travelerEmail, travelerName) {
        try {
            const paymentData = {
                merchantId: this.merchantId,
                amount: Math.round(amount * 100),
                currency: 'MAD',
                orderId: bookingId,
                description: `Trip Booking - ${bookingId}`,
                customerEmail: travelerEmail,
                customerName: travelerName,
                returnUrl: `${this.callbackUrl}/payments/callback`,
                cancelUrl: `${this.callbackUrl}/payments/cancel`,
                notifyUrl: `${this.callbackUrl}/payments/webhook`,
            };
            const response = await this.callCMIAPI('/payments/initiate', paymentData);
            return {
                sessionId: response.sessionId,
                redirectUrl: response.redirectUrl,
                expiresAt: new Date(Date.now() + 30 * 60 * 1000),
                metadata: { provider: 'CMI', ...response },
            };
        }
        catch (error) {
            throw new Error(`CMI payment initiation failed: ${error.message}`);
        }
    }
    async verifyPayment(transactionId, bookingId) {
        try {
            const response = await this.callCMIAPI('/payments/verify', {
                transactionId,
                orderId: bookingId,
                merchantId: this.merchantId,
            });
            if (response.status === 'SUCCESS') {
                return {
                    status: 'success',
                    transactionId: response.transactionId,
                    metadata: response,
                };
            }
            else if (response.status === 'PENDING') {
                return {
                    status: 'pending',
                    metadata: response,
                };
            }
            else {
                return {
                    status: 'failure',
                    errorMessage: response.errorMessage || 'Payment verification failed',
                    metadata: response,
                };
            }
        }
        catch (error) {
            return {
                status: 'failure',
                errorMessage: error.message,
            };
        }
    }
    async processRefund(transactionId, amount) {
        try {
            const response = await this.callCMIAPI('/payments/refund', {
                transactionId,
                amount: Math.round(amount * 100),
                merchantId: this.merchantId,
            });
            return {
                success: response.status === 'SUCCESS',
                refundId: response.refundId,
                error: response.errorMessage,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error.message,
            };
        }
    }
    validateWebhookSignature(payload, signature) {
        const crypto = require('crypto');
        const expectedSignature = crypto
            .createHmac('sha256', this.apiKey)
            .update(payload)
            .digest('hex');
        return expectedSignature === signature;
    }
    async callCMIAPI(endpoint, data) {
        try {
            const url = `${this.baseUrl}${endpoint}`;
            const payload = typeof data === 'string' ? data : JSON.stringify(data || {});
            const signature = this.apiKey
                ? crypto.createHmac('sha256', this.apiKey).update(payload).digest('hex')
                : '';
            const headers = {
                'Content-Type': 'application/json',
            };
            if (this.merchantId)
                headers['X-Merchant-Id'] = this.merchantId;
            if (this.apiKey)
                headers['X-Api-Key'] = this.apiKey;
            if (signature)
                headers['X-Signature'] = signature;
            this.logger.debug(`Calling CMI ${url}`);
            const res = await this.http.post(endpoint, data, { headers });
            if (!res || !res.data) {
                throw new Error('Empty response from CMI');
            }
            const body = res.data;
            return body;
        }
        catch (err) {
            this.logger.error('CMI API error', err?.message || err);
            throw err;
        }
    }
};
exports.CMIPaymentProvider = CMIPaymentProvider;
exports.CMIPaymentProvider = CMIPaymentProvider = CMIPaymentProvider_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], CMIPaymentProvider);
//# sourceMappingURL=cmi-payment.provider.js.map