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
import { Button, Input } from '@ouiboo/ui';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/components/AuthContext';
import { setBrowserAccessToken } from '@ouiboo/api-client';
import { LoginSchema, type LoginInput } from '@ouiboo/schemas';
import '../../lib/i18n';

type LoginFormValues = LoginInput & {
  rememberMe?: boolean;
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
      setBrowserAccessToken(data.accessToken);
      // Force update user state
      await refetch();
      router.push('/');
    },
    onError: (err: { response?: { data?: { message?: string } | string } }) => {
      if (!err?.response) {
        setError(t('login.networkError', 'Cannot reach the server. Please check your connection and try again.'));
        return;
      }
      const data = err.response.data;
      const message = typeof data === 'string' ? null : data?.message;
      if (message === 'EMAIL_NOT_VERIFIED') {
        const email = (document.getElementById('email') as HTMLInputElement)?.value;
        router.push(`/verify?email=${encodeURIComponent(email || '')}&reason=unverified`);
        return;
      }
      if (message === 'INVALID_CREDENTIALS') {
        setError(t('login.invalidCredentials', 'Incorrect email or password. Please try again.'));
        return;
      }
      // Show human-readable backend messages, hide raw ALL_CAPS error codes
      if (message && !/^[A-Z][A-Z0-9_]*$/.test(message)) {
        setError(message);
        return;
      }
      setError(t('login.errorFailed', 'Login failed. Please try again.'));
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
      <div className="absolute top-0 end-0 -translate-y-1/2 translate-x-1/2 rtl:-translate-x-1/2 w-[40rem] h-[40rem] bg-sunset-orange/10 dark:bg-sunset-orange/5 rounded-full blur-3xl opacity-50 pointer-events-none" />
      <div className="absolute bottom-0 start-0 translate-y-1/2 -translate-x-1/2 rtl:translate-x-1/2 w-[40rem] h-[40rem] bg-blue-100 dark:bg-blue-900/20 rounded-full blur-3xl opacity-50 pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative w-full max-w-md bg-card backdrop-blur-xl border border-border shadow-2xl rounded-[2.5rem] p-8 md:p-12"
      >
        <div className="text-center mb-10">
            <Link href="/" className="inline-flex items-center justify-center gap-2 mb-8 group">
                <div className="w-10 h-10 rounded-xl bg-deep-blue dark:bg-sunset-orange text-white flex items-center justify-center font-bold text-xl shadow-lg group-hover:scale-105 transition-transform">O</div>
                <span className="text-2xl font-bold text-deep-blue dark:text-foreground">Ouiboo</span>
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
                  <Link href={`/forgot-password?lang=${i18n.language}`} className="text-sm font-medium text-sunset-orange hover:text-orange-600">
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

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-border text-sunset-orange focus:ring-sunset-orange"
                  {...register('rememberMe')}
                />
                {t('login.rememberMe', 'Remember me')}
              </label>
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
              className="w-full h-12 bg-sunset-orange hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors duration-200"
            >
              {loginMutation.isPending ? t('login.loggingIn', 'Logging in...') : t('login.signIn', 'Sign In')}
              {!loginMutation.isPending && <ArrowRight className="ms-2 h-5 w-5 inline rtl:rotate-180" />}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-card px-2 text-muted-foreground">{t('login.orContinue', 'Or continue with')}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button type="button" className="flex items-center justify-center px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors">
                <svg className="h-5 w-5 ms-2 shrink-0" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
                <span className="text-sm font-medium text-foreground">{t('login.google', 'Google')}</span>
              </button>
              <button type="button" className="flex items-center justify-center px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors">
                <svg className="h-5 w-5 ms-2 shrink-0 fill-[#1877F2]" viewBox="0 0 24 24" aria-hidden="true"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                <span className="text-sm font-medium text-foreground">{t('login.facebook', 'Facebook')}</span>
              </button>
            </div>

             <p className="text-center text-sm text-muted-foreground font-medium">
                {t('login.noAccount', "Don't have an account?")}{' '}
                <Link href={`/signup?lang=${i18n.language}`} className="text-sunset-orange font-bold hover:underline">
                    {t('signup.signUpLink', 'Sign up')}
                </Link>
            </p>
        </form>
      </motion.div>
    </div>
  );
}
