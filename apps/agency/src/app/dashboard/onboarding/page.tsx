'use client';

import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AgencyProfileSchema } from '@ouiboo/schemas';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Input,
  Label,
  Textarea
} from '@ouiboo/ui';
import { ShieldCheck, Building2, CreditCard, FileText, CheckCircle2, Award, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/components/AuthContext';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useTranslation } from 'react-i18next';
import { cn } from '@ouiboo/ui/utils';
import { VerificationStatus, type TravelLicenceType } from '@ouiboo/types';
import { PrivateDocumentUpload } from '@/components/PrivateDocumentUpload';
import { VerificationPausedBanner } from '@/components/VerificationPausedBanner';
import {
  activationBlockArtefactKey,
  effectiveInsuranceStatus,
  effectiveLicenceStatus,
  getAgencyActivationState,
} from '@/lib/agency-verification';

type AgencyOnboardingValues = {
  bio?: string;
  companyName: string;
  ice: string;
  patente: string;
  rib: string;
  // #371: legal identity + Law 11-16 travel licence
  legalName?: string;
  rc?: string;
  taxId?: string;
  legalRepresentative?: string;
  businessAddress?: string;
  travelLicenceType?: TravelLicenceType;
  travelLicenceNumber?: string;
  licenceExpiry?: string;
};

/** Form values plus the #415 document/insurance payload built from local state. */
type AgencyProfileSubmitPayload = AgencyOnboardingValues & {
  licenceDocumentKey?: string;
  licenceDocumentName?: string;
  insuranceInsurer?: string;
  insurancePolicyNumber?: string;
  insuranceInsuredName?: string;
  insuranceValidFrom?: string;
  insuranceExpiry?: string;
  insuranceCoverageLimit?: number;
  insuranceCertificateKey?: string;
};

type InsuranceFormState = {
  insurer: string;
  policyNumber: string;
  insuredName: string;
  validFrom: string;
  expiry: string;
  coverageLimit: string;
};

const emptyInsurance: InsuranceFormState = {
  insurer: '',
  policyNumber: '',
  insuredName: '',
  validFrom: '',
  expiry: '',
  coverageLimit: '',
};

const insuranceToFormState = (profile: AgencyProfileLike): InsuranceFormState => ({
  insurer: profile?.insuranceInsurer || '',
  policyNumber: profile?.insurancePolicyNumber || '',
  insuredName: profile?.insuranceInsuredName || '',
  validFrom: profile?.insuranceValidFrom ? profile.insuranceValidFrom.slice(0, 10) : '',
  expiry: profile?.insuranceExpiry ? profile.insuranceExpiry.slice(0, 10) : '',
  coverageLimit:
    profile?.insuranceCoverageLimit != null ? String(profile.insuranceCoverageLimit) : '',
});

const documentNameFromKey = (key: string) => key.split('/').pop() || key;

type AgencyProfileLike = {
  companyName?: string;
  ice?: string;
  patente?: string;
  rib?: string;
  bio?: string;
  legalName?: string | null;
  rc?: string | null;
  taxId?: string | null;
  legalRepresentative?: string | null;
  businessAddress?: string | null;
  travelLicenceType?: string | null;
  travelLicenceNumber?: string | null;
  licenceExpiry?: string | null;
  // #415: licence document, RC insurance artefact, expiry-sweep pause marker
  licenceDocumentKey?: string | null;
  licenceDocumentName?: string | null;
  insuranceStatus?: string | null;
  insuranceInsurer?: string | null;
  insurancePolicyNumber?: string | null;
  insuranceInsuredName?: string | null;
  insuranceValidFrom?: string | null;
  insuranceExpiry?: string | null;
  insuranceCoverageLimit?: string | number | null;
  insuranceCertificateKey?: string | null;
  insuranceRejectionReason?: string | null;
  verificationPausedAt?: string | null;
} | undefined;

const profileToFormValues = (profile: AgencyProfileLike): AgencyOnboardingValues => ({
  companyName: profile?.companyName || '',
  ice: profile?.ice?.startsWith('PENDING_') ? '' : (profile?.ice || ''),
  patente: profile?.patente === 'PENDING' ? '' : (profile?.patente || ''),
  rib: profile?.rib === 'PENDING' ? '' : (profile?.rib || ''),
  bio: profile?.bio || '',
  legalName: profile?.legalName || '',
  rc: profile?.rc || '',
  taxId: profile?.taxId || '',
  legalRepresentative: profile?.legalRepresentative || '',
  businessAddress: profile?.businessAddress || '',
  travelLicenceType: (profile?.travelLicenceType as TravelLicenceType | null) || undefined,
  travelLicenceNumber: profile?.travelLicenceNumber || '',
  licenceExpiry: profile?.licenceExpiry ? profile.licenceExpiry.slice(0, 10) : '',
});

export default function OnboardingPage() {
  const { user, refetch } = useAuth();
  const { t } = useTranslation();
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  // #415: documents and insurance live outside the zod-validated form —
  // AgencyProfileSchema does not carry them, so they are kept in local
  // state and merged into the submit payload (the API validates the
  // document keys and derives the review statuses server-side).
  const [licenceDocument, setLicenceDocument] = useState<{ key: string; name: string } | null>(null);
  const [insuranceCertificate, setInsuranceCertificate] = useState<{ key: string; name: string } | null>(null);
  const [insurance, setInsurance] = useState<InsuranceFormState>(emptyInsurance);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(AgencyProfileSchema.omit({ id: true, userId: true, verificationStatus: true, logo: true })),
    defaultValues: {
      companyName: '',
      ice: '',
      patente: '',
      rib: '',
      bio: '',
      legalName: '',
      rc: '',
      taxId: '',
      legalRepresentative: '',
      businessAddress: '',
      travelLicenceType: undefined,
      travelLicenceNumber: '',
      licenceExpiry: '',
    }
  });

  useEffect(() => {
    if (user?.agencyProfile) {
      const profile = user.agencyProfile;
      reset(profileToFormValues(profile));
      setLicenceDocument(
        profile.licenceDocumentKey
          ? {
              key: profile.licenceDocumentKey,
              name: profile.licenceDocumentName || documentNameFromKey(profile.licenceDocumentKey),
            }
          : null,
      );
      setInsuranceCertificate(
        profile.insuranceCertificateKey
          ? {
              key: profile.insuranceCertificateKey,
              name: documentNameFromKey(profile.insuranceCertificateKey),
            }
          : null,
      );
      setInsurance(insuranceToFormState(profile));
    }
  }, [user, reset]);

  const profileMutation = useMutation({
    mutationFn: async (data: AgencyProfileSubmitPayload) => {
      const response = await apiClient.post('/users/agency-profile', data);
      return response.data;
    },
    onSuccess: () => {
      setFeedback({
        type: 'success',
        text: t('onboarding.success'),
      });
      refetch();
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      console.error('Update failed:', err);
      setFeedback({
        type: 'error',
        text: err?.response?.data?.message || t('onboarding.error'),
      });
    }
  });

  const onSubmit = (data: AgencyOnboardingValues) => {
    setFeedback(null);
    profileMutation.mutate({
      ...data,
      // Empty optional licence fields must not be sent as empty strings.
      travelLicenceType: data.travelLicenceType || undefined,
      travelLicenceNumber: data.travelLicenceNumber?.trim() || undefined,
      licenceExpiry: data.licenceExpiry ? new Date(data.licenceExpiry).toISOString() : undefined,
      // #415: the licence document makes the submission reviewable; the
      // API only moves it to PENDING_REVIEW when number + type + expiry
      // + document are all present.
      ...(licenceDocument
        ? { licenceDocumentKey: licenceDocument.key, licenceDocumentName: licenceDocument.name }
        : {}),
      // #415: RC insurance artefact — same completeness rule server-side
      // (insurer + policy number + insured name + expiry + certificate).
      insuranceInsurer: insurance.insurer.trim() || undefined,
      insurancePolicyNumber: insurance.policyNumber.trim() || undefined,
      insuranceInsuredName: insurance.insuredName.trim() || undefined,
      insuranceValidFrom: insurance.validFrom
        ? new Date(insurance.validFrom).toISOString()
        : undefined,
      insuranceExpiry: insurance.expiry ? new Date(insurance.expiry).toISOString() : undefined,
      insuranceCoverageLimit: insurance.coverageLimit.trim()
        ? Number(insurance.coverageLimit)
        : undefined,
      ...(insuranceCertificate ? { insuranceCertificateKey: insuranceCertificate.key } : {}),
    });
  };

  const licenceNumberValue = useWatch({ control, name: 'travelLicenceNumber' });
  const licenceExpiryValue = useWatch({ control, name: 'licenceExpiry' });

  if (!mounted) return null;

  const isVerified = user?.agencyProfile?.verificationStatus === VerificationStatus.Verified;
  // #415: the header badge reflects the full activation gate (identity +
  // licence + RC insurance) via the shared derivation — `isVerified`
  // above stays identity-only because it locks the identity form fields.
  const activation = getAgencyActivationState(user?.agencyProfile);
  const activationBlock = activation.block;
  let activationBadgeLabel = t('onboarding.status.pending');
  if (activation.fullyVerified) {
    activationBadgeLabel = t('onboarding.status.verified');
  } else if (activationBlock) {
    activationBadgeLabel = t('verification.incompleteDetail', {
      artefact: t(activationBlockArtefactKey(activationBlock)),
    });
  }
  const licenceStatus = effectiveLicenceStatus(user?.agencyProfile);
  const licenceLocked = licenceStatus === 'VERIFIED';
  const insuranceStatus = effectiveInsuranceStatus(user?.agencyProfile);
  const insuranceLocked = insuranceStatus === 'VERIFIED';
  const canSubmit = !isVerified || !licenceLocked || !insuranceLocked;
  // #415: soft completeness hints — the server keeps an incomplete
  // submission NOT_SUBMITTED, so warn here instead of failing silently.
  const licenceIncomplete = Boolean(
    (licenceNumberValue || licenceExpiryValue) && !licenceDocument,
  );
  const insuranceIncomplete = Boolean(
    (insurance.insurer || insurance.policyNumber || insurance.insuredName || insurance.expiry) &&
      !insuranceCertificate,
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      <VerificationPausedBanner showCta={false} />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground italic">
            {t('onboarding.title')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('onboarding.subtitle')}
          </p>
          {feedback && (
            <div
              role="status"
              className={cn(
                'mt-4 rounded-xl border px-4 py-3 text-sm font-medium',
                feedback.type === 'success'
                  ? 'border-success/30 bg-success/10 text-success'
                  : 'border-danger/30 bg-danger/10 text-danger',
              )}
            >
              {feedback.text}
            </div>
          )}
        </div>
        <div className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-xl border transition-colors",
          activation.fullyVerified
            ? "bg-success/10 text-success border-success/30"
            : "bg-warning/10 text-warning border-warning/30"
        )}>
          {activation.fullyVerified ? <CheckCircle2 className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
          <span className="text-sm font-bold uppercase tracking-wide">
            {activationBadgeLabel}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card className="border border-border bg-card shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2 text-primary mb-2 font-bold">
              <Building2 className="h-5 w-5" />
              <CardTitle>{t('onboarding.sections.agency')}</CardTitle>
            </div>
            <CardDescription>{t('onboarding.agencySectionSubtitle')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName" className="font-semibold">{t('onboarding.legalCompanyName')}</Label>
              <Input
                id="companyName"
                placeholder={t('onboarding.companyNamePlaceholder')}
                {...register('companyName')}
                className={cn("h-12", errors.companyName && "border-danger")}
                disabled={isVerified}
              />
              {errors.companyName && <p className="text-xs text-danger font-medium">{errors.companyName.message as string}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio" className="font-semibold">{t('onboarding.agencyBio')}</Label>
              <Textarea
                id="bio"
                placeholder={t('onboarding.agencyBioPlaceholder')}
                {...register('bio')}
                className="min-h-[120px]"
                disabled={isVerified}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2 text-primary mb-2 font-bold">
              <FileText className="h-5 w-5" />
              <CardTitle>{t('onboarding.sections.legal')}</CardTitle>
            </div>
            <CardDescription>{t('onboarding.documentsRequired')}</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="ice" className="font-semibold">{t('onboarding.iceLabel')}</Label>
              <Input
                id="ice"
                placeholder={t('onboarding.icePlaceholder')}
                {...register('ice')}
                className={cn("h-12", errors.ice && "border-danger")}
                disabled={isVerified}
              />
              {errors.ice && <p className="text-xs text-danger font-medium">{errors.ice.message as string}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="patente" className="font-semibold">{t('onboarding.patenteLabel')}</Label>
              <Input
                id="patente"
                placeholder={t('onboarding.patentePlaceholder')}
                {...register('patente')}
                className={cn("h-12", errors.patente && "border-danger")}
                disabled={isVerified}
              />
              {errors.patente && <p className="text-xs text-danger font-medium">{errors.patente.message as string}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="legalName" className="font-semibold">{t('onboarding.legalNameLabel')}</Label>
              <Input
                id="legalName"
                placeholder={t('onboarding.legalNamePlaceholder')}
                {...register('legalName')}
                className="h-12"
                disabled={isVerified}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rc" className="font-semibold">{t('onboarding.rcLabel')}</Label>
              <Input
                id="rc"
                placeholder={t('onboarding.rcPlaceholder')}
                {...register('rc')}
                className="h-12"
                disabled={isVerified}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="taxId" className="font-semibold">{t('onboarding.taxIdLabel')}</Label>
              <Input
                id="taxId"
                placeholder={t('onboarding.taxIdPlaceholder')}
                {...register('taxId')}
                className="h-12"
                disabled={isVerified}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="legalRepresentative" className="font-semibold">{t('onboarding.legalRepresentativeLabel')}</Label>
              <Input
                id="legalRepresentative"
                placeholder={t('onboarding.legalRepresentativePlaceholder')}
                {...register('legalRepresentative')}
                className="h-12"
                disabled={isVerified}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="businessAddress" className="font-semibold">{t('onboarding.businessAddressLabel')}</Label>
              <Input
                id="businessAddress"
                placeholder={t('onboarding.businessAddressPlaceholder')}
                {...register('businessAddress')}
                className="h-12"
                disabled={isVerified}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2 text-primary mb-2 font-bold">
              <Award className="h-5 w-5" />
              <CardTitle>{t('onboarding.sections.licence')}</CardTitle>
            </div>
            <CardDescription>{t('onboarding.licenceSectionSubtitle')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              role="status"
              className={cn(
                'rounded-xl border px-4 py-3 text-sm font-medium flex items-start gap-2',
                licenceStatus === 'VERIFIED' && 'border-success/30 bg-success/10 text-success',
                licenceStatus === 'PENDING_REVIEW' && 'border-warning/30 bg-warning/10 text-warning',
                (licenceStatus === 'REJECTED' || licenceStatus === 'EXPIRED') && 'border-danger/30 bg-danger/10 text-danger',
                licenceStatus === 'NOT_SUBMITTED' && 'border-border bg-muted/40 text-muted-foreground',
              )}
            >
              {licenceStatus === 'VERIFIED' || licenceStatus === 'PENDING_REVIEW'
                ? <ShieldCheck className="h-5 w-5 shrink-0" />
                : <AlertTriangle className="h-5 w-5 shrink-0" />}
              <span>
                {t(`onboarding.licence.status.${licenceStatus}`)}
                {licenceStatus === 'VERIFIED' && user?.agencyProfile?.licenceExpiry && (
                  <> — {t('onboarding.licence.expiresOn', { date: new Date(user.agencyProfile.licenceExpiry).toLocaleDateString() })}</>
                )}
                {licenceStatus === 'REJECTED' && user?.agencyProfile?.licenceRejectionReason && (
                  <> — {user.agencyProfile.licenceRejectionReason}</>
                )}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="travelLicenceType" className="font-semibold">{t('onboarding.licence.typeLabel')}</Label>
                <select
                  id="travelLicenceType"
                  {...register('travelLicenceType')}
                  className="h-12 w-full rounded-md border border-input bg-background px-3 text-sm"
                  disabled={licenceLocked}
                >
                  <option value="">{t('onboarding.licence.typePlaceholder')}</option>
                  <option value="ODV">{t('onboarding.licence.typeOdv')}</option>
                  <option value="DV">{t('onboarding.licence.typeDv')}</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="travelLicenceNumber" className="font-semibold">{t('onboarding.licence.numberLabel')}</Label>
                <Input
                  id="travelLicenceNumber"
                  placeholder={t('onboarding.licence.numberPlaceholder')}
                  {...register('travelLicenceNumber')}
                  className="h-12"
                  disabled={licenceLocked}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="licenceExpiry" className="font-semibold">{t('onboarding.licence.expiryLabel')}</Label>
                <Input
                  id="licenceExpiry"
                  type="date"
                  {...register('licenceExpiry')}
                  className="h-12"
                  disabled={licenceLocked}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-semibold">{t('onboarding.licence.documentLabel')}</Label>
              <PrivateDocumentUpload
                documentName={licenceDocument?.name}
                hasDocument={Boolean(licenceDocument)}
                disabled={licenceLocked}
                onUploaded={(key, name) => setLicenceDocument({ key, name })}
              />
              {licenceIncomplete && (
                <p className="text-xs text-warning font-medium">{t('onboarding.licence.documentRequired')}</p>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground italic font-medium">{t('onboarding.licence.note')}</p>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2 text-primary mb-2 font-bold">
              <ShieldCheck className="h-5 w-5" />
              <CardTitle>{t('onboarding.sections.insurance')}</CardTitle>
            </div>
            <CardDescription>{t('onboarding.insuranceSectionSubtitle')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              role="status"
              className={cn(
                'rounded-xl border px-4 py-3 text-sm font-medium flex items-start gap-2',
                insuranceStatus === 'VERIFIED' && 'border-success/30 bg-success/10 text-success',
                insuranceStatus === 'PENDING_REVIEW' && 'border-warning/30 bg-warning/10 text-warning',
                (insuranceStatus === 'REJECTED' || insuranceStatus === 'EXPIRED') && 'border-danger/30 bg-danger/10 text-danger',
                insuranceStatus === 'NOT_SUBMITTED' && 'border-border bg-muted/40 text-muted-foreground',
              )}
            >
              {insuranceStatus === 'VERIFIED' || insuranceStatus === 'PENDING_REVIEW'
                ? <ShieldCheck className="h-5 w-5 shrink-0" />
                : <AlertTriangle className="h-5 w-5 shrink-0" />}
              <span>
                {t(`onboarding.insurance.status.${insuranceStatus}`)}
                {insuranceStatus === 'VERIFIED' && user?.agencyProfile?.insuranceExpiry && (
                  <> — {t('onboarding.insurance.expiresOn', { date: new Date(user.agencyProfile.insuranceExpiry).toLocaleDateString() })}</>
                )}
                {insuranceStatus === 'REJECTED' && user?.agencyProfile?.insuranceRejectionReason && (
                  <> — {user.agencyProfile.insuranceRejectionReason}</>
                )}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="insuranceInsurer" className="font-semibold">{t('onboarding.insurance.insurerLabel')}</Label>
                <Input
                  id="insuranceInsurer"
                  placeholder={t('onboarding.insurance.insurerPlaceholder')}
                  value={insurance.insurer}
                  onChange={(e) => setInsurance({ ...insurance, insurer: e.target.value })}
                  className="h-12"
                  disabled={insuranceLocked}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="insurancePolicyNumber" className="font-semibold">{t('onboarding.insurance.policyNumberLabel')}</Label>
                <Input
                  id="insurancePolicyNumber"
                  placeholder={t('onboarding.insurance.policyNumberPlaceholder')}
                  value={insurance.policyNumber}
                  onChange={(e) => setInsurance({ ...insurance, policyNumber: e.target.value })}
                  className="h-12"
                  disabled={insuranceLocked}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="insuranceInsuredName" className="font-semibold">{t('onboarding.insurance.insuredNameLabel')}</Label>
                <Input
                  id="insuranceInsuredName"
                  placeholder={t('onboarding.insurance.insuredNamePlaceholder')}
                  value={insurance.insuredName}
                  onChange={(e) => setInsurance({ ...insurance, insuredName: e.target.value })}
                  className="h-12"
                  disabled={insuranceLocked}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="insuranceCoverageLimit" className="font-semibold">{t('onboarding.insurance.coverageLimitLabel')}</Label>
                <Input
                  id="insuranceCoverageLimit"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={t('onboarding.insurance.coverageLimitPlaceholder')}
                  value={insurance.coverageLimit}
                  onChange={(e) => setInsurance({ ...insurance, coverageLimit: e.target.value })}
                  className="h-12"
                  disabled={insuranceLocked}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="insuranceValidFrom" className="font-semibold">{t('onboarding.insurance.validFromLabel')}</Label>
                <Input
                  id="insuranceValidFrom"
                  type="date"
                  value={insurance.validFrom}
                  onChange={(e) => setInsurance({ ...insurance, validFrom: e.target.value })}
                  className="h-12"
                  disabled={insuranceLocked}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="insuranceExpiry" className="font-semibold">{t('onboarding.insurance.expiryLabel')}</Label>
                <Input
                  id="insuranceExpiry"
                  type="date"
                  value={insurance.expiry}
                  onChange={(e) => setInsurance({ ...insurance, expiry: e.target.value })}
                  className="h-12"
                  disabled={insuranceLocked}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-semibold">{t('onboarding.insurance.certificateLabel')}</Label>
              <PrivateDocumentUpload
                documentName={insuranceCertificate?.name}
                hasDocument={Boolean(insuranceCertificate)}
                disabled={insuranceLocked}
                onUploaded={(key, name) => setInsuranceCertificate({ key, name })}
              />
              {insuranceIncomplete && (
                <p className="text-xs text-warning font-medium">{t('onboarding.insurance.certificateRequired')}</p>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground italic font-medium">{t('onboarding.insurance.note')}</p>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2 text-primary mb-2 font-bold">
              <CreditCard className="h-5 w-5" />
              <CardTitle>{t('onboarding.sections.payment')}</CardTitle>
            </div>
            <CardDescription>{t('onboarding.paymentSectionSubtitle')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="rib" className="font-semibold">{t('onboarding.ribLabel')}</Label>
              <Input
                id="rib"
                placeholder={t('onboarding.ribPlaceholder')}
                {...register('rib')}
                className={cn("h-12", errors.rib && "border-danger")}
                disabled={isVerified}
              />
              {errors.rib && <p className="text-xs text-danger font-medium">{errors.rib.message as string}</p>}
              <p className="text-[10px] text-muted-foreground mt-2 italic font-medium">{t('onboarding.ribNote')}</p>
            </div>
          </CardContent>
        </Card>

        {canSubmit && (
          <div className="flex justify-end gap-4 mt-8">
            <Button
              variant="outline"
              type="button"
              className="h-12 px-8"
              onClick={() => {
                const profile = user?.agencyProfile;
                reset(profileToFormValues(profile));
                setLicenceDocument(
                  profile?.licenceDocumentKey
                    ? {
                        key: profile.licenceDocumentKey,
                        name:
                          profile.licenceDocumentName ||
                          documentNameFromKey(profile.licenceDocumentKey),
                      }
                    : null,
                );
                setInsuranceCertificate(
                  profile?.insuranceCertificateKey
                    ? {
                        key: profile.insuranceCertificateKey,
                        name: documentNameFromKey(profile.insuranceCertificateKey),
                      }
                    : null,
                );
                setInsurance(insuranceToFormState(profile));
                setFeedback(null);
              }}
            >
              {t('common.discardChanges')}
            </Button>
            <Button type="submit" disabled={profileMutation.isPending} className="h-12 px-10 bg-accent hover:bg-accent/90 text-accent-foreground border-none shadow-lg shadow-accent/20 font-bold">
              {profileMutation.isPending ? t('common.submitting') : t('onboarding.submit')}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
