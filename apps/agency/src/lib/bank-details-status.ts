import { BankDetailsStatus } from '@ouiboo/types';

/**
 * #421 (Council P0-19): presentation meta for the agency's bank-destination
 * review state on the settings screen. Submitted details are NOT live when
 * saved — they sit in PENDING_REVIEW until an admin verifies them against
 * the bank attestation; only VERIFIED instructions reach travellers. The
 * copy keys name that honestly per state.
 */
export interface BankDetailsStatusMeta {
  className: string;
  textKey: string;
}

export const getBankDetailsStatusMeta = (
  status?: string | null,
): BankDetailsStatusMeta => {
  switch (status) {
    case BankDetailsStatus.Verified:
      return {
        className: 'border-success/30 bg-success/10 text-success',
        textKey: 'settings.bankStatusVerified',
      };
    case BankDetailsStatus.PendingReview:
      return {
        className: 'border-warning/30 bg-warning/10 text-warning',
        textKey: 'settings.bankStatusPendingReview',
      };
    case BankDetailsStatus.Rejected:
      return {
        className: 'border-danger/30 bg-danger/10 text-danger',
        textKey: 'settings.bankStatusRejected',
      };
    default:
      return {
        className: 'border-border bg-muted text-muted-foreground',
        textKey: 'settings.bankStatusUnverified',
      };
  }
};
