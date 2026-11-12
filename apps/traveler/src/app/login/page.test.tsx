import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import TravelerLoginPage from './page';

const mutateMock = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockEnsureSession = jest.fn(async () => true);
const mockAuthState: { user: unknown; isLoading: boolean } = {
    user: null,
    isLoading: false,
};

jest.mock('@tanstack/react-query', () => ({
    useMutation: () => ({ mutate: mutateMock, isPending: false }),
}));

jest.mock('next/navigation', () => ({
    useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

jest.mock('next/link', () => ({
    __esModule: true,
    default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
        <a href={href} {...rest}>{children}</a>
    ),
}));

jest.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (_key: string, fallback?: string) => fallback || _key,
        i18n: { language: 'en' },
    }),
}));

jest.mock('@/components/AuthContext', () => ({
    useAuth: () => ({
        refetch: jest.fn(),
        user: mockAuthState.user,
        isLoading: mockAuthState.isLoading,
    }),
}));

jest.mock('@ouiboo/api-client', () => ({
    setBrowserAccessToken: jest.fn(async () => undefined),
    ensureBrowserAppSession: () => mockEnsureSession(),
    getAuthErrorMessage: () => ({ redirect: false, fallback: 'error' }),
}));

describe('TravelerLoginPage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockEnsureSession.mockResolvedValue(true);
        mockAuthState.user = null;
        mockAuthState.isLoading = false;
        window.history.replaceState({}, '', '/login');
    });

    it('renders login fields and submits credentials', async () => {
        render(<TravelerLoginPage />);

        expect(screen.getByText('Welcome Back')).not.toBeNull();

        const emailInput = screen.getByPlaceholderText('hello@example.com');
        const passwordInput = screen.getByPlaceholderText('********');
        const submitButton = screen.getByRole('button', { name: /sign in/i });

        expect(emailInput).not.toBeNull();
        expect(passwordInput).not.toBeNull();
        expect(submitButton).not.toBeNull();

        fireEvent.change(emailInput, { target: { value: 'traveler@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'Password123!' } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(mutateMock).toHaveBeenCalledWith({
                email: 'traveler@example.com',
                password: 'Password123!',
            });
        });
    });

    describe('restored-user bounce (#982)', () => {
        const restoredUser = { id: 'u1', name: 'Test', email: 't@example.com', role: 'TRAVELER' };

        it('sends a restored user back to the gate redirect target', async () => {
            mockAuthState.user = restoredUser;
            window.history.replaceState({}, '', '/login?redirect=%2Fbookings');

            render(<TravelerLoginPage />);

            await waitFor(() => {
                expect(mockReplace).toHaveBeenCalledWith('/bookings');
            });
            expect(mockEnsureSession).toHaveBeenCalled();
        });

        it('sends a restored user home when no redirect is present', async () => {
            mockAuthState.user = restoredUser;

            render(<TravelerLoginPage />);

            await waitFor(() => {
                expect(mockReplace).toHaveBeenCalledWith('/');
            });
        });

        it('never honours an absolute or protocol-relative redirect', async () => {
            mockAuthState.user = restoredUser;
            window.history.replaceState({}, '', '/login?redirect=https%3A%2F%2Fevil.example%2Fx');

            render(<TravelerLoginPage />);

            await waitFor(() => {
                expect(mockReplace).toHaveBeenCalledWith('/');
            });

            mockReplace.mockClear();
            window.history.replaceState({}, '', '/login?redirect=%2F%2Fevil.example');

            render(<TravelerLoginPage />);

            await waitFor(() => {
                expect(mockReplace).toHaveBeenCalledWith('/');
            });
        });

        it('does not bounce a signed-out visitor or while the probe is loading', async () => {
            render(<TravelerLoginPage />);
            await waitFor(() => {
                expect(screen.getByText('Welcome Back')).not.toBeNull();
            });
            expect(mockReplace).not.toHaveBeenCalled();

            mockAuthState.user = restoredUser;
            mockAuthState.isLoading = true;
            render(<TravelerLoginPage />);
            expect(mockReplace).not.toHaveBeenCalled();
        });
    });
});
