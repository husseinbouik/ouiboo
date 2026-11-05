/**
 * #857: getAuthErrorMessage must give every login failure class a clear,
 * localized message — most importantly 5xx, which used to surface the
 * raw (English, internal) server detail verbatim.
 */
import { getAuthErrorMessage } from '../auth-errors';

const t = (key: string, fallback: string) => fallback;

describe('getAuthErrorMessage (#857)', () => {
  it('maps a 401 Unauthorized problem to invalidCredentials', () => {
    const info = getAuthErrorMessage(
      { response: { status: 401, data: { detail: 'Unauthorized' } } },
      t,
    );
    expect(info.key).toBe('invalidCredentials');
    expect(info.fallback).toBe('Incorrect email or password. Please try again.');
  });

  it('passes a human-readable 429 detail through as the message', () => {
    const info = getAuthErrorMessage(
      {
        response: {
          status: 429,
          data: { detail: 'Too many failed login attempts. Please try again later.' },
        },
      },
      t,
    );
    expect(info.fallback).toBe(
      'Too many failed login attempts. Please try again later.',
    );
  });

  it('maps a 500 to the localized serverError instead of the raw detail', () => {
    const info = getAuthErrorMessage(
      { response: { status: 500, data: { detail: 'Internal server error' } } },
      t,
    );
    expect(info.key).toBe('serverError');
    expect(info.fallback).toBe(
      'Something went wrong on our end. Please try again later.',
    );
    expect(info.fallback).not.toContain('Internal server error');
  });

  it('maps a 503 with a user-facing message to serverError as well', () => {
    const info = getAuthErrorMessage(
      {
        response: {
          status: 503,
          data: {
            message:
              'Rate limiting is temporarily unavailable. Please try again shortly.',
          },
        },
      },
      t,
    );
    expect(info.key).toBe('serverError');
  });

  it('treats a response-less failure as a network error', () => {
    const info = getAuthErrorMessage(new Error('socket hang up'), t);
    expect(info.key).toBe('networkError');
  });

  it('falls back to the generic message for an unknown ALL_CAPS code', () => {
    const info = getAuthErrorMessage(
      { response: { status: 400, data: { message: 'SOME_UNKNOWN_CODE' } } },
      t,
    );
    expect(info.key).toBe('genericError');
  });

  it('keeps the EMAIL_NOT_VERIFIED redirect mapping (401 class untouched)', () => {
    const info = getAuthErrorMessage(
      { response: { status: 401, data: { message: 'EMAIL_NOT_VERIFIED' } } },
      t,
    );
    expect(info.key).toBe('emailNotVerified');
    expect(info.redirect).toBe('/verify');
  });
});
