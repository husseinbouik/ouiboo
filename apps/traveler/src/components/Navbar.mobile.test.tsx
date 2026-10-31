/**
 * @jest-environment jsdom
 *
 * #648: the traveller mobile header overflowed — the theme toggle
 * vanished below sm and login/sign-up clipped off phone-width bars
 * in every locale. Locked layout contract (jsdom cannot measure
 * pixels, so the contract is structural):
 * - the theme toggle renders as a direct bar control (it is NOT
 *   inside the hidden-below-md selector cluster),
 * - sign-up renders in the bar at every width; the bar's login link
 *   is hidden below md because the mobile menu carries login,
 * - the mobile menu holds every destination plus the language and
 *   currency selectors,
 * - signed-in users keep the avatar trigger in the bar.
 */
import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { Navbar } from './Navbar';

let mockUser: any = null;

jest.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

jest.mock('next/link', () => {
  const Link = ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  );
  return Link;
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

jest.mock('@ouiboo/ui', () => ({
  Button: ({ children, asChild }: any) =>
    asChild ? <>{children}</> : <button type="button">{children}</button>,
  ThemeToggle: () => <button type="button" data-testid="theme-toggle" aria-label="common.toggleTheme" />,
  LanguageSwitcher: () => <div data-testid="language-switcher" />,
  BetaBadge: () => <span>BETA</span>,
  Logo: () => <span data-testid="logo" />,
}));

jest.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: undefined }),
}));

jest.mock('@/lib/api-client', () => ({
  apiClient: { get: jest.fn() },
}));

jest.mock('@/components/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, logout: jest.fn(), isLoading: false }),
}));

jest.mock('./CurrencySelector', () => ({
  CurrencySelector: () => <div data-testid="currency-selector" />,
}));

jest.mock('framer-motion', () => ({
  motion: {
    nav: ({ children, ...props }: any) => <nav {...props}>{children}</nav>,
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

beforeEach(() => {
  mockUser = null;
  window.matchMedia = jest.fn().mockImplementation((query: string) => ({
    matches: query.includes('hover'),
    media: query,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  })) as any;
});

describe('Navbar mobile layout (#648) — signed out', () => {
  it('keeps the theme toggle and sign-up in the bar; the bar login link is menu-only below lg', () => {
    render(<Navbar />);
    expect(screen.getByTestId('theme-toggle')).not.toBeNull();
    const join = screen.getByText('nav.joinNow');
    expect(join.closest('a')?.getAttribute('href')).toBe('/signup');
    // Exactly one login link before the menu opens: the bar copy,
    // hidden below lg by class.
    const logins = screen.getAllByText('nav.login');
    expect(logins).toHaveLength(1);
    expect(logins[0].className).toContain('hidden');
    expect(logins[0].className).toContain('lg:inline-flex');
  });

  it('the mobile menu holds the destinations, login and both selectors', () => {
    render(<Navbar />);
    fireEvent.click(screen.getByLabelText('nav.openMenu'));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('nav.explore')).not.toBeNull();
    expect(within(dialog).getByText('nav.featured')).not.toBeNull();
    expect(within(dialog).getByText('nav.wishlist')).not.toBeNull();
    expect(within(dialog).getByText('nav.support')).not.toBeNull();
    expect(within(dialog).getByText('nav.login')).not.toBeNull();
    expect(within(dialog).getByTestId('language-switcher')).not.toBeNull();
    expect(within(dialog).getByTestId('currency-selector')).not.toBeNull();
  });

  it('the selector cluster in the bar is desktop-only (hidden below lg)', () => {
    render(<Navbar />);
    const barSwitcher = screen.getAllByTestId('language-switcher')[0];
    expect(barSwitcher.parentElement?.className).toContain('hidden');
    expect(barSwitcher.parentElement?.className).toContain('lg:flex');
  });
});

describe('Navbar mobile layout (#648) — signed in', () => {
  it('keeps the avatar trigger in the bar and shows no sign-up', () => {
    mockUser = { id: 'u1', name: 'Sara Traveller', email: 'sara@example.com', role: 'TRAVELER' };
    render(<Navbar />);
    expect(screen.getByLabelText('nav.openProfileMenu')).not.toBeNull();
    expect(screen.getByTestId('theme-toggle')).not.toBeNull();
    expect(screen.queryByText('nav.joinNow')).toBeNull();
  });
});
