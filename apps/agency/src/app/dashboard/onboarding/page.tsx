'use client';

import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { useForm } from 'react-hook-form';
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

/** #371: a VERIFIED licence whose expiry date has passed reads as EXPIRED. */
const effectiveLicenceStatus = (profile: { travelLicenceStatus?: string; licenceExpiry?: string } | undefined): string => {
  const status = profile?.travelLicenceStatus || 'NOT_SUBMITTED';
  if (status === 'VERIFIED' && profile?.licenceExpiry && new Date(profile.licenceExpiry).getTime() <= Date.now()) {
    return 'EXPIRED';
  }
  return status;
};

export default function OnboardingPage() {
  const { user, refetch } = useAuth();
  const { t } = useTranslation();
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
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
      reset(profileToFormValues(user.agencyProfile));
    }
  }, [user, reset]);

  const profileMutation = useMutation({
    mutationFn: async (data: AgencyOnboardingValues) => {
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
    });
  };

  if (!mounted) return null;

  const isVerified = user?.agencyProfile?.verificationStatus === VerificationStatus.Verified;
  const licenceStatus = effectiveLicenceStatus(user?.agencyProfile);
  const licenceLocked = licenceStatus === 'VERIFIED';
  const canSubmit = !isVerified || !licenceLocked;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
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
          isVerified
            ? "bg-success/10 text-success border-success/30"
            : "bg-warning/10 text-warning border-warning/30"
        )}>
          {isVerified ? <CheckCircle2 className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
          <span className="text-sm font-bold uppercase tracking-wide">
            {isVerified ? t('onboarding.status.verified') : t('onboarding.status.pending')}
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
            <p className="text-[10px] text-muted-foreground italic font-medium">{t('onboarding.licence.note')}</p>
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
                reset(profileToFormValues(user?.agencyProfile));
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
