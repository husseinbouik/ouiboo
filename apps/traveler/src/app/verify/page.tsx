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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-12 rounded-3xl shadow-xl text-center max-w-md w-full space-y-6"
        >
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <ShieldCheck className="h-10 w-10 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Verified Successfully!</h2>
          <p className="text-gray-500">Welcome to Ouiboo. One moment while we get you home...</p>
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
          <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Mail className="h-8 w-8 text-sunset-orange" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Check your email</h2>
          <p className="text-gray-500">We sent a verification code to <span className="font-semibold text-gray-700">{email}</span></p>
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
                className="w-12 h-14 text-center text-2xl font-bold bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-sunset-orange focus:bg-white outline-none transition-all"
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
            className="w-full h-14 bg-sunset-orange hover:bg-orange-600 text-white font-bold rounded-xl shadow-lg shadow-orange-900/10"
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
            disabled={resendMutation.isPending}
            className="flex items-center gap-2 mx-auto text-sunset-orange font-bold hover:underline disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${resendMutation.isPending ? 'animate-spin' : ''}`} />
            Resend Code
          </button>
        </div>
      </motion.div>
    </div>
  );
}
