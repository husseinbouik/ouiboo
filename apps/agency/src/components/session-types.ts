import type { SessionStatusType } from '@ouiboo/types';

export interface AgencyTripSession {
  id: string;
  startDate: string;
  endDate: string;
  price: number;
  deposit: number;
  totalSeats: number;
  availableSeats: number;
  status: SessionStatusType;
  currency: string;
  cancellationReason?: string | null;
  bookings?: Array<{ id: string }>;
  /** #369: staged-payment configuration (minimum-group trips). */
  minBookings?: number;
  confirmationDeadline?: string | null;
  groupStatus?: string;
}
