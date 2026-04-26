'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams, useRouter } from 'next/navigation';
import { ShieldCheck, RefreshCw } from 'lucide-react';
import { Button } from '@ouiboo/ui';
import { apiClient } from '@/lib/api-client';
import { useMutation } from '@tanstack/react-query';

const RESEND_COOLDOWN_SECONDS = 30;

type ApiError = {
  response?: {
    data?: {
      message?: string;
    };
  };
};

const getFriendlyError = (message?: string) => {
  if (!message) {
    return 'Verification failed. Please check the code.';
  }

  switch (message) {
    case 'EMAIL_NOT_VERIFIED':
      return 'Your account is not verified yet. Enter the code or request a new one.';
    case 'EMAIL_NOT_FOUND':
      return 'We could not find an account for this email. Please sign up again.';
    case 'OTP_NOT_FOUND':
      return 'We could not find an active verification code. Request a new code and try again.';
    case 'OTP_EXPIRED':
      return 'That code expired. Request a new one and try again.';
    case 'INVALID_OTP':
      return 'That code is incorrect. Double-check and try again.';
    case 'OTP_RESEND_COOLDOWN':
      return 'You requested a new code recently. Please wait a moment before trying again.';
    default:
      if (message.toLowerCase().includes('expired')) {
        return 'That code expired. Request a new one and try again.';
      }
      return message;
  }
};

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get('email');
  const reason = searchParams.get('reason');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const initialError = reason === 'unverified'
    ? 'Your account is not verified yet. Enter the code we emailed you to continue.'
    : null;
  const [error, setError] = useState<string | null>(initialError);
  const [success, setSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!email) {
      router.push('/signup');
    }
  }, [email, router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

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
    onError: (err: ApiError) => {
      setError(getFriendlyError(err?.response?.data?.message));
    },
  });

  const resendMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/auth/resend-otp', { email });
      return response.data;
    },
    onSuccess: () => {
      setError(null);
      setCooldown(RESEND_COOLDOWN_SECONDS);
    },
    onError: (err: ApiError) => {
      setError(getFriendlyError(err?.response?.data?.message));
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
      setError(null);
      verifyMutation.mutate(otpString);
    } else {
      setError('Please enter all 6 digits.');
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6 font-sans relative overflow-hidden">
        {/* Background Blobs */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[40rem] h-[40rem] bg-green-50 dark:bg-green-900/20 rounded-full blur-3xl opacity-50" />
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-[40rem] h-[40rem] bg-blue-50 dark:bg-blue-900/20 rounded-full blur-3xl opacity-50" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl p-12 rounded-[2.5rem] shadow-xl border border-gray-100 dark:border-slate-800 text-center max-w-md w-full space-y-8 relative z-10"
        >
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto shadow-sm">
            <ShieldCheck className="h-10 w-10 text-green-600 dark:text-green-400" />
          </div>
          <div className="space-y-3">
              <h2 className="text-3xl font-bold text-foreground tracking-tight">Verified Successfully!</h2>
              <p className="text-muted-foreground font-medium">Welcome to Ouiboo. Redirecting you...</p>
          </div>
          <div className="flex justify-center pt-2">
              <div className="w-12 h-1 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ x: '-100%' }}
                    animate={{ x: '100%' }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                    className="w-full h-full bg-green-500"
                  />
              </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6 font-sans relative overflow-hidden">
         {/* Background Blobs */}
      <div className="absolute top-0 left-0 -translate-y-1/2 -translate-x-1/2 w-[40rem] h-[40rem] bg-sunset-orange/10 dark:bg-sunset-orange/5 rounded-full blur-3xl opacity-50" />
      <div className="absolute bottom-0 right-0 translate-y-1/2 translate-x-1/2 w-[40rem] h-[40rem] bg-blue-100 dark:bg-blue-900/20 rounded-full blur-3xl opacity-50" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl p-10 rounded-[2.5rem] shadow-xl border border-gray-100 dark:border-slate-800 max-w-md w-full space-y-8 relative z-10"
      >
        <div className="text-center space-y-4">
             <div className="inline-flex items-center justify-center gap-2 mb-4 group">
                <div className="w-10 h-10 rounded-xl bg-deep-blue dark:bg-white text-white dark:text-deep-blue flex items-center justify-center font-bold text-xl shadow-lg group-hover:scale-105 transition-transform">O</div>
                <span className="text-2xl font-bold text-deep-blue dark:text-white">Ouiboo</span>
            </div>
          <h2 className="text-3xl font-bold text-foreground tracking-tight">Check your email</h2>
          <p className="text-muted-foreground font-medium text-sm">We have sent a 6-digit verification code to <br/> <span className="font-semibold text-foreground">{email}</span></p>
        </div>

        <div className="bg-muted/60 border border-border rounded-2xl p-4 text-sm text-muted-foreground space-y-2">
          <p className="font-semibold text-foreground">Verify in 3 easy steps</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Check your inbox for the 6-digit code.</li>
            <li>Enter the code below.</li>
            <li>We will finish setting up your account.</li>
          </ol>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="flex justify-between gap-2">
            {otp.map((digit, idx) => (
              <input
                key={idx}
                id={`otp-${idx}`}
                type="text"
                value={digit}
                onChange={(e) => handleChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className="w-full h-14 text-center text-2xl font-bold bg-gray-50 dark:bg-slate-800 border border-gray-200 rounded-xl focus:border-sunset-orange focus:ring-2 focus:ring-sunset-orange/10 focus:bg-white outline-none transition-all text-foreground"
                maxLength={1}
              />
            ))}
          </div>

          {error && (
            <div className="p-3 text-sm font-semibold text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl flex items-center justify-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 dark:bg-red-400" />
              {error}
            </div>
          )}

          <Button 
            type="submit" 
            disabled={verifyMutation.isPending}
            className="w-full h-14 bg-deep-blue hover:bg-blue-900 text-white font-bold rounded-2xl shadow-lg shadow-blue-900/20 active:scale-95 transition-all text-lg"
          >
            {verifyMutation.isPending ? 'Verifying...' : 'Verify Code'}
          </Button>
        </form>

        <div className="text-center space-y-4 pt-4 border-t border-gray-100">
          <p className="text-sm font-medium text-muted-foreground">
            Didn&rsquo;t receive the code?
          </p>
          <button 
            type="button" 
            onClick={() => resendMutation.mutate()}
            disabled={resendMutation.isPending || cooldown > 0}
            className="flex items-center gap-2 mx-auto text-sunset-orange font-bold text-sm uppercase tracking-wider hover:text-orange-600 disabled:opacity-50 transition-all active:scale-95"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${resendMutation.isPending ? 'animate-spin' : ''}`} />
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend'}
          </button>
          {cooldown > 0 && (
            <p className="text-xs text-muted-foreground">We limit resends to once every {RESEND_COOLDOWN_SECONDS} seconds.</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
