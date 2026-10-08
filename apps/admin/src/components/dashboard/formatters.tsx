import React from 'react';
import { TripStatus, VerificationStatus, type TripStatusType, type VerificationStatusType } from '@ouiboo/types';
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
export const canApproveTrip = (status?: TripStatusType) => status !== TripStatus.Active;
export const canRejectTrip = (status?: TripStatusType) => status !== TripStatus.Archived;
export const canApprovePaymentProof = (status?: VerificationStatusType) => status !== VerificationStatus.Verified;
export const canRejectPaymentProof = (status?: VerificationStatusType) => status !== VerificationStatus.Rejected;
