'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams, useRouter } from 'next/navigation';
import { Mail, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react';
import { Button } from '@ouiboo/ui';
import { apiClient } from '@/lib/api-client';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

export default function VerifyEmailPage() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get('email');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!email) {
      router.push('/signup');
    }
  }, [email, router]);

  const verifyMutation = useMutation({
    mutationFn: async (otpString: string) => {
      const response = await apiClient.post('/auth/verify-email', {
        email,
        otp: otpString,
      });
      return response.data;
    },
    onSuccess: () => {
      setSuccess(true);
      setTimeout(() => {
        router.push('/');
      }, 2000);
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message || 'Verification failed. Please check the code.');
    },
  });

  const resendMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/auth/resend-otp', { email });
      return response.data;
    },
    onSuccess: () => {
      setError(null);
      alert('A new code has been sent to your email.');
    },
  });

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) value = value[value.length - 1];
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const otpString = otp.join('');
    if (otpString.length === 6) {
      verifyMutation.mutate(otpString);
    } else {
      setError('Please enter all 6 digits.');
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6 transition-colors duration-300">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card p-12 rounded-[2.5rem] shadow-2xl border border-border/50 text-center max-w-md w-full space-y-8"
        >
          <div className="w-24 h-24 bg-emerald-500/10 rounded-[2rem] flex items-center justify-center mx-auto shadow-inner">
            <ShieldCheck className="h-12 w-12 text-emerald-500" />
          </div>
          <div className="space-y-3">
              <h2 className="text-4xl font-black text-foreground font-display tracking-tight">Verified Successfully!</h2>
              <p className="text-muted-foreground font-medium">Welcome to Ouiboo. One moment while we get you home...</p>
          </div>
          <div className="flex justify-center pt-4">
              <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ x: '-100%' }}
                    animate={{ x: '100%' }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                    className="w-full h-full bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                  />
              </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6 transition-colors duration-300">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card p-10 lg:p-14 rounded-[3rem] shadow-2xl border border-border/50 max-w-md w-full space-y-10"
      >
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-sunset-orange/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-inner">
            <Mail className="h-10 w-10 text-sunset-orange" />
          </div>
          <h2 className="text-4xl font-black text-foreground font-display tracking-tight">Check your email</h2>
          <p className="text-muted-foreground font-medium px-4">We've sent a 6-digit verification code to <span className="font-bold text-foreground">{email}</span></p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-10">
          <div className="flex justify-between gap-3">
            {otp.map((digit, idx) => (
              <input
                key={idx}
                id={`otp-${idx}`}
                type="text"
                value={digit}
                onChange={(e) => handleChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className="w-full h-16 text-center text-3xl font-black bg-muted/50 dark:bg-slate-900 border-2 border-border/50 rounded-2xl focus:border-sunset-orange focus:ring-4 focus:ring-sunset-orange/10 focus:bg-background outline-none transition-all font-display"
                maxLength={1}
              />
            ))}
          </div>

          {error && (
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 text-sm font-bold text-red-500 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center gap-3"
            >
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              {error}
            </motion.div>
          )}

          <Button 
            type="submit" 
            disabled={verifyMutation.isPending}
            className="w-full h-16 bg-sunset-orange hover:bg-orange-600 text-white font-black rounded-2xl shadow-xl shadow-orange-900/20 active:scale-95 transition-all text-xl"
          >
            {verifyMutation.isPending ? 'Verifying...' : 'Verify Account'}
            {!verifyMutation.isPending && <ArrowRight className="ml-3 h-6 w-6 inline" />}
          </Button>
        </form>

        <div className="text-center space-y-6 pt-4 border-t border-border/50">
          <p className="text-sm font-medium text-muted-foreground">
            Didn't receive the code?
          </p>
          <button 
            type="button" 
            onClick={() => resendMutation.mutate()}
            disabled={resendMutation.isPending}
            className="flex items-center gap-2 mx-auto text-sunset-orange font-black text-sm uppercase tracking-widest hover:underline disabled:opacity-50 transition-all active:scale-95"
          >
            <RefreshCw className={`h-4 w-4 ${resendMutation.isPending ? 'animate-spin' : ''}`} />
            Resend Code
          </button>
        </div>
      </motion.div>
    </div>
  );
}
