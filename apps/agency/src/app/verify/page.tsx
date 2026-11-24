'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import { Mail, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react';
import { Button, OtpCodeInput } from '@ouiboo/ui';
import { apiClient } from '@/lib/api-client';
import { useOtpVerification } from '@ouiboo/auth';
import { useTranslation } from 'react-i18next';
import '../../lib/i18n';

const RESEND_COOLDOWN_SECONDS = 30;

export default function VerifyEmailPage() {
  const { t, i18n } = useTranslation();
  const searchParams = useSearchParams();
  const email = searchParams.get('email');
  const reason = searchParams.get('reason');
  const initialError = reason === 'unverified'
    ? t('verify.accountNotVerified')
    : null;

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

  // #1023 (D2): the OTP state machine (six-box state, verify/resend
  // mutations, resend cooldown, session establishment) is shared with
  // traveler via @ouiboo/auth; this page keeps its design and its
  // verify.* wording (its key names differ from traveler's).
  const {
    otp,
    setOtp,
    error,
    success,
    cooldown,
    handleSubmit,
    resend,
    isVerifying,
    isResending,
  } = useOtpVerification({
    apiClient,
    email,
    initialError,
    mapError: (message) => getFriendlyError(message),
    enterAllDigitsMessage: t('verify.enterAllDigits'),
    successRedirect: '/dashboard',
  });

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
          <OtpCodeInput
            value={otp}
            onChange={setOtp}
            dir="ltr"
            inputClassName="w-12 h-14 text-center text-2xl font-bold bg-muted border-2 border-border rounded-xl focus:border-primary focus:bg-background outline-none transition-all"
            ariaLabelForDigit={(idx) => t('verify.otpDigit', { index: idx + 1 })}
          />

          {error && (
            <div className="p-3 text-sm text-danger bg-danger/10 border border-danger/30 rounded-xl text-center">
              {error}
            </div>
          )}

          <Button 
            type="submit" 
            disabled={isVerifying}
            className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-lg shadow-primary/20"
          >
            {isVerifying ? t('verify.verifying') : t('verify.verifyAccount')}
            {!isVerifying && <ArrowRight className="ms-2 h-5 w-5 inline rtl:rotate-180" />}
          </Button>
        </form>

        <div className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            {t('verify.didNotReceive')}
          </p>
          <button 
            type="button" 
            onClick={resend}
            disabled={isResending || cooldown > 0}
            className="flex items-center gap-2 mx-auto text-primary dark:text-accent font-bold hover:underline disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isResending ? 'animate-spin' : ''}`} />
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
