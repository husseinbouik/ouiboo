'use client';

import type { AxiosError } from 'axios';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Input, ThemeToggle, LanguageSwitcher, BetaBadge, Logo } from '@ouiboo/ui';
import { useTranslation } from 'react-i18next';
import '../../lib/i18n';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/components/AuthContext';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, KeyRound, Lock, ShieldCheck, User } from 'lucide-react';
import { setBrowserAccessToken, getAuthErrorMessage } from '@ouiboo/api-client';
import QRCode from 'qrcode';

type AdminLoginForm = {
  username: string;
  password: string;
};

type ApiErrorResponse = {
  message?: string;
};

/** Shape of POST /auth/login (and MFA completion) responses. */
type AuthResult = {
  accessToken?: string;
  mfaRequired?: boolean;
  mfaEnrollmentRequired?: boolean;
  challengeToken?: string;
  recoveryCodes?: string[];
  user?: { id: string; email: string; name?: string | null; role: string };
};

// #418: after the password step an admin may land on an MFA challenge, a
// forced MFA enrolment (ADMIN_MFA_REQUIRED), or choose break-glass.
type LoginStep = 'credentials' | 'mfa' | 'enroll' | 'breakglass';

/**
 * #640: the challenge JWT carries its own expiry (5-minute TTL). The API
 * deliberately answers every MFA failure with the same generic 401 (no
 * oracle), so an expired challenge is recognised client-side from the
 * token's `exp` claim — for display only; the server stays
 * authoritative.
 */
function isChallengeExpired(token: string | null): boolean {
  if (!token) return false;
  try {
    const payload = token.split('.')[1];
    if (!payload) return false;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const claims = JSON.parse(atob(normalized)) as { exp?: number };
    return typeof claims.exp === 'number' && claims.exp * 1000 <= Date.now();
  } catch {
    return false;
  }
}

