import { BookingStatus } from '@ouiboo/types';
import {
  isTripActiveWindow,
  NORMAL_SUPPORT_RESPONSE_HOURS,
  REFUND_SLA_DAYS,
  shouldShowTripContacts,
} from './support-contact';

describe('support split helpers (#419)', () => {
  describe('shouldShowTripContacts', () => {
    it('shows the departure pack for live bookings', () => {
      expect(shouldShowTripContacts(BookingStatus.Confirmed)).toBe(true);
      expect(shouldShowTripContacts(BookingStatus.Pending)).toBe(true);
      expect(shouldShowTripContacts(BookingStatus.PendingMinimum)).toBe(true);
      expect(shouldShowTripContacts(BookingStatus.AwaitingValidation)).toBe(true);
    });

    it('hides it when there is no departure to pack for', () => {
      expect(shouldShowTripContacts(BookingStatus.Cancelled)).toBe(false);
      expect(shouldShowTripContacts(BookingStatus.Rejected)).toBe(false);
      expect(shouldShowTripContacts(BookingStatus.NotConfirmed)).toBe(false);
      expect(shouldShowTripContacts(BookingStatus.Completed)).toBe(false);
    });
  });

  describe('isTripActiveWindow', () => {
    const start = '2027-03-10T00:00:00.000Z';
    const end = '2027-03-12T00:00:00.000Z';

    it('is active on the first and last trip days', () => {
      expect(isTripActiveWindow(start, end, new Date('2027-03-10T08:00:00.000Z'))).toBe(true);
      expect(isTripActiveWindow(start, end, new Date('2027-03-12T23:00:00.000Z'))).toBe(true);
    });

    it('is inactive before and after the trip', () => {
      expect(isTripActiveWindow(start, end, new Date('2027-03-09T23:00:00.000Z'))).toBe(false);
      expect(isTripActiveWindow(start, end, new Date('2027-03-13T00:30:00.000Z'))).toBe(false);
    });

    it('is inactive for unparseable dates', () => {
      expect(isTripActiveWindow('not-a-date', end, new Date('2027-03-11T00:00:00.000Z'))).toBe(false);
    });
  });

  it('pins the founder-decided support commitments', () => {
    expect(NORMAL_SUPPORT_RESPONSE_HOURS).toBe(48);
    expect(REFUND_SLA_DAYS).toBe(7);
  });
});
