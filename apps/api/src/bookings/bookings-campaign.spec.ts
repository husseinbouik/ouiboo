import { Test, TestingModule } from '@nestjs/testing';
import { BookingsService } from './bookings.service';
import { DatabaseService } from '../database/database.service';
import { UploadService } from '../upload/upload.service';
import { EmailService } from '../email/email.service';
import { ExternalPaymentsService } from '../external-payments/external-payments.service';
import { StagedPaymentsService } from '../staged-payments/staged-payments.service';
import { Prisma } from '@ouiboo/database';

/**
 * #755: campaign/session pricing inside BookingsService.create +
 * previewPromo — the booking-level wiring of the price-rules util.
 * Harness mirrors the #778 block in bookings.service.spec.
 */
const mockDatabaseService: any = {
  booking: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), updateMany: jest.fn(), findMany: jest.fn(), findUniqueOrThrow: jest.fn() },
  tripSession: { findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
  user: { findUnique: jest.fn() },
  paymentProof: { upsert: jest.fn(), updateMany: jest.fn(), findUnique: jest.fn() },
  bookingPaymentPlan: { updateMany: jest.fn() },
  externalPayment: { findFirst: jest.fn() },
  duplicateCreditFlag: { create: jest.fn(), findMany: jest.fn() },
  agencyProfile: { findUnique: jest.fn() },
  promoCode: { findFirst: jest.fn(), updateMany: jest.fn() },
  sessionPriceRule: { findMany: jest.fn(), updateMany: jest.fn() },
  $transaction: jest.fn(),
};
mockDatabaseService.$transaction.mockImplementation((cb: any) => cb(mockDatabaseService));

const mockStagedPaymentsService = {
  isStagedSession: jest.fn(() => false),
  createPlanInTransaction: jest.fn(),
  applyProofRejectionInTransaction: jest.fn(),
  applyBankConfirmationInTransaction: jest.fn(),
};

const session = {
  id: 'session-123',
  status: 'OPEN',
  startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  price: 250,
  deposit: 50,
  minBookings: 1,
  groupStatus: 'NOT_REQUIRED',
  confirmationDeadline: null,
  templateId: 'template-1',
  currency: 'MAD',
  template: {
    id: 'template-1',
    status: 'ACTIVE',
    title: 'Atlas Escape',
    agencyId: 'agency-123',
    cancellationPolicy: null,
    agency: {
      id: 'agency-123',
      userId: 'agency-user-123',
      verificationStatus: 'VERIFIED',
      travelLicenceStatus: 'VERIFIED',
      licenceExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      insuranceStatus: 'VERIFIED',
      insuranceExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      subscriptionStatus: 'TRIAL',
      trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      subscriptionEndsAt: null,
    },
  },
};

const campaignRule = {
  id: 'rule-1',
  agencyId: 'agency-123',
  templateId: 'template-1',
  sessionId: null,
  name: 'Low season',
  discountType: 'PERCENT',
  discountValue: new Prisma.Decimal('20'),
  startsAt: null,
  endsAt: null,
  maxUses: null,
  usedCount: 0,
  budgetCap: null,
  discountGranted: new Prisma.Decimal('0'),
  stacksWithPromoCode: false,
  isActive: true,
  createdAt: new Date(),
};

const createDto = {
  sessionId: 'session-123',
  guestsCount: 2,
  fullName: 'Test Traveler',
  phoneNumber: '+212600000000',
  termsAccepted: true,
  termsVersion: '1.0',
  locale: 'en',
};