export default function AdminLoginPage() {
  const { t, ready } = useTranslation();
  const router = useRouter();
  const { refetch } = useAuth();
  const { register, handleSubmit, formState: { errors } } = useForm<AdminLoginForm>();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<LoginStep>('credentials');
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [useRecovery, setUseRecovery] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState('');
  const [breakGlassCode, setBreakGlassCode] = useState('');
  const [breakGlassEmail, setBreakGlassEmail] = useState('');
  const [breakGlassPassword, setBreakGlassPassword] = useState('');
  const [enrollSecret, setEnrollSecret] = useState<string | null>(null);
  const [enrollQr, setEnrollQr] = useState<string | null>(null);
  const [enrollCode, setEnrollCode] = useState('');
  const [issuedRecoveryCodes, setIssuedRecoveryCodes] = useState<string[] | null>(null);
  const [pendingTokens, setPendingTokens] = useState<AuthResult | null>(null);
  // If i18n never reports ready (e.g. resource load failure), stop showing
  // the loading spinner after a timeout and render the form anyway (#256).
  const [i18nTimedOut, setI18nTimedOut] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setI18nTimedOut(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  const completeLogin = async (data: AuthResult) => {
    // Verify the user has ADMIN role before granting access
    if (!data.accessToken || data.user?.role !== 'ADMIN') {
      setError(t('login.notAdmin', 'This account does not have admin access.'));
      return;
    }
    try {
      await setBrowserAccessToken(data.accessToken);
    } catch {
      setError('Failed to establish session. Please try again.');
      return;
    }
    await refetch();
    router.push('/');
  };

  const handleAuthResult = async (data: AuthResult) => {
    if (data?.mfaRequired && data?.challengeToken) {
      setChallengeToken(data.challengeToken);
      setUseRecovery(false);
      setMfaCode('');
      setRecoveryCode('');
      setStep('mfa');
      return;
    }
    if (data?.mfaEnrollmentRequired && data?.challengeToken) {
      setChallengeToken(data.challengeToken);
      setStep('enroll');
      enrollStartMutation.mutate(data.challengeToken);
      return;
    }
    await completeLogin(data);
  };

  const loginMutation = useMutation({
    mutationFn: async (payload: { email: string; password: string }) => {
      const response = await apiClient.post('/auth/login', payload);
      return response.data;
    },
    onSuccess: handleAuthResult,
    onError: (err: AxiosError<ApiErrorResponse>) => {
      const errorInfo = getAuthErrorMessage(err, (key, fallback) => t(key, fallback));
      setError(errorInfo.fallback);
    },
  });

  // #640: an expired challenge returns to the credentials step with an
  // explanation, instead of the misleading "code not accepted" error.
  const expireChallenge = () => {
    setStep('credentials');
    setChallengeToken(null);
    setIssuedRecoveryCodes(null);
    setPendingTokens(null);
    setError(t('login.mfa.expired', 'Your sign-in session expired. Enter your password again to get a new code prompt.'));
  };

  const mfaMutation = useMutation({
    mutationFn: async () => {
      const payload = useRecovery
        ? { challengeToken, recoveryCode: recoveryCode.trim() }
        : { challengeToken, code: mfaCode.trim() };
      const response = await apiClient.post(useRecovery ? '/auth/mfa/recovery' : '/auth/mfa/verify', payload);
      return response.data;
    },
    onSuccess: completeLogin,
    onError: () => {
      if (isChallengeExpired(challengeToken)) {
        expireChallenge();
        return;
      }
      setError(t('login.mfa.invalid', 'That code was not accepted. Check the code and try again.'));
    },
  });

  const breakGlassMutation = useMutation({
    mutationFn: async () => {
      const normalized = breakGlassEmail.trim();
      const email = normalized.includes('@') ? normalized : `${normalized}@ouiboo.local`;
      const response = await apiClient.post('/auth/break-glass', {
        email,
        password: breakGlassPassword,
        code: breakGlassCode.trim(),
      });
      return response.data;
    },
    onSuccess: completeLogin,
    onError: () => {
      setError(t('login.mfa.invalid', 'That code was not accepted. Check the code and try again.'));
    },
  });

  const enrollStartMutation = useMutation({
    mutationFn: async (token: string) => {
      const response = await apiClient.post('/auth/mfa/enrollment/start', {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data as { otpauthUrl: string; secret: string };
    },
    onSuccess: async (data) => {
      setEnrollSecret(data.secret);
      try {
        setEnrollQr(await QRCode.toDataURL(data.otpauthUrl, { width: 200, margin: 1 }));
      } catch {
        setEnrollQr(null);
      }
    },
    onError: () => {
      setError(t('login.mfa.enrollFailed', 'Could not start MFA enrolment. Please sign in again.'));
    },
  });

  const enrollConfirmMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/auth/mfa/enrollment/confirm', { code: enrollCode.trim() }, {
        headers: { Authorization: `Bearer ${challengeToken}` },
      });
      return response.data;
    },
    onSuccess: async (data) => {
      // Enrolment from the login challenge returns tokens AND the one-time
      // recovery codes. Show the codes first; Continue completes sign-in.
      if (Array.isArray(data?.recoveryCodes) && data.recoveryCodes.length > 0) {
        setIssuedRecoveryCodes(data.recoveryCodes);
        setPendingTokens(data);
        return;
      }
      await completeLogin(data);
    },
    onError: () => {
      if (isChallengeExpired(challengeToken)) {
        expireChallenge();
        return;
      }
      setError(t('login.mfa.invalid', 'That code was not accepted. Check the code and try again.'));
    },
  });

  const onSubmit = (data: AdminLoginForm) => {
    setError(null);
    const normalized = data.username.trim();
    const email = normalized.includes('@') ? normalized : `${normalized}@ouiboo.local`;
    loginMutation.mutate({ email, password: data.password });
  };

  const backToCredentials = () => {
    setStep('credentials');
    setChallengeToken(null);
    setError(null);
    setIssuedRecoveryCodes(null);
    setPendingTokens(null);
  };

  // Don't render raw translation keys while i18n is loading, but don't hang
  // forever on the spinner if i18n never becomes ready (#256).
  if (!ready && !i18nTimedOut) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-sunset-orange" aria-label="Loading" />
      </main>
    );
  }

  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] bg-background text-foreground">
      <div className="hidden lg:flex relative overflow-hidden bg-deep-blue text-white">
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.12),_transparent_60%)]" />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center gap-3">
            <Logo size={40} />
            <span className="text-2xl font-black tracking-tight">{t('login.brand')}</span>
            <BetaBadge />
          </div>
          <div className="space-y-4 max-w-md">
            <p className="text-4xl font-black leading-tight">{t('login.heroTitle')}</p>
            <p className="text-white/80 text-lg">
              {t('login.heroSubtitle')}
            </p>
            <div className="flex items-center gap-3 text-sm font-semibold text-white/90">
              <ShieldCheck className="h-5 w-5 text-sunset-orange" />
              {t('login.heroNote')}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md space-y-8">
          <div className="flex items-center justify-end gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
          <div className="text-center space-y-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-sunset-orange/10 text-sunset-orange font-black text-xl">
{t('login.brand').charAt(0)}
            </div>
            <h1 className="text-3xl font-black text-foreground">{t('login.title')}</h1>
            <p className="text-sm text-muted-foreground">{t('login.subtitle')}</p>
          </div>

          {error && step !== 'credentials' && (
            <div className="rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3 text-xs text-danger">
              {error}
            </div>
          )}

          {step === 'credentials' && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="username" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t('login.username')}</label>
                <div className="relative">
                  <User className="absolute start-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="username"
                    type="text"
  placeholder={t('login.usernamePlaceholder')}
                    className="ps-10 h-12 bg-input border-border focus:bg-background focus:border-deep-blue focus:ring-deep-blue"
                    {...register('username', { required: t('login.usernameRequired') })}
                  />
                </div>
                {errors.username && <p className="text-xs text-danger">{errors.username.message}</p>}
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t('login.password')}</label>
                <div className="relative">
                  <Lock className="absolute start-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="********"
                    className="ps-10 pe-12 h-12 bg-input border-border focus:bg-background focus:border-deep-blue focus:ring-deep-blue"
                    {...register('password', { required: t('login.passwordRequired') })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-danger">{errors.password.message}</p>}
              </div>

              <div className="rounded-2xl border border-ocean-500/20 bg-ocean-500/10 px-4 py-3 text-xs text-ocean-700 dark:text-ocean-300">
                {t('login.helper')}
              </div>

              {error && (
                <div className="rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3 text-xs text-danger">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={loginMutation.isPending}
                className="w-full h-12 bg-deep-blue hover:bg-deep-blue/90 text-white font-semibold"
              >
                {loginMutation.isPending ? t('login.authenticating') : t('login.authenticate')}
              </Button>

              <button
                type="button"
                onClick={() => { setError(null); setStep('breakglass'); }}
                className="w-full text-center text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                <KeyRound className="inline h-4 w-4 me-1" />
                {t('login.mfa.breakGlassLink', 'Lost your authenticator? Use a break-glass secret')}
              </button>
            </form>
          )}

          {step === 'mfa' && (
            <div className="space-y-5">
              <div className="text-center space-y-1">
                <h2 className="text-xl font-black">{t('login.mfa.title', 'Two-factor authentication')}</h2>
                <p className="text-sm text-muted-foreground">
                  {useRecovery
                    ? t('login.mfa.recoverySubtitle', 'Enter one of the recovery codes issued when you enrolled. Each code works once.')
                    : t('login.mfa.subtitle', 'Enter the 6-digit code from your authenticator app.')}
                </p>
              </div>
              {!useRecovery ? (
                <div className="space-y-2">
                  <label htmlFor="mfa-code" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t('login.mfa.codeLabel', 'Authenticator code')}</label>
                  <Input
                    id="mfa-code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                    className="h-12 text-center text-lg tracking-[0.4em]"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <label htmlFor="mfa-recovery" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t('login.mfa.recoveryLabel', 'Recovery code')}</label>
                  <Input
                    id="mfa-recovery"
                    autoComplete="one-time-code"
                    value={recoveryCode}
                    onChange={(e) => setRecoveryCode(e.target.value)}
                    className="h-12 text-center text-lg"
                  />
                </div>
              )}
              <Button
                type="button"
                disabled={mfaMutation.isPending || (useRecovery ? recoveryCode.trim().length < 4 : mfaCode.length !== 6)}
                onClick={() => {
                  if (isChallengeExpired(challengeToken)) { expireChallenge(); return; }
                  setError(null);
                  mfaMutation.mutate();
                }}
                className="w-full h-12 bg-deep-blue hover:bg-deep-blue/90 text-white font-semibold"
              >
                {mfaMutation.isPending ? t('login.mfa.verifying', 'Verifying...') : t('login.mfa.verify', 'Verify')}
              </Button>
              <div className="flex items-center justify-between text-xs font-semibold">
                <button type="button" onClick={() => setUseRecovery((prev) => !prev)} className="text-muted-foreground hover:text-foreground">
                  {useRecovery
                    ? t('login.mfa.useAuthenticator', 'Use authenticator code')
                    : t('login.mfa.useRecovery', 'Use a recovery code')}
                </button>
                <button type="button" onClick={backToCredentials} className="text-muted-foreground hover:text-foreground">
                  {t('login.mfa.back', 'Back to sign in')}
                </button>
              </div>
            </div>
          )}

          {step === 'enroll' && (
            <div className="space-y-5">
              <div className="text-center space-y-1">
                <h2 className="text-xl font-black">{t('login.mfa.enrollTitle', 'Set up two-factor authentication')}</h2>
                <p className="text-sm text-muted-foreground">
                  {t('login.mfa.enrollSubtitle', 'Admin accounts must enrol an authenticator app before continuing. Scan the code, then enter the 6-digit code it shows.')}
                </p>
              </div>
              {issuedRecoveryCodes ? (
                <div className="space-y-3 rounded-2xl border border-warning/30 bg-warning/10 px-4 py-4">
                  <p className="text-sm font-bold">{t('login.mfa.recoveryTitle', 'Save your recovery codes')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('login.mfa.recoveryWarning', 'Each code signs you in once if you lose your authenticator. They are shown only now — store them somewhere safe and offline.')}
                  </p>
                  <ul className="grid grid-cols-2 gap-2 font-mono text-sm">
                    {issuedRecoveryCodes.map((code) => (
                      <li key={code} className="rounded-lg bg-background px-3 py-2 text-center">{code}</li>
                    ))}
                  </ul>
                  <Button
                    type="button"
                    onClick={() => { if (pendingTokens) void completeLogin(pendingTokens); }}
                    className="w-full h-12 bg-deep-blue hover:bg-deep-blue/90 text-white font-semibold"
                  >
                    {t('login.mfa.continueButton', 'I saved them — continue')}
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex flex-col items-center gap-3">
                    {enrollQr && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={enrollQr} alt={t('login.mfa.qrAlt', 'Authenticator enrolment QR code')} width={200} height={200} className="rounded-xl border border-border bg-white p-1" />
                    )}
                    {enrollSecret && (
                      <code className="block break-all rounded-xl bg-muted px-3 py-2 text-center text-sm">{enrollSecret}</code>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="enroll-code" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t('login.mfa.codeLabel', 'Authenticator code')}</label>
                    <Input
                      id="enroll-code"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={enrollCode}
                      onChange={(e) => setEnrollCode(e.target.value.replace(/\D/g, ''))}
                      className="h-12 text-center text-lg tracking-[0.4em]"
                    />
                  </div>
                  <Button
                    type="button"
                    disabled={enrollConfirmMutation.isPending || enrollCode.length !== 6}
                    onClick={() => {
                      if (isChallengeExpired(challengeToken)) { expireChallenge(); return; }
                      setError(null);
                      enrollConfirmMutation.mutate();
                    }}
                    className="w-full h-12 bg-deep-blue hover:bg-deep-blue/90 text-white font-semibold"
                  >
                    {t('login.mfa.enrollConfirm', 'Confirm and continue')}
                  </Button>
                  <button type="button" onClick={backToCredentials} className="w-full text-center text-xs font-semibold text-muted-foreground hover:text-foreground">
                    {t('login.mfa.back', 'Back to sign in')}
                  </button>
                </>
              )}
            </div>
          )}

          {step === 'breakglass' && (
            <form
              className="space-y-5"
              onSubmit={(e) => {
                e.preventDefault();
                setError(null);
                breakGlassMutation.mutate();
              }}
            >
              <div className="text-center space-y-1">
                <h2 className="text-xl font-black">{t('login.mfa.breakGlassTitle', 'Break-glass sign-in')}</h2>
                <p className="text-sm text-muted-foreground">
                  {t('login.mfa.breakGlassSubtitle', 'For a lost authenticator only. Sign in with your email, password, and the one-time break-glass secret. Its use is audit-logged and alerts every admin.')}
                </p>
              </div>
              <div className="space-y-2">
                <label htmlFor="breakglass-email" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t('login.username')}</label>
                <Input
                  id="breakglass-email"
                  type="text"
                  autoComplete="username"
                  value={breakGlassEmail}
                  onChange={(e) => setBreakGlassEmail(e.target.value)}
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="breakglass-password" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t('login.password')}</label>
                <Input
                  id="breakglass-password"
                  type="password"
                  autoComplete="current-password"
                  value={breakGlassPassword}
                  onChange={(e) => setBreakGlassPassword(e.target.value)}
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="breakglass-code" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t('login.mfa.breakGlassCodeLabel', 'Break-glass secret')}</label>
                <Input
                  id="breakglass-code"
                  autoComplete="off"
                  value={breakGlassCode}
                  onChange={(e) => setBreakGlassCode(e.target.value)}
                  className="h-12 text-center font-mono"
                />
              </div>
              <Button
                type="submit"
                disabled={breakGlassMutation.isPending || !breakGlassEmail.trim() || !breakGlassPassword || breakGlassCode.trim().length < 8}
                className="w-full h-12 bg-deep-blue hover:bg-deep-blue/90 text-white font-semibold"
              >
                {t('login.mfa.breakGlassSubmit', 'Sign in with break-glass secret')}
              </Button>
              <button type="button" onClick={backToCredentials} className="w-full text-center text-xs font-semibold text-muted-foreground hover:text-foreground">
                {t('login.mfa.back', 'Back to sign in')}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
