'use client';

import type { AxiosError } from 'axios';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Input } from '@ouiboo/ui';
import { useTranslation } from 'react-i18next';
import '../../lib/i18n';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Lock, ShieldCheck, User } from 'lucide-react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ThemeToggle } from '@/components/ThemeToggle';

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
      username: 'admin',
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
      const { accessToken, refreshToken } = data;
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', accessToken);
        localStorage.setItem('refresh_token', refreshToken);
      }
      router.push('/');
    },
    onError: (err: AxiosError<ApiErrorResponse>) => {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    },
  });

  const onSubmit = (data: AdminLoginForm) => {
    setError(null);
    const normalized = data.username.trim();
    const email = normalized.includes('@') ? normalized : `${normalized}@ouiboo.local`;
    loginMutation.mutate({ email, password: data.password });
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] bg-slate-50">
      <div className="hidden lg:flex relative overflow-hidden bg-deep-blue text-white">
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.12),_transparent_60%)]" />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center font-black text-lg">O</div>
            <span className="text-2xl font-black tracking-tight">{t('login.brand', 'Ouiboo Admin')}</span>
          </div>
          <div className="space-y-4 max-w-md">
            <h1 className="text-4xl font-black leading-tight">{t('login.heroTitle', 'Admin command center')}</h1>
            <p className="text-white/80 text-lg">
              {t('login.heroSubtitle', 'Approve agencies, confirm payments, and keep the marketplace healthy.')}
            </p>
            <div className="flex items-center gap-3 text-sm font-semibold text-white/90">
              <ShieldCheck className="h-5 w-5 text-sunset-orange" />
              {t('login.heroNote', 'Audit logging and role-based access are enabled.')}
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
              A
            </div>
            <h2 className="text-3xl font-black text-deep-blue">{t('login.title')}</h2>
            <p className="text-sm text-gray-500">{t('login.subtitle')}</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="username" className="text-xs font-bold uppercase tracking-widest text-gray-500">{t('login.username')}</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="username"
                  type="text"
                  placeholder="admin"
                  className="pl-10 h-12 bg-white border-gray-200 focus:bg-white focus:border-deep-blue focus:ring-deep-blue"
                  {...register('username', { required: 'Username is required' })}
                />
              </div>
              {errors.username && <p className="text-xs text-red-500">{errors.username.message}</p>}
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-xs font-bold uppercase tracking-widest text-gray-500">{t('login.password')}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="********"
                  className="pl-10 pr-12 h-12 bg-white border-gray-200 focus:bg-white focus:border-deep-blue focus:ring-deep-blue"
                  {...register('password', { required: 'Password is required' })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
            </div>

            <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700">
              {t('login.helper', 'Default credentials: admin / admin')}
            </div>

            {error && (
              <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs text-red-600">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full h-12 bg-deep-blue hover:bg-blue-900 text-white font-semibold"
            >
              {loginMutation.isPending ? t('login.authenticating', 'Authenticating...') : t('login.authenticate')}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
