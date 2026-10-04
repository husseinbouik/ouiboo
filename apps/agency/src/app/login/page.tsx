'use client';

import Image from 'next/image';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Input, ThemeToggle, LanguageSwitcher } from '@ouiboo/ui';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import '../../lib/i18n';
import { apiClient } from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { type LoginInput } from '@ouiboo/schemas';
import { useAuth } from '@/components/AuthContext';
import { setBrowserAccessToken, getAuthErrorMessage } from '@ouiboo/api-client';

type AgencyLoginFormValues = LoginInput & {
};

type ApiError = {
  response?: {
    data?: {
      message?: string;
    } | string;
  };
};

export default function AgencyLoginPage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { user, isLoading, refetch } = useAuth();
  const { register, handleSubmit, formState: { errors } } = useForm<AgencyLoginFormValues>();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const isMounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  useEffect(() => {
    document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
  }, [i18n.language]);

  // Bounce authenticated users to the dashboard
  useEffect(() => {
    if (!isLoading && user) {
      router.replace('/dashboard');
    }
  }, [user, isLoading, router]);

  const loginMutation = useMutation({
    mutationFn: async (data: LoginInput) => {
      const response = await apiClient.post('/auth/login', data);
      return response.data;
    },
    onSuccess: async (data) => {
      setBrowserAccessToken(data.accessToken);
      await refetch();
      router.push('/dashboard');
    },
    onError: (err: ApiError) => {
      console.error('Login failed:', err);
      const errorInfo = getAuthErrorMessage(err, (key, fallback) => t(key, fallback));
      if (errorInfo.redirect) {
        const email = (document.getElementById('email') as HTMLInputElement)?.value;
        router.push(`/verify?email=${encodeURIComponent(email || '')}&reason=unverified`);
        return;
      }
      setError(errorInfo.fallback);
    }
  });

  const onSubmit = (data: AgencyLoginFormValues) => {
    setError(null);
    loginMutation.mutate({
      email: data.email,
      password: data.password,
    });
  };

if (!isMounted) return <div className="min-h-screen bg-background" />;

  return (
    <div className="min-h-screen flex bg-background relative">
      {/* Theme + Language controls */}
      <div className="absolute top-4 end-4 z-50 flex items-center gap-2 pointer-events-auto">
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
            <h2 className="text-3xl font-bold text-foreground">{t('login.title')}</h2>
            <p className="mt-2 text-muted-foreground">{t('login.subtitle')}</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-muted-foreground">{t('login.email')}</label>
                <div className="relative">
                  <Mail className="absolute start-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder={t('login.emailPlaceholder')}
                    className="ps-10 h-12 bg-muted border-border focus:bg-background focus:border-primary focus:ring-primary transition-all duration-200"
                    {...register('email', { required: t('login.emailRequired') })}
                  />
                </div>
                {errors.email && <span className="text-danger text-sm">{errors.email.message as string}</span>}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-medium text-muted-foreground">{t('login.password')}</label>
                  <Link href={`/forgot-password?lang=${i18n.language}`} className="text-sm font-medium text-primary hover:text-primary/80 dark:text-accent dark:hover:text-accent/80">
                    {t('login.forgotPassword')}
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute start-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t('login.passwordPlaceholder')}
                    className="ps-10 pe-12 h-12 bg-muted border-border focus:bg-background focus:border-primary focus:ring-primary transition-all duration-200"
                    {...register('password', { required: t('login.passwordRequired') })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                 {errors.password && <span className="text-danger text-sm">{errors.password.message as string}</span>}
              </div>
            </div>

            <div className="flex items-center justify-end">
              <span className="text-xs text-muted-foreground">{t('login.securityNote')}</span>
            </div>

            {error && (
              <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg transition-colors duration-200"
            >
              {loginMutation.isPending ? t('login.loggingIn') : t('login.signIn')}
              {!loginMutation.isPending && <ArrowRight className="ms-2 h-5 w-5 inline" />}
            </Button>

          </form>

          <p className="text-center text-sm text-muted-foreground">
            {t('login.noAccount')}{' '}
            <Link href={`/signup?lang=${i18n.language}`} className="font-semibold text-primary hover:text-primary/80 hover:underline dark:text-accent dark:hover:text-accent/80">
              {t('login.signUpLink')}
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
          className="absolute inset-0"
        >
          <Image
            src="https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2069&auto=format&fit=crop"
            alt={t('login.heroAlt')}
            className="w-full h-full object-cover opacity-40"
            fill
            sizes="50vw"
          />
        </motion.div>
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
            <h2 className="text-4xl font-bold mb-4 leading-tight">{t('login.heroTitle')}</h2>
            <p className="text-lg text-gray-200 max-w-md">
              {t('login.heroSubtitle')}
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
