import { BadRequestException, ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@ouiboo/database';
import { BookingsService } from './bookings.service';

process.env.JWT_SECRET = ['test', 'pass', 'secret'].join('-');

/**
 * #753: auditable Booking Pass redemption on top of the #689 pass.
 * In-memory fake honouring the atomic claim in redeemBookingPass
 * (updateMany gated on passRedeemedAt:null + the pre-claim status).
 */
function makeFakeDb(bookingOver: any = {}, payments: any[] | null = null) {
  const past = new Date(Date.now() - 60_000);
  const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const booking: any = {
    id: 'booking-1',
    travelerId: 'traveler-1',
    agencyId: 'agency-1',
    status: 'CONFIRMED',
    currency: 'MAD',
    guestsCount: 2,
    fullName: 'Test Traveller',
    totalAmount: new Prisma.Decimal('2000.00'),
    attendance: null,
    attendanceRecordedAt: null,
    attendanceRecordedBy: null,
    attendanceDisputedAt: null,
    attendanceDisputeReason: null,
    passCheckInAt: null,
    passRedeemedAt: null,
    passRedeemedBy: null,
    paymentPlan: null,
    externalPayments:
      payments ??
      [
        {
          stage: 'FULL',
          confirmedAmount: new Prisma.Decimal('2000.00'),
          bankReference: 'BANK-REF-1',
          bankConfirmedAt: past,
          bankConfirmedBy: 'agency-user-1',
          updatedAt: past,
        },
      ],
    session: {
      startDate: past,
      endDate: future,
      template: {
        id: 'template-1',
        agencyId: 'agency-1',
        title: 'Chefchaouen Day Trip',
        meetingPoint: { address: 'Place Mohammed V, Chefchaouen', mapsUrl: 'https://maps.example/x', pickupAvailable: false },
        agency: { id: 'agency-1', companyName: 'Atlas Test', legalName: 'Atlas Test SARL' },
      },
    },
    ...bookingOver,
  };
  const auditRows: any[] = [];
  const db: any = {
    _booking: booking,
    _auditRows: auditRows,
    booking: {
      findUnique: jest.fn(async () => booking),
      findUniqueOrThrow: jest.fn(async () => booking),
      updateMany: jest.fn(async ({ where, data }: any) => {
        if (where.passRedeemedAt === null && booking.passRedeemedAt !== null) return { count: 0 };
        if (where.passCheckInAt === null && booking.passCheckInAt !== null) return { count: 0 };
        if (where.status !== undefined && booking.status !== where.status) return { count: 0 };
        Object.assign(booking, data);
        return { count: 1 };
      }),
    },
    agencyProfile: {
      findUnique: jest.fn(async ({ where }: any) => {
        if (where.id === 'agency-1' || where.userId === 'agency-user-1') return { id: 'agency-1', userId: 'agency-user-1' };
        if (where.id === 'agency-2' || where.userId === 'agency-user-2') return { id: 'agency-2', userId: 'agency-user-2' };
        return null;
      }),
    },
    auditLog: {
      create: jest.fn(async ({ data }: any) => {
        auditRows.push(data);
        return data;
      }),
    },
  };
  return db;
}

function makeService(db: any) {
  return new BookingsService(db, {} as any, {} as any, {} as any, {} as any);
}

async function issueToken(service: BookingsService) {
  const pass: any = await service.getBookingPass('booking-1', 'traveler-1', 'TRAVELER');
  return pass.token as string;
}

describe('BookingsService.redeemBookingPass (#753)', () => {
  it('redeems exactly once: stamps redemption + check-in, records attendance, completes the booking, audits actor/agency/booking', async () => {
    const db = makeFakeDb();
    const service = makeService(db);
    const token = await issueToken(service);
    const result: any = await service.redeemBookingPass(token, 'agency-1', 'agency-user-1');
    expect(result.redeemed).toBe(true);
    expect(result.status).toBe('COMPLETED');
    expect(result.attendance).toBe('ATTENDED');
    expect(db._booking.passRedeemedAt).toBeInstanceOf(Date);
    expect(db._booking.passRedeemedBy).toBe('agency-user-1');
    expect(db._booking.passCheckInAt).toBeInstanceOf(Date);
    expect(db._booking.attendanceRecordedBy).toBe('agency-user-1');
    const audit = db._auditRows.find((row: any) => row.action === 'BOOKING_PASS_REDEEMED');
    expect(audit).toMatchObject({ actorId: 'agency-user-1', targetType: 'Booking', targetId: 'booking-1' });
    expect(audit.metadata.agencyId).toBe('agency-1');
  });

  it('refuses a second redemption with 409 and leaves the first redemption untouched', async () => {
    const db = makeFakeDb();
    const service = makeService(db);
    const token = await issueToken(service);
    await service.redeemBookingPass(token, 'agency-1', 'agency-user-1');
    const firstStamp = db._booking.passRedeemedAt;
    await expect(service.redeemBookingPass(token, 'agency-1', 'agency-user-1')).rejects.toBeInstanceOf(ConflictException);
    expect(db._booking.passRedeemedAt).toBe(firstStamp);
    expect(db._auditRows.filter((row: any) => row.action === 'BOOKING_PASS_REDEEMED')).toHaveLength(1);
  });

  it("refuses redemption by another agency (cross-tenant) without stamping anything", async () => {
    const db = makeFakeDb();
    const service = makeService(db);
    const token = await issueToken(service);
    await expect(service.redeemBookingPass(token, 'agency-2', 'agency-user-2')).rejects.toBeInstanceOf(ForbiddenException);
    expect(db._booking.passRedeemedAt).toBeNull();
  });

  it('rejects a tampered token with 401', async () => {
    const db = makeFakeDb();
    await expect(makeService(db).redeemBookingPass('not-a-token', 'agency-1', 'agency-user-1')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('refuses redemption for a cancelled booking', async () => {
    const db = makeFakeDb({ status: 'CANCELLED' });
    const service = makeService(db);
    // A pass cannot be issued for a cancelled booking; sign via a live one first.
    db._booking.status = 'CONFIRMED';
    const token = await issueToken(service);
    db._booking.status = 'CANCELLED';
    await expect(service.redeemBookingPass(token, 'agency-1', 'agency-user-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(db._booking.passRedeemedAt).toBeNull();
  });

  it('refuses redemption before the trip starts', async () => {
    const future = new Date(Date.now() + 3_600_000);
    const db = makeFakeDb({
      session: {
        startDate: future,
        endDate: new Date(Date.now() + 7_200_000),
        template: {
          id: 'template-1',
          agencyId: 'agency-1',
          title: 'Chefchaouen Day Trip',
          meetingPoint: { address: 'Place Mohammed V, Chefchaouen', mapsUrl: null, pickupAvailable: false },
          agency: { id: 'agency-1', companyName: 'Atlas Test', legalName: 'Atlas Test SARL' },
        },
      },
    });
    const service = makeService(db);
    const token = await issueToken(service);
    await expect(service.redeemBookingPass(token, 'agency-1', 'agency-user-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(db._booking.passRedeemedAt).toBeNull();
  });

  it('never overwrites an attendance outcome the agency already recorded', async () => {
    const db = makeFakeDb({ status: 'NO_SHOW', attendance: 'NO_SHOW' });
    const service = makeService(db);
    db._booking.status = 'CONFIRMED';
    const token = await issueToken(service);
    db._booking.status = 'COMPLETED';
    db._booking.attendance = 'ATTENDED';
    const result: any = await service.redeemBookingPass(token, 'agency-1', 'agency-user-1');
    expect(result.redeemed).toBe(true);
    expect(result.attendance).toBe('ATTENDED');
    expect(result.status).toBe('COMPLETED');
  });

  it('verify surfaces the redemption state after redemption', async () => {
    const db = makeFakeDb();
    const service = makeService(db);
    const token = await issueToken(service);
    await service.redeemBookingPass(token, 'agency-1', 'agency-user-1');
    const verified: any = await service.verifyBookingPass(token, 'agency-1', 'agency-user-1');
    expect(verified.valid).toBe(true);
    expect(verified.alreadyRedeemed).toBe(true);
    expect(verified.passRedeemedAt).not.toBeNull();
  });
});
