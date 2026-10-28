/**
 * @jest-environment node
 */
import React from 'react';
import { renderToString } from 'react-dom/server';
import { SkipLink } from './SkipLink';

// i18n is READY in this mock on purpose: the regression being pinned
// (#245) is that a ready i18n must not let the link into the first
// render. Translations load over HTTP, so the server never has them
// and renders nothing; if the client's first (hydration) render includes
// the anchor, React throws hydration error #418 — which is exactly
// what the production smoke suite caught on the staging homepage.
jest.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => (key === 'common.skipToContent' ? 'Skip to content' : key),
        ready: true,
        i18n: { language: 'en' },
    }),
}));

describe('SkipLink SSR output (#245)', () => {
    it('is empty even when i18n is ready', () => {
        expect(renderToString(<SkipLink />)).toBe('');
    });
});
