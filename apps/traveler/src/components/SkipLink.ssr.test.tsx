/**
 * @jest-environment node
 */
import React from 'react';
import { renderToString } from 'react-dom/server';
import { SkipLink } from './SkipLink';

// F1 regression pin (supersedes the #245 mount gate): the link renders
// INSIDE <Providers>' I18nextProvider, whose instance is initialised
// synchronously from the server-embedded dictionary. Server and client
// first renders are therefore identical BY CONSTRUCTION — the anchor
// belongs in the SSR HTML (translated), and hydration sees the same
// anchor, so React error #418 cannot occur. Under the old design
// translations loaded over HTTP, the server could never render the
// link, and this test pinned exactly that emptiness.
jest.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => (key === 'common.skipToContent' ? 'Skip to content' : key),
        ready: true,
        i18n: { language: 'en' },
    }),
}));

describe('SkipLink SSR output (F1)', () => {
    it('renders the translated anchor in the server HTML', () => {
        const html = renderToString(<SkipLink />);
        expect(html).toContain('href="#main-content"');
        expect(html).toContain('Skip to content');
        expect(html).not.toContain('common.skipToContent');
    });
});
