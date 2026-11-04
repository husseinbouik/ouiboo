import { BadRequestException, ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@ouiboo/database';
import { BookingsService } from './bookings.service';

process.env.JWT_SECRET = '<MASKED_SECRET_001>';

/**
 * #689 + #693 (Council S6): Booking Pass issuance/verification and the
 * attendance dispute path. In-memory fake of the Prisma surface the
 * three methods use, honouring the atomic claims in their updateMany
 * where clauses.
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
    attendanceDisputedAt: null,
    attendanceDisputeReason: null,
    passCheckInAt: null,
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
        if (where.passCheckInAt === null && booking.passCheckInAt !== null) return { count: 0 };
        if (where.attendanceDisputedAt === null && booking.attendanceDisputedAt !== null) return { count: 0 };
        Object.assign(booking, data);
        return { count: 1 };
      }),
    },
    agencyProfile: {
      findUnique: jest.fn(async ({ where }: any) => {
        if (where.id === 'agency-1' || where.userId === 'agency-user-1') return { id: 'agency-1', userId: 'agency-user-1' };
        if (where.userId === 'agency-user-2') return { id: 'agency-2', userId: 'agency-user-2' };
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

describe('BookingsService.getBookingPass (#689)', () => {
  it('issues a signed pass once the agency bank-confirmed receipt, with the meeting point unlocked', async () => {
    const db = makeFakeDb();
    const pass: any = await makeService(db).getBookingPass('booking-1', 'traveler-1', 'TRAVELER');
    expect(pass.seller.legalName).toBe('Atlas Test SARL');
    expect(pass.totalAmount).toBe('2000.00');
    expect(pass.depositConfirmedAmount).toBe('2000.00');
    expect(pass.meetingPoint.address).toContain('Chefchaouen');
    expect(typeof pass.token).toBe('string');
    expect(pass.token.split('.')).toHaveLength(3);
  });

  it('refuses a pass before any bank confirmation (an uploaded/accepted proof is not settlement)', async () => {
    const db = makeFakeDb({}, []);
    await expect(makeService(db).getBookingPass('booking-1', 'traveler-1', 'TRAVELER')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("refuses a pass to a traveller who does not own the booking", async () => {
    const db = makeFakeDb();
    await expect(makeService(db).getBookingPass('booking-1', 'traveler-2', 'TRAVELER')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('refuses a pass for a cancelled booking even with a confirmed payment', async () => {
    const db = makeFakeDb({ status: 'CANCELLED' });
    await expect(makeService(db).getBookingPass('booking-1', 'traveler-1', 'TRAVELER')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});

describe('BookingsService.verifyBookingPass (#689/#693)', () => {
  it('verifies for the owning agency and stamps the QR check-in as the second attendance signal', async () => {
    const db = makeFakeDb();
    const service = makeService(db);
    const pass: any = await service.getBookingPass('booking-1', 'traveler-1', 'TRAVELER');
    const result: any = await service.verifyBookingPass(pass.token, 'agency-1', 'agency-user-1');
    expect(result.valid).toBe(true);
    expect(result.passCheckInAt).not.toBeNull();
    expect(db._booking.passCheckInAt).toBeInstanceOf(Date);
    expect(db._auditRows.some((row: any) => row.action === 'BOOKING_PASS_CHECK_IN')).toBe(true);
  });

  it("refuses verification by another agency (the scan must be agency-authenticated AND owning)", async () => {
    const db = makeFakeDb();
    const service = makeService(db);
    const pass: any = await service.getBookingPass('booking-1', 'traveler-1', 'TRAVELER');
    await expect(service.verifyBookingPass(pass.token, 'agency-2', 'agency-user-2')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(db._booking.passCheckInAt).toBeNull();
  });

  it('rejects a garbage or tampered token with 401 — an unauthenticated scan validates nothing', async () => {
    const db = makeFakeDb();
    await expect(makeService(db).verifyBookingPass('not-a-token', 'agency-1', 'agency-user-1')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('reports a cancelled booking as invalid instead of verifying it', async () => {
    const db = makeFakeDb();
    const service = makeService(db);
    const pass: any = await service.getBookingPass('booking-1', 'traveler-1', 'TRAVELER');
    db._booking.status = 'CANCELLED';
    const result: any = await service.verifyBookingPass(pass.token, 'agency-1', 'agency-user-1');
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('BOOKING_NOT_ACTIVE');
  });
});

describe('BookingsService.disputeAttendance (#693)', () => {
  it('stamps the dispute with its reason and audits it, without rewriting the recorded outcome', async () => {
    const db = makeFakeDb({ status: 'NO_SHOW', attendance: 'NO_SHOW' });
    const updated: any = await makeService(db).disputeAttendance('booking-1', 'traveler-1', 'I was at the meeting point');
    expect(updated.attendance).toBe('NO_SHOW');
    expect(updated.attendanceDisputedAt).toBeInstanceOf(Date);
    expect(updated.attendanceDisputeReason).toBe('I was at the meeting point');
    expect(db._auditRows.some((row: any) => row.action === 'BOOKING_ATTENDANCE_DISPUTED')).toBe(true);
  });

  it('cannot dispute before any attendance is recorded', async () => {
    const db = makeFakeDb();
    await expect(makeService(db).disputeAttendance('booking-1', 'traveler-1', 'too soon')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("another traveller cannot dispute someone else's attendance", async () => {
    const db = makeFakeDb({ attendance: 'ATTENDED' });
    await expect(makeService(db).disputeAttendance('booking-1', 'traveler-2', 'not mine')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('a second dispute conflicts instead of overwriting the first', async () => {
    const db = makeFakeDb({ attendance: 'ATTENDED', attendanceDisputedAt: new Date(), attendanceDisputeReason: 'first' });
    await expect(makeService(db).disputeAttendance('booking-1', 'traveler-1', 'second')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
