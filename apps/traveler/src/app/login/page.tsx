'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Button, Input } from '@ouiboo/ui';
import { useTranslation } from 'react-i18next';
import '../../lib/i18n';
export default function TravelerLoginPage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
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
    onSuccess: (data) => {
      const { accessToken, refreshToken } = data;
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', accessToken);
        localStorage.setItem('refresh_token', refreshToken);
      }
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
    <div className="min-h-screen flex bg-background text-foreground transition-all duration-300">
      {/* Left Side - Image */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-slate-950">
        <motion.div 
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.5 }}
          className="absolute inset-0"
        >
          <img 
            src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop" 
            alt="Travel Adventure" 
            className="w-full h-full object-cover opacity-50 dark:opacity-40"
          />
        </motion.div>
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-tr from-deep-blue/80 via-transparent to-transparent z-10" />
        
        <div className="relative z-20 flex flex-col justify-between p-16 text-white w-full">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            <Link href="/" className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-sunset-orange text-white flex items-center justify-center font-black text-xl">O</div>
                <span className="text-3xl font-black tracking-tight tracking-tighter">Ouiboo</span>
            </Link>
          </motion.div>
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.8 }}
          >
            <h2 className="text-5xl font-black mb-6 leading-tight font-display">Explore the world <br /> with confidence.</h2>
            <p className="text-xl text-blue-100/70 max-w-md font-medium leading-relaxed">
              Join thousands of travelers discovering unique experiences and unforgettable journeys across Morocco.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-12 bg-background">
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md space-y-10"
        >
          <div className="text-center lg:text-left space-y-3">
            <h2 className="text-4xl font-black text-foreground font-display">{t('login.title')}</h2>
            <p className="text-muted-foreground font-medium">{t('login.subtitle')}</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-bold text-foreground/80 ml-1">{t('login.email')}</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-sunset-orange text-muted-foreground z-10">
                    <Mail className="h-5 w-5" />
                  </div>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder={t('login.emailPlaceholder')}
                    className="pl-12 h-14 bg-muted/50 dark:bg-slate-900/50 border-border rounded-2xl focus:bg-background focus:ring-2 focus:ring-sunset-orange/20 focus:border-sunset-orange transition-all duration-300 font-medium"
                    {...register('email', { required: 'Email is required' })} 
                  />
                </div>
                {errors.email && (
                    <motion.span initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-red-500 text-xs font-bold pl-1 block">
                        {errors.email.message as string}
                    </motion.span>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between ml-1">
                  <label htmlFor="password" className="text-sm font-bold text-foreground/80">{t('login.password')}</label>
                  <a href="#" className="text-xs font-bold text-sunset-orange hover:underline">{t('login.forgotPassword')}</a>
                </div>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-sunset-orange text-muted-foreground z-10">
                    <Lock className="h-5 w-5" />
                  </div>
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder={t('login.passwordPlaceholder')}
                    className="pl-12 h-14 bg-muted/50 dark:bg-slate-900/50 border-border rounded-2xl focus:bg-background focus:ring-2 focus:ring-sunset-orange/20 focus:border-sunset-orange transition-all duration-300 font-medium"
                    {...register('password', { required: 'Password is required' })} 
                  />
                </div>
                {errors.password && (
                    <motion.span initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-red-500 text-xs font-bold pl-1 block">
                        {errors.password.message as string}
                    </motion.span>
                )}
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 text-sm font-bold text-red-500 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3"
              >
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                {error}
              </motion.div>
            )}

            <Button 
              type="submit" 
              disabled={loginMutation.isPending}
              className="w-full h-14 bg-sunset-orange hover:bg-orange-600 text-white font-black rounded-2xl transition-all duration-300 shadow-xl shadow-orange-900/20 hover:scale-[1.02] active:scale-[0.98] border-none"
            >
              {loginMutation.isPending ? 'Signing in...' : t('login.signIn')} 
              {!loginMutation.isPending && <ArrowRight className="ml-2 h-5 w-5 inline" />}
            </Button>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest">
                <span className="bg-background px-4 text-muted-foreground">{t('login.orContinue')}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button type="button" className="flex items-center justify-center gap-3 px-4 py-3.5 border border-border rounded-2xl hover:bg-muted/50 transition-all duration-300 font-bold text-sm">
                <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="h-5 w-5" alt="Google" />
                <span>Google</span>
              </button>
              <button type="button" className="flex items-center justify-center gap-3 px-4 py-3.5 border border-border rounded-2xl hover:bg-muted/50 transition-all duration-300 font-bold text-sm">
                <img src="https://www.svgrepo.com/show/475647/facebook-color.svg" className="h-5 w-5" alt="Facebook" />
                <span>Facebook</span>
              </button>
            </div>
          </form>

          <p className="text-center text-sm font-medium text-muted-foreground p-4 bg-muted/20 rounded-2xl">
            {t('login.noAccount')}{' '}
            <Link href={`/signup?lang=${i18n.language}`} className="font-black text-sunset-orange hover:text-orange-600 underline-offset-4 hover:underline">
              {t('login.signUpLink')}
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
