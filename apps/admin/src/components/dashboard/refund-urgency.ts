import type { AdminRefundCase } from './types';

/**
 * #559 (Council S3 P1-1): refund urgency derivation.
 *
 * The admin refunds API exposes no due-date filter, so the dashboard's
 * overdue / due-≤48h counters and the pre-filtered Refunds queue are both
 * derived here, from the same fetched case list and the same `now`, so
 * the summary card, the filtered queue and the beta-metrics panel can be
 * checked against each other and must agree.
 *
 * A case counts only while it is still actionable: terminal cases
 * (completed / rejected) never count, whatever their due date says, and a
 * case without a due date cannot be overdue or due soon.
 */

export type RefundUrgency = 'overdue' | 'due48';

export const REFUND_TERMINAL_STATUSES: ReadonlySet<string> = new Set([
  'REFUND_COMPLETED',
  'REFUND_REJECTED',
]);

export const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

export function refundUrgency(
  refundCase: Pick<AdminRefundCase, 'status' | 'refundDueAt'>,
  now: Date = new Date(),
): RefundUrgency | null {
  if (REFUND_TERMINAL_STATUSES.has(refundCase.status)) return null;
  if (!refundCase.refundDueAt) return null;
  const dueAt = new Date(refundCase.refundDueAt).getTime();
  if (Number.isNaN(dueAt)) return null;
  const nowMs = now.getTime();
  if (dueAt < nowMs) return 'overdue';
  if (dueAt - nowMs <= FORTY_EIGHT_HOURS_MS) return 'due48';
  return null;
}

export function countRefundUrgency(
  cases: Array<Pick<AdminRefundCase, 'status' | 'refundDueAt'>>,
  now: Date = new Date(),
): { overdue: number; due48: number } {
  let overdue = 0;
  let due48 = 0;
  for (const refundCase of cases) {
    const urgency = refundUrgency(refundCase, now);
    if (urgency === 'overdue') overdue += 1;
    else if (urgency === 'due48') due48 += 1;
  }
  return { overdue, due48 };
}

export function filterRefundCasesByUrgency<T extends Pick<AdminRefundCase, 'status' | 'refundDueAt'>>(
  cases: T[],
  urgency: RefundUrgency,
  now: Date = new Date(),
): T[] {
  return cases.filter((refundCase) => refundUrgency(refundCase, now) === urgency);
}
