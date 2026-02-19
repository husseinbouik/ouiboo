'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams, useRouter } from 'next/navigation';
import { Mail, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react';
import { Button } from '@ouiboo/ui';
import { apiClient } from '@/lib/api-client';
import { useMutation } from '@tanstack/react-query';

const RESEND_COOLDOWN_SECONDS = 30;

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
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!email) {
      router.push('/signup');
    }
  }, [email, router]);

  useEffect(() => {
    if (reason === 'unverified') {
      setError('Your account is not verified yet. Enter the code we emailed you to continue.');
    }
  }, [reason]);

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
        router.push('/dashboard');
      }, 2000);
    },
    onError: (err: any) => {
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
    onError: (err: any) => {
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-12 rounded-3xl shadow-xl text-center max-w-md w-full space-y-6"
        >
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <ShieldCheck className="h-10 w-10 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-deep-blue">Verified Successfully!</h2>
          <p className="text-gray-500">Welcome to Ouiboo. You are being redirected to your dashboard...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 lg:p-12 rounded-3xl shadow-xl max-w-md w-full space-y-8"
      >
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Mail className="h-8 w-8 text-deep-blue" />
          </div>
          <h2 className="text-3xl font-bold text-deep-blue">Check your email</h2>
          <p className="text-gray-500">We sent a 6-digit code to <span className="font-semibold text-gray-700">{email}</span></p>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-sm text-gray-600 space-y-2">
          <p className="font-semibold text-deep-blue">Verify in 3 easy steps</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Check your inbox for the 6-digit code.</li>
            <li>Enter the code below.</li>
            <li>We will finish setting up your agency.</li>
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
                className="w-12 h-14 text-center text-2xl font-bold bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-deep-blue focus:bg-white outline-none transition-all"
                maxLength={1}
              />
            ))}
          </div>

          {error && (
            <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl text-center">
              {error}
            </div>
          )}

          <Button 
            type="submit" 
            disabled={verifyMutation.isPending}
            className="w-full h-14 bg-deep-blue hover:bg-blue-900 text-white font-bold rounded-xl shadow-lg shadow-blue-900/20"
          >
            {verifyMutation.isPending ? 'Verifying...' : 'Verify Account'}
            {!verifyMutation.isPending && <ArrowRight className="ml-2 h-5 w-5 inline" />}
          </Button>
        </form>

        <div className="text-center space-y-4">
          <p className="text-sm text-gray-500">
            Didn't receive the code?
          </p>
          <button 
            type="button" 
            onClick={() => resendMutation.mutate()}
            disabled={resendMutation.isPending || cooldown > 0}
            className="flex items-center gap-2 mx-auto text-deep-blue font-bold hover:underline disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${resendMutation.isPending ? 'animate-spin' : ''}`} />
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
          </button>
          {cooldown > 0 && (
            <p className="text-xs text-gray-500">We limit resends to once every {RESEND_COOLDOWN_SECONDS} seconds.</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
