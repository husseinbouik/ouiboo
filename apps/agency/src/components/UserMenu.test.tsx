/**
 * @jest-environment jsdom
 *
 * #724: the account menu linked Profile / Billing / Settings to
 * /profile, /wallet and /settings — routes that do not exist. Every
 * entry must land on an implemented dashboard page:
 *   Profile  -> /dashboard/settings          (the settings page's first
 *                                             tab is the profile form)
 *   Billing  -> /dashboard/settings/billing (dedicated billing page,
 *                                             matching the sidebar's
 *                                             Billing label mapping)
 *   Settings -> /dashboard/settings
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { UserMenu } from './UserMenu';

const pushMock = jest.fn();
const logoutMock = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

jest.mock('./AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', name: 'Atlas Ops', email: 'ops@atlas.example', role: 'AGENCY' },
    logout: logoutMock,
  }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('@ouiboo/ui', () => ({
  Avatar: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  AvatarFallback: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  AvatarImage: () => null,
  DropdownMenu: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  DropdownMenuContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuLabel: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuItem: ({
    children,
    onClick,
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
}));

describe('UserMenu (#724)', () => {
  beforeEach(() => {
    pushMock.mockReset();
    logoutMock.mockReset();
  });

  it.each([
    ['userMenu.profile', '/dashboard/settings'],
    ['userMenu.billing', '/dashboard/settings/billing'],
    ['userMenu.settings', '/dashboard/settings'],
  ])('routes %s to the implemented page %s', (labelKey, expectedRoute) => {
    render(<UserMenu />);
    fireEvent.click(screen.getByText(labelKey));
    expect(pushMock).toHaveBeenCalledTimes(1);
    expect(pushMock).toHaveBeenCalledWith(expectedRoute);
  });

  it('never routes to the dead /profile, /wallet or /settings paths', () => {
    render(<UserMenu />);
    for (const labelKey of ['userMenu.profile', 'userMenu.billing', 'userMenu.settings']) {
      fireEvent.click(screen.getByText(labelKey));
    }
    const pushed = pushMock.mock.calls.map(([arg]) => arg);
    expect(pushed).not.toContain('/profile');
    expect(pushed).not.toContain('/wallet');
    expect(pushed).not.toContain('/settings');
    for (const route of pushed) {
      expect(route.startsWith('/dashboard/')).toBe(true);
    }
  });
});
