import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
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
        <a href={href} {...rest}>
            {children}
        </a>
    ),
}));

jest.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (_key: string, fallback: string) => fallback,
        i18n: { language: 'en' },
    }),
}));

jest.mock('@/components/AuthContext', () => ({
    useAuth: () => ({ refetch: jest.fn() }),
}));

describe('TravelerLoginPage', () => {
    it('renders login fields and submits credentials', async () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        const root = createRoot(container);

        await act(async () => {
            root.render(<TravelerLoginPage />);
        });

        const emailInput = container.querySelector('input[placeholder="hello@example.com"]') as HTMLInputElement;
        const passwordInput = container.querySelector('input[placeholder="••••••••"]') as HTMLInputElement;
        const submitButton = Array.from(container.querySelectorAll('button')).find((button) =>
            button.textContent?.includes('Sign In')
        ) as HTMLButtonElement;

        expect(container.textContent).toContain('Welcome Back');
        expect(emailInput).not.toBeNull();
        expect(passwordInput).not.toBeNull();
        expect(submitButton).not.toBeNull();

        await act(async () => {
            emailInput.value = 'traveler@example.com';
            emailInput.dispatchEvent(new Event('input', { bubbles: true }));
            passwordInput.value = 'Password123!';
            passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
            submitButton.click();
        });

        expect(mutateMock).toHaveBeenCalledWith({
            email: 'traveler@example.com',
            password: 'Password123!',
        });

        root.unmount();
        document.body.removeChild(container);
    });
});
