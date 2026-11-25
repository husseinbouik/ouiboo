import { BankDetailsStatus } from '@ouiboo/types';
import { getStatusTone, type StatusTone } from '@ouiboo/utils';

/**
 * #421 (Council P0-19): presentation meta for the agency's bank-destination
 * review state on the settings screen. Submitted details are NOT live when
 * saved — they sit in PENDING_REVIEW until an admin verifies them against
 * the bank attestation; only VERIFIED instructions reach travellers. The
 * copy keys name that honestly per state.
 *
 * #1029 (D4): the tone decision now comes from the shared
 * `@ouiboo/utils` status registry (the admin portal resolves the same
 * statuses through it too); this module keeps only the agency
 * settings screen's class style and its i18n text keys.
 */
export interface BankDetailsStatusMeta {
  className: string;
  textKey: string;
}

const TONE_CLASS_NAME: Record<StatusTone, string> = {
  success: 'border-success/30 bg-success/10 text-success',
  warning: 'border-warning/30 bg-warning/10 text-warning',
  danger: 'border-danger/30 bg-danger/10 text-danger',
  info: 'border-border bg-muted text-muted-foreground',
  neutral: 'border-border bg-muted text-muted-foreground',
};

const STATUS_TEXT_KEY: Record<string, string> = {
  [BankDetailsStatus.Verified]: 'settings.bankStatusVerified',
  [BankDetailsStatus.PendingReview]: 'settings.bankStatusPendingReview',
  [BankDetailsStatus.Rejected]: 'settings.bankStatusRejected',
};

export const getBankDetailsStatusMeta = (
  status?: string | null,
): BankDetailsStatusMeta => ({
  className: TONE_CLASS_NAME[getStatusTone('bankDetails', status)],
  textKey: (status && STATUS_TEXT_KEY[status]) || 'settings.bankStatusUnverified',
});
