import React from 'react';
import { render, screen } from '@testing-library/react';
import { SkipLink } from './SkipLink';

// F1: no mount gate anymore — the link is part of the first render
// (see the SSR test for the invariant this pins).
jest.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => (key === 'common.skipToContent' ? 'Skip to content' : key),
        ready: true,
        i18n: { language: 'en' },
    }),
}));

describe('SkipLink (F1, no hydration gate)', () => {
    it('renders the skip link in the first render when i18n is ready', () => {
        render(<SkipLink />);
        const link = screen.getByRole('link', { name: 'Skip to content' });
        expect(link.getAttribute('href')).toBe('#main-content');
    });
});
