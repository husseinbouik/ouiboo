'use client';

/**
 * Shared auth forms (#1023, finding D2): forgot-password and
 * reset-password, previously re-implemented verbatim in traveler and
 * agency (~650 lines for the two pairs).
 *
 * One implementation, parameterised by:
 * - `apiClient` — each app passes its own client singleton;
 * - `variant` — the app's accent system (traveler 'sunset', agency
 *   'primary'); every other class is shared, including the RTL-aware
 *   icon placement (start-/ps-) that only the agency copies had.
 *
 * Copy comes from each app's own i18n namespace at runtime (the keys
 * are identical across the two apps). Where traveler previously
 * hard-coded English strings, the shared form asks i18n first with
 * that same English string as the fallback — so agency keeps its
 * translations and traveler keeps its exact current output in every
 * locale, while the accidental divergence is now one edit away from
 * being closed by adding the keys to traveler's locale files.
 */
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, Lock, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { AxiosInstance } from 'axios';
import { Button, Input } from '@ouiboo/ui';
import {
  ForgotPasswordSchema,
  ResetPasswordSchema,
  type ForgotPasswordInput,
  type ResetPasswordInput,
} from '@ouiboo/schemas';
import { useSearchParams } from 'next/navigation';

export type AuthFormVariant = 'sunset' | 'primary';

type ApiError = {
  response?: {
    data?: {
      message?: string;
    };
  };
};

const VARIANT_CLASSES: Record<
  AuthFormVariant,
  {
    backLink: string;
    label: string;
    inputFocus: string;
    submit: string;
    successIcon: string;
  }
> = {
  sunset: {
    backLink: 'text-sunset-orange hover:text-orange-600',
    label: 'text-foreground',
    inputFocus: 'focus:border-sunset-orange focus:ring-sunset-orange',
    submit:
      'bg-sunset-orange text-deep-blue hover:bg-sunset-orange-dark hover:text-white',
    successIcon: 'text-sunset-orange',
  },
  primary: {
    backLink:
      'text-primary hover:text-primary/80 dark:text-accent dark:hover:text-accent/80',
    label: 'text-muted-foreground',
    inputFocus: 'focus:border-primary focus:ring-primary',
    submit: 'bg-primary hover:bg-primary/90 text-white',
    successIcon: 'text-primary dark:text-accent',
  },
};

export interface AuthFormProps {
  apiClient: AxiosInstance;
  variant: AuthFormVariant;
}

function BackToLogin({
  variant,
  label,
}: {
  variant: AuthFormVariant;
  label: string;
}) {
  const { i18n } = useTranslation();
  const classes = VARIANT_CLASSES[variant];
  return (
    <Link
      href={`/login?lang=${i18n.language}`}
      className={`inline-flex items-center text-sm font-medium ${classes.backLink}`}
    >
      <ArrowLeft className="me-2 h-4 w-4 rtl:rotate-180" />
      {label}
    </Link>
  );
}

function SuccessCard({
  variant,
  title,
  message,
  children,
}: {
  variant: AuthFormVariant;
  title: string;
  message: string;
  children: React.ReactNode;
}) {
  const classes = VARIANT_CLASSES[variant];
  return (
    <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
      <CheckCircle className={`h-12 w-12 ${classes.successIcon}`} />
      <h2 className="mt-4 text-2xl font-bold text-foreground">{title}</h2>
      <p className="mt-2 text-muted-foreground">{message}</p>
      <div className="mt-6 flex flex-col gap-3">{children}</div>
    </div>
  );
}

