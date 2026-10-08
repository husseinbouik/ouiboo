import { TripStatus, type TripStatusType } from '@ouiboo/types';
import type { AgencyTripSession } from '@/components/session-types';

export type SessionItem = AgencyTripSession;

export type TripDetail = {
  id: string;
  title: string;
  category: string;
  status: TripStatusType;
  currency: string;
  startLocation: string;
  durationDays: number;
  durationNights: number;
  description: string;
  images?: string[];
  sessions?: SessionItem[];
};

export type BulkSessionInput = {
  startDate: string;
  endDate: string;
  price: number;
  deposit?: number;
  totalSeats: number;
  currency: string;
};

export { TripStatus };
