import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import AnalyticsConsent, { CookiePreferencesButton } from './AnalyticsConsent';

const clarityInitMock = jest.fn();

jest.mock('@microsoft/clarity', () => ({
    __esModule: true,
    default: { init: (...args: unknown[]) => clarityInitMock(...args) },
}));

jest.mock('next/link', () => ({
    __esModule: true,
    default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
        <a href={href} {...rest}>{children}</a>
    ),
}));

jest.mock('next/script', () => ({
    __esModule: true,
    default: ({ src, id, children }: { src?: string; id?: string; children?: React.ReactNode }) => (
        <div data-testid="next-script" data-src={src} data-script-id={id}>{children}</div>
    ),
}));

const GA_ID = 'G-TEST0001';
const CLARITY_ID = 'clarity-test-id';
const STORAGE_KEY = 'ouiboo_analytics_consent';
const CONSENT_EVENT = 'ouiboo:analytics-consent-changed';
const PREFERENCES_EVENT = 'ouiboo:open-cookie-preferences';

const originalEnv = { ...process.env };

function setAnalyticsEnv() {
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = GA_ID;
    process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID = CLARITY_ID;
}

function clearAnalyticsEnv() {
    delete process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
    delete process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;
}

function promptSection() {
    return screen.queryByRole('region', { name: 'analyticsConsent.preferencesLabel' });
}

function gaScripts() {
    return screen
        .queryAllByTestId('next-script')
        .filter((el) => (el.getAttribute('data-src') || '').includes('googletagmanager.com'));
}

