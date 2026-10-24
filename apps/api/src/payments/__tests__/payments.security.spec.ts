import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PaymentsService } from '../payments.service';
import { DatabaseService } from '../../database/database.service';
import { EmailService } from '../../email/email.service';
import { PaymentProviderFactory } from '../providers/payment-provider.factory';
import { InitiatePaymentDto } from '../dto/payment.dto';
import { BookingStatus, BookingPaymentStatus, PaymentMethod, PaymentCustodian, PaymentLedgerEntryType } from '@ouiboo/database';
import { ExternalPaymentsService } from '../../external-payments/external-payments.service';

describe('PaymentsService - Security Tests', () => {
  let service: PaymentsService;
  let prismaService: DatabaseService;
  let emailService: EmailService;
  let providerFactory: PaymentProviderFactory;
  let externalPaymentsService: ExternalPaymentsService;

  const mockBooking = {
    id: 'booking-123',
    sessionId: 'session-123',
    travelerId: 'traveler-123',
    status: BookingStatus.PENDING,
    guestsCount: 2,
    totalAmount: 500,
    paymentMethod: PaymentMethod.MANUAL,
    paymentStatus: BookingPaymentStatus.UNPAID,
    session: {
      id: 'session-123',
      templateId: 'template-123',
      startDate: new Date(),
      endDate: new Date(),
      price: 250, // price per person
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
    process.env.ENABLE_GATEWAY_PAYMENTS = 'true';
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: DatabaseService,
          useValue: {
            booking: {
              findUnique: jest.fn(),
              update: jest.fn(),
              updateMany: jest.fn(),
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
            wallet: {
              upsert: jest.fn(),
              update: jest.fn(),
            },
            notificationLog: {
              create: jest.fn(),
            },
            auditLog: {
              create: jest.fn(),
            },
            tripSession: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            $transaction: jest.fn(async (callback) => callback(module.get(DatabaseService))),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendPaymentConfirmation: jest.fn(),
          },
        },
        {
          provide: PaymentProviderFactory,
          useValue: {
            getProvider: jest.fn(),
          },
        },
        {
          provide: ExternalPaymentsService,
          useValue: {
            recordPaymentVerifiedInTransaction: jest.fn(),
            recordPaymentRejectedInTransaction: jest.fn(),
            recordRefund: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    prismaService = module.get<DatabaseService>(DatabaseService);
    emailService = module.get<EmailService>(EmailService);
    providerFactory = module.get<PaymentProviderFactory>(PaymentProviderFactory);
    externalPaymentsService = module.get<ExternalPaymentsService>(ExternalPaymentsService);
  });

  describe('initiatePayment - Amount Validation Security', () => {
    it('should accept payment with correct amount (price * guests)', async () => {
      const correctAmount = 250 * 2; // 500 MAD for 2 guests at 250 each

      const dto: InitiatePaymentDto = {
        bookingId: 'booking-123',
        amount: correctAmount,
        provider: 'stripe',
        travelerEmail: 'traveler@example.com',
        travelerName: 'John Doe',
      };

      jest.spyOn(prismaService.booking, 'findUnique').mockResolvedValue(mockBooking as any);
      jest.spyOn(prismaService.booking, 'update').mockResolvedValue(mockBooking as any);
      jest.spyOn(prismaService.paymentTransaction, 'create').mockResolvedValue({
        id: 'tx-123',
        amount: correctAmount,
      } as any);

      const mockProvider = {
        initiatePayment: jest.fn().mockResolvedValue(mockPaymentSession),
        validateWebhookSignature: jest.fn(),
        verifyPayment: jest.fn(),
        processRefund: jest.fn(),
      };

      jest.spyOn(providerFactory, 'getProvider').mockReturnValue(mockProvider as any);

      const result = await service.initiatePayment(dto, 'traveler-123');

      expect(result.redirectUrl).toBe(mockPaymentSession.redirectUrl);
      const [providerAmount, providerBookingId, providerEmail, providerName] = mockProvider.initiatePayment.mock.calls[0];
      expect(providerAmount.toString()).toBe('500');
      expect([providerBookingId, providerEmail, providerName]).toEqual([
        'booking-123',
        'traveler@example.com',
        'John Doe',
      ]);
      expect(prismaService.paymentTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            amount: expect.objectContaining({}),
          }),
        }),
      );
      expect((prismaService.paymentTransaction.create as jest.Mock).mock.calls[0][0].data.amount.toString()).toBe('500');
    });

    it('should reject payment initiation for a booking owned by another traveler', async () => {
      const dto: InitiatePaymentDto = {
        bookingId: 'booking-123',
        amount: 500,
        provider: 'stripe',
        travelerEmail: 'traveler@example.com',
        travelerName: 'John Doe',
      };

      jest.spyOn(prismaService.booking, 'findUnique').mockResolvedValue(mockBooking as any);

      await expect(service.initiatePayment(dto, 'traveler-999')).rejects.toThrow(
        'Booking does not belong to the authenticated traveler',
      );
    });

    it('should reject payment with underpayment (amount < expected)', async () => {
      const expectedAmount = 250 * 2; // 500 MAD
      const underpaymentAmount = 400; // Only 400 MAD instead of 500

      const dto: InitiatePaymentDto = {
        bookingId: 'booking-123',
        amount: underpaymentAmount,
        provider: 'stripe',
        travelerEmail: 'traveler@example.com',
        travelerName: 'John Doe',
      };

      jest.spyOn(prismaService.booking, 'findUnique').mockResolvedValue(mockBooking as any);

      await expect(service.initiatePayment(dto, 'traveler-123')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.initiatePayment(dto, 'traveler-123')).rejects.toThrow(
        new RegExp(`expected ${expectedAmount}.*got ${underpaymentAmount}`),
      );
    });

    it('should reject payment with overpayment (amount > expected)', async () => {
      const expectedAmount = 250 * 2; // 500 MAD
      const overpaymentAmount = 600; // 600 MAD instead of 500

      const dto: InitiatePaymentDto = {
        bookingId: 'booking-123',
        amount: overpaymentAmount,
        provider: 'stripe',
        travelerEmail: 'traveler@example.com',
        travelerName: 'John Doe',
      };

      jest.spyOn(prismaService.booking, 'findUnique').mockResolvedValue(mockBooking as any);

      await expect(service.initiatePayment(dto, 'traveler-123')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.initiatePayment(dto, 'traveler-123')).rejects.toThrow(
        new RegExp(`expected ${expectedAmount}.*got ${overpaymentAmount}`),
      );
    });

    it('should reject fractional-cent floating-point variance instead of tolerating JS float drift', async () => {
      const floatingPointVariance = 500.005;

      const dto: InitiatePaymentDto = {
        bookingId: 'booking-123',
        amount: floatingPointVariance,
        provider: 'stripe',
        travelerEmail: 'traveler@example.com',
        travelerName: 'John Doe',
      };

      jest.spyOn(prismaService.booking, 'findUnique').mockResolvedValue(mockBooking as any);
      await expect(service.initiatePayment(dto, 'traveler-123')).rejects.toThrow(
        /expected 500.00.*got 500.005/,
      );
    });

    it('should use authoritative amount for payment provider (not client-provided amount)', async () => {
      const expectedAmount = 250 * 2; // 500 MAD
      const clientProvidedAmount = 500; // Client-provided amount

      const dto: InitiatePaymentDto = {
        bookingId: 'booking-123',
        amount: clientProvidedAmount,
        provider: 'stripe',
        travelerEmail: 'traveler@example.com',
        travelerName: 'John Doe',
      };

      jest.spyOn(prismaService.booking, 'findUnique').mockResolvedValue(mockBooking as any);
      jest.spyOn(prismaService.booking, 'update').mockResolvedValue(mockBooking as any);
      jest.spyOn(prismaService.paymentTransaction, 'create').mockResolvedValue({
        id: 'tx-123',
        amount: expectedAmount,
      } as any);

      const mockProvider = {
        initiatePayment: jest.fn().mockResolvedValue(mockPaymentSession),
        validateWebhookSignature: jest.fn(),
        verifyPayment: jest.fn(),
        processRefund: jest.fn(),
      };

      jest.spyOn(providerFactory, 'getProvider').mockReturnValue(mockProvider as any);

      await service.initiatePayment(dto, 'traveler-123');

      // Verify that the provider received the validated expectedAmount, not the client-provided dto.amount
      expect(mockProvider.initiatePayment.mock.calls[0][0].toString()).toBe(String(expectedAmount));
    });

    it('should update booking totalAmount with validated amount', async () => {
      const expectedAmount = 250 * 2; // 500 MAD

      const dto: InitiatePaymentDto = {
        bookingId: 'booking-123',
        amount: expectedAmount,
        provider: 'stripe',
        travelerEmail: 'traveler@example.com',
        travelerName: 'John Doe',
      };

      jest.spyOn(prismaService.booking, 'findUnique').mockResolvedValue(mockBooking as any);
      jest.spyOn(prismaService.booking, 'update').mockResolvedValue(mockBooking as any);
      jest.spyOn(prismaService.paymentTransaction, 'create').mockResolvedValue({
        id: 'tx-123',
      } as any);

      const mockProvider = {
        initiatePayment: jest.fn().mockResolvedValue(mockPaymentSession),
        validateWebhookSignature: jest.fn(),
        verifyPayment: jest.fn(),
        processRefund: jest.fn(),
      };

      jest.spyOn(providerFactory, 'getProvider').mockReturnValue(mockProvider as any);

      await service.initiatePayment(dto, 'traveler-123');

      const updatePayload = (prismaService.booking.update as jest.Mock).mock.calls[0][0];
      expect(updatePayload.data.totalAmount.toString()).toBe(String(expectedAmount));
      expect(updatePayload.data.paymentStatus).toBe(BookingPaymentStatus.UNPAID);
    });
  });

  describe('verifyPayment - Booking and payment-record finalization', () => {
    it('records a verified external payment (custodian AGENCY_PSP) and never touches a wallet', async () => {
      const providerResult = {
        status: 'success' as const,
        metadata: { provider: 'CASHPLUS', paid: true },
      };

      const provider = {
        verifyPayment: jest.fn().mockResolvedValue(providerResult),
        initiatePayment: jest.fn(),
        validateWebhookSignature: jest.fn(),
        processRefund: jest.fn(),
      };

      jest.spyOn(providerFactory, 'getProvider').mockReturnValue(provider as any);
      jest.spyOn(prismaService.booking, 'findUnique')
        .mockResolvedValueOnce({
          ...mockBooking,
          session: { ...mockBooking.session, template: { id: 'template-1', agencyId: 'agency-123', title: 'Sahara Escape' } },
        } as any)
        .mockResolvedValueOnce({
          ...mockBooking,
          traveler: mockBooking.traveler,
          session: {
            ...mockBooking.session,
            template: {
              id: 'template-1',
              agencyId: 'agency-123',
              title: 'Sahara Escape',
              agency: { id: 'agency-123' },
            },
          },
        } as any);

      jest.spyOn(prismaService.booking, 'updateMany').mockResolvedValue({ count: 1 } as any);
      jest.spyOn(prismaService.paymentTransaction, 'updateMany').mockResolvedValue({ count: 1 } as any);
      jest.spyOn(prismaService.notificationLog, 'create').mockResolvedValue({ id: 'notif-1' } as any);
      jest.spyOn(emailService, 'sendPaymentConfirmation').mockResolvedValue(undefined);

      await service.verifyPayment({
        bookingId: 'booking-123',
        provider: 'CASHPLUS',
        transactionId: 'gateway-tx-1',
      }, 'traveler-123');

      // #368: the payment is recorded as a fact with the agency's PSP as
      // custodian. No wallet is created, credited, or even read.
      expect(externalPaymentsService.recordPaymentVerifiedInTransaction).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          bookingId: 'booking-123',
          agencyId: 'agency-123',
          custodian: PaymentCustodian.AGENCY_PSP,
          source: 'GATEWAY_WEBHOOK',
        }),
        PaymentLedgerEntryType.PAYMENT_CAPTURED,
      );
      expect(prismaService.wallet.upsert).not.toHaveBeenCalled();
      expect(prismaService.wallet.update).not.toHaveBeenCalled();
      expect(prismaService.walletTransaction.create).not.toHaveBeenCalled();
    });

    it('rejects gateway verification for a booking owned by another traveler', async () => {
      const providerResult = {
        status: 'success' as const,
        metadata: { provider: 'CASHPLUS', paid: true },
      };

      const provider = {
        verifyPayment: jest.fn().mockResolvedValue(providerResult),
        initiatePayment: jest.fn(),
        validateWebhookSignature: jest.fn(),
        processRefund: jest.fn(),
      };

      jest.spyOn(providerFactory, 'getProvider').mockReturnValue(provider as any);
      jest.spyOn(prismaService.booking, 'findUnique').mockResolvedValue({
        ...mockBooking,
        session: { ...mockBooking.session, template: { id: 'template-1', agencyId: 'agency-123' } },
      } as any);

      await expect(service.verifyPayment({
        bookingId: 'booking-123',
        provider: 'CASHPLUS',
        transactionId: 'gateway-tx-1',
      }, 'traveler-999')).rejects.toThrow('Booking does not belong to the authenticated traveler');
    });

    it('keeps the booking pending when the provider verification is still pending', async () => {
      const provider = {
        verifyPayment: jest.fn().mockResolvedValue({
          status: 'pending',
          metadata: { provider: 'CASHPLUS' },
        }),
        initiatePayment: jest.fn(),
        validateWebhookSignature: jest.fn(),
        processRefund: jest.fn(),
      };

      jest.spyOn(providerFactory, 'getProvider').mockReturnValue(provider as any);
      jest.spyOn(prismaService.booking, 'findUnique').mockResolvedValue({
        ...mockBooking,
        session: { ...mockBooking.session, template: { id: 'template-1', agencyId: 'agency-123' } },
      } as any);

      const result = await service.verifyPayment({
        bookingId: 'booking-123',
        provider: 'CASHPLUS',
        transactionId: 'gateway-tx-1',
      }, 'traveler-123');

      expect(result.status).toBe('pending');
      expect(prismaService.booking.updateMany).not.toHaveBeenCalled();
      expect(prismaService.tripSession.update).not.toHaveBeenCalled();
    });

    it('releases seats only after atomically claiming a failed pending booking', async () => {
      const provider = {
        verifyPayment: jest.fn().mockResolvedValue({
          status: 'failure',
          error: 'Payment declined',
          metadata: { provider: 'CASHPLUS' },
        }),
        initiatePayment: jest.fn(),
        validateWebhookSignature: jest.fn(),
        processRefund: jest.fn(),
      };

      jest.spyOn(providerFactory, 'getProvider').mockReturnValue(provider as any);
      jest.spyOn(prismaService.booking, 'findUnique').mockResolvedValue({
        ...mockBooking,
        session: { ...mockBooking.session, template: { id: 'template-1', agencyId: 'agency-123' } },
      } as any);
      jest.spyOn(prismaService.booking, 'updateMany').mockResolvedValue({ count: 1 } as any);
      jest.spyOn(prismaService.paymentTransaction, 'updateMany').mockResolvedValue({ count: 1 } as any);
      jest.spyOn(prismaService.tripSession, 'update').mockResolvedValue({ id: 'session-123' } as any);
      jest.spyOn(prismaService.auditLog, 'create').mockResolvedValue({ id: 'audit-1' } as any);

      await service.verifyPayment({
        bookingId: 'booking-123',
        provider: 'CASHPLUS',
        transactionId: 'gateway-tx-1',
      }, 'traveler-123');

      expect(prismaService.booking.updateMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          id: 'booking-123',
          status: BookingStatus.PENDING,
          paymentStatus: BookingPaymentStatus.UNPAID,
        }),
      }));
      expect(prismaService.tripSession.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'session-123' },
        data: { availableSeats: { increment: 2 } },
      }));
    });

    it('records the refund as an external payment event and never debits a wallet', async () => {
      const provider = {
        verifyPayment: jest.fn(),
        initiatePayment: jest.fn(),
        validateWebhookSignature: jest.fn(),
        processRefund: jest.fn().mockResolvedValue({ success: true, refundId: 'refund-1' }),
      };

      jest.spyOn(providerFactory, 'getProvider').mockReturnValue(provider as any);
      jest.spyOn(prismaService.booking, 'findUnique').mockResolvedValue({
        ...mockBooking,
        status: BookingStatus.CONFIRMED,
        paymentStatus: BookingPaymentStatus.PAID,
      } as any);
      jest.spyOn(prismaService.booking, 'update').mockResolvedValue({ ...mockBooking } as any);
      // The agency has NO wallet — refunds must not require one (#368).
      jest.spyOn(prismaService.tripSession, 'findUnique').mockResolvedValue({
        id: 'session-123',
        template: {
          agencyId: 'agency-123',
        },
      } as any);

      await service.processRefund({
        bookingId: 'booking-123',
        provider: 'CASHPLUS',
        transactionId: 'gateway-tx-1',
        amount: 120,
      });

      expect(externalPaymentsService.recordRefund).toHaveBeenCalledWith(
        expect.objectContaining({
          bookingId: 'booking-123',
          agencyId: 'agency-123',
          custodian: PaymentCustodian.AGENCY_PSP,
          externalReference: 'refund-1',
        }),
      );
      expect(prismaService.wallet.update).not.toHaveBeenCalled();
      expect(prismaService.walletTransaction.create).not.toHaveBeenCalled();
    });

    it('derives the provider transaction when refunding by booking id', async () => {
      jest.spyOn(prismaService.booking, 'findUnique').mockResolvedValue({
        ...mockBooking,
        status: BookingStatus.CONFIRMED,
        paymentMethod: PaymentMethod.GATEWAY,
        paymentStatus: BookingPaymentStatus.PAID,
        paymentGatewayTransactionId: 'gateway-session-123',
        paymentTransactions: [
          {
            status: 'SUCCESS',
            provider: 'CASHPLUS',
            transactionId: 'gateway-session-123',
          },
        ],
      } as any);

      const processRefundSpy = jest.spyOn(service, 'processRefund').mockResolvedValue({
        success: true,
        refundId: 'refund-123',
      } as any);

      await service.refundBookingById('booking-123');

      expect(processRefundSpy).toHaveBeenCalledWith({
        bookingId: 'booking-123',
        amount: mockBooking.totalAmount,
        provider: 'CASHPLUS',
        transactionId: 'gateway-session-123',
      });
    });
  });
});
