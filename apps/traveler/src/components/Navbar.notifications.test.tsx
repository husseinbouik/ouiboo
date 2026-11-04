/**
 * @jest-environment jsdom
 *
 * #849: the traveller header had NO notifications entry point on any
 * width — /notifications was reachable only by typing the URL (the
 * founder hit this during the #784 push test). Locked contract:
 * - a bell link to /notifications renders in the bar for signed-in
 *   users (visible without opening any menu, both form factors),
 * - its badge mirrors the wishlist badge (API count, hidden at zero)
 *   and its aria-label carries the unread count when there is one,
 * - the profile dropdown and the mobile drawer both carry a
 *   Notifications item,
 * - signed-out visitors get no bell (the count query is authed).
 */
import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { Navbar } from './Navbar';

let mockUser: any = null;
let mockUnread: { count: number } | undefined;

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
  LogoLockup: () => <span data-testid="logo" />,
}));

jest.mock('@tanstack/react-query', () => ({
  useQuery: (opts: any) => ({
    data: opts?.queryKey?.[0] === 'notifications-unread-count' ? mockUnread : undefined,
  }),
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
  mockUser = { id: 'u1', name: 'Sara Traveller', email: 'sara@example.com', role: 'TRAVELER' };
  mockUnread = undefined;
  window.matchMedia = jest.fn().mockImplementation((query: string) => ({
    matches: query.includes('hover'),
    media: query,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  })) as any;
});

describe('Navbar notifications bell (#849)', () => {
  it('renders a bell link to /notifications in the bar for signed-in users', () => {
    render(<Navbar />);
    const bell = screen.getByLabelText('nav.notifications');
    expect(bell.tagName).toBe('A');
    expect(bell.getAttribute('href')).toBe('/notifications');
  });

  it('hides the badge at zero and shows the API count (with unread aria-label) above zero', () => {
    mockUnread = { count: 0 };
    const { unmount } = render(<Navbar />);
    const bellAtZero = screen.getByLabelText('nav.notifications');
    expect(bellAtZero.textContent).not.toContain('0');
    unmount();

    mockUnread = { count: 3 };
    render(<Navbar />);
    const bell = screen.getByLabelText('nav.notificationsUnread');
    expect(bell.getAttribute('href')).toBe('/notifications');
    expect(bell.textContent).toContain('3');
  });

  it('adds Notifications to the profile dropdown', () => {
    render(<Navbar />);
    fireEvent.click(screen.getByLabelText('nav.openProfileMenu'));
    const menu = screen.getByRole('menu');
    const item = within(menu).getByText('nav.notifications').closest('a');
    expect(item?.getAttribute('href')).toBe('/notifications');
  });

  it('adds Notifications to the mobile drawer', () => {
    render(<Navbar />);
    fireEvent.click(screen.getByLabelText('nav.openMenu'));
    const dialog = screen.getByRole('dialog');
    const item = within(dialog).getByText('nav.notifications').closest('a');
    expect(item?.getAttribute('href')).toBe('/notifications');
  });

  it('shows no bell to signed-out visitors', () => {
    mockUser = null;
    render(<Navbar />);
    expect(screen.queryByLabelText('nav.notifications')).toBeNull();
    expect(screen.queryByLabelText('nav.notificationsUnread')).toBeNull();
  });
});
