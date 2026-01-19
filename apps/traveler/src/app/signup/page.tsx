'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Input } from '@ouiboo/ui';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import '../../lib/i18n';

import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { type RegisterInput } from '@ouiboo/schemas';
import { apiClient } from '@/lib/api-client';

type TravelerSignupFormValues = Omit<RegisterInput, 'role'> & {
  acceptTerms: boolean;
};

export default function TravelerSignupPage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { register, handleSubmit, formState: { errors } } = useForm<TravelerSignupFormValues>({
    defaultValues: {
      acceptTerms: true,
    },
  });
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    setMounted(true);
    document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
  }, [i18n.language]);

  const signupMutation = useMutation({
    mutationFn: async (data: RegisterInput) => {
      const response = await apiClient.post('/auth/register', data);
      return response.data;
    },
    onSuccess: (data) => {
      const { accessToken, refreshToken, user } = data;
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', accessToken);
        localStorage.setItem('refresh_token', refreshToken);
      }
      router.push(`/verify?email=${user.email}`);
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message || 'Signup failed. Please try again.');
    }
  });

  const onSubmit = (data: TravelerSignupFormValues) => {
    setError(null);
    const { acceptTerms, ...formData } = data;
    signupMutation.mutate({ ...formData, role: 'TRAVELER' });
  };

  if (!mounted) return <div className="min-h-screen bg-background" />;

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-background overflow-hidden p-6 font-sans">
       {/* Background Blobs */}
      <div className="absolute top-0 left-0 -translate-y-1/2 -translate-x-1/2 w-[40rem] h-[40rem] bg-sunset-orange/10 dark:bg-sunset-orange/5 rounded-full blur-3xl opacity-50" />
      <div className="absolute bottom-0 right-0 translate-y-1/2 translate-x-1/2 w-[40rem] h-[40rem] bg-blue-100 dark:bg-blue-900/20 rounded-full blur-3xl opacity-50" />

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
          <h2 className="text-3xl font-bold text-foreground mb-2">{t('signup.title', 'Create Account')}</h2>
          <p className="text-muted-foreground font-medium text-sm">{t('signup.subtitle', 'Start your journey with us')}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-3">
                <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-foreground ml-1">{t('signup.name', 'Full Name')}</label>
                    <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground group-focus-within:text-sunset-orange transition-colors">
                            <User className="h-5 w-5" />
                        </div>
                        <Input
                            id="name"
                            type="text"
                            placeholder={t('signup.namePlaceholder', 'John Doe')}
                            className="pl-12 h-14 bg-muted border-border rounded-2xl focus:bg-background focus:ring-2 focus:ring-sunset-orange/10 focus:border-sunset-orange transition-all font-medium text-foreground placeholder:text-muted-foreground"
                            {...register('name', { required: 'Name is required' })}
                        />
                    </div>
                    {errors.name && <span className="text-red-500 text-xs font-semibold pl-1">{errors.name.message as string}</span>}
                </div>

                <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-foreground ml-1">{t('signup.email', 'Email')}</label>
                    <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground group-focus-within:text-sunset-orange transition-colors">
                            <Mail className="h-5 w-5" />
                        </div>
                        <Input
                            id="email"
                            type="email"
                            placeholder={t('signup.emailPlaceholder', 'hello@example.com')}
                            className="pl-12 h-14 bg-muted border-border rounded-2xl focus:bg-background focus:ring-2 focus:ring-sunset-orange/10 focus:border-sunset-orange transition-all font-medium text-foreground placeholder:text-muted-foreground"
                             {...register('email', { required: 'Email is required' })}
                        />
                    </div>
                    {errors.email && <span className="text-red-500 text-xs font-semibold pl-1">{errors.email.message as string}</span>}
                </div>

              {/* Password Input */}
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-gray-700">{t('signup.password')}</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t('signup.passwordPlaceholder', '********')}
                    className="pl-10 pr-12 h-12 bg-gray-50 border-gray-200 focus:bg-white focus:border-sunset-orange focus:ring-sunset-orange transition-all duration-200"
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

              {error && (
                <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                  {error}
                </div>
              )}

              <label className="flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-600">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-sunset-orange focus:ring-sunset-orange"
                  {...register('acceptTerms', { required: 'Please accept the terms to continue.' })}
                />
                <span>
                  {t('signup.acceptTerms')}{' '}
                  <Link href={`/terms?lang=${i18n.language}`} className="font-semibold text-sunset-orange hover:text-orange-600 hover:underline">
                    {t('signup.termsLink')}
                  </Link>{' '}
                  {t('signup.and')}{' '}
                  <Link href={`/privacy?lang=${i18n.language}`} className="font-semibold text-sunset-orange hover:text-orange-600 hover:underline">
                    {t('signup.privacyLink')}
                  </Link>
                  .
                </span>
              </label>
              {errors.acceptTerms && <p className="text-xs text-red-500">{errors.acceptTerms.message as string}</p>}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={signupMutation.isPending}
                 className="w-full h-14 bg-sunset-orange hover:bg-orange-600 text-white font-bold rounded-2xl shadow-lg shadow-orange-900/20 transition-all hover:scale-[1.02] active:scale-95 text-lg"
            >
                {signupMutation.isPending ? 'Creating Account...' : t('signup.createAccount', 'Register')}
            </Button>

            <p className="text-center text-sm text-gray-500 font-medium">
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
