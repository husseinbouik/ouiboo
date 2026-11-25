'use client';

/**
 * Email-OTP verification state machine (#1023, finding D2).
 *
 * Both verify pages (traveler + agency) carried a verbatim copy of
 * this machine: the six-box OTP state, the verify/resend mutations,
 * the 30-second resend cooldown, the missing-email bounce, and the
 * session-establishment error path. It lives here now, once.
 *
 * The pages keep their own markup (their Phase 2/4 council designs
 * differ) and their own error wording: each app supplies `mapError`
 * because the two apps name their verify.* i18n keys differently —
 * unifying the key names is a copy change, not a refactor, and is
 * left to a dedicated i18n pass.
 */
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import type { AxiosInstance } from 'axios';
import { setBrowserAccessToken } from '@ouiboo/api-client';

type ApiError = {
  response?: {
    data?: {
      message?: string;
    };
  };
};

export interface UseOtpVerificationOptions {
  apiClient: AxiosInstance;
  /** The email being verified (from the page's ?email= param). */
  email: string | null;
  /** Error shown on arrival (e.g. the ?reason=unverified notice), already localised by the page. */
  initialError?: string | null;
  /** Maps an API error message to the app's localised friendly error. */
  mapError: (message?: string) => string;
  /** Localised "enter all 6 digits" message. */
  enterAllDigitsMessage: string;
  /** Where to send the user after the success beat. */
  successRedirect: string;
  /** Where to bounce when no email is present. Default '/signup'. */
  missingEmailRedirect?: string;
  /** Resend cooldown in seconds. Default 30. */
  resendCooldownSeconds?: number;
  /** Shown when verification succeeded but the session could not be established. */
  sessionErrorMessage?: string;
}

const DEFAULT_SESSION_ERROR =
  'Verification succeeded but we could not start your session. Please try again.';

export function useOtpVerification({
  apiClient,
  email,
  initialError = null,
  mapError,
  enterAllDigitsMessage,
  successRedirect,
  missingEmailRedirect = '/signup',
  resendCooldownSeconds = 30,
  sessionErrorMessage = DEFAULT_SESSION_ERROR,
}: UseOtpVerificationOptions) {
  const router = useRouter();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState<string | null>(initialError);
  const [success, setSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!email) {
      router.push(missingEmailRedirect);
    }
  }, [email, router, missingEmailRedirect]);

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
    onSuccess: async (data) => {
      try {
        await setBrowserAccessToken(data.accessToken);
      } catch {
        setError(sessionErrorMessage);
        return;
      }
      setSuccess(true);
      setTimeout(() => {
        router.push(successRedirect);
      }, 2000);
    },
    onError: (err: ApiError) => {
      setError(mapError(err?.response?.data?.message));
    },
  });

  const resendMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/auth/resend-otp', { email });
      return response.data;
    },
    onSuccess: () => {
      setError(null);
      setCooldown(resendCooldownSeconds);
    },
    onError: (err: ApiError) => {
      setError(mapError(err?.response?.data?.message));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const otpString = otp.join('');
    if (otpString.length === 6) {
      setError(null);
      verifyMutation.mutate(otpString);
    } else {
      setError(enterAllDigitsMessage);
    }
  };

  return {
    otp,
    setOtp,
    error,
    setError,
    success,
    cooldown,
    handleSubmit,
    resend: () => resendMutation.mutate(),
    isVerifying: verifyMutation.isPending,
    isResending: resendMutation.isPending,
  };
}
