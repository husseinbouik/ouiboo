/**
 * @jest-environment jsdom
 *
 * #495 rework: the traveller profile menu must be reliable first and
 * hover-intent second. Locked behaviour:
 * - click toggles deterministically (decisions read a synchronously
 *   synced ref — no stale closure re-opening the menu),
 * - round 2: the FIRST click always lands on an open menu — when
 *   hover (or keyboard focus) opened the menu during the same
 *   gesture, the click pins it open instead of toggling it shut
 *   (the witnessed "first click does nothing" defect); a click
 *   toggles shut only a menu a previous click opened,
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

  it('the first click after a hover-open pins the menu open; the next click closes it', () => {
    render(<Navbar />);
    const wrapper = trigger().parentElement as HTMLElement;
    // Pointer arrival hover-opens the menu before any click lands —
    // the exact sequence the deployed witness run performs.
    fireEvent.mouseEnter(wrapper);
    expect(menu()).not.toBeNull();
    // First click: must leave the menu OPEN (round-1 toggled it shut,
    // so the click appeared to do nothing).
    fireEvent.click(trigger());
    expect(menu()).not.toBeNull();
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    // The menu is now click-opened, so the next click toggles it shut.
    fireEvent.click(trigger());
    expect(menu()).toBeNull();
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
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
