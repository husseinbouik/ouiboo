import type { AxiosError } from 'axios';
import type { AdminTab, ApiErrorResponse } from './types';

export const ADMIN_TABS: AdminTab[] = ['PENDING', 'AGENCIES', 'BOOKINGS', 'PAYMENT_PROOFS', 'PAYOUTS', 'AUDIT'];
export const ADMIN_PAGE_LIMIT = 25;

export const isAdminTab = (value: string | null): value is AdminTab => {
  return value !== null && ADMIN_TABS.includes(value as AdminTab);
};

export const getErrorMessage = (
  error: AxiosError<ApiErrorResponse> | Error | null | undefined,
  fallback: string,
) => {
  if (error && 'response' in error) {
    return error.response?.data?.message || fallback;
  }

  return error?.message || fallback;
};