describe('AnalyticsConsent', () => {
    beforeEach(() => {
        window.localStorage.clear();
        clarityInitMock.mockClear();
        delete (window as unknown as Record<string, unknown>)[`ga-disable-${GA_ID}`];
        setAnalyticsEnv();
    });

    afterEach(() => {
        process.env = { ...originalEnv };
    });

    it('renders nothing when analytics is not configured', () => {
        clearAnalyticsEnv();
        const { container } = render(<AnalyticsConsent />);
        expect(container.firstChild).toBeNull();
        expect(promptSection()).toBeNull();
    });

    it('shows the consent prompt when no consent is stored', () => {
        render(<AnalyticsConsent />);

        expect(promptSection()).not.toBeNull();
        expect(screen.getByRole('button', { name: 'analyticsConsent.allowAnalytics' })).not.toBeNull();
        expect(screen.getByRole('button', { name: 'analyticsConsent.continueWithoutAnalytics' })).not.toBeNull();
        expect(screen.getByRole('link', { name: 'analyticsConsent.privacyNotice' }).getAttribute('href')).toBe('/privacy');
        // Analytics must not load before consent.
        expect(gaScripts()).toHaveLength(0);
    });

    it('accepting stores consent, hides the prompt, loads GA and enables it', () => {
        render(<AnalyticsConsent />);

        fireEvent.click(screen.getByRole('button', { name: 'analyticsConsent.allowAnalytics' }));

        expect(window.localStorage.getItem(STORAGE_KEY)).toBe('accepted');
        expect(promptSection()).toBeNull();
        expect((window as unknown as Record<string, boolean>)[`ga-disable-${GA_ID}`]).toBe(false);

        const scripts = gaScripts();
        expect(scripts).toHaveLength(1);
        expect(scripts[0].getAttribute('data-src')).toContain(`id=${GA_ID}`);
        const inline = screen
            .queryAllByTestId('next-script')
            .find((el) => el.getAttribute('data-script-id') === 'ouiboo-google-analytics');
        expect(inline?.textContent).toContain(`gtag('config', "${GA_ID}"`);
    });

    it('initialises Clarity once consent is accepted', async () => {
        render(<AnalyticsConsent />);

        fireEvent.click(screen.getByRole('button', { name: 'analyticsConsent.allowAnalytics' }));

        await waitFor(() => {
            expect(clarityInitMock).toHaveBeenCalledWith(CLARITY_ID);
        });
    });

    it('declining stores consent, hides the prompt and keeps GA disabled and unloaded', () => {
        render(<AnalyticsConsent />);

        fireEvent.click(screen.getByRole('button', { name: 'analyticsConsent.continueWithoutAnalytics' }));

        expect(window.localStorage.getItem(STORAGE_KEY)).toBe('declined');
        expect(promptSection()).toBeNull();
        expect((window as unknown as Record<string, boolean>)[`ga-disable-${GA_ID}`]).toBe(true);
        expect(gaScripts()).toHaveLength(0);
    });

    it('does not prompt and loads GA when consent was previously accepted', async () => {
        window.localStorage.setItem(STORAGE_KEY, 'accepted');

        render(<AnalyticsConsent />);

        expect(promptSection()).toBeNull();
        expect(gaScripts()).toHaveLength(1);
        await waitFor(() => {
            expect(clarityInitMock).toHaveBeenCalledWith(CLARITY_ID);
        });
    });

    it('does not prompt or load GA when consent was previously declined', () => {
        window.localStorage.setItem(STORAGE_KEY, 'declined');

        render(<AnalyticsConsent />);

        expect(promptSection()).toBeNull();
        expect(gaScripts()).toHaveLength(0);
        expect(clarityInitMock).not.toHaveBeenCalled();
    });

    it('treats an unrecognised stored value as no consent', () => {
        window.localStorage.setItem(STORAGE_KEY, 'yes');

        render(<AnalyticsConsent />);

        expect(promptSection()).not.toBeNull();
        expect(gaScripts()).toHaveLength(0);
    });

    it('syncs two mounted instances through the consent-changed event', () => {
        render(
            <>
                <AnalyticsConsent />
                <AnalyticsConsent />
            </>,
        );

        expect(screen.getAllByRole('button', { name: 'analyticsConsent.allowAnalytics' })).toHaveLength(2);

        fireEvent.click(screen.getAllByRole('button', { name: 'analyticsConsent.allowAnalytics' })[0]);

        expect(promptSection()).toBeNull();
        expect(window.localStorage.getItem(STORAGE_KEY)).toBe('accepted');
    });

    it('follows a consent change made in another tab (storage event)', () => {
        render(<AnalyticsConsent />);
        expect(promptSection()).not.toBeNull();

        act(() => {
            window.localStorage.setItem(STORAGE_KEY, 'accepted');
            window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: 'accepted' }));
        });

        expect(promptSection()).toBeNull();
        expect(gaScripts()).toHaveLength(1);

        act(() => {
            window.localStorage.setItem(STORAGE_KEY, 'declined');
            window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: 'declined' }));
        });

        expect(gaScripts()).toHaveLength(0);
    });

    it('dispatches the consent-changed event when saving a choice', () => {
        const listener = jest.fn();
        window.addEventListener(CONSENT_EVENT, listener);
        try {
            render(<AnalyticsConsent />);
            fireEvent.click(screen.getByRole('button', { name: 'analyticsConsent.allowAnalytics' }));
            expect(listener).toHaveBeenCalled();
        } finally {
            window.removeEventListener(CONSENT_EVENT, listener);
        }
    });

    it('reopens the prompt on the preferences event and lets the visitor change their choice', () => {
        window.localStorage.setItem(STORAGE_KEY, 'accepted');
        render(<AnalyticsConsent />);
        expect(promptSection()).toBeNull();

        act(() => {
            window.dispatchEvent(new Event(PREFERENCES_EVENT));
        });
        expect(promptSection()).not.toBeNull();

        fireEvent.click(screen.getByRole('button', { name: 'analyticsConsent.continueWithoutAnalytics' }));

        expect(window.localStorage.getItem(STORAGE_KEY)).toBe('declined');
        expect(promptSection()).toBeNull();
        expect(gaScripts()).toHaveLength(0);
    });
});

describe('CookiePreferencesButton', () => {
    beforeEach(() => {
        window.localStorage.clear();
        setAnalyticsEnv();
    });

    afterEach(() => {
        process.env = { ...originalEnv };
    });

    it('renders nothing when analytics is not configured', () => {
        clearAnalyticsEnv();
        const { container } = render(<CookiePreferencesButton />);
        expect(container.firstChild).toBeNull();
    });

    it('opens the consent preferences when clicked', () => {
        window.localStorage.setItem(STORAGE_KEY, 'accepted');
        render(
            <>
                <CookiePreferencesButton />
                <AnalyticsConsent />
            </>,
        );
        expect(promptSection()).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: 'analyticsConsent.cookieSettings' }));

        expect(promptSection()).not.toBeNull();
    });
});
