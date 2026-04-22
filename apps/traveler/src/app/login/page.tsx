'use client';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Button, Input } from '@ouiboo/ui';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/components/AuthContext';
import '../../lib/i18n';

type LoginFormValues = {
  email: string;
  password: string;
  rememberMe?: boolean;
};

type LoginResponse = {
  accessToken: string;
  refreshToken: string;
};

type ApiError = {
  response?: {
    data?: {
      message?: string;
    };
  };
};

export default function TravelerLoginPage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { refetch } = useAuth();
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>();
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
  }, [i18n.language]);

  const loginMutation = useMutation<LoginResponse, ApiError, LoginFormValues>({
    mutationFn: async (data) => {
      const response = await apiClient.post('/auth/login', data);
      return response.data;
    },
    onSuccess: async (data) => {
      const { accessToken, refreshToken } = data;
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', accessToken);
        localStorage.setItem('refresh_token', refreshToken);
      }
      // Force update user state
      await refetch();
      router.push('/');
    },
    onError: (err) => {
      const message = err?.response?.data?.message;
      if (message === 'EMAIL_NOT_VERIFIED') {
        const email = (document.getElementById('email') as HTMLInputElement)?.value;
        router.push(`/verify?email=${email}&reason=unverified`);
        return;
      }
      setError(message || 'Login failed. Please try again.');
    },
  });

  const onSubmit: SubmitHandler<LoginFormValues> = (data) => {
    setError(null);
    const payload = {
      email: data.email,
      password: data.password,
    };
    loginMutation.mutate(payload);
  };

  if (!mounted) return <div className="min-h-screen bg-background" />;

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-background overflow-hidden p-6 font-sans">
      
      {/* Background Blobs */}
      <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[40rem] h-[40rem] bg-sunset-orange/10 dark:bg-sunset-orange/5 rounded-full blur-3xl opacity-50" />
      <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-[40rem] h-[40rem] bg-blue-100 dark:bg-blue-900/20 rounded-full blur-3xl opacity-50" />

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative w-full max-w-md bg-card backdrop-blur-xl border border-border shadow-2xl rounded-[2.5rem] p-8 md:p-12"
      >
        <div className="text-center mb-10">
            <Link href="/" className="inline-flex items-center justify-center gap-2 mb-8 group">
                <div className="w-10 h-10 rounded-xl bg-deep-blue dark:bg-white text-white dark:text-deep-blue flex items-center justify-center font-bold text-xl shadow-lg group-hover:scale-105 transition-transform">O</div>
                <span className="text-2xl font-bold text-deep-blue dark:text-white">Ouiboo</span>
            </Link>
            <h2 className="text-3xl font-bold text-foreground mb-2">{t('login.title', 'Welcome Back')}</h2>
            <p className="text-muted-foreground font-medium text-sm">{t('login.subtitle', 'Enter your details to sign in')}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
                <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-foreground ml-1">{t('login.email', 'Email')}</label>
                    <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground group-focus-within:text-sunset-orange transition-colors">
                            <Mail className="h-5 w-5" />
                        </div>
                        <Input 
                            id="email" 
                            type="email" 
                            placeholder={t('login.emailPlaceholder', 'hello@example.com')}
                            className="pl-12 h-14 bg-muted border-border rounded-2xl focus:bg-background focus:ring-2 focus:ring-sunset-orange/10 focus:border-sunset-orange transition-all font-medium text-foreground placeholder:text-muted-foreground"
                            {...register('email', { required: 'Email is required' })} 
                        />
                    </div>
                    {errors.email && <span className="text-red-500 text-xs font-semibold pl-1">{errors.email.message as string}</span>}
                </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-medium text-gray-700">{t('login.password')}</label>
                  <Link href={`/forgot-password?lang=${i18n.language}`} className="text-sm font-medium text-sunset-orange hover:text-orange-600">
                    {t('login.forgotPassword')}
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input 
                    id="password" 
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t('login.passwordPlaceholder', '********')}
                    className="pl-10 pr-12 h-12 bg-gray-50 border-gray-200 focus:bg-white focus:border-sunset-orange focus:ring-sunset-orange transition-all duration-200"
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
                {errors.password && <span className="text-red-500 text-xs font-semibold pl-1">{errors.password.message as string}</span>}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-sunset-orange focus:ring-sunset-orange"
                  {...register('rememberMe')}
                />
                {t('login.rememberMe')}
              </label>
              <span className="text-xs text-gray-500">{t('login.securityNote')}</span>
            </div>

            {error && (
                <div className="p-4 bg-red-50 text-red-500 text-sm font-semibold rounded-2xl flex items-center gap-2 border border-red-100">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    {error}
                </div>
            )}

            <Button 
              type="submit" 
              disabled={loginMutation.isPending}
              className="w-full h-12 bg-sunset-orange hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors duration-200"
            >
{loginMutation.isPending ? 'Logging in...' : t('login.signIn', 'Sign In')}
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
                <Image src="https://www.svgrepo.com/show/475656/google-color.svg" className="h-5 w-5 mr-2" alt="Google" width={20} height={20} unoptimized />
                <span className="text-sm font-medium text-gray-700">{t('login.google')}</span>
              </button>
              <button type="button" className="flex items-center justify-center px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <Image src="https://www.svgrepo.com/show/475647/facebook-color.svg" className="h-5 w-5 mr-2" alt="Facebook" width={20} height={20} unoptimized />
                <span className="text-sm font-medium text-gray-700">{t('login.facebook')}</span>
              </button>
            </div>

             <p className="text-center text-sm text-muted-foreground font-medium">
                {t('login.noAccount', "Don't have an account?")}{' '}
                <Link href={`/signup?lang=${i18n.language}`} className="text-sunset-orange font-bold hover:underline">
                    {t('login.signUpLink', 'Sign up')}
                </Link>
            </p>
        </form>
      </motion.div>
    </div>
  );
}
