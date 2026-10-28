/**
 * @jest-environment jsdom
 *
 * #495 rework: the traveller profile menu must be reliable first and
 * hover-intent second. Locked behaviour:
 * - click toggles deterministically (functional setState — no stale
 *   closure re-opening the menu),
 * - pointerdown outside the menu closes it,
 * - Escape closes it,
 * - hover open/close (with the intent close delay) applies only on
 *   (hover: hover) and (pointer: fine) devices.
 */
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { Navbar } from './Navbar';

const mockUser = { id: 'u1', name: 'Sara Traveller', email: 'sara@example.com', role: 'TRAVELER' };
let hoverMatches = true;

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
  ThemeToggle: () => null,
  LanguageSwitcher: () => null,
  BetaBadge: () => null,
  Logo: () => null,
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
  CurrencySelector: () => null,
}));

jest.mock('framer-motion', () => ({
  motion: {
    nav: ({ children, ...props }: any) => <nav {...props}>{children}</nav>,
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

beforeEach(() => {
  hoverMatches = true;
  window.matchMedia = jest.fn().mockImplementation((query: string) => ({
    matches: query.includes('hover') ? hoverMatches : false,
    media: query,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  })) as any;
});

const trigger = () => screen.getByLabelText('nav.openProfileMenu');
const menu = () => screen.queryByRole('menu');

describe('Navbar profile menu (#495)', () => {
  it('click toggles deterministically: open, closed, open', () => {
    render(<Navbar />);
    expect(menu()).toBeNull();
    fireEvent.click(trigger());
    expect(menu()).not.toBeNull();
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(trigger());
    expect(menu()).toBeNull();
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(trigger());
    expect(menu()).not.toBeNull();
  });

  it('a click right after a hover-open closes the menu (no stale-closure fight)', () => {
    render(<Navbar />);
    const wrapper = trigger().parentElement as HTMLElement;
    fireEvent.mouseEnter(wrapper);
    expect(menu()).not.toBeNull();
    fireEvent.click(trigger());
    expect(menu()).toBeNull();
  });

  it('closes on pointerdown outside the menu', () => {
    render(<Navbar />);
    fireEvent.click(trigger());
    expect(menu()).not.toBeNull();
    fireEvent.pointerDown(document.body);
    expect(menu()).toBeNull();
  });

  it('does not close on pointerdown inside the menu', () => {
    render(<Navbar />);
    fireEvent.click(trigger());
    expect(menu()).not.toBeNull();
    fireEvent.pointerDown(menu() as HTMLElement);
    expect(menu()).not.toBeNull();
  });

  it('closes on Escape', () => {
    render(<Navbar />);
    fireEvent.click(trigger());
    expect(menu()).not.toBeNull();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(menu()).toBeNull();
  });

  it('hover intent: leaving schedules a delayed close; re-entering cancels it', () => {
    jest.useFakeTimers();
    try {
      render(<Navbar />);
      const wrapper = trigger().parentElement as HTMLElement;
      fireEvent.mouseEnter(wrapper);
      expect(menu()).not.toBeNull();
      fireEvent.mouseLeave(wrapper);
      act(() => {
        jest.advanceTimersByTime(349);
      });
      expect(menu()).not.toBeNull();
      // Diagonal move back into the menu within the window cancels the close.
      fireEvent.mouseEnter(wrapper);
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(menu()).not.toBeNull();
      // Moving away for good closes it after the delay.
      fireEvent.mouseLeave(wrapper);
      act(() => {
        jest.advanceTimersByTime(350);
      });
      expect(menu()).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  it('hover does NOT open the menu on non-hover (touch) devices', () => {
    hoverMatches = false;
    render(<Navbar />);
    const wrapper = trigger().parentElement as HTMLElement;
    fireEvent.mouseEnter(wrapper);
    expect(menu()).toBeNull();
    // Click still toggles on touch devices.
    fireEvent.click(trigger());
    expect(menu()).not.toBeNull();
  });
});
