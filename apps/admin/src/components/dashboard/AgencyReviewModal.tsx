'use client';

import React from 'react';
import Image from 'next/image';
import { XCircle, CheckCircle2 } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle, Badge } from '@ouiboo/ui';
import { LicenceStatus, VerificationStatus, type LicenceStatusType, type VerificationStatusType } from '@ouiboo/types';
import type { AdminAgency, FeedbackState } from './types';
import { getAdminVerificationBadgeClass, getAdminVerificationBadgeLabel, getAdminSubscriptionBadgeLabel, getAdminLicenceBadgeClass, getAdminLicenceBadgeLabel, getEffectiveLicenceStatus } from '../../app/status-mappers';
import { canApproveAgency, canRejectAgency, canVerifyLicence, canRejectLicence } from './formatters';

type TFn = (key: string, opts?: Record<string, unknown>) => string;

type AgencyReviewModalProps = {
  t: TFn;
  agency: AdminAgency;
  agencyFeedback: FeedbackState | null;
  isVerifying: boolean;
  isVerifyingLicence: boolean;
  onClose: () => void;
  onVerify: (id: string, status: VerificationStatusType) => void;
  onVerifyLicence: (id: string, status: LicenceStatusType) => void;
};

export default function AgencyReviewModal({
  t,
  agency: selectedAgency,
  agencyFeedback,
  isVerifying,
  isVerifyingLicence,
  onClose,
  onVerify,
  onVerifyLicence,
}: AgencyReviewModalProps) {
  const licenceStatus = getEffectiveLicenceStatus(selectedAgency);
  return (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
    <Card className="max-w-2xl w-full border-none shadow-2xl rounded-3xl overflow-hidden">
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
              <p>{t('dashboard.labels.licenceExpiry')}: <span className="text-foreground font-medium">{selectedAgency.licenceExpiry ? new Date(selectedAgency.licenceExpiry).toLocaleDateString() : t('dashboard.labels.na')}</span></p>
              <p>{t('dashboard.labels.licenceVerifiedAt')}: <span className="text-foreground font-medium">{selectedAgency.licenceVerifiedAt ? new Date(selectedAgency.licenceVerifiedAt).toLocaleDateString() : t('dashboard.labels.na')}</span></p>
            </div>
            {selectedAgency.licenceRejectionReason && (
              <p className="text-danger">{t('dashboard.labels.licenceRejectionReason')}: {selectedAgency.licenceRejectionReason}</p>
            )}
            {(() => {
              const canVerify = canVerifyLicence(licenceStatus);
              const canReject = canRejectLicence(licenceStatus);
              if (!canVerify && !canReject) return null;
              return (
                <div className="flex flex-wrap gap-3 pt-2">
                  <Button
                    className="bg-success text-success-foreground hover:bg-success/90 border-none"
                    onClick={() => onVerifyLicence(selectedAgency.id, LicenceStatus.Verified)}
                    disabled={!canVerify || isVerifyingLicence}
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
