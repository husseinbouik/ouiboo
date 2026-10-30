import type { AxiosError } from 'axios';
import type { CancellationScaleSnapshot } from '@ouiboo/types';

export type ApiErrorResponse = {
  message?: string;
};

export type CheckoutTripSession = {
  availableSeats: number;
  endDate: string;
  id: string;
  price: number | string;
  currency: string;
  startDate: string;
  /** #369: staged-payment configuration (minimum-group trips). */
  deposit?: number | string;
  minBookings?: number;
  confirmationDeadline?: string | null;
  groupStatus?: string;
};

/** #369: a session is staged when it needs a minimum group and a deposit. */
export const isStagedSession = (session?: CheckoutTripSession | null) =>
  Boolean(session) && (session?.minBookings ?? 1) > 1 && Number(session?.deposit ?? 0) > 0;

/** #369: staged amounts for a booking (deposit per seat × guests). */
export const getStagedAmounts = (session: CheckoutTripSession, guestCount: number) => {
  const depositDue = Number(session.deposit ?? 0) * guestCount;
  const total = Number(session.price ?? 0) * guestCount;
  return { depositDue, balanceDue: total - depositDue, total };
};

export type CheckoutTrip = {
  agency?: {
    bankDetails?: string | null;
    companyName?: string | null;
    /** #371: seller of record (legal name + verified licence). */
    legalName?: string | null;
    /** B4: licence type + issue data for the complete seller block. */
    travelLicenceType?: string | null;
    travelLicenceNumber?: string | null;
    travelLicenceStatus?: string | null;
    licenceExpiry?: string | null;
    licenceIssuedAt?: string | null;
    licenceIssuingAuthority?: string | null;
    /** #413 (Council B10): what+when verification statement dates. */
    licenceVerifiedAt?: string | null;
    insuranceStatus?: string | null;
    insuranceVerifiedAt?: string | null;
    /** #688/#700 (Council S6): Verification Record + Art. 29(2) block. */
    id?: string;
    insuranceInsurer?: string | null;
    insuranceExpiry?: string | null;
    verificationStatus?: string | null;
    businessAddress?: string | null;
    businessPhone?: string | null;
    rc?: string | null;
    taxId?: string | null;
  } | null;
  images?: string[];
  /** #332: agency-provided alt text per image (index-aligned); may be absent. */
  imageAlts?: string[];
  /** #417: the resolved cancellation scale from GET /trips/:id (bands + floor). */
  cancellationScale?: CancellationScaleSnapshot | null;
  sessions?: CheckoutTripSession[];
  startLocation: string;
  title: string;
};

export type BookingResponse = {
  id: string;
};

export const getErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as AxiosError<ApiErrorResponse>;
    return axiosError.response?.data?.message || axiosError.message || fallback;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
};
