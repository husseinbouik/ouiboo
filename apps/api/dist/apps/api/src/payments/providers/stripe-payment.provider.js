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
var StripePaymentProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripePaymentProvider = void 0;
const common_1 = require("@nestjs/common");
let Stripe;
try {
    Stripe = require('stripe').default;
}
catch (err) {
}
let StripePaymentProvider = StripePaymentProvider_1 = class StripePaymentProvider {
    constructor() {
        this.logger = new common_1.Logger(StripePaymentProvider_1.name);
        if (!Stripe) {
            this.logger.warn('Stripe module not available. Install stripe: npm install stripe');
        }
        else {
            try {
                this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
                    apiVersion: '2023-10-16',
                });
                this.publishableKey = process.env.STRIPE_PUBLISHABLE_KEY || '';
                this.callbackUrl = process.env.STRIPE_CALLBACK_URL || '';
            }
            catch (err) {
                this.logger.error('Failed to initialize Stripe', err);
            }
        }
    }
    async initiatePayment(amount, bookingId, travelerEmail, travelerName) {
        try {
            const session = await this.stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [
                    {
                        price_data: {
                            currency: 'mad',
                            product_data: {
                                name: `Trip Booking - ${bookingId}`,
                            },
                            unit_amount: Math.round(amount * 100),
                        },
                        quantity: 1,
                    },
                ],
                mode: 'payment',
                success_url: `${this.callbackUrl}/payments/success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${this.callbackUrl}/payments/cancel`,
                customer_email: travelerEmail,
                metadata: {
                    bookingId,
                    travelerName,
                },
            });
            return {
                sessionId: session.id,
                redirectUrl: session.url || '',
                expiresAt: new Date(session.expires_at * 1000),
                metadata: { provider: 'STRIPE', sessionId: session.id },
            };
        }
        catch (error) {
            throw new Error(`Stripe payment initiation failed: ${error.message}`);
        }
    }
    async verifyPayment(transactionId, bookingId) {
        try {
            const session = await this.stripe.checkout.sessions.retrieve(transactionId);
            if (session.payment_status === 'paid') {
                return {
                    status: 'success',
                    transactionId: session.payment_intent,
                    metadata: { ...session },
                };
            }
            else if (session.payment_status === 'unpaid') {
                return {
                    status: 'pending',
                    metadata: { ...session },
                };
            }
            else {
                return {
                    status: 'failure',
                    errorMessage: 'Payment failed or expired',
                    metadata: { ...session },
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
            const refund = await this.stripe.refunds.create({
                payment_intent: transactionId,
                amount: Math.round(amount * 100),
            });
            return {
                success: true,
                refundId: refund.id,
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
        try {
            const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
            this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
            return true;
        }
        catch (error) {
            return false;
        }
    }
};
exports.StripePaymentProvider = StripePaymentProvider;
exports.StripePaymentProvider = StripePaymentProvider = StripePaymentProvider_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], StripePaymentProvider);
//# sourceMappingURL=stripe-payment.provider.js.map