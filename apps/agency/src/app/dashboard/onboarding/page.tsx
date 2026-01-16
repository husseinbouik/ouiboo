'use client';

import React, { useEffect, useState } from 'react';
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

export default function OnboardingPage() {
  const { user, refetch } = useAuth();
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
    mutationFn: async (data: any) => {
      const response = await apiClient.post('/users/agency-profile', data);
      return response.data;
    },
    onSuccess: () => {
      alert(t('common.success', 'Compliance documents submitted for verification!'));
      refetch();
    },
    onError: (err: any) => {
      console.error('Update failed:', err);
      alert(err?.response?.data?.message || t('common.error', 'Update failed. Please check your data.'));
    }
  });

  const onSubmit = (data: any) => {
    profileMutation.mutate(data);
  };

  if (!mounted) return null;

  const isVerified = user?.agencyProfile?.verificationStatus === VerificationStatus.Verified;
  const isPending = user?.agencyProfile?.verificationStatus === VerificationStatus.Pending || !user?.agencyProfile;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-deep-blue dark:text-gray-100 italic">
            {t('onboarding.title', 'Compliance & Onboarding')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {t('onboarding.subtitle', 'Complete your profile to start publishing trips.')}
          </p>
        </div>
        <div className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-xl border transition-colors",
          isVerified 
            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/10 dark:text-emerald-400 dark:border-emerald-900/20" 
            : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/10 dark:text-amber-400 dark:border-amber-900/20"
        )}>
          {isVerified ? <CheckCircle2 className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
          <span className="text-sm font-bold uppercase tracking-wide">
            {isVerified ? t('onboarding.status.verified', "Account Verified") : t('onboarding.status.pending', "Verification Pending")}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card className="border-none shadow-sm dark:bg-slate-900 border dark:border-slate-800">
          <CardHeader>
            <div className="flex items-center gap-2 text-deep-blue dark:text-blue-400 mb-2 font-bold">
              <Building2 className="h-5 w-5" />
              <CardTitle>{t('onboarding.sections.agency', 'Agency Details')}</CardTitle>
            </div>
            <CardDescription className="dark:text-gray-400">Basic information about your travel agency.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName" className="font-semibold dark:text-gray-300">Legal Company Name</Label>
              <Input 
                id="companyName" 
                placeholder="e.g. Atlas Voyages SARL" 
                {...register('companyName')}
                className={cn("h-12 dark:bg-slate-800 dark:border-slate-700", errors.companyName && "border-red-500")}
                disabled={isVerified}
              />
              {errors.companyName && <p className="text-xs text-red-500 font-medium">{errors.companyName.message as string}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="bio" className="font-semibold dark:text-gray-300">Agency Bio</Label>
              <Textarea 
                id="bio" 
                placeholder="Tell travelers about your agency's mission and expertise..." 
                {...register('bio')}
                className="min-h-[120px] dark:bg-slate-800 dark:border-slate-700"
                disabled={isVerified}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm dark:bg-slate-900 border dark:border-slate-800">
          <CardHeader>
            <div className="flex items-center gap-2 text-deep-blue dark:text-blue-400 mb-2 font-bold">
              <FileText className="h-5 w-5" />
              <CardTitle>{t('onboarding.sections.legal', 'Legal Documents')}</CardTitle>
            </div>
            <CardDescription className="dark:text-gray-400">Required documents for B2B compliance in Morocco.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="ice" className="font-semibold dark:text-gray-300">ICE (15 digits)</Label>
              <Input 
                id="ice" 
                placeholder="000000000000000" 
                {...register('ice')}
                className={cn("h-12 dark:bg-slate-800 dark:border-slate-700", errors.ice && "border-red-500")}
                disabled={isVerified}
              />
              {errors.ice && <p className="text-xs text-red-500 font-medium">{errors.ice.message as string}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="patente" className="font-semibold dark:text-gray-300">Patente Number</Label>
              <Input 
                id="patente" 
                placeholder="Enter your patente number" 
                {...register('patente')}
                className={cn("h-12 dark:bg-slate-800 dark:border-slate-700", errors.patente && "border-red-500")}
                disabled={isVerified}
              />
              {errors.patente && <p className="text-xs text-red-500 font-medium">{errors.patente.message as string}</p>}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm dark:bg-slate-900 border dark:border-slate-800">
          <CardHeader>
            <div className="flex items-center gap-2 text-deep-blue dark:text-blue-400 mb-2 font-bold">
              <CreditCard className="h-5 w-5" />
              <CardTitle>{t('onboarding.sections.payment', 'Payment Details')}</CardTitle>
            </div>
            <CardDescription className="dark:text-gray-400">Your bank account details for payouts.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="rib" className="font-semibold dark:text-gray-300">RIB (24 digits)</Label>
              <Input 
                id="rib" 
                placeholder="Enter your 24-digit RIB" 
                {...register('rib')}
                className={cn("h-12 dark:bg-slate-800 dark:border-slate-700", errors.rib && "border-red-500")}
                disabled={isVerified}
              />
              {errors.rib && <p className="text-xs text-red-500 font-medium">{errors.rib.message as string}</p>}
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2 italic font-medium">Note: Payouts will be sent to this account after admin approval.</p>
            </div>
          </CardContent>
        </Card>

        {!isVerified && (
          <div className="flex justify-end gap-4 mt-8">
            <Button variant="outline" type="button" className="h-12 px-8 dark:border-slate-700 dark:text-gray-300">
              {t('common.saveDraft', 'Save Draft')}
            </Button>
            <Button type="submit" disabled={profileMutation.isPending} className="h-12 px-10 bg-sunset-orange hover:bg-orange-600 text-white border-none shadow-lg shadow-orange-900/20 font-bold">
              {profileMutation.isPending ? t('common.submitting', "Submitting...") : t('onboarding.submit', "Submit for Verification")}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
