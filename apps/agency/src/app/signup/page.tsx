'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Input, ThemeToggle, LanguageSwitcher } from '@ouiboo/ui';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Mail, Lock, Building2, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import '../../lib/i18n';
import { apiClient } from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { type RegisterInput } from '@ouiboo/schemas';
import { UserRole } from '@ouiboo/types';
type AgencySignupFormValues = Omit<RegisterInput, 'role'> & {
  acceptTerms: boolean;
};

type ApiError = {
  response?: {
    data?: {
      message?: string;
    } | string;
  };
};

const getSignupErrorMessage = (
  err: ApiError,
  t: (key: string, fallback: string) => string,
): string => {
  if (!err?.response) {
    return t('signup.networkError', 'Cannot reach the server. Please check your connection and try again.');
  }
  const data = err.response.data;
  const message = typeof data === 'string' ? null : data?.message;
  switch (message) {
    case 'EMAIL_ALREADY_IN_USE':
      return t('signup.emailInUse', 'An account with this email already exists. Try logging in instead.');
    case 'JWT_NOT_CONFIGURED':
      return t('signup.serverNotConfigured', 'The server is not fully configured. Please try again later or contact support.');
    case 'EMAIL_NOT_VERIFIED':
      return t('signup.emailNotVerified', 'Please verify your email address before continuing.');
    default:
      if (message && !/^[A-Z][A-Z0-9_]*$/.test(message)) {
        return message;
      }
      return t('signup.errorGeneric', 'Signup failed. Please try again.');
  }
};

