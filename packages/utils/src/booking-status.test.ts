import { BookingStatus } from '@ouiboo/types';
import {
  canCancelTravelerBooking,
  canMarkAttendance,
  getAgencyBookingStatusMeta,
  getTravelerBookingStatusTone,
  isReviewEligibleBooking,
} from './booking-status';

describe('#434 NO_SHOW / attendance helpers', () => {
  it('isReviewEligibleBooking requires COMPLETED + ATTENDED', () => {
    expect(isReviewEligibleBooking({ status: BookingStatus.Completed, attendance: 'ATTENDED' })).toBe(true);
    expect(isReviewEligibleBooking({ status: BookingStatus.Completed, attendance: null })).toBe(false);
    expect(isReviewEligibleBooking({ status: BookingStatus.Completed, attendance: 'NO_SHOW' })).toBe(false);
    expect(isReviewEligibleBooking({ status: BookingStatus.NoShow, attendance: 'NO_SHOW' })).toBe(false);
    expect(isReviewEligibleBooking({ status: BookingStatus.Confirmed, attendance: 'ATTENDED' })).toBe(false);
  });

  it('canMarkAttendance requires an unrecorded CONFIRMED/COMPLETED booking whose trip has started', () => {
    const now = new Date('2026-10-27T12:00:00Z');
    const started = { startDate: '2026-10-27T08:00:00Z' };
    const future = { startDate: '2026-10-28T08:00:00Z' };
    expect(canMarkAttendance({ status: BookingStatus.Confirmed, attendance: null, session: started }, now)).toBe(true);
    expect(canMarkAttendance({ status: BookingStatus.Completed, attendance: null, session: started }, now)).toBe(true);
    expect(canMarkAttendance({ status: BookingStatus.Confirmed, attendance: null, session: future }, now)).toBe(false);
    expect(canMarkAttendance({ status: BookingStatus.Completed, attendance: 'ATTENDED', session: started }, now)).toBe(false);
    expect(canMarkAttendance({ status: BookingStatus.Pending, attendance: null, session: started }, now)).toBe(false);
    expect(canMarkAttendance({ status: BookingStatus.NoShow, attendance: 'NO_SHOW', session: started }, now)).toBe(false);
  });

  it('NO_SHOW is terminal for cancellation and renders as a danger outcome', () => {
    expect(canCancelTravelerBooking(BookingStatus.NoShow)).toBe(false);
    expect(getTravelerBookingStatusTone(BookingStatus.NoShow)).toContain('rose');
    expect(getAgencyBookingStatusMeta(BookingStatus.NoShow).icon).toBe('no-show');
  });
});
