'use client';

import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle, Input, Button, Label } from '@ouiboo/ui';
import { Mail, Palette, Save, Shield, User } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { CurrencySelector } from '@/components/CurrencySelector';
import { useAuth } from '@/components/AuthContext';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

type ProfileFormValues = {
  name: string;
  avatar: string;
};

type UpdateProfilePayload = {
  name?: string;
  avatar?: string;
};

type UpdateProfileResponse = {
  message?: string;
};

export default function ProfilePage() {
  const { t } = useTranslation();
  const { user, refetch } = useAuth();
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const { register, handleSubmit, reset, formState: { isDirty } } = useForm<ProfileFormValues>({
    defaultValues: {
      name: user?.name || '',
      avatar: user?.avatar || '',
    },
  });

  useEffect(() => {
    reset({
      name: user?.name || '',
      avatar: user?.avatar || '',
    });
  }, [reset, user?.avatar, user?.name]);

  const updateProfileMutation = useMutation<UpdateProfileResponse, Error, UpdateProfilePayload>({
    mutationFn: async (payload) => {
      const response = await apiClient.patch('/users/me', payload);
      return response.data;
    },
    onSuccess: async () => {
      await refetch();
      setFeedback({
        type: 'success',
        message: t('profilePage.updateSuccess'),
      });
    },
    onError: (error) => {
      setFeedback({
        type: 'error',
        message: error.message || t('profilePage.updateError'),
      });
    },
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-background pt-24 pb-20 transition-colors duration-300">
        <div className="max-w-3xl mx-auto px-6">
          <Card className="rounded-3xl border border-dashed border-border/60 bg-card/80 p-10 text-center">
            <CardTitle className="text-2xl font-black text-foreground font-display">{t('profilePage.signedOutTitle')}</CardTitle>
            <p className="mt-4 text-sm text-muted-foreground">
              {t('profilePage.signedOutBody')}
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button asChild>
                <Link href="/login">{t('profilePage.signIn')}</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/signup">{t('profilePage.createAccount')}</Link>
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const onSubmit = (values: ProfileFormValues) => {
    setFeedback(null);
    updateProfileMutation.mutate({
      name: values.name.trim() || undefined,
      avatar: values.avatar.trim() || undefined,
    });
  };

  return (
    <div className="min-h-screen bg-background pt-24 pb-20 transition-colors duration-300">
      <div className="max-w-4xl mx-auto px-6 space-y-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-5xl font-black text-foreground font-display tracking-tight">{t('profilePage.title')}</h1>
            <p className="mt-2 text-muted-foreground">{t('profilePage.subtitle')}</p>
          </div>
          <div className="h-1 w-24 bg-sunset-orange rounded-full shrink-0" />
        </div>

        <Card className="border-none shadow-2xl shadow-deep-blue/5 dark:shadow-none dark:ring-1 dark:ring-border rounded-4xl overflow-hidden bg-card">
          <CardHeader className="p-10 pb-0">
            <CardTitle className="text-2xl font-black text-foreground font-display flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sunset-orange/10 flex items-center justify-center">
                <User className="h-5 w-5 text-sunset-orange" />
              </div>
              {t('profilePage.personalInformation')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-10 space-y-8">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-deep-blue text-white flex items-center justify-center text-2xl font-black overflow-hidden">
                {user.avatar ? (
                  <div
                    aria-label={user.name || t('profilePage.avatarFallback')}
                    className="h-full w-full bg-cover bg-center"
                    style={{ backgroundImage: `url("${user.avatar}")` }}
                  />
                ) : (
                  user.name?.[0]?.toUpperCase() || <User className="h-6 w-6" />
                )}
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">{user.name || t('profilePage.profileFallback')}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
            </div>

            <form className="space-y-8" onSubmit={handleSubmit(onSubmit)}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <Label htmlFor="profile-name" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ms-1">{t('profilePage.fullName')}</Label>
                  <div className="relative group">
                    <User className="absolute start-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors" />
                    <Input
                      id="profile-name"
                      {...register('name')}
                      className="h-14 ps-12 bg-muted/50 dark:bg-card border-none rounded-2xl font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="profile-role" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ms-1">{t('profilePage.accountRole')}</Label>
                  <div className="relative group">
                    <Shield className="absolute start-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors" />
                    <Input id="profile-role" value={t('profilePage.travelerRole')} className="h-14 ps-12 bg-muted/50 dark:bg-card border-none rounded-2xl font-bold cursor-not-allowed opacity-70" disabled />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="profile-email" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ms-1">{t('profilePage.emailAddress')}</Label>
                <div className="relative group">
                  <Mail className="absolute start-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors" />
                  <Input id="profile-email" value={user.email} className="h-14 ps-12 bg-muted/50 dark:bg-card border-none rounded-2xl font-bold cursor-not-allowed opacity-70" disabled />
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="profile-avatar" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ms-1">{t('profilePage.avatarUrl')}</Label>
                <div className="relative group">
                  <Palette className="absolute start-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors" />
                  <Input
                    id="profile-avatar"
                    {...register('avatar')}
                    placeholder={t('profilePage.avatarPlaceholder')}
                    className="h-14 ps-12 bg-muted/50 dark:bg-card border-none rounded-2xl font-bold"
                  />
                </div>
                <p className="text-xs text-muted-foreground">{t('profilePage.avatarHelp')}</p>
              </div>

              {feedback && (
                <div role={feedback.type === 'error' ? 'alert' : 'status'} aria-live="polite" className={`rounded-2xl px-4 py-3 text-sm font-semibold ${feedback.type === 'success' ? 'bg-success/10 text-success' : 'bg-rose-50 text-rose-700'}`}>
                  {feedback.message}
                </div>
              )}

              <div className="pt-8 border-t border-border/50 flex justify-end">
                <Button
                  type="submit"
                  disabled={updateProfileMutation.isPending || !isDirty}
                  className="h-14 px-8 bg-sunset-orange hover:bg-orange-600 text-white font-black rounded-2xl border-none active:scale-95 transition-all text-sm uppercase tracking-widest"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updateProfileMutation.isPending ? t('profilePage.saving') : t('profilePage.save')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="border-none shadow-2xl shadow-deep-blue/5 dark:shadow-none dark:ring-1 dark:ring-border rounded-4xl overflow-hidden bg-card">
          <CardContent className="p-10 flex flex-wrap items-center justify-between gap-6">
            <div>
              <p className="text-lg font-black text-foreground font-display">{t('profilePage.displayCurrency')}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('profilePage.displayCurrencyHelp')}
              </p>
            </div>
            <CurrencySelector className="h-12 px-4 bg-muted/50 dark:bg-card rounded-2xl" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

