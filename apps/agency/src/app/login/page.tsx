'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Input } from '@ouiboo/ui';
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

type AgencyLoginFormValues = LoginInput & {
  rememberMe?: boolean;
};

export default function AgencyLoginPage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { refetch } = useAuth();
  const { register, handleSubmit, formState: { errors } } = useForm<AgencyLoginFormValues>();
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    setMounted(true);
    document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
  }, [i18n.language]);

  const loginMutation = useMutation({
    mutationFn: async (data: LoginInput) => {
      const response = await apiClient.post('/auth/login', data);
      return response.data;
    },
    onSuccess: async (data) => {
      const { accessToken, refreshToken } = data;
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', accessToken);
        localStorage.setItem('refresh_token', refreshToken);
      }
      await refetch();
      router.push('/dashboard');
    },
    onError: (err: any) => {
      console.error('Login failed:', err);
      const message = err?.response?.data?.message;
      if (message === 'EMAIL_NOT_VERIFIED') {
        const email = (document.getElementById('email') as HTMLInputElement)?.value;
        router.push(`/verify?email=${email}&reason=unverified`);
        return;
      }
      setError(message || 'Login failed. Please try again.');
    }
  });

  const onSubmit = (data: AgencyLoginFormValues) => {
    setError(null);
    const { rememberMe, ...payload } = data;
    loginMutation.mutate(payload);
  };

  if (!mounted) return <div className="min-h-screen bg-white" />;

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-12">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md space-y-8"
        >
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold text-deep-blue">{t('login.title')}</h2>
            <p className="mt-2 text-gray-600">{t('login.subtitle')}</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-gray-700">{t('login.email')}</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder={t('login.emailPlaceholder')}
                    className="pl-10 h-12 bg-gray-50 border-gray-200 focus:bg-white focus:border-deep-blue focus:ring-deep-blue transition-all duration-200"
                    {...register('email', { required: 'Email is required' })} 
                  />
                </div>
                {errors.email && <span className="text-red-500 text-sm">{errors.email.message as string}</span>}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-medium text-gray-700">{t('login.password')}</label>
                  <Link href={`/forgot-password?lang=${i18n.language}`} className="text-sm font-medium text-deep-blue hover:text-blue-700">
                    {t('login.forgotPassword')}
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input 
                    id="password" 
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t('login.passwordPlaceholder', '********')}
                    className="pl-10 pr-12 h-12 bg-gray-50 border-gray-200 focus:bg-white focus:border-deep-blue focus:ring-deep-blue transition-all duration-200"
                    {...register('password', { required: 'Password is required' })} 
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                 {errors.password && <span className="text-red-500 text-sm">{errors.password.message as string}</span>}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-deep-blue focus:ring-deep-blue"
                  {...register('rememberMe')}
                />
                {t('login.rememberMe')}
              </label>
              <span className="text-xs text-gray-500">{t('login.securityNote')}</span>
            </div>

            {error && (
              <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </div>
            )}

            <Button 
              type="submit" 
              disabled={loginMutation.isPending}
              className="w-full h-12 bg-deep-blue hover:bg-blue-800 text-white font-semibold rounded-lg transition-colors duration-200"
            >
              {loginMutation.isPending ? 'Logging in...' : t('login.signIn')} 
              {!loginMutation.isPending && <ArrowRight className="ml-2 h-5 w-5 inline" />}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-gray-500">{t('login.orContinue')}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button type="button" className="flex items-center justify-center px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="h-5 w-5 mr-2" alt="Google" />
                <span className="text-sm font-medium text-gray-700">{t('login.google')}</span>
              </button>
              <button type="button" className="flex items-center justify-center px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <img src="https://www.svgrepo.com/show/448234/linkedin.svg" className="h-5 w-5 mr-2" alt="LinkedIn" />
                <span className="text-sm font-medium text-gray-700">{t('login.linkedin')}</span>
              </button>
            </div>
          </form>

          <p className="text-center text-sm text-gray-600">
            {t('login.noAccount')}{' '}
            <Link href={`/signup?lang=${i18n.language}`} className="font-semibold text-deep-blue hover:text-blue-700 hover:underline">
              {t('login.signUpLink')}
            </Link>
          </p>
        </motion.div>
      </div>

      {/* Right Side - Image */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-deep-blue">
        <motion.div 
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.5 }}
          className="absolute inset-0"
        >
          <img 
            src="https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2069&auto=format&fit=crop" 
            alt="Modern Office" 
            className="w-full h-full object-cover opacity-40"
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
            <h2 className="text-4xl font-bold mb-4 leading-tight">Empower your travel business.</h2>
            <p className="text-lg text-gray-200 max-w-md">
              Access powerful tools, analytics, and a global network of travelers to scale your agency.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
