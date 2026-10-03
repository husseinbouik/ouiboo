/**
 * Shared auth error handling utility.
 * Maps API error responses to user-friendly, translatable message keys.
 * Use in all apps (traveler, agency, admin) for consistent login/signup error UX.
 *
 * Addresses #77 — previously each app hand-rolled its own error mapping,
 * leading to the same silent-failure bug in 3 places (#54, #55, #56).
 */

export interface AuthErrorInfo {
  /** Translation key suffix, e.g. 'invalidCredentials' -> t('auth.errors.invalidCredentials') */
  key: string;
  /** Fallback English message if translation is missing */
  fallback: string;
  /** Whether this error should trigger a redirect (e.g. to verification) */
  redirect?: string;
  /** The raw error code from the API, for logging */
  code?: string;
}

const ERROR_MAP: Record<string, Omit<AuthErrorInfo, 'code'>> = {
  INVALID_CREDENTIALS: {
    key: 'invalidCredentials',
    fallback: 'Incorrect email or password. Please try again.',
  },
  Unauthorized: {
    key: 'invalidCredentials',
    fallback: 'Incorrect email or password. Please try again.',
  },
  EMAIL_NOT_VERIFIED: {
    key: 'emailNotVerified',
    fallback: 'Please verify your email before signing in.',
    redirect: '/verify',
  },
  EMAIL_ALREADY_IN_USE: {
    key: 'emailInUse',
    fallback: 'This email is already registered. Try signing in instead.',
  },
  USER_NOT_FOUND: {
    key: 'userNotFound',
    fallback: 'No account found with this email.',
  },
  INVALID_OTP: {
    key: 'invalidOtp',
    fallback: 'The verification code is incorrect. Please try again.',
  },
  OTP_EXPIRED: {
    key: 'otpExpired',
    fallback: 'The verification code has expired. Request a new one.',
  },
  JWT_NOT_CONFIGURED: {
    key: 'serverError',
    fallback: 'Something went wrong on our end. Please try again later.',
  },
};

/**
 * Extract a human-readable error from an API error response.
 * Handles RFC 7807 problem details (detail field), NestJS errors (message field),
 * and network failures (no response).
 *
 * @param err - The error caught from an API call (axios error or similar)
 * @param t - Translation function, e.g. (key, fallback) => string
 * @returns AuthErrorInfo with translation key, fallback, and optional redirect
 */
export function getAuthErrorMessage(
  err: unknown,
  t: (key: string, fallback: string) => string = (_key, fallback) => fallback,
): AuthErrorInfo {
  // Network error — no response from server
  const response = (err as { response?: unknown })?.response;
  if (!response) {
    return {
      key: 'networkError',
      fallback: 'Cannot reach the server. Please check your connection and try again.',
    };
  }

  const data = (response as { data?: unknown })?.data;
  let code: string | undefined;

  if (typeof data === 'string') {
    code = data;
  } else if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    // RFC 7807 problem details use 'detail'; NestJS uses 'message'
    const raw = obj.message ?? obj.detail ?? obj.error;
    if (typeof raw === 'string') {
      code = raw;
    }
  }

  if (code && ERROR_MAP[code]) {
    const mapped = ERROR_MAP[code];
    return {
      key: mapped.key,
      fallback: t(`auth.errors.${mapped.key}`, mapped.fallback),
      redirect: mapped.redirect,
      code,
    };
  }

  // Human-readable message from backend (not an ALL_CAPS code)
  if (code && !/^[A-Z][A-Z0-9_]*$/.test(code)) {
    return { key: 'serverMessage', fallback: code, code };
  }

  // Unknown error — log the code, show generic message
  return {
    key: 'genericError',
    fallback: t('auth.errors.genericError', 'Something went wrong. Please try again.'),
    code,
  };
}
