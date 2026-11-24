import { BadRequestException, ServiceUnavailableException } from '@nestjs/common'
import { PaymentsService } from './payments.service'
import { PaymentProviderFactory } from './providers/payment-provider.factory'
import { CmiProviderNotImplementedError } from './providers/cmi-payment.provider'
import { GATEWAY_ENABLEMENT_KEY } from './gateway-enablement.service'

/**
 * #1019 (B5): dedicated unit spec for the payments orchestrator.
 *
 * Until now the gateway orchestration (session creation, verification
 * binding, refund dispatch) was only covered indirectly — security
 * specs, provider adapter specs and other layers' Cash Plus specs.
 * This spec pins the orchestrator's own contract: the dual-control
 * gateway gate (#635), authoritative amount/currency/booking binding
 * (#496), the refund claim + deterministic idempotency key (#497),
 * and per-provider behaviour (Stripe, Cash Plus, CMI-blocked per B3).
 */

const BOOKING_ID = 'booking-1'
const TRAVELER_ID = 'traveler-1'
const SESSION_ID = 'session-1'
const TX_ID = 'sess_1'

const createTx = () => ({
  booking: {
    findUnique: jest.fn(),
    updateMany: jest.fn().mockResolvedValue({ count: 1 }),
  },
  paymentTransaction: {
    updateMany: jest.fn().mockResolvedValue({ count: 1 }),
  },
  tripSession: {
    update: jest.fn().mockResolvedValue({}),
  },
  auditLog: {
    create: jest.fn().mockResolvedValue({}),
  },
})

const createPrisma = (tx: ReturnType<typeof createTx>) => ({
  booking: {
    findUnique: jest.fn(),
    update: jest.fn().mockResolvedValue({}),
    updateMany: jest.fn().mockResolvedValue({ count: 1 }),
  },
  paymentTransaction: {
    create: jest.fn().mockResolvedValue({}),
    findMany: jest.fn().mockResolvedValue([]),
    updateMany: jest.fn().mockResolvedValue({ count: 1 }),
  },
  platformSetting: {
    findUnique: jest.fn().mockResolvedValue({ key: GATEWAY_ENABLEMENT_KEY, value: 'true' }),
  },
  tripSession: {
    findUnique: jest.fn(),
  },
  notificationLog: {
    create: jest.fn().mockResolvedValue({}),
  },
  $transaction: jest.fn(async (callback: (client: unknown) => unknown) => callback(tx)),
})

const createProvider = () => ({
  initiatePayment: jest.fn().mockResolvedValue({
    sessionId: TX_ID,
    redirectUrl: 'https://pay.example/checkout/sess_1',
    expiresAt: new Date('2030-01-01T00:00:00Z'),
    metadata: { provider: 'STRIPE' },
  }),
  verifyPayment: jest.fn(),
  processRefund: jest.fn(),
})

const pendingBooking = () => ({
  id: BOOKING_ID,
  travelerId: TRAVELER_ID,
  agencyId: 'agency-1',
  status: 'PENDING',
  paymentStatus: 'UNPAID',
  guestsCount: 2,
  sessionId: SESSION_ID,
  currency: 'MAD',
  session: { id: SESSION_ID, price: 100, currency: 'MAD' },
  traveler: { id: TRAVELER_ID, email: 'traveler@example.com', name: 'Test Traveler' },
})

