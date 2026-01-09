'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Button, Input } from '@ouiboo/ui';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/components/AuthContext';
import '../../lib/i18n';

export default function TravelerLoginPage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { refetch } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors } } = useForm();

  useEffect(() => {
    setMounted(true);
    document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
  }, [i18n.language]);

  const loginMutation = useMutation({
    mutationFn: async (data: any) => {
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
    onError: (err: any) => {
      const message = err?.response?.data?.message;
      if (message === 'EMAIL_NOT_VERIFIED') {
        const email = (document.getElementById('email') as HTMLInputElement)?.value;
        router.push(`/verify?email=${email}`);
        return;
      }
      setError(message || 'Login failed. Please try again.');
    },
  });

  const onSubmit = (data: any) => {
    loginMutation.mutate(data);
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

                <div className="space-y-1.5">
                    <div className="flex items-center justify-between ml-1">
                        <label className="text-sm font-semibold text-foreground">{t('login.password', 'Password')}</label>
                        <a href="#" className="text-xs font-semibold text-sunset-orange hover:text-orange-600 transition-colors">{t('login.forgotPassword', 'Forgot password?')}</a>
                    </div>
                    <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground group-focus-within:text-sunset-orange transition-colors">
                            <Lock className="h-5 w-5" />
                        </div>
                        <Input 
                            id="password" 
                            type="password" 
                            placeholder="••••••••"
                            className="pl-12 h-14 bg-muted border-border rounded-2xl focus:bg-background focus:ring-2 focus:ring-sunset-orange/10 focus:border-sunset-orange transition-all font-medium text-foreground placeholder:text-muted-foreground"
                            {...register('password', { required: 'Password is required' })} 
                        />
                    </div>
                    {errors.password && <span className="text-red-500 text-xs font-semibold pl-1">{errors.password.message as string}</span>}
                </div>
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
                className="w-full h-14 bg-deep-blue hover:bg-blue-900 text-white font-bold rounded-2xl shadow-lg shadow-blue-900/20 transition-all hover:scale-[1.02] active:scale-95 text-lg"
            >
                {loginMutation.isPending ? 'Verified...' : t('login.signIn', 'Sign In')}
            </Button>

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
