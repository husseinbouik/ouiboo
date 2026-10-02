'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle, Lock } from 'lucide-react';
import { Button, Input } from '@ouiboo/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { ResetPasswordSchema, type ResetPasswordInput } from '@ouiboo/schemas';
import { useTranslation } from 'react-i18next';
import '../../lib/i18n';
import { apiClient } from '@/lib/api-client';

type ApiError = {
  response?: {
    data?: {
      message?: string;
    };
  };
};

export default function AgencyResetPasswordPage() {
  const { t, i18n } = useTranslation();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';
  const { register, handleSubmit, formState: { errors } } = useForm<ResetPasswordInput>({
    resolver: zodResolver(ResetPasswordSchema),
  });
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
  }, [i18n.language]);

  const onSubmit = async (data: ResetPasswordInput) => {
    setErrorMessage(null);
if (!token || !email) {
      setErrorMessage(t('resetPassword.invalidLink'));
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
      setErrorMessage(apiError.response?.data?.message || t('resetPassword.errorGeneric'));
    } finally {
      setIsSubmitting(false);
    }
  };

return (
    <div className="min-h-screen flex bg-background">
      <div className="flex-1 flex items-center justify-center p-8 lg:p-12">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md space-y-8"
        >
          {!submitted ? (
            <>
              <div className="space-y-2">
                <Link
                  href={`/login?lang=${i18n.language}`}
                  className="inline-flex items-center text-sm font-medium text-primary hover:text-primary/80 dark:text-accent dark:hover:text-accent/80"
                >
                  <ArrowLeft className="me-2 h-4 w-4 rtl:rotate-180" />
                  {t('resetPassword.backToLogin')}
                </Link>
                <h2 className="text-3xl font-bold text-foreground">{t('resetPassword.title')}</h2>
                <p className="text-muted-foreground">{t('resetPassword.subtitle')}</p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-muted-foreground">{t('resetPassword.emailLabel')}</label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    disabled
                    className="h-12 bg-muted border-border text-muted-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium text-muted-foreground">{t('resetPassword.passwordLabel')}</label>
                  <div className="relative">
                    <Lock className="absolute start-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder={t('resetPassword.passwordPlaceholder')}
                      className="ps-10 h-12 bg-muted border-border focus:bg-background focus:border-primary focus:ring-primary transition-all duration-200"
                      {...register('password')}
                    />
                  </div>
                  {errors.password && <span className="text-danger text-sm">{errors.password.message}</span>}
                </div>
                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="text-sm font-medium text-muted-foreground">{t('resetPassword.confirmPasswordLabel')}</label>
                  <div className="relative">
                    <Lock className="absolute start-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder={t('resetPassword.confirmPasswordPlaceholder')}
                      className="ps-10 h-12 bg-muted border-border focus:bg-background focus:border-primary focus:ring-primary transition-all duration-200"
                      {...register('confirmPassword')}
                    />
                  </div>
                  {errors.confirmPassword && <span className="text-danger text-sm">{errors.confirmPassword.message}</span>}
                </div>

                <Button type="submit" disabled={isSubmitting} className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg transition-colors duration-200">
                  {isSubmitting ? t('resetPassword.saving') : t('resetPassword.saveButton')}
                </Button>
                {errorMessage && (
                  <p className="text-sm text-danger font-medium">{errorMessage}</p>
                )}
              </form>
            </>
          ) : (
            <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
              <CheckCircle className="h-12 w-12 text-primary dark:text-accent" />
              <h2 className="mt-4 text-2xl font-bold text-foreground">{t('resetPassword.successTitle')}</h2>
              <p className="mt-2 text-muted-foreground">{t('resetPassword.successMessage')}</p>
              <div className="mt-6 flex flex-col gap-3">
                <Button asChild className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg">
                  <Link href={`/login?lang=${i18n.language}`}>{t('resetPassword.backToLogin')}</Link>
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-primary">
        <motion.div
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.5 }}
          className="absolute inset-0"
        >
          <Image
            src="https://images.unsplash.com/photo-1489515217757-5fd1be406fef?q=80&w=2070&auto=format&fit=crop"
            alt={t('resetPassword.heroAlt')}
            className="w-full h-full object-cover opacity-40"
            fill
            sizes="50vw"
          />
        </motion.div>
        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full h-full">
          <div className="flex justify-end text-3xl font-bold tracking-tight">Ouiboo</div>
          <div className="mb-12 space-y-4">
            <h2 className="text-4xl font-bold leading-tight">{t('resetPassword.sideTitle')}</h2>
            <p className="text-lg text-gray-200 max-w-md">{t('resetPassword.sideSubtitle')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
