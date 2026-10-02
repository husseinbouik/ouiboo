import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import TravelerLoginPage from './page';

const mutateMock = jest.fn();

jest.mock('@tanstack/react-query', () => ({
    useMutation: () => ({ mutate: mutateMock, isPending: false }),
}));

jest.mock('next/navigation', () => ({
    useRouter: () => ({ push: jest.fn() }),
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
    useAuth: () => ({ refetch: jest.fn() }),
}));

describe('TravelerLoginPage', () => {
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
});
