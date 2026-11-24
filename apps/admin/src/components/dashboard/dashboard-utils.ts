import type { AxiosError } from 'axios';
import type { AdminTab, ApiErrorResponse } from './types';

export const ADMIN_TABS: AdminTab[] = ['PENDING', 'AGENCIES', 'BOOKINGS', 'GROUPS', 'PAYMENT_PROOFS', 'AUDIT', 'INVOICES', 'REFUNDS', 'SECURITY', 'SUPPORT'];
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

/**
 * #374: the invoice generation API reports specific, stable error codes
 * (either as a structured `code` field or as the exception message), but the
 * invoices tab used to flatten every failure into one generic message, so an
 * admin could not tell "nothing billable in that period" from a real fault.
 * Map the known codes to their dedicated i18n keys; anything unrecognised
 * falls back to the generic generate error.
 */
export const INVOICE_GENERATE_ERROR_KEYS = {
  noBillableBookings: 'dashboard.invoices.errors.noBillableBookings',
  rateNotConfigured: 'dashboard.invoices.errors.rateNotConfigured',
  rateOutOfRange: 'dashboard.invoices.errors.rateOutOfRange',
  mixedCurrencies: 'dashboard.invoices.errors.mixedCurrencies',
  notReady: 'dashboard.invoices.errors.notReady',
  agencyNotFound: 'dashboard.invoices.errors.agencyNotFound',
  fallback: 'dashboard.invoices.generateError',
} as const;

export const resolveInvoiceGenerateErrorKey = (error: unknown): string => {
  const data = (
    error as { response?: { data?: { code?: unknown; message?: unknown } } } | null | undefined
  )?.response?.data;
  const parts: string[] = [];
  if (typeof data?.code === 'string') parts.push(data.code);
  if (typeof data?.message === 'string') parts.push(data.message);
  if (Array.isArray(data?.message)) {
    parts.push(data.message.filter((part): part is string => typeof part === 'string').join(' '));
  }
  const tag = parts.join(' ');
  if (tag.includes('NO_BILLABLE_BOOKINGS')) return INVOICE_GENERATE_ERROR_KEYS.noBillableBookings;
  if (tag.includes('COMMISSION_RATE_NOT_CONFIGURED')) return INVOICE_GENERATE_ERROR_KEYS.rateNotConfigured;
  if (tag.includes('COMMISSION_RATE_OUT_OF_RANGE')) return INVOICE_GENERATE_ERROR_KEYS.rateOutOfRange;
  if (tag.includes('MIXED_BOOKING_CURRENCIES')) return INVOICE_GENERATE_ERROR_KEYS.mixedCurrencies;
  if (tag.includes('INVOICES_NOT_READY')) return INVOICE_GENERATE_ERROR_KEYS.notReady;
  if (tag.includes('Agency profile not found')) return INVOICE_GENERATE_ERROR_KEYS.agencyNotFound;
  return INVOICE_GENERATE_ERROR_KEYS.fallback;
};

/**
 * Phase 5 (Design Council 2026-11-24, verdict #21 — Queue workbench):
 * how long a queue item has been waiting, derived from the createdAt /
 * uploadedAt timestamp already in the payload. Returns a coarse
 * amount + unit so the call site renders it through i18n
 * (`dashboard.labels.ageMinutes` / `ageHours` / `ageDays`); null when
 * the timestamp is missing or unparseable (render nothing, never a
 * fabricated age). Hours are kept up to 48h — the mockup's oldest
 * queue item reads "26h", not "1d".
 */
export type QueueAgeUnit = 'minutes' | 'hours' | 'days';

export const getQueueAge = (
  iso: string | null | undefined,
  now: Date = new Date(),
): { amount: number; unit: QueueAgeUnit } | null => {
  if (!iso) return null;
  const start = new Date(iso).getTime();
  if (Number.isNaN(start)) return null;
  const elapsedMinutes = Math.max(0, Math.floor((now.getTime() - start) / 60000));
  if (elapsedMinutes < 60) return { amount: elapsedMinutes, unit: 'minutes' };
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 48) return { amount: elapsedHours, unit: 'hours' };
  return { amount: Math.floor(elapsedHours / 24), unit: 'days' };
};
