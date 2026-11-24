/**
 * Single status → tone registry (#1029, finding D4).
 *
 * Until now three parallel systems decided what colour a status is:
 * this package's booking-status metas, the admin app's
 * status-mappers, the agency's bank-details/session satellites, and
 * the (unused) tone registry inside `packages/ui`'s StatusBadge —
 * each with its own map, so the same status could render differently
 * per portal and adding a status meant editing up to five files.
 *
 * This module is now the one source of truth for the *tone* of every
 * domain status (the semantic severity: success / warning / danger /
 * info / neutral). It is deliberately audience-independent:
 * - wording stays per audience — admin keeps its i18n label keys,
 *   agency/traveler keep theirs; only the tone decision is shared;
 * - each surface keeps its own tone → class mapping (a bordered pill
 *   in one app, a ring badge in another), so adopting the registry
 *   changes no pixel by itself.
 *
 * Tones were reconciled from the existing systems so every current
 * consumer's output is preserved; where systems disagreed, the
 * payment-safety reading won (e.g. an ACCEPTED proof is a warning,
 * never a success — #422).
 */

export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export type StatusDomain =
  | 'booking'
  | 'payment'
  | 'verification'
  | 'licence'
  | 'insurance'
  | 'bankDetails'
  | 'subscription'
  | 'session'
  | 'payout'
  | 'refund';

export const STATUS_TONES: Record<StatusDomain, Record<string, StatusTone>> = {
  booking: {
    PENDING: 'warning',
    AWAITING_VALIDATION: 'warning',
    CONFIRMED: 'success',
    REJECTED: 'danger',
    CANCELLED: 'danger',
    COMPLETED: 'success',
    PENDING_MINIMUM: 'warning',
    NOT_CONFIRMED: 'danger',
    NO_SHOW: 'danger',
  },
  payment: {
    PENDING: 'warning',
    UNPAID: 'warning',
    PAID: 'success',
    REFUNDED: 'info',
    FAILED: 'danger',
    PARTIALLY_PAID: 'warning',
  },
  verification: {
    PENDING: 'warning',
    // #422: an accepted proof image is NOT settlement — warning, never success.
    ACCEPTED: 'warning',
    VERIFIED: 'success',
    REJECTED: 'danger',
  },
  licence: {
    NOT_SUBMITTED: 'neutral',
    PENDING_REVIEW: 'warning',
    VERIFIED: 'success',
    REJECTED: 'danger',
    EXPIRED: 'danger',
  },
  // #415: the RC insurance artefact runs the same lifecycle as the licence.
  insurance: {
    NOT_SUBMITTED: 'neutral',
    PENDING_REVIEW: 'warning',
    VERIFIED: 'success',
    REJECTED: 'danger',
    EXPIRED: 'danger',
  },
  bankDetails: {
    UNVERIFIED: 'neutral',
    PENDING_REVIEW: 'warning',
    VERIFIED: 'success',
    REJECTED: 'danger',
  },
  subscription: {
    TRIAL: 'info',
    ACTIVE: 'success',
    CANCELLED: 'danger',
    EXPIRED: 'neutral',
  },
  session: {
    OPEN: 'success',
    FULL: 'warning',
    CANCELLED: 'danger',
  },
  payout: {
    PENDING: 'warning',
    PROCESSING: 'info',
    PAID: 'success',
  },
  refund: {
    PENDING: 'warning',
    PROCESSED: 'info',
    FAILED: 'danger',
  },
};

/**
 * The tone for a status within its domain. Unknown or missing
 * statuses return `fallback` ('neutral' unless the caller pins a
 * different historical default — e.g. admin's verification badge
 * treated every non-verified/rejected state as a warning).
 */
export function getStatusTone(
  domain: StatusDomain,
  status?: string | null,
  fallback: StatusTone = 'neutral',
): StatusTone {
  if (!status) return fallback;
  return STATUS_TONES[domain][status.trim().toUpperCase()] ?? fallback;
}
