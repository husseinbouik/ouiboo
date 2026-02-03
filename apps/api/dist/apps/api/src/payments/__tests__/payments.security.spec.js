"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const common_1 = require("@nestjs/common");
const payments_service_1 = require("../payments.service");
const database_1 = require("@ouiboo/database");
const email_service_1 = require("../../email/email.service");
const payment_provider_factory_1 = require("../providers/payment-provider.factory");
const client_1 = require("@prisma/client");
describe('PaymentsService - Security Tests', () => {
    let service;
    let prismaService;
    let emailService;
    let providerFactory;
    const mockBooking = {
        id: 'booking-123',
        sessionId: 'session-123',
        travelerId: 'traveler-123',
        status: client_1.BookingStatus.PENDING,
        guestsCount: 2,
        totalAmount: 500,
        paymentMethod: client_1.PaymentMethod.MANUAL,
        paymentStatus: client_1.BookingPaymentStatus.UNPAID,
        session: {
            id: 'session-123',
            templateId: 'template-123',
            startDate: new Date(),
            endDate: new Date(),
            price: 250,
            deposit: 50,
            totalSeats: 10,
            availableSeats: 8,
            status: 'OPEN',
            currency: 'MAD',
            cancellationReason: null,
            minBookings: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        traveler: {
            id: 'traveler-123',
            email: 'traveler@example.com',
            name: 'John Doe',
        },
    };
    const mockPaymentSession = {
        sessionId: 'ps_123456',
        redirectUrl: 'https://checkout.stripe.com/pay/ps_123456',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        metadata: { bookingId: 'booking-123' },
    };
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            providers: [
                payments_service_1.PaymentsService,
                {
                    provide: database_1.PrismaService,
                    useValue: {
                        booking: {
                            findUnique: jest.fn(),
                            update: jest.fn(),
                        },
                        paymentTransaction: {
                            create: jest.fn(),
                            updateMany: jest.fn(),
                            findFirst: jest.fn(),
                            update: jest.fn(),
                        },
                        walletTransaction: {
                            create: jest.fn(),
                        },
                        notificationLog: {
                            create: jest.fn(),
                        },
                        tripSession: {
                            findUnique: jest.fn(),
                        },
                    },
                },
                {
                    provide: email_service_1.EmailService,
                    useValue: {
                        sendPaymentConfirmation: jest.fn(),
                    },
                },
                {
                    provide: payment_provider_factory_1.PaymentProviderFactory,
                    useValue: {
                        getProvider: jest.fn(),
                    },
                },
            ],
        }).compile();
        service = module.get(payments_service_1.PaymentsService);
        prismaService = module.get(database_1.PrismaService);
        emailService = module.get(email_service_1.EmailService);
        providerFactory = module.get(payment_provider_factory_1.PaymentProviderFactory);
    });
    describe('initiatePayment - Amount Validation Security', () => {
        it('should accept payment with correct amount (price * guests)', async () => {
            const correctAmount = 250 * 2;
            const dto = {
                bookingId: 'booking-123',
                amount: correctAmount,
                provider: 'stripe',
                travelerEmail: 'traveler@example.com',
                travelerName: 'John Doe',
            };
            jest.spyOn(prismaService.booking, 'findUnique').mockResolvedValue(mockBooking);
            jest.spyOn(prismaService.booking, 'update').mockResolvedValue(mockBooking);
            jest.spyOn(prismaService.paymentTransaction, 'create').mockResolvedValue({
                id: 'tx-123',
                amount: correctAmount,
            });
            const mockProvider = {
                initiatePayment: jest.fn().mockResolvedValue(mockPaymentSession),
                validateWebhookSignature: jest.fn(),
                verifyPayment: jest.fn(),
                processRefund: jest.fn(),
            };
            jest.spyOn(providerFactory, 'getProvider').mockReturnValue(mockProvider);
            const result = await service.initiatePayment(dto);
            expect(result.redirectUrl).toBe(mockPaymentSession.redirectUrl);
            expect(mockProvider.initiatePayment).toHaveBeenCalledWith(correctAmount, 'booking-123', 'traveler@example.com', 'John Doe');
            expect(prismaService.paymentTransaction.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    amount: correctAmount,
                }),
            }));
        });
        it('should reject payment with underpayment (amount < expected)', async () => {
            const expectedAmount = 250 * 2;
            const underpaymentAmount = 400;
            const dto = {
                bookingId: 'booking-123',
                amount: underpaymentAmount,
                provider: 'stripe',
                travelerEmail: 'traveler@example.com',
                travelerName: 'John Doe',
            };
            jest.spyOn(prismaService.booking, 'findUnique').mockResolvedValue(mockBooking);
            await expect(service.initiatePayment(dto)).rejects.toThrow(common_1.BadRequestException);
            await expect(service.initiatePayment(dto)).rejects.toThrow(new RegExp(`expected ${expectedAmount}.*got ${underpaymentAmount}`));
        });
        it('should reject payment with overpayment (amount > expected)', async () => {
            const expectedAmount = 250 * 2;
            const overpaymentAmount = 600;
            const dto = {
                bookingId: 'booking-123',
                amount: overpaymentAmount,
                provider: 'stripe',
                travelerEmail: 'traveler@example.com',
                travelerName: 'John Doe',
            };
            jest.spyOn(prismaService.booking, 'findUnique').mockResolvedValue(mockBooking);
            await expect(service.initiatePayment(dto)).rejects.toThrow(common_1.BadRequestException);
            await expect(service.initiatePayment(dto)).rejects.toThrow(new RegExp(`expected ${expectedAmount}.*got ${overpaymentAmount}`));
        });
        it('should allow small floating-point variance (< 0.01 tolerance)', async () => {
            const expectedAmount = 250 * 2;
            const floatingPointVariance = 500.005;
            const dto = {
                bookingId: 'booking-123',
                amount: floatingPointVariance,
                provider: 'stripe',
                travelerEmail: 'traveler@example.com',
                travelerName: 'John Doe',
            };
            jest.spyOn(prismaService.booking, 'findUnique').mockResolvedValue(mockBooking);
            jest.spyOn(prismaService.booking, 'update').mockResolvedValue(mockBooking);
            jest.spyOn(prismaService.paymentTransaction, 'create').mockResolvedValue({
                id: 'tx-123',
                amount: floatingPointVariance,
            });
            const mockProvider = {
                initiatePayment: jest.fn().mockResolvedValue(mockPaymentSession),
                validateWebhookSignature: jest.fn(),
                verifyPayment: jest.fn(),
                processRefund: jest.fn(),
            };
            jest.spyOn(providerFactory, 'getProvider').mockReturnValue(mockProvider);
            const result = await service.initiatePayment(dto);
            expect(result.redirectUrl).toBe(mockPaymentSession.redirectUrl);
            expect(mockProvider.initiatePayment).toHaveBeenCalledWith(floatingPointVariance, 'booking-123', 'traveler@example.com', 'John Doe');
        });
        it('should use authoritative amount for payment provider (not client-provided amount)', async () => {
            const expectedAmount = 250 * 2;
            const clientProvidedAmount = 500;
            const dto = {
                bookingId: 'booking-123',
                amount: clientProvidedAmount,
                provider: 'stripe',
                travelerEmail: 'traveler@example.com',
                travelerName: 'John Doe',
            };
            jest.spyOn(prismaService.booking, 'findUnique').mockResolvedValue(mockBooking);
            jest.spyOn(prismaService.booking, 'update').mockResolvedValue(mockBooking);
            jest.spyOn(prismaService.paymentTransaction, 'create').mockResolvedValue({
                id: 'tx-123',
                amount: expectedAmount,
            });
            const mockProvider = {
                initiatePayment: jest.fn().mockResolvedValue(mockPaymentSession),
                validateWebhookSignature: jest.fn(),
                verifyPayment: jest.fn(),
                processRefund: jest.fn(),
            };
            jest.spyOn(providerFactory, 'getProvider').mockReturnValue(mockProvider);
            await service.initiatePayment(dto);
            expect(mockProvider.initiatePayment).toHaveBeenCalledWith(expectedAmount, expect.anything(), expect.anything(), expect.anything());
        });
        it('should update booking totalAmount with validated amount', async () => {
            const expectedAmount = 250 * 2;
            const dto = {
                bookingId: 'booking-123',
                amount: expectedAmount,
                provider: 'stripe',
                travelerEmail: 'traveler@example.com',
                travelerName: 'John Doe',
            };
            jest.spyOn(prismaService.booking, 'findUnique').mockResolvedValue(mockBooking);
            jest.spyOn(prismaService.booking, 'update').mockResolvedValue(mockBooking);
            jest.spyOn(prismaService.paymentTransaction, 'create').mockResolvedValue({
                id: 'tx-123',
            });
            const mockProvider = {
                initiatePayment: jest.fn().mockResolvedValue(mockPaymentSession),
                validateWebhookSignature: jest.fn(),
                verifyPayment: jest.fn(),
                processRefund: jest.fn(),
            };
            jest.spyOn(providerFactory, 'getProvider').mockReturnValue(mockProvider);
            await service.initiatePayment(dto);
            expect(prismaService.booking.update).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    totalAmount: expectedAmount,
                    paymentStatus: client_1.BookingPaymentStatus.UNPAID,
                }),
            }));
        });
    });
});
//# sourceMappingURL=payments.security.spec.js.map