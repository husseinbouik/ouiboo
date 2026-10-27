/**
 * @jest-environment jsdom
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { Navbar } from './Navbar';

jest.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key,
        i18n: { language: 'en', dir: () => 'ltr' },
    }),
}));

jest.mock('next/navigation', () => ({
    usePathname: () => '/',
}));

jest.mock('./AuthContext', () => ({
    useAuth: () => ({ user: null, logout: jest.fn(), isLoading: false }),
}));

jest.mock('@tanstack/react-query', () => ({
    useQuery: () => ({ data: undefined }),
}));

jest.mock('@/lib/api-client', () => ({
    apiClient: { get: jest.fn(), post: jest.fn() },
}));

jest.mock('framer-motion', () => ({
    motion: {
        nav: ({ children, ...props }: any) => <nav {...props}>{children}</nav>,
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// ThemeToggle / LanguageSwitcher pull next-themes and the language
// stack; they are chrome inside the navbar, not what this suite covers.
jest.mock('@ouiboo/ui', () => {
    const actual = jest.requireActual('@ouiboo/ui');
    return {
        ...actual,
        ThemeToggle: () => null,
        LanguageSwitcher: () => null,
    };
});

describe('Navbar mobile menu (#490 touch targets)', () => {
    it('gives the mobile menu trigger a 44px hit area', () => {
        render(<Navbar />);
        expect(screen.getByLabelText('nav.openMenu').className).toContain('hit-slop');
    });

    it('gives the mobile menu close button a 44px hit area', () => {
        render(<Navbar />);
        fireEvent.click(screen.getByLabelText('nav.openMenu'));
        expect(screen.getByLabelText('nav.closeMenu').className).toContain('hit-slop');
    });
});