describe('PaymentsService (orchestrator) (#1019)', () => {
  const originalEnv = process.env.ENABLE_GATEWAY_PAYMENTS

  let tx: ReturnType<typeof createTx>
  let prisma: ReturnType<typeof createPrisma>
  let stripeProvider: ReturnType<typeof createProvider>
  let cashPlusProvider: ReturnType<typeof createProvider>
  let factory: PaymentProviderFactory
  let emailService: { sendPaymentConfirmation: jest.Mock }
  let externalPayments: {
    recordRefund: jest.Mock
    recordPaymentVerifiedInTransaction: jest.Mock
  }
  let service: PaymentsService

  beforeEach(() => {
    process.env.ENABLE_GATEWAY_PAYMENTS = 'true'
    tx = createTx()
    prisma = createPrisma(tx)
    stripeProvider = createProvider()
    cashPlusProvider = createProvider()
    factory = new PaymentProviderFactory(
      stripeProvider as never,
      cashPlusProvider as never
    )
    emailService = { sendPaymentConfirmation: jest.fn().mockResolvedValue(undefined) }
    externalPayments = {
      recordRefund: jest.fn().mockResolvedValue({}),
      recordPaymentVerifiedInTransaction: jest.fn().mockResolvedValue({}),
    }
    service = new PaymentsService(
      prisma as never,
      factory,
      emailService as never,
      externalPayments as never
    )
  })

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.ENABLE_GATEWAY_PAYMENTS
    } else {
      process.env.ENABLE_GATEWAY_PAYMENTS = originalEnv
    }
  })

  describe('gateway gate (#635 dual control)', () => {
    it('refuses initiation when the env flag is off, without touching the provider', async () => {
      process.env.ENABLE_GATEWAY_PAYMENTS = 'false'
      prisma.booking.findUnique.mockResolvedValue(pendingBooking())

      await expect(
        service.initiatePayment(
          { bookingId: BOOKING_ID, amount: 200, provider: 'STRIPE' } as never,
          TRAVELER_ID
        )
      ).rejects.toBeInstanceOf(ServiceUnavailableException)
      expect(stripeProvider.initiatePayment).not.toHaveBeenCalled()
    })

    it('refuses initiation when the platform setting is off even with the env flag on', async () => {
      prisma.platformSetting.findUnique.mockResolvedValue({
        key: GATEWAY_ENABLEMENT_KEY,
        value: 'false',
      })
      prisma.booking.findUnique.mockResolvedValue(pendingBooking())

      await expect(
        service.initiatePayment(
          { bookingId: BOOKING_ID, amount: 200, provider: 'STRIPE' } as never,
          TRAVELER_ID
        )
      ).rejects.toBeInstanceOf(ServiceUnavailableException)
      expect(stripeProvider.initiatePayment).not.toHaveBeenCalled()
    })
  })

  describe('initiatePayment', () => {
    beforeEach(() => {
      prisma.booking.findUnique.mockResolvedValue(pendingBooking())
    })

    it('creates a Stripe session for the authoritative amount (session price × guests)', async () => {
      const result = await service.initiatePayment(
        { bookingId: BOOKING_ID, amount: 200, provider: 'STRIPE' } as never,
        TRAVELER_ID
      )

      expect(stripeProvider.initiatePayment).toHaveBeenCalledWith(
        expect.anything(),
        BOOKING_ID,
        'traveler@example.com',
        'Test Traveler'
      )
      const [chargedAmount] = stripeProvider.initiatePayment.mock.calls[0]
      expect(String(chargedAmount)).toContain('200')
      expect(prisma.paymentTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          bookingId: BOOKING_ID,
          agencyId: 'agency-1',
          transactionId: TX_ID,
          status: 'INITIATED',
          provider: 'STRIPE',
        }),
      })
      expect(prisma.booking.update).toHaveBeenCalledWith({
        where: { id: BOOKING_ID },
        data: expect.objectContaining({
          paymentGatewayTransactionId: TX_ID,
          paymentStatus: 'UNPAID',
        }),
      })
      expect(result).toEqual({
        redirectUrl: 'https://pay.example/checkout/sess_1',
        sessionId: TX_ID,
        expiresAt: new Date('2030-01-01T00:00:00Z'),
      })
    })

    it('creates a Cash Plus session through the Cash Plus provider', async () => {
      cashPlusProvider.initiatePayment.mockResolvedValue({
        sessionId: 'cp_1',
        redirectUrl: 'https://pay.example/cashplus/cp_1',
        expiresAt: new Date('2030-01-01T00:00:00Z'),
        metadata: { provider: 'CASHPLUS' },
      })

      const result = await service.initiatePayment(
        { bookingId: BOOKING_ID, amount: 200, provider: 'CASHPLUS' } as never,
        TRAVELER_ID
      )

      expect(cashPlusProvider.initiatePayment).toHaveBeenCalledTimes(1)
      expect(stripeProvider.initiatePayment).not.toHaveBeenCalled()
      expect(prisma.paymentTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ transactionId: 'cp_1', provider: 'CASHPLUS' }),
      })
      expect(result.sessionId).toBe('cp_1')
    })

    it('rejects a CMI initiation explicitly — the provider is a locked stub (B3)', async () => {
      await expect(
        service.initiatePayment(
          { bookingId: BOOKING_ID, amount: 200, provider: 'CMI' } as never,
          TRAVELER_ID
        )
      ).rejects.toBeInstanceOf(CmiProviderNotImplementedError)
      expect(prisma.paymentTransaction.create).not.toHaveBeenCalled()
    })

    it('rejects an amount that does not match the authoritative booking total', async () => {
      await expect(
        service.initiatePayment(
          { bookingId: BOOKING_ID, amount: 150, provider: 'STRIPE' } as never,
          TRAVELER_ID
        )
      ).rejects.toBeInstanceOf(BadRequestException)
      expect(stripeProvider.initiatePayment).not.toHaveBeenCalled()
      expect(prisma.paymentTransaction.create).not.toHaveBeenCalled()
    })

    it('rejects when the booking does not exist', async () => {
      prisma.booking.findUnique.mockResolvedValue(null)

      await expect(
        service.initiatePayment(
          { bookingId: BOOKING_ID, amount: 200, provider: 'STRIPE' } as never,
          TRAVELER_ID
        )
      ).rejects.toThrow('Booking not found')
    })

    it('rejects when the booking belongs to another traveler', async () => {
      await expect(
        service.initiatePayment(
          { bookingId: BOOKING_ID, amount: 200, provider: 'STRIPE' } as never,
          'someone-else'
        )
      ).rejects.toThrow('Booking does not belong to the authenticated traveler')
      expect(stripeProvider.initiatePayment).not.toHaveBeenCalled()
    })

    it('rejects when the booking is not pending', async () => {
      prisma.booking.findUnique.mockResolvedValue({
        ...pendingBooking(),
        status: 'CONFIRMED',
      })

      await expect(
        service.initiatePayment(
          { bookingId: BOOKING_ID, amount: 200, provider: 'STRIPE' } as never,
          TRAVELER_ID
        )
      ).rejects.toThrow('Booking is not in pending status')
    })

    it('propagates a provider failure without recording a transaction', async () => {
      stripeProvider.initiatePayment.mockRejectedValue(new Error('provider down'))

      await expect(
        service.initiatePayment(
          { bookingId: BOOKING_ID, amount: 200, provider: 'STRIPE' } as never,
          TRAVELER_ID
        )
      ).rejects.toThrow('provider down')
      expect(prisma.paymentTransaction.create).not.toHaveBeenCalled()
      expect(prisma.booking.update).not.toHaveBeenCalled()
    })
  })

  describe('verifyPayment', () => {
    const localTransaction = (overrides: Record<string, unknown> = {}) => ({
      id: 'ptx-1',
      bookingId: BOOKING_ID,
      transactionId: TX_ID,
      provider: 'STRIPE',
      status: 'INITIATED',
      amount: 200,
      providerData: null,
      ...overrides,
    })

    const verifyBooking = (overrides: Record<string, unknown> = {}) => ({
      ...pendingBooking(),
      session: {
        id: SESSION_ID,
        price: 100,
        currency: 'MAD',
        template: { id: 'tpl-1', title: 'Atlas Trek', agencyId: 'agency-1' },
      },
      ...overrides,
    })

    beforeEach(() => {
      prisma.booking.findUnique.mockResolvedValue(verifyBooking())
      prisma.paymentTransaction.findMany.mockResolvedValue([localTransaction()])
      tx.booking.findUnique.mockResolvedValue({
        ...verifyBooking(),
        traveler: { id: TRAVELER_ID, email: 'traveler@example.com', name: 'Test Traveler' },
        totalAmount: 200,
        locale: 'en',
      })
    })

    it('confirms the booking on a provider success that matches amount and currency', async () => {
      stripeProvider.verifyPayment.mockResolvedValue({
        status: 'success',
        transactionId: TX_ID,
        amount: 200,
        currency: 'MAD',
        metadata: { provider: 'STRIPE', transactionId: TX_ID },
      })

      const result = await service.verifyPayment(
        { bookingId: BOOKING_ID, transactionId: TX_ID, provider: 'STRIPE' } as never,
        TRAVELER_ID
      )

      expect(result.status).toBe('success')
      // The local transaction is claimed conditionally before confirmation.
      expect(prisma.paymentTransaction.updateMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          id: 'ptx-1',
          bookingId: BOOKING_ID,
          transactionId: TX_ID,
          status: 'INITIATED',
        }),
        data: expect.objectContaining({ status: 'SUCCESS' }),
      })
      // The booking transitions to CONFIRMED/PAID inside the transaction.
      expect(tx.booking.updateMany).toHaveBeenCalledWith({
        where: expect.objectContaining({ id: BOOKING_ID }),
        data: expect.objectContaining({ status: 'CONFIRMED', paymentStatus: 'PAID' }),
      })
      expect(
        externalPayments.recordPaymentVerifiedInTransaction
      ).toHaveBeenCalledTimes(1)
      expect(emailService.sendPaymentConfirmation).toHaveBeenCalledWith(
        'traveler@example.com',
        'Atlas Trek',
        'en'
      )
    })

    it('is an idempotent no-op when the transaction already succeeded and the booking is paid', async () => {
      prisma.paymentTransaction.findMany.mockResolvedValue([
        localTransaction({ status: 'SUCCESS', providerData: { provider: 'STRIPE' } }),
      ])
      prisma.booking.findUnique.mockResolvedValue(
        verifyBooking({ paymentStatus: 'PAID' })
      )

      const result = await service.verifyPayment(
        { bookingId: BOOKING_ID, transactionId: TX_ID, provider: 'STRIPE' } as never,
        TRAVELER_ID
      )

      expect(result.status).toBe('success')
      expect(stripeProvider.verifyPayment).not.toHaveBeenCalled()
      expect(prisma.paymentTransaction.updateMany).not.toHaveBeenCalled()
    })

    it('rejects when no authoritative local transaction matches', async () => {
      prisma.paymentTransaction.findMany.mockResolvedValue([])

      await expect(
        service.verifyPayment(
          { bookingId: BOOKING_ID, transactionId: TX_ID, provider: 'STRIPE' } as never,
          TRAVELER_ID
        )
      ).rejects.toThrow('No authoritative payment transaction found')
      expect(stripeProvider.verifyPayment).not.toHaveBeenCalled()
    })

    it('rejects when the local transaction belongs to another provider', async () => {
      prisma.paymentTransaction.findMany.mockResolvedValue([
        localTransaction({ provider: 'CASHPLUS' }),
      ])

      await expect(
        service.verifyPayment(
          { bookingId: BOOKING_ID, transactionId: TX_ID, provider: 'STRIPE' } as never,
          TRAVELER_ID
        )
      ).rejects.toThrow('Payment transaction does not belong to the requested provider')
      expect(stripeProvider.verifyPayment).not.toHaveBeenCalled()
    })

    it('rejects when the provider asserts the transaction belongs to another booking', async () => {
      stripeProvider.verifyPayment.mockResolvedValue({
        status: 'success',
        transactionId: TX_ID,
        bookingId: 'another-booking',
        amount: 200,
        currency: 'MAD',
      })

      await expect(
        service.verifyPayment(
          { bookingId: BOOKING_ID, transactionId: TX_ID, provider: 'STRIPE' } as never,
          TRAVELER_ID
        )
      ).rejects.toThrow('Payment transaction does not belong to this booking')
      expect(prisma.paymentTransaction.updateMany).not.toHaveBeenCalled()
    })

    it('rejects when the provider-reported amount differs from the local transaction', async () => {
      stripeProvider.verifyPayment.mockResolvedValue({
        status: 'success',
        transactionId: TX_ID,
        amount: 150,
        currency: 'MAD',
      })

      await expect(
        service.verifyPayment(
          { bookingId: BOOKING_ID, transactionId: TX_ID, provider: 'STRIPE' } as never,
          TRAVELER_ID
        )
      ).rejects.toThrow('Provider amount does not match the booking payment transaction')
      expect(prisma.paymentTransaction.updateMany).not.toHaveBeenCalled()
    })

    it('rejects when the provider-reported currency differs from the booking currency', async () => {
      stripeProvider.verifyPayment.mockResolvedValue({
        status: 'success',
        transactionId: TX_ID,
        amount: 200,
        currency: 'EUR',
      })

      await expect(
        service.verifyPayment(
          { bookingId: BOOKING_ID, transactionId: TX_ID, provider: 'STRIPE' } as never,
          TRAVELER_ID
        )
      ).rejects.toThrow('Provider currency does not match the booking currency')
      expect(prisma.paymentTransaction.updateMany).not.toHaveBeenCalled()
    })

    it('fails the booking and releases its seats when the provider reports failure', async () => {
      stripeProvider.verifyPayment.mockResolvedValue({
        status: 'failure',
        transactionId: TX_ID,
        error: 'card_declined',
        metadata: { provider: 'STRIPE' },
      })

      const result = await service.verifyPayment(
        { bookingId: BOOKING_ID, transactionId: TX_ID, provider: 'STRIPE' } as never,
        TRAVELER_ID
      )

      expect(result.status).toBe('failure')
      expect(tx.booking.updateMany).toHaveBeenCalledWith({
        where: expect.objectContaining({ id: BOOKING_ID, status: 'PENDING' }),
        data: expect.objectContaining({
          status: 'CANCELLED',
          paymentStatus: 'FAILED',
          cancellationReason: 'PAYMENT_FAILED',
        }),
      })
      expect(tx.tripSession.update).toHaveBeenCalledWith({
        where: { id: SESSION_ID },
        data: { availableSeats: { increment: 2 } },
      })
      expect(tx.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: 'PAYMENT_FAILED', targetId: BOOKING_ID }),
      })
    })

    it('does not confirm when the claim race is lost to a concurrent flow', async () => {
      stripeProvider.verifyPayment.mockResolvedValue({
        status: 'success',
        transactionId: TX_ID,
        amount: 200,
        currency: 'MAD',
      })
      prisma.paymentTransaction.updateMany.mockResolvedValue({ count: 0 })
      // The follow-up read inside the lost-race branch: still unpaid.
      prisma.booking.findUnique
        .mockResolvedValueOnce(verifyBooking())
        .mockResolvedValue({ ...verifyBooking(), paymentStatus: 'UNPAID' })

      await expect(
        service.verifyPayment(
          { bookingId: BOOKING_ID, transactionId: TX_ID, provider: 'STRIPE' } as never,
          TRAVELER_ID
        )
      ).rejects.toThrow('Payment could not be bound to the booking transaction')
      expect(tx.booking.updateMany).not.toHaveBeenCalled()
    })
  })

  describe('processRefund', () => {
    const paidBooking = (overrides: Record<string, unknown> = {}) => ({
      id: BOOKING_ID,
      travelerId: TRAVELER_ID,
      sessionId: SESSION_ID,
      currency: 'MAD',
      paymentStatus: 'PAID',
      refundStatus: null,
      refundAmount: null,
      paymentTransactions: [
        {
          id: 'ptx-1',
          bookingId: BOOKING_ID,
          transactionId: TX_ID,
          provider: 'STRIPE',
          status: 'SUCCESS',
          amount: 200,
        },
      ],
      ...overrides,
    })

    beforeEach(() => {
      prisma.booking.findUnique.mockResolvedValue(paidBooking())
      prisma.tripSession.findUnique.mockResolvedValue({
        id: SESSION_ID,
        template: { agencyId: 'agency-1' },
      })
      stripeProvider.processRefund.mockResolvedValue({
        success: true,
        refundId: 're_1',
      })
    })

    it('refunds in full: claims first, calls the provider with a deterministic idempotency key, settles totals', async () => {
      const result = await service.processRefund({
        bookingId: BOOKING_ID,
        transactionId: TX_ID,
        amount: 200,
        provider: 'STRIPE',
      } as never)

      expect(result).toEqual({ success: true, refundId: 're_1' })
      // Claim precedes the provider call and matches the validated state.
      expect(prisma.booking.updateMany).toHaveBeenCalledWith({
        where: expect.objectContaining({ id: BOOKING_ID, paymentStatus: 'PAID' }),
        data: { refundStatus: 'PENDING' },
      })
      expect(stripeProvider.processRefund).toHaveBeenCalledWith(
        TX_ID,
        expect.anything(),
        `ouiboo-refund-${BOOKING_ID}-${TX_ID}-200.00`
      )
      const [, refundAmount] = stripeProvider.processRefund.mock.calls[0]
      expect(String(refundAmount)).toContain('200')
      expect(prisma.booking.update).toHaveBeenCalledWith({
        where: { id: BOOKING_ID },
        data: expect.objectContaining({
          refundStatus: 'PROCESSED',
          paymentStatus: 'REFUNDED',
        }),
      })
      expect(externalPayments.recordRefund).toHaveBeenCalledWith(
        expect.objectContaining({
          bookingId: BOOKING_ID,
          agencyId: 'agency-1',
          provider: 'STRIPE',
          externalReference: 're_1',
        })
      )
    })

    it('keeps the booking PAID after a partial refund and accumulates the refunded total', async () => {
      prisma.booking.findUnique.mockResolvedValue(
        paidBooking({ refundAmount: 50, refundStatus: 'PROCESSED' })
      )

      const result = await service.processRefund({
        bookingId: BOOKING_ID,
        transactionId: TX_ID,
        amount: 50,
        provider: 'STRIPE',
      } as never)

      expect(result.success).toBe(true)
      expect(stripeProvider.processRefund).toHaveBeenCalledWith(
        TX_ID,
        expect.anything(),
        `ouiboo-refund-${BOOKING_ID}-${TX_ID}-100.00`
      )
      const updateCall = prisma.booking.update.mock.calls[0][0]
      expect(updateCall.data.paymentStatus).toBe('PAID')
      expect(updateCall.data.refundStatus).toBe('PROCESSED')
      expect(String(updateCall.data.refundAmount)).toContain('100')
    })

    it('rejects a refund above the remaining refundable balance without calling the provider', async () => {
      prisma.booking.findUnique.mockResolvedValue(
        paidBooking({ refundAmount: 150, refundStatus: 'PROCESSED' })
      )

      await expect(
        service.processRefund({
          bookingId: BOOKING_ID,
          transactionId: TX_ID,
          amount: 100,
          provider: 'STRIPE',
        } as never)
      ).rejects.toThrow('Refund amount exceeds the remaining refundable balance')
      expect(stripeProvider.processRefund).not.toHaveBeenCalled()
    })

    it('rejects when a refund is already in progress', async () => {
      prisma.booking.findUnique.mockResolvedValue(
        paidBooking({ refundStatus: 'PENDING' })
      )

      await expect(
        service.processRefund({
          bookingId: BOOKING_ID,
          transactionId: TX_ID,
          amount: 200,
          provider: 'STRIPE',
        } as never)
      ).rejects.toThrow('A refund is already in progress for this booking')
      expect(stripeProvider.processRefund).not.toHaveBeenCalled()
    })

    it('rejects when the booking is not paid', async () => {
      prisma.booking.findUnique.mockResolvedValue(
        paidBooking({ paymentStatus: 'UNPAID' })
      )

      await expect(
        service.processRefund({
          bookingId: BOOKING_ID,
          transactionId: TX_ID,
          amount: 200,
          provider: 'STRIPE',
        } as never)
      ).rejects.toThrow('Only paid bookings can be refunded')
    })

    it('rejects when no successful transaction matches the refund reference', async () => {
      await expect(
        service.processRefund({
          bookingId: BOOKING_ID,
          transactionId: 'unknown-tx',
          amount: 200,
          provider: 'STRIPE',
        } as never)
      ).rejects.toThrow(
        'No successful payment transaction for this booking matches the refund request'
      )
      expect(stripeProvider.processRefund).not.toHaveBeenCalled()
    })

    it('releases the claim to FAILED and moves no totals when the provider reports failure', async () => {
      stripeProvider.processRefund.mockResolvedValue({
        success: false,
        error: 'provider_refused',
      })

      const result = await service.processRefund({
        bookingId: BOOKING_ID,
        transactionId: TX_ID,
        amount: 200,
        provider: 'STRIPE',
      } as never)

      expect(result).toEqual({ success: false, error: 'provider_refused' })
      expect(prisma.booking.updateMany).toHaveBeenCalledWith({
        where: { id: BOOKING_ID, refundStatus: 'PENDING' },
        data: { refundStatus: 'FAILED' },
      })
      expect(prisma.booking.update).not.toHaveBeenCalled()
      expect(externalPayments.recordRefund).not.toHaveBeenCalled()
    })

    it('releases the claim and rethrows when the provider call throws', async () => {
      stripeProvider.processRefund.mockRejectedValue(new Error('network down'))

      await expect(
        service.processRefund({
          bookingId: BOOKING_ID,
          transactionId: TX_ID,
          amount: 200,
          provider: 'STRIPE',
        } as never)
      ).rejects.toThrow('network down')
      expect(prisma.booking.updateMany).toHaveBeenCalledWith({
        where: { id: BOOKING_ID, refundStatus: 'PENDING' },
        data: { refundStatus: 'FAILED' },
      })
      expect(prisma.booking.update).not.toHaveBeenCalled()
    })

    it('rejects when the refund claim race is lost', async () => {
      prisma.booking.updateMany.mockResolvedValue({ count: 0 })

      await expect(
        service.processRefund({
          bookingId: BOOKING_ID,
          transactionId: TX_ID,
          amount: 200,
          provider: 'STRIPE',
        } as never)
      ).rejects.toThrow('Refund could not be claimed')
      expect(stripeProvider.processRefund).not.toHaveBeenCalled()
    })
  })

  describe('refundBookingById', () => {
    it('refuses manual (bank transfer) bookings with the refund-case guidance, before the gateway gate (#733)', async () => {
      process.env.ENABLE_GATEWAY_PAYMENTS = 'false'
      prisma.booking.findUnique.mockResolvedValue({
        id: BOOKING_ID,
        paymentMethod: 'BANK_TRANSFER',
        paymentStatus: 'PAID',
        paymentTransactions: [],
      })

      await expect(service.refundBookingById(BOOKING_ID)).rejects.toThrow(
        'Manual (bank transfer) payments cannot be refunded through the gateway'
      )
    })

    it('refunds the remaining balance of a gateway booking by default', async () => {
      prisma.booking.findUnique.mockResolvedValue({
        id: BOOKING_ID,
        travelerId: TRAVELER_ID,
        sessionId: SESSION_ID,
        currency: 'MAD',
        paymentMethod: 'GATEWAY',
        paymentStatus: 'PAID',
        refundStatus: 'PROCESSED',
        refundAmount: 50,
        paymentGatewayTransactionId: TX_ID,
        paymentTransactions: [
          {
            id: 'ptx-1',
            bookingId: BOOKING_ID,
            transactionId: TX_ID,
            provider: 'STRIPE',
            status: 'SUCCESS',
            amount: 200,
          },
        ],
      })
      prisma.tripSession.findUnique.mockResolvedValue({
        id: SESSION_ID,
        template: { agencyId: 'agency-1' },
      })
      stripeProvider.processRefund.mockResolvedValue({ success: true, refundId: 're_2' })

      const result = await service.refundBookingById(BOOKING_ID)

      expect(result).toEqual({ success: true, refundId: 're_2' })
      // Default amount = 200 paid − 50 already refunded = 150 remaining.
      expect(stripeProvider.processRefund).toHaveBeenCalledWith(
        TX_ID,
        expect.anything(),
        `ouiboo-refund-${BOOKING_ID}-${TX_ID}-200.00`
      )
      const [, refundAmount] = stripeProvider.processRefund.mock.calls[0]
      expect(String(refundAmount)).toContain('150')
    })
  })
})
