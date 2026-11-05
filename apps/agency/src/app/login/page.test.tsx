/**
 * @jest-environment jsdom
 *
 * #730: mobile Lighthouse flagged target-size on the agency login page —
 * the "forgot password" link was 20px tall, the password-visibility
 * toggle a bare 20x20 icon, and the sign-up link 19px tall. All three
 * now carry the design system's 44px touch-target sizing.
 *
 * #857: a valid login for the wrong kind of account (e.g. traveller
 * credentials in the agency app) used to establish a session, push to
 * /dashboard, and bounce silently back to /login. It must now stop at
 * the form with a clear message and never establish a session.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AgencyLoginPage from './page';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: unknown) => (typeof fallback === 'string' ? fallback : key),
    i18n: { language: 'en' },
  }),
}));

jest.mock('next/navigation', () => {
  const push = jest.fn();
  const replace = jest.fn();
  (globalThis as Record<string, unknown>).__routerMock = { push, replace };
  return { useRouter: () => (globalThis as Record<string, unknown>).__routerMock };
});

jest.mock('next/image', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

jest.mock('@ouiboo/ui', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
  ThemeToggle: () => null,
  LanguageSwitcher: () => null,
}));

jest.mock('../../components/AuthSideWordmark', () => ({
  AuthSideWordmark: () => null,
}));

jest.mock('@/components/AuthContext', () => ({
  useAuth: () => ({ user: null, isLoading: false, refetch: jest.fn() }),
}));

jest.mock('@/lib/api-client', () => {
  const post = jest.fn();
  (globalThis as Record<string, unknown>).__postMock = post;
  return { apiClient: { post } };
});

jest.mock('@ouiboo/api-client', () => {
  const setBrowserAccessToken = jest.fn().mockResolvedValue(undefined);
  (globalThis as Record<string, unknown>).__setTokenMock = setBrowserAccessToken;
  return {
    setBrowserAccessToken,
    getAuthErrorMessage: jest.fn(() => ({ fallback: 'mock-auth-error' })),
  };
});

jest.mock('../../lib/i18n', () => ({}));

const postMock = () => (globalThis as Record<string, unknown>).__postMock as jest.Mock;
const setTokenMock = () =>
  (globalThis as Record<string, unknown>).__setTokenMock as jest.Mock;
const routerMock = () =>
  (globalThis as Record<string, unknown>).__routerMock as { push: jest.Mock; replace: jest.Mock };

function renderLogin() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AgencyLoginPage />
    </QueryClientProvider>,
  );
}

async function submitLogin(container: HTMLElement, email: string, password: string) {
  fireEvent.change(container.querySelector('#email') as HTMLInputElement, {
    target: { value: email },
  });
  fireEvent.change(container.querySelector('#password') as HTMLInputElement, {
    target: { value: password },
  });
  fireEvent.click(screen.getByRole('button', { name: 'login.signIn' }));
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('AgencyLoginPage touch targets (#730)', () => {
  it('gives the small login controls the 44px design-system size', () => {
    renderLogin();

    const toggle = screen.getByRole('button', { name: 'login.showPassword' });
    expect(toggle.className).toContain('h-11');
    expect(toggle.className).toContain('w-11');

    expect(
      screen.getByRole('link', { name: 'login.forgotPassword' }).className,
    ).toContain('min-h-[44px]');
    expect(screen.getByRole('link', { name: 'login.signUpLink' }).className).toContain(
      'min-h-[44px]',
    );
  });
});

describe('AgencyLoginPage wrong-account feedback (#857)', () => {
  it('shows a clear message and establishes no session for a traveller account', async () => {
    postMock().mockResolvedValue({
      data: {
        accessToken: 'tok',
        user: { id: 'u1', email: 't@example.test', name: 'T', role: 'TRAVELER' },
      },
    });
    const { container } = renderLogin();

    await submitLogin(container, 't@example.test', 'secret');

    expect(await screen.findByText('login.wrongAccount')).toBeTruthy();
    expect(setTokenMock()).not.toHaveBeenCalled();
    expect(routerMock().push).not.toHaveBeenCalledWith('/dashboard');
  });

  it('shows the admin message and establishes no session for an MFA admin payload', async () => {
    postMock().mockResolvedValue({
      data: {
        mfaRequired: true,
        challengeToken: 'challenge',
        user: { id: 'a1', email: 'a@example.test', name: 'A', role: 'ADMIN' },
      },
    });
    const { container } = renderLogin();

    await submitLogin(container, 'a@example.test', 'secret');

    expect(await screen.findByText('login.adminAccount')).toBeTruthy();
    expect(setTokenMock()).not.toHaveBeenCalled();
    expect(routerMock().push).not.toHaveBeenCalledWith('/dashboard');
  });

  it('proceeds to the dashboard for an agency account', async () => {
    postMock().mockResolvedValue({
      data: {
        accessToken: 'tok',
        user: { id: 'g1', email: 'g@example.test', name: 'G', role: 'AGENCY' },
      },
    });
    const { container } = renderLogin();

    await submitLogin(container, 'g@example.test', 'secret');

    await waitFor(() => expect(routerMock().push).toHaveBeenCalledWith('/dashboard'));
    expect(setTokenMock()).toHaveBeenCalledWith('tok');
    expect(screen.queryByText('login.wrongAccount')).toBeNull();
  });
});
