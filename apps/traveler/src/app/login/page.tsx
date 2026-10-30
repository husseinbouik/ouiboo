'use client';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Button, Input, ThemeToggle, LanguageSwitcher } from '@ouiboo/ui';
import { AuthBrandLockup } from '../../components/AuthBrandLockup';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/components/AuthContext';
import { setBrowserAccessToken, getAuthErrorMessage } from '@ouiboo/api-client';
import { LoginSchema, type LoginInput } from '@ouiboo/schemas';
import '../../lib/i18n';

type LoginFormValues = LoginInput & {
};

type LoginResponse = {
  accessToken: string;
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
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(LoginSchema),
  });
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
      try {
        await setBrowserAccessToken(data.accessToken);
      } catch {
        setError('Failed to establish session. Please try again.');
        return;
      }
      // Force update user state
      await refetch();
      router.push('/');
    },
    onError: (err: { response?: { data?: { message?: string } | string } }) => {
      const errorInfo = getAuthErrorMessage(err, (key, fallback) => t(key, fallback));
      if (errorInfo.redirect) {
        const email = (document.getElementById('email') as HTMLInputElement)?.value;
        router.push(`/verify?email=${encodeURIComponent(email || '')}&reason=unverified`);
        return;
      }
      setError(errorInfo.fallback);
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
      {/* Theme + Language controls */}
      <div className="absolute top-4 end-4 z-10 flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
      
      {/* Background Blobs */}
      <div className="absolute top-0 end-0 -translate-y-1/2 translate-x-1/2 rtl:-translate-x-1/2 w-[40rem] h-[40rem] bg-sunset-orange/10 dark:bg-sunset-orange/5 rounded-full blur-3xl opacity-50 pointer-events-none" />
      <div className="absolute bottom-0 start-0 translate-y-1/2 -translate-x-1/2 rtl:translate-x-1/2 w-[40rem] h-[40rem] bg-blue-100 dark:bg-blue-900/20 rounded-full blur-3xl opacity-50 pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative w-full max-w-md bg-card backdrop-blur-xl border border-border shadow-2xl rounded-4xl p-8 md:p-12"
      >
        <div className="text-center mb-10">
            <Link href="/" className="inline-flex items-center justify-center gap-2 mb-8 group">
                <AuthBrandLockup />
            </Link>
            <h2 className="text-3xl font-bold text-foreground mb-2">{t('login.title', 'Welcome Back')}</h2>
            <p className="text-muted-foreground font-medium text-sm">{t('login.subtitle', 'Enter your details to sign in')}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
                <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-foreground ms-1">{t('login.email', 'Email')}</label>
                    <div className="relative group">
                        <div className="absolute start-4 top-1/2 -translate-y-1/2 text-foreground group-focus-within:text-sunset-orange transition-colors">
                            <Mail className="h-5 w-5" />
                        </div>
                        <Input 
                            id="email" 
                            type="email" 
                            placeholder={t('login.emailPlaceholder', 'hello@example.com')}
                            className="ps-12 h-14 bg-muted border-border rounded-2xl focus:bg-background focus:ring-2 focus:ring-sunset-orange/10 focus:border-sunset-orange transition-all font-medium text-foreground placeholder:text-muted-foreground"
                            {...register('email')}
                        />
                    </div>
                    {errors.email && <span className="text-danger text-xs font-semibold ps-1">{errors.email.message as string}</span>}
                </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-medium text-foreground">{t('login.password', 'Password')}</label>
                  <Link href={`/forgot-password?lang=${i18n.language}`} className="text-sm font-medium text-sunset-orange-dark hover:text-orange-800">
                    {t('login.forgotPassword', 'Forgot Password?')}
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute start-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input 
                    id="password" 
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t('login.passwordPlaceholder', '********')}
                    className="ps-10 pe-12 h-12 bg-muted border-border focus:bg-background focus:border-sunset-orange focus:ring-sunset-orange transition-all duration-200"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? t('login.hidePassword', 'Hide password') : t('login.showPassword', 'Show password')}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {errors.password && <span className="text-danger text-xs font-semibold ps-1">{errors.password.message as string}</span>}
              </div>
            </div>

            <div className="flex items-center justify-end">
              <span className="text-xs text-muted-foreground">{t('login.securityNote', '256-bit encryption')}</span>
            </div>

            {error && (
                <div className="p-4 bg-danger/10 text-danger text-sm font-semibold rounded-2xl flex items-center gap-2 border border-danger/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-danger shrink-0" />
                    {error}
                </div>
            )}

            <Button 
              type="submit" 
              disabled={loginMutation.isPending}
              className="w-full h-12 bg-sunset-orange-dark hover:bg-[#b03d11] text-white font-semibold rounded-lg transition-colors duration-200"
            >
              {loginMutation.isPending ? t('login.loggingIn', 'Logging in...') : t('login.signIn', 'Sign In')}
              {!loginMutation.isPending && <ArrowRight className="ms-2 h-5 w-5 inline rtl:rotate-180" />}
            </Button>


             <p className="text-center text-sm text-muted-foreground font-medium">
                {t('login.noAccount', "Don't have an account?")}{' '}
                <Link href={`/signup?lang=${i18n.language}`} className="text-sunset-orange-dark font-bold hover:underline">
                    {t('signup.signUpLink', 'Sign up')}
                </Link>
            </p>
        </form>
      </motion.div>
    </div>
  );
}
