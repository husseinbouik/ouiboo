'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { XCircle, CheckCircle2, Eye, TriangleAlert } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle, Badge } from '@ouiboo/ui';
import { LicenceStatus, VerificationStatus, type LicenceStatusType, type VerificationStatusType } from '@ouiboo/types';
import type { AdminAgency, FeedbackState } from './types';
import {
  getAdminVerificationBadgeClass,
  getAdminVerificationBadgeLabel,
  getAdminSubscriptionBadgeLabel,
  getAdminLicenceBadgeClass,
  getAdminLicenceBadgeLabel,
  getEffectiveLicenceStatus,
  getAdminInsuranceBadgeClass,
  getAdminInsuranceBadgeLabel,
  getEffectiveInsuranceStatus,
  getAdminBankDetailsBadgeClass,
  getAdminBankDetailsBadgeLabel,
} from '../../app/status-mappers';
import {
  canApproveAgency,
  canRejectAgency,
  canVerifyLicence,
  canRejectLicence,
  canVerifyInsurance,
  canRejectInsurance,
  canVerifyBankDetails,
  canRejectBankDetails,
  bankHolderNameMatches,
  insuranceInsuredNameMatches,
  renderBankDetails,
} from './formatters';

type TFn = (key: string, opts?: Record<string, unknown>) => string;

type AgencyReviewModalProps = {
  t: TFn;
  agency: AdminAgency;
  agencyFeedback: FeedbackState | null;
  isVerifying: boolean;
  isVerifyingLicence: boolean;
  isVerifyingInsurance: boolean;
  isVerifyingBankDetails: boolean;
  onClose: () => void;
  onVerify: (id: string, status: VerificationStatusType) => void;
  onVerifyLicence: (id: string, status: LicenceStatusType, opts?: { ministryChecked?: boolean }) => void;
  onVerifyInsurance: (id: string, status: LicenceStatusType, reason?: string) => void;
  onVerifyBankDetails: (
    id: string,
    status: VerificationStatusType,
    opts?: { reason?: string; overrideReason?: string },
  ) => void;
  onViewDocument: (key: string) => void;
};

