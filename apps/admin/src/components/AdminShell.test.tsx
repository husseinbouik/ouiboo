/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from './AuthContext';
import { AdminShell } from './AdminShell';

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
  useRouter: jest.fn(),
}));

jest.mock('./AuthContext', () => ({
  useAuth: jest.fn(),
}));

const mockUsePathname = usePathname as jest.Mock;
const mockUseRouter = useRouter as jest.Mock;
const mockUseAuth = useAuth as jest.Mock;
const replaceMock = jest.fn();

const travelerUser = { id: 'u-traveler', name: 'Test Traveler', email: 'traveler@example.com', role: 'TRAVELER' };
const adminUser = { id: 'u-admin', name: 'Test Admin', email: 'admin@example.com', role: 'ADMIN' };

function arrange(pathname: string, user: unknown, isLoading = false) {
  mockUsePathname.mockReturnValue(pathname);
  mockUseRouter.mockReturnValue({ replace: replaceMock });
  mockUseAuth.mockReturnValue({ user, isLoading });
}

describe('AdminShell role gate (#367)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the login form for a non-admin session instead of spinner-looping', () => {
    arrange('/login', travelerUser);
    render(
      <AdminShell>
        <div>login-form</div>
      </AdminShell>,
    );
    expect(screen.getByText('login-form')).not.toBeNull();
    expect(replaceMock).not.toHaveBeenCalledWith('/');
  });

  it('sends a non-admin session on a protected page back to /login without rendering content', () => {
    arrange('/', travelerUser);
    render(
      <AdminShell>
        <div>dashboard</div>
      </AdminShell>,
    );
    expect(screen.queryByText('dashboard')).toBeNull();
    expect(replaceMock).toHaveBeenCalledWith('/login');
  });

  it('redirects an admin session from /login to the dashboard', () => {
    arrange('/login', adminUser);
    render(
      <AdminShell>
        <div>login-form</div>
      </AdminShell>,
    );
    expect(screen.queryByText('login-form')).toBeNull();
    expect(replaceMock).toHaveBeenCalledWith('/');
  });

  it('renders protected content for an admin session', () => {
    arrange('/', adminUser);
    render(
      <AdminShell>
        <div>dashboard</div>
      </AdminShell>,
    );
    expect(screen.getByText('dashboard')).not.toBeNull();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('renders the login form when signed out', () => {
    arrange('/login', null);
    render(
      <AdminShell>
        <div>login-form</div>
      </AdminShell>,
    );
    expect(screen.getByText('login-form')).not.toBeNull();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('shows a spinner while auth is loading on /login', () => {
    arrange('/login', null, true);
    const { container } = render(
      <AdminShell>
        <div>login-form</div>
      </AdminShell>,
    );
    expect(screen.queryByText('login-form')).toBeNull();
    expect(container.querySelector('[aria-label="Loading"]')).not.toBeNull();
  });
});
