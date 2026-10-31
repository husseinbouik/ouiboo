/**
 * @jest-environment jsdom
 *
 * #730: mobile Lighthouse flagged target-size on the agency login page —
 * the "forgot password" link was 20px tall, the password-visibility
 * toggle a bare 20x20 icon, and the sign-up link 19px tall. All three
 * now carry the design system's 44px touch-target sizing.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AgencyLoginPage from './page';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: unknown) => (typeof fallback === 'string' ? fallback : key),
    i18n: { language: 'en' },
  }),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

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

jest.mock('@/lib/api-client', () => ({
  apiClient: { post: jest.fn() },
}));

jest.mock('@ouiboo/api-client', () => ({
  setBrowserAccessToken: jest.fn().mockResolvedValue(undefined),
  getAuthErrorMessage: jest.fn(() => ({ fallback: 'mock-auth-error' })),
}));

jest.mock('../../lib/i18n', () => ({}));

describe('AgencyLoginPage touch targets (#730)', () => {
  it('gives the small login controls the 44px design-system size', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <AgencyLoginPage />
      </QueryClientProvider>,
    );

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
