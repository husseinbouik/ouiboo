/**
 * @jest-environment jsdom
 *
 * #418 (Council P0-13): admin login page — the MFA challenge,
 * forced-enrolment, and break-glass steps that follow the password.
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdminLoginPage from './page';
import { apiClient } from '@/lib/api-client';
import { setBrowserAccessToken } from '@ouiboo/api-client';

const pushMock = jest.fn();
const refetchMock = jest.fn().mockResolvedValue(undefined);
const postMock = apiClient.post as jest.Mock;
const setTokenMock = setBrowserAccessToken as jest.Mock;

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: unknown) => (typeof fallback === 'string' ? fallback : key),
    ready: true,
  }),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

jest.mock('@/components/AuthContext', () => ({
  useAuth: () => ({ refetch: refetchMock }),
}));

jest.mock('@/lib/api-client', () => ({
  apiClient: { post: jest.fn() },
}));

jest.mock('@ouiboo/api-client', () => ({
  setBrowserAccessToken: jest.fn().mockResolvedValue(undefined),
  getAuthErrorMessage: jest.fn(() => ({ fallback: 'mock-auth-error' })),
}));

jest.mock('@ouiboo/ui', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
  ThemeToggle: () => null,
  LanguageSwitcher: () => null,
  BetaBadge: () => null,
  // Session #3 P0-4 (#552): the login page renders the shared <Logo>.
  Logo: () => null,
}));

jest.mock('qrcode', () => ({
  __esModule: true,
  default: { toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,qr') },
}));

jest.mock('../../lib/i18n', () => ({}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <AdminLoginPage />
    </QueryClientProvider>,
  );
  const byId = (id: string) => {
    const el = utils.container.querySelector(`#${id}`);
    if (!el) throw new Error(`element #${id} not found`);
    return el;
  };
  return { ...utils, byId };
}

async function submitCredentials(byId: (id: string) => Element) {
  fireEvent.change(byId('username'), { target: { value: 'admin' } });
  fireEvent.change(byId('password'), { target: { value: 'correct-password' } });
  fireEvent.click(screen.getByRole('button', { name: 'login.authenticate' }));
  await waitFor(() =>
    expect(postMock).toHaveBeenCalledWith('/auth/login', {
      email: 'admin@ouiboo.local',
      password: 'correct-password',
    }),
  );
}

const adminTokens = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  user: { id: 'admin-1', email: 'admin@ouiboo.local', role: 'ADMIN' },
};

describe('AdminLoginPage (#418)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setTokenMock.mockResolvedValue(undefined);
  });

  it('routes an MFA-enrolled admin through the TOTP challenge before completing sign-in', async () => {
    postMock.mockImplementation(async (url: string) => {
      if (url === '/auth/login') return { data: { mfaRequired: true, challengeToken: 'ct-1' } };
      if (url === '/auth/mfa/verify') return { data: adminTokens };
      throw new Error(`unexpected POST ${url}`);
    });

    const { byId } = renderPage();
    await submitCredentials(byId);

    fireEvent.change(await screen.findByLabelText('Authenticator code'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify' }));

    await waitFor(() =>
      expect(postMock).toHaveBeenCalledWith('/auth/mfa/verify', { challengeToken: 'ct-1', code: '123456' }),
    );
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/'));
    expect(setTokenMock).toHaveBeenCalledWith('access-token');
    expect(refetchMock).toHaveBeenCalled();
  });

  it('supports the recovery-code variant of the MFA challenge', async () => {
    postMock.mockImplementation(async (url: string) => {
      if (url === '/auth/login') return { data: { mfaRequired: true, challengeToken: 'ct-2' } };
      if (url === '/auth/mfa/recovery') return { data: adminTokens };
      throw new Error(`unexpected POST ${url}`);
    });

    const { byId } = renderPage();
    await submitCredentials(byId);

    fireEvent.click(await screen.findByRole('button', { name: 'Use a recovery code' }));
    fireEvent.change(screen.getByLabelText('Recovery code'), { target: { value: 'AAAA-2345' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify' }));

    await waitFor(() =>
      expect(postMock).toHaveBeenCalledWith('/auth/mfa/recovery', { challengeToken: 'ct-2', recoveryCode: 'AAAA-2345' }),
    );
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/'));
  });

  it('keeps a wrong TOTP code on the challenge step with an inline error (#640)', async () => {
    postMock.mockImplementation(async (url: string) => {
      if (url === '/auth/login') return { data: { mfaRequired: true, challengeToken: 'ct-1' } };
      if (url === '/auth/mfa/verify') {
        const error = new Error('Unauthorized') as Error & { response?: unknown };
        error.response = { status: 401 };
        throw error;
      }
      throw new Error(`unexpected POST ${url}`);
    });

    const { byId } = renderPage();
    await submitCredentials(byId);

    fireEvent.change(await screen.findByLabelText('Authenticator code'), { target: { value: '000000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify' }));

    expect(
      await screen.findByText('That code was not accepted. Check the code and try again.'),
    ).toBeTruthy();
    // Still on the challenge step: the code field is present and no
    // navigation happened — the admin retries with the same challenge.
    expect(screen.getByLabelText('Authenticator code')).toBeTruthy();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('returns to credentials with an explanation when the challenge has expired (#640)', async () => {
    const expiredChallenge = `x.${Buffer.from(JSON.stringify({ exp: 1 })).toString('base64url')}.y`;
    postMock.mockImplementation(async (url: string) => {
      if (url === '/auth/login') return { data: { mfaRequired: true, challengeToken: expiredChallenge } };
      throw new Error(`unexpected POST ${url}`);
    });

    const { byId } = renderPage();
    await submitCredentials(byId);

    fireEvent.change(await screen.findByLabelText('Authenticator code'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify' }));

    expect(
      await screen.findByText('Your sign-in session expired. Enter your password again to get a new code prompt.'),
    ).toBeTruthy();
    // Back on the credentials step, and the expired challenge was never
    // sent to the API.
    expect(byId('username')).toBeTruthy();
    expect(postMock).not.toHaveBeenCalledWith('/auth/mfa/verify', expect.anything());
  });

  it('refuses a non-admin account even with valid tokens', async () => {
    postMock.mockResolvedValue({
      data: { accessToken: 'at', refreshToken: 'rt', user: { id: 'u-1', email: 't@x.io', role: 'TRAVELER' } },
    });

    const { byId } = renderPage();
    await submitCredentials(byId);

    expect(await screen.findByText('This account does not have admin access.')).toBeTruthy();
    expect(setTokenMock).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('signs in through the break-glass step', async () => {
    postMock.mockImplementation(async (url: string) => {
      if (url === '/auth/break-glass') return { data: adminTokens };
      throw new Error(`unexpected POST ${url}`);
    });

    const { byId } = renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Lost your authenticator/ }));

    fireEvent.change(byId('breakglass-email'), { target: { value: 'admin' } });
    fireEvent.change(byId('breakglass-password'), { target: { value: 'correct-password' } });
    fireEvent.change(byId('breakglass-code'), { target: { value: 'AAAAA-BBBBB-CCCCC-DDDDD' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in with break-glass secret' }));

    await waitFor(() =>
      expect(postMock).toHaveBeenCalledWith('/auth/break-glass', {
        email: 'admin@ouiboo.local',
        password: 'correct-password',
        code: 'AAAAA-BBBBB-CCCCC-DDDDD',
      }),
    );
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/'));
  });

  it('forces enrolment at login, shows recovery codes once, then completes sign-in', async () => {
    postMock.mockImplementation(async (url: string, _body?: unknown, config?: { headers?: Record<string, string> }) => {
      if (url === '/auth/login') return { data: { mfaEnrollmentRequired: true, challengeToken: 'et-1' } };
      if (url === '/auth/mfa/enrollment/start') {
        expect(config?.headers?.Authorization).toBe('Bearer et-1');
        return { data: { otpauthUrl: 'otpauth://totp/x', secret: 'JBSWY3DPEHPK3PXP', expiresInSeconds: 600 } };
      }
      if (url === '/auth/mfa/enrollment/confirm') {
        return { data: { ...adminTokens, recoveryCodes: ['AAAA-2345', 'BBBB-6789'] } };
      }
      throw new Error(`unexpected POST ${url}`);
    });

    const { byId } = renderPage();
    await submitCredentials(byId);

    expect(await screen.findByText('JBSWY3DPEHPK3PXP')).toBeTruthy();
    fireEvent.change(byId('enroll-code'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm and continue' }));

    expect(await screen.findByText('AAAA-2345')).toBeTruthy();
    expect(screen.getByText('BBBB-6789')).toBeTruthy();
    // Sign-in completes only after the admin confirms the codes are saved.
    expect(pushMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'I saved them — continue' }));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/'));
  });
});
