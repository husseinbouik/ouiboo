'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Input } from '@ouiboo/ui';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Mail, Lock, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import '../../lib/i18n';

import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { RegisterSchema, type RegisterInput } from '@ouiboo/schemas';
import { apiClient } from '@/lib/api-client';

export default function TravelerSignupPage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterInput>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      role: 'TRAVELER'
    }
  });

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
      console.error('Signup failed:', err);
      alert(err?.response?.data?.message || 'Signup failed. Please try again.');
    }
  });

  const onSubmit = (data: RegisterInput) => {
    signupMutation.mutate(data);
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
            src="https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2070&auto=format&fit=crop"
            alt="Travel Journey"
            className="w-full h-full object-cover opacity-50 dark:opacity-40"
          />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-tr from-deep-blue/80 via-transparent to-transparent z-10" />

        <div className="relative z-20 flex flex-col justify-between p-16 text-white w-full">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            <Link href="/" className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-sunset-orange text-white flex items-center justify-center font-black text-xl">O</div>
                <span className="text-3xl font-black tracking-tighter">Ouiboo</span>
            </Link>
          </motion.div>
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="mb-12"
          >
            <h2 className="text-5xl font-black mb-6 leading-tight font-display">Start your <br /> adventure today.</h2>
            <p className="text-xl text-blue-100/70 max-w-md font-medium leading-relaxed">
              Connect with millions of travelers and explore the authentic side of Morocco with curated local experts.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 lg:p-12 bg-background">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md space-y-10"
        >
          <div className="text-center lg:text-left space-y-3">
            <h2 className="text-4xl font-black text-foreground font-display">{t('signup.title')}</h2>
            <p className="text-muted-foreground font-medium">{t('signup.subtitle')}</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-bold text-foreground/80 ml-1">{t('signup.name')}</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-sunset-orange text-muted-foreground z-10">
                    <User className="h-5 w-5" />
                  </div>
                  <Input
                    id="name"
                    type="text"
                    placeholder={t('signup.namePlaceholder')}
                    className="pl-12 h-14 bg-muted/50 dark:bg-slate-900/50 border-border rounded-2xl focus:bg-background focus:ring-2 focus:ring-sunset-orange/20 focus:border-sunset-orange transition-all duration-300 font-medium"
                    {...register('name', { required: 'Name is required' })}
                  />
                </div>
                {errors.name && (
                    <motion.span initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-red-500 text-xs font-bold pl-1 block">
                        {errors.name.message as string}
                    </motion.span>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-bold text-foreground/80 ml-1">{t('signup.email')}</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-sunset-orange text-muted-foreground z-10">
                    <Mail className="h-5 w-5" />
                  </div>
                  <Input
                    id="email"
                    type="email"
                    placeholder={t('signup.emailPlaceholder')}
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
                <label htmlFor="password" className="text-sm font-bold text-foreground/80 ml-1">{t('signup.password')}</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-sunset-orange text-muted-foreground z-10">
                    <Lock className="h-5 w-5" />
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder={t('signup.passwordPlaceholder')}
                    className="pl-12 h-14 bg-muted/50 dark:bg-slate-900/50 border-border rounded-2xl focus:bg-background focus:ring-2 focus:ring-sunset-orange/20 focus:border-sunset-orange transition-all duration-300 font-medium"
                    {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'Password must be at least 6 characters' } })}
                  />
                </div>
                {errors.password && (
                    <motion.span initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-red-500 text-xs font-bold pl-1 block">
                        {errors.password.message as string}
                    </motion.span>
                )}
              </div>

              <Button
                type="submit"
                disabled={signupMutation.isPending}
                className="w-full h-14 bg-sunset-orange hover:bg-orange-600 text-white font-black rounded-2xl transition-all duration-300 shadow-xl shadow-orange-900/20 hover:scale-[1.02] active:scale-[0.98] border-none"
              >
                {signupMutation.isPending ? 'Creating account...' : t('signup.createAccount')} 
                {!signupMutation.isPending && <ArrowRight className="ml-2 h-5 w-5 inline" />}
              </Button>
            </div>
          </form>

          <p className="text-center text-sm font-medium text-muted-foreground p-4 bg-muted/20 rounded-2xl">
            {t('signup.hasAccount')}{' '}
            <Link href={`/login?lang=${i18n.language}`} className="font-black text-sunset-orange hover:text-orange-600 underline-offset-4 hover:underline">
              {t('signup.logInLink')}
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}