import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PaymentsService } from '../payments.service';
import { DatabaseService } from '../../database/database.service';
import { EmailService } from '../../email/email.service';
import { PaymentProviderFactory } from '../providers/payment-provider.factory';
import { InitiatePaymentDto } from '../dto/payment.dto';
import { BookingStatus, BookingPaymentStatus, PaymentMethod, PaymentCustodian, PaymentLedgerEntryType, RefundStatus } from '@ouiboo/database';
import { ExternalPaymentsService } from '../../external-payments/external-payments.service';
import { StripePaymentProvider } from '../providers/stripe-payment.provider';

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
              findMany: jest.fn(),
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
      // #496: an authoritative local transaction bound to this booking,
      // provider and reference must exist before verification proceeds.
      jest.spyOn(prismaService.paymentTransaction, 'findMany').mockResolvedValue([
        {
          id: 'tx-1',
          bookingId: 'booking-123',
          transactionId: 'gateway-tx-1',
          provider: 'CASHPLUS',
          status: 'INITIATED',
          amount: 500,
        },
      ] as any);
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
      jest.spyOn(prismaService.paymentTransaction, 'findMany').mockResolvedValue([
        {
          id: 'tx-1',
          bookingId: 'booking-123',
          transactionId: 'gateway-tx-1',
          provider: 'CASHPLUS',
          status: 'INITIATED',
          amount: 500,
        },
      ] as any);
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
      jest.spyOn(prismaService.paymentTransaction, 'findMany').mockResolvedValue([
        {
          id: 'tx-1',
          bookingId: 'booking-123',
          transactionId: 'gateway-tx-1',
          provider: 'CASHPLUS',
          status: 'INITIATED',
          amount: 500,
        },
      ] as any);
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
        currency: 'MAD',
        refundAmount: null,
        refundStatus: null,
        // #497: the refund must bind to this successful local transaction.
        paymentTransactions: [
          {
            id: 'tx-1',
            status: 'SUCCESS',
            provider: 'CASHPLUS',
            transactionId: 'gateway-tx-1',
            amount: 500,
          },
        ],
      } as any);
      jest.spyOn(prismaService.booking, 'updateMany').mockResolvedValue({ count: 1 } as any);
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
        refundAmount: null,
        refundStatus: null,
        paymentTransactions: [
          {
            id: 'tx-1',
            status: 'SUCCESS',
            provider: 'CASHPLUS',
            transactionId: 'gateway-session-123',
            amount: 500,
          },
        ],
      } as any);

      const processRefundSpy = jest.spyOn(service, 'processRefund').mockResolvedValue({
        success: true,
        refundId: 'refund-123',
      } as any);

      await service.refundBookingById('booking-123');

      expect(processRefundSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          bookingId: 'booking-123',
          provider: 'CASHPLUS',
          transactionId: 'gateway-session-123',
        }),
      );
      // #497: the default amount is the remaining refundable balance on the
      // authoritative transaction (500 paid, nothing refunded yet).
      expect(Number(processRefundSpy.mock.calls[0][0].amount)).toBe(500);
    });
  });

  describe('verifyPayment - #496 authoritative transaction binding', () => {
    const localTx = {
      id: 'tx-1',
      bookingId: 'booking-123',
      transactionId: 'gateway-tx-1',
      provider: 'CASHPLUS',
      status: 'INITIATED',
      amount: 500,
    };

    const pendingBooking = () => ({
      ...mockBooking,
      currency: 'MAD',
      session: {
        ...mockBooking.session,
        template: { id: 'template-1', agencyId: 'agency-123', title: 'Sahara Escape' },
      },
    });

    const makeProvider = (result: any) => {
      const provider = {
        verifyPayment: jest.fn().mockResolvedValue(result),
        initiatePayment: jest.fn(),
        validateWebhookSignature: jest.fn(),
        processRefund: jest.fn(),
      };
      jest.spyOn(providerFactory, 'getProvider').mockReturnValue(provider as any);
      return provider;
    };

    it('rejects verification when no authoritative local transaction exists and never calls the provider', async () => {
      const provider = makeProvider({ status: 'success', metadata: {} });
      jest.spyOn(prismaService.booking, 'findUnique').mockResolvedValue(pendingBooking() as any);
      jest.spyOn(prismaService.paymentTransaction, 'findMany').mockResolvedValue([] as any);

      await expect(
        service.verifyPayment(
          { bookingId: 'booking-123', provider: 'CASHPLUS', transactionId: 'gateway-tx-1' },
          'traveler-123',
        ),
      ).rejects.toThrow('No authoritative payment transaction');
      expect(provider.verifyPayment).not.toHaveBeenCalled();
      expect(prismaService.booking.updateMany).not.toHaveBeenCalled();
    });

    it('rejects a valid provider transaction that belongs to a different booking of the same traveler (cross-booking)', async () => {
      const provider = makeProvider({
        status: 'success',
        bookingId: 'booking-999',
        metadata: { provider: 'STRIPE', bookingId: 'booking-999' },
      });
      jest.spyOn(prismaService.booking, 'findUnique').mockResolvedValue(pendingBooking() as any);
      jest.spyOn(prismaService.paymentTransaction, 'findMany').mockResolvedValue([
        { ...localTx, provider: 'STRIPE' },
      ] as any);

      await expect(
        service.verifyPayment(
          { bookingId: 'booking-123', provider: 'STRIPE', transactionId: 'gateway-tx-1' },
          'traveler-123',
        ),
      ).rejects.toThrow('Payment transaction does not belong to this booking');
      expect(provider.verifyPayment).toHaveBeenCalled();
      expect(prismaService.paymentTransaction.updateMany).not.toHaveBeenCalled();
      expect(prismaService.booking.updateMany).not.toHaveBeenCalled();
    });

    it('rejects verification when the local transaction belongs to a different provider', async () => {
      const provider = makeProvider({ status: 'success', metadata: {} });
      jest.spyOn(prismaService.booking, 'findUnique').mockResolvedValue(pendingBooking() as any);
      jest.spyOn(prismaService.paymentTransaction, 'findMany').mockResolvedValue([
        { ...localTx, provider: 'STRIPE' },
      ] as any);

      await expect(
        service.verifyPayment(
          { bookingId: 'booking-123', provider: 'CASHPLUS', transactionId: 'gateway-tx-1' },
          'traveler-123',
        ),
      ).rejects.toThrow('does not belong to the requested provider');
      expect(provider.verifyPayment).not.toHaveBeenCalled();
    });

    it('rejects a provider success whose amount does not match the local transaction', async () => {
      makeProvider({
        status: 'success',
        amount: '400.00',
        currency: 'MAD',
        metadata: { provider: 'CASHPLUS' },
      });
      jest.spyOn(prismaService.booking, 'findUnique').mockResolvedValue(pendingBooking() as any);
      jest.spyOn(prismaService.paymentTransaction, 'findMany').mockResolvedValue([localTx] as any);

      await expect(
        service.verifyPayment(
          { bookingId: 'booking-123', provider: 'CASHPLUS', transactionId: 'gateway-tx-1' },
          'traveler-123',
        ),
      ).rejects.toThrow('Provider amount does not match');
      expect(prismaService.paymentTransaction.updateMany).not.toHaveBeenCalled();
      expect(prismaService.booking.updateMany).not.toHaveBeenCalled();
    });

    it('rejects a provider success whose currency does not match the booking currency', async () => {
      makeProvider({
        status: 'success',
        amount: '500.00',
        currency: 'EUR',
        metadata: { provider: 'CASHPLUS' },
      });
      jest.spyOn(prismaService.booking, 'findUnique').mockResolvedValue(pendingBooking() as any);
      jest.spyOn(prismaService.paymentTransaction, 'findMany').mockResolvedValue([localTx] as any);

      await expect(
        service.verifyPayment(
          { bookingId: 'booking-123', provider: 'CASHPLUS', transactionId: 'gateway-tx-1' },
          'traveler-123',
        ),
      ).rejects.toThrow('Provider currency does not match');
      expect(prismaService.booking.updateMany).not.toHaveBeenCalled();
    });

    it('does not confirm the booking when the conditional transaction claim updates zero rows', async () => {
      makeProvider({ status: 'success', metadata: { provider: 'CASHPLUS' } });
      jest
        .spyOn(prismaService.booking, 'findUnique')
        .mockResolvedValueOnce(pendingBooking() as any)
        // Concurrent-flow recheck: the booking is still unpaid, so the
        // zero-row claim must block confirmation outright.
        .mockResolvedValueOnce(pendingBooking() as any);
      jest.spyOn(prismaService.paymentTransaction, 'findMany').mockResolvedValue([localTx] as any);
      jest.spyOn(prismaService.paymentTransaction, 'updateMany').mockResolvedValue({ count: 0 } as any);

      await expect(
        service.verifyPayment(
          { bookingId: 'booking-123', provider: 'CASHPLUS', transactionId: 'gateway-tx-1' },
          'traveler-123',
        ),
      ).rejects.toThrow('booking was not confirmed');
      expect(prismaService.booking.updateMany).not.toHaveBeenCalled();
    });

    it('treats a duplicate verification of an already-paid booking as an idempotent no-op', async () => {
      const provider = makeProvider({ status: 'success', metadata: {} });
      jest.spyOn(prismaService.booking, 'findUnique').mockResolvedValue({
        ...pendingBooking(),
        status: BookingStatus.CONFIRMED,
        paymentStatus: BookingPaymentStatus.PAID,
      } as any);
      jest.spyOn(prismaService.paymentTransaction, 'findMany').mockResolvedValue([
        { ...localTx, status: 'SUCCESS' },
      ] as any);

      const result = await service.verifyPayment(
        { bookingId: 'booking-123', provider: 'CASHPLUS', transactionId: 'gateway-tx-1' },
        'traveler-123',
      );

      expect(result.status).toBe('success');
      expect(provider.verifyPayment).not.toHaveBeenCalled();
      expect(prismaService.booking.updateMany).not.toHaveBeenCalled();
    });

    it('rejects verification for a stale/failed local transaction without calling the provider', async () => {
      const provider = makeProvider({ status: 'success', metadata: {} });
      jest.spyOn(prismaService.booking, 'findUnique').mockResolvedValue(pendingBooking() as any);
      jest.spyOn(prismaService.paymentTransaction, 'findMany').mockResolvedValue([
        { ...localTx, status: 'FAILED' },
      ] as any);

      await expect(
        service.verifyPayment(
          { bookingId: 'booking-123', provider: 'CASHPLUS', transactionId: 'gateway-tx-1' },
          'traveler-123',
        ),
      ).rejects.toThrow('not in a verifiable state');
      expect(provider.verifyPayment).not.toHaveBeenCalled();
    });
  });

  describe('processRefund - #497 bounded, bound, idempotent refunds', () => {
    const paidBooking = (overrides: Record<string, any> = {}) => ({
      ...mockBooking,
      status: BookingStatus.CONFIRMED,
      paymentMethod: PaymentMethod.GATEWAY,
      paymentStatus: BookingPaymentStatus.PAID,
      currency: 'MAD',
      refundAmount: null,
      refundStatus: null,
      paymentTransactions: [
        {
          id: 'tx-1',
          status: 'SUCCESS',
          provider: 'CASHPLUS',
          transactionId: 'gateway-tx-1',
          amount: 500,
        },
      ],
      ...overrides,
    });

    const makeRefundProvider = (result: any = { success: true, refundId: 'refund-1' }) => {
      const provider = {
        verifyPayment: jest.fn(),
        initiatePayment: jest.fn(),
        validateWebhookSignature: jest.fn(),
        processRefund: jest.fn().mockResolvedValue(result),
      };
      jest.spyOn(providerFactory, 'getProvider').mockReturnValue(provider as any);
      return provider;
    };

    it('rejects a refund whose provider transaction is not the booking successful payment (cross-booking)', async () => {
      const provider = makeRefundProvider();
      jest.spyOn(prismaService.booking, 'findUnique').mockResolvedValue(paidBooking() as any);

      await expect(
        service.processRefund({
          bookingId: 'booking-123',
          provider: 'CASHPLUS',
          transactionId: 'gateway-tx-from-another-booking',
          amount: 100,
        }),
      ).rejects.toThrow('No successful payment transaction');
      expect(provider.processRefund).not.toHaveBeenCalled();
    });

    it('rejects a refund naming the wrong provider for the successful transaction', async () => {
      const provider = makeRefundProvider();
      jest.spyOn(prismaService.booking, 'findUnique').mockResolvedValue(paidBooking() as any);

      await expect(
        service.processRefund({
          bookingId: 'booking-123',
          provider: 'STRIPE',
          transactionId: 'gateway-tx-1',
          amount: 100,
        }),
      ).rejects.toThrow('No successful payment transaction');
      expect(provider.processRefund).not.toHaveBeenCalled();
    });

    it('rejects a refund that exceeds the remaining refundable balance', async () => {
      const provider = makeRefundProvider();
      jest.spyOn(prismaService.booking, 'findUnique').mockResolvedValue(
        paidBooking({ refundAmount: 400, refundStatus: RefundStatus.PROCESSED }) as any,
      );

      await expect(
        service.processRefund({
          bookingId: 'booking-123',
          provider: 'CASHPLUS',
          transactionId: 'gateway-tx-1',
          amount: 200,
        }),
      ).rejects.toThrow('exceeds the remaining refundable balance');
      expect(provider.processRefund).not.toHaveBeenCalled();
      expect(prismaService.booking.updateMany).not.toHaveBeenCalled();
    });

    it('rejects the second concurrent refund claim before any provider call', async () => {
      const provider = makeRefundProvider();
      jest.spyOn(prismaService.booking, 'findUnique').mockResolvedValue(paidBooking() as any);
      // The atomic claim loses: a concurrent request already moved the
      // booking into the in-flight refund state.
      jest.spyOn(prismaService.booking, 'updateMany').mockResolvedValue({ count: 0 } as any);

      await expect(
        service.processRefund({
          bookingId: 'booking-123',
          provider: 'CASHPLUS',
          transactionId: 'gateway-tx-1',
          amount: 100,
        }),
      ).rejects.toThrow('Refund could not be claimed');
      expect(provider.processRefund).not.toHaveBeenCalled();
    });

    it('rejects a refund while another refund is already in progress', async () => {
      const provider = makeRefundProvider();
      jest.spyOn(prismaService.booking, 'findUnique').mockResolvedValue(
        paidBooking({ refundStatus: RefundStatus.PENDING }) as any,
      );

      await expect(
        service.processRefund({
          bookingId: 'booking-123',
          provider: 'CASHPLUS',
          transactionId: 'gateway-tx-1',
          amount: 100,
        }),
      ).rejects.toThrow('already in progress');
      expect(provider.processRefund).not.toHaveBeenCalled();
    });

    it('claims the refund before the provider call, sends a deterministic idempotency key, and accumulates partial refunds', async () => {
      const provider = makeRefundProvider();
      jest.spyOn(prismaService.booking, 'findUnique').mockResolvedValue(
        paidBooking({ refundAmount: 380, refundStatus: RefundStatus.PROCESSED }) as any,
      );
      const claimSpy = jest
        .spyOn(prismaService.booking, 'updateMany')
        .mockResolvedValue({ count: 1 } as any);
      const updateSpy = jest
        .spyOn(prismaService.booking, 'update')
        .mockResolvedValue({} as any);
      jest.spyOn(prismaService.tripSession, 'findUnique').mockResolvedValue(null as any);

      const result = await service.processRefund({
        bookingId: 'booking-123',
        provider: 'CASHPLUS',
        transactionId: 'gateway-tx-1',
        amount: 120,
      });

      expect(result.success).toBe(true);
      // Claim happened, conditionally on the exact prior refund state.
      expect(claimSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'booking-123',
            paymentStatus: BookingPaymentStatus.PAID,
            refundStatus: RefundStatus.PROCESSED,
          }),
          data: { refundStatus: RefundStatus.PENDING },
        }),
      );
      // Deterministic key: booking + authoritative transaction + cumulative total.
      expect(provider.processRefund).toHaveBeenCalledWith(
        'gateway-tx-1',
        expect.anything(),
        'ouiboo-refund-booking-123-gateway-tx-1-500.00',
      );
      expect(Number(provider.processRefund.mock.calls[0][1])).toBe(120);
      // 380 + 120 = 500 = full paid amount → booking becomes REFUNDED.
      const updatePayload = updateSpy.mock.calls[0][0];
      expect(Number(updatePayload.data.refundAmount)).toBe(500);
      expect(updatePayload.data.refundStatus).toBe(RefundStatus.PROCESSED);
      expect(updatePayload.data.paymentStatus).toBe(BookingPaymentStatus.REFUNDED);
    });

    it('keeps the booking PAID after a partial refund and records only the refunded increment as processed total', async () => {
      const provider = makeRefundProvider();
      jest.spyOn(prismaService.booking, 'findUnique').mockResolvedValue(paidBooking() as any);
      jest.spyOn(prismaService.booking, 'updateMany').mockResolvedValue({ count: 1 } as any);
      const updateSpy = jest
        .spyOn(prismaService.booking, 'update')
        .mockResolvedValue({} as any);
      jest.spyOn(prismaService.tripSession, 'findUnique').mockResolvedValue(null as any);

      await service.processRefund({
        bookingId: 'booking-123',
        provider: 'CASHPLUS',
        transactionId: 'gateway-tx-1',
        amount: 120,
      });

      expect(provider.processRefund).toHaveBeenCalledWith(
        'gateway-tx-1',
        expect.anything(),
        'ouiboo-refund-booking-123-gateway-tx-1-120.00',
      );
      const updatePayload = updateSpy.mock.calls[0][0];
      expect(Number(updatePayload.data.refundAmount)).toBe(120);
      expect(updatePayload.data.paymentStatus).toBe(BookingPaymentStatus.PAID);
    });

    it('releases the claim to a recoverable FAILED state when the provider refund fails', async () => {
      const provider = makeRefundProvider({ success: false, error: 'Provider timeout' });
      jest.spyOn(prismaService.booking, 'findUnique').mockResolvedValue(paidBooking() as any);
      const updateManySpy = jest
        .spyOn(prismaService.booking, 'updateMany')
        .mockResolvedValue({ count: 1 } as any);
      const updateSpy = jest.spyOn(prismaService.booking, 'update');

      const result = await service.processRefund({
        bookingId: 'booking-123',
        provider: 'CASHPLUS',
        transactionId: 'gateway-tx-1',
        amount: 100,
      });

      expect(result.success).toBe(false);
      // Claim, then release: PENDING → FAILED, no totals moved.
      expect(updateManySpy).toHaveBeenCalledTimes(2);
      expect(updateManySpy.mock.calls[1][0]).toEqual(
        expect.objectContaining({
          where: { id: 'booking-123', refundStatus: RefundStatus.PENDING },
          data: { refundStatus: RefundStatus.FAILED },
        }),
      );
      expect(updateSpy).not.toHaveBeenCalled();
      expect(externalPaymentsService.recordRefund).not.toHaveBeenCalled();
    });
  });

  describe('StripePaymentProvider - #496 session binding', () => {
    const makeStripeProvider = (session: any, refundImpl?: jest.Mock) => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
      const provider = new StripePaymentProvider();
      (provider as any).stripe = {
        checkout: {
          sessions: { retrieve: jest.fn().mockResolvedValue(session) },
        },
        refunds: {
          create: refundImpl ?? jest.fn().mockResolvedValue({ id: 're_1' }),
        },
      };
      return provider;
    };

    it('never returns success for a paid session whose metadata belongs to another booking', async () => {
      const provider = makeStripeProvider({
        id: 'cs_1',
        payment_status: 'paid',
        payment_intent: 'pi_1',
        amount_total: 50000,
        currency: 'mad',
        metadata: { bookingId: 'booking-999' },
      });

      const result = await provider.verifyPayment('cs_1', 'booking-123');

      expect(result.status).toBe('failure');
      expect(result.bookingId).toBe('booking-999');
    });

    it('returns success with the paid amount and currency for a session bound to the booking', async () => {
      const provider = makeStripeProvider({
        id: 'cs_1',
        payment_status: 'paid',
        payment_intent: 'pi_1',
        amount_total: 50000,
        currency: 'mad',
        metadata: { bookingId: 'booking-123' },
      });

      const result = await provider.verifyPayment('cs_1', 'booking-123');

      expect(result.status).toBe('success');
      expect(result.bookingId).toBe('booking-123');
      expect(result.amount).toBe('500.00');
      expect(result.currency).toBe('mad');
    });

    it('forwards the deterministic idempotency key to Stripe on refund', async () => {
      const createRefund = jest.fn().mockResolvedValue({ id: 're_1' });
      const provider = makeStripeProvider({}, createRefund);

      const result = await provider.processRefund('pi_1', 120, 'ouiboo-refund-booking-123-pi_1-120.00');

      expect(result.success).toBe(true);
      expect(createRefund).toHaveBeenCalledWith(
        { payment_intent: 'pi_1', amount: 12000 },
        { idempotencyKey: 'ouiboo-refund-booking-123-pi_1-120.00' },
      );
    });
  });
});
