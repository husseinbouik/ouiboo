/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { SupportBlock } from './SupportBlock';

jest.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, options?: Record<string, unknown>) =>
            options?.hours ? `${key}:${options.hours}` : key,
        i18n: { language: 'en' },
    }),
}));

describe('SupportBlock (Session #3 P0-9, #556)', () => {
    it('always renders the title, the normal-lane expectation and the escalation role', () => {
        render(<SupportBlock />);
        expect(screen.getByText('support.title')).not.toBeNull();
        expect(screen.getByText(/support\.body(NoEmail)?:48/)).not.toBeNull();
        expect(screen.getByText('support.escalationRole')).not.toBeNull();
    });

    it('never renders a hardcoded support address when none is configured', () => {
        // Test env sets no NEXT_PUBLIC_SUPPORT_EMAIL: the block must not
        // invent one (the dead-default defect this surface replaces).
        const { container } = render(<SupportBlock />);
        expect(container.querySelector('a[href^="mailto:"]')).toBeNull();
        expect(container.textContent).not.toContain('@ouiboo.com');
    });
});