export default function AgencyReviewModal({
  t,
  agency: selectedAgency,
  agencyFeedback,
  isVerifying,
  isVerifyingLicence,
  isVerifyingInsurance,
  isVerifyingBankDetails,
  onClose,
  onVerify,
  onVerifyLicence,
  onVerifyInsurance,
  onVerifyBankDetails,
  onViewDocument,
}: AgencyReviewModalProps) {
  const licenceStatus = getEffectiveLicenceStatus(selectedAgency);
  const insuranceStatus = getEffectiveInsuranceStatus(selectedAgency);
  const holderMatches = bankHolderNameMatches(selectedAgency);
  const insuredMatches = insuranceInsuredNameMatches(selectedAgency);

  // Review-form state, reset whenever a different agency is opened
  // (adjusted during render, the pattern page.tsx uses for tab sync).
  const [formAgencyId, setFormAgencyId] = useState(selectedAgency.id);
  const [ministryChecked, setMinistryChecked] = useState(false);
  const [insuranceReason, setInsuranceReason] = useState('');
  const [bankOverrideReason, setBankOverrideReason] = useState('');
  const [bankRejectionReason, setBankRejectionReason] = useState('');
  if (formAgencyId !== selectedAgency.id) {
    setFormAgencyId(selectedAgency.id);
    setMinistryChecked(false);
    setInsuranceReason('');
    setBankOverrideReason('');
    setBankRejectionReason('');
  }

  const expiryCell = (value?: string | null) =>
    value ? (
      <span className="text-foreground font-medium">{new Date(value).toLocaleDateString()}</span>
    ) : (
      <span className="text-danger font-medium">{t('dashboard.labels.expiryMissing')}</span>
    );

  // #421: a pending replacement is what gets reviewed; otherwise show the
  // live destination (or the empty state) for context.
  let bankDetailsBlock: React.ReactNode;
  if (selectedAgency.pendingBankDetails) {
    bankDetailsBlock = (
      <div className="space-y-1">
        <p className="text-muted-foreground">{t('dashboard.labels.pendingBankDetails')}</p>
        {renderBankDetails(selectedAgency.pendingBankDetails, t)}
      </div>
    );
  } else if (selectedAgency.bankDetails) {
    bankDetailsBlock = (
      <div className="space-y-1">
        <p className="text-muted-foreground">{t('dashboard.labels.currentBankDetails')}</p>
        {renderBankDetails(selectedAgency.bankDetails, t)}
      </div>
    );
  } else {
    bankDetailsBlock = <p className="text-muted-foreground">{t('dashboard.messages.noBankDetails')}</p>;
  }

  return (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
    <Card className="max-w-2xl w-full border-none shadow-2xl rounded-3xl max-h-[90vh] overflow-y-auto">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="space-y-1">
          <CardTitle className="text-foreground">{t('dashboard.modal.agencyReview')}</CardTitle>
          <p className="text-sm text-muted-foreground">{t('dashboard.messages.reviewVerification')}</p>
        </div>
        <Button variant="ghost" onClick={() => onClose()}>
          <XCircle className="h-5 w-5" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 bg-muted rounded-2xl overflow-hidden">
            <Image src={selectedAgency.logo || `https://ui-avatars.com/api/?name=${selectedAgency.companyName}`} alt={t('dashboard.labels.agencyLogo', { name: selectedAgency.companyName })} width={56} height={56} className="h-full w-full object-cover" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">{selectedAgency.companyName}</h3>
            <p className="text-sm text-muted-foreground">{t('dashboard.labels.ice')}: {selectedAgency.ice || t('dashboard.labels.na')}</p>
          </div>
        </div>
        {selectedAgency.verificationPausedAt && (
          <div className="rounded-xl bg-danger/10 p-3 text-sm text-danger">
            <p className="font-semibold flex items-center gap-2">
              <TriangleAlert className="h-4 w-4" />
              {t('dashboard.labels.verificationPaused')}
            </p>
            <p>
              {new Date(selectedAgency.verificationPausedAt).toLocaleDateString()}
              {selectedAgency.verificationPauseReason ? ` — ${selectedAgency.verificationPauseReason}` : ''}
            </p>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('dashboard.labels.contact')}</p>
            <p className="font-medium text-foreground">{selectedAgency.user?.name || t('dashboard.messages.notProvided')}</p>
            <p className="text-muted-foreground">{selectedAgency.user?.email || t('dashboard.messages.noEmail')}</p>
            <p className="text-muted-foreground">{selectedAgency.user?.phone || t('dashboard.messages.noPhone')}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('dashboard.labels.status')}</p>
            <div className="flex gap-2">
              <Badge className={getAdminVerificationBadgeClass(selectedAgency.verificationStatus)}>
                {getAdminVerificationBadgeLabel(selectedAgency.verificationStatus, t)}
              </Badge>
              <Badge variant="outline">{getAdminSubscriptionBadgeLabel(selectedAgency.subscriptionStatus, t)}</Badge>
            </div>
            <p className="text-muted-foreground text-xs">
              {t('dashboard.labels.joined')} {selectedAgency.user?.createdAt ? new Date(selectedAgency.user.createdAt).toLocaleDateString() : t('dashboard.messages.unknown')}
            </p>
          </div>
          <div className="md:col-span-2 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('dashboard.labels.agencyAddress')}</p>
            <p className="text-muted-foreground">{selectedAgency.businessAddress || selectedAgency.address || selectedAgency.profile?.address || t('dashboard.messages.noAddress')}</p>
          </div>
          <div className="md:col-span-2 space-y-2 border-t border-border pt-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('dashboard.labels.travelLicence')}</p>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={getAdminLicenceBadgeClass(licenceStatus)}>
                {getAdminLicenceBadgeLabel(licenceStatus, t)}
              </Badge>
              {selectedAgency.travelLicenceType && (
                <span className="text-muted-foreground">{selectedAgency.travelLicenceType}</span>
              )}
              {selectedAgency.travelLicenceNumber && (
                <span className="font-medium text-foreground">{selectedAgency.travelLicenceNumber}</span>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-muted-foreground">
              <p>{t('dashboard.labels.legalName')}: <span className="text-foreground font-medium">{selectedAgency.legalName || t('dashboard.labels.na')}</span></p>
              <p>{t('dashboard.labels.legalRepresentative')}: <span className="text-foreground font-medium">{selectedAgency.legalRepresentative || t('dashboard.labels.na')}</span></p>
              <p>{t('dashboard.labels.rc')}: <span className="text-foreground font-medium">{selectedAgency.rc || t('dashboard.labels.na')}</span></p>
              <p>{t('dashboard.labels.taxId')}: <span className="text-foreground font-medium">{selectedAgency.taxId || t('dashboard.labels.na')}</span></p>
              <p>{t('dashboard.labels.licenceExpiry')}: {expiryCell(selectedAgency.licenceExpiry)}</p>
              <p>{t('dashboard.labels.licenceVerifiedAt')}: <span className="text-foreground font-medium">{selectedAgency.licenceVerifiedAt ? new Date(selectedAgency.licenceVerifiedAt).toLocaleDateString() : t('dashboard.labels.na')}</span></p>
              {selectedAgency.licenceMinistryCheckedAt && (
                <p>{t('dashboard.labels.ministryCheckedOn')}: <span className="text-foreground font-medium">{new Date(selectedAgency.licenceMinistryCheckedAt).toLocaleDateString()}</span></p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground">{t('dashboard.labels.licenceDocument')}:</span>
              {selectedAgency.licenceDocumentKey ? (
                <>
                  <span className="font-medium text-foreground">{selectedAgency.licenceDocumentName || selectedAgency.licenceDocumentKey}</span>
                  <Button variant="outline" size="sm" onClick={() => onViewDocument(selectedAgency.licenceDocumentKey as string)}>
                    <Eye className="h-4 w-4 ms-2" />
                    {t('dashboard.actions.viewDocument')}
                  </Button>
                </>
              ) : (
                <span className="text-danger font-medium">{t('dashboard.messages.noLicenceDocument')}</span>
              )}
            </div>
            {selectedAgency.licenceRejectionReason && (
              <p className="text-danger">{t('dashboard.labels.licenceRejectionReason')}: {selectedAgency.licenceRejectionReason}</p>
            )}
            {(() => {
              const canVerify = canVerifyLicence(licenceStatus);
              const canReject = canRejectLicence(licenceStatus);
              if (!canVerify && !canReject) return null;
              return (
                <div className="space-y-3 pt-2">
                  {canVerify && (
                    <label htmlFor="ministry-check" className="flex items-start gap-2 text-sm text-foreground cursor-pointer">
                      <input
                        id="ministry-check"
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 accent-sunset-orange"
                        checked={ministryChecked}
                        onChange={(event) => setMinistryChecked(event.target.checked)}
                      />
                      <span>{t('dashboard.labels.ministryCheck')}</span>
                    </label>
                  )}
                  <div className="flex flex-wrap gap-3">
                    <Button
                      className="bg-success text-success-foreground hover:bg-success/90 border-none"
                      onClick={() => onVerifyLicence(selectedAgency.id, LicenceStatus.Verified, { ministryChecked: true })}
                      disabled={!canVerify || !ministryChecked || isVerifyingLicence}
                    >
                      <CheckCircle2 className="h-4 w-4 ms-2" />
                      {t('dashboard.actions.verifyLicence')}
                    </Button>
                    <Button
                      className="bg-danger/10 text-danger hover:bg-danger/15 border-none"
                      onClick={() => onVerifyLicence(selectedAgency.id, LicenceStatus.Rejected)}
                      disabled={!canReject || isVerifyingLicence}
                    >
                      <XCircle className="h-4 w-4 ms-2" />
                      {t('dashboard.actions.rejectLicence')}
                    </Button>
                  </div>
                </div>
              );
            })()}
          </div>
          <div className="md:col-span-2 space-y-2 border-t border-border pt-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('dashboard.labels.insurance')}</p>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={getAdminInsuranceBadgeClass(insuranceStatus)}>
                {getAdminInsuranceBadgeLabel(insuranceStatus, t)}
              </Badge>
              {selectedAgency.insurancePolicyNumber && (
                <span className="font-medium text-foreground">{selectedAgency.insurancePolicyNumber}</span>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-muted-foreground">
              <p>{t('dashboard.labels.insuranceInsurer')}: <span className="text-foreground font-medium">{selectedAgency.insuranceInsurer || t('dashboard.labels.na')}</span></p>
              <p>{t('dashboard.labels.insurancePolicyNumber')}: <span className="text-foreground font-medium">{selectedAgency.insurancePolicyNumber || t('dashboard.labels.na')}</span></p>
              <p>
                {t('dashboard.labels.insuranceInsuredName')}: <span className="text-foreground font-medium">{selectedAgency.insuranceInsuredName || t('dashboard.labels.na')}</span>
                {insuredMatches === false && (
                  <span className="text-danger font-medium"> — {t('dashboard.labels.insuredNameMismatch')}</span>
                )}
              </p>
              <p>{t('dashboard.labels.insuranceCoverageLimit')}: <span className="text-foreground font-medium">{selectedAgency.insuranceCoverageLimit ?? t('dashboard.labels.na')}</span></p>
              <p>{t('dashboard.labels.insuranceValidFrom')}: <span className="text-foreground font-medium">{selectedAgency.insuranceValidFrom ? new Date(selectedAgency.insuranceValidFrom).toLocaleDateString() : t('dashboard.labels.na')}</span></p>
              <p>{t('dashboard.labels.insuranceExpiry')}: {expiryCell(selectedAgency.insuranceExpiry)}</p>
              <p>{t('dashboard.labels.insuranceVerifiedAt')}: <span className="text-foreground font-medium">{selectedAgency.insuranceVerifiedAt ? new Date(selectedAgency.insuranceVerifiedAt).toLocaleDateString() : t('dashboard.labels.na')}</span></p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground">{t('dashboard.labels.insuranceCertificate')}:</span>
              {selectedAgency.insuranceCertificateKey ? (
                <Button variant="outline" size="sm" onClick={() => onViewDocument(selectedAgency.insuranceCertificateKey as string)}>
                  <Eye className="h-4 w-4 ms-2" />
                  {t('dashboard.actions.viewCertificate')}
                </Button>
              ) : (
                <span className="text-danger font-medium">{t('dashboard.messages.noInsuranceCertificate')}</span>
              )}
            </div>
            {selectedAgency.insuranceRejectionReason && (
              <p className="text-danger">{t('dashboard.labels.insuranceRejectionReason')}: {selectedAgency.insuranceRejectionReason}</p>
            )}
            {(() => {
              const canVerify = canVerifyInsurance(insuranceStatus);
              const canReject = canRejectInsurance(insuranceStatus);
              if (!canVerify && !canReject) return null;
              return (
                <div className="space-y-3 pt-2">
                  <div className="space-y-1">
                    <label htmlFor="insurance-rejection-reason" className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {t('dashboard.labels.rejectionReasonLabel')}
                    </label>
                    <input
                      id="insurance-rejection-reason"
                      type="text"
                      value={insuranceReason}
                      onChange={(event) => setInsuranceReason(event.target.value)}
                      placeholder={t('dashboard.labels.rejectionReasonPlaceholder')}
                      className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sunset-orange/20"
                    />
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      className="bg-success text-success-foreground hover:bg-success/90 border-none"
                      onClick={() => onVerifyInsurance(selectedAgency.id, LicenceStatus.Verified)}
                      disabled={!canVerify || isVerifyingInsurance}
                    >
                      <CheckCircle2 className="h-4 w-4 ms-2" />
                      {t('dashboard.actions.verifyInsurance')}
                    </Button>
                    <Button
                      className="bg-danger/10 text-danger hover:bg-danger/15 border-none"
                      onClick={() => onVerifyInsurance(selectedAgency.id, LicenceStatus.Rejected, insuranceReason.trim() || undefined)}
                      disabled={!canReject || isVerifyingInsurance}
                    >
                      <XCircle className="h-4 w-4 ms-2" />
                      {t('dashboard.actions.rejectInsurance')}
                    </Button>
                  </div>
                </div>
              );
            })()}
          </div>
          <div className="md:col-span-2 space-y-2 border-t border-border pt-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('dashboard.labels.bankDetailsReview')}</p>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={getAdminBankDetailsBadgeClass(selectedAgency.bankDetailsStatus)}>
                {getAdminBankDetailsBadgeLabel(selectedAgency.bankDetailsStatus, t)}
              </Badge>
              {selectedAgency.bankDetailsVerifiedAt && (
                <span className="text-muted-foreground text-xs">
                  {t('dashboard.labels.bankDetailsVerifiedAt')}: {new Date(selectedAgency.bankDetailsVerifiedAt).toLocaleDateString()}
                </span>
              )}
            </div>
            {bankDetailsBlock}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-muted-foreground">
              <p>
                {t('dashboard.labels.bankHolderName')}: <span className="text-foreground font-medium">{selectedAgency.bankAccountHolderName || t('dashboard.labels.na')}</span>
                {holderMatches === false && (
                  <span className="text-danger font-medium"> — {t('dashboard.labels.bankHolderMismatch')}</span>
                )}
              </p>
              <p>
                {t('dashboard.labels.bankAttestation')}:{' '}
                {selectedAgency.bankAttestationUrl ? (
                  <a
                    href={selectedAgency.bankAttestationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground font-medium underline"
                  >
                    {t('dashboard.actions.viewAttestation')}
                  </a>
                ) : (
                  <span className="text-foreground font-medium">{t('dashboard.labels.na')}</span>
                )}
              </p>
            </div>
            {selectedAgency.bankDetailsRejectionReason && (
              <p className="text-danger">{t('dashboard.labels.bankDetailsRejectionReason')}: {selectedAgency.bankDetailsRejectionReason}</p>
            )}
            {(() => {
              const canVerify = canVerifyBankDetails(selectedAgency.bankDetailsStatus, selectedAgency.pendingBankDetails);
              const canReject = canRejectBankDetails(selectedAgency.bankDetailsStatus, selectedAgency.pendingBankDetails);
              if (!canVerify && !canReject) return null;
              const overrideRequired = holderMatches === false;
              return (
                <div className="space-y-3 pt-2">
                  {overrideRequired && (
                    <div className="space-y-1">
                      <label htmlFor="bank-override-reason" className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t('dashboard.labels.overrideReason')}
                      </label>
                      <input
                        id="bank-override-reason"
                        type="text"
                        value={bankOverrideReason}
                        onChange={(event) => setBankOverrideReason(event.target.value)}
                        placeholder={t('dashboard.labels.overrideReasonPlaceholder')}
                        className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sunset-orange/20"
                      />
                    </div>
                  )}
                  <div className="space-y-1">
                    <label htmlFor="bank-rejection-reason" className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {t('dashboard.labels.rejectionReasonLabel')}
                    </label>
                    <input
                      id="bank-rejection-reason"
                      type="text"
                      value={bankRejectionReason}
                      onChange={(event) => setBankRejectionReason(event.target.value)}
                      placeholder={t('dashboard.labels.rejectionReasonPlaceholder')}
                      className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sunset-orange/20"
                    />
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      className="bg-success text-success-foreground hover:bg-success/90 border-none"
                      onClick={() => onVerifyBankDetails(selectedAgency.id, VerificationStatus.Verified, {
                        overrideReason: overrideRequired ? bankOverrideReason.trim() : undefined,
                      })}
                      disabled={!canVerify || isVerifyingBankDetails || (overrideRequired && !bankOverrideReason.trim())}
                    >
                      <CheckCircle2 className="h-4 w-4 ms-2" />
                      {t('dashboard.actions.verifyBankDetails')}
                    </Button>
                    <Button
                      className="bg-danger/10 text-danger hover:bg-danger/15 border-none"
                      onClick={() => onVerifyBankDetails(selectedAgency.id, VerificationStatus.Rejected, {
                        reason: bankRejectionReason.trim(),
                      })}
                      disabled={!canReject || isVerifyingBankDetails || !bankRejectionReason.trim()}
                    >
                      <XCircle className="h-4 w-4 ms-2" />
                      {t('dashboard.actions.rejectBankDetails')}
                    </Button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
        {agencyFeedback && (
          <div className={`text-sm font-medium ${agencyFeedback.type === 'success' ? 'text-success' : 'text-danger'}`}>
            {agencyFeedback.message}
          </div>
        )}
        {(() => {
          const canApprove = canApproveAgency(selectedAgency.verificationStatus);
          const canReject = canRejectAgency(selectedAgency.verificationStatus);
          return (
        <div className="flex flex-wrap gap-3">
          <Button
            className="bg-success text-success-foreground hover:bg-success/90 border-none"
            onClick={() => onVerify(selectedAgency.id, VerificationStatus.Verified)}
            disabled={!canApprove || isVerifying}
          >
            <CheckCircle2 className="h-4 w-4 ms-2" />
            {t('dashboard.actions.approveAgency')}
          </Button>
          <Button
            className="bg-danger/10 text-danger hover:bg-danger/15 border-none"
            onClick={() => onVerify(selectedAgency.id, VerificationStatus.Rejected)}
            disabled={!canReject || isVerifying}
          >
            <XCircle className="h-4 w-4 ms-2" />
            {t('dashboard.actions.rejectAgency')}
          </Button>
        </div>
          );
        })()}
      </CardContent>
    </Card>
  </div>
  );
}
