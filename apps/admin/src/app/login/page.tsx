'use client';

import type { AxiosError } from 'axios';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Input, ThemeToggle, LanguageSwitcher } from '@ouiboo/ui';
import { useTranslation } from 'react-i18next';
import '../../lib/i18n';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Lock, ShieldCheck, User } from 'lucide-react';
import { setBrowserAccessToken, getAuthErrorMessage } from '@ouiboo/api-client';

type AdminLoginForm = {
  username: string;
  password: string;
};

type ApiErrorResponse = {
  message?: string;
};

export default function AdminLoginPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { register, handleSubmit, formState: { errors } } = useForm<AdminLoginForm>({
    defaultValues: {
      username: t('login.usernamePlaceholder'),
    },
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loginMutation = useMutation({
    mutationFn: async (payload: { email: string; password: string }) => {
      const response = await apiClient.post('/auth/login', payload);
      return response.data;
    },
    onSuccess: (data) => {
      // Verify the user has ADMIN role before granting access
      if (data.user?.role !== 'ADMIN') {
        setError(t('login.notAdmin', 'This account does not have admin access.'));
        return;
      }
      setBrowserAccessToken(data.accessToken);
      router.push('/');
    },
    onError: (err: AxiosError<ApiErrorResponse>) => {
      const errorInfo = getAuthErrorMessage(err, (key, fallback) => t(key, fallback));
      setError(errorInfo.fallback);
    },
  });

  const onSubmit = (data: AdminLoginForm) => {
    setError(null);
    const normalized = data.username.trim();
    const email = normalized.includes('@') ? normalized : `${normalized}@ouiboo.local`;
    loginMutation.mutate({ email, password: data.password });
  };

  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] bg-background text-foreground">
      <div className="hidden lg:flex relative overflow-hidden bg-deep-blue text-white">
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.12),_transparent_60%)]" />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center font-black text-lg">O</div>
            <span className="text-2xl font-black tracking-tight">{t('login.brand')}</span>
          </div>
          <div className="space-y-4 max-w-md">
            <p className="text-4xl font-black leading-tight">{t('login.heroTitle')}</p>
            <p className="text-white/80 text-lg">
              {t('login.heroSubtitle')}
            </p>
            <div className="flex items-center gap-3 text-sm font-semibold text-white/90">
              <ShieldCheck className="h-5 w-5 text-sunset-orange" />
              {t('login.heroNote')}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md space-y-8">
          <div className="flex items-center justify-end gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
          <div className="text-center space-y-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-sunset-orange/10 text-sunset-orange font-black text-xl">
{t('login.brand').charAt(0)}
            </div>
            <h1 className="text-3xl font-black text-foreground">{t('login.title')}</h1>
            <p className="text-sm text-muted-foreground">{t('login.subtitle')}</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="username" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t('login.username')}</label>
              <div className="relative">
                <User className="absolute start-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="username"
                  type="text"
placeholder={t('login.usernamePlaceholder')}
                  className="ps-10 h-12 bg-input border-border focus:bg-background focus:border-deep-blue focus:ring-deep-blue"
                  {...register('username', { required: t('login.usernameRequired') })}
                />
              </div>
              {errors.username && <p className="text-xs text-danger">{errors.username.message}</p>}
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t('login.password')}</label>
              <div className="relative">
                <Lock className="absolute start-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="********"
                  className="ps-10 pe-12 h-12 bg-input border-border focus:bg-background focus:border-deep-blue focus:ring-deep-blue"
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
              {errors.password && <p className="text-xs text-danger">{errors.password.message}</p>}
            </div>

            <div className="rounded-2xl border border-ocean-500/20 bg-ocean-500/10 px-4 py-3 text-xs text-ocean-700 dark:text-ocean-300">
              {t('login.helper')}
            </div>

            {error && (
              <div className="rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3 text-xs text-danger">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full h-12 bg-deep-blue hover:bg-deep-blue/90 text-white font-semibold"
            >
              {loginMutation.isPending ? t('login.authenticating') : t('login.authenticate')}
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
