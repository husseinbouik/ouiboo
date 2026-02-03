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
var PaymentsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../database/database.service");
const email_service_1 = require("../email/email.service");
const payment_provider_factory_1 = require("./providers/payment-provider.factory");
let PaymentsService = PaymentsService_1 = class PaymentsService {
    constructor(prisma, paymentProviderFactory, emailService) {
        this.prisma = prisma;
        this.paymentProviderFactory = paymentProviderFactory;
        this.emailService = emailService;
        this.logger = new common_1.Logger(PaymentsService_1.name);
    }
    async initiatePayment(dto) {
        const booking = await this.prisma.booking.findUnique({
            where: { id: dto.bookingId },
            include: { session: true, traveler: true },
        });
        if (!booking) {
            throw new common_1.BadRequestException('Booking not found');
        }
        if (booking.status !== BookingStatus.PENDING) {
            throw new common_1.BadRequestException('Booking is not in pending status');
        }
        const expectedAmount = booking.session.price * booking.guestsCount;
        if (Math.abs(dto.amount - expectedAmount) > 0.01) {
            this.logger.warn(`Payment amount mismatch for booking ${dto.bookingId}: expected ${expectedAmount}, got ${dto.amount}`);
            throw new common_1.BadRequestException(`Amount mismatch: expected ${expectedAmount}, got ${dto.amount}`);
        }
        const provider = this.paymentProviderFactory.getProvider(dto.provider);
        const paymentSession = await provider.initiatePayment(expectedAmount, dto.bookingId, dto.travelerEmail, dto.travelerName);
        await this.prisma.paymentTransaction.create({
            data: {
                bookingId: dto.bookingId,
                amount: expectedAmount,
                method: PaymentMethod.GATEWAY,
                transactionId: paymentSession.sessionId,
                status: 'INITIATED',
                provider: dto.provider,
                providerData: paymentSession.metadata,
            },
        });
        await this.prisma.booking.update({
            where: { id: dto.bookingId },
            data: {
                paymentMethod: PaymentMethod.GATEWAY,
                paymentGatewayTransactionId: paymentSession.sessionId,
                paymentStatus: BookingPaymentStatus.UNPAID,
                totalAmount: expectedAmount,
            },
        });
        this.logger.log(`Payment session initiated for booking ${dto.bookingId}: ${expectedAmount} ${booking.session.currency} via ${dto.provider}`);
        return {
            redirectUrl: paymentSession.redirectUrl,
            sessionId: paymentSession.sessionId,
            expiresAt: paymentSession.expiresAt,
        };
    }
    async verifyPayment(dto) {
        const provider = this.paymentProviderFactory.getProvider(dto.provider);
        const result = await provider.verifyPayment(dto.transactionId, dto.bookingId);
        const booking = await this.prisma.booking.findUnique({
            where: { id: dto.bookingId },
            include: {
                session: { include: { template: true } },
            },
        });
        if (!booking) {
            throw new common_1.BadRequestException('Booking not found');
        }
        if (result.status === 'success') {
            await this.prisma.paymentTransaction.updateMany({
                where: {
                    bookingId: dto.bookingId,
                    transactionId: dto.transactionId,
                },
                data: {
                    status: 'SUCCESS',
                    providerData: result.metadata,
                },
            });
            await this.transitionBookingToConfirmed(dto.bookingId, result.metadata);
        }
        else {
            if (booking.status !== 'CANCELLED' && booking.paymentStatus !== 'FAILED') {
                await this.prisma.$transaction(async (tx) => {
                    await tx.paymentTransaction.updateMany({
                        where: {
                            bookingId: dto.bookingId,
                            transactionId: dto.transactionId,
                        },
                        data: {
                            status: 'FAILED',
                            providerData: result.metadata,
                        },
                    });
                    await tx.booking.update({
                        where: { id: dto.bookingId },
                        data: {
                            status: 'CANCELLED',
                            paymentStatus: BookingPaymentStatus.FAILED,
                        },
                    });
                    await tx.tripSession.update({
                        where: { id: booking.sessionId },
                        data: {
                            availableSeats: {
                                increment: booking.guestsCount,
                            },
                        },
                    });
                    await tx.auditLog.create({
                        data: {
                            userId: booking.travelerId,
                            action: 'PAYMENT_FAILED',
                            resourceType: 'BOOKING',
                            resourceId: dto.bookingId,
                            details: {
                                provider: dto.provider,
                                transactionId: dto.transactionId,
                                reason: result.error || 'Payment verification failed',
                                seatsReleased: booking.guestsCount,
                            },
                        },
                    });
                });
            }
        }
        this.logger.log(`Payment verified for booking ${dto.bookingId}: ${result.status}`);
        return result;
    }
    async processRefund(dto) {
        const booking = await this.prisma.booking.findUnique({
            where: { id: dto.bookingId },
        });
        if (!booking) {
            throw new common_1.BadRequestException('Booking not found');
        }
        const provider = this.paymentProviderFactory.getProvider(dto.provider);
        const refundResult = await provider.processRefund(dto.transactionId, dto.amount);
        if (refundResult.success) {
            await this.prisma.booking.update({
                where: { id: dto.bookingId },
                data: {
                    refundAmount: dto.amount,
                    refundStatus: 'COMPLETED',
                    refundProcessedAt: new Date(),
                    paymentStatus: BookingPaymentStatus.REFUNDED,
                },
            });
            if (booking.sessionId) {
                const session = await this.prisma.tripSession.findUnique({
                    where: { id: booking.sessionId },
                    include: { template: { include: { agency: { include: { wallet: true } } } } },
                });
                const agencyWallet = session?.template?.agency?.wallet;
                if (!agencyWallet) {
                    throw new common_1.BadRequestException('Agency missing wallet');
                }
                await this.prisma.walletTransaction.create({
                    data: {
                        walletId: agencyWallet.id,
                        amount: -Math.abs(dto.amount),
                        type: 'REFUND',
                        reason: `Refund for booking ${dto.bookingId}`,
                        referenceId: refundResult.refundId || null,
                    },
                });
            }
            this.logger.log(`Refund processed for booking ${dto.bookingId}: ${refundResult.refundId}`);
        }
        return refundResult;
    }
    async handleWebhookCallback(provider, payload, signature) {
        this.logger.log(`Processing webhook from ${provider}`);
        const paymentProvider = this.paymentProviderFactory.getProvider(provider);
        const isValid = paymentProvider.validateWebhookSignature(payload, signature);
        if (!isValid) {
            this.logger.error(`Invalid webhook signature from ${provider}`);
            throw new common_1.BadRequestException('Invalid webhook signature');
        }
        try {
            const data = JSON.parse(payload);
            if (provider.toLowerCase() === 'stripe') {
                await this.handleStripeWebhook(data);
            }
            else if (provider.toLowerCase() === 'cmi') {
                await this.handleCMIWebhook(data);
            }
            else if (provider.toLowerCase() === 'cashplus') {
                await this.handleCashPlusWebhook(data);
            }
            else {
                this.logger.warn(`Unknown payment provider for webhook: ${provider}`);
            }
            this.logger.log(`Webhook processed successfully from ${provider}`);
            return { received: true, processed: true };
        }
        catch (error) {
            this.logger.error(`Error processing webhook from ${provider}: ${error.message}`);
            throw new common_1.BadRequestException(`Webhook processing failed: ${error.message}`);
        }
    }
    async handleStripeWebhook(event) {
        this.logger.log(`Processing Stripe webhook event type: ${event.type}`);
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                await this.handleStripePaymentSuccess(session);
                break;
            }
            case 'payment_intent.succeeded': {
                const paymentIntent = event.data.object;
                await this.handleStripePaymentIntentSuccess(paymentIntent);
                break;
            }
            case 'payment_intent.payment_failed': {
                const paymentIntent = event.data.object;
                await this.handleStripePaymentFailed(paymentIntent);
                break;
            }
            case 'charge.refunded': {
                const charge = event.data.object;
                await this.handleStripeRefund(charge);
                break;
            }
            default:
                this.logger.debug(`Unhandled Stripe event type: ${event.type}`);
        }
    }
    async handleStripePaymentSuccess(session) {
        const bookingId = session.metadata?.bookingId;
        if (!bookingId) {
            this.logger.warn('Stripe webhook missing bookingId in metadata');
            return;
        }
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
            include: { traveler: true, session: { include: { template: true, agency: true } } },
        });
        if (!booking) {
            this.logger.warn(`Booking not found for Stripe webhook: ${bookingId}`);
            return;
        }
        await this.prisma.paymentTransaction.updateMany({
            where: {
                bookingId,
                transactionId: session.id,
            },
            data: {
                status: 'SUCCESS',
                providerData: session,
            },
        });
        await this.transitionBookingToConfirmed(bookingId, {
            provider: 'STRIPE',
            sessionId: session.id,
            paymentIntentId: session.payment_intent,
            amountReceived: session.amount_total / 100,
        });
    }
    async handleStripePaymentFailed(paymentIntent) {
        const transaction = await this.prisma.paymentTransaction.findFirst({
            where: {
                transactionId: paymentIntent.id,
            },
            include: {
                booking: {
                    include: {
                        session: { include: { template: true } },
                    },
                },
            },
        });
        if (!transaction) {
            this.logger.warn(`Transaction not found for Stripe payment intent: ${paymentIntent.id}`);
            return;
        }
        const booking = transaction.booking;
        if (booking.status === 'CANCELLED' || booking.paymentStatus === 'FAILED') {
            this.logger.warn(`Booking ${booking.id} already cancelled or failed, skipping adjustment`);
            return;
        }
        await this.prisma.$transaction(async (tx) => {
            await tx.paymentTransaction.update({
                where: { id: transaction.id },
                data: {
                    status: 'FAILED',
                    providerData: paymentIntent,
                },
            });
            await tx.booking.update({
                where: { id: booking.id },
                data: {
                    status: 'CANCELLED',
                    paymentStatus: BookingPaymentStatus.FAILED,
                },
            });
            await tx.tripSession.update({
                where: { id: booking.sessionId },
                data: {
                    availableSeats: {
                        increment: booking.guestsCount,
                    },
                },
            });
            await tx.auditLog.create({
                data: {
                    userId: booking.travelerId,
                    action: 'PAYMENT_FAILED',
                    resourceType: 'BOOKING',
                    resourceId: booking.id,
                    details: {
                        provider: 'Stripe',
                        paymentIntentId: paymentIntent.id,
                        reason: paymentIntent.last_payment_error?.message || 'Payment declined',
                        seatsReleased: booking.guestsCount,
                    },
                },
            });
        });
        this.logger.log(`Payment failed for booking ${booking.id} (Stripe: ${paymentIntent.id}), seats released: ${booking.guestsCount}`);
    }
    async handleStripeRefund(charge) {
        const transaction = await this.prisma.paymentTransaction.findFirst({
            where: {
                providerData: {
                    path: ['chargeId'],
                    equals: charge.id,
                },
            },
            include: { booking: true },
        });
        if (!transaction) {
            this.logger.debug(`Transaction not found for Stripe refund: ${charge.id}`);
            return;
        }
        const booking = transaction.booking;
        await this.prisma.booking.update({
            where: { id: booking.id },
            data: {
                paymentStatus: BookingPaymentStatus.REFUNDED,
                refundAmount: charge.amount_refunded / 100,
                refundProcessedAt: new Date(),
            },
        });
        this.logger.log(`Refund processed for booking ${booking.id}: ${charge.refund.id}`);
    }
    async handleStripePaymentIntentSuccess(paymentIntent) {
        const transaction = await this.prisma.paymentTransaction.findFirst({
            where: {
                providerData: {
                    path: ['paymentIntentId'],
                    equals: paymentIntent.id,
                },
            },
            include: { booking: true },
        });
        if (!transaction) {
            this.logger.debug(`Transaction not found for Stripe payment intent: ${paymentIntent.id}`);
            return;
        }
        if (transaction.booking.paymentStatus !== BookingPaymentStatus.PAID) {
            await this.transitionBookingToConfirmed(transaction.booking.id, {
                provider: 'STRIPE',
                paymentIntentId: paymentIntent.id,
                amountReceived: paymentIntent.amount / 100,
            });
        }
    }
    async handleCMIWebhook(event) {
        this.logger.log(`Processing CMI webhook event: ${event.eventType || 'unknown'}`);
        switch (event.eventType) {
            case 'PAYMENT_SUCCESS':
            case 'payment.success': {
                await this.handleCMIPaymentSuccess(event);
                break;
            }
            case 'PAYMENT_FAILED':
            case 'payment.failed': {
                await this.handleCMIPaymentFailed(event);
                break;
            }
            case 'REFUND_SUCCESS':
            case 'refund.success': {
                await this.handleCMIRefund(event);
                break;
            }
            default:
                this.logger.debug(`Unhandled CMI event type: ${event.eventType}`);
        }
    }
    async handleCMIPaymentSuccess(event) {
        const bookingId = event.orderId || event.metadata?.bookingId;
        if (!bookingId) {
            this.logger.warn('CMI webhook missing bookingId');
            return;
        }
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
            include: { traveler: true, session: { include: { template: true, agency: true } } },
        });
        if (!booking) {
            this.logger.warn(`Booking not found for CMI webhook: ${bookingId}`);
            return;
        }
        await this.prisma.paymentTransaction.updateMany({
            where: {
                bookingId,
                transactionId: event.transactionId,
            },
            data: {
                status: 'SUCCESS',
                providerData: event,
            },
        });
        await this.transitionBookingToConfirmed(bookingId, {
            provider: 'CMI',
            transactionId: event.transactionId,
            authCode: event.authCode,
            amountReceived: event.amount,
        });
    }
    async handleCMIPaymentFailed(event) {
        const bookingId = event.orderId || event.metadata?.bookingId;
        if (!bookingId) {
            this.logger.warn('CMI webhook missing bookingId');
            return;
        }
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
            include: {
                session: { include: { template: true } },
            },
        });
        if (!booking) {
            this.logger.warn(`Booking not found: ${bookingId}`);
            return;
        }
        if (booking.status === 'CANCELLED' || booking.paymentStatus === 'FAILED') {
            this.logger.warn(`Booking ${bookingId} already cancelled or failed, skipping adjustment`);
            return;
        }
        await this.prisma.$transaction(async (tx) => {
            await tx.paymentTransaction.updateMany({
                where: {
                    bookingId,
                },
                data: {
                    status: 'FAILED',
                    providerData: event,
                },
            });
            await tx.booking.update({
                where: { id: bookingId },
                data: {
                    status: 'CANCELLED',
                    paymentStatus: BookingPaymentStatus.FAILED,
                },
            });
            await tx.tripSession.update({
                where: { id: booking.sessionId },
                data: {
                    availableSeats: {
                        increment: booking.guestsCount,
                    },
                },
            });
            await tx.auditLog.create({
                data: {
                    userId: booking.travelerId,
                    action: 'PAYMENT_FAILED',
                    resourceType: 'BOOKING',
                    resourceId: bookingId,
                    details: {
                        provider: 'CMI',
                        cmiTransactionId: event.transactionId,
                        reason: event.failureReason || 'CMI payment failed',
                        seatsReleased: booking.guestsCount,
                    },
                },
            });
        });
        this.logger.log(`Payment failed for booking ${bookingId} (CMI: ${event.transactionId}), seats released: ${booking.guestsCount}`);
    }
    async handleCMIRefund(event) {
        const bookingId = event.orderId || event.metadata?.bookingId;
        if (!bookingId) {
            this.logger.warn('CMI webhook missing bookingId for refund');
            return;
        }
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
        });
        if (!booking) {
            this.logger.warn(`Booking not found for CMI refund: ${bookingId}`);
            return;
        }
        await this.prisma.booking.update({
            where: { id: bookingId },
            data: {
                paymentStatus: BookingPaymentStatus.REFUNDED,
                refundAmount: event.amount,
                refundProcessedAt: new Date(),
            },
        });
        this.logger.log(`Refund processed for booking ${bookingId}: ${event.refundId}`);
    }
    async handleCashPlusWebhook(event) {
        this.logger.log(`Processing CashPlus webhook event: ${event.status || 'unknown'}`);
        const bookingId = event.orderId || event.metadata?.bookingId;
        if (!bookingId) {
            this.logger.warn('CashPlus webhook missing bookingId');
            return;
        }
        const status = event.status || event.eventStatus;
        if (status === 'SUCCESS' || status === 'PAID') {
            await this.handleCashPlusPaymentSuccess(event);
        }
        else if (status === 'FAILED' || status === 'REJECTED') {
            await this.handleCashPlusPaymentFailed(event);
        }
        else {
            this.logger.debug(`Unhandled CashPlus event status: ${status}`);
        }
    }
    async handleCashPlusPaymentSuccess(event) {
        const bookingId = event.orderId || event.metadata?.bookingId;
        if (!bookingId) {
            this.logger.warn('CashPlus webhook missing bookingId for success');
            return;
        }
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
            include: { traveler: true, session: { include: { template: { include: { agency: { include: { wallet: true } } } } } } },
        });
        if (!booking) {
            this.logger.warn(`Booking not found for CashPlus webhook: ${bookingId}`);
            return;
        }
        await this.prisma.paymentTransaction.updateMany({
            where: {
                bookingId,
                transactionId: event.transactionId,
            },
            data: {
                status: 'SUCCESS',
                providerData: event,
            },
        });
        await this.transitionBookingToConfirmed(bookingId, {
            provider: 'CASHPLUS',
            transactionId: event.transactionId,
            amountReceived: event.amount,
            orderId: event.orderId,
        });
    }
    async handleCashPlusPaymentFailed(event) {
        const bookingId = event.orderId || event.metadata?.bookingId;
        if (!bookingId) {
            this.logger.warn('CashPlus webhook missing bookingId for failure');
            return;
        }
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
            include: {
                session: { include: { template: true } },
            },
        });
        if (!booking) {
            this.logger.warn(`Booking not found: ${bookingId}`);
            return;
        }
        if (booking.status === 'CANCELLED' || booking.paymentStatus === 'FAILED') {
            this.logger.warn(`Booking ${bookingId} already cancelled or failed, skipping adjustment`);
            return;
        }
        await this.prisma.$transaction(async (tx) => {
            await tx.paymentTransaction.updateMany({
                where: {
                    bookingId,
                },
                data: {
                    status: 'FAILED',
                    providerData: event,
                },
            });
            await tx.booking.update({
                where: { id: bookingId },
                data: {
                    status: 'CANCELLED',
                    paymentStatus: BookingPaymentStatus.FAILED,
                },
            });
            await tx.tripSession.update({
                where: { id: booking.sessionId },
                data: {
                    availableSeats: {
                        increment: booking.guestsCount,
                    },
                },
            });
            await tx.auditLog.create({
                data: {
                    userId: booking.travelerId,
                    action: 'PAYMENT_FAILED',
                    resourceType: 'BOOKING',
                    resourceId: bookingId,
                    details: {
                        provider: 'CashPlus',
                        cashplusTransactionId: event.transactionId,
                        reason: event.failureReason || 'CashPlus payment failed',
                        seatsReleased: booking.guestsCount,
                    },
                },
            });
        });
        this.logger.log(`Payment failed for booking ${bookingId} (CashPlus: ${event.transactionId}), seats released: ${booking.guestsCount}`);
    }
    async transitionBookingToConfirmed(bookingId, paymentMetadata) {
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
            include: {
                traveler: true,
                session: {
                    include: {
                        template: { include: { agency: { include: { wallet: true } } } },
                    },
                },
            },
        });
        if (!booking) {
            this.logger.error(`Booking not found for confirmation: ${bookingId}`);
            return;
        }
        const confirmedBooking = await this.prisma.booking.update({
            where: { id: bookingId },
            data: {
                status: BookingStatus.CONFIRMED,
                paymentStatus: BookingPaymentStatus.PAID,
                paymentGatewayMetadata: paymentMetadata,
                confirmedAt: new Date(),
            },
        });
        const agencyWallet = booking.session?.template?.agency?.wallet;
        if (!agencyWallet) {
            throw new common_1.BadRequestException('Agency missing wallet');
        }
        await this.prisma.walletTransaction.create({
            data: {
                walletId: agencyWallet.id,
                amount: booking.totalAmount,
                type: 'BOOKING',
                reason: `Payment received for booking ${bookingId}`,
                referenceId: bookingId,
            },
        });
        try {
            await this.emailService.sendPaymentConfirmation(booking.traveler.email, booking.session.template.title);
            this.logger.log(`Payment confirmation email sent to ${booking.traveler.email}`);
        }
        catch (error) {
            this.logger.error(`Failed to send payment confirmation email: ${error.message}`);
        }
        await this.prisma.notificationLog.create({
            data: {
                userId: booking.travelerId,
                notificationType: 'BOOKING_CONFIRMATION',
                recipientEmail: booking.traveler.email,
                status: 'SENT',
                sentAt: new Date(),
            },
        });
        this.logger.log(`Booking ${bookingId} transitioned to CONFIRMED state`);
        return confirmedBooking;
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = PaymentsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService,
        payment_provider_factory_1.PaymentProviderFactory,
        email_service_1.EmailService])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map