export default function AgencySignupPage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { register, handleSubmit, formState: { errors } } = useForm<AgencySignupFormValues>({
    defaultValues: {
      acceptTerms: false,
    },
  });
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
  }, [i18n.language]);

  const signupMutation = useMutation({
    mutationFn: async (data: RegisterInput) => {
      const response = await apiClient.post('/auth/register', data);
      return response.data;
    },
    onSuccess: (data) => {
      router.push(`/verify?email=${encodeURIComponent(data.email)}`);
    },
    onError: (err: ApiError) => {
      setError(getSignupErrorMessage(err, t));
    }
  });

  const onSubmit = (data: AgencySignupFormValues) => {
    setError(null);
    signupMutation.mutate({
      email: data.email,
      name: data.name,
      password: data.password,
      role: UserRole.Agency,
    });
  };

  if (!mounted) return <div className="min-h-screen bg-background" />;

  return (
    <div className="min-h-screen flex bg-background relative">
      {/* Theme + Language controls */}
      <div className="absolute top-4 end-4 z-10 flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-12">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md space-y-8"
        >
          <div className="text-center lg:text-start">
            <h1 className="text-3xl font-bold text-foreground">{t('signup.title')}</h1>
            <p className="mt-2 text-muted-foreground">{t('signup.subtitle')}</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium text-muted-foreground">{t('signup.agencyName')}</label>
                <div className="relative">
                  <Building2 className="absolute start-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    placeholder={t('signup.agencyPlaceholder')}
                    className="ps-10 h-12 bg-muted border-border focus:bg-background transition-all duration-200"
                    {...register('name', { required: t('signup.nameRequired') })}
                  />
                </div>
                {errors.name && <span className="text-danger text-sm">{errors.name.message as string}</span>}
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-muted-foreground">{t('signup.email')}</label>
                <div className="relative">
                  <Mail className="absolute start-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder={t('signup.emailPlaceholder')}
                    className="ps-10 h-12 bg-muted border-border focus:bg-background transition-all duration-200"
                    {...register('email', { required: t('signup.emailRequired') })}
                  />
                </div>
                {errors.email && <span className="text-danger text-sm">{errors.email.message as string}</span>}
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-muted-foreground">{t('signup.password')}</label>
                <div className="relative">
                  <Lock className="absolute start-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t('signup.passwordPlaceholder')}
                    className="ps-10 pe-12 h-12 bg-muted border-border focus:bg-background transition-all duration-200"
                    {...register('password', { required: t('signup.passwordRequired'), minLength: { value: 6, message: t('signup.passwordMinLength') } })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? t('signup.hidePassword') : t('signup.showPassword')}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">{t('signup.passwordHint')}</p>
                {errors.password && <span className="text-danger text-sm">{errors.password.message as string}</span>}
              </div>
            </div>

            {error && (
              <div className="p-3 text-sm text-danger bg-danger/10 border border-danger/30 rounded-lg">
                {error}
              </div>
            )}
            <label className="flex items-start gap-2 rounded-lg border border-border bg-muted px-3 py-3 text-sm text-muted-foreground">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                {...register('acceptTerms', { required: t('signup.termsRequired') })}
              />
              <span>
                {t('signup.acceptTerms')}{' '}
                <Link href={`/terms?lang=${i18n.language}`} className="font-semibold text-primary hover:text-primary/80 hover:underline dark:text-accent dark:hover:text-accent/80">
                  {t('signup.termsLink')}
                </Link>{' '}
                {t('signup.and')}{' '}
                <Link href={`/privacy?lang=${i18n.language}`} className="font-semibold text-primary hover:text-primary/80 hover:underline dark:text-accent dark:hover:text-accent/80">
                  {t('signup.privacyLink')}
                </Link>
                .
              </span>
            </label>
            {errors.acceptTerms && (
              <p className="text-xs text-danger">{errors.acceptTerms.message as string}</p>
            )}

            <Button
              type="submit"
              disabled={signupMutation.isPending}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg transition-colors duration-200"
            >
              {signupMutation.isPending ? t('signup.creatingAccount') : t('signup.createAccount')}
              {!signupMutation.isPending && <ArrowRight className="ms-2 h-5 w-5 inline" />}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-background px-2 text-muted-foreground">{t('signup.orSignUp')}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button type="button" disabled aria-disabled="true" title={t('signup.socialComingSoon')} className="flex items-center justify-center px-4 py-2 border border-border rounded-lg opacity-70 cursor-not-allowed">
                <span className="me-2 flex h-5 w-5 items-center justify-center rounded-full bg-white text-sm font-bold text-primary shadow-sm ring-1 ring-border">G</span>
                <span className="text-sm font-medium text-muted-foreground">{t('signup.google')}</span>
              </button>
              <button type="button" disabled aria-disabled="true" title={t('signup.socialComingSoon')} className="flex items-center justify-center px-4 py-2 border border-border rounded-lg opacity-70 cursor-not-allowed">
                <span className="me-2 flex h-5 w-5 items-center justify-center rounded bg-[#0A66C2] text-xs font-bold text-white">in</span>
                <span className="text-sm font-medium text-muted-foreground">{t('signup.linkedin')}</span>
              </button>
            </div>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            {t('signup.hasAccount')}{' '}
            <Link href={`/login?lang=${i18n.language}`} className="font-semibold text-primary hover:text-primary/80 hover:underline dark:text-accent dark:hover:text-accent/80">
              {t('signup.logInLink')}
            </Link>
          </p>
        </motion.div>
      </div>

      {/* Right Side - Image */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-primary">
        <motion.div
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.5 }}
          className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.24),transparent_30%),radial-gradient(circle_at_80%_10%,rgba(249,115,22,0.35),transparent_28%),linear-gradient(135deg,#0f2a5f_0%,#1e3a8a_55%,#0f172a_100%)]"
        />
        <div className="absolute -start-24 top-16 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-16 end-10 h-96 w-96 rounded-full bg-orange-400/20 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.08)_0,rgba(255,255,255,0.08)_1px,transparent_1px,transparent_32px)]" />
        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full h-full">
          <div className="flex justify-end">
             <div className="text-3xl font-bold tracking-tight">Ouiboo</div>
          </div>
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="mb-12"
          >
            <h2 className="text-4xl font-bold mb-4 leading-tight">{t('signup.heroTitle')}</h2>
            <p className="text-lg text-muted-foreground max-w-md">
              {t('signup.heroSubtitle')}
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
