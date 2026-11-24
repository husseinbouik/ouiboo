import { getStatusTone, STATUS_TONES } from './status-meta';

/**
 * #1029 (D4): the registry is the one tone source for every portal.
 * These pins protect the outputs the pre-registry systems produced —
 * admin badge classes, the agency bank-details meta and the session
 * badge all resolve through here now.
 */
describe('getStatusTone', () => {
  it('resolves the booking lifecycle', () => {
    expect(getStatusTone('booking', 'CONFIRMED')).toBe('success');
    expect(getStatusTone('booking', 'AWAITING_VALIDATION')).toBe('warning');
    expect(getStatusTone('booking', 'PENDING_MINIMUM')).toBe('warning');
    expect(getStatusTone('booking', 'NO_SHOW')).toBe('danger');
    expect(getStatusTone('booking', 'NOT_CONFIRMED')).toBe('danger');
    expect(getStatusTone('booking', 'COMPLETED')).toBe('success');
  });

  it('keeps an accepted proof a warning, never a success (#422)', () => {
    expect(getStatusTone('verification', 'ACCEPTED')).toBe('warning');
    expect(getStatusTone('verification', 'VERIFIED')).toBe('success');
    expect(getStatusTone('verification', 'REJECTED')).toBe('danger');
  });

  it('mirrors licence tones onto insurance (#415)', () => {
    for (const status of Object.keys(STATUS_TONES.licence)) {
      expect(getStatusTone('insurance', status)).toBe(getStatusTone('licence', status));
    }
  });

  it('resolves bank-details, session and payment tones', () => {
    expect(getStatusTone('bankDetails', 'UNVERIFIED')).toBe('neutral');
    expect(getStatusTone('bankDetails', 'PENDING_REVIEW')).toBe('warning');
    expect(getStatusTone('session', 'OPEN')).toBe('success');
    expect(getStatusTone('session', 'FULL')).toBe('warning');
    expect(getStatusTone('payment', 'PARTIALLY_PAID')).toBe('warning');
    expect(getStatusTone('payment', 'REFUNDED')).toBe('info');
  });

  it('normalises case and whitespace, and falls back for unknown statuses', () => {
    expect(getStatusTone('booking', ' confirmed ')).toBe('success');
    expect(getStatusTone('booking', 'WHATEVER')).toBe('neutral');
    expect(getStatusTone('booking', null)).toBe('neutral');
    expect(getStatusTone('booking', undefined)).toBe('neutral');
  });

  it('honours a caller-pinned fallback (admin verification default was warning)', () => {
    expect(getStatusTone('verification', null, 'warning')).toBe('warning');
    expect(getStatusTone('verification', 'SOMETHING_NEW', 'warning')).toBe('warning');
  });
});
