'use client';

import React from 'react';
import { apiClient } from '@/lib/api-client';
import Link from 'next/link';
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
import {
  User,
  ShieldCheck,
  Bell,
  Sun,
  Moon,
  Save,
  Lock
} from 'lucide-react';
import { useAuth } from '@/components/AuthContext';
import { useTheme } from 'next-themes';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';

type SettingsFormValues = {
  bankDetails: string;
  bio: string;
  companyName: string;
  email: string;
  name: string;
};

type SaveFeedback = { type: 'success' | 'error'; text: string } | null;

export default function SettingsPage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { t, i18n } = useTranslation();

  const { register, handleSubmit, reset } = useForm<SettingsFormValues>({
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      companyName: user?.agencyProfile?.companyName || '',
      bio: user?.agencyProfile?.bio || '',
      bankDetails: user?.agencyProfile?.bankDetails || '',
    }
  });

  const [isSaving, setIsSaving] = React.useState(false);
  const [feedback, setFeedback] = React.useState<SaveFeedback>(null);

  const onSubmit = async (data: SettingsFormValues) => {
    try {
      setIsSaving(true);
      setFeedback(null);
      await Promise.all([
        apiClient.patch('/users/me', { name: data.name }),
        apiClient.patch('/agency/profile', {
          companyName: data.companyName,
          bio: data.bio,
          bankDetails: data.bankDetails
        }),
      ]);
      setFeedback({ type: 'success', text: t('settings.updateSuccess') });
      reset(data);
    } catch (error) {
      console.error('Failed to update settings:', error);
      setFeedback({ type: 'error', text: t('settings.updateError') });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-foreground">{t('settings.title')}</h1>
        <p className="text-muted-foreground mt-1">{t('settings.subtitle')}</p>
        {feedback && (
          <div
            role="status"
            className={`mt-4 rounded-lg border px-3 py-2 text-sm ${
              feedback.type === 'success'
                ? 'border-success/30 bg-success/10 text-success'
                : 'border-danger/30 bg-danger/10 text-danger'
            }`}
          >
            {feedback.text}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Sidebar Navigation for Settings */}
        <div className="space-y-1">
          <Link href="/dashboard/settings" className="w-full flex items-center gap-3 px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-lg shadow-md">
            <User className="h-4 w-4" /> {t('settings.tabProfile')}
          </Link>
          <Link href="/dashboard/onboarding" className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-lg">
            <ShieldCheck className="h-4 w-4" /> {t('settings.tabCompliance')}
          </Link>
          <Link href="/dashboard/settings/notifications" className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-lg">
            <Bell className="h-4 w-4" /> {t('settings.tabNotifications')}
          </Link>
          <div className="rounded-lg border border-border bg-muted/50 px-4 py-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2 font-semibold text-foreground">
              <Lock className="h-4 w-4" /> {t('settings.tabSecurity')}
            </div>
            <p className="mt-2">
              {t('settings.securityHint')}
            </p>
          </div>
        </div>

        {/* Content Area */}
        <div className="md:col-span-3 space-y-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Card className="border border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl">{t('settings.profileTitle')}</CardTitle>
                <CardDescription>{t('settings.profileSubtitle')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="settings-name">{t('settings.fullName')}</Label>
                    <Input id="settings-name" {...register('name')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="settings-email">{t('settings.emailAddress')}</Label>
                    <Input id="settings-email" {...register('email')} disabled className="bg-muted opacity-60" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-company">{t('settings.agencyName')}</Label>
                  <Input id="settings-company" {...register('companyName')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-bio">{t('settings.shortBio')}</Label>
                  <Textarea id="settings-bio" {...register('bio')} placeholder={t('settings.bioPlaceholder')} />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl">{t('settings.paymentTitle')}</CardTitle>
                <CardDescription>{t('settings.paymentSubtitle')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="settings-bank">{t('settings.paymentInstructions')}</Label>
                    <Textarea
                      id="settings-bank"
                      {...register('bankDetails')}
                      placeholder={t('settings.paymentInstructionsPlaceholder')}
                      className="h-32"
                    />
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{t('settings.paymentDisclaimer')}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl">{t('settings.appearanceTitle')}</CardTitle>
                <CardDescription>{t('settings.appearanceSubtitle')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">{t('settings.themeMode')}</p>
                    <p className="text-xs text-muted-foreground">{t('settings.themeDescription')}</p>
                  </div>
                  <div className="flex items-center p-1 bg-muted rounded-lg">
                    <button
                      type="button"
                      aria-label={t('settings.themeLight')}
                      aria-pressed={theme === 'light'}
                      onClick={() => setTheme('light')}
                      className={`p-2 rounded-md ${theme === 'light' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'}`}
                    >
                      <Sun className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={t('settings.themeDark')}
                      aria-pressed={theme === 'dark'}
                      onClick={() => setTheme('dark')}
                      className={`p-2 rounded-md ${theme === 'dark' ? 'bg-primary shadow-sm text-primary-foreground' : 'text-muted-foreground'}`}
                    >
                      <Moon className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">{t('settings.displayLanguage')}</p>
                    <p className="text-xs text-muted-foreground">{t('settings.languageDescription')}</p>
                  </div>
                  <select
                    value={i18n.language}
                    aria-label={t('settings.displayLanguage')}
                    onChange={(e) => i18n.changeLanguage(e.target.value)}
                    className="bg-muted text-foreground border border-border rounded-lg text-sm font-medium px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="en">{t('settings.langEn')}</option>
                    <option value="fr">{t('settings.langFr')}</option>
                    <option value="ar">{t('settings.langAr')}</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
              <Button variant="outline" type="button" onClick={() => { reset(); setFeedback(null); }}>{t('settings.discardChanges')}</Button>
              <Button type="submit" disabled={isSaving} className="bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-2">
                {isSaving ? t('settings.saving') : <><Save className="h-4 w-4" /> {t('settings.saveChanges')}</>}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