export function ForgotPasswordForm({ apiClient, variant }: AuthFormProps) {
  const { t, i18n } = useTranslation();
  const classes = VARIANT_CLASSES[variant];
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(ForgotPasswordSchema),
  });
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const onSubmit = async (data: ForgotPasswordInput) => {
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await apiClient.post('/auth/forgot-password', { email: data.email });
      setSubmitted(true);
    } catch (error: unknown) {
      const apiError = error as ApiError;
      setErrorMessage(
        apiError?.response?.data?.message ||
          t('forgotPassword.errorGeneric', 'Unable to send reset email. Please try again.'),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <SuccessCard
        variant={variant}
        title={t('forgotPassword.successTitle')}
        message={t('forgotPassword.successMessage')}
      >
        <Button
          asChild
          className={`w-full h-12 font-semibold rounded-lg ${classes.submit}`}
        >
          <Link href={`/login?lang=${i18n.language}`}>
            {t('forgotPassword.backToLogin')}
          </Link>
        </Button>
        <button
          type="button"
          onClick={() => setSubmitted(false)}
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          {t('forgotPassword.tryAnotherEmail')}
        </button>
      </SuccessCard>
    );
  }

  return (
    <>
      <div className="space-y-2">
        <BackToLogin variant={variant} label={t('forgotPassword.backToLogin')} />
        <h2 className="text-3xl font-bold text-foreground">{t('forgotPassword.title')}</h2>
        <p className="text-muted-foreground">{t('forgotPassword.subtitle')}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="email" className={`text-sm font-medium ${classes.label}`}>
            {t('forgotPassword.emailLabel')}
          </label>
          <div className="relative">
            <Mail className="absolute start-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              autoComplete="username"
              placeholder={t('forgotPassword.emailPlaceholder')}
              className={`ps-10 h-12 bg-muted border-border focus:bg-background transition-all duration-200 ${classes.inputFocus}`}
              {...register('email')}
            />
          </div>
          {errors.email && <span className="text-danger text-sm">{errors.email.message}</span>}
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className={`w-full h-12 font-semibold rounded-lg transition-colors duration-200 ${classes.submit}`}
        >
          {isSubmitting
            ? t('forgotPassword.sending', 'Sending...')
            : t('forgotPassword.sendReset')}
        </Button>
        {errorMessage && <p className="text-sm text-danger font-medium">{errorMessage}</p>}
      </form>
    </>
  );
}

export function ResetPasswordForm({ apiClient, variant }: AuthFormProps) {
  const { t, i18n } = useTranslation();
  const classes = VARIANT_CLASSES[variant];
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(ResetPasswordSchema),
  });
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const onSubmit = async (data: ResetPasswordInput) => {
    setErrorMessage(null);
    if (!token || !email) {
      setErrorMessage(t('resetPassword.invalidLink', 'This reset link is invalid or expired.'));
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
      setErrorMessage(
        apiError?.response?.data?.message ||
          t('resetPassword.errorGeneric', 'Unable to reset password. Please try again.'),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <SuccessCard
        variant={variant}
        title={t('resetPassword.successTitle', 'Password updated')}
        message={t(
          'resetPassword.successMessage',
          'Your password has been updated. You can now log in with your new credentials.',
        )}
      >
        <Button
          asChild
          className={`w-full h-12 font-semibold rounded-lg ${classes.submit}`}
        >
          <Link href={`/login?lang=${i18n.language}`}>
            {t('resetPassword.backToLogin', 'Back to login')}
          </Link>
        </Button>
      </SuccessCard>
    );
  }

  const passwordField = (
    field: 'password' | 'confirmPassword',
    labelKey: string,
    labelFallback: string,
    placeholderKey: string,
    placeholderFallback: string,
  ) => (
    <div className="space-y-2" key={field}>
      <label htmlFor={field} className={`text-sm font-medium ${classes.label}`}>
        {t(labelKey, labelFallback)}
      </label>
      <div className="relative">
        <Lock className="absolute start-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          id={field}
          type="password"
          autoComplete="new-password"
          placeholder={t(placeholderKey, placeholderFallback)}
          className={`ps-10 h-12 bg-muted border-border focus:bg-background transition-all duration-200 ${classes.inputFocus}`}
          {...register(field)}
        />
      </div>
      {errors[field] && <span className="text-danger text-sm">{errors[field]?.message}</span>}
    </div>
  );

  return (
    <>
      <div className="space-y-2">
        <BackToLogin variant={variant} label={t('resetPassword.backToLogin', 'Back to login')} />
        <h2 className="text-3xl font-bold text-foreground">
          {t('resetPassword.title', 'Reset your password')}
        </h2>
        <p className="text-muted-foreground">
          {t('resetPassword.subtitle', 'Choose a new password to protect your traveler account.')}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="email" className={`text-sm font-medium ${classes.label}`}>
            {t('resetPassword.emailLabel', 'Email')}
          </label>
          <Input
            id="email"
            type="email"
            value={email}
            disabled
            className="h-12 bg-muted border-border text-muted-foreground"
          />
        </div>
        {passwordField(
          'password',
          'resetPassword.passwordLabel',
          'New password',
          'resetPassword.passwordPlaceholder',
          'Enter a new password',
        )}
        {passwordField(
          'confirmPassword',
          'resetPassword.confirmPasswordLabel',
          'Confirm password',
          'resetPassword.confirmPasswordPlaceholder',
          'Re-enter the new password',
        )}

        <Button
          type="submit"
          disabled={isSubmitting}
          className={`w-full h-12 font-semibold rounded-lg transition-colors duration-200 ${classes.submit}`}
        >
          {isSubmitting
            ? t('resetPassword.saving', 'Saving...')
            : t('resetPassword.saveButton', 'Update password')}
        </Button>
        {errorMessage && <p className="text-sm text-danger font-medium">{errorMessage}</p>}
      </form>
    </>
  );
}
