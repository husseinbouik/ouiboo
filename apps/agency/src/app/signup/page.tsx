'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Input } from '@ouiboo/ui';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Mail, Lock, Building2, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import '../../lib/i18n';
import { apiClient } from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { type RegisterInput } from '@ouiboo/schemas';
import { useAuth } from '@/components/AuthContext';

type AgencySignupFormValues = Omit<RegisterInput, 'role'> & {
  acceptTerms: boolean;
};

type ApiError = {
  response?: {
    data?: {
      message?: string;
    };
  };
};

export default function AgencySignupPage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { refetch } = useAuth();
  const { register, handleSubmit, formState: { errors } } = useForm<AgencySignupFormValues>({
    defaultValues: {
      acceptTerms: true,
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
    onSuccess: async (data) => {
      const { accessToken, refreshToken, user } = data;
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', accessToken);
        localStorage.setItem('refresh_token', refreshToken);
      }
      await refetch();
      router.push(`/verify?email=${user.email}`);
    },
    onError: (err: ApiError) => {
      const message = err?.response?.data?.message;
      if (message === 'EMAIL_ALREADY_IN_USE') {
        setError('An account with this email already exists. Try logging in instead.');
        return;
      }
      if (message === 'JWT_NOT_CONFIGURED') {
        setError('The server is not fully configured. Please try again later or contact support.');
        return;
      }
      setError(message || 'Signup failed. Please try again.');
    }
  });

  const onSubmit = (data: AgencySignupFormValues) => {
    setError(null);
    signupMutation.mutate({
      email: data.email,
      name: data.name,
      password: data.password,
      role: 'AGENCY',
    });
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
            <h2 className="text-3xl font-bold text-deep-blue">{t('signup.title')}</h2>
            <p className="mt-2 text-gray-600">{t('signup.subtitle')}</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium text-gray-700">{t('signup.agencyName')}</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input 
                    id="name" 
                    type="text" 
                    placeholder={t('signup.agencyPlaceholder')}
                    className="pl-10 h-12 bg-gray-50 border-gray-200 focus:bg-white transition-all duration-200"
                    {...register('name', { required: 'Agency name is required' })} 
                  />
                </div>
                {errors.name && <span className="text-red-500 text-sm">{errors.name.message as string}</span>}
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-gray-700">{t('signup.email')}</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder={t('signup.emailPlaceholder')}
                    className="pl-10 h-12 bg-gray-50 border-gray-200 focus:bg-white transition-all duration-200"
                    {...register('email', { required: 'Email is required' })} 
                  />
                </div>
                {errors.email && <span className="text-red-500 text-sm">{errors.email.message as string}</span>}
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-gray-700">{t('signup.password')}</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input 
                    id="password" 
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t('signup.passwordPlaceholder', '********')}
                    className="pl-10 pr-12 h-12 bg-gray-50 border-gray-200 focus:bg-white transition-all duration-200"
                    {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'Password must be at least 6 characters' } })} 
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label={showPassword ? t('signup.hidePassword') : t('signup.showPassword')}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500">{t('signup.passwordHint')}</p>
                {errors.password && <span className="text-red-500 text-sm">{errors.password.message as string}</span>}
              </div>
            </div>

            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg">
                {error}
              </div>
            )}
            <label className="flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-600">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-deep-blue focus:ring-deep-blue"
                {...register('acceptTerms', { required: 'Please accept the terms to continue.' })}
              />
              <span>
                {t('signup.acceptTerms')}{' '}
                <Link href={`/terms?lang=${i18n.language}`} className="font-semibold text-deep-blue hover:text-blue-700 hover:underline">
                  {t('signup.termsLink')}
                </Link>{' '}
                {t('signup.and')}{' '}
                <Link href={`/privacy?lang=${i18n.language}`} className="font-semibold text-deep-blue hover:text-blue-700 hover:underline">
                  {t('signup.privacyLink')}
                </Link>
                .
              </span>
            </label>
            {errors.acceptTerms && (
              <p className="text-xs text-red-500">{errors.acceptTerms.message as string}</p>
            )}

            <Button 
              type="submit" 
              disabled={signupMutation.isPending}
              className="w-full h-12 bg-deep-blue hover:bg-blue-900 text-white font-semibold rounded-lg transition-colors duration-200"
            >
              {signupMutation.isPending ? t('signup.creatingAccount', 'Creating account...') : t('signup.createAccount')} 
              {!signupMutation.isPending && <ArrowRight className="ml-2 h-5 w-5 inline" />}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-gray-500">{t('signup.orSignUp')}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button type="button" className="flex items-center justify-center px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <span className="mr-2 flex h-5 w-5 items-center justify-center rounded-full bg-white text-sm font-bold text-blue-600 shadow-sm ring-1 ring-gray-200">G</span>
                <span className="text-sm font-medium text-gray-700">{t('signup.google')}</span>
              </button>
              <button type="button" className="flex items-center justify-center px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <span className="mr-2 flex h-5 w-5 items-center justify-center rounded bg-[#0A66C2] text-xs font-bold text-white">in</span>
                <span className="text-sm font-medium text-gray-700">{t('signup.linkedin')}</span>
              </button>
            </div>
          </form>

          <p className="text-center text-sm text-gray-600">
            {t('signup.hasAccount')}{' '}
            <Link href={`/login?lang=${i18n.language}`} className="font-semibold text-deep-blue hover:text-blue-700 hover:underline">
              {t('signup.logInLink')}
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
          className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.24),transparent_30%),radial-gradient(circle_at_80%_10%,rgba(249,115,22,0.35),transparent_28%),linear-gradient(135deg,#0f2a5f_0%,#1e3a8a_55%,#0f172a_100%)]"
        />
        <div className="absolute -left-24 top-16 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-16 right-10 h-96 w-96 rounded-full bg-orange-400/20 blur-3xl" />
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
            <h2 className="text-4xl font-bold mb-4 leading-tight">{t('signup.heroTitle', 'Join the future of travel.')}</h2>
            <p className="text-lg text-gray-200 max-w-md">
              {t('signup.heroSubtitle', 'Connect with millions of travelers and manage your agency with ease.')}
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