describe('BookingsService campaign pricing (#755)', () => {
  let service: BookingsService;
  let db: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockDatabaseService.$transaction.mockImplementation((cb: any) => cb(mockDatabaseService));
    mockStagedPaymentsService.isStagedSession.mockReturnValue(false);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: EmailService, useValue: { sendBookingNotification: jest.fn(), sendPaymentConfirmation: jest.fn() } },
        { provide: UploadService, useValue: { uploadFile: jest.fn(), getFilePath: jest.fn(), readFile: jest.fn(), isLocal: jest.fn() } },
        { provide: ExternalPaymentsService, useValue: { recordPaymentVerifiedInTransaction: jest.fn(), recordPaymentRejectedInTransaction: jest.fn(), recordPaymentPendingInTransaction: jest.fn() } },
        { provide: StagedPaymentsService, useValue: mockStagedPaymentsService },
      ],
    }).compile();
    service = module.get<BookingsService>(BookingsService);
    db = mockDatabaseService;

    db.tripSession.findUnique.mockResolvedValue(session);
    db.tripSession.updateMany.mockResolvedValue({ count: 1 });
    db.booking.findFirst.mockResolvedValue(null);
    db.user.findUnique.mockResolvedValue(null);
    db.sessionPriceRule.updateMany.mockResolvedValue({ count: 1 });
    db.booking.create.mockImplementation(async (args: any) => ({
      id: 'booking-new',
      sessionId: 'session-123',
      travelerId: 'user-123',
      bookingDate: new Date(),
      status: 'PENDING',
      totalAmount: args.data.totalAmount,
      promoCode: args.data.promoCode ?? null,
      discountAmount: args.data.discountAmount ?? new Prisma.Decimal(0),
      promoSnapshot: args.data.promoSnapshot ?? null,
      priceRuleId: args.data.priceRuleId ?? null,
      campaignDiscountAmount: args.data.campaignDiscountAmount ?? new Prisma.Decimal(0),
      campaignSnapshot: args.data.campaignSnapshot ?? null,
      currency: 'MAD',
      guestsCount: 2,
      paymentMethod: 'MANUAL',
      paymentStatus: 'UNPAID',
      paymentPlan: null,
      traveler: { email: 'traveler@example.com', name: 'Test Traveler' },
      session: {
        id: 'session-123',
        templateId: 'template-1',
        startDate: new Date(),
        endDate: new Date(),
        price: '250.00',
        totalSeats: 10,
        availableSeats: 8,
        status: 'OPEN',
        currency: 'MAD',
        template: { id: 'template-1', title: 'Atlas Escape', startLocation: 'Marrakech', images: [], agencyId: 'agency-123', agency: { id: 'agency-123', companyName: 'Atlas' } },
      },
    }));
  });

  it('applies a template campaign with NO code: total, snapshot, atomic claim', async () => {
    db.sessionPriceRule.findMany.mockResolvedValue([campaignRule]);
    const result: any = await service.create('user-123', { ...createDto } as any);
    const data = db.booking.create.mock.calls[0][0].data;
    // 2 x 250 = 500 base; 20% campaign = 100; total 400.
    expect(data.totalAmount.toFixed(2)).toBe('400.00');
    expect(data.campaignDiscountAmount.toFixed(2)).toBe('100.00');
    expect(data.priceRuleId).toBe('rule-1');
    expect(data.campaignSnapshot).toEqual(expect.objectContaining({ ruleId: 'rule-1', baseTotal: '500.00', discountAmount: '100.00', totalAmount: '400.00' }));
    expect(result.campaignDiscountAmount).toBe('100.00');
    expect(db.sessionPriceRule.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 'rule-1', agencyId: 'agency-123', isActive: true }),
      data: expect.objectContaining({ usedCount: { increment: 1 } }),
    }));
  });

  it('a promo code wins over a non-stacking campaign (rule skipped, no claim)', async () => {
    db.sessionPriceRule.findMany.mockResolvedValue([campaignRule]);
    db.promoCode.findFirst.mockResolvedValue({
      id: 'promo-1', agencyId: 'agency-123', code: 'SAVE10', discountType: 'PERCENT',
      discountValue: new Prisma.Decimal('10'), startsAt: null, endsAt: null, maxUses: null, usedCount: 0, isActive: true,
    });
    db.promoCode.updateMany.mockResolvedValue({ count: 1 });
    await service.create('user-123', { ...createDto, promoCode: 'SAVE10' } as any);
    const data = db.booking.create.mock.calls[0][0].data;
    // Code only: 10% of 500 = 50; campaign contributes nothing.
    expect(data.totalAmount.toFixed(2)).toBe('450.00');
    expect(data.campaignDiscountAmount.toFixed(2)).toBe('0.00');
    expect(data.priceRuleId).toBeNull();
    expect(db.sessionPriceRule.updateMany).not.toHaveBeenCalled();
  });

  it('a stacking campaign discounts first and the code prices the remainder', async () => {
    db.sessionPriceRule.findMany.mockResolvedValue([{ ...campaignRule, stacksWithPromoCode: true }]);
    db.promoCode.findFirst.mockResolvedValue({
      id: 'promo-1', agencyId: 'agency-123', code: 'SAVE10', discountType: 'PERCENT',
      discountValue: new Prisma.Decimal('10'), startsAt: null, endsAt: null, maxUses: null, usedCount: 0, isActive: true,
    });
    db.promoCode.updateMany.mockResolvedValue({ count: 1 });
    await service.create('user-123', { ...createDto, promoCode: 'SAVE10' } as any);
    const data = db.booking.create.mock.calls[0][0].data;
    // 500 - 20% campaign (100) = 400; code 10% of 400 = 40; total 360.
    // Reconciliation: 100 + 40 + 360 = 500.
    expect(data.campaignDiscountAmount.toFixed(2)).toBe('100.00');
    expect(data.discountAmount.toFixed(2)).toBe('40.00');
    expect(data.totalAmount.toFixed(2)).toBe('360.00');
  });

  it('no rule → booking prices exactly as before (no campaign fields set)', async () => {
    db.sessionPriceRule.findMany.mockResolvedValue([]);
    await service.create('user-123', { ...createDto } as any);
    const data = db.booking.create.mock.calls[0][0].data;
    expect(data.totalAmount.toFixed(2)).toBe('500.00');
    expect(data.priceRuleId).toBeNull();
    expect(db.sessionPriceRule.updateMany).not.toHaveBeenCalled();
  });

  it('preview without a code discloses the campaign and prices the same total', async () => {
    db.sessionPriceRule.findMany.mockResolvedValue([campaignRule]);
    const preview: any = await service.previewPromo({ sessionId: 'session-123', guestsCount: 2 });
    expect(preview.valid).toBe(true);
    expect(preview.code).toBeNull();
    expect(preview.undiscountedTotal).toBe('500.00');
    expect(preview.campaignDiscountAmount).toBe('100.00');
    expect(preview.campaign).toEqual(expect.objectContaining({ ruleId: 'rule-1', name: 'Low season' }));
    expect(preview.totalAmount).toBe('400.00');
    expect(db.sessionPriceRule.updateMany).not.toHaveBeenCalled();
  });
});
