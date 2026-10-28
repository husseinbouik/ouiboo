import { countRefundUrgency, filterRefundCasesByUrgency, refundUrgency } from './refund-urgency';

const NOW = new Date('2026-10-27T12:00:00.000Z');
const hoursFromNow = (hours: number) => new Date(NOW.getTime() + hours * 60 * 60 * 1000).toISOString();

describe('refundUrgency (#559)', () => {
  it('flags an actionable case past its due date as overdue', () => {
    expect(refundUrgency({ status: 'AGENCY_ACTION_REQUIRED', refundDueAt: hoursFromNow(-1) }, NOW)).toBe('overdue');
    expect(refundUrgency({ status: 'REFUND_OVERDUE', refundDueAt: hoursFromNow(-72) }, NOW)).toBe('overdue');
  });

  it('flags an actionable case due within 48h (inclusive) as due48', () => {
    expect(refundUrgency({ status: 'REFUND_APPROVED', refundDueAt: hoursFromNow(48) }, NOW)).toBe('due48');
    expect(refundUrgency({ status: 'REFUND_APPROVED', refundDueAt: hoursFromNow(1) }, NOW)).toBe('due48');
  });

  it('ignores cases due later, without a due date, or with an invalid date', () => {
    expect(refundUrgency({ status: 'REFUND_APPROVED', refundDueAt: hoursFromNow(49) }, NOW)).toBeNull();
    expect(refundUrgency({ status: 'REFUND_APPROVED', refundDueAt: null }, NOW)).toBeNull();
    expect(refundUrgency({ status: 'REFUND_APPROVED', refundDueAt: 'not-a-date' }, NOW)).toBeNull();
  });

  it('never counts terminal cases, even when past due', () => {
    expect(refundUrgency({ status: 'REFUND_COMPLETED', refundDueAt: hoursFromNow(-10) }, NOW)).toBeNull();
    expect(refundUrgency({ status: 'REFUND_REJECTED', refundDueAt: hoursFromNow(2) }, NOW)).toBeNull();
  });

  it('counts and filters from the same derivation, so card and queue agree', () => {
    const cases = [
      { id: 'a', status: 'AGENCY_ACTION_REQUIRED', refundDueAt: hoursFromNow(-2) },
      { id: 'b', status: 'REFUND_REQUESTED', refundDueAt: hoursFromNow(10) },
      { id: 'c', status: 'REFUND_COMPLETED', refundDueAt: hoursFromNow(-2) },
      { id: 'd', status: 'REFUND_INITIATED', refundDueAt: hoursFromNow(100) },
    ];
    expect(countRefundUrgency(cases, NOW)).toEqual({ overdue: 1, due48: 1 });
    expect(filterRefundCasesByUrgency(cases, 'overdue', NOW).map((c) => c.id)).toEqual(['a']);
    expect(filterRefundCasesByUrgency(cases, 'due48', NOW).map((c) => c.id)).toEqual(['b']);
  });
});
