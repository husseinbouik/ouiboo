import React from 'react';
import { LicenceStatus, TripStatus, VerificationStatus, type LicenceStatusType, type TripStatusType, type VerificationStatusType } from '@ouiboo/types';
import type { BankDetailsMap } from './types';

type TFn = (key: string, opts?: Record<string, unknown>) => string;

export const renderBankDetails = (bankDetails: string | undefined, t: TFn) => {
  if (!bankDetails) {
    return <p className="text-muted-foreground">{t('dashboard.messages.noBankDetails')}</p>;
  }

  let details: string | BankDetailsMap = bankDetails;
  try {
    details = JSON.parse(bankDetails) as BankDetailsMap;
  } catch {
    details = bankDetails;
  }

  if (typeof details === 'string') {
    return <p className="text-sm text-muted-foreground whitespace-pre-line">{details}</p>;
  }

  return (
    <div className="bg-muted rounded-xl p-3 space-y-1 text-sm">
      {Object.entries(details).map(([key, value]) => (
        <div key={key} className="flex justify-between gap-4">
          <span className="text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
          <span className="font-medium text-foreground">{String(value ?? t('dashboard.labels.na'))}</span>
        </div>
      ))}
    </div>
  );
};

export const formatDateTime = (value: string | null | undefined, t: TFn) => {
  if (!value) {
    return t('dashboard.labels.na');
  }

  return new Date(value).toLocaleString();
};

export const renderAuditMetadata = (metadata: Record<string, unknown> | null | undefined, t: TFn) => {
  if (!metadata || Object.keys(metadata).length === 0) {
    return <span className="text-muted-foreground">{t('dashboard.audit.noMetadata')}</span>;
  }

  return (
    <pre className="max-w-full overflow-x-auto whitespace-pre-wrap text-[11px] leading-5 text-muted-foreground">
      {JSON.stringify(metadata, null, 2)}
    </pre>
  );
};

export const canApproveAgency = (status?: VerificationStatusType) => status !== VerificationStatus.Verified;
export const canRejectAgency = (status?: VerificationStatusType) => status !== VerificationStatus.Rejected;
// #371: only a licence awaiting review can be verified or rejected.
export const canVerifyLicence = (status?: LicenceStatusType) => status === LicenceStatus.PendingReview;
export const canRejectLicence = (status?: LicenceStatusType) => status === LicenceStatus.PendingReview;
// #415: the RC insurance artefact follows the same review lifecycle.
export const canVerifyInsurance = (status?: LicenceStatusType) => status === LicenceStatus.PendingReview;
export const canRejectInsurance = (status?: LicenceStatusType) => status === LicenceStatus.PendingReview;
// #421: bank details can only be decided while a submission awaits review.
export const canVerifyBankDetails = (status?: string | null, pendingBankDetails?: string | boolean | null) =>
  status === 'PENDING_REVIEW' && Boolean(pendingBankDetails);
export const canRejectBankDetails = (status?: string | null, pendingBankDetails?: string | boolean | null) =>
  status === 'PENDING_REVIEW' && Boolean(pendingBankDetails);

const normalizeName = (value: string) => value.toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * #421: mirrors the API holder check — the submitted bank account holder
 * must be the agency itself (legal name or trade name). Returns null when
 * there is nothing to compare (no holder submitted yet).
 */
export const bankHolderNameMatches = (agency: {
  bankAccountHolderName?: string | null;
  legalName?: string | null;
  companyName?: string | null;
}): boolean | null => {
  const holder = (agency.bankAccountHolderName || '').trim();
  if (!holder) {
    return null;
  }
  return [agency.legalName, agency.companyName]
    .filter((name): name is string => !!name && name.trim().length > 0)
    .some((name) => normalizeName(name) === normalizeName(holder));
};

/**
 * #415: visual flag only — the insured name on the RC certificate should
 * be the agency's legal name. Returns null when not comparable.
 */
export const insuranceInsuredNameMatches = (agency: {
  insuranceInsuredName?: string | null;
  legalName?: string | null;
  companyName?: string | null;
}): boolean | null => {
  const insured = (agency.insuranceInsuredName || '').trim();
  if (!insured) {
    return null;
  }
  return [agency.legalName, agency.companyName]
    .filter((name): name is string => !!name && name.trim().length > 0)
    .some((name) => normalizeName(name) === normalizeName(insured));
};
export const canApproveTrip = (status?: TripStatusType) => status !== TripStatus.Active;
export const canRejectTrip = (status?: TripStatusType) => status !== TripStatus.Archived;
export const canApprovePaymentProof = (status?: VerificationStatusType) => status !== VerificationStatus.Verified;
export const canRejectPaymentProof = (status?: VerificationStatusType) => status !== VerificationStatus.Rejected;
