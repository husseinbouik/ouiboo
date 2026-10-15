import type { AxiosError } from 'axios';

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
};

export type CheckoutTrip = {
  agency?: {
    bankDetails?: string | null;
    companyName?: string | null;
  } | null;
  images?: string[];
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
