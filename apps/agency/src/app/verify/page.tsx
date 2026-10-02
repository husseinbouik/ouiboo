'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams, useRouter } from 'next/navigation';
import { Mail, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react';
import { Button } from '@ouiboo/ui';
import { apiClient } from '@/lib/api-client';
import { useMutation } from '@tanstack/react-query';
import { setBrowserAccessToken } from '@ouiboo/api-client';
import { useTranslation } from 'react-i18next';
import '../../lib/i18n';

const RESEND_COOLDOWN_SECONDS = 30;

type ApiError = {
  response?: {
    data?: {
      message?: string;
    };
  };
};

export default function VerifyEmailPage() {
  const { t, i18n } = useTranslation();
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get('email');
  const reason = searchParams.get('reason');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const initialError = reason === 'unverified'
    ? t('verify.accountNotVerified')
    : null;
  const [error, setError] = useState<string | null>(initialError);
  const [success, setSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
  }, [i18n.language]);

  const getFriendlyError = (message?: string) => {
    if (!message) {
      return t('verify.failedGeneric');
    }

    switch (message) {
      case 'EMAIL_NOT_VERIFIED':
        return t('verify.emailNotVerified');
      case 'EMAIL_NOT_FOUND':
        return t('verify.emailNotFound');
      case 'OTP_NOT_FOUND':
        return t('verify.otpNotFound');
      case 'OTP_EXPIRED':
        return t('verify.otpExpired');
      case 'INVALID_OTP':
        return t('verify.invalidOtp');
      case 'OTP_RESEND_COOLDOWN':
        return t('verify.otpResendCooldown');
      default:
        if (message.toLowerCase().includes('expired')) {
          return t('verify.otpExpired');
        }
        return message;
    }
  };

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
    onSuccess: (data) => {
      setBrowserAccessToken(data.accessToken);
      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard');
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
      setError(t('verify.enterAllDigits'));
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card p-12 rounded-3xl shadow-xl text-center max-w-md w-full space-y-6"
        >
          <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto">
            <ShieldCheck className="h-10 w-10 text-success" />
          </div>
          <h2 className="text-3xl font-bold text-foreground">{t('verify.verifiedSuccess')}</h2>
          <p className="text-muted-foreground">{t('verify.redirecting')}</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card p-8 lg:p-12 rounded-3xl shadow-xl max-w-md w-full space-y-8"
      >
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-primary/10 dark:bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Mail className="h-8 w-8 text-primary dark:text-accent" />
          </div>
          <h2 className="text-3xl font-bold text-foreground">{t('verify.checkEmail')}</h2>
          <p className="text-muted-foreground">{t('verify.codeSent')} <span className="font-semibold text-foreground">{email}</span></p>
        </div>

        <div className="bg-primary/10 dark:bg-primary/20 border border-primary/30 rounded-2xl p-4 text-sm text-muted-foreground space-y-2">
          <p className="font-semibold text-primary dark:text-accent">{t('verify.stepsTitle')}</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>{t('verify.step1')}</li>
            <li>{t('verify.step2')}</li>
            <li>{t('verify.step3')}</li>
          </ol>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="flex justify-between gap-2" dir="ltr">
            {otp.map((digit, idx) => (
              <input
                key={idx}
                id={`otp-${idx}`}
                type="text"
                value={digit}
                onChange={(e) => handleChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className="w-12 h-14 text-center text-2xl font-bold bg-muted border-2 border-border rounded-xl focus:border-primary focus:bg-background outline-none transition-all"
                maxLength={1}
                aria-label={t('verify.otpDigit', { index: idx + 1 })}
              />
            ))}
          </div>

          {error && (
            <div className="p-3 text-sm text-danger bg-danger/10 border border-danger/30 rounded-xl text-center">
              {error}
            </div>
          )}

          <Button 
            type="submit" 
            disabled={verifyMutation.isPending}
            className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-lg shadow-primary/20"
          >
            {verifyMutation.isPending ? t('verify.verifying') : t('verify.verifyAccount')}
            {!verifyMutation.isPending && <ArrowRight className="ms-2 h-5 w-5 inline rtl:rotate-180" />}
          </Button>
        </form>

        <div className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            {t('verify.didNotReceive')}
          </p>
          <button 
            type="button" 
            onClick={() => resendMutation.mutate()}
            disabled={resendMutation.isPending || cooldown > 0}
            className="flex items-center gap-2 mx-auto text-primary dark:text-accent font-bold hover:underline disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${resendMutation.isPending ? 'animate-spin' : ''}`} />
            {cooldown > 0 ? t('verify.resendIn', { seconds: cooldown }) : t('verify.resendCode')}
          </button>
          {cooldown > 0 && (
            <p className="text-xs text-muted-foreground">{t('verify.resendLimit', { seconds: RESEND_COOLDOWN_SECONDS })}</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
