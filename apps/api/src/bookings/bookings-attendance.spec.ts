import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { BookingsService } from './bookings.service';

/**
 * #434 (Council P1-08): attendance recording.
 * In-memory fake of the Prisma surface markAttendance uses, honouring
 * the atomic claim in the updateMany where clause (status + attendance
 * still unrecorded) so the one-shot semantics are exercised for real.
 */
function makeFakeDb(bookingOver: any = {}) {
  const past = new Date(Date.now() - 60_000);
  const booking: any = {
    id: 'booking-1',
    travelerId: 'traveler-1',
    status: 'CONFIRMED',
    attendance: null,
    attendanceRecordedAt: null,
    attendanceRecordedBy: null,
    session: { startDate: past, endDate: new Date(Date.now() + 60_000), template: { agencyId: 'agency-1' } },
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
        if (booking.status !== where.status) return { count: 0 };
        if (where.attendance === null && booking.attendance !== null) return { count: 0 };
        Object.assign(booking, data);
        return { count: 1 };
      }),
    },
    agencyProfile: {
      findUnique: jest.fn(async ({ where }: any) =>
        where.id === 'agency-1' ? { id: 'agency-1' } : null,
      ),
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

describe('BookingsService.markAttendance (#434)', () => {
  it('attended from CONFIRMED completes the booking, stamps the record and audits it', async () => {
    const db = makeFakeDb();
    const updated: any = await makeService(db).markAttendance('booking-1', 'agency-1', 'agency-user-1', true);
    expect(updated.status).toBe('COMPLETED');
    expect(updated.attendance).toBe('ATTENDED');
    expect(updated.attendanceRecordedBy).toBe('agency-user-1');
    expect(updated.attendanceRecordedAt).toBeInstanceOf(Date);
    expect(db._auditRows).toHaveLength(1);
    expect(db._auditRows[0]).toMatchObject({
      action: 'BOOKING_ATTENDANCE_RECORDED',
      targetType: 'Booking',
      targetId: 'booking-1',
      metadata: { attendance: 'ATTENDED', agencyId: 'agency-1' },
    });
  });

  it('absent from CONFIRMED moves the booking to NO_SHOW', async () => {
    const db = makeFakeDb();
    const updated: any = await makeService(db).markAttendance('booking-1', 'agency-1', 'agency-user-1', false);
    expect(updated.status).toBe('NO_SHOW');
    expect(updated.attendance).toBe('NO_SHOW');
  });

  it('a COMPLETED booking with no attendance yet can still be recorded (remediation path)', async () => {
    const db = makeFakeDb({ status: 'COMPLETED' });
    const updated: any = await makeService(db).markAttendance('booking-1', 'agency-1', 'agency-user-1', false);
    expect(updated.status).toBe('NO_SHOW');
    expect(updated.attendance).toBe('NO_SHOW');
  });

  it("another agency's booking is Forbidden and untouched", async () => {
    const db = makeFakeDb();
    await expect(
      makeService(db).markAttendance('booking-1', 'agency-2', 'agency-user-2', true),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(db._booking.status).toBe('CONFIRMED');
    expect(db._booking.attendance).toBeNull();
  });

  it('attendance cannot be recorded before the trip starts', async () => {
    const db = makeFakeDb({
      session: {
        startDate: new Date(Date.now() + 3_600_000),
        endDate: new Date(Date.now() + 7_200_000),
        template: { agencyId: 'agency-1' },
      },
    });
    await expect(
      makeService(db).markAttendance('booking-1', 'agency-1', 'agency-user-1', true),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(db._booking.attendance).toBeNull();
  });

  it('attendance cannot be recorded for a non-confirmed booking', async () => {
    const db = makeFakeDb({ status: 'PENDING' });
    await expect(
      makeService(db).markAttendance('booking-1', 'agency-1', 'agency-user-1', true),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('replaying the same outcome is idempotent; flipping a recorded outcome is rejected', async () => {
    const db = makeFakeDb({ status: 'COMPLETED', attendance: 'ATTENDED' });
    const replay: any = await makeService(db).markAttendance('booking-1', 'agency-1', 'agency-user-1', true);
    expect(replay.attendance).toBe('ATTENDED');
    await expect(
      makeService(db).markAttendance('booking-1', 'agency-1', 'agency-user-1', false),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(db._booking.status).toBe('COMPLETED');
  });

  it('a non-boolean attended value is rejected', async () => {
    const db = makeFakeDb();
    await expect(
      makeService(db).markAttendance('booking-1', 'agency-1', 'agency-user-1', 'yes' as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
