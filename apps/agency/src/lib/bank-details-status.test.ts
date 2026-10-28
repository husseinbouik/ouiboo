import { BankDetailsStatus } from '@ouiboo/types';
import { getBankDetailsStatusMeta } from './bank-details-status';

const UNVERIFIED_KEY = 'settings.bankStatusUnverified';

describe('getBankDetailsStatusMeta (#421)', () => {
  it('maps VERIFIED to the live-for-travellers copy', () => {
    const meta = getBankDetailsStatusMeta(BankDetailsStatus.Verified);
    expect(meta.textKey).toBe('settings.bankStatusVerified');
    expect(meta.className).toContain('success');
  });

  it('maps PENDING_REVIEW to the under-review copy (not live)', () => {
    const meta = getBankDetailsStatusMeta(BankDetailsStatus.PendingReview);
    expect(meta.textKey).toBe('settings.bankStatusPendingReview');
    expect(meta.className).toContain('warning');
  });

  it('maps REJECTED to the rejected copy', () => {
    const meta = getBankDetailsStatusMeta(BankDetailsStatus.Rejected);
    expect(meta.textKey).toBe('settings.bankStatusRejected');
    expect(meta.className).toContain('danger');
  });

  it('falls back to UNVERIFIED for missing or unknown states', () => {
    expect(getBankDetailsStatusMeta(BankDetailsStatus.Unverified).textKey).toBe(
      UNVERIFIED_KEY,
    );
    expect(getBankDetailsStatusMeta(undefined).textKey).toBe(UNVERIFIED_KEY);
    expect(getBankDetailsStatusMeta(null).textKey).toBe(UNVERIFIED_KEY);
    expect(getBankDetailsStatusMeta('SOMETHING_ELSE').textKey).toBe(
      UNVERIFIED_KEY,
    );
  });
});
