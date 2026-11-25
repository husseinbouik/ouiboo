'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import { ShieldCheck, RefreshCw } from 'lucide-react';
import { Button, OtpCodeInput, ThemeToggle, LanguageSwitcher } from '@ouiboo/ui';
import { AuthBrandLockup } from '../../components/AuthBrandLockup';
import { apiClient } from '@/lib/api-client';
import { useOtpVerification } from '@ouiboo/auth';
import { useTranslation } from 'react-i18next';

type TFunction = (key: string, fallback: string) => string;

const getFriendlyError = (t: TFunction, message?: string) => {
  if (!message) {
    return t('verify.errorDefault', 'Verification failed. Please check the code.');
  }

  switch (message) {
    case 'EMAIL_NOT_VERIFIED':
      return t('verify.errorNotVerified', 'Your account is not verified yet. Enter the code or request a new one.');
    case 'EMAIL_NOT_FOUND':
      return t('verify.errorEmailNotFound', 'We could not find an account for this email. Please sign up again.');
    case 'OTP_NOT_FOUND':
      return t('verify.errorOtpNotFound', 'We could not find an active verification code. Request a new code and try again.');
    case 'OTP_EXPIRED':
      return t('verify.errorOtpExpired', 'That code expired. Request a new one and try again.');
    case 'INVALID_OTP':
      return t('verify.errorInvalidOtp', 'That code is incorrect. Double-check and try again.');
    case 'OTP_RESEND_COOLDOWN':
      return t('verify.errorCooldown', 'You requested a new code recently. Please wait a moment before trying again.');
    default:
      if (message.toLowerCase().includes('expired')) {
        return t('verify.errorOtpExpired', 'That code expired. Request a new one and try again.');
      }
      return message;
  }
};

export default function VerifyEmailPage() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const email = searchParams.get('email');
  const reason = searchParams.get('reason');
  const initialError = reason === 'unverified'
    ? t('verify.errorNotVerifiedInitial', 'Your account is not verified yet. Enter the code we emailed you to continue.')
    : null;

  // #1023 (D2): the OTP state machine (six-box state, verify/resend
  // mutations, resend cooldown, session establishment) is shared with
  // agency via @ouiboo/auth; this page keeps its design and its
  // verify.* wording (its key names differ from agency's).
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
    mapError: (message) => getFriendlyError(t, message),
    enterAllDigitsMessage: t('verify.enterAllDigits', 'Please enter all 6 digits.'),
    successRedirect: '/',
  });

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6 font-sans relative overflow-hidden">
      {/* Theme + Language controls */}
      <div className="absolute top-4 end-4 z-10 flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
        {/* Background Blobs */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[40rem] h-[40rem] bg-success/10 rounded-full blur-3xl opacity-50" />
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-[40rem] h-[40rem] bg-ocean-500/10 rounded-full blur-3xl opacity-50" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card/90 backdrop-blur-xl p-12 rounded-4xl shadow-xl border border-border text-center max-w-md w-full space-y-8 relative z-10"
        >
          <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto shadow-sm">
            <ShieldCheck className="h-10 w-10 text-success" />
          </div>
          <div className="space-y-3">
              <h2 className="text-3xl font-bold text-foreground tracking-tight">{t('verify.verifiedTitle', 'Verified Successfully!')}</h2>
              <p className="text-muted-foreground font-medium">{t('verify.verifiedSubtitle', 'Welcome to Ouiboo. Redirecting you...')}</p>
          </div>
          <div className="flex justify-center pt-2">
              <div className="w-12 h-1 bg-muted rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ x: '-100%' }}
                    animate={{ x: '100%' }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                    className="w-full h-full bg-success"
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
        className="bg-card/90 backdrop-blur-xl p-10 rounded-4xl shadow-xl border border-border max-w-md w-full space-y-8 relative z-10"
      >
        <div className="text-center space-y-4">
             <div className="inline-flex items-center justify-center gap-2 mb-4 group">
                <AuthBrandLockup />
            </div>
          <h2 className="text-3xl font-bold text-foreground tracking-tight">{t('verify.title', 'Check your email')}</h2>
          <p className="text-muted-foreground font-medium text-sm">{t('verify.subtitle', 'We have sent a 6-digit verification code to')} <br/> <span className="font-semibold text-foreground">{email}</span></p>
        </div>

        <div className="bg-muted/60 border border-border rounded-2xl p-4 text-sm text-muted-foreground space-y-2">
          <p className="font-semibold text-foreground">{t('verify.stepsTitle', 'Verify in 3 easy steps')}</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>{t('verify.step1', 'Check your inbox for the 6-digit code.')}</li>
            <li>{t('verify.step2', 'Enter the code below.')}</li>
            <li>{t('verify.step3', 'We will finish setting up your account.')}</li>
          </ol>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <OtpCodeInput
            value={otp}
            onChange={setOtp}
            inputClassName="w-full h-14 text-center text-2xl font-bold bg-muted border border-border rounded-xl focus:border-sunset-orange focus:ring-2 focus:ring-sunset-orange/10 focus:bg-background outline-none transition-all text-foreground"
          />

          {error && (
            <div className="p-3 text-sm font-semibold text-danger bg-danger/10 border border-danger/20 rounded-xl flex items-center justify-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-danger" />
              {error}
            </div>
          )}

          <Button 
            type="submit" 
            disabled={isVerifying}
            className="w-full h-14 bg-deep-blue hover:bg-blue-900 text-white font-bold rounded-2xl shadow-lg shadow-blue-900/20 active:scale-95 transition-all text-lg"
          >
            {isVerifying ? t('verify.verifying', 'Verifying...') : t('verify.verifyCode', 'Verify Code')}
          </Button>
        </form>

        <div className="text-center space-y-4 pt-4 border-t border-border">
          <p className="text-sm font-medium text-muted-foreground">
            {t('verify.didntReceive', "Didn't receive the code?")}
          </p>
          <button 
            type="button" 
            onClick={resend}
            disabled={isResending || cooldown > 0}
            className="flex items-center gap-2 mx-auto text-sunset-orange font-bold text-sm uppercase tracking-wider hover:text-orange-600 disabled:opacity-50 transition-all active:scale-95"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isResending ? 'animate-spin' : ''}`} />
            {cooldown > 0 ? `${t('verify.resendIn', 'Resend in')} ${cooldown}s` : t('verify.resend', 'Resend')}
          </button>
          {cooldown > 0 && (
            <p className="text-xs text-muted-foreground">{t('verify.resendLimit', 'We limit resends to once every 30 seconds.')}</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}

