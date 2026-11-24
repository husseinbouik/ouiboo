import { INVOICE_GENERATE_ERROR_KEYS, getQueueAge, resolveInvoiceGenerateErrorKey } from './dashboard-utils';

const axiosError = (data: unknown) => ({ response: { data } });

describe('resolveInvoiceGenerateErrorKey (#374)', () => {
  it('maps the no-billable-bookings code (message-only body) to its specific key', () => {
    expect(resolveInvoiceGenerateErrorKey(axiosError({ message: 'NO_BILLABLE_BOOKINGS_FOR_PERIOD', statusCode: 400 }))).toBe(
      INVOICE_GENERATE_ERROR_KEYS.noBillableBookings,
    );
  });

  it('maps the structured INVOICES_NOT_READY code field to its specific key', () => {
    expect(
      resolveInvoiceGenerateErrorKey(axiosError({ code: 'INVOICES_NOT_READY', message: 'Invoice storage is not available yet (database migration pending).' })),
    ).toBe(INVOICE_GENERATE_ERROR_KEYS.notReady);
  });

  it('maps the prefixed rate-not-configured message to its specific key', () => {
    expect(
      resolveInvoiceGenerateErrorKey(
        axiosError({ message: 'COMMISSION_RATE_NOT_CONFIGURED: pass commissionRatePercent or set OUIBOO_COMMISSION_RATE_PERCENT' }),
      ),
    ).toBe(INVOICE_GENERATE_ERROR_KEYS.rateNotConfigured);
  });

  it('maps the rate-out-of-range and mixed-currency codes to their specific keys', () => {
    expect(resolveInvoiceGenerateErrorKey(axiosError({ message: 'COMMISSION_RATE_OUT_OF_RANGE: rate must be within (0, 100]' }))).toBe(
      INVOICE_GENERATE_ERROR_KEYS.rateOutOfRange,
    );
    expect(resolveInvoiceGenerateErrorKey(axiosError({ message: 'MIXED_BOOKING_CURRENCIES_FOR_PERIOD' }))).toBe(
      INVOICE_GENERATE_ERROR_KEYS.mixedCurrencies,
    );
  });

  it('maps an unknown agency to its specific key', () => {
    expect(resolveInvoiceGenerateErrorKey(axiosError({ message: 'Agency profile not found', statusCode: 404 }))).toBe(
      INVOICE_GENERATE_ERROR_KEYS.agencyNotFound,
    );
  });

  it('falls back to the generic key for unrecognised or missing errors', () => {
    expect(resolveInvoiceGenerateErrorKey(axiosError({ message: 'Internal server error' }))).toBe(INVOICE_GENERATE_ERROR_KEYS.fallback);
    expect(resolveInvoiceGenerateErrorKey(axiosError({ message: ['year must not be greater than 2100'] }))).toBe(INVOICE_GENERATE_ERROR_KEYS.fallback);
    expect(resolveInvoiceGenerateErrorKey(null)).toBe(INVOICE_GENERATE_ERROR_KEYS.fallback);
    expect(resolveInvoiceGenerateErrorKey(undefined)).toBe(INVOICE_GENERATE_ERROR_KEYS.fallback);
    expect(resolveInvoiceGenerateErrorKey(new Error('network down'))).toBe(INVOICE_GENERATE_ERROR_KEYS.fallback);
  });
});

describe('getQueueAge (Phase 5 — queue workbench ages)', () => {
  const now = new Date('2026-11-24T12:00:00.000Z');

  it('reports minutes under an hour, hours up to 48h, then days', () => {
    expect(getQueueAge('2026-11-24T11:45:00.000Z', now)).toEqual({ amount: 15, unit: 'minutes' });
    expect(getQueueAge('2026-11-23T10:00:00.000Z', now)).toEqual({ amount: 26, unit: 'hours' });
    expect(getQueueAge('2026-11-20T12:00:00.000Z', now)).toEqual({ amount: 4, unit: 'days' });
  });

  it('clamps future timestamps to zero and rejects missing/invalid ones', () => {
    expect(getQueueAge('2026-11-24T13:00:00.000Z', now)).toEqual({ amount: 0, unit: 'minutes' });
    expect(getQueueAge(null, now)).toBeNull();
    expect(getQueueAge(undefined, now)).toBeNull();
    expect(getQueueAge('not-a-date', now)).toBeNull();
  });
});
