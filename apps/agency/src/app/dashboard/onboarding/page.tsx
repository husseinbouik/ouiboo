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
import { ShieldCheck, Building2, CreditCard, FileText, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/components/AuthContext';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useTranslation } from 'react-i18next';
import { cn } from '@ouiboo/ui/utils';
import { VerificationStatus } from '@ouiboo/types';

type AgencyOnboardingValues = {
  bio?: string;
  companyName: string;
  ice: string;
  patente: string;
  rib: string;
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
    }
  });

  useEffect(() => {
    if (user?.agencyProfile) {
      reset({
        companyName: user.agencyProfile.companyName || '',
        ice: user.agencyProfile.ice?.startsWith('PENDING_') ? '' : (user.agencyProfile.ice || ''),
        patente: user.agencyProfile.patente === 'PENDING' ? '' : (user.agencyProfile.patente || ''),
        rib: user.agencyProfile.rib === 'PENDING' ? '' : (user.agencyProfile.rib || ''),
        bio: user.agencyProfile.bio || '',
      });
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
    profileMutation.mutate(data);
  };

  if (!mounted) return null;

  const isVerified = user?.agencyProfile?.verificationStatus === VerificationStatus.Verified;

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

        {!isVerified && (
          <div className="flex justify-end gap-4 mt-8">
            <Button
              variant="outline"
              type="button"
              className="h-12 px-8"
              onClick={() => {
                reset({
                  companyName: user?.agencyProfile?.companyName || '',
                  ice: user?.agencyProfile?.ice?.startsWith('PENDING_') ? '' : (user?.agencyProfile?.ice || ''),
                  patente: user?.agencyProfile?.patente === 'PENDING' ? '' : (user?.agencyProfile?.patente || ''),
                  rib: user?.agencyProfile?.rib === 'PENDING' ? '' : (user?.agencyProfile?.rib || ''),
                  bio: user?.agencyProfile?.bio || '',
                });
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
