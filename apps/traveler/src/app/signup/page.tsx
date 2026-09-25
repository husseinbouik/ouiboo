'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input } from '@ouiboo/ui';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import '../../lib/i18n';

import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { type RegisterInput } from '@ouiboo/schemas';
import { apiClient } from '@/lib/api-client';
import { UserRole } from '@ouiboo/types';

const TravelerSignupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: "Please accept the terms to continue.",
  }),
});

type TravelerSignupFormValues = z.infer<typeof TravelerSignupSchema>;

type ApiError = {
  response?: {
    data?: {
      message?: string;
    };
  };
};

export default function TravelerSignupPage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { register, handleSubmit, formState: { errors } } = useForm<TravelerSignupFormValues>({
    resolver: zodResolver(TravelerSignupSchema),
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
    onSuccess: (data) => {
      router.push(`/verify?email=${encodeURIComponent(data.email)}`);
    },
    onError: (err: ApiError) => {
      const message = err?.response?.data?.message;
      if (message === 'EMAIL_ALREADY_IN_USE') {
        setError(t('signup.emailInUse', 'An account with this email already exists. Try logging in instead.'));
        return;
      }
      if (message === 'JWT_NOT_CONFIGURED') {
        setError(t('signup.serverError', 'The server is not fully configured. Please try again later or contact support.'));
        return;
      }
      setError(message || t('signup.errorFailed', 'Signup failed. Please try again.'));
    }
  });

  const onSubmit = (data: TravelerSignupFormValues) => {
    setError(null);
    signupMutation.mutate({
      email: data.email,
      name: data.name,
      password: data.password,
      role: UserRole.Traveler,
    });
  };

  if (!mounted) return <div className="min-h-screen bg-background" />;

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-background overflow-hidden p-6 font-sans">
       {/* Background Blobs */}
      <div className="absolute top-0 start-0 -translate-y-1/2 -translate-x-1/2 rtl:translate-x-1/2 w-[40rem] h-[40rem] bg-sunset-orange/10 dark:bg-sunset-orange/5 rounded-full blur-3xl opacity-50 pointer-events-none" />
      <div className="absolute bottom-0 end-0 translate-y-1/2 translate-x-1/2 rtl:-translate-x-1/2 w-[40rem] h-[40rem] bg-blue-100 dark:bg-blue-900/20 rounded-full blur-3xl opacity-50 pointer-events-none" />

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
          <h2 className="text-3xl font-bold text-foreground mb-2">{t('signup.title', 'Create Account')}</h2>
          <p className="text-muted-foreground font-medium text-sm">{t('signup.subtitle', 'Start your journey with us')}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-3">
                <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-foreground ms-1">{t('signup.name', 'Full Name')}</label>
                    <div className="relative group">
                        <div className="absolute start-4 top-1/2 -translate-y-1/2 text-foreground group-focus-within:text-sunset-orange transition-colors">
                            <User className="h-5 w-5" />
                        </div>
                        <Input
                            id="name"
                            type="text"
                            placeholder={t('signup.namePlaceholder', 'Your full name')}
                            className="ps-12 h-14 bg-muted border-border rounded-2xl focus:bg-background focus:ring-2 focus:ring-sunset-orange/10 focus:border-sunset-orange transition-all font-medium text-foreground placeholder:text-muted-foreground"
                            {...register('name')}
                        />
                    </div>
                    {errors.name && <span className="text-danger text-xs font-semibold ps-1">{errors.name.message as string}</span>}
                </div>

                <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-foreground ms-1">{t('signup.email', 'Email')}</label>
                    <div className="relative group">
                        <div className="absolute start-4 top-1/2 -translate-y-1/2 text-foreground group-focus-within:text-sunset-orange transition-colors">
                            <Mail className="h-5 w-5" />
                        </div>
                        <Input
                            id="email"
                            type="email"
                            placeholder={t('signup.emailPlaceholder', 'hello@example.com')}
                            className="ps-12 h-14 bg-muted border-border rounded-2xl focus:bg-background focus:ring-2 focus:ring-sunset-orange/10 focus:border-sunset-orange transition-all font-medium text-foreground placeholder:text-muted-foreground"
                            {...register('email')}
                        />
                    </div>
                    {errors.email && <span className="text-danger text-xs font-semibold ps-1">{errors.email.message as string}</span>}
                </div>
            </div>

              {/* Password Input */}
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-foreground">{t('signup.password', 'Password')}</label>
                <div className="relative">
                  <Lock className="absolute start-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t('signup.passwordPlaceholder', '********')}
                    className="ps-10 pe-12 h-12 bg-muted border-border focus:bg-background focus:border-sunset-orange focus:ring-sunset-orange transition-all duration-200"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? t('signup.hidePassword', 'Hide password') : t('signup.showPassword', 'Show password')}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">{t('signup.passwordHint', 'Must be at least 8 characters')}</p>
                {errors.password && <span className="text-danger text-xs font-semibold ps-1">{errors.password.message as string}</span>}
              </div>

              {error && (
                <div className="rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">
                  {error}
                </div>
              )}

              <label className="flex items-start gap-2 rounded-lg border border-border bg-muted px-3 py-3 text-sm text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-border text-sunset-orange focus:ring-sunset-orange"
                  {...register('acceptTerms')}
                />
                <span>
                  {t('signup.acceptTerms', 'I accept the')}{' '}
                  <Link href={`/terms?lang=${i18n.language}`} className="font-semibold text-sunset-orange hover:text-orange-600 hover:underline">
                    {t('signup.termsLink', 'Terms of Service')}
                  </Link>{' '}
                  {t('signup.and', 'and')}{' '}
                  <Link href={`/privacy?lang=${i18n.language}`} className="font-semibold text-sunset-orange hover:text-orange-600 hover:underline">
                    {t('signup.privacyLink', 'Privacy Policy')}
                  </Link>
                  .
                </span>
              </label>
              {errors.acceptTerms && <p className="text-xs text-danger ps-1">{errors.acceptTerms.message as string}</p>}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={signupMutation.isPending}
                className="w-full h-14 bg-sunset-orange hover:bg-orange-600 text-white font-bold rounded-2xl shadow-lg shadow-orange-900/20 transition-all hover:scale-[1.02] active:scale-95 text-lg"
              >
                {signupMutation.isPending ? t('signup.creatingAccount', 'Creating Account...') : t('signup.createAccount', 'Register')}
              </Button>

            <p className="text-center text-sm text-muted-foreground font-medium">
                {t('signup.hasAccount', 'Already have an account?')}{' '}
                <Link href={`/login?lang=${i18n.language}`} className="text-deep-blue dark:text-sunset-orange font-bold hover:underline">
                    {t('signup.logInLink', 'Sign in')}
                </Link>
            </p>
        </form>
      </motion.div>
    </div>
  );
}
