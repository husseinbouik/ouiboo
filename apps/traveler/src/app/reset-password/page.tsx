'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle, Lock } from 'lucide-react';
import { Button, Input } from '@ouiboo/ui';
import { useTranslation } from 'react-i18next';
import '../../lib/i18n';
import { apiClient } from '@/lib/api-client';

type ResetPasswordForm = {
  password: string;
  confirmPassword: string;
};

type ApiError = {
  response?: {
    data?: {
      message?: string;
    };
  };
};

export default function TravelerResetPasswordPage() {
  const { t, i18n } = useTranslation();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';
  const { register, handleSubmit, formState: { errors } } = useForm<ResetPasswordForm>();
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
  }, [i18n.language]);

  const onSubmit = async (data: ResetPasswordForm) => {
    setErrorMessage(null);
    if (!token || !email) {
      setErrorMessage('This reset link is invalid or expired.');
      return;
    }
    if (data.password !== data.confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }
    setIsSubmitting(true);
    try {
      await apiClient.post('/auth/reset-password', {
        email,
        token,
        newPassword: data.password,
      });
      setSubmitted(true);
    } catch (error: unknown) {
      const apiError = error as ApiError;
      setErrorMessage(apiError?.response?.data?.message || 'Unable to reset password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-deep-blue">
        <motion.div
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.5 }}
          className="absolute inset-0"
        >
          <Image
            src="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=2070&auto=format&fit=crop"
            alt="Quiet travel planning"
            className="w-full h-full object-cover opacity-60"
            fill
            sizes="50vw"
          />
        </motion.div>
        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          <div className="text-3xl font-bold tracking-tight">Ouiboo</div>
          <div className="mb-12 space-y-4">
            <h2 className="text-4xl font-bold leading-tight">{t('resetPassword.sideTitle', 'Get back to planning')}</h2>
            <p className="text-lg text-gray-200 max-w-md">{t('resetPassword.sideSubtitle', 'Update your password and return to your travel dashboard in minutes.')}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 lg:p-12">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md space-y-8"
        >
          {!submitted ? (
            <>
              <div className="space-y-2">
                <Link
                  href={`/login?lang=${i18n.language}`}
                  className="inline-flex items-center text-sm font-medium text-sunset-orange hover:text-orange-600"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {t('resetPassword.backToLogin', 'Back to login')}
                </Link>
                <h2 className="text-3xl font-bold text-foreground">{t('resetPassword.title', 'Reset your password')}</h2>
                <p className="text-muted-foreground">{t('resetPassword.subtitle', 'Choose a new password to protect your traveler account.')}</p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-foreground">{t('resetPassword.emailLabel', 'Email')}</label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    disabled
                    className="h-12 bg-muted border-border text-muted-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium text-foreground">{t('resetPassword.passwordLabel', 'New password')}</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder={t('resetPassword.passwordPlaceholder', 'Enter a new password')}
                      className="pl-10 h-12 bg-muted border-border focus:bg-background focus:border-sunset-orange focus:ring-sunset-orange transition-all duration-200"
                      {...register('password', { required: 'Password is required', minLength: 6 })}
                    />
                  </div>
                  {errors.password && <span className="text-danger text-sm">{errors.password.message}</span>}
                </div>
                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">{t('resetPassword.confirmPasswordLabel', 'Confirm password')}</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder={t('resetPassword.confirmPasswordPlaceholder', 'Re-enter the new password')}
                      className="pl-10 h-12 bg-muted border-border focus:bg-background focus:border-sunset-orange focus:ring-sunset-orange transition-all duration-200"
                      {...register('confirmPassword', { required: 'Please confirm your password', minLength: 6 })}
                    />
                  </div>
                  {errors.confirmPassword && <span className="text-danger text-sm">{errors.confirmPassword.message}</span>}
                </div>

                <Button type="submit" disabled={isSubmitting} className="w-full h-12 bg-sunset-orange hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors duration-200">
                  {isSubmitting ? 'Saving...' : t('resetPassword.saveButton', 'Update password')}
                </Button>
                {errorMessage && (
                  <p className="text-sm text-danger font-medium">{errorMessage}</p>
                )}
              </form>
            </>
          ) : (
            <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
              <CheckCircle className="h-12 w-12 text-sunset-orange" />
              <h2 className="mt-4 text-2xl font-bold text-foreground">{t('resetPassword.successTitle', 'Password updated')}</h2>
              <p className="mt-2 text-muted-foreground">{t('resetPassword.successMessage', 'Your password has been updated. You can now log in with your new credentials.')}</p>
              <div className="mt-6 flex flex-col gap-3">
                <Button asChild className="w-full h-12 bg-sunset-orange hover:bg-orange-600 text-white font-semibold rounded-lg">
                  <Link href={`/login?lang=${i18n.language}`}>{t('resetPassword.backToLogin', 'Back to login')}</Link>
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}


