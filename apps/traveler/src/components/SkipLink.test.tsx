import React from 'react';
import { render, screen } from '@testing-library/react';
import { SkipLink } from './SkipLink';

// i18n is READY in this mock on purpose: the link must appear after
// mount, and must not be part of the first render (see the SSR test).
jest.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => (key === 'common.skipToContent' ? 'Skip to content' : key),
        ready: true,
        i18n: { language: 'en' },
    }),
}));

describe('SkipLink (#245 hydration gate)', () => {
    it('renders the skip link after mount when i18n is ready', () => {
        render(<SkipLink />);
        const link = screen.getByRole('link', { name: 'Skip to content' });
        expect(link.getAttribute('href')).toBe('#main-content');
    });
});